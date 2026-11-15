from decimal import Decimal

from django.db import transaction
from rest_framework.exceptions import NotFound, ValidationError

from apps.cart.models import Cart, CartItem
from apps.catalog.models import Product
from apps.orders.models import Order, OrderItem
from apps.payments.models import Payment
from django.db.models import Sum
from apps.audit.constants import AuditAction, AuditEntity
from apps.audit.services import record_audit_event

ALLOWED_ORDER_ITEM_TRANSITIONS = {
    OrderItem.Status.PENDING: [
        OrderItem.Status.CONFIRMED,
        OrderItem.Status.CANCELLED,
    ],
    OrderItem.Status.CONFIRMED: [
        OrderItem.Status.PROCESSING,
        OrderItem.Status.CANCELLED,
    ],
    OrderItem.Status.PROCESSING: [
        OrderItem.Status.SHIPPED,
        OrderItem.Status.CANCELLED,
    ],
    OrderItem.Status.SHIPPED: [
        OrderItem.Status.DELIVERED,
    ],
    OrderItem.Status.DELIVERED: [],
    OrderItem.Status.CANCELLED: [],
}


def validate_order_item_transition(current_status, new_status):
    allowed_statuses = ALLOWED_ORDER_ITEM_TRANSITIONS.get(current_status, [])

    if new_status not in allowed_statuses:
        raise ValidationError(
            f"Cannot change status from '{current_status}' to '{new_status}'."
        )


@transaction.atomic
def create_order(*, user, address, payment_method, ip_address=None, user_agent=""):
    # Lock the customer's cart.
    try:
        cart = Cart.objects.select_for_update().get(user=user)
    except Cart.DoesNotExist:
        raise ValidationError({"cart": "Your cart is empty."})

    # Lock cart items and load their products.
    cart_items = list(
        CartItem.objects.select_for_update().filter(cart=cart).order_by("product_id")
    )

    if not cart_items:
        raise ValidationError({"cart": "Your cart is empty."})

    # Lock products in a consistent order.
    product_ids = sorted(
        {item.product_id for item in cart_items},
        key=str,
    )

    products = {
        product.id: product
        for product in Product.objects.select_for_update()
        .filter(id__in=product_ids)
        .select_related("seller", "category")
        .order_by("id")
    }

    subtotal = Decimal("0.00")
    order_items = []

    for cart_item in cart_items:
        product = products.get(cart_item.product_id)

        if product is None:
            raise ValidationError(
                {"cart": "A product in your cart is no longer available."}
            )

        if (
            product.status != Product.Status.APPROVED
            or not product.is_active
            or product.seller.status != "active"
            or not product.category.is_active
        ):
            raise ValidationError({"cart": f"{product.name} is currently unavailable."})

        if product.stock < cart_item.quantity:
            raise ValidationError(
                {
                    "cart": (
                        f"Insufficient stock for {product.name}. "
                        f"Available stock: {product.stock}."
                    )
                }
            )

        item_subtotal = product.price * cart_item.quantity
        subtotal += item_subtotal

        order_items.append(
            OrderItem(
                seller=product.seller,
                product=product,
                product_name=product.name,
                product_sku=product.sku,
                quantity=cart_item.quantity,
                unit_price=product.price,
                subtotal=item_subtotal,
            )
        )

    shipping_fee = Decimal("0.00")
    total_amount = subtotal + shipping_fee

    order = Order.objects.create(
        user=user,
        payment_method=payment_method,
        subtotal=subtotal,
        shipping_fee=shipping_fee,
        total_amount=total_amount,
        shipping_full_name=address.full_name,
        shipping_mobile=address.mobile,
        shipping_address_line_1=address.address_line_1,
        shipping_address_line_2=address.address_line_2,
        shipping_city=address.city,
        shipping_state=address.state,
        shipping_postal_code=address.postal_code,
        shipping_country=address.country,
    )
    Payment.objects.create(
        order=order,
        method=payment_method,
        provider=(
            Payment.Provider.MANUAL
            if payment_method == Order.PaymentMethod.COD
            else Payment.Provider.MOCK
        ),
        amount=order.total_amount,
    )

    for item in order_items:
        item.order = order

    OrderItem.objects.bulk_create(order_items)
    record_audit_event(
        actor=user,
        action=AuditAction.ORDER_CREATED,
        entity_type=AuditEntity.ORDER,
        entity_id=order.id,
        ip_address=ip_address,
        user_agent=user_agent,
    )

    # Decrement stock while product rows remain locked.
    for cart_item in cart_items:
        product = products[cart_item.product_id]
        product.stock -= cart_item.quantity
        product.save(update_fields=["stock", "updated_at"])

    # Remove purchased items from the cart.
    CartItem.objects.filter(cart=cart).delete()

    return order


def calculate_order_status(item_statuses):
    statuses = list(item_statuses)

    if not statuses:
        raise ValueError("Cannot calculate order status without order items.")

    status_set = set(statuses)

    # All items have the same status.
    if len(status_set) == 1:
        return statuses[0]

    # All items are cancelled.
    if status_set == {OrderItem.Status.CANCELLED}:
        return Order.Status.CANCELLED

    # Some items are cancelled, others are not.
    if OrderItem.Status.CANCELLED in status_set:
        return Order.Status.PARTIALLY_CANCELLED

    # Some items are delivered, others are not.
    if OrderItem.Status.DELIVERED in status_set:
        return Order.Status.PARTIALLY_DELIVERED

    # Some items are shipped, others are not.
    if OrderItem.Status.SHIPPED in status_set:
        return Order.Status.PARTIALLY_SHIPPED

    # Remaining combinations: pending, confirmed, processing.
    priority = {
        OrderItem.Status.PENDING: 1,
        OrderItem.Status.CONFIRMED: 2,
        OrderItem.Status.PROCESSING: 3,
    }

    return min(statuses, key=lambda status: priority[status])


@transaction.atomic
def update_order_status(*, order_id):
    order = Order.objects.select_for_update().get(id=order_id)

    item_statuses = OrderItem.objects.filter(order=order).values_list(
        "status",
        flat=True,
    )

    new_status = calculate_order_status(item_statuses)

    if order.status != new_status:
        order.status = new_status
        order.save(update_fields=["status", "updated_at"])

    return order


@transaction.atomic
def update_seller_order_item_status(
    *,
    order_item_id,
    seller_user,
    new_status,
    ip_address=None,
    user_agent="",
):
    # 1. Lock the OrderItem and verify seller ownership.
    try:
        order_item = OrderItem.objects.select_for_update(of=("self",)).get(
            id=order_item_id,
            seller__user=seller_user,
            seller__status="active",
        )
    except OrderItem.DoesNotExist:
        raise NotFound("Order item not found.")

    # 2. Lock the parent Order.
    order = Order.objects.select_for_update().get(id=order_item.order_id)

    # 3. Lock the Payment.
    payment = Payment.objects.select_for_update().get(order=order)

    # 4. Validate the requested status transition.
    validate_order_item_transition(order_item.status, new_status)

    # 5. Prevent fulfillment of unpaid online orders.
    if (
        order.payment_method == Order.PaymentMethod.RAZORPAY
        and payment.status != Payment.Status.SUCCESSFUL
        and new_status != OrderItem.Status.CANCELLED
    ):
        raise ValidationError(
            {"payment": "Online payment must be completed before order processing."}
        )

    # 6. Restore stock when cancelling.
    if new_status == OrderItem.Status.CANCELLED:
        if payment.status == Payment.Status.SUCCESSFUL:
            raise ValidationError(
                {
                    "payment": "Paid orders cannot be cancelled until refund handling is available."
                }
            )

        product = Product.objects.select_for_update().get(id=order_item.product_id)
        product.stock += order_item.quantity
        product.save(update_fields=["stock", "updated_at"])

    # 7. Update the OrderItem.
    order_item.status = new_status
    order_item.save(update_fields=["status", "updated_at"])

    # 7a. Recognize seller earnings for delivered item if payment is already successful.
    if new_status == OrderItem.Status.DELIVERED:
        from apps.sellers.services import record_order_item_earning

        record_order_item_earning(
            order_item=order_item,
            actor=seller_user,
            ip_address=ip_address,
            user_agent=user_agent,
        )

    # 8. Recalculate the parent Order.
    item_statuses = OrderItem.objects.filter(order=order).values_list(
        "status",
        flat=True,
    )
    new_order_status = calculate_order_status(item_statuses)

    if order.status != new_order_status:
        old_status = order.status

        order.status = new_order_status
        order.save(update_fields=["status", "updated_at"])

        record_audit_event(
            actor=seller_user,
            action=AuditAction.ORDER_STATUS_CHANGED,
            entity_type=AuditEntity.ORDER,
            entity_id=order.id,
            metadata={
                "old_status": old_status,
                "new_status": new_order_status,
            },
            ip_address=ip_address,
            user_agent=user_agent,
        )

    # 9. Synchronize Payment after cancellation.
    if new_status == OrderItem.Status.CANCELLED:
        remaining_subtotal = (
            OrderItem.objects.filter(order=order)
            .exclude(status=OrderItem.Status.CANCELLED)
            .aggregate(total=Sum("subtotal"))["total"]
        )

        if remaining_subtotal is None:
            payment.status = Payment.Status.CANCELLED
            payment.save(update_fields=["status", "updated_at"])

            record_audit_event(
                actor=seller_user,
                action=AuditAction.PAYMENT_CANCELLED,
                entity_type=AuditEntity.PAYMENT,
                entity_id=payment.id,
                metadata={
                    "order_id": str(order.id),
                    "reason": "All order items were cancelled by the seller.",
                },
                ip_address=ip_address,
                user_agent=user_agent,
            )
        else:
            payment.amount = remaining_subtotal + order.shipping_fee
            payment.save(update_fields=["amount", "updated_at"])

    return order_item


@transaction.atomic
def cancel_customer_order_item(
    *,
    order_id,
    order_item_id,
    customer_user,
    ip_address=None,
    user_agent="",
):
    # 1. Lock the item and verify customer ownership.
    try:
        order_item = OrderItem.objects.select_for_update(of=("self",)).get(
            id=order_item_id,
            order_id=order_id,
            order__user=customer_user,
        )
    except OrderItem.DoesNotExist:
        raise NotFound("Order item not found.")

    # 2. Lock the parent Order.
    try:
        order = Order.objects.select_for_update().get(
            id=order_id,
            user=customer_user,
        )
    except Order.DoesNotExist:
        raise NotFound("Order not found.")

    # 3. Lock the Payment.
    payment = Payment.objects.select_for_update().get(order=order)

    # 4. Do not allow cancellation after successful payment.
    if payment.status == Payment.Status.SUCCESSFUL:
        raise ValidationError(
            {"payment": "This order has already been paid and cannot be cancelled."}
        )

    # 5. Customers can cancel only pending or confirmed items.
    allowed_statuses = [
        OrderItem.Status.PENDING,
        OrderItem.Status.CONFIRMED,
    ]

    if order_item.status not in allowed_statuses:
        raise ValidationError(
            {
                "status": (
                    f"Items with status '{order_item.status}' "
                    "cannot be cancelled by the customer."
                )
            }
        )

    # 6. Lock Product and restore stock.
    product = Product.objects.select_for_update().get(id=order_item.product_id)

    product.stock += order_item.quantity
    product.save(update_fields=["stock", "updated_at"])

    # 7. Cancel the OrderItem.
    order_item.status = OrderItem.Status.CANCELLED
    order_item.save(update_fields=["status", "updated_at"])

    record_audit_event(
        actor=customer_user,
        action=AuditAction.ORDER_ITEM_CANCELLED,
        entity_type=AuditEntity.ORDER_ITEM,
        entity_id=order_item.id,
        metadata={
            "order_id": str(order.id),
            "product_name": order_item.product_name,
            "quantity": order_item.quantity,
        },
        ip_address=ip_address,
        user_agent=user_agent,
    )

    # 8. Recalculate the parent Order status.
    remaining_items = OrderItem.objects.filter(order=order).exclude(
        status=OrderItem.Status.CANCELLED
    )

    new_order_status = calculate_order_status(
        OrderItem.objects.filter(order=order).values_list(
            "status",
            flat=True,
        )
    )

    if order.status != new_order_status:
        order.status = new_order_status
        order.save(update_fields=["status", "updated_at"])

    # 9. Synchronize the Payment amount.
    remaining_subtotal = remaining_items.aggregate(total=Sum("subtotal"))["total"]

    if remaining_subtotal is None:
        payment.status = Payment.Status.CANCELLED
        payment.save(update_fields=["status", "updated_at"])

        record_audit_event(
            actor=customer_user,
            action=AuditAction.PAYMENT_CANCELLED,
            entity_type=AuditEntity.PAYMENT,
            entity_id=payment.id,
            metadata={
                "order_id": str(order.id),
                "reason": "All order items were cancelled by the customer.",
            },
            ip_address=ip_address,
            user_agent=user_agent,
        )
    else:
        payment.amount = remaining_subtotal + order.shipping_fee
        payment.save(update_fields=["amount", "updated_at"])

    return order_item

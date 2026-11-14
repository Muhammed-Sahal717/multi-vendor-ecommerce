from decimal import Decimal

from django.db import transaction
from rest_framework.exceptions import NotFound, ValidationError

from apps.cart.models import Cart, CartItem
from apps.catalog.models import Product
from apps.orders.models import Order, OrderItem

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
def create_order(*, user, address, payment_method):
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

    for item in order_items:
        item.order = order

    OrderItem.objects.bulk_create(order_items)

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
def update_seller_order_item_status(*, order_item_id, seller_user, new_status):
    # 1. Lock the OrderItem and verify seller ownership.
    try:
        order_item = OrderItem.objects.select_for_update(of=("self",)).get(
            id=order_item_id,
            seller__user=seller_user,
            seller__status="active",
        )
    except OrderItem.DoesNotExist:
        raise NotFound("Order item not found.")

    # 2. Lock the parent Order explicitly.
    order = Order.objects.select_for_update().get(id=order_item.order_id)

    # 3. Validate the requested status transition.
    validate_order_item_transition(order_item.status, new_status)

    # 4. Lock Product and restore stock only for cancellation.
    if new_status == OrderItem.Status.CANCELLED:
        product = Product.objects.select_for_update().get(id=order_item.product_id)

        product.stock += order_item.quantity
        product.save(update_fields=["stock", "updated_at"])

    # 5. Update the OrderItem.
    order_item.status = new_status
    order_item.save(update_fields=["status", "updated_at"])

    # 6. Recalculate the parent Order.
    new_order_status = calculate_order_status(
        OrderItem.objects.filter(order=order).values_list(
            "status",
            flat=True,
        )
    )

    if order.status != new_order_status:
        order.status = new_order_status
        order.save(update_fields=["status", "updated_at"])

    return order_item


@transaction.atomic
def cancel_customer_order_item(*, order_id, order_item_id, customer_user):
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

    # 3. Customers can cancel only pending or confirmed items.
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

    # 4. Lock Product and restore stock.
    product = Product.objects.select_for_update().get(id=order_item.product_id)

    product.stock += order_item.quantity
    product.save(update_fields=["stock", "updated_at"])

    # 5. Cancel the OrderItem.
    order_item.status = OrderItem.Status.CANCELLED
    order_item.save(update_fields=["status", "updated_at"])

    # 6. Recalculate the parent Order.
    new_order_status = calculate_order_status(
        OrderItem.objects.filter(order=order).values_list(
            "status",
            flat=True,
        )
    )

    if order.status != new_order_status:
        order.status = new_order_status
        order.save(update_fields=["status", "updated_at"])

    return order_item

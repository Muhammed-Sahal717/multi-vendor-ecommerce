from decimal import Decimal

from django.db import transaction
from rest_framework.exceptions import ValidationError

from apps.cart.models import Cart, CartItem
from apps.catalog.models import Product
from apps.orders.models import Order, OrderItem


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

from apps.cart.models import Cart, CartItem
from apps.catalog.models import Product


def seed_demo_carts(customers: list, products: list) -> dict[str, int]:
    """
    Ensures carts exist for all demo customers.
    Populates active carts with items for specific customers to showcase cart states.
    """
    total_carts = 0
    total_cart_items = 0

    available_products = [p for p in products if p.status == Product.Status.APPROVED and p.stock > 5]

    for idx, customer in enumerate(customers):
        cart, _ = Cart.objects.get_or_create(user=customer)
        total_carts += 1

        # Populate carts for customers with index >= 14 (customers 15, 16, 17, 18)
        if idx >= 14 and available_products:
            # Clear existing items if any to avoid uniqueness clashes
            CartItem.objects.filter(cart=cart).delete()

            # Add 1 to 2 distinct items
            prod_1 = available_products[idx % len(available_products)]
            prod_2 = available_products[(idx + 3) % len(available_products)]

            CartItem.objects.create(cart=cart, product=prod_1, quantity=1)
            total_cart_items += 1

            if prod_1.id != prod_2.id:
                CartItem.objects.create(cart=cart, product=prod_2, quantity=2)
                total_cart_items += 1

    return {"carts": total_carts, "cart_items": total_cart_items}

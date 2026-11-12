from apps.cart.models import Cart, CartItem
from apps.cart.tests.base import CartTestBase


class CartItemTests(CartTestBase):
    def setUp(self):
        super().setUp()
        self.client.force_authenticate(self.customer)

    def test_customer_can_add_product(self):
        response = self.client.post(
            "/api/cart/items/",
            {
                "product": str(self.product.id),
                "quantity": 2,
            },
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(CartItem.objects.count(), 1)

    def test_customer_can_update_quantity(self):
        cart = Cart.objects.create(user=self.customer)
        item = CartItem.objects.create(
            cart=cart,
            product=self.product,
            quantity=2,
        )

        response = self.client.patch(
            f"/api/cart/items/{item.id}/",
            {"quantity": 5},
        )

        self.assertEqual(response.status_code, 200)
        item.refresh_from_db()
        self.assertEqual(item.quantity, 5)

    def test_customer_can_remove_item(self):
        cart = Cart.objects.create(user=self.customer)
        item = CartItem.objects.create(
            cart=cart,
            product=self.product,
            quantity=2,
        )

        response = self.client.delete(f"/api/cart/items/{item.id}/")

        self.assertEqual(response.status_code, 204)
        self.assertFalse(CartItem.objects.filter(pk=item.pk).exists())

    def test_quantity_cannot_exceed_stock(self):
        response = self.client.post(
            "/api/cart/items/",
            {
                "product": str(self.product.id),
                "quantity": 11,
            },
        )

        self.assertEqual(response.status_code, 400)

    def test_duplicate_product_cannot_be_added(self):
        cart = Cart.objects.create(user=self.customer)
        CartItem.objects.create(
            cart=cart,
            product=self.product,
            quantity=2,
        )

        response = self.client.post(
            "/api/cart/items/",
            {
                "product": str(self.product.id),
                "quantity": 3,
            },
        )

        self.assertEqual(response.status_code, 400)

    def test_customer_cannot_access_another_users_cart_item(self):
        another_customer = type(self.customer).objects.create_user(
            email="another@example.com",
            password="TestPass123!",
            first_name="Another",
            role="customer",
        )

        cart = Cart.objects.create(user=another_customer)
        item = CartItem.objects.create(
            cart=cart,
            product=self.product,
            quantity=1,
        )

        response = self.client.patch(
            f"/api/cart/items/{item.id}/",
            {"quantity": 3},
        )

        self.assertEqual(response.status_code, 404)

from apps.cart.models import Cart
from apps.cart.tests.base import CartTestBase


class CartDetailTests(CartTestBase):
    def test_customer_can_retrieve_cart(self):
        self.client.force_authenticate(self.customer)

        response = self.client.get("/api/cart/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(Cart.objects.filter(user=self.customer).count(), 1)

    def test_cart_is_created_only_when_requested(self):
        self.assertFalse(Cart.objects.filter(user=self.customer).exists())

    def test_seller_cannot_access_cart(self):
        self.client.force_authenticate(self.seller_user)

        response = self.client.get("/api/cart/")

        self.assertEqual(response.status_code, 403)

    def test_unauthenticated_user_cannot_access_cart(self):
        response = self.client.get("/api/cart/")

        self.assertEqual(response.status_code, 401)

    def test_empty_cart_returns_zero_totals(self):
        self.client.force_authenticate(self.customer)

        response = self.client.get("/api/cart/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["items"], [])
        self.assertEqual(response.data["total_items"], 0)
        self.assertEqual(response.data["total_price"], 0)

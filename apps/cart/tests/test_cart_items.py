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

    def test_inactive_product_cannot_be_added(self):
        self.product.is_active = False
        self.product.save()

        response = self.client.post(
            "/api/cart/items/",
            {"product": str(self.product.id), "quantity": 1},
        )

        self.assertEqual(response.status_code, 400)

    def test_pending_product_cannot_be_added(self):
        self.product.status = "pending"
        self.product.save()

        response = self.client.post(
            "/api/cart/items/",
            {"product": str(self.product.id), "quantity": 1},
        )

        self.assertEqual(response.status_code, 400)

    def test_inactive_seller_product_cannot_be_added(self):
        self.seller.status = "suspended"
        self.seller.save()

        response = self.client.post(
            "/api/cart/items/",
            {"product": str(self.product.id), "quantity": 1},
        )

        self.assertEqual(response.status_code, 400)

    def test_inactive_category_product_cannot_be_added(self):
        self.category.is_active = False
        self.category.save()

        response = self.client.post(
            "/api/cart/items/",
            {"product": str(self.product.id), "quantity": 1},
        )

        self.assertEqual(response.status_code, 400)

    def test_cart_item_product_cannot_be_changed(self):
        cart = Cart.objects.create(user=self.customer)
        item = CartItem.objects.create(
            cart=cart,
            product=self.product,
            quantity=2,
        )

        response = self.client.patch(
            f"/api/cart/items/{item.id}/",
            {"product": str(self.product.id), "quantity": 3},
        )

        self.assertEqual(response.status_code, 400)
        item.refresh_from_db()
        self.assertEqual(item.product_id, self.product.id)
        self.assertEqual(item.quantity, 2)

    def test_cart_returns_correct_total(self):
        self.client.post(
            "/api/cart/items/",
            {"product": str(self.product.id), "quantity": 3},
        )

        response = self.client.get("/api/cart/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["total_items"], 3)
        self.assertEqual(str(response.data["total_price"]), "300.00")

    def test_invalid_product_does_not_create_cart(self):
        response = self.client.post(
            "/api/cart/items/",
            {
                "product": "00000000-0000-0000-0000-000000000000",
                "quantity": 1,
            },
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(Cart.objects.filter(user=self.customer).exists())

    def test_unavailable_item_is_flagged_in_cart_response(self):
        cart = Cart.objects.create(user=self.customer)
        CartItem.objects.create(
            cart=cart,
            product=self.product,
            quantity=2,
        )

        self.product.stock = 1
        self.product.save()

        response = self.client.get("/api/cart/")

        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data["items"][0]["is_available"])

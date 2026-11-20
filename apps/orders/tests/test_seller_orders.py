from rest_framework import status

from apps.orders.models import OrderItem
from apps.orders.tests.base import OrderTestBase


class SellerOrderTests(OrderTestBase):
    def setUp(self):
        super().setUp()

        self.client.force_authenticate(user=self.customer)

        response = self.client.post(
            self.checkout_url,
            self.checkout_data,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        self.order_item = OrderItem.objects.get(product=self.product)

    def test_seller_can_list_own_order_items(self):
        self.client.force_authenticate(user=self.seller_user)

        response = self.client.get("/api/orders/seller/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(
            response.data[0]["id"],
            str(self.order_item.id),
        )

    def test_seller_can_retrieve_own_order_item(self):
        self.client.force_authenticate(user=self.seller_user)

        response = self.client.get(f"/api/orders/seller/{self.order_item.id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["product_name"], "Test Product")
        self.assertEqual(response.data["shipping_full_name"], "Test Customer")

    def test_seller_cannot_access_another_sellers_item(self):
        second_product = self.create_second_seller_product()

        second_item = OrderItem.objects.create(
            order=self.order_item.order,
            seller=second_product.seller,
            product=second_product,
            product_name=second_product.name,
            product_sku=second_product.sku,
            quantity=1,
            unit_price=second_product.price,
            subtotal=second_product.price,
        )

        self.client.force_authenticate(user=self.seller_user)

        response = self.client.get(f"/api/orders/seller/{second_item.id}/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_seller_only_sees_own_items_in_multi_seller_order(self):
        second_product = self.create_second_seller_product()

        OrderItem.objects.create(
            order=self.order_item.order,
            seller=second_product.seller,
            product=second_product,
            product_name=second_product.name,
            product_sku=second_product.sku,
            quantity=1,
            unit_price=second_product.price,
            subtotal=second_product.price,
        )

        self.client.force_authenticate(user=self.seller_user)

        response = self.client.get("/api/orders/seller/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(
            response.data[0]["id"],
            str(self.order_item.id),
        )

    def test_customer_cannot_access_seller_order_api(self):
        self.client.force_authenticate(user=self.customer)

        response = self.client.get("/api/orders/seller/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_inactive_seller_cannot_access_seller_orders(self):
        self.seller.status = "suspended"
        self.seller.save(update_fields=["status"])

        self.client.force_authenticate(user=self.seller_user)

        response = self.client.get("/api/orders/seller/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_seller_order_api_requires_authentication(self):
        self.client.force_authenticate(user=None)

        response = self.client.get("/api/orders/seller/")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

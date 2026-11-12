from rest_framework import status

from apps.orders.models import OrderItem
from apps.orders.tests.base import OrderTestBase


class SellerOrderStatusTests(OrderTestBase):
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
        self.status_url = f"/api/orders/seller/{self.order_item.id}/status/"

        self.client.force_authenticate(user=self.seller_user)

    def update_status(self, new_status):
        return self.client.patch(
            self.status_url,
            {"status": new_status},
            format="json",
        )

    def test_pending_to_confirmed(self):
        response = self.update_status("confirmed")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "confirmed")

    def test_pending_to_cancelled(self):
        response = self.update_status("cancelled")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "cancelled")

    def test_confirmed_to_processing(self):
        self.order_item.status = "confirmed"
        self.order_item.save(update_fields=["status"])

        response = self.update_status("processing")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_processing_to_shipped(self):
        self.order_item.status = "processing"
        self.order_item.save(update_fields=["status"])

        response = self.update_status("shipped")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_shipped_to_delivered(self):
        self.order_item.status = "shipped"
        self.order_item.save(update_fields=["status"])

        response = self.update_status("delivered")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_pending_cannot_skip_to_shipped(self):
        response = self.update_status("shipped")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        self.order_item.refresh_from_db()
        self.assertEqual(self.order_item.status, "pending")

    def test_delivered_item_cannot_change_status(self):
        self.order_item.status = "delivered"
        self.order_item.save(update_fields=["status"])

        response = self.update_status("processing")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cancelled_item_cannot_change_status(self):
        self.order_item.status = "cancelled"
        self.order_item.save(update_fields=["status"])

        response = self.update_status("confirmed")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_seller_cannot_modify_price_or_quantity(self):
        response = self.client.patch(
            self.status_url,
            {
                "status": "confirmed",
                "unit_price": "1.00",
                "quantity": 999,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.order_item.refresh_from_db()
        self.assertEqual(self.order_item.unit_price, 100)
        self.assertEqual(self.order_item.quantity, 2)

    def test_another_seller_cannot_update_item(self):
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

        response = self.client.patch(
            f"/api/orders/seller/{second_item.id}/status/",
            {"status": "confirmed"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_customer_cannot_update_seller_order_status(self):
        self.client.force_authenticate(user=self.customer)

        response = self.update_status("confirmed")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_invalid_status_is_rejected(self):
        response = self.update_status("invalid_status")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

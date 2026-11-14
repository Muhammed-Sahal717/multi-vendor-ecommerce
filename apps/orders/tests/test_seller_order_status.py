from rest_framework import status

from apps.orders.models import OrderItem, Order
from apps.orders.tests.base import OrderTestBase
from unittest.mock import patch
from apps.payments.models import Payment

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
    def make_online_payment(self):
        order = self.order_item.order
        payment = order.payment

        order.payment_method = Order.PaymentMethod.RAZORPAY
        order.save(update_fields=["payment_method"])

        payment.method = Payment.Method.RAZORPAY
        payment.provider = Payment.Provider.MOCK
        payment.save(update_fields=["method", "provider"])

        return payment


    def add_second_order_item(self):
        second_product = self.create_second_seller_product()
        order = self.order_item.order

        OrderItem.objects.create(
            order=order,
            seller=second_product.seller,
            product=second_product,
            product_name=second_product.name,
            product_sku=second_product.sku,
            quantity=1,
            unit_price=second_product.price,
            subtotal=second_product.price,
        )

        order.subtotal += second_product.price
        order.total_amount = order.subtotal + order.shipping_fee
        order.save(update_fields=["subtotal", "total_amount"])

        payment = order.payment
        payment.amount = order.total_amount
        payment.save(update_fields=["amount"])

        return second_product

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

    def test_confirming_item_updates_parent_order(self):
        response = self.update_status("confirmed")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.order_item.order.refresh_from_db()
        self.assertEqual(
            self.order_item.order.status,
            "confirmed",
        )

    def test_cancelling_only_item_cancels_parent_order(self):
        response = self.update_status("cancelled")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.order_item.order.refresh_from_db()
        self.assertEqual(
            self.order_item.order.status,
            "cancelled",
        )

    def test_cancelling_one_of_multiple_items_partially_cancels_order(self):
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

        response = self.update_status("cancelled")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.order_item.order.refresh_from_db()
        self.assertEqual(
            self.order_item.order.status,
            "partially_cancelled",
        )

    def test_processing_and_shipped_items_partially_ship_order(self):
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
            status="processing",
        )

        self.order_item.status = "processing"
        self.order_item.save(update_fields=["status"])

        response = self.update_status("shipped")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.order_item.order.refresh_from_db()
        self.assertEqual(
            self.order_item.order.status,
            "partially_shipped",
        )

    def test_shipped_and_delivered_items_partially_deliver_order(self):
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
            status="shipped",
        )

        self.order_item.status = "shipped"
        self.order_item.save(update_fields=["status"])

        response = self.update_status("delivered")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.order_item.order.refresh_from_db()
        self.assertEqual(
            self.order_item.order.status,
            "partially_delivered",
        )

    def test_cancelling_item_restores_product_stock(self):
        self.product.refresh_from_db()
        stock_after_checkout = self.product.stock

        response = self.update_status("cancelled")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.product.refresh_from_db()
        self.assertEqual(
            self.product.stock,
            stock_after_checkout + self.order_item.quantity,
        )

    def test_cancelling_item_twice_does_not_restore_stock_twice(self):
        response = self.update_status("cancelled")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.product.refresh_from_db()
        stock_after_cancellation = self.product.stock

        response = self.update_status("cancelled")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        self.product.refresh_from_db()
        self.assertEqual(
            self.product.stock,
            stock_after_cancellation,
        )

    def test_confirming_item_does_not_change_stock(self):
        self.product.refresh_from_db()
        stock_before = self.product.stock

        response = self.update_status("confirmed")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, stock_before)

    def test_failed_transition_does_not_change_stock(self):
        self.product.refresh_from_db()
        stock_before = self.product.stock

        response = self.update_status("shipped")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, stock_before)

    def test_another_seller_cannot_restore_product_stock(self):
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

        second_product.refresh_from_db()
        stock_before = second_product.stock

        response = self.client.patch(
            f"/api/orders/seller/{second_item.id}/status/",
            {"status": "cancelled"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        second_product.refresh_from_db()
        self.assertEqual(second_product.stock, stock_before)

    @patch(
        "apps.orders.services.calculate_order_status",
        side_effect=Exception("Simulated aggregation failure"),
    )
    def test_cancellation_rolls_back_stock_and_status(self, mock_update):
        self.product.refresh_from_db()
        stock_before = self.product.stock

        with self.assertRaises(Exception):
            self.update_status("cancelled")

        self.product.refresh_from_db()
        self.order_item.refresh_from_db()

        self.assertEqual(self.product.stock, stock_before)
        self.assertEqual(self.order_item.status, "pending")
    def test_partial_seller_cancellation_updates_payment_amount(self):
        payment = self.make_online_payment()
        second_product = self.add_second_order_item()

        response = self.update_status("cancelled")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        payment.refresh_from_db()
        self.assertEqual(payment.amount, second_product.price)
        self.assertEqual(payment.status, Payment.Status.PENDING)


    def test_full_seller_cancellation_cancels_payment(self):
        payment = self.make_online_payment()

        response = self.update_status("cancelled")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        payment.refresh_from_db()
        self.assertEqual(payment.status, Payment.Status.CANCELLED)


    def test_seller_cannot_cancel_successfully_paid_order(self):
        payment = self.make_online_payment()
        payment.status = Payment.Status.SUCCESSFUL
        payment.save(update_fields=["status"])

        self.product.refresh_from_db()
        stock_before = self.product.stock

        response = self.update_status("cancelled")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        self.order_item.refresh_from_db()
        payment.refresh_from_db()
        self.product.refresh_from_db()

        self.assertEqual(self.order_item.status, OrderItem.Status.PENDING)
        self.assertEqual(payment.status, Payment.Status.SUCCESSFUL)
        self.assertEqual(self.product.stock, stock_before)


    def test_seller_cannot_confirm_unpaid_online_order(self):
        self.make_online_payment()

        response = self.update_status("confirmed")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        self.order_item.refresh_from_db()
        self.assertEqual(self.order_item.status, OrderItem.Status.PENDING)


    def test_seller_cannot_process_unpaid_online_order(self):
        self.make_online_payment()

        self.order_item.status = OrderItem.Status.CONFIRMED
        self.order_item.save(update_fields=["status"])

        response = self.update_status("processing")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        self.order_item.refresh_from_db()
        self.assertEqual(self.order_item.status, OrderItem.Status.CONFIRMED)
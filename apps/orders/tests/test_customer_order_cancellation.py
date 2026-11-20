from rest_framework import status
from apps.cart.models import CartItem
from apps.orders.models import Order, OrderItem
from apps.orders.tests.base import OrderTestBase

from apps.audit.constants import AuditAction, AuditEntity
from apps.audit.models import AuditEvent
from django.contrib.auth import get_user_model
from apps.payments.models import Payment, PaymentAttempt

User = get_user_model()


class CustomerOrderCancellationTests(OrderTestBase):
    def setUp(self):
        super().setUp()

        self.client.force_authenticate(user=self.customer)

        response = self.client.post(
            self.checkout_url,
            self.checkout_data,
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        self.order = Order.objects.get(user=self.customer)
        self.order_item = self.order.items.get(product=self.product)

        self.cancel_url = (
            f"/api/orders/{self.order.id}/items/{self.order_item.id}/cancel/"
        )

        self.product.refresh_from_db()
        self.stock_after_checkout = self.product.stock

    def cancel_item(self):
        return self.client.post(self.cancel_url)

    def test_customer_can_cancel_pending_item(self):
        response = self.cancel_item()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "cancelled")

        self.order_item.refresh_from_db()
        self.assertEqual(self.order_item.status, "cancelled")

    def test_customer_can_cancel_confirmed_item(self):
        self.order_item.status = OrderItem.Status.CONFIRMED
        self.order_item.save(update_fields=["status"])

        response = self.cancel_item()

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.order_item.refresh_from_db()
        self.assertEqual(self.order_item.status, "cancelled")

    def test_customer_cannot_cancel_processing_item(self):
        self.order_item.status = OrderItem.Status.PROCESSING
        self.order_item.save(update_fields=["status"])

        response = self.cancel_item()

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        self.order_item.refresh_from_db()
        self.assertEqual(self.order_item.status, "processing")

    def test_customer_cannot_cancel_shipped_item(self):
        self.order_item.status = OrderItem.Status.SHIPPED
        self.order_item.save(update_fields=["status"])

        response = self.cancel_item()

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_customer_cannot_cancel_delivered_item(self):
        self.order_item.status = OrderItem.Status.DELIVERED
        self.order_item.save(update_fields=["status"])

        response = self.cancel_item()

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_customer_cannot_cancel_another_customers_item(self):
        other_customer = User.objects.create_user(
            email="another@example.com",
            password="TestPass123!",
            first_name="Another Customer",
            role="customer",
        )

        self.client.force_authenticate(user=other_customer)

        response = self.cancel_item()

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_customer_cannot_cancel_item_from_another_order(self):
        # Create a second order for the same customer.
        CartItem.objects.create(
            cart=self.cart,
            product=self.product,
            quantity=1,
        )

        response = self.client.post(
            self.checkout_url,
            self.checkout_data,
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        second_order = Order.objects.exclude(id=self.order.id).get()

        # Try cancelling the first order's item through the second order.
        response = self.client.post(
            f"/api/orders/{second_order.id}/items/{self.order_item.id}/cancel/"
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        self.order_item.refresh_from_db()
        self.assertEqual(self.order_item.status, OrderItem.Status.PENDING)

    def test_cancellation_restores_product_stock(self):
        response = self.cancel_item()

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.product.refresh_from_db()
        self.assertEqual(
            self.product.stock,
            self.stock_after_checkout + self.order_item.quantity,
        )

    def test_duplicate_cancellation_does_not_restore_stock_twice(self):
        response = self.cancel_item()
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.product.refresh_from_db()
        stock_after_cancellation = self.product.stock

        response = self.cancel_item()
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, stock_after_cancellation)

    def test_cancellation_updates_parent_order_status(self):
        response = self.cancel_item()

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.order.refresh_from_db()
        self.assertEqual(self.order.status, Order.Status.CANCELLED)

    def test_cancelling_one_item_partially_cancels_parent_order(self):
        second_product = self.create_second_seller_product()

        OrderItem.objects.create(
            order=self.order,
            seller=second_product.seller,
            product=second_product,
            product_name=second_product.name,
            product_sku=second_product.sku,
            quantity=1,
            unit_price=second_product.price,
            subtotal=second_product.price,
        )

        response = self.cancel_item()

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.order.refresh_from_db()
        self.assertEqual(
            self.order.status,
            Order.Status.PARTIALLY_CANCELLED,
        )

    def test_seller_cannot_use_customer_cancellation_endpoint(self):
        self.client.force_authenticate(user=self.seller_user)

        response = self.cancel_item()

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def make_online_payment(self):
        payment = self.order.payment
        payment.method = Payment.Method.RAZORPAY
        payment.provider = Payment.Provider.MOCK
        payment.save(update_fields=["method", "provider"])

        self.order.payment_method = Order.PaymentMethod.RAZORPAY
        self.order.save(update_fields=["payment_method"])

        return payment

    def test_partial_cancellation_updates_pending_payment_amount(self):
        payment = self.make_online_payment()
        second_product = self.create_second_seller_product()

        OrderItem.objects.create(
            order=self.order,
            seller=second_product.seller,
            product=second_product,
            product_name=second_product.name,
            product_sku=second_product.sku,
            quantity=1,
            unit_price=second_product.price,
            subtotal=second_product.price,
        )

        payment.amount = self.order.total_amount + second_product.price
        payment.save(update_fields=["amount"])

        response = self.cancel_item()
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        payment.refresh_from_db()
        self.assertEqual(payment.amount, second_product.price)
        self.assertEqual(payment.status, Payment.Status.PENDING)
        self.assertFalse(
            AuditEvent.objects.filter(
                action=AuditAction.PAYMENT_CANCELLED,
                entity_id=payment.id,
            ).exists()
        )

    def test_full_cancellation_cancels_pending_payment(self):
        payment = self.make_online_payment()

        response = self.cancel_item()
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        payment.refresh_from_db()
        self.assertEqual(payment.status, Payment.Status.CANCELLED)
        event = AuditEvent.objects.get(
            action=AuditAction.PAYMENT_CANCELLED,
            entity_type=AuditEntity.PAYMENT,
            entity_id=payment.id,
        )

        self.assertEqual(event.actor, self.customer)
        self.assertEqual(
            event.metadata,
            {
                "order_id": str(self.order.id),
                "reason": "All order items were cancelled by the customer.",
            },
        )

    def test_customer_cannot_cancel_successfully_paid_online_order(self):
        payment = self.make_online_payment()
        payment.status = Payment.Status.SUCCESSFUL
        payment.save(update_fields=["status"])

        response = self.cancel_item()

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        self.order_item.refresh_from_db()
        self.assertEqual(self.order_item.status, OrderItem.Status.PENDING)

    def test_customer_cancellation_creates_audit_event(self):
        response = self.cancel_item()

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        event = AuditEvent.objects.get(
            action=AuditAction.ORDER_ITEM_CANCELLED,
            entity_type=AuditEntity.ORDER_ITEM,
            entity_id=self.order_item.id,
        )

        self.assertEqual(event.actor, self.customer)
        self.assertEqual(
            event.metadata,
            {
                "order_id": str(self.order.id),
                "product_name": self.order_item.product_name,
                "quantity": self.order_item.quantity,
            },
        )

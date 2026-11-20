from django.contrib.auth import get_user_model

from rest_framework.exceptions import NotFound, ValidationError
from rest_framework import status

from decimal import Decimal

from apps.cart.models import CartItem
from apps.orders.models import Order, OrderItem
from apps.orders.tests.base import OrderTestBase
from apps.payments.models import Payment, PaymentAttempt
from apps.audit.constants import AuditAction, AuditEntity
from apps.audit.models import AuditEvent
from apps.payments.services import (
    confirm_cod_payment_collection,
    process_mock_payment,
)

User = get_user_model()


class MockPaymentServiceTests(OrderTestBase):
    def setUp(self):
        super().setUp()

        self.client.force_authenticate(user=self.customer)

        checkout_data = {
            **self.checkout_data,
            "payment_method": "razorpay",
        }

        response = self.client.post(
            self.checkout_url,
            checkout_data,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        self.payment = Payment.objects.get(order__user=self.customer)

    def process_payment(self, outcome, failure_reason=""):
        return process_mock_payment(
            payment_id=self.payment.id,
            customer_user=self.customer,
            outcome=outcome,
            failure_reason=failure_reason,
        )

    def test_successful_payment(self):
        attempt = self.process_payment(
            PaymentAttempt.Status.SUCCESSFUL,
        )

        self.payment.refresh_from_db()

        self.assertEqual(attempt.status, PaymentAttempt.Status.SUCCESSFUL)
        self.assertEqual(attempt.attempt_number, 1)
        self.assertEqual(self.payment.status, Payment.Status.SUCCESSFUL)
        self.assertIsNotNone(self.payment.paid_at)

        event = AuditEvent.objects.get(
            action=AuditAction.PAYMENT_SUCCEEDED,
            entity_id=self.payment.id,
        )

        self.assertEqual(event.actor, self.customer)
        self.assertEqual(event.entity_type, AuditEntity.PAYMENT)
        self.assertEqual(
            event.metadata["attempt_id"],
            str(attempt.id),
        )

    def test_failed_payment_keeps_payment_pending(self):
        attempt = self.process_payment(
            PaymentAttempt.Status.FAILED,
            failure_reason="Mock payment declined.",
        )

        self.payment.refresh_from_db()

        self.assertEqual(attempt.status, PaymentAttempt.Status.FAILED)
        self.assertEqual(
            attempt.failure_reason,
            "Mock payment declined.",
        )
        self.assertEqual(self.payment.status, Payment.Status.PENDING)
        self.assertIsNone(self.payment.paid_at)

        event = AuditEvent.objects.get(
            action=AuditAction.PAYMENT_FAILED,
            entity_id=self.payment.id,
        )

        self.assertEqual(event.actor, self.customer)
        self.assertEqual(event.entity_type, AuditEntity.PAYMENT)
        self.assertEqual(
            event.metadata["failure_reason"],
            "Mock payment declined.",
        )
        self.assertEqual(
            event.metadata["attempt_id"],
            str(attempt.id),
        )

    def test_failed_payment_can_be_retried_successfully(self):
        first_attempt = self.process_payment(
            PaymentAttempt.Status.FAILED,
        )

        second_attempt = self.process_payment(
            PaymentAttempt.Status.SUCCESSFUL,
        )

        self.payment.refresh_from_db()

        self.assertEqual(first_attempt.attempt_number, 1)
        self.assertEqual(second_attempt.attempt_number, 2)
        self.assertEqual(self.payment.status, Payment.Status.SUCCESSFUL)
        self.assertEqual(self.payment.attempts.count(), 2)
        self.assertEqual(
            AuditEvent.objects.filter(
                entity_id=self.payment.id,
                action=AuditAction.PAYMENT_FAILED,
            ).count(),
            1,
        )

        self.assertEqual(
            AuditEvent.objects.filter(
                entity_id=self.payment.id,
                action=AuditAction.PAYMENT_SUCCEEDED,
            ).count(),
            1,
        )

    def test_another_customer_cannot_process_payment(self):
        another_customer = User.objects.create_user(
            email="another@example.com",
            password="TestPass123!",
            first_name="Another",
            role="customer",
        )

        with self.assertRaises(NotFound):
            process_mock_payment(
                payment_id=self.payment.id,
                customer_user=another_customer,
                outcome=PaymentAttempt.Status.SUCCESSFUL,
            )

    def test_completed_payment_cannot_be_processed_again(self):
        self.process_payment(PaymentAttempt.Status.SUCCESSFUL)

        with self.assertRaises(ValidationError):
            self.process_payment(PaymentAttempt.Status.SUCCESSFUL)

        self.assertEqual(self.payment.attempts.count(), 1)

    def test_cod_payment_cannot_use_mock_gateway(self):
        CartItem.objects.create(
            cart=self.cart,
            product=self.product,
            quantity=1,
        )

        checkout_data = {
            **self.checkout_data,
            "payment_method": "cod",
        }

        response = self.client.post(
            self.checkout_url,
            checkout_data,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        cod_payment = Payment.objects.get(
            order__payment_method="cod",
            order__user=self.customer,
        )

        with self.assertRaises(ValidationError):
            process_mock_payment(
                payment_id=cod_payment.id,
                customer_user=self.customer,
                outcome=PaymentAttempt.Status.SUCCESSFUL,
            )

    def test_invalid_payment_outcome_is_rejected(self):
        with self.assertRaises(ValidationError):
            self.process_payment("invalid")

    def test_cancelled_payment_cannot_be_processed_again(self):
        self.payment.status = Payment.Status.CANCELLED
        self.payment.save(update_fields=["status"])

        with self.assertRaises(ValidationError):
            self.process_payment(PaymentAttempt.Status.SUCCESSFUL)

        self.assertEqual(self.payment.attempts.count(), 0)


class CODPaymentServiceTests(OrderTestBase):
    def setUp(self):
        super().setUp()

        self.admin = User.objects.create_user(
            email="service_admin@example.com",
            password="StrongPassword123!",
            first_name="Admin",
            last_name="User",
            role=User.Role.ADMIN,
        )

        self.client.force_authenticate(user=self.customer)

        response = self.client.post(
            self.checkout_url,
            self.checkout_data,
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        self.order = Order.objects.get(user=self.customer, payment_method="cod")
        self.payment = Payment.objects.get(order=self.order)
        self.order_item = self.order.items.first()

    def test_fully_delivered_cod_order_confirmation_succeeds(self):
        self.order.status = Order.Status.DELIVERED
        self.order.save(update_fields=["status"])

        self.order_item.status = OrderItem.Status.DELIVERED
        self.order_item.save(update_fields=["status"])

        initial_amount = self.payment.amount

        confirmed = confirm_cod_payment_collection(
            payment_id=self.payment.id,
            actor=self.admin,
        )

        self.payment.refresh_from_db()
        self.assertEqual(confirmed.status, Payment.Status.SUCCESSFUL)
        self.assertEqual(self.payment.status, Payment.Status.SUCCESSFUL)
        self.assertIsNotNone(self.payment.paid_at)
        # Verify payment amount remains unchanged
        self.assertEqual(self.payment.amount, initial_amount)

        # Verify exactly one PAYMENT_SUCCEEDED audit event
        events = AuditEvent.objects.filter(
            action=AuditAction.PAYMENT_SUCCEEDED,
            entity_id=self.payment.id,
        )
        self.assertEqual(events.count(), 1)
        self.assertEqual(events.first().actor, self.admin)

    def test_partially_cancelled_cod_order_with_delivered_items_succeeds(self):
        self.order.status = Order.Status.PARTIALLY_CANCELLED
        self.order.save(update_fields=["status"])

        self.order_item.status = OrderItem.Status.DELIVERED
        self.order_item.save(update_fields=["status"])

        # Second item that was cancelled
        OrderItem.objects.create(
            order=self.order,
            seller=self.seller,
            product=self.product,
            product_name="Second Product",
            product_sku="SP-002",
            quantity=1,
            unit_price=self.product.price,
            subtotal=self.product.price,
            status=OrderItem.Status.CANCELLED,
        )

        initial_amount = self.payment.amount

        confirmed = confirm_cod_payment_collection(
            payment_id=self.payment.id,
            actor=self.admin,
        )

        self.payment.refresh_from_db()
        self.assertEqual(confirmed.status, Payment.Status.SUCCESSFUL)
        self.assertEqual(self.payment.status, Payment.Status.SUCCESSFUL)
        self.assertIsNotNone(self.payment.paid_at)
        self.assertEqual(self.payment.amount, initial_amount)

        events = AuditEvent.objects.filter(
            action=AuditAction.PAYMENT_SUCCEEDED,
            entity_id=self.payment.id,
        )
        self.assertEqual(events.count(), 1)

    def test_all_items_cancelled_confirmation_rejected(self):
        self.order.status = Order.Status.CANCELLED
        self.order.save(update_fields=["status"])

        self.order_item.status = OrderItem.Status.CANCELLED
        self.order_item.save(update_fields=["status"])

        with self.assertRaises(ValidationError):
            confirm_cod_payment_collection(
                payment_id=self.payment.id,
                actor=self.admin,
            )

        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, Payment.Status.PENDING)

    def test_one_item_still_processing_confirmation_rejected(self):
        self.order.status = Order.Status.PARTIALLY_CANCELLED
        self.order.save(update_fields=["status"])

        self.order_item.status = OrderItem.Status.DELIVERED
        self.order_item.save(update_fields=["status"])

        OrderItem.objects.create(
            order=self.order,
            seller=self.seller,
            product=self.product,
            product_name="Processing Item",
            product_sku="PI-001",
            quantity=1,
            unit_price=self.product.price,
            subtotal=self.product.price,
            status=OrderItem.Status.PROCESSING,
        )

        with self.assertRaises(ValidationError):
            confirm_cod_payment_collection(
                payment_id=self.payment.id,
                actor=self.admin,
            )

        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, Payment.Status.PENDING)

    def test_one_item_still_shipped_confirmation_rejected(self):
        self.order.status = Order.Status.PARTIALLY_CANCELLED
        self.order.save(update_fields=["status"])

        self.order_item.status = OrderItem.Status.DELIVERED
        self.order_item.save(update_fields=["status"])

        OrderItem.objects.create(
            order=self.order,
            seller=self.seller,
            product=self.product,
            product_name="Shipped Item",
            product_sku="SI-001",
            quantity=1,
            unit_price=self.product.price,
            subtotal=self.product.price,
            status=OrderItem.Status.SHIPPED,
        )

        with self.assertRaises(ValidationError):
            confirm_cod_payment_collection(
                payment_id=self.payment.id,
                actor=self.admin,
            )

        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, Payment.Status.PENDING)

    def test_pending_cod_with_invalid_order_status_confirmation_rejected(self):
        self.order_item.status = OrderItem.Status.DELIVERED
        self.order_item.save(update_fields=["status"])

        for invalid_status in [
            Order.Status.PENDING,
            Order.Status.CONFIRMED,
            Order.Status.PROCESSING,
            Order.Status.SHIPPED,
        ]:
            with self.subTest(invalid_status=invalid_status):
                self.order.status = invalid_status
                self.order.save(update_fields=["status"])

                with self.assertRaises(ValidationError):
                    confirm_cod_payment_collection(
                        payment_id=self.payment.id,
                        actor=self.admin,
                    )

                self.payment.refresh_from_db()
                self.assertEqual(self.payment.status, Payment.Status.PENDING)

    def test_already_successful_payment_duplicate_confirmation_rejected(self):
        self.order.status = Order.Status.DELIVERED
        self.order.save(update_fields=["status"])

        self.order_item.status = OrderItem.Status.DELIVERED
        self.order_item.save(update_fields=["status"])

        confirm_cod_payment_collection(
            payment_id=self.payment.id,
            actor=self.admin,
        )

        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, Payment.Status.SUCCESSFUL)

        initial_event_count = AuditEvent.objects.filter(
            action=AuditAction.PAYMENT_SUCCEEDED,
            entity_id=self.payment.id,
        ).count()
        self.assertEqual(initial_event_count, 1)

        with self.assertRaises(ValidationError):
            confirm_cod_payment_collection(
                payment_id=self.payment.id,
                actor=self.admin,
            )

        new_event_count = AuditEvent.objects.filter(
            action=AuditAction.PAYMENT_SUCCEEDED,
            entity_id=self.payment.id,
        ).count()
        self.assertEqual(new_event_count, initial_event_count)

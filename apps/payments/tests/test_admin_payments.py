from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import connection
from django.test import TransactionTestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.test import APITestCase

from apps.accounts.models import Address
from apps.audit.constants import AuditAction, AuditEntity
from apps.audit.models import AuditEvent
from apps.catalog.models import Category, Product
from apps.orders.models import Order, OrderItem
from apps.payments.models import Payment, PaymentAttempt
from apps.payments.services import confirm_cod_payment_collection
from apps.sellers.models import SellerProfile

User = get_user_model()


class AdminPaymentTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            email="admin@example.com",
            password="StrongPassword123!",
            first_name="Admin",
            last_name="User",
            role=User.Role.ADMIN,
        )
        self.superadmin = User.objects.create_superuser(
            email="superadmin@example.com",
            password="StrongPassword123!",
            first_name="Super",
            last_name="Admin",
        )
        self.customer = User.objects.create_user(
            email="customer@example.com",
            password="StrongPassword123!",
            first_name="John",
            last_name="Doe",
            role=User.Role.CUSTOMER,
        )
        self.customer2 = User.objects.create_user(
            email="jane@example.com",
            password="StrongPassword123!",
            first_name="Jane",
            last_name="Smith",
            role=User.Role.CUSTOMER,
        )
        self.seller_user = User.objects.create_user(
            email="seller@example.com",
            password="StrongPassword123!",
            first_name="Seller",
            last_name="One",
            role=User.Role.SELLER,
        )
        self.seller = SellerProfile.objects.create(
            user=self.seller_user,
            business_name="Kerala Spices Ltd",
            business_type="Retail",
            business_email="spices@example.com",
            business_phone="9876543210",
            business_address="123 Spices Road",
            city="Kochi",
            state="Kerala",
            postal_code="682001",
            status=SellerProfile.Status.ACTIVE,
            approved_at=timezone.now(),
        )

        self.category = Category.objects.create(name="Spices", is_active=True)
        self.product = Product.objects.create(
            seller=self.seller,
            category=self.category,
            name="Black Pepper",
            sku="BP-001",
            price=Decimal("250.00"),
            stock=100,
            status=Product.Status.APPROVED,
            is_active=True,
        )

        # Payment 1: COD Pending (Order 1)
        self.order1 = Order.objects.create(
            user=self.customer,
            status=Order.Status.DELIVERED,
            payment_method=Order.PaymentMethod.COD,
            subtotal=Decimal("500.00"),
            shipping_fee=Decimal("0.00"),
            total_amount=Decimal("500.00"),
            shipping_full_name="John Doe",
            shipping_mobile="9876543210",
            shipping_address_line_1="100 Marine Drive",
            shipping_city="Kochi",
            shipping_state="Kerala",
            shipping_postal_code="682001",
            shipping_country="India",
        )
        self.payment1 = Payment.objects.create(
            order=self.order1,
            method=Payment.Method.COD,
            provider=Payment.Provider.MANUAL,
            amount=Decimal("500.00"),
            status=Payment.Status.PENDING,
        )
        self.item1_1 = OrderItem.objects.create(
            order=self.order1,
            seller=self.seller,
            product=self.product,
            product_name=self.product.name,
            product_sku=self.product.sku,
            quantity=2,
            unit_price=self.product.price,
            subtotal=Decimal("500.00"),
            status=OrderItem.Status.DELIVERED,
        )

        # Payment 2: Razorpay Successful with attempts (Order 2)
        self.order2 = Order.objects.create(
            user=self.customer2,
            status=Order.Status.PROCESSING,
            payment_method=Order.PaymentMethod.RAZORPAY,
            subtotal=Decimal("1000.00"),
            shipping_fee=Decimal("0.00"),
            total_amount=Decimal("1000.00"),
            shipping_full_name="Jane Smith",
            shipping_mobile="9876543211",
            shipping_address_line_1="200 Park Avenue",
            shipping_city="Calicut",
            shipping_state="Kerala",
            shipping_postal_code="673001",
            shipping_country="India",
        )
        self.payment2 = Payment.objects.create(
            order=self.order2,
            method=Payment.Method.RAZORPAY,
            provider=Payment.Provider.MOCK,
            amount=Decimal("1000.00"),
            status=Payment.Status.SUCCESSFUL,
            paid_at=timezone.now(),
        )
        self.attempt2 = PaymentAttempt.objects.create(
            payment=self.payment2,
            attempt_number=1,
            status=PaymentAttempt.Status.SUCCESSFUL,
        )

        self.list_url = "/api/payments/admin/"
        self.detail_url_1 = f"/api/payments/admin/{self.payment1.id}/"
        self.detail_url_2 = f"/api/payments/admin/{self.payment2.id}/"
        self.confirm_cod_url_1 = f"/api/payments/admin/{self.payment1.id}/confirm-cod/"

    # --- Authorization Tests ---

    def test_anonymous_user_cannot_access_admin_endpoints(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        response = self.client.get(self.detail_url_1)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        response = self.client.post(self.confirm_cod_url_1)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_customer_cannot_access_admin_endpoints(self):
        self.client.force_authenticate(user=self.customer)

        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        response = self.client.get(self.detail_url_1)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        response = self.client.post(self.confirm_cod_url_1)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_seller_cannot_access_admin_endpoints(self):
        self.client.force_authenticate(user=self.seller_user)

        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        response = self.client.get(self.detail_url_1)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        response = self.client.post(self.confirm_cod_url_1)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_superadmin_can_access_admin_endpoints(self):
        self.client.force_authenticate(user=self.superadmin)

        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        response = self.client.get(self.detail_url_1)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    # --- Payment Listing Tests ---

    def test_admin_can_list_payments_with_pagination(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("results", response.data)
        self.assertIn("count", response.data)
        self.assertEqual(response.data["count"], 2)

        results = response.data["results"]
        # Verify fields of payment in listing
        item = next(p for p in results if str(p["id"]) == str(self.payment1.id))
        self.assertEqual(str(item["order_id"]), str(self.order1.id))
        self.assertEqual(item["order_number"], self.order1.order_number)
        self.assertEqual(item["customer_email"], self.customer.email)
        self.assertEqual(item["method"], Payment.Method.COD)
        self.assertEqual(item["provider"], Payment.Provider.MANUAL)
        self.assertEqual(item["status"], Payment.Status.PENDING)
        self.assertEqual(Decimal(item["amount"]), Decimal("500.00"))
        self.assertIsNone(item["transaction_reference"])
        self.assertIsNone(item["paid_at"])

        # Check payment 2 with transaction reference
        item2 = next(p for p in results if str(p["id"]) == str(self.payment2.id))
        self.assertEqual(
            item2["transaction_reference"],
            self.attempt2.transaction_reference,
        )

    def test_admin_can_filter_by_status(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.get(self.list_url, {"status": "pending"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(str(response.data["results"][0]["id"]), str(self.payment1.id))

        response = self.client.get(self.list_url, {"status": "successful"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(str(response.data["results"][0]["id"]), str(self.payment2.id))

        response = self.client.get(self.list_url, {"status": "invalid_status"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_can_filter_by_method_and_provider(self):
        self.client.force_authenticate(user=self.admin)

        # Filter by method
        response = self.client.get(self.list_url, {"method": "cod"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

        response = self.client.get(self.list_url, {"method": "invalid_method"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Filter by provider
        response = self.client.get(self.list_url, {"provider": "mock"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

        response = self.client.get(self.list_url, {"provider": "invalid_provider"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_can_search_payments(self):
        self.client.force_authenticate(user=self.admin)

        # Search by order_number
        response = self.client.get(self.list_url, {"search": self.order1.order_number})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(str(response.data["results"][0]["id"]), str(self.payment1.id))

        # Search by customer email
        response = self.client.get(self.list_url, {"search": "jane@example.com"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(str(response.data["results"][0]["id"]), str(self.payment2.id))

        # Search by transaction_reference
        response = self.client.get(
            self.list_url,
            {"search": self.attempt2.transaction_reference},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(str(response.data["results"][0]["id"]), str(self.payment2.id))

    def test_admin_can_filter_by_date_range(self):
        self.client.force_authenticate(user=self.admin)

        today_str = timezone.localdate().strftime("%Y-%m-%d")
        yesterday_str = (timezone.localdate() - timedelta(days=1)).strftime("%Y-%m-%d")
        tomorrow_str = (timezone.localdate() + timedelta(days=1)).strftime("%Y-%m-%d")

        response = self.client.get(
            self.list_url,
            {"date_from": yesterday_str, "date_to": tomorrow_str},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)

        # Invalid format
        response = self.client.get(self.list_url, {"date_from": "not-a-date"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # date_from > date_to
        response = self.client.get(
            self.list_url,
            {"date_from": tomorrow_str, "date_to": yesterday_str},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # --- Payment Detail Tests ---

    def test_admin_can_retrieve_payment_detail(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.get(self.detail_url_2)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.data
        self.assertEqual(str(data["id"]), str(self.payment2.id))
        self.assertEqual(data["method"], Payment.Method.RAZORPAY)
        self.assertEqual(data["provider"], Payment.Provider.MOCK)
        self.assertEqual(Decimal(data["amount"]), Decimal("1000.00"))
        self.assertEqual(data["status"], Payment.Status.SUCCESSFUL)
        self.assertIsNotNone(data["paid_at"])

        # Order summary
        self.assertEqual(str(data["order"]["id"]), str(self.order2.id))
        self.assertEqual(data["order"]["order_number"], self.order2.order_number)
        self.assertEqual(data["order"]["status"], Order.Status.PROCESSING)
        self.assertEqual(Decimal(data["order"]["total_amount"]), Decimal("1000.00"))

        # Customer identity
        self.assertEqual(str(data["customer"]["id"]), str(self.customer2.id))
        self.assertEqual(data["customer"]["email"], self.customer2.email)
        self.assertEqual(data["customer"]["first_name"], self.customer2.first_name)
        self.assertEqual(data["customer"]["last_name"], self.customer2.last_name)

        # Attempts history
        self.assertEqual(len(data["attempts"]), 1)
        self.assertEqual(
            data["attempts"][0]["transaction_reference"],
            self.attempt2.transaction_reference,
        )

    def test_retrieve_payment_detail_not_found(self):
        self.client.force_authenticate(user=self.admin)
        non_existent_id = "00000000-0000-0000-0000-000000000000"
        response = self.client.get(f"/api/payments/admin/{non_existent_id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # --- COD Collection Confirmation Tests ---

    def test_admin_can_confirm_cod_payment_collection_successfully(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            self.confirm_cod_url_1,
            REMOTE_ADDR="192.168.1.50",
            HTTP_USER_AGENT="Admin-Portal-v1",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.payment1.refresh_from_db()
        self.assertEqual(self.payment1.status, Payment.Status.SUCCESSFUL)
        self.assertIsNotNone(self.payment1.paid_at)
        self.assertEqual(self.payment1.amount, Decimal("500.00"))

        # Verify returned data
        self.assertEqual(response.data["status"], Payment.Status.SUCCESSFUL)
        self.assertIsNotNone(response.data["paid_at"])

        # Verify Audit Event
        audit_events = AuditEvent.objects.filter(
            action=AuditAction.PAYMENT_SUCCEEDED,
            entity_type=AuditEntity.PAYMENT,
            entity_id=self.payment1.id,
        )
        self.assertEqual(audit_events.count(), 1)
        audit_event = audit_events.first()
        self.assertEqual(audit_event.actor, self.admin)
        self.assertEqual(audit_event.metadata["order_id"], str(self.order1.id))
        self.assertEqual(audit_event.metadata["order_number"], self.order1.order_number)
        self.assertEqual(audit_event.metadata["method"], Payment.Method.COD)
        self.assertEqual(audit_event.metadata["provider"], Payment.Provider.MANUAL)
        self.assertEqual(audit_event.metadata["amount"], "500.00")
        self.assertEqual(
            audit_event.metadata["confirmation_type"],
            "admin_cod_collection",
        )
        self.assertEqual(audit_event.ip_address, "192.168.1.50")
        self.assertEqual(audit_event.user_agent, "Admin-Portal-v1")

    def test_cannot_confirm_cod_collection_repeatedly(self):
        self.client.force_authenticate(user=self.admin)

        # First confirmation succeeds
        response1 = self.client.post(self.confirm_cod_url_1)
        self.assertEqual(response1.status_code, status.HTTP_200_OK)

        initial_audit_count = AuditEvent.objects.filter(
            entity_id=self.payment1.id,
        ).count()

        # Second confirmation must be rejected
        response2 = self.client.post(self.confirm_cod_url_1)
        self.assertEqual(response2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already", str(response2.data))

        # No new audit events recorded
        new_audit_count = AuditEvent.objects.filter(
            entity_id=self.payment1.id,
        ).count()
        self.assertEqual(new_audit_count, initial_audit_count)

    def test_cannot_confirm_cod_for_non_delivered_order(self):
        self.client.force_authenticate(user=self.admin)

        self.order1.status = Order.Status.SHIPPED
        self.order1.save(update_fields=["status"])

        response = self.client.post(self.confirm_cod_url_1)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("not delivered", str(response.data))

        self.payment1.refresh_from_db()
        self.assertEqual(self.payment1.status, Payment.Status.PENDING)

    def test_cannot_confirm_cod_when_order_items_not_delivered(self):
        self.client.force_authenticate(user=self.admin)

        # Item 1 is SHIPPED instead of DELIVERED
        self.item1_1.status = OrderItem.Status.SHIPPED
        self.item1_1.save(update_fields=["status"])

        response = self.client.post(self.confirm_cod_url_1)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("items are delivered", str(response.data))

        self.payment1.refresh_from_db()
        self.assertEqual(self.payment1.status, Payment.Status.PENDING)

    def test_cannot_confirm_cod_for_online_payment(self):
        self.client.force_authenticate(user=self.admin)

        # Try to call confirm-cod on Razorpay payment
        response = self.client.post(f"/api/payments/admin/{self.payment2.id}/confirm-cod/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("COD", str(response.data))

    def test_cannot_confirm_cod_for_cancelled_or_failed_payment(self):
        self.client.force_authenticate(user=self.admin)

        self.payment1.status = Payment.Status.CANCELLED
        self.payment1.save(update_fields=["status"])

        response = self.client.post(self.confirm_cod_url_1)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_read_only_restriction_on_admin_payment_endpoints(self):
        self.client.force_authenticate(user=self.admin)

        # PUT/PATCH/DELETE on payment list or detail
        response = self.client.put(self.detail_url_1, {"status": "successful"})
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

        response = self.client.patch(self.detail_url_1, {"status": "successful"})
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

        response = self.client.delete(self.detail_url_1)
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)


class ConcurrentAdminPaymentTests(TransactionTestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            email="admin_concurrent@example.com",
            password="StrongPassword123!",
            first_name="Admin",
            last_name="User",
            role=User.Role.ADMIN,
        )
        self.customer = User.objects.create_user(
            email="customer_concurrent@example.com",
            password="StrongPassword123!",
            first_name="John",
            last_name="Doe",
            role=User.Role.CUSTOMER,
        )
        self.seller_user = User.objects.create_user(
            email="seller_concurrent@example.com",
            password="StrongPassword123!",
            first_name="Seller",
            last_name="One",
            role=User.Role.SELLER,
        )
        self.seller = SellerProfile.objects.create(
            user=self.seller_user,
            business_name="Concurrent Spices Ltd",
            business_type="Retail",
            business_email="concurrent_spices@example.com",
            business_phone="9876543299",
            business_address="999 Spices Road",
            city="Kochi",
            state="Kerala",
            postal_code="682001",
            status=SellerProfile.Status.ACTIVE,
            approved_at=timezone.now(),
        )
        self.category = Category.objects.create(name="Concurrent Spices", is_active=True)
        self.product = Product.objects.create(
            seller=self.seller,
            category=self.category,
            name="Concurrent Pepper",
            sku="CP-001",
            price=Decimal("300.00"),
            stock=100,
            status=Product.Status.APPROVED,
            is_active=True,
        )
        self.order = Order.objects.create(
            user=self.customer,
            status=Order.Status.DELIVERED,
            payment_method=Order.PaymentMethod.COD,
            subtotal=Decimal("300.00"),
            shipping_fee=Decimal("0.00"),
            total_amount=Decimal("300.00"),
            shipping_full_name="John Doe",
            shipping_mobile="9876543299",
            shipping_address_line_1="100 Marine Drive",
            shipping_city="Kochi",
            shipping_state="Kerala",
            shipping_postal_code="682001",
            shipping_country="India",
        )
        self.payment = Payment.objects.create(
            order=self.order,
            method=Payment.Method.COD,
            provider=Payment.Provider.MANUAL,
            amount=Decimal("300.00"),
            status=Payment.Status.PENDING,
        )
        self.item = OrderItem.objects.create(
            order=self.order,
            seller=self.seller,
            product=self.product,
            product_name=self.product.name,
            product_sku=self.product.sku,
            quantity=1,
            unit_price=self.product.price,
            subtotal=Decimal("300.00"),
            status=OrderItem.Status.DELIVERED,
        )

    def test_concurrent_cod_payment_collection_single_success_and_audit(self):
        results = []
        errors = []

        def worker():
            # Close connection so the thread uses a fresh connection from the pool
            connection.close()
            try:
                payment = confirm_cod_payment_collection(
                    payment_id=self.payment.id,
                    actor=self.admin,
                    ip_address="192.168.1.100",
                    user_agent="ConcurrentTestWorker",
                )
                results.append(payment)
            except ValidationError as exc:
                errors.append(exc)
            finally:
                connection.close()

        with ThreadPoolExecutor(max_workers=2) as executor:
            future1 = executor.submit(worker)
            future2 = executor.submit(worker)
            future1.result()
            future2.result()

        # Exactly one worker succeeded and one failed with ValidationError
        self.assertEqual(len(results), 1)
        self.assertEqual(len(errors), 1)
        self.assertIn("already", str(errors[0]))

        # Payment status in database is successful and paid_at is set
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, Payment.Status.SUCCESSFUL)
        self.assertIsNotNone(self.payment.paid_at)

        # Exactly one PAYMENT_SUCCEEDED audit event was created
        audit_events = AuditEvent.objects.filter(
            action=AuditAction.PAYMENT_SUCCEEDED,
            entity_type=AuditEntity.PAYMENT,
            entity_id=self.payment.id,
        )
        self.assertEqual(audit_events.count(), 1)
        audit_event = audit_events.first()
        self.assertEqual(audit_event.actor, self.admin)
        self.assertEqual(audit_event.metadata["order_id"], str(self.order.id))
        self.assertEqual(audit_event.metadata["order_number"], self.order.order_number)
        self.assertEqual(audit_event.metadata["confirmation_type"], "admin_cod_collection")


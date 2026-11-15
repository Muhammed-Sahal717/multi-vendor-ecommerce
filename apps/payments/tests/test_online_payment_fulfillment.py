from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Address
from apps.audit.constants import AuditAction, AuditEntity
from apps.audit.models import AuditEvent
from apps.catalog.models import Category, Product
from apps.orders.models import Order, OrderItem
from apps.payments.models import Payment, PaymentAttempt
from apps.sellers.models import SellerProfile

User = get_user_model()


class OnlinePaymentFulfillmentIntegrationTests(APITestCase):
    """
    End-to-end integration tests for customer order creation with online (Razorpay/Mock)
    payment processing, payment attempt tracking, and subsequent seller order fulfillment.
    All actor requests use real JWT authentication.
    """

    def setUp(self):
        self.password = "StrongPassword123!"

        # 1. Customer
        self.customer = User.objects.create_user(
            email="online_customer@example.com",
            password=self.password,
            first_name="Priya",
            last_name="Nair",
            role=User.Role.CUSTOMER,
        )
        self.address = Address.objects.create(
            user=self.customer,
            full_name="Priya Nair",
            mobile="9876543210",
            address_line_1="24 Green Valley",
            address_line_2="Kakkanad",
            city="Kochi",
            state="Kerala",
            postal_code="682030",
            country="India",
            is_default=True,
        )

        # 2. Seller
        self.seller_user = User.objects.create_user(
            email="honey_seller@example.com",
            password=self.password,
            first_name="Manoj",
            last_name="Kumar",
            role=User.Role.SELLER,
        )
        self.seller = SellerProfile.objects.create(
            user=self.seller_user,
            business_name="Western Ghats Organics",
            business_type="Retail",
            business_email="honey_seller@example.com",
            business_phone="9876543299",
            business_address="Wayanad Hills",
            city="Kalpetta",
            state="Kerala",
            postal_code="673121",
            country="India",
            status=SellerProfile.Status.ACTIVE,
            approved_at=timezone.now(),
        )

        # 3. Category & Product
        self.category = Category.objects.create(
            name="Organic Forest Produce",
            is_active=True,
        )
        self.product = Product.objects.create(
            seller=self.seller,
            category=self.category,
            name="Wild Forest Honey 500g",
            sku="WFH-500",
            description="Pure raw forest honey from Wayanad",
            price=Decimal("350.00"),
            stock=15,
            status=Product.Status.APPROVED,
            is_active=True,
        )

    def authenticate_jwt(self, user):
        """Log in via actual project JWT authentication endpoint and set Bearer token."""
        response = self.client.post(
            "/api/auth/login/",
            {
                "email": user.email,
                "password": self.password,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        access_token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        return access_token

    def test_end_to_end_online_payment_and_fulfillment_workflow(self):
        """
        Complete 10-step lifecycle test for customer order + online mock payment + seller fulfillment:
        1. Authenticate customer with real JWT.
        2. Add product to cart via API.
        3. Create order using Razorpay payment method.
        4. Verify order is created and payment status is initially PENDING.
        5. Execute mock payment success workflow through actual API endpoint.
        6. Verify payment SUCCESSFUL, paid_at populated, amount preserved, PaymentAttempt recorded, audit events.
        7. Authenticate seller using real JWT.
        8. Verify seller can now fulfill order item.
        9. Complete fulfillment lifecycle (CONFIRMED -> PROCESSING -> SHIPPED -> DELIVERED).
        10. Customer retrieves order and payment via API, verifying final DELIVERED and SUCCESSFUL statuses.
        """
        # Step 1: Authenticate customer using real JWT
        self.authenticate_jwt(self.customer)

        # Step 2: Add product to cart (2 units @ 350.00 = 700.00)
        cart_resp = self.client.post(
            "/api/cart/items/",
            {"product": str(self.product.id), "quantity": 2},
            format="json",
        )
        self.assertEqual(cart_resp.status_code, status.HTTP_201_CREATED)

        # Step 3: Create order using Razorpay payment method
        checkout_resp = self.client.post(
            "/api/orders/checkout/",
            {
                "address_id": str(self.address.id),
                "payment_method": "razorpay",
            },
            format="json",
        )
        self.assertEqual(checkout_resp.status_code, status.HTTP_201_CREATED)
        order_data = checkout_resp.data

        order_id = str(order_data["id"])
        payment_id = str(order_data["payment"]["id"])
        order_item_id = str(order_data["items"][0]["id"])
        expected_amount = Decimal("700.00")

        # Step 4: Verify order and payment initial states
        self.assertEqual(order_data["status"], Order.Status.PENDING)
        self.assertEqual(order_data["payment"]["method"], Payment.Method.RAZORPAY)
        self.assertEqual(order_data["payment"]["provider"], Payment.Provider.MOCK)
        self.assertEqual(order_data["payment"]["status"], Payment.Status.PENDING)
        self.assertEqual(Decimal(order_data["payment"]["amount"]), expected_amount)

        # Stock immediately decremented
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 13)  # 15 - 2

        # Payment record in DB
        payment = Payment.objects.get(id=payment_id)
        self.assertEqual(payment.status, Payment.Status.PENDING)
        self.assertIsNone(payment.paid_at)
        self.assertEqual(payment.amount, expected_amount)

        # Audit event for order creation
        self.assertTrue(
            AuditEvent.objects.filter(
                action=AuditAction.ORDER_CREATED,
                entity_id=order_id,
                actor=self.customer,
            ).exists()
        )

        # Step 5: Execute mock payment success workflow through actual API endpoint
        mock_process_url = f"/api/payments/{payment_id}/mock-process/"
        mock_resp = self.client.post(
            mock_process_url,
            {"outcome": PaymentAttempt.Status.SUCCESSFUL},
            format="json",
            REMOTE_ADDR="192.168.1.15",
            HTTP_USER_AGENT="GallaOnlineTest/1.0",
        )
        self.assertEqual(mock_resp.status_code, status.HTTP_201_CREATED)

        # Step 6: Verify payment success state, paid_at, amount, attempt, and audit event
        self.assertEqual(mock_resp.data["status"], PaymentAttempt.Status.SUCCESSFUL)
        self.assertEqual(mock_resp.data["attempt_number"], 1)
        self.assertTrue(mock_resp.data["transaction_reference"].startswith("GLL-PAY-"))

        payment.refresh_from_db()
        self.assertEqual(payment.status, Payment.Status.SUCCESSFUL)
        self.assertIsNotNone(payment.paid_at)
        self.assertEqual(payment.amount, expected_amount)

        # PaymentAttempt verification
        attempts = PaymentAttempt.objects.filter(payment=payment)
        self.assertEqual(attempts.count(), 1)
        attempt = attempts.first()
        self.assertEqual(attempt.status, PaymentAttempt.Status.SUCCESSFUL)
        self.assertEqual(attempt.attempt_number, 1)
        self.assertEqual(attempt.failure_reason, "")

        # Audit event verification
        payment_succeeded_event = AuditEvent.objects.get(
            action=AuditAction.PAYMENT_SUCCEEDED,
            entity_id=payment.id,
        )
        self.assertEqual(payment_succeeded_event.actor, self.customer)
        self.assertEqual(payment_succeeded_event.entity_type, AuditEntity.PAYMENT)
        self.assertEqual(payment_succeeded_event.metadata["order_id"], order_id)
        self.assertEqual(payment_succeeded_event.metadata["attempt_id"], str(attempt.id))
        self.assertEqual(payment_succeeded_event.metadata["amount"], str(expected_amount))
        self.assertEqual(payment_succeeded_event.ip_address, "192.168.1.15")
        self.assertEqual(payment_succeeded_event.user_agent, "GallaOnlineTest/1.0")

        # Step 7: Authenticate seller using real JWT
        self.authenticate_jwt(self.seller_user)

        # Step 8: Verify seller can inspect and access the order item
        seller_item_resp = self.client.get(f"/api/orders/seller/{order_item_id}/")
        self.assertEqual(seller_item_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(seller_item_resp.data["product_name"], self.product.name)
        self.assertEqual(seller_item_resp.data["status"], OrderItem.Status.PENDING)

        # Step 9: Complete fulfillment lifecycle (CONFIRMED -> PROCESSING -> SHIPPED -> DELIVERED)
        patch_conf = self.client.patch(
            f"/api/orders/seller/{order_item_id}/status/",
            {"status": "confirmed"},
            format="json",
        )
        self.assertEqual(patch_conf.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_conf.data["status"], OrderItem.Status.CONFIRMED)

        patch_proc = self.client.patch(
            f"/api/orders/seller/{order_item_id}/status/",
            {"status": "processing"},
            format="json",
        )
        self.assertEqual(patch_proc.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_proc.data["status"], OrderItem.Status.PROCESSING)

        patch_ship = self.client.patch(
            f"/api/orders/seller/{order_item_id}/status/",
            {"status": "shipped"},
            format="json",
        )
        self.assertEqual(patch_ship.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_ship.data["status"], OrderItem.Status.SHIPPED)

        patch_del = self.client.patch(
            f"/api/orders/seller/{order_item_id}/status/",
            {"status": "delivered"},
            format="json",
        )
        self.assertEqual(patch_del.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_del.data["status"], OrderItem.Status.DELIVERED)

        # Step 10: Authenticate customer and verify final order and payment states
        self.authenticate_jwt(self.customer)

        customer_order_resp = self.client.get(f"/api/orders/{order_id}/")
        self.assertEqual(customer_order_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(customer_order_resp.data["status"], Order.Status.DELIVERED)
        self.assertEqual(customer_order_resp.data["payment"]["status"], Payment.Status.SUCCESSFUL)
        self.assertEqual(Decimal(customer_order_resp.data["payment"]["amount"]), expected_amount)

        customer_payment_resp = self.client.get(f"/api/payments/{payment_id}/")
        self.assertEqual(customer_payment_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(customer_payment_resp.data["status"], Payment.Status.SUCCESSFUL)
        self.assertIsNotNone(customer_payment_resp.data["paid_at"])
        self.assertEqual(len(customer_payment_resp.data["attempts"]), 1)
        self.assertEqual(
            customer_payment_resp.data["attempts"][0]["status"],
            PaymentAttempt.Status.SUCCESSFUL,
        )

    def test_failed_mock_payment_allows_retry_and_preserves_consistency(self):
        """
        Verify that a failed mock payment attempt keeps payment pending, logs
        PAYMENT_FAILED audit event, blocks seller fulfillment, and allows a
        subsequent successful retry.
        """
        self.authenticate_jwt(self.customer)
        self.client.post(
            "/api/cart/items/",
            {"product": str(self.product.id), "quantity": 1},
            format="json",
        )
        checkout_resp = self.client.post(
            "/api/orders/checkout/",
            {"address_id": str(self.address.id), "payment_method": "razorpay"},
            format="json",
        )
        self.assertEqual(checkout_resp.status_code, status.HTTP_201_CREATED)
        order_id = str(checkout_resp.data["id"])
        payment_id = str(checkout_resp.data["payment"]["id"])
        order_item_id = str(checkout_resp.data["items"][0]["id"])

        mock_url = f"/api/payments/{payment_id}/mock-process/"

        # 1. Failed payment attempt
        fail_resp = self.client.post(
            mock_url,
            {
                "outcome": PaymentAttempt.Status.FAILED,
                "failure_reason": "Bank network timeout during simulation.",
            },
            format="json",
        )
        self.assertEqual(fail_resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(fail_resp.data["status"], PaymentAttempt.Status.FAILED)
        self.assertEqual(fail_resp.data["attempt_number"], 1)
        self.assertEqual(
            fail_resp.data["failure_reason"],
            "Bank network timeout during simulation.",
        )

        # Payment remains PENDING
        payment = Payment.objects.get(id=payment_id)
        self.assertEqual(payment.status, Payment.Status.PENDING)
        self.assertIsNone(payment.paid_at)

        # Verify PAYMENT_FAILED audit event
        fail_audit = AuditEvent.objects.get(
            action=AuditAction.PAYMENT_FAILED,
            entity_id=payment.id,
        )
        self.assertEqual(fail_audit.actor, self.customer)
        self.assertEqual(
            fail_audit.metadata["failure_reason"],
            "Bank network timeout during simulation.",
        )

        # 2. Seller cannot fulfill while payment is not successful
        self.authenticate_jwt(self.seller_user)
        seller_patch_resp = self.client.patch(
            f"/api/orders/seller/{order_item_id}/status/",
            {"status": "confirmed"},
            format="json",
        )
        self.assertEqual(seller_patch_resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("payment", str(seller_patch_resp.data).lower())

        item = OrderItem.objects.get(id=order_item_id)
        self.assertEqual(item.status, OrderItem.Status.PENDING)

        # 3. Customer retries and completes payment successfully
        self.authenticate_jwt(self.customer)
        success_resp = self.client.post(
            mock_url,
            {"outcome": PaymentAttempt.Status.SUCCESSFUL},
            format="json",
        )
        self.assertEqual(success_resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(success_resp.data["status"], PaymentAttempt.Status.SUCCESSFUL)
        self.assertEqual(success_resp.data["attempt_number"], 2)

        payment.refresh_from_db()
        self.assertEqual(payment.status, Payment.Status.SUCCESSFUL)
        self.assertIsNotNone(payment.paid_at)
        self.assertEqual(payment.attempts.count(), 2)

        # 4. Seller can now fulfill the order
        self.authenticate_jwt(self.seller_user)
        seller_confirm_resp = self.client.patch(
            f"/api/orders/seller/{order_item_id}/status/",
            {"status": "confirmed"},
            format="json",
        )
        self.assertEqual(seller_confirm_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(seller_confirm_resp.data["status"], OrderItem.Status.CONFIRMED)

    def test_duplicate_payment_processing_rejected(self):
        """
        Verify that attempting to process payment on an already successful payment
        is rejected with 400 Bad Request and does not create duplicate attempts.
        """
        self.authenticate_jwt(self.customer)
        self.client.post(
            "/api/cart/items/",
            {"product": str(self.product.id), "quantity": 1},
            format="json",
        )
        checkout_resp = self.client.post(
            "/api/orders/checkout/",
            {"address_id": str(self.address.id), "payment_method": "razorpay"},
            format="json",
        )
        payment_id = str(checkout_resp.data["payment"]["id"])
        mock_url = f"/api/payments/{payment_id}/mock-process/"

        # First successful call
        first_resp = self.client.post(
            mock_url,
            {"outcome": PaymentAttempt.Status.SUCCESSFUL},
            format="json",
        )
        self.assertEqual(first_resp.status_code, status.HTTP_201_CREATED)

        initial_attempt_count = PaymentAttempt.objects.filter(payment_id=payment_id).count()
        self.assertEqual(initial_attempt_count, 1)

        initial_audit_count = AuditEvent.objects.filter(
            action=AuditAction.PAYMENT_SUCCEEDED,
            entity_id=payment_id,
        ).count()
        self.assertEqual(initial_audit_count, 1)

        # Duplicate attempt must be rejected
        duplicate_resp = self.client.post(
            mock_url,
            {"outcome": PaymentAttempt.Status.SUCCESSFUL},
            format="json",
        )
        self.assertEqual(duplicate_resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already", str(duplicate_resp.data).lower())

        # Verify no duplicate attempt or audit event created
        self.assertEqual(
            PaymentAttempt.objects.filter(payment_id=payment_id).count(),
            initial_attempt_count,
        )
        self.assertEqual(
            AuditEvent.objects.filter(
                action=AuditAction.PAYMENT_SUCCEEDED,
                entity_id=payment_id,
            ).count(),
            initial_audit_count,
        )

    def test_unpaid_online_order_cannot_be_fulfilled_by_seller(self):
        """
        Verify that a seller cannot advance an OrderItem in an unpaid online order
        to any active fulfillment state (CONFIRMED, PROCESSING, SHIPPED, DELIVERED).
        """
        self.authenticate_jwt(self.customer)
        self.client.post(
            "/api/cart/items/",
            {"product": str(self.product.id), "quantity": 1},
            format="json",
        )
        checkout_resp = self.client.post(
            "/api/orders/checkout/",
            {"address_id": str(self.address.id), "payment_method": "razorpay"},
            format="json",
        )
        order_item_id = str(checkout_resp.data["items"][0]["id"])

        # Authenticate seller
        self.authenticate_jwt(self.seller_user)

        # Every forward transition must be rejected while unpaid
        for target_status in [
            OrderItem.Status.CONFIRMED,
            OrderItem.Status.PROCESSING,
            OrderItem.Status.SHIPPED,
            OrderItem.Status.DELIVERED,
        ]:
            with self.subTest(target_status=target_status):
                patch_resp = self.client.patch(
                    f"/api/orders/seller/{order_item_id}/status/",
                    {"status": target_status},
                    format="json",
                )
                self.assertEqual(patch_resp.status_code, status.HTTP_400_BAD_REQUEST)

        # Status remains PENDING
        item = OrderItem.objects.get(id=order_item_id)
        self.assertEqual(item.status, OrderItem.Status.PENDING)

    def test_customer_payment_list_and_detail_consistency(self):
        """
        Verify customer payment listing and detail endpoints return consistent data,
        including attempts history, and reject unauthorized cross-customer access.
        """
        self.authenticate_jwt(self.customer)
        self.client.post(
            "/api/cart/items/",
            {"product": str(self.product.id), "quantity": 1},
            format="json",
        )
        checkout_resp = self.client.post(
            "/api/orders/checkout/",
            {"address_id": str(self.address.id), "payment_method": "razorpay"},
            format="json",
        )
        payment_id = str(checkout_resp.data["payment"]["id"])
        mock_url = f"/api/payments/{payment_id}/mock-process/"

        # Process one failed attempt and one successful attempt
        self.client.post(
            mock_url,
            {"outcome": PaymentAttempt.Status.FAILED, "failure_reason": "Card declined"},
            format="json",
        )
        self.client.post(
            mock_url,
            {"outcome": PaymentAttempt.Status.SUCCESSFUL},
            format="json",
        )

        # 1. Customer lists payments
        list_resp = self.client.get("/api/payments/")
        self.assertEqual(list_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_resp.data), 1)
        self.assertEqual(str(list_resp.data[0]["id"]), payment_id)
        self.assertEqual(list_resp.data[0]["status"], Payment.Status.SUCCESSFUL)
        self.assertEqual(list_resp.data[0]["method"], Payment.Method.RAZORPAY)
        self.assertEqual(Decimal(list_resp.data[0]["amount"]), Decimal("350.00"))

        # 2. Customer retrieves payment detail
        detail_resp = self.client.get(f"/api/payments/{payment_id}/")
        self.assertEqual(detail_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(str(detail_resp.data["id"]), payment_id)
        self.assertEqual(detail_resp.data["status"], Payment.Status.SUCCESSFUL)
        self.assertIsNotNone(detail_resp.data["paid_at"])
        self.assertEqual(len(detail_resp.data["attempts"]), 2)
        self.assertEqual(detail_resp.data["attempts"][0]["status"], PaymentAttempt.Status.FAILED)
        self.assertEqual(detail_resp.data["attempts"][1]["status"], PaymentAttempt.Status.SUCCESSFUL)

        # 3. Another customer cannot access this payment detail
        other_customer = User.objects.create_user(
            email="other_customer@example.com",
            password=self.password,
            first_name="Other",
            last_name="Customer",
            role=User.Role.CUSTOMER,
        )
        self.authenticate_jwt(other_customer)
        cross_resp = self.client.get(f"/api/payments/{payment_id}/")
        self.assertEqual(cross_resp.status_code, status.HTTP_404_NOT_FOUND)

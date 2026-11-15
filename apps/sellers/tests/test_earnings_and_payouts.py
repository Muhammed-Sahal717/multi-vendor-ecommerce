from concurrent.futures import ThreadPoolExecutor
from decimal import Decimal
import threading
from unittest.mock import patch

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
from apps.orders.services import create_order, update_seller_order_item_status
from apps.payments.models import Payment, PaymentAttempt
from apps.payments.services import confirm_cod_payment_collection, process_mock_payment
from apps.sellers.models import SellerEarning, SellerPayout, SellerProfile
from apps.sellers.services import get_seller_balance_summary, record_seller_payout

User = get_user_model()


class SellerEarningsAndPayoutTests(APITestCase):
    """
    Comprehensive test suite for Phase 3.3:
    Seller earnings recognition, 5% commission calculation, COD vs online settlement,
    partial cancellations, race-safe idempotency, dashboard aggregation accuracy,
    and manual admin weekly payouts with concurrency protection.
    """

    def setUp(self):
        self.password = "StrongPassword123!"

        # 1. Admin
        self.admin = User.objects.create_user(
            email="admin_finance@example.com",
            password=self.password,
            first_name="Admin",
            last_name="Finance",
            role=User.Role.ADMIN,
        )

        # 2. Customer
        self.customer = User.objects.create_user(
            email="customer_finance@example.com",
            password=self.password,
            first_name="Customer",
            last_name="Buyer",
            role=User.Role.CUSTOMER,
        )
        self.address = Address.objects.create(
            user=self.customer,
            full_name="Customer Buyer",
            mobile="9876543210",
            address_line_1="Marine Drive 10",
            city="Kochi",
            state="Kerala",
            postal_code="682011",
            country="India",
            is_default=True,
        )

        # 3. Seller A
        self.seller_user_a = User.objects.create_user(
            email="seller_alpha_fin@example.com",
            password=self.password,
            role=User.Role.SELLER,
        )
        self.seller_a = SellerProfile.objects.create(
            user=self.seller_user_a,
            business_name="Alpha Spices Estate",
            business_type="Wholesale",
            business_email="alpha@example.com",
            business_phone="9847111111",
            business_address="Wayanad Road",
            city="Calicut",
            state="Kerala",
            postal_code="673001",
            country="India",
            status=SellerProfile.Status.ACTIVE,
            approved_at=timezone.now(),
        )

        # 4. Seller B
        self.seller_user_b = User.objects.create_user(
            email="seller_beta_fin@example.com",
            password=self.password,
            role=User.Role.SELLER,
        )
        self.seller_b = SellerProfile.objects.create(
            user=self.seller_user_b,
            business_name="Beta Plantations",
            business_type="Wholesale",
            business_email="beta@example.com",
            business_phone="9847222222",
            business_address="Estate Road",
            city="Kochi",
            state="Kerala",
            postal_code="682001",
            country="India",
            status=SellerProfile.Status.ACTIVE,
            approved_at=timezone.now(),
        )

        # 5. Catalog
        self.category = Category.objects.create(name="Spices & Beverages", is_active=True)
        self.product_a = Product.objects.create(
            seller=self.seller_a,
            category=self.category,
            name="Alpha Cardamom 1kg",
            sku="SKU-CARD-1KG",
            description="Premium green cardamom",
            price=Decimal("1000.00"),
            stock=50,
            status=Product.Status.APPROVED,
            is_active=True,
        )
        self.product_b = Product.objects.create(
            seller=self.seller_b,
            category=self.category,
            name="Beta Pepper 1kg",
            sku="SKU-PEPP-1KG",
            description="Organic black pepper",
            price=Decimal("500.00"),
            stock=50,
            status=Product.Status.APPROVED,
            is_active=True,
        )

        # URLs
        self.seller_dashboard_url = "/api/sellers/earnings/dashboard/"
        self.seller_earnings_url = "/api/sellers/earnings/"
        self.seller_payouts_url = "/api/sellers/payouts/"
        self.admin_earnings_overview_url = "/api/sellers/admin/earnings/"

    def authenticate_jwt(self, user):
        response = self.client.post(
            "/api/auth/login/",
            {"email": user.email, "password": self.password},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        return token

    def clear_credentials(self):
        self.client.credentials()

    # =========================================================================
    # 1. Online Payment Earning Recognition
    # =========================================================================

    def test_online_payment_earning_recognized_upon_delivery(self):
        """
        For online orders (Razorpay):
        - Payment is completed upfront.
        - Seller fulfills item to DELIVERED.
        - SellerEarning is automatically generated with 5% commission.
        - Audit event SELLER_EARNING_RECORDED is recorded.
        """
        # Create cart item and checkout online
        from apps.cart.models import Cart, CartItem

        cart, _ = Cart.objects.get_or_create(user=self.customer)
        CartItem.objects.create(cart=cart, product=self.product_a, quantity=2)

        order = create_order(
            user=self.customer,
            address=self.address,
            payment_method=Order.PaymentMethod.RAZORPAY,
        )
        payment = order.payment

        # Complete mock payment
        process_mock_payment(
            payment_id=payment.id,
            customer_user=self.customer,
            outcome=PaymentAttempt.Status.SUCCESSFUL,
        )
        payment.refresh_from_db()
        self.assertEqual(payment.status, Payment.Status.SUCCESSFUL)

        item = order.items.first()
        self.assertEqual(item.subtotal, Decimal("2000.00"))

        # Advance order item: PENDING -> CONFIRMED -> PROCESSING -> SHIPPED
        update_seller_order_item_status(
            order_item_id=item.id,
            seller_user=self.seller_user_a,
            new_status=OrderItem.Status.CONFIRMED,
        )
        update_seller_order_item_status(
            order_item_id=item.id,
            seller_user=self.seller_user_a,
            new_status=OrderItem.Status.PROCESSING,
        )
        update_seller_order_item_status(
            order_item_id=item.id,
            seller_user=self.seller_user_a,
            new_status=OrderItem.Status.SHIPPED,
        )

        # Before delivery, no earning exists
        self.assertFalse(SellerEarning.objects.filter(order_item=item).exists())

        # Advance to DELIVERED
        update_seller_order_item_status(
            order_item_id=item.id,
            seller_user=self.seller_user_a,
            new_status=OrderItem.Status.DELIVERED,
        )

        # Earning recognized immediately
        earning = SellerEarning.objects.get(order_item=item)
        self.assertEqual(earning.seller, self.seller_a)
        self.assertEqual(earning.gross_amount, Decimal("2000.00"))
        self.assertEqual(earning.commission_rate, Decimal("0.0500"))
        self.assertEqual(earning.commission_amount, Decimal("100.00"))  # 5% of 2000
        self.assertEqual(earning.net_amount, Decimal("1900.00"))

        # Audit event logged
        audit = AuditEvent.objects.filter(
            action=AuditAction.SELLER_EARNING_RECORDED,
            entity_type=AuditEntity.SELLER_EARNING,
            entity_id=earning.id,
        ).first()
        self.assertIsNotNone(audit)
        self.assertEqual(audit.metadata["gross_amount"], "2000.00")
        self.assertEqual(audit.metadata["commission_amount"], "100.00")
        self.assertEqual(audit.metadata["net_amount"], "1900.00")

        # Seller Dashboard shows correct totals
        self.authenticate_jwt(self.seller_user_a)
        dash_resp = self.client.get(self.seller_dashboard_url)
        self.assertEqual(dash_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(dash_resp.data["total_gross_earnings"]), Decimal("2000.00"))
        self.assertEqual(Decimal(dash_resp.data["total_commission_deducted"]), Decimal("100.00"))
        self.assertEqual(Decimal(dash_resp.data["total_net_earnings"]), Decimal("1900.00"))
        self.assertEqual(Decimal(dash_resp.data["already_paid"]), Decimal("0.00"))
        self.assertEqual(Decimal(dash_resp.data["pending_payout_balance"]), Decimal("1900.00"))

    # =========================================================================
    # 2. COD Earning Recognition After Admin Collection Confirmation
    # =========================================================================

    def test_cod_earning_recognized_only_after_admin_collection(self):
        """
        For COD orders:
        - When seller fulfills item to DELIVERED, payment is still PENDING.
        - Earning is NOT created upon seller delivery.
        - When admin confirms collection via confirm_cod_payment_collection,
          earning is created for the delivered item.
        """
        from apps.cart.models import Cart, CartItem

        cart, _ = Cart.objects.get_or_create(user=self.customer)
        CartItem.objects.create(cart=cart, product=self.product_a, quantity=1)

        order = create_order(
            user=self.customer,
            address=self.address,
            payment_method=Order.PaymentMethod.COD,
        )
        item = order.items.first()
        self.assertEqual(item.subtotal, Decimal("1000.00"))

        # Advance item through to DELIVERED
        for st in [
            OrderItem.Status.CONFIRMED,
            OrderItem.Status.PROCESSING,
            OrderItem.Status.SHIPPED,
            OrderItem.Status.DELIVERED,
        ]:
            update_seller_order_item_status(
                order_item_id=item.id,
                seller_user=self.seller_user_a,
                new_status=st,
            )

        # Item is delivered, but COD payment is still PENDING -> NO EARNING
        order.refresh_from_db()
        self.assertEqual(order.payment.status, Payment.Status.PENDING)
        self.assertFalse(SellerEarning.objects.filter(order_item=item).exists())

        # Admin confirms COD payment collection
        confirm_cod_payment_collection(
            payment_id=order.payment.id,
            actor=self.admin,
        )

        # Now earning is recognized
        order.payment.refresh_from_db()
        self.assertEqual(order.payment.status, Payment.Status.SUCCESSFUL)

        earning = SellerEarning.objects.get(order_item=item)
        self.assertEqual(earning.gross_amount, Decimal("1000.00"))
        self.assertEqual(earning.commission_amount, Decimal("50.00"))
        self.assertEqual(earning.net_amount, Decimal("950.00"))

    # =========================================================================
    # 3. Partial Cancellation & Multi-Seller Isolation
    # =========================================================================

    def test_multi_seller_partial_cancellation_earning_generation(self):
        """
        Multi-seller order: Item A (Seller A, ₹2,000) and Item B (Seller B, ₹1,000).
        Item A is delivered; Item B is cancelled.
        - Only Item A generates an earning for Seller A.
        - Item B produces NO earning for Seller B.
        """
        from apps.cart.models import Cart, CartItem

        cart, _ = Cart.objects.get_or_create(user=self.customer)
        CartItem.objects.create(cart=cart, product=self.product_a, quantity=2)  # ₹2000
        CartItem.objects.create(cart=cart, product=self.product_b, quantity=2)  # ₹1000

        order = create_order(
            user=self.customer,
            address=self.address,
            payment_method=Order.PaymentMethod.COD,
        )

        item_a = order.items.get(seller=self.seller_a)
        item_b = order.items.get(seller=self.seller_b)

        # Seller B cancels Item B
        update_seller_order_item_status(
            order_item_id=item_b.id,
            seller_user=self.seller_user_b,
            new_status=OrderItem.Status.CANCELLED,
        )

        # Seller A delivers Item A
        for st in [
            OrderItem.Status.CONFIRMED,
            OrderItem.Status.PROCESSING,
            OrderItem.Status.SHIPPED,
            OrderItem.Status.DELIVERED,
        ]:
            update_seller_order_item_status(
                order_item_id=item_a.id,
                seller_user=self.seller_user_a,
                new_status=st,
            )

        # Admin confirms collection for the partially cancelled order
        confirm_cod_payment_collection(
            payment_id=order.payment.id,
            actor=self.admin,
        )

        # Seller A has 1 earning
        self.assertTrue(SellerEarning.objects.filter(order_item=item_a).exists())
        earning_a = SellerEarning.objects.get(order_item=item_a)
        self.assertEqual(earning_a.gross_amount, Decimal("2000.00"))
        self.assertEqual(earning_a.commission_amount, Decimal("100.00"))
        self.assertEqual(earning_a.net_amount, Decimal("1900.00"))

        # Seller B has ZERO earnings
        self.assertFalse(SellerEarning.objects.filter(seller=self.seller_b).exists())

    # =========================================================================
    # 4. Commission Rounding (ROUND_HALF_UP)
    # =========================================================================

    def test_commission_rounding_half_up(self):
        """
        Tests 5% commission calculation with fractional paisa:
        Subtotal: ₹99.90.
        5% = 4.995 -> rounds to 5.00 via ROUND_HALF_UP.
        Net = 99.90 - 5.00 = 94.90.
        """
        from apps.cart.models import Cart, CartItem

        prod_fractional = Product.objects.create(
            seller=self.seller_a,
            category=self.category,
            name="Fractional Price Herb",
            sku="SKU-FRAC-01",
            price=Decimal("99.90"),
            stock=10,
            status=Product.Status.APPROVED,
            is_active=True,
        )

        cart, _ = Cart.objects.get_or_create(user=self.customer)
        CartItem.objects.create(cart=cart, product=prod_fractional, quantity=1)

        order = create_order(
            user=self.customer,
            address=self.address,
            payment_method=Order.PaymentMethod.RAZORPAY,
        )
        process_mock_payment(
            payment_id=order.payment.id,
            customer_user=self.customer,
            outcome=PaymentAttempt.Status.SUCCESSFUL,
        )

        item = order.items.first()
        for st in [
            OrderItem.Status.CONFIRMED,
            OrderItem.Status.PROCESSING,
            OrderItem.Status.SHIPPED,
            OrderItem.Status.DELIVERED,
        ]:
            update_seller_order_item_status(
                order_item_id=item.id,
                seller_user=self.seller_user_a,
                new_status=st,
            )

        earning = SellerEarning.objects.get(order_item=item)
        self.assertEqual(earning.gross_amount, Decimal("99.90"))
        self.assertEqual(earning.commission_amount, Decimal("5.00"))
        self.assertEqual(earning.net_amount, Decimal("94.90"))
        self.assertEqual(earning.gross_amount, earning.commission_amount + earning.net_amount)

    # =========================================================================
    # 5. Duplicate Earning Prevention & Idempotency
    # =========================================================================

    def test_duplicate_earning_prevention_idempotency(self):
        """
        Verifies that repeated earning recognition attempts on the same OrderItem
        do not create duplicate rows or crash the transaction.
        """
        from apps.sellers.services import record_order_item_earning

        # Create online delivered item
        from apps.cart.models import Cart, CartItem

        cart, _ = Cart.objects.get_or_create(user=self.customer)
        CartItem.objects.create(cart=cart, product=self.product_a, quantity=1)
        order = create_order(
            user=self.customer,
            address=self.address,
            payment_method=Order.PaymentMethod.RAZORPAY,
        )
        process_mock_payment(
            payment_id=order.payment.id,
            customer_user=self.customer,
            outcome=PaymentAttempt.Status.SUCCESSFUL,
        )
        item = order.items.first()
        for st in [
            OrderItem.Status.CONFIRMED,
            OrderItem.Status.PROCESSING,
            OrderItem.Status.SHIPPED,
            OrderItem.Status.DELIVERED,
        ]:
            update_seller_order_item_status(
                order_item_id=item.id,
                seller_user=self.seller_user_a,
                new_status=st,
            )

        item.refresh_from_db()
        self.assertEqual(item.status, OrderItem.Status.DELIVERED)
        self.assertEqual(SellerEarning.objects.filter(order_item=item).count(), 1)
        earning_first = SellerEarning.objects.get(order_item=item)

        # Trigger record_order_item_earning again manually
        earning_second = record_order_item_earning(order_item=item)
        self.assertEqual(earning_first.id, earning_second.id)
        self.assertEqual(SellerEarning.objects.filter(order_item=item).count(), 1)

        # Verify only 1 audit event was logged
        audit_count = AuditEvent.objects.filter(
            action=AuditAction.SELLER_EARNING_RECORDED,
            entity_type=AuditEntity.SELLER_EARNING,
            entity_id=earning_first.id,
        ).count()
        self.assertEqual(audit_count, 1)

    # =========================================================================
    # 6. Manual Payout Recording & Concurrency / Boundary Limits
    # =========================================================================

    def test_payout_lifecycle_and_validation(self):
        """
        Verifies:
        - Admin can record payout up to available balance.
        - Payout exceeding available balance is rejected (400 Bad Request).
        - Non-positive payout amount is rejected (400 Bad Request).
        - Duplicate transaction reference is rejected (400 Bad Request).
        - Remaining balance is correctly decremented.
        """
        # Give Seller A net earnings of ₹1,900
        earning = SellerEarning.objects.create(
            seller=self.seller_a,
            order_item=OrderItem.objects.create(
                order=Order.objects.create(
                    user=self.customer,
                    subtotal=Decimal("2000.00"),
                    shipping_fee=Decimal("0.00"),
                    total_amount=Decimal("2000.00"),
                    payment_method=Order.PaymentMethod.RAZORPAY,
                ),
                seller=self.seller_a,
                product=self.product_a,
                product_name="Product A",
                product_sku="SKU-A",
                quantity=2,
                unit_price=Decimal("1000.00"),
                subtotal=Decimal("2000.00"),
                status=OrderItem.Status.DELIVERED,
            ),
            gross_amount=Decimal("2000.00"),
            commission_rate=Decimal("0.0500"),
            commission_amount=Decimal("100.00"),
            net_amount=Decimal("1900.00"),
        )

        admin_payout_url = f"/api/sellers/admin/sellers/{self.seller_a.id}/payouts/"
        self.authenticate_jwt(self.admin)

        # 1. Payout exceeding available balance (₹2000 > ₹1900) -> 400 Bad Request
        over_resp = self.client.post(
            admin_payout_url,
            {
                "amount": "2000.00",
                "payout_date": "2026-11-20",
                "transaction_reference": "UTR-TEST-001",
            },
            format="json",
        )
        self.assertEqual(over_resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("amount", over_resp.data)

        # 2. Payout with non-positive amount -> 400 Bad Request
        zero_resp = self.client.post(
            admin_payout_url,
            {
                "amount": "0.00",
                "payout_date": "2026-11-20",
                "transaction_reference": "UTR-TEST-002",
            },
            format="json",
        )
        self.assertEqual(zero_resp.status_code, status.HTTP_400_BAD_REQUEST)

        # 3. Valid payout of ₹1,000 -> 201 Created
        payout_resp = self.client.post(
            admin_payout_url,
            {
                "amount": "1000.00",
                "payout_date": "2026-11-20",
                "transaction_reference": "UTR-TEST-003",
                "notes": "First partial weekly settlement",
            },
            format="json",
        )
        self.assertEqual(payout_resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Decimal(payout_resp.data["amount"]), Decimal("1000.00"))
        self.assertEqual(payout_resp.data["transaction_reference"], "UTR-TEST-003")

        # Verify audit event
        payout_audit = AuditEvent.objects.filter(
            action=AuditAction.SELLER_PAYOUT_RECORDED,
            entity_type=AuditEntity.SELLER_PAYOUT,
            entity_id=payout_resp.data["id"],
        ).first()
        self.assertIsNotNone(payout_audit)
        self.assertEqual(payout_audit.metadata["remaining_balance"], "900.00")

        # 4. Duplicate transaction reference -> 400 Bad Request
        dup_resp = self.client.post(
            admin_payout_url,
            {
                "amount": "500.00",
                "payout_date": "2026-11-20",
                "transaction_reference": "UTR-TEST-003",  # duplicate!
            },
            format="json",
        )
        self.assertEqual(dup_resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("transaction_reference", dup_resp.data)

        # 5. Second valid payout for remaining ₹900 -> 201 Created
        rem_resp = self.client.post(
            admin_payout_url,
            {
                "amount": "900.00",
                "payout_date": "2026-11-20",
                "transaction_reference": "UTR-TEST-004",
            },
            format="json",
        )
        self.assertEqual(rem_resp.status_code, status.HTTP_201_CREATED)

        # 6. Available balance is now ₹0. Any further payout attempt fails
        empty_resp = self.client.post(
            admin_payout_url,
            {
                "amount": "10.00",
                "payout_date": "2026-11-20",
                "transaction_reference": "UTR-TEST-005",
            },
            format="json",
        )
        self.assertEqual(empty_resp.status_code, status.HTTP_400_BAD_REQUEST)

    # =========================================================================
    # 7. Seller Isolation & Boundary Protection
    # =========================================================================

    def test_seller_isolation_and_admin_protection(self):
        """
        Verifies:
        - Seller A cannot view Seller B's earnings or payouts.
        - Seller cannot access admin payout creation or overview endpoints.
        - Regular customer cannot access seller earnings endpoints.
        """
        # Create earnings for Seller B
        SellerEarning.objects.create(
            seller=self.seller_b,
            order_item=OrderItem.objects.create(
                order=Order.objects.create(
                    user=self.customer,
                    subtotal=Decimal("500.00"),
                    shipping_fee=Decimal("0.00"),
                    total_amount=Decimal("500.00"),
                    payment_method=Order.PaymentMethod.RAZORPAY,
                ),
                seller=self.seller_b,
                product=self.product_b,
                product_name="Product B",
                product_sku="SKU-B",
                quantity=1,
                unit_price=Decimal("500.00"),
                subtotal=Decimal("500.00"),
                status=OrderItem.Status.DELIVERED,
            ),
            gross_amount=Decimal("500.00"),
            commission_rate=Decimal("0.0500"),
            commission_amount=Decimal("25.00"),
            net_amount=Decimal("475.00"),
        )

        # Authenticate Seller A
        self.authenticate_jwt(self.seller_user_a)

        # Seller A lists earnings: must NOT see Seller B's earning
        earn_resp = self.client.get(self.seller_earnings_url)
        self.assertEqual(earn_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(earn_resp.data["count"], 0)

        # Seller A attempts to access admin earnings overview -> 403 Forbidden
        admin_overview = self.client.get(self.admin_earnings_overview_url)
        self.assertEqual(admin_overview.status_code, status.HTTP_403_FORBIDDEN)

        # Seller A attempts to record payout -> 403 Forbidden
        admin_post = self.client.post(
            f"/api/sellers/admin/sellers/{self.seller_a.id}/payouts/",
            {"amount": "100.00", "payout_date": "2026-11-20", "transaction_reference": "UTR-X"},
            format="json",
        )
        self.assertEqual(admin_post.status_code, status.HTTP_403_FORBIDDEN)

        # Regular customer attempts to access seller earnings -> 403 Forbidden
        self.authenticate_jwt(self.customer)
        cust_resp = self.client.get(self.seller_dashboard_url)
        self.assertEqual(cust_resp.status_code, status.HTTP_403_FORBIDDEN)

    # =========================================================================
    # 8. Dashboard Aggregation Accuracy (No Cartesian Inflation)
    # =========================================================================

    def test_admin_and_seller_aggregation_accuracy_without_cartesian_inflation(self):
        """
        Creates multiple earnings (3 items) and multiple payouts (2 payouts) for Seller A.
        Verifies that admin seller-wise overview calculations do not produce inflated totals
        from joining multiple one-to-many relationships.
        """
        # Create 3 earnings for Seller A: ₹1000, ₹2000, ₹3000 (Gross = ₹6000, Net = ₹5700)
        order = Order.objects.create(
            user=self.customer,
            subtotal=Decimal("6000.00"),
            shipping_fee=Decimal("0.00"),
            total_amount=Decimal("6000.00"),
            payment_method=Order.PaymentMethod.RAZORPAY,
        )
        for i, amt in enumerate([Decimal("1000.00"), Decimal("2000.00"), Decimal("3000.00")]):
            item = OrderItem.objects.create(
                order=order,
                seller=self.seller_a,
                product=self.product_a,
                product_name=f"Batch Item {i}",
                product_sku=f"SKU-BATCH-{i}",
                quantity=1,
                unit_price=amt,
                subtotal=amt,
                status=OrderItem.Status.DELIVERED,
            )
            comm = (amt * Decimal("0.0500")).quantize(Decimal("0.01"))
            SellerEarning.objects.create(
                seller=self.seller_a,
                order_item=item,
                gross_amount=amt,
                commission_rate=Decimal("0.0500"),
                commission_amount=comm,
                net_amount=amt - comm,
            )

        # Create 2 payouts for Seller A: ₹1500 and ₹700 (Total paid = ₹2200)
        SellerPayout.objects.create(
            seller=self.seller_a,
            amount=Decimal("1500.00"),
            payout_date=timezone.localdate(),
            transaction_reference="UTR-MULTI-01",
            created_by=self.admin,
        )
        SellerPayout.objects.create(
            seller=self.seller_a,
            amount=Decimal("700.00"),
            payout_date=timezone.localdate(),
            transaction_reference="UTR-MULTI-02",
            created_by=self.admin,
        )

        # Expected:
        # Gross: 1000 + 2000 + 3000 = 6000.00
        # Comm: 50 + 100 + 150 = 300.00
        # Net: 5700.00
        # Paid: 1500 + 700 = 2200.00
        # Pending: 5700 - 2200 = 3500.00
        #
        # (If Cartesian inflation were present from joining 3 earnings x 2 payouts,
        # Gross would erroneously be 12,000 and Paid would be 6,600).

        # Check Seller Dashboard API
        self.authenticate_jwt(self.seller_user_a)
        seller_dash = self.client.get(self.seller_dashboard_url)
        self.assertEqual(seller_dash.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(seller_dash.data["total_gross_earnings"]), Decimal("6000.00"))
        self.assertEqual(Decimal(seller_dash.data["total_commission_deducted"]), Decimal("300.00"))
        self.assertEqual(Decimal(seller_dash.data["total_net_earnings"]), Decimal("5700.00"))
        self.assertEqual(Decimal(seller_dash.data["already_paid"]), Decimal("2200.00"))
        self.assertEqual(Decimal(seller_dash.data["pending_payout_balance"]), Decimal("3500.00"))

        # Check Admin Overview API
        self.authenticate_jwt(self.admin)
        admin_overview = self.client.get(self.admin_earnings_overview_url)
        self.assertEqual(admin_overview.status_code, status.HTTP_200_OK)

        seller_a_entry = next(
            item for item in admin_overview.data["results"] if item["seller_id"] == str(self.seller_a.id)
        )
        self.assertEqual(Decimal(seller_a_entry["total_gross_earnings"]), Decimal("6000.00"))
        self.assertEqual(Decimal(seller_a_entry["total_commission_deducted"]), Decimal("300.00"))
        self.assertEqual(Decimal(seller_a_entry["total_net_earnings"]), Decimal("5700.00"))
        self.assertEqual(Decimal(seller_a_entry["already_paid"]), Decimal("2200.00"))
        self.assertEqual(Decimal(seller_a_entry["pending_payout_balance"]), Decimal("3500.00"))

    # =========================================================================
    # 9. Privacy: Admin Email Protection
    # =========================================================================

    def test_seller_payout_history_does_not_expose_admin_email(self):
        """
        Verifies that seller-facing payout endpoints do NOT leak the administrator's email,
        while admin-facing payout endpoints DO include created_by_email.
        """
        payout = SellerPayout.objects.create(
            seller=self.seller_a,
            amount=Decimal("500.00"),
            payout_date=timezone.localdate(),
            transaction_reference="UTR-PRIVACY-01",
            notes="Privacy verification payout",
            created_by=self.admin,
        )

        # 1. Seller retrieves payout list
        self.authenticate_jwt(self.seller_user_a)
        seller_resp = self.client.get(self.seller_payouts_url)
        self.assertEqual(seller_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(seller_resp.data["count"], 1)
        seller_item = seller_resp.data["results"][0]

        # Verify admin email is absent from seller response
        self.assertNotIn("created_by_email", seller_item)
        self.assertNotIn("created_by", seller_item)
        self.assertEqual(seller_item["transaction_reference"], "UTR-PRIVACY-01")

        # 2. Admin retrieves seller payout list
        self.authenticate_jwt(self.admin)
        admin_payout_url = f"/api/sellers/admin/sellers/{self.seller_a.id}/payouts/"
        admin_resp = self.client.get(admin_payout_url)
        self.assertEqual(admin_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(admin_resp.data["count"], 1)
        admin_item = admin_resp.data["results"][0]

        # Verify admin email IS present in admin response
        self.assertIn("created_by_email", admin_item)
        self.assertEqual(admin_item["created_by_email"], self.admin.email)


class ConcurrentSellerPayoutTests(TransactionTestCase):
    """
    Genuine multi-threaded concurrency tests for seller payouts using separate
    database connections per thread, following the project's TransactionTestCase conventions.
    """

    def setUp(self):
        self.admin = User.objects.create_user(
            email="admin_concurrent_payout@example.com",
            password="StrongPassword123!",
            first_name="Admin",
            last_name="Concurrent",
            role=User.Role.ADMIN,
        )

        # 1. Seller 1 with ₹1,000 available balance
        self.seller_user = User.objects.create_user(
            email="seller_concurrent_payout@example.com",
            password="StrongPassword123!",
            first_name="Seller",
            last_name="One",
            role=User.Role.SELLER,
        )
        self.seller = SellerProfile.objects.create(
            user=self.seller_user,
            business_name="Concurrent Payouts Co",
            business_type="Wholesale",
            business_email="concurrent@example.com",
            business_phone="9847123999",
            business_address="99 Harbour Road",
            city="Kochi",
            state="Kerala",
            postal_code="682001",
            status=SellerProfile.Status.ACTIVE,
            approved_at=timezone.now(),
        )

        self.customer = User.objects.create_user(
            email="customer_concurrent_payout@example.com",
            password="StrongPassword123!",
            role=User.Role.CUSTOMER,
        )
        self.category = Category.objects.create(name="Concurrent Category", is_active=True)
        self.product = Product.objects.create(
            seller=self.seller,
            category=self.category,
            name="Concurrent Item One",
            sku="CONC-SKU-001",
            price=Decimal("1052.63"),
            stock=100,
            status=Product.Status.APPROVED,
            is_active=True,
        )
        self.order = Order.objects.create(
            user=self.customer,
            status=Order.Status.DELIVERED,
            payment_method=Order.PaymentMethod.RAZORPAY,
            subtotal=Decimal("1052.63"),
            shipping_fee=Decimal("0.00"),
            total_amount=Decimal("1052.63"),
        )
        self.order_item = OrderItem.objects.create(
            order=self.order,
            seller=self.seller,
            product=self.product,
            product_name=self.product.name,
            product_sku=self.product.sku,
            quantity=1,
            unit_price=Decimal("1052.63"),
            subtotal=Decimal("1052.63"),
            status=OrderItem.Status.DELIVERED,
        )
        # Earning 1: gross = 1052.63, comm = 52.63 (5%), net = 1000.00
        self.earning = SellerEarning.objects.create(
            seller=self.seller,
            order_item=self.order_item,
            gross_amount=Decimal("1052.63"),
            commission_rate=Decimal("0.0500"),
            commission_amount=Decimal("52.63"),
            net_amount=Decimal("1000.00"),
        )

        # 2. Seller 2 with ₹1,000 available balance
        self.seller_user2 = User.objects.create_user(
            email="seller2_concurrent_payout@example.com",
            password="StrongPassword123!",
            first_name="Seller",
            last_name="Two",
            role=User.Role.SELLER,
        )
        self.seller2 = SellerProfile.objects.create(
            user=self.seller_user2,
            business_name="Concurrent Payouts Co Two",
            business_type="Wholesale",
            business_email="concurrent2@example.com",
            business_phone="9847123888",
            business_address="100 Harbour Road",
            city="Kochi",
            state="Kerala",
            postal_code="682001",
            status=SellerProfile.Status.ACTIVE,
            approved_at=timezone.now(),
        )
        self.product2 = Product.objects.create(
            seller=self.seller2,
            category=self.category,
            name="Concurrent Item Two",
            sku="CONC-SKU-002",
            price=Decimal("1052.63"),
            stock=100,
            status=Product.Status.APPROVED,
            is_active=True,
        )
        self.order_item2 = OrderItem.objects.create(
            order=self.order,
            seller=self.seller2,
            product=self.product2,
            product_name=self.product2.name,
            product_sku=self.product2.sku,
            quantity=1,
            unit_price=Decimal("1052.63"),
            subtotal=Decimal("1052.63"),
            status=OrderItem.Status.DELIVERED,
        )
        # Earning 2: gross = 1052.63, comm = 52.63 (5%), net = 1000.00
        self.earning2 = SellerEarning.objects.create(
            seller=self.seller2,
            order_item=self.order_item2,
            gross_amount=Decimal("1052.63"),
            commission_rate=Decimal("0.0500"),
            commission_amount=Decimal("52.63"),
            net_amount=Decimal("1000.00"),
        )

    def test_concurrent_payouts_never_exceed_available_balance(self):
        """
        Available balance is ₹1,000.
        Two worker threads synchronized via threading.Barrier begin the payout operation together.
        Row lock on SellerProfile serializes the attempts:
        - Exactly one succeeds (recording ₹700).
        - Exactly one fails with ValidationError ("exceeds seller's available balance").
        - Total paid out is ₹700 (<= ₹1,000).
        - Remaining balance is ₹300.
        - Exactly one payout audit event exists.
        """
        start_barrier = threading.Barrier(2)

        def worker(ref_suffix):
            connection.close()
            try:
                start_barrier.wait(timeout=5)
                return record_seller_payout(
                    seller_id=self.seller.id,
                    amount=Decimal("700.00"),
                    payout_date=timezone.localdate(),
                    transaction_reference=f"UTR-RACE-BAL-{ref_suffix}",
                    admin_user=self.admin,
                    ip_address="192.168.1.100",
                    user_agent="ConcurrentBalanceWorker",
                )
            finally:
                connection.close()

        with ThreadPoolExecutor(max_workers=2) as executor:
            futures = [
                executor.submit(worker, "A"),
                executor.submit(worker, "B"),
            ]
            results = []
            errors = []
            for future in futures:
                try:
                    results.append(future.result())
                except ValidationError as exc:
                    errors.append(exc)

        # Exactly 1 succeeded, exactly 1 failed
        self.assertEqual(len(results), 1)
        self.assertEqual(len(errors), 1)
        self.assertIn("exceeds", str(errors[0]))

        # Database state verification: exactly 1 payout of ₹700 recorded
        payouts = SellerPayout.objects.filter(seller=self.seller)
        self.assertEqual(payouts.count(), 1)
        self.assertEqual(payouts.first().amount, Decimal("700.00"))

        summary = get_seller_balance_summary(self.seller)
        self.assertEqual(summary["already_paid"], Decimal("700.00"))
        self.assertEqual(summary["pending_payout_balance"], Decimal("300.00"))

        # Exactly one payout audit event created
        payout_audits = AuditEvent.objects.filter(
            action=AuditAction.SELLER_PAYOUT_RECORDED,
            entity_type=AuditEntity.SELLER_PAYOUT,
            entity_id=payouts.first().id,
        )
        self.assertEqual(payout_audits.count(), 1)

    def test_concurrent_duplicate_transaction_reference_handling(self):
        """
        Two different sellers (Seller 1 and Seller 2), each with ₹1,000 available balance.
        Both payout attempts use the identical transaction reference.
        The operations are synchronized after both initial duplicate-reference existence
        checks have completed, but before either payout insert executes.
        This genuinely exercises the database unique-constraint conflict and the IntegrityError recovery path:
        - Exactly one payout succeeds.
        - Exactly one fails with transaction-reference ValidationError.
        - Exactly one payout record exists in the database.
        - Exactly one payout audit event exists.
        """
        duplicate_ref = "UTR-IDENTICAL-REF-999"
        insert_barrier = threading.Barrier(2)
        orig_create = SellerPayout.objects.create

        def synchronized_create(*args, **kwargs):
            # Both workers reach this point after passing the initial existence check,
            # right before executing the database INSERT
            insert_barrier.wait(timeout=5)
            return orig_create(*args, **kwargs)

        def worker(target_seller_id):
            connection.close()
            try:
                return record_seller_payout(
                    seller_id=target_seller_id,
                    amount=Decimal("500.00"),
                    payout_date=timezone.localdate(),
                    transaction_reference=duplicate_ref,
                    admin_user=self.admin,
                    ip_address="192.168.1.101",
                    user_agent="DuplicateRefWorker",
                )
            finally:
                connection.close()

        with patch.object(SellerPayout.objects, "create", side_effect=synchronized_create):
            with ThreadPoolExecutor(max_workers=2) as executor:
                futures = [
                    executor.submit(worker, self.seller.id),
                    executor.submit(worker, self.seller2.id),
                ]
                results = []
                errors = []
                for future in futures:
                    try:
                        results.append(future.result())
                    except ValidationError as exc:
                        errors.append(exc)

        # Exactly 1 succeeded, exactly 1 failed with duplicate reference error
        self.assertEqual(len(results), 1)
        self.assertEqual(len(errors), 1)
        self.assertIn("transaction_reference", errors[0].detail)
        self.assertIn("already exists", str(errors[0].detail["transaction_reference"]))

        # Database verification: exactly 1 payout created with this reference
        self.assertEqual(
            SellerPayout.objects.filter(transaction_reference=duplicate_ref).count(),
            1,
        )

        # Exactly one payout audit event created
        self.assertEqual(
            AuditEvent.objects.filter(
                action=AuditAction.SELLER_PAYOUT_RECORDED,
                entity_type=AuditEntity.SELLER_PAYOUT,
                entity_id=results[0].id,
            ).count(),
            1,
        )

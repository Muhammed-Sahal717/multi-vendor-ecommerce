from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.catalog.models import Category, Product
from apps.orders.models import Order
from apps.payments.models import Payment
from apps.sellers.models import SellerApplication, SellerProfile

User = get_user_model()


class AdminDashboardTests(APITestCase):
    def setUp(self):
        self.endpoint = "/api/admin/dashboard/"

        self.admin = User.objects.create_user(
            email="admin_dash@example.com",
            password="StrongPassword123!",
            first_name="Admin",
            last_name="Dash",
            role=User.Role.ADMIN,
        )
        self.superadmin = User.objects.create_superuser(
            email="superadmin_dash@example.com",
            password="StrongPassword123!",
            first_name="Super",
            last_name="Admin",
        )
        self.customer = User.objects.create_user(
            email="customer_dash@example.com",
            password="StrongPassword123!",
            first_name="Customer",
            last_name="Dash",
            role=User.Role.CUSTOMER,
        )
        self.seller_user = User.objects.create_user(
            email="seller_dash@example.com",
            password="StrongPassword123!",
            first_name="Seller",
            last_name="Dash",
            role=User.Role.SELLER,
        )

    # --- Permissions Tests ---

    def test_anonymous_user_receives_401(self):
        response = self.client.get(self.endpoint)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_customer_receives_403(self):
        self.client.force_authenticate(user=self.customer)
        response = self.client.get(self.endpoint)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_seller_receives_403(self):
        self.client.force_authenticate(user=self.seller_user)
        response = self.client.get(self.endpoint)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_receives_200(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(self.endpoint)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_superadmin_receives_200(self):
        self.client.force_authenticate(user=self.superadmin)
        response = self.client.get(self.endpoint)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    # --- Empty State Tests ---

    def test_empty_database_returns_zero_metrics(self):
        # Delete the setup customer so customers table is empty
        self.customer.delete()

        self.client.force_authenticate(user=self.admin)
        response = self.client.get(self.endpoint)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        expected = {
            "customers": {
                "total": 0,
                "active": 0,
                "inactive": 0,
            },
            "sellers": {
                "total": 0,
                "active": 0,
                "suspended": 0,
                "pending_applications": 0,
            },
            "products": {
                "total": 0,
                "approved": 0,
                "pending_approval": 0,
                "out_of_stock": 0,
            },
            "orders": {
                "total": 0,
                "pending": 0,
                "confirmed": 0,
                "processing": 0,
                "partially_shipped": 0,
                "shipped": 0,
                "partially_delivered": 0,
                "delivered": 0,
                "partially_cancelled": 0,
                "cancelled": 0,
            },
            "payments": {
                "successful_count": 0,
                "successful_amount_total": "0.00",
                "pending_cod_count": 0,
                "pending_cod_amount_total": "0.00",
            },
        }
        self.assertEqual(response.data, expected)

    # --- Metric Correctness Tests ---

    def test_dashboard_metrics_correctness(self):
        self.client.force_authenticate(user=self.admin)

        # 1. Customers:
        # self.customer is active. Create 1 more active customer, 1 inactive customer.
        User.objects.create_user(
            email="cust_active2@example.com",
            password="StrongPassword123!",
            role=User.Role.CUSTOMER,
            is_active=True,
        )
        User.objects.create_user(
            email="cust_inactive@example.com",
            password="StrongPassword123!",
            role=User.Role.CUSTOMER,
            is_active=False,
        )

        # 2. Sellers & Applications:
        # Create active seller
        seller_user1 = User.objects.create_user(
            email="seller_u1@example.com",
            password="StrongPassword123!",
            role=User.Role.SELLER,
        )
        seller1 = SellerProfile.objects.create(
            user=seller_user1,
            business_name="Active Store 1",
            business_type="Retail",
            business_email="s1@example.com",
            business_phone="9876543211",
            business_address="123 Street",
            city="Kochi",
            state="Kerala",
            postal_code="682001",
            status=SellerProfile.Status.ACTIVE,
            approved_at=timezone.now(),
        )
        # Create suspended seller
        seller_user2 = User.objects.create_user(
            email="seller_u2@example.com",
            password="StrongPassword123!",
            role=User.Role.SELLER,
        )
        SellerProfile.objects.create(
            user=seller_user2,
            business_name="Suspended Store",
            business_type="Retail",
            business_email="s2@example.com",
            business_phone="9876543212",
            business_address="124 Street",
            city="Kochi",
            state="Kerala",
            postal_code="682001",
            status=SellerProfile.Status.SUSPENDED,
            approved_at=timezone.now(),
        )
        # Create inactive seller
        seller_user3 = User.objects.create_user(
            email="seller_u3@example.com",
            password="StrongPassword123!",
            role=User.Role.SELLER,
        )
        SellerProfile.objects.create(
            user=seller_user3,
            business_name="Inactive Store",
            business_type="Retail",
            business_email="s3@example.com",
            business_phone="9876543213",
            business_address="125 Street",
            city="Kochi",
            state="Kerala",
            postal_code="682001",
            status=SellerProfile.Status.INACTIVE,
            approved_at=timezone.now(),
        )

        # Seller Applications: 2 pending, 1 approved, 1 rejected
        app_user1 = User.objects.create_user(
            email="app1@example.com",
            password="StrongPassword123!",
            role=User.Role.CUSTOMER,
        )
        SellerApplication.objects.create(
            user=app_user1,
            business_name="Pending App 1",
            business_type="Retail",
            business_email="app1@example.com",
            business_phone="9876543221",
            business_address="Address 1",
            city="Kochi",
            state="Kerala",
            postal_code="682001",
            status=SellerApplication.Status.PENDING,
        )
        app_user2 = User.objects.create_user(
            email="app2@example.com",
            password="StrongPassword123!",
            role=User.Role.CUSTOMER,
        )
        SellerApplication.objects.create(
            user=app_user2,
            business_name="Pending App 2",
            business_type="Retail",
            business_email="app2@example.com",
            business_phone="9876543222",
            business_address="Address 2",
            city="Kochi",
            state="Kerala",
            postal_code="682001",
            status=SellerApplication.Status.PENDING,
        )
        app_user3 = User.objects.create_user(
            email="app3@example.com",
            password="StrongPassword123!",
            role=User.Role.CUSTOMER,
        )
        SellerApplication.objects.create(
            user=app_user3,
            business_name="Approved App",
            business_type="Retail",
            business_email="app3@example.com",
            business_phone="9876543223",
            business_address="Address 3",
            city="Kochi",
            state="Kerala",
            postal_code="682001",
            status=SellerApplication.Status.APPROVED,
        )
        app_user4 = User.objects.create_user(
            email="app4@example.com",
            password="StrongPassword123!",
            role=User.Role.CUSTOMER,
        )
        SellerApplication.objects.create(
            user=app_user4,
            business_name="Rejected App",
            business_type="Retail",
            business_email="app4@example.com",
            business_phone="9876543224",
            business_address="Address 4",
            city="Kochi",
            state="Kerala",
            postal_code="682001",
            status=SellerApplication.Status.REJECTED,
        )

        # 3. Products:
        category = Category.objects.create(name="Electronics", is_active=True)
        # Approved & in-stock
        Product.objects.create(
            seller=seller1,
            category=category,
            name="Mouse",
            sku="MS-01",
            price=Decimal("500.00"),
            stock=25,
            status=Product.Status.APPROVED,
            is_active=True,
        )
        # Approved & out-of-stock
        Product.objects.create(
            seller=seller1,
            category=category,
            name="Keyboard",
            sku="KB-01",
            price=Decimal("1500.00"),
            stock=0,
            status=Product.Status.APPROVED,
            is_active=True,
        )
        # Approved & inactive (stock > 0, should NOT count as out-of-stock)
        Product.objects.create(
            seller=seller1,
            category=category,
            name="Monitor",
            sku="MN-01",
            price=Decimal("8000.00"),
            stock=10,
            status=Product.Status.APPROVED,
            is_active=False,
        )
        # Pending approval
        Product.objects.create(
            seller=seller1,
            category=category,
            name="Webcam",
            sku="WC-01",
            price=Decimal("2000.00"),
            stock=5,
            status=Product.Status.PENDING,
            is_active=True,
        )
        # Rejected product
        Product.objects.create(
            seller=seller1,
            category=category,
            name="Defective Cable",
            sku="DC-01",
            price=Decimal("100.00"),
            stock=50,
            status=Product.Status.REJECTED,
            is_active=True,
        )

        # 4. Orders: 1 for each status
        order_statuses = [
            Order.Status.PENDING,
            Order.Status.CONFIRMED,
            Order.Status.PROCESSING,
            Order.Status.PARTIALLY_SHIPPED,
            Order.Status.SHIPPED,
            Order.Status.PARTIALLY_DELIVERED,
            Order.Status.DELIVERED,
            Order.Status.PARTIALLY_CANCELLED,
            Order.Status.CANCELLED,
        ]
        created_orders = []
        for i, order_status in enumerate(order_statuses):
            order = Order.objects.create(
                user=self.customer,
                status=order_status,
                payment_method=Order.PaymentMethod.COD,
                subtotal=Decimal("500.00"),
                shipping_fee=Decimal("0.00"),
                total_amount=Decimal("500.00"),
                shipping_full_name=f"Customer {i}",
                shipping_mobile="9876543210",
                shipping_address_line_1="Address Line 1",
                shipping_city="Kochi",
                shipping_state="Kerala",
                shipping_postal_code="682001",
                shipping_country="India",
            )
            created_orders.append(order)

        # 5. Payments & Financial Metrics:
        # Successful Razorpay: 1000.00
        Payment.objects.create(
            order=created_orders[0],
            method=Payment.Method.RAZORPAY,
            provider=Payment.Provider.MOCK,
            amount=Decimal("1000.00"),
            status=Payment.Status.SUCCESSFUL,
            paid_at=timezone.now(),
        )
        # Successful COD: 500.00
        Payment.objects.create(
            order=created_orders[1],
            method=Payment.Method.COD,
            provider=Payment.Provider.MANUAL,
            amount=Decimal("500.00"),
            status=Payment.Status.SUCCESSFUL,
            paid_at=timezone.now(),
        )
        # Pending COD: 300.00
        Payment.objects.create(
            order=created_orders[2],
            method=Payment.Method.COD,
            provider=Payment.Provider.MANUAL,
            amount=Decimal("300.00"),
            status=Payment.Status.PENDING,
        )
        # Pending Razorpay: 400.00 (excluded from pending COD)
        Payment.objects.create(
            order=created_orders[3],
            method=Payment.Method.RAZORPAY,
            provider=Payment.Provider.MOCK,
            amount=Decimal("400.00"),
            status=Payment.Status.PENDING,
        )
        # Failed Razorpay: 200.00 (excluded from successful)
        Payment.objects.create(
            order=created_orders[4],
            method=Payment.Method.RAZORPAY,
            provider=Payment.Provider.MOCK,
            amount=Decimal("200.00"),
            status=Payment.Status.FAILED,
        )
        # Cancelled COD: 150.00 (excluded from successful)
        Payment.objects.create(
            order=created_orders[5],
            method=Payment.Method.COD,
            provider=Payment.Provider.MANUAL,
            amount=Decimal("150.00"),
            status=Payment.Status.CANCELLED,
        )
        # Refunded Razorpay: 250.00 (excluded from successful)
        Payment.objects.create(
            order=created_orders[6],
            method=Payment.Method.RAZORPAY,
            provider=Payment.Provider.MOCK,
            amount=Decimal("250.00"),
            status=Payment.Status.REFUNDED,
        )

        response = self.client.get(self.endpoint)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.data

        # Verify Customers: 3 total (self.customer + 2 created above; app_users 1-4 also have role=CUSTOMER)
        # Note: app_user1, app_user2, app_user3, app_user4 are created with role=CUSTOMER and is_active=True by default!
        # Total customers = 1 (self.customer) + 1 (cust_active2) + 1 (cust_inactive) + 4 (app_users) = 7.
        # Active = 1 + 1 + 4 = 6. Inactive = 1.
        self.assertEqual(data["customers"]["total"], 7)
        self.assertEqual(data["customers"]["active"], 6)
        self.assertEqual(data["customers"]["inactive"], 1)

        # Verify Sellers
        self.assertEqual(data["sellers"]["total"], 3)
        self.assertEqual(data["sellers"]["active"], 1)
        self.assertEqual(data["sellers"]["suspended"], 1)
        self.assertEqual(data["sellers"]["pending_applications"], 2)

        # Verify Products
        self.assertEqual(data["products"]["total"], 5)
        self.assertEqual(data["products"]["approved"], 3)
        self.assertEqual(data["products"]["pending_approval"], 1)
        self.assertEqual(data["products"]["out_of_stock"], 1)

        # Verify Orders
        self.assertEqual(data["orders"]["total"], 9)
        self.assertEqual(data["orders"]["pending"], 1)
        self.assertEqual(data["orders"]["confirmed"], 1)
        self.assertEqual(data["orders"]["processing"], 1)
        self.assertEqual(data["orders"]["partially_shipped"], 1)
        self.assertEqual(data["orders"]["shipped"], 1)
        self.assertEqual(data["orders"]["partially_delivered"], 1)
        self.assertEqual(data["orders"]["delivered"], 1)
        self.assertEqual(data["orders"]["partially_cancelled"], 1)
        self.assertEqual(data["orders"]["cancelled"], 1)

        # Verify Payments
        # Successful count: 2 (1000.00 + 500.00)
        self.assertEqual(data["payments"]["successful_count"], 2)
        self.assertEqual(data["payments"]["successful_amount_total"], "1500.00")
        # Pending COD count: 1 (300.00)
        self.assertEqual(data["payments"]["pending_cod_count"], 1)
        self.assertEqual(data["payments"]["pending_cod_amount_total"], "300.00")

    # --- Read-Only Behavior Tests ---

    def test_dashboard_is_strictly_read_only(self):
        self.client.force_authenticate(user=self.admin)

        # Non-GET methods are disallowed
        response_post = self.client.post(self.endpoint, {})
        self.assertEqual(response_post.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

        response_put = self.client.put(self.endpoint, {})
        self.assertEqual(response_put.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

        response_patch = self.client.patch(self.endpoint, {})
        self.assertEqual(response_patch.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

        response_delete = self.client.delete(self.endpoint)
        self.assertEqual(response_delete.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_dashboard_query_count_is_bounded(self):
        self.client.force_authenticate(user=self.admin)

        # Exactly 6 aggregation queries are executed (1 per domain model/table)
        with self.assertNumQueries(6):
            response = self.client.get(self.endpoint)
            self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_pending_cod_aggregation_sql_includes_manual_provider_filter(self):
        self.client.force_authenticate(user=self.admin)

        with CaptureQueriesContext(connection) as ctx:
            response = self.client.get(self.endpoint)
            self.assertEqual(response.status_code, status.HTTP_200_OK)

        payments_queries = [
            q["sql"] for q in ctx.captured_queries if "payments_payment" in q["sql"]
        ]
        self.assertEqual(len(payments_queries), 1)
        payments_sql = payments_queries[0]

        # Verify provider condition is present in aggregation SQL
        self.assertIn('"payments_payment"."provider"', payments_sql)

        # Verify the rendered SQL includes the expected provider, method, and status values.
        self.assertIn(f"'{Payment.Provider.MANUAL}'", payments_sql)
        self.assertIn(f"'{Payment.Method.COD}'", payments_sql)
        self.assertIn(f"'{Payment.Status.PENDING}'", payments_sql)

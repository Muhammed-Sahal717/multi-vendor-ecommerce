from datetime import timedelta
from decimal import Decimal

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Address, User
from apps.catalog.models import Category, Product
from apps.orders.models import Order, OrderItem
from apps.payments.models import Payment
from apps.sellers.models import SellerProfile


class AdminOrderTests(APITestCase):
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
        self.seller_user1 = User.objects.create_user(
            email="seller1@example.com",
            password="StrongPassword123!",
            first_name="Seller",
            last_name="One",
            role=User.Role.SELLER,
        )
        self.seller1 = SellerProfile.objects.create(
            user=self.seller_user1,
            business_name="Store Alpha",
            business_type="Retail",
            business_email="alpha@example.com",
            business_phone="9876543210",
            business_address="123 Alpha Road",
            city="Kochi",
            state="Kerala",
            postal_code="682001",
            status=SellerProfile.Status.ACTIVE,
            approved_at=timezone.now(),
        )

        self.seller_user2 = User.objects.create_user(
            email="seller2@example.com",
            password="StrongPassword123!",
            first_name="Seller",
            last_name="Two",
            role=User.Role.SELLER,
        )
        self.seller2 = SellerProfile.objects.create(
            user=self.seller_user2,
            business_name="Store Beta",
            business_type="Wholesale",
            business_email="beta@example.com",
            business_phone="9876543211",
            business_address="456 Beta Street",
            city="Calicut",
            state="Kerala",
            postal_code="673001",
            status=SellerProfile.Status.ACTIVE,
            approved_at=timezone.now(),
        )

        self.category = Category.objects.create(name="Electronics", is_active=True)
        self.product1 = Product.objects.create(
            seller=self.seller1,
            category=self.category,
            name="Wireless Mouse",
            sku="WM-001",
            price=Decimal("499.00"),
            stock=50,
            status=Product.Status.APPROVED,
            is_active=True,
        )
        self.product2 = Product.objects.create(
            seller=self.seller2,
            category=self.category,
            name="Mechanical Keyboard",
            sku="KB-002",
            price=Decimal("1999.00"),
            stock=30,
            status=Product.Status.APPROVED,
            is_active=True,
        )

        # Multi-vendor Order 1 (COD, Pending)
        self.order1 = Order.objects.create(
            user=self.customer,
            status=Order.Status.PENDING,
            payment_method=Order.PaymentMethod.COD,
            subtotal=Decimal("2498.00"),
            shipping_fee=Decimal("0.00"),
            total_amount=Decimal("2498.00"),
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
            amount=Decimal("2498.00"),
            status=Payment.Status.PENDING,
        )
        self.item1_1 = OrderItem.objects.create(
            order=self.order1,
            seller=self.seller1,
            product=self.product1,
            product_name=self.product1.name,
            product_sku=self.product1.sku,
            quantity=1,
            unit_price=self.product1.price,
            subtotal=Decimal("499.00"),
            status=OrderItem.Status.PENDING,
        )
        self.item1_2 = OrderItem.objects.create(
            order=self.order1,
            seller=self.seller2,
            product=self.product2,
            product_name=self.product2.name,
            product_sku=self.product2.sku,
            quantity=1,
            unit_price=self.product2.price,
            subtotal=Decimal("1999.00"),
            status=OrderItem.Status.PENDING,
        )

        # Order 2 (Online Razorpay, Delivered, Paid)
        self.order2 = Order.objects.create(
            user=self.customer,
            status=Order.Status.DELIVERED,
            payment_method=Order.PaymentMethod.RAZORPAY,
            subtotal=Decimal("499.00"),
            shipping_fee=Decimal("0.00"),
            total_amount=Decimal("499.00"),
            shipping_full_name="John Doe",
            shipping_mobile="9876543210",
            shipping_address_line_1="100 Marine Drive",
            shipping_city="Kochi",
            shipping_state="Kerala",
            shipping_postal_code="682001",
            shipping_country="India",
        )
        self.payment2 = Payment.objects.create(
            order=self.order2,
            method=Payment.Method.RAZORPAY,
            provider=Payment.Provider.MOCK,
            amount=Decimal("499.00"),
            status=Payment.Status.SUCCESSFUL,
            paid_at=timezone.now(),
        )
        self.item2_1 = OrderItem.objects.create(
            order=self.order2,
            seller=self.seller1,
            product=self.product1,
            product_name=self.product1.name,
            product_sku=self.product1.sku,
            quantity=1,
            unit_price=self.product1.price,
            subtotal=Decimal("499.00"),
            status=OrderItem.Status.DELIVERED,
        )

        self.list_url = "/api/orders/admin/"
        self.detail_url = f"/api/orders/admin/{self.order1.id}/"

    def test_admin_can_list_orders(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)
        results = response.data["results"]
        self.assertEqual(len(results), 2)

        # Verify serializer fields
        order_data = next((o for o in results if o["id"] == str(self.order1.id)), None)
        self.assertIsNotNone(order_data)
        self.assertEqual(order_data["order_number"], self.order1.order_number)
        self.assertEqual(order_data["customer_email"], "customer@example.com")
        self.assertEqual(order_data["customer_name"], "John Doe")
        self.assertEqual(order_data["status"], "pending")
        self.assertEqual(order_data["payment_method"], "cod")
        self.assertEqual(order_data["payment_status"], "pending")
        self.assertEqual(order_data["item_count"], 2)
        self.assertEqual(Decimal(order_data["total_amount"]), Decimal("2498.00"))

    def test_superadmin_can_list_orders(self):
        self.client.force_authenticate(user=self.superadmin)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)

    def test_pagination_works(self):
        # Create additional orders to test pagination (20 per page)
        bulk_orders = []
        for i in range(25):
            order = Order(
                user=self.customer,
                status=Order.Status.PENDING,
                payment_method=Order.PaymentMethod.COD,
                subtotal=Decimal("100.00"),
                shipping_fee=Decimal("0.00"),
                total_amount=Decimal("100.00"),
                shipping_full_name="Pagination Test",
                shipping_mobile="9876543210",
                shipping_address_line_1="Road",
                shipping_city="Kochi",
                shipping_state="Kerala",
                shipping_postal_code="682001",
                shipping_country="India",
            )
            bulk_orders.append(order)
        Order.objects.bulk_create(bulk_orders)

        self.client.force_authenticate(user=self.admin)
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 27)
        self.assertEqual(len(response.data["results"]), 20)
        self.assertIsNotNone(response.data["next"])

        # Page 2
        response_p2 = self.client.get(response.data["next"])
        self.assertEqual(response_p2.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response_p2.data["results"]), 7)

        # Custom page_size query
        response_custom = self.client.get(f"{self.list_url}?page_size=50")
        self.assertEqual(response_custom.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response_custom.data["results"]), 27)

    def test_filter_by_order_status(self):
        self.client.force_authenticate(user=self.admin)

        # Filter delivered
        response = self.client.get(f"{self.list_url}?status=delivered")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], str(self.order2.id))

        # Filter pending
        response = self.client.get(f"{self.list_url}?status=pending")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], str(self.order1.id))

        # Invalid status
        response_invalid = self.client.get(f"{self.list_url}?status=invalid_status")
        self.assertEqual(response_invalid.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("status", response_invalid.data)

    def test_filter_by_payment_method_and_payment_status(self):
        self.client.force_authenticate(user=self.admin)

        # COD + Pending payment
        response = self.client.get(
            f"{self.list_url}?payment_method=cod&payment_status=pending"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], str(self.order1.id))

        # Razorpay + Successful payment
        response = self.client.get(
            f"{self.list_url}?payment_method=razorpay&payment_status=successful"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], str(self.order2.id))

        # Invalid payment method
        response_bad_method = self.client.get(f"{self.list_url}?payment_method=bitcoin")
        self.assertEqual(response_bad_method.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("payment_method", response_bad_method.data)

        # Invalid payment status
        response_bad_status = self.client.get(f"{self.list_url}?payment_status=unknown")
        self.assertEqual(response_bad_status.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("payment_status", response_bad_status.data)

    def test_date_range_filtering(self):
        self.client.force_authenticate(user=self.admin)
        today = timezone.localdate().strftime("%Y-%m-%d")

        # Today's orders
        response = self.client.get(f"{self.list_url}?date_from={today}&date_to={today}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)

        # Past date range
        yesterday = (timezone.localdate() - timedelta(days=1)).strftime("%Y-%m-%d")
        past_date = (timezone.localdate() - timedelta(days=5)).strftime("%Y-%m-%d")
        response_past = self.client.get(
            f"{self.list_url}?date_from={past_date}&date_to={yesterday}"
        )
        self.assertEqual(response_past.status_code, status.HTTP_200_OK)
        self.assertEqual(response_past.data["count"], 0)

    def test_search_by_order_number_and_customer_email(self):
        self.client.force_authenticate(user=self.admin)

        # Search by order number
        prefix = self.order1.order_number[:10]
        response = self.client.get(f"{self.list_url}?search={prefix}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data["count"], 1)

        # Search by customer email
        response = self.client.get(f"{self.list_url}?search=customer@example.com")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)

        # Search by recipient mobile
        response = self.client.get(f"{self.list_url}?search=9876543210")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)

        # Search nonexistent
        response = self.client.get(f"{self.list_url}?search=nonexistent")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 0)

    def test_invalid_date_ranges_are_rejected(self):
        self.client.force_authenticate(user=self.admin)

        # date_from > date_to
        response = self.client.get(
            f"{self.list_url}?date_from=2026-11-20&date_to=2026-11-10"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("date_to", response.data)

        # Malformed date_from
        response_bad_from = self.client.get(f"{self.list_url}?date_from=not-a-date")
        self.assertEqual(response_bad_from.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("date_from", response_bad_from.data)

        # Malformed date_to
        response_bad_to = self.client.get(f"{self.list_url}?date_to=2026/11/15")
        self.assertEqual(response_bad_to.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("date_to", response_bad_to.data)

    def test_admin_can_retrieve_complete_order_details(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(self.detail_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data

        self.assertEqual(data["id"], str(self.order1.id))
        self.assertEqual(data["order_number"], self.order1.order_number)
        self.assertEqual(data["status"], "pending")
        self.assertEqual(data["payment_method"], "cod")
        self.assertEqual(Decimal(data["total_amount"]), Decimal("2498.00"))

        # Customer identity
        self.assertEqual(data["customer"]["id"], str(self.customer.id))
        self.assertEqual(data["customer"]["email"], "customer@example.com")
        self.assertEqual(data["customer"]["first_name"], "John")
        self.assertEqual(data["customer"]["last_name"], "Doe")

        # Shipping address snapshot
        self.assertEqual(data["shipping_full_name"], "John Doe")
        self.assertEqual(data["shipping_mobile"], "9876543210")
        self.assertEqual(data["shipping_city"], "Kochi")

        # Payment summary
        self.assertIsNotNone(data["payment"])
        self.assertEqual(data["payment"]["method"], "cod")
        self.assertEqual(data["payment"]["status"], "pending")

    def test_multivendor_order_details_include_correct_seller_attribution(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(self.detail_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        items = response.data["items"]
        self.assertEqual(len(items), 2)

        item1 = next((i for i in items if i["id"] == str(self.item1_1.id)), None)
        self.assertIsNotNone(item1)
        self.assertEqual(item1["product_name"], "Wireless Mouse")
        self.assertEqual(item1["product_sku"], "WM-001")
        self.assertEqual(item1["seller_id"], str(self.seller1.id))
        self.assertEqual(item1["seller_business_name"], "Store Alpha")
        self.assertEqual(Decimal(item1["unit_price"]), Decimal("499.00"))
        self.assertEqual(item1["quantity"], 1)

        item2 = next((i for i in items if i["id"] == str(self.item1_2.id)), None)
        self.assertIsNotNone(item2)
        self.assertEqual(item2["product_name"], "Mechanical Keyboard")
        self.assertEqual(item2["product_sku"], "KB-002")
        self.assertEqual(item2["seller_id"], str(self.seller2.id))
        self.assertEqual(item2["seller_business_name"], "Store Beta")
        self.assertEqual(Decimal(item2["unit_price"]), Decimal("1999.00"))
        self.assertEqual(item2["quantity"], 1)

    def test_customer_cannot_access_admin_order_endpoints(self):
        self.client.force_authenticate(user=self.customer)

        response_list = self.client.get(self.list_url)
        self.assertEqual(response_list.status_code, status.HTTP_403_FORBIDDEN)

        response_detail = self.client.get(self.detail_url)
        self.assertEqual(response_detail.status_code, status.HTTP_403_FORBIDDEN)

    def test_seller_cannot_access_admin_order_endpoints(self):
        self.client.force_authenticate(user=self.seller_user1)

        response_list = self.client.get(self.list_url)
        self.assertEqual(response_list.status_code, status.HTTP_403_FORBIDDEN)

        response_detail = self.client.get(self.detail_url)
        self.assertEqual(response_detail.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_access_is_rejected(self):
        response_list = self.client.get(self.list_url)
        self.assertEqual(response_list.status_code, status.HTTP_401_UNAUTHORIZED)

        response_detail = self.client.get(self.detail_url)
        self.assertEqual(response_detail.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_admin_endpoints_do_not_permit_order_modification(self):
        self.client.force_authenticate(user=self.admin)

        # POST to list endpoint
        response_post = self.client.post(self.list_url, {"status": "cancelled"})
        self.assertEqual(
            response_post.status_code,
            status.HTTP_405_METHOD_NOT_ALLOWED,
        )

        # PUT to detail endpoint
        response_put = self.client.put(self.detail_url, {"status": "cancelled"})
        self.assertEqual(
            response_put.status_code,
            status.HTTP_405_METHOD_NOT_ALLOWED,
        )

        # PATCH to detail endpoint
        response_patch = self.client.patch(self.detail_url, {"status": "cancelled"})
        self.assertEqual(
            response_patch.status_code,
            status.HTTP_405_METHOD_NOT_ALLOWED,
        )

        # DELETE to detail endpoint
        response_delete = self.client.delete(self.detail_url)
        self.assertEqual(
            response_delete.status_code,
            status.HTTP_405_METHOD_NOT_ALLOWED,
        )

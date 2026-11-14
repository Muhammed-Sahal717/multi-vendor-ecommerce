from decimal import Decimal

from rest_framework import status

from apps.orders.models import Order
from apps.orders.tests.base import OrderTestBase


class OrderHistoryTests(OrderTestBase):
    def setUp(self):
        super().setUp()
        self.client.force_authenticate(user=self.customer)

    def create_order(self):
        response = self.client.post(
            self.checkout_url,
            self.checkout_data,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        return Order.objects.get(user=self.customer)

    def test_customer_can_list_own_orders(self):
        order = self.create_order()

        response = self.client.get("/api/orders/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], str(order.id))

    def test_customer_sees_empty_order_history(self):
        response = self.client.get("/api/orders/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_customer_can_retrieve_own_order(self):
        order = self.create_order()

        response = self.client.get(f"/api/orders/{order.id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], str(order.id))
        self.assertEqual(response.data["order_number"], order.order_number)
        self.assertEqual(len(response.data["items"]), 1)

    def test_customer_cannot_retrieve_another_customers_order(self):
        another_customer = type(self.customer).objects.create_user(
            email="another@example.com",
            password="TestPass123!",
            first_name="Another",
            role="customer",
        )

        order = Order.objects.create(
            user=another_customer,
            payment_method=Order.PaymentMethod.COD,
            subtotal=Decimal("100.00"),
            shipping_fee=Decimal("0.00"),
            total_amount=Decimal("100.00"),
            shipping_full_name="Another Customer",
            shipping_mobile="9876543210",
            shipping_address_line_1="Another Address",
            shipping_address_line_2="",
            shipping_city="Kozhikode",
            shipping_state="Kerala",
            shipping_postal_code="673001",
            shipping_country="India",
        )

        response = self.client.get(f"/api/orders/{order.id}/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_customer_cannot_see_another_customers_orders_in_list(self):
        another_customer = type(self.customer).objects.create_user(
            email="another@example.com",
            password="TestPass123!",
            first_name="Another",
            role="customer",
        )

        Order.objects.create(
            user=another_customer,
            payment_method=Order.PaymentMethod.COD,
            subtotal=Decimal("100.00"),
            shipping_fee=Decimal("0.00"),
            total_amount=Decimal("100.00"),
            shipping_full_name="Another Customer",
            shipping_mobile="9876543210",
            shipping_address_line_1="Another Address",
            shipping_address_line_2="",
            shipping_city="Kozhikode",
            shipping_state="Kerala",
            shipping_postal_code="673001",
            shipping_country="India",
        )

        response = self.client.get("/api/orders/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_order_history_requires_authentication(self):
        self.client.force_authenticate(user=None)

        response = self.client.get("/api/orders/")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_seller_cannot_access_customer_order_history(self):
        self.client.force_authenticate(user=self.seller_user)

        response = self.client.get("/api/orders/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

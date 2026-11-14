from decimal import Decimal

from rest_framework import status
from apps.cart.models import CartItem
from apps.orders.models import Order
from apps.orders.tests.base import OrderTestBase


class CheckoutTests(OrderTestBase):
    def setUp(self):
        super().setUp()
        self.client.force_authenticate(user=self.customer)

    def test_successful_cod_checkout(self):
        response = self.client.post(
            self.checkout_url,
            self.checkout_data,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        order = Order.objects.get(user=self.customer)

        self.assertEqual(order.payment_method, "cod")
        self.assertEqual(order.subtotal, Decimal("200.00"))
        self.assertEqual(order.shipping_fee, Decimal("0.00"))
        self.assertEqual(order.total_amount, Decimal("200.00"))
        self.assertEqual(order.items.count(), 1)

        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 8)

        self.assertFalse(self.cart.items.exists())

    def test_successful_razorpay_order_creation(self):
        data = {
            **self.checkout_data,
            "payment_method": "razorpay",
        }

        response = self.client.post(
            self.checkout_url,
            data,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        order = Order.objects.get(user=self.customer)

        self.assertEqual(order.payment_method, "razorpay")
        self.assertEqual(order.total_amount, Decimal("200.00"))

    def test_checkout_with_multiple_sellers(self):
        second_product = self.create_second_seller_product()

        CartItem.objects.create(
            cart=self.cart,
            product=second_product,
            quantity=2,
        )

        response = self.client.post(
            self.checkout_url,
            self.checkout_data,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        order = Order.objects.get(user=self.customer)

        self.assertEqual(order.items.count(), 2)
        self.assertEqual(
            order.items.values("seller").distinct().count(),
            2,
        )
        self.assertEqual(order.subtotal, Decimal("600.00"))

        self.product.refresh_from_db()
        second_product.refresh_from_db()

        self.assertEqual(self.product.stock, 8)
        self.assertEqual(second_product.stock, 3)

    def test_checkout_with_empty_cart(self):
        self.cart.items.all().delete()

        response = self.client.post(
            self.checkout_url,
            self.checkout_data,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Order.objects.exists())

    def test_checkout_with_another_users_address(self):
        another_customer = type(self.customer).objects.create_user(
            email="another@example.com",
            password="TestPass123!",
            first_name="Another",
            role="customer",
        )

        self.address.user = another_customer
        self.address.save()

        response = self.client.post(
            self.checkout_url,
            self.checkout_data,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Order.objects.exists())

    def test_checkout_with_unavailable_product(self):
        self.product.status = "rejected"
        self.product.save(update_fields=["status"])

        response = self.client.post(
            self.checkout_url,
            self.checkout_data,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Order.objects.exists())

        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 10)
        self.assertTrue(self.cart.items.exists())

    def test_checkout_with_inactive_seller(self):
        self.seller.status = "suspended"
        self.seller.save(update_fields=["status"])

        response = self.client.post(
            self.checkout_url,
            self.checkout_data,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Order.objects.exists())

    def test_checkout_with_insufficient_stock(self):
        self.product.stock = 1
        self.product.save(update_fields=["stock"])

        response = self.client.post(
            self.checkout_url,
            self.checkout_data,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Order.objects.exists())

        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 1)
        self.assertTrue(self.cart.items.exists())

    def test_checkout_rejects_invalid_payment_method(self):
        data = {
            **self.checkout_data,
            "payment_method": "bitcoin",
        }

        response = self.client.post(
            self.checkout_url,
            data,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Order.objects.exists())

    def test_checkout_requires_authentication(self):
        self.client.force_authenticate(user=None)

        response = self.client.post(
            self.checkout_url,
            self.checkout_data,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(Order.objects.exists())

    def test_checkout_rejects_non_customer(self):
        self.client.force_authenticate(user=self.seller_user)

        response = self.client.post(
            self.checkout_url,
            self.checkout_data,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(Order.objects.exists())

    def test_checkout_with_inactive_category(self):
        self.category.is_active = False
        self.category.save(update_fields=["is_active"])

        response = self.client.post(
            self.checkout_url,
            self.checkout_data,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Order.objects.exists())

    def test_checkout_with_inactive_product(self):
        self.product.is_active = False
        self.product.save(update_fields=["is_active"])

        response = self.client.post(
            self.checkout_url,
            self.checkout_data,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Order.objects.exists())

    def test_checkout_rejects_client_supplied_totals(self):
        data = {
            **self.checkout_data,
            "subtotal": "1.00",
            "total_amount": "1.00",
            "shipping_fee": "0.00",
        }

        response = self.client.post(
            self.checkout_url,
            data,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        order = Order.objects.get(user=self.customer)
        self.assertEqual(order.subtotal, Decimal("200.00"))
        self.assertEqual(order.total_amount, Decimal("200.00"))

    def test_order_keeps_shipping_address_snapshot(self):
        response = self.client.post(
            self.checkout_url,
            self.checkout_data,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        order = Order.objects.get(user=self.customer)

        self.address.full_name = "Updated Customer"
        self.address.save(update_fields=["full_name"])

        order.refresh_from_db()
        self.assertEqual(order.shipping_full_name, "Test Customer")

    def test_order_keeps_product_price_snapshot(self):
        response = self.client.post(
            self.checkout_url,
            self.checkout_data,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        order = Order.objects.get(user=self.customer)
        item = order.items.get()

        self.product.price = Decimal("500.00")
        self.product.save(update_fields=["price"])

        item.refresh_from_db()
        self.assertEqual(item.unit_price, Decimal("100.00"))
        self.assertEqual(item.subtotal, Decimal("200.00"))

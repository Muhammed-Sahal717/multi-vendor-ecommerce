from rest_framework import status

from apps.orders.models import Order
from apps.orders.tests.base import OrderTestBase
from apps.payments.models import Payment, PaymentAttempt
from django.contrib.auth import get_user_model

User = get_user_model()


class CustomerPaymentAPITests(OrderTestBase):
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
        self.payment = Payment.objects.get(order=self.order)

        self.list_url = "/api/payments/"
        self.detail_url = f"/api/payments/{self.payment.id}/"
        self.mock_url = f"/api/payments/{self.payment.id}/mock-process/"

    def make_online_payment(self):
        self.order.payment_method = Order.PaymentMethod.RAZORPAY
        self.order.save(update_fields=["payment_method"])

        self.payment.method = Payment.Method.RAZORPAY
        self.payment.provider = Payment.Provider.MOCK
        self.payment.save(update_fields=["method", "provider"])

    def test_customer_can_list_own_payments(self):
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(str(response.data[0]["id"]), str(self.payment.id))

    def test_customer_can_retrieve_own_payment(self):
        response = self.client.get(self.detail_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["order_number"], self.order.order_number)
        self.assertEqual(response.data["status"], Payment.Status.PENDING)
        self.assertEqual(response.data["attempts"], [])

    def test_customer_cannot_retrieve_another_customers_payment(self):
        other_user = User.objects.create_user(
            email="other@example.com",
            password="TestPass123!",
            first_name="Other",
            role="customer",
        )

        self.client.force_authenticate(user=other_user)

        response = self.client.get(self.detail_url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_successful_mock_payment_api(self):
        self.make_online_payment()

        response = self.client.post(
            self.mock_url,
            {"outcome": PaymentAttempt.Status.SUCCESSFUL},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], PaymentAttempt.Status.SUCCESSFUL)

        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, Payment.Status.SUCCESSFUL)
        self.assertIsNotNone(self.payment.paid_at)

    def test_failed_mock_payment_api(self):
        self.make_online_payment()

        response = self.client.post(
            self.mock_url,
            {
                "outcome": PaymentAttempt.Status.FAILED,
                "failure_reason": "Test payment failure",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], PaymentAttempt.Status.FAILED)
        self.assertEqual(
            response.data["failure_reason"],
            "Test payment failure",
        )

        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, Payment.Status.PENDING)

    def test_invalid_mock_payment_outcome_is_rejected(self):
        self.make_online_payment()

        response = self.client.post(
            self.mock_url,
            {"outcome": "cancelled"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cod_payment_cannot_use_mock_gateway(self):
        response = self.client.post(
            self.mock_url,
            {"outcome": PaymentAttempt.Status.SUCCESSFUL},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_seller_cannot_access_customer_payments(self):
        self.client.force_authenticate(user=self.seller_user)

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_user_cannot_access_payments(self):
        self.client.force_authenticate(user=None)

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

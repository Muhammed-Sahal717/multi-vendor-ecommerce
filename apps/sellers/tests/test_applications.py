from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.sellers.models import SellerApplication


class SellerApplicationTests(APITestCase):
    url = "/api/sellers/applications/"

    def setUp(self):
        self.customer = User.objects.create_user(
            email="customer@example.com",
            password="StrongPassword123!",
        )

        self.client.force_authenticate(user=self.customer)

        self.payload = {
            "business_name": "Sahal Stores",
            "business_type": "Retail",
            "business_email": "business@example.com",
            "business_phone": "9876543210",
            "business_address": "Main Street",
            "city": "Malappuram",
            "state": "Kerala",
            "postal_code": "676001",
            "country": "India",
            "website": "",
            "description": "Online retail business",
        }

    def test_customer_can_submit_application(self):
        response = self.client.post(
            self.url,
            self.payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], "pending")

        self.assertTrue(
            SellerApplication.objects.filter(
                user=self.customer,
                status="pending",
            ).exists()
        )

    def test_duplicate_pending_application_rejected(self):
        SellerApplication.objects.create(
            user=self.customer,
            **self.payload,
        )

        response = self.client.post(
            self.url,
            self.payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_cannot_apply_as_customer(self):
        admin = User.objects.create_user(
            email="admin@example.com",
            password="StrongPassword123!",
            role=User.Role.ADMIN,
        )

        self.client.force_authenticate(user=admin)

        response = self.client.post(
            self.url,
            self.payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unauthenticated_application_rejected(self):
        self.client.force_authenticate(user=None)

        response = self.client.post(
            self.url,
            self.payload,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

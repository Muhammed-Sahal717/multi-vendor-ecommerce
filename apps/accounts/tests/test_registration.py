from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import CustomerProfile, User


class RegistrationAPITests(APITestCase):
    url = "/api/auth/register/"

    def setUp(self):
        self.valid_payload = {
            "first_name": "Sahal",
            "last_name": "AP",
            "email": "test@example.com",
            "password": "StrongPassword123!",
            "confirm_password": "StrongPassword123!",
        }

    def test_successful_registration(self):
        response = self.client.post(
            self.url,
            self.valid_payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email="test@example.com").exists())

        # Password must never appear in the response.
        self.assertNotIn("password", response.data)
        self.assertNotIn("confirm_password", response.data)

    def test_duplicate_email_registration(self):
        User.objects.create_user(
            email="test@example.com",
            password="AnotherPassword123!",
        )

        response = self.client.post(
            self.url,
            self.valid_payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_password_mismatch(self):
        payload = self.valid_payload.copy()
        payload["confirm_password"] = "DifferentPassword123!"

        response = self.client.post(
            self.url,
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("confirm_password", response.data)

    def test_customer_profile_created_automatically(self):
        response = self.client.post(
            self.url,
            self.valid_payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        user = User.objects.get(email="test@example.com")

        self.assertTrue(CustomerProfile.objects.filter(user=user).exists())

        self.assertEqual(user.role, User.Role.CUSTOMER)

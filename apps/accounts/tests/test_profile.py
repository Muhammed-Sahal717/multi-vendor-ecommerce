from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User, CustomerProfile


class CustomerProfileAPITests(APITestCase):
    profile_url = "/api/accounts/profile/"

    def setUp(self):
        self.user = User.objects.create_user(
            email="test@example.com",
            password="StrongPassword123!",
            first_name="Sahal",
            last_name="AP",
        )

        self.client.force_authenticate(user=self.user)

    def test_retrieve_profile(self):
        response = self.client.get(self.profile_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], self.user.email)
        self.assertEqual(response.data["first_name"], "Sahal")

    def test_update_profile(self):
        response = self.client.patch(
            self.profile_url,
            {
                "first_name": "Muhammed",
                "last_name": "Sahal",
                "mobile": "9876543210",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.user.refresh_from_db()

        self.assertEqual(self.user.first_name, "Muhammed")
        self.assertEqual(self.user.last_name, "Sahal")

        profile = CustomerProfile.objects.get(user=self.user)
        self.assertEqual(profile.mobile, "9876543210")

    def test_profile_is_created_automatically(self):
        self.assertTrue(CustomerProfile.objects.filter(user=self.user).exists())

    def test_profile_access_requires_authentication(self):
        self.client.force_authenticate(user=None)

        response = self.client.get(self.profile_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

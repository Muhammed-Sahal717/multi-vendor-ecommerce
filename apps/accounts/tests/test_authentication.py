from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User


class AuthenticationAPITests(APITestCase):
    login_url = "/api/auth/login/"
    refresh_url = "/api/auth/token/refresh/"
    me_url = "/api/auth/me/"

    def setUp(self):
        self.password = "StrongPassword123!"

        self.user = User.objects.create_user(
            email="test@example.com",
            password=self.password,
        )

    def test_successful_login(self):
        response = self.client.post(
            self.login_url,
            {
                "email": "test@example.com",
                "password": self.password,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_invalid_password(self):
        response = self.client.post(
            self.login_url,
            {
                "email": "test@example.com",
                "password": "WrongPassword123!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_token_refresh(self):
        login_response = self.client.post(
            self.login_url,
            {
                "email": "test@example.com",
                "password": self.password,
            },
            format="json",
        )

        refresh_token = login_response.data["refresh"]

        response = self.client.post(
            self.refresh_url,
            {"refresh": refresh_token},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)

    def test_authenticated_user_profile(self):
        login_response = self.client.post(
            self.login_url,
            {
                "email": "test@example.com",
                "password": self.password,
            },
            format="json",
        )

        access_token = login_response.data["access"]

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")

        response = self.client.get(self.me_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], self.user.email)
        self.assertEqual(response.data["role"], User.Role.CUSTOMER)

    def test_unauthenticated_user_cannot_access_me(self):
        response = self.client.get(self.me_url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

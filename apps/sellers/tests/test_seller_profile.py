from rest_framework import status
from rest_framework.test import APITestCase

from django.utils import timezone

from apps.accounts.models import User
from apps.sellers.models import SellerProfile


class SellerProfileAPITests(APITestCase):
    url = "/api/sellers/profile/"

    def setUp(self):
        self.seller = User.objects.create_user(
            email="seller@example.com",
            password="StrongPassword123!",
            role=User.Role.SELLER,
        )

        self.profile = SellerProfile.objects.create(
            user=self.seller,
            business_name="Sahal Stores",
            business_type="Retail",
            business_email="business@example.com",
            business_phone="9876543210",
            business_address="Main Street",
            city="Malappuram",
            state="Kerala",
            postal_code="676001",
            country="India",
            status=SellerProfile.Status.ACTIVE,
            approved_at=timezone.now(),
        )

        self.client.force_authenticate(user=self.seller)

    def test_seller_can_retrieve_profile(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["business_name"], "Sahal Stores")

    def test_seller_can_update_profile(self):
        response = self.client.patch(
            self.url,
            {
                "business_name": "Sahal Premium Stores",
                "city": "Kozhikode",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.profile.refresh_from_db()

        self.assertEqual(
            self.profile.business_name,
            "Sahal Premium Stores",
        )
        self.assertEqual(self.profile.city, "Kozhikode")

    def test_seller_cannot_change_status(self):
        response = self.client.patch(
            self.url,
            {"status": "suspended"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.profile.refresh_from_db()

        self.assertEqual(
            self.profile.status,
            SellerProfile.Status.ACTIVE,
        )

    def test_customer_cannot_access_seller_profile(self):
        customer = User.objects.create_user(
            email="customer@example.com",
            password="StrongPassword123!",
        )

        self.client.force_authenticate(user=customer)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_suspended_seller_cannot_access_profile(self):
        self.profile.status = SellerProfile.Status.SUSPENDED
        self.profile.save(update_fields=["status"])

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_cannot_access_seller_profile(self):
        admin = User.objects.create_user(
            email="admin@example.com",
            password="StrongPassword123!",
            role=User.Role.ADMIN,
        )

        self.client.force_authenticate(user=admin)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_user_cannot_access_profile(self):
        self.client.force_authenticate(user=None)

        response = self.client.get(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

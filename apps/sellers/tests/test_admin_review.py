from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.sellers.models import SellerApplication, SellerProfile


class SellerAdminReviewTests(APITestCase):
    list_url = "/api/sellers/admin/applications/"

    def setUp(self):
        self.customer = User.objects.create_user(
            email="customer@example.com",
            password="StrongPassword123!",
        )

        self.admin = User.objects.create_user(
            email="admin@example.com",
            password="StrongPassword123!",
            role=User.Role.ADMIN,
        )

        self.application = SellerApplication.objects.create(
            user=self.customer,
            business_name="Sahal Stores",
            business_type="Retail",
            business_email="business@example.com",
            business_phone="9876543210",
            business_address="Main Street",
            city="Malappuram",
            state="Kerala",
            postal_code="676001",
            country="India",
        )

        self.review_url = f"{self.list_url}{self.application.id}/review/"

    def test_admin_can_list_applications(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_customer_cannot_list_applications(self):
        self.client.force_authenticate(user=self.customer)

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_approval_creates_seller_profile(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.patch(
            self.review_url,
            {
                "status": "approved",
                "review_notes": "Business verified.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.customer.refresh_from_db()
        self.application.refresh_from_db()

        self.assertEqual(self.customer.role, User.Role.SELLER)
        self.assertTrue(SellerProfile.objects.filter(user=self.customer).exists())
        self.assertEqual(
            self.application.status,
            SellerApplication.Status.APPROVED,
        )
        self.assertEqual(self.application.reviewed_by, self.admin)
        self.assertIsNotNone(self.application.reviewed_at)

    def test_rejection_keeps_customer_role(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.patch(
            self.review_url,
            {
                "status": "rejected",
                "review_notes": "Please correct business details.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.customer.refresh_from_db()

        self.assertEqual(self.customer.role, User.Role.CUSTOMER)
        self.assertFalse(SellerProfile.objects.filter(user=self.customer).exists())

    def test_customer_cannot_review_application(self):
        self.client.force_authenticate(user=self.customer)

        response = self.client.patch(
            self.review_url,
            {"status": "approved"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_application_cannot_be_reviewed_twice(self):
        self.client.force_authenticate(user=self.admin)

        self.client.patch(
            self.review_url,
            {"status": "rejected"},
            format="json",
        )

        response = self.client.patch(
            self.review_url,
            {"status": "approved"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_nonexistent_application_returns_404(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.patch(
            f"{self.list_url}00000000-0000-0000-0000-000000000000/review/",
            {"status": "approved"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_superadmin_can_list_applications(self):
        superadmin = User.objects.create_superuser(
            email="superadmin@example.com",
            password="StrongPassword123!",
        )

        self.client.force_authenticate(user=superadmin)

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_seller_cannot_list_applications(self):
        seller = User.objects.create_user(
            email="seller@example.com",
            password="StrongPassword123!",
            role=User.Role.SELLER,
        )

        self.client.force_authenticate(user=seller)

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_seller_cannot_review_application(self):
        seller = User.objects.create_user(
            email="seller@example.com",
            password="StrongPassword123!",
            role=User.Role.SELLER,
        )

        self.client.force_authenticate(user=seller)

        response = self.client.patch(
            self.review_url,
            {"status": "approved"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_user_cannot_list_applications(self):
        self.client.force_authenticate(user=None)

        response = self.client.get(self.list_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

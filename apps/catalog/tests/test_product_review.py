from decimal import Decimal

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.catalog.models import Category, Product
from apps.sellers.models import SellerProfile


class AdminProductReviewTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            email="admin@example.com",
            password="TestPass123!",
            role=User.Role.ADMIN,
        )

        self.customer = User.objects.create_user(
            email="customer@example.com",
            password="TestPass123!",
            role=User.Role.CUSTOMER,
        )

        self.seller_user = User.objects.create_user(
            email="seller@example.com",
            password="TestPass123!",
            role=User.Role.SELLER,
        )

        self.seller = SellerProfile.objects.create(
            user=self.seller_user,
            business_name="Test Store",
            business_type="Retail",
            business_email="seller@example.com",
            business_phone="9876543210",
            business_address="Test Address",
            city="Kochi",
            state="Kerala",
            postal_code="682001",
            country="India",
            approved_at=timezone.now(),
        )

        self.category = Category.objects.create(name="Tiles")

        self.product = Product.objects.create(
            seller=self.seller,
            category=self.category,
            name="Ceramic Tile",
            sku="TILE-001",
            description="Premium ceramic tile",
            price=Decimal("120.00"),
            stock=50,
        )

        self.list_url = "/api/catalog/admin/products/"
        self.review_url = f"/api/catalog/admin/products/{self.product.slug}/review/"

    def test_admin_can_list_products(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_admin_can_filter_pending_products(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.get(
            self.list_url,
            {"status": "pending"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_admin_can_approve_product(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.patch(
            self.review_url,
            {"status": "approved"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.product.refresh_from_db()
        self.assertEqual(self.product.status, Product.Status.APPROVED)

    def test_admin_can_reject_product(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.patch(
            self.review_url,
            {
                "status": "rejected",
                "rejection_reason": "Unclear product images",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.product.refresh_from_db()
        self.assertEqual(self.product.status, Product.Status.REJECTED)
        self.assertEqual(
            self.product.rejection_reason,
            "Unclear product images",
        )

    def test_rejection_requires_reason(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.patch(
            self.review_url,
            {"status": "rejected"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_customer_cannot_review_product(self):
        self.client.force_authenticate(user=self.customer)

        response = self.client.patch(
            self.review_url,
            {"status": "approved"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_seller_cannot_review_own_product(self):
        self.client.force_authenticate(user=self.seller_user)

        response = self.client.patch(
            self.review_url,
            {"status": "approved"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_user_cannot_list_products(self):
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_already_reviewed_product_cannot_be_reviewed_again(self):
        self.product.status = Product.Status.APPROVED
        self.product.save()

        self.client.force_authenticate(user=self.admin)

        response = self.client.patch(
            self.review_url,
            {"status": "rejected", "rejection_reason": "Changed decision"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_review_status_is_rejected(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.patch(
            self.review_url,
            {"status": "pending"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_empty_review_request_is_rejected(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.patch(
            self.review_url,
            {},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        self.product.refresh_from_db()
        self.assertEqual(self.product.status, Product.Status.PENDING)

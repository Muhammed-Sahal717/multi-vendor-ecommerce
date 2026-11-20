from decimal import Decimal

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.catalog.models import Category, Product
from apps.sellers.models import SellerProfile
from apps.audit.constants import AuditAction, AuditEntity
from apps.audit.models import AuditEvent


class ProductAPITests(APITestCase):
    def create_seller(self, email, business_name):
        user = User.objects.create_user(
            email=email,
            password="TestPass123!",
            role=User.Role.SELLER,
        )

        profile = SellerProfile.objects.create(
            user=user,
            business_name=business_name,
            business_type="Retail",
            business_email=email,
            business_phone="9876543210",
            business_address="Test Address",
            city="Kochi",
            state="Kerala",
            postal_code="682001",
            country="India",
            approved_at=timezone.now(),
        )

        return user, profile

    def setUp(self):
        self.seller_user, self.seller = self.create_seller(
            "seller@example.com",
            "Test Store",
        )

        self.other_user, self.other_seller = self.create_seller(
            "seller2@example.com",
            "Another Store",
        )

        self.customer = User.objects.create_user(
            email="customer@example.com",
            password="TestPass123!",
            role=User.Role.CUSTOMER,
        )

        self.category = Category.objects.create(name="Tiles")

        self.seller_url = "/api/catalog/seller/products/"
        self.public_url = "/api/catalog/products/"

        self.product = Product.objects.create(
            seller=self.seller,
            category=self.category,
            name="Ceramic Tile",
            sku="TILE-001",
            description="Premium ceramic tile",
            price=Decimal("120.00"),
            stock=50,
        )

    def test_active_seller_can_create_product(self):
        self.client.force_authenticate(user=self.seller_user)

        response = self.client.post(
            self.seller_url,
            {
                "category": str(self.category.id),
                "name": "Wall Tile",
                "sku": "TILE-002",
                "description": "Premium wall tile",
                "price": "150.00",
                "stock": 30,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        product = Product.objects.get(sku="TILE-002")

        self.assertEqual(product.seller, self.seller)
        self.assertEqual(product.status, Product.Status.PENDING)

    def test_seller_cannot_submit_another_sellers_id(self):
        self.client.force_authenticate(user=self.seller_user)

        response = self.client.post(
            self.seller_url,
            {
                "seller": str(self.other_seller.id),
                "category": str(self.category.id),
                "name": "Wall Tile",
                "sku": "TILE-003",
                "description": "Premium wall tile",
                "price": "150.00",
                "stock": 30,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Product.objects.filter(sku="TILE-003").exists())

    def test_seller_cannot_access_another_sellers_product(self):
        other_product = Product.objects.create(
            seller=self.other_seller,
            category=self.category,
            name="Other Tile",
            sku="OTHER-001",
            description="Another tile",
            price=Decimal("100.00"),
            stock=10,
        )

        self.client.force_authenticate(user=self.seller_user)

        response = self.client.get(f"{self.seller_url}{other_product.slug}/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_customer_cannot_access_seller_products(self):
        self.client.force_authenticate(user=self.customer)

        response = self.client.get(self.seller_url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_pending_product_is_hidden_from_public_list(self):
        response = self.client.get(self.public_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 0)
        self.assertEqual(response.data["results"], [])

    def test_approved_product_is_publicly_visible(self):
        self.product.status = Product.Status.APPROVED
        self.product.save()

        response = self.client.get(self.public_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(len(response.data["results"]), 1)

    def test_seller_cannot_approve_own_product(self):
        self.client.force_authenticate(user=self.seller_user)

        response = self.client.patch(
            f"{self.seller_url}{self.product.slug}/",
            {"status": Product.Status.APPROVED},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        self.product.refresh_from_db()
        self.assertEqual(self.product.status, Product.Status.PENDING)

    def test_inactive_seller_cannot_manage_products(self):
        self.seller.status = SellerProfile.Status.SUSPENDED
        self.seller.save()

        self.client.force_authenticate(user=self.seller_user)

        response = self.client.get(self.seller_url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_seller_cannot_submit_approved_status(self):
        self.client.force_authenticate(user=self.seller_user)

        response = self.client.post(
            self.seller_url,
            {
                "category": str(self.category.id),
                "name": "Restricted Tile",
                "sku": "TILE-RESTRICTED",
                "description": "Test product",
                "price": "100.00",
                "stock": 10,
                "status": "approved",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_seller_cannot_modify_rejection_reason(self):
        self.client.force_authenticate(user=self.seller_user)

        response = self.client.patch(
            f"{self.seller_url}{self.product.slug}/",
            {"rejection_reason": "Ignore rejection"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_seller_cannot_change_product_owner(self):
        self.client.force_authenticate(user=self.seller_user)

        response = self.client.patch(
            f"{self.seller_url}{self.product.slug}/",
            {"seller": str(self.other_seller.id)},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_changing_price_requires_reapproval(self):
        self.product.status = Product.Status.APPROVED
        self.product.save()

        self.client.force_authenticate(user=self.seller_user)

        response = self.client.patch(
            f"{self.seller_url}{self.product.slug}/",
            {"price": "180.00"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.product.refresh_from_db()
        self.assertEqual(self.product.status, Product.Status.PENDING)

    def test_changing_stock_does_not_require_reapproval(self):
        self.product.status = Product.Status.APPROVED
        self.product.save()

        self.client.force_authenticate(user=self.seller_user)

        response = self.client.patch(
            f"{self.seller_url}{self.product.slug}/",
            {"stock": 100},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.product.refresh_from_db()
        self.assertEqual(self.product.status, Product.Status.APPROVED)

    def test_changing_category_requires_reapproval(self):
        self.product.status = Product.Status.APPROVED
        self.product.save()

        new_category = Category.objects.create(name="Wall Tiles")

        self.client.force_authenticate(user=self.seller_user)

        response = self.client.patch(
            f"{self.seller_url}{self.product.slug}/",
            {"category": str(new_category.id)},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.product.refresh_from_db()
        self.assertEqual(self.product.status, Product.Status.PENDING)

    def test_product_creation_creates_audit_event(self):
        self.client.force_authenticate(user=self.seller_user)

        response = self.client.post(
            self.seller_url,
            {
                "category": str(self.category.id),
                "name": "Wall Tile",
                "sku": "TILE-AUDIT-001",
                "description": "Premium wall tile",
                "price": "150.00",
                "stock": 30,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        product = Product.objects.get(sku="TILE-AUDIT-001")

        event = AuditEvent.objects.get(
            action=AuditAction.PRODUCT_CREATED,
            entity_type=AuditEntity.PRODUCT,
            entity_id=product.id,
        )

        self.assertEqual(event.actor, self.seller_user)

    def test_product_update_creates_audit_event(self):
        self.client.force_authenticate(user=self.seller_user)

        response = self.client.patch(
            f"{self.seller_url}{self.product.slug}/",
            {"stock": 75},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        event = AuditEvent.objects.get(
            action=AuditAction.PRODUCT_UPDATED,
            entity_type=AuditEntity.PRODUCT,
            entity_id=self.product.id,
        )

        self.assertEqual(event.actor, self.seller_user)

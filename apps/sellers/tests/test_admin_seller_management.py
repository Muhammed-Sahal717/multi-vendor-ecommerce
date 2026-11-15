from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.audit.constants import AuditAction, AuditEntity
from apps.audit.models import AuditEvent
from apps.catalog.models import Category, Product
from apps.sellers.models import SellerProfile


class AdminSellerManagementTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            email="admin@example.com",
            password="StrongPassword123!",
            role=User.Role.ADMIN,
        )
        self.customer = User.objects.create_user(
            email="customer@example.com",
            password="StrongPassword123!",
            role=User.Role.CUSTOMER,
        )
        self.seller_user = User.objects.create_user(
            email="seller@example.com",
            password="StrongPassword123!",
            role=User.Role.SELLER,
        )
        self.seller_profile = SellerProfile.objects.create(
            user=self.seller_user,
            business_name="Kerala Spices Co",
            business_type="Wholesale",
            business_email="contact@keralaspices.com",
            business_phone="9847012345",
            business_address="Wayanad Road",
            city="Calicut",
            state="Kerala",
            postal_code="673001",
            country="India",
            status=SellerProfile.Status.ACTIVE,
            approved_at=timezone.now(),
        )

        self.list_url = "/api/sellers/admin/sellers/"
        self.detail_url = f"/api/sellers/admin/sellers/{self.seller_profile.id}/"
        self.status_url = f"/api/sellers/admin/sellers/{self.seller_profile.id}/status/"

    def test_admin_can_list_sellers_paginated(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("count", response.data)
        self.assertIn("results", response.data)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["business_name"], "Kerala Spices Co")
        self.assertEqual(response.data["results"][0]["user_email"], "seller@example.com")

    def test_filter_sellers_by_status(self):
        self.client.force_authenticate(user=self.admin)

        # Active filter
        response = self.client.get(f"{self.list_url}?status=active")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

        # Suspended filter
        response = self.client.get(f"{self.list_url}?status=suspended")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 0)

    def test_search_sellers(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(f"{self.list_url}?search=Spices")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

        response = self.client.get(f"{self.list_url}?search=NonExistent")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 0)

    def test_admin_can_retrieve_seller_detail(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(self.detail_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], str(self.seller_profile.id))
        self.assertEqual(response.data["user_email"], "seller@example.com")
        self.assertEqual(response.data["status"], "active")

    def test_customer_cannot_access_admin_sellers(self):
        self.client.force_authenticate(user=self.customer)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        response = self.client.get(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        response = self.client.patch(self.status_url, {"status": "suspended"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_seller_cannot_access_admin_sellers(self):
        self.client.force_authenticate(user=self.seller_user)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_cannot_access_admin_sellers(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_admin_can_suspend_active_seller(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(
            self.status_url,
            {
                "status": "suspended",
                "reason": "Suspected counterfeit goods report.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.seller_profile.refresh_from_db()
        self.assertEqual(self.seller_profile.status, SellerProfile.Status.SUSPENDED)

        # Verify audit event
        audit_event = AuditEvent.objects.filter(
            action=AuditAction.SELLER_SUSPENDED,
            entity_type=AuditEntity.SELLER,
            entity_id=self.seller_profile.id,
        ).first()
        self.assertIsNotNone(audit_event)
        self.assertEqual(audit_event.actor, self.admin)
        self.assertEqual(audit_event.metadata["old_status"], "active")
        self.assertEqual(audit_event.metadata["new_status"], "suspended")
        self.assertEqual(
            audit_event.metadata["reason"],
            "Suspected counterfeit goods report.",
        )

    def test_admin_can_reactivate_suspended_seller(self):
        self.seller_profile.status = SellerProfile.Status.SUSPENDED
        self.seller_profile.save(update_fields=["status"])

        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(
            self.status_url,
            {
                "status": "active",
                "reason": "Verification completed successfully.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.seller_profile.refresh_from_db()
        self.assertEqual(self.seller_profile.status, SellerProfile.Status.ACTIVE)

        audit_event = AuditEvent.objects.filter(
            action=AuditAction.SELLER_REACTIVATED,
            entity_type=AuditEntity.SELLER,
            entity_id=self.seller_profile.id,
        ).first()
        self.assertIsNotNone(audit_event)
        self.assertEqual(audit_event.actor, self.admin)
        self.assertEqual(audit_event.metadata["old_status"], "suspended")
        self.assertEqual(audit_event.metadata["new_status"], "active")

    def test_redundant_transition_rejected(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(
            self.status_url,
            {"status": "active"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("status", response.data)

    def test_transition_involving_inactive_rejected(self):
        self.seller_profile.status = SellerProfile.Status.INACTIVE
        self.seller_profile.save(update_fields=["status"])

        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(
            self.status_url,
            {"status": "active"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("status", response.data)

    def test_suspended_seller_cannot_perform_active_seller_actions(self):
        self.seller_profile.status = SellerProfile.Status.SUSPENDED
        self.seller_profile.save(update_fields=["status"])

        self.client.force_authenticate(user=self.seller_user)
        # Attempt to access seller products
        response = self.client.get("/api/catalog/seller/products/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_suspended_seller_products_hidden_from_public_catalog(self):
        category = Category.objects.create(name="Spices", is_active=True)
        Product.objects.create(
            seller=self.seller_profile,
            category=category,
            name="Cardamom 500g",
            price=750,
            stock=20,
            status=Product.Status.APPROVED,
            is_active=True,
        )

        # Verify visible while active
        response = self.client.get("/api/catalog/products/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

        # Suspend seller
        self.seller_profile.status = SellerProfile.Status.SUSPENDED
        self.seller_profile.save(update_fields=["status"])

        # Verify immediately hidden from public catalog
        response = self.client.get("/api/catalog/products/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 0)

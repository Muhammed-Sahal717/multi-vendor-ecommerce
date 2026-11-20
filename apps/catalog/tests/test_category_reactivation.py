from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.catalog.models import Category


class CategoryReactivationTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            email="admin@example.com",
            password="TestPassword123!",
            role=User.Role.ADMIN,
        )
        self.customer = User.objects.create_user(
            email="customer@example.com",
            password="TestPassword123!",
            role=User.Role.CUSTOMER,
        )

        self.parent = Category.objects.create(name="Construction", is_active=True)
        self.child = Category.objects.create(
            name="Cement",
            parent=self.parent,
            is_active=False,
        )

    def test_admin_can_retrieve_inactive_category(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(f"/api/catalog/categories/{self.child.slug}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Cement")
        self.assertFalse(response.data["is_active"])

    def test_customer_cannot_retrieve_inactive_category(self):
        self.client.force_authenticate(user=self.customer)
        response = self.client.get(f"/api/catalog/categories/{self.child.slug}/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_anonymous_cannot_retrieve_inactive_category(self):
        response = self.client.get(f"/api/catalog/categories/{self.child.slug}/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_admin_can_reactivate_category(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(
            f"/api/catalog/categories/{self.child.slug}/",
            {"is_active": True},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.child.refresh_from_db()
        self.assertTrue(self.child.is_active)

    def test_cannot_activate_subcategory_under_inactive_parent(self):
        # Deactivate parent first
        self.parent.is_active = False
        self.parent.save(update_fields=["is_active"])

        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(
            f"/api/catalog/categories/{self.child.slug}/",
            {"is_active": True},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("parent", response.data)
        self.child.refresh_from_db()
        self.assertFalse(self.child.is_active)

    def test_cannot_move_active_category_under_inactive_parent(self):
        active_child = Category.objects.create(name="Steel", is_active=True)
        self.parent.is_active = False
        self.parent.save(update_fields=["is_active"])

        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(
            f"/api/catalog/categories/{active_child.slug}/",
            {"parent": str(self.parent.id)},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("parent", response.data)

    def test_cannot_set_category_as_its_own_parent(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(
            f"/api/catalog/categories/{self.parent.slug}/",
            {"parent": str(self.parent.id)},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("parent", response.data)

    def test_cannot_move_category_under_direct_child(self):
        self.child.is_active = True
        self.child.save(update_fields=["is_active"])

        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(
            f"/api/catalog/categories/{self.parent.slug}/",
            {"parent": str(self.child.id)},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("parent", response.data)
        self.assertIn("descendants", str(response.data["parent"][0]))

    def test_cannot_move_category_under_deep_descendant(self):
        electronics = Category.objects.create(name="Electronics", is_active=True)
        mobiles = Category.objects.create(name="Mobiles", parent=electronics, is_active=True)
        accessories = Category.objects.create(name="Accessories", parent=mobiles, is_active=True)
        cables = Category.objects.create(name="Cables", parent=accessories, is_active=True)

        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(
            f"/api/catalog/categories/{electronics.slug}/",
            {"parent": str(cables.id)},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("parent", response.data)
        self.assertIn("descendants", str(response.data["parent"][0]))

        response = self.client.patch(
            f"/api/catalog/categories/{mobiles.slug}/",
            {"parent": str(cables.id)},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("parent", response.data)
        self.assertIn("descendants", str(response.data["parent"][0]))

    def test_admin_can_list_inactive_categories_with_param(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get("/api/catalog/categories/?include_inactive=true")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should include subcategories even if inactive
        parent_data = next((c for c in response.data if c["id"] == str(self.parent.id)), None)
        self.assertNotNull = self.assertIsNotNone(parent_data)
        sub_names = [s["name"] for s in parent_data["subcategories"]]
        self.assertIn("Cement", sub_names)

    def test_customer_cannot_use_include_inactive_param(self):
        self.client.force_authenticate(user=self.customer)
        response = self.client.get("/api/catalog/categories/?include_inactive=true")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        parent_data = next((c for c in response.data if c["id"] == str(self.parent.id)), None)
        self.assertIsNotNone(parent_data)
        # Inactive child should NOT be present for customer
        self.assertEqual(len(parent_data["subcategories"]), 0)

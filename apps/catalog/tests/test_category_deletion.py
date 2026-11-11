from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.catalog.models import Category


class CategoryDeletionTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            email="admin@example.com",
            password="TestPass123!",
            role=User.Role.ADMIN,
        )

        self.parent = Category.objects.create(name="Tiles")
        self.child = Category.objects.create(
            name="Floor Tiles",
            parent=self.parent,
        )

        self.client.force_authenticate(user=self.admin)

    def test_admin_can_deactivate_leaf_category(self):
        response = self.client.delete(f"/api/catalog/categories/{self.child.slug}/")

        self.assertEqual(
            response.status_code,
            status.HTTP_204_NO_CONTENT,
        )

        self.child.refresh_from_db()
        self.assertFalse(self.child.is_active)

    def test_parent_with_active_subcategories_cannot_be_deactivated(self):
        response = self.client.delete(f"/api/catalog/categories/{self.parent.slug}/")

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.parent.refresh_from_db()
        self.assertTrue(self.parent.is_active)

    def test_parent_can_be_deactivated_after_child_is_deactivated(self):
        self.child.is_active = False
        self.child.save()

        response = self.client.delete(f"/api/catalog/categories/{self.parent.slug}/")

        self.assertEqual(
            response.status_code,
            status.HTTP_204_NO_CONTENT,
        )

        self.parent.refresh_from_db()
        self.assertFalse(self.parent.is_active)

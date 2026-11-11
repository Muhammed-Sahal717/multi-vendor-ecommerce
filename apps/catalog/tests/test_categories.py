from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.catalog.models import Category


class CategoryAPITests(APITestCase):
    def setUp(self):
        self.customer = User.objects.create_user(
            email="customer@example.com",
            password="TestPass123!",
            role=User.Role.CUSTOMER,
        )

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

        self.list_url = "/api/catalog/categories/"

    def test_anonymous_user_can_list_categories(self):
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], "Tiles")
        self.assertEqual(
            response.data[0]["subcategories"][0]["name"],
            "Floor Tiles",
        )

    def test_customer_cannot_create_category(self):
        self.client.force_authenticate(user=self.customer)

        response = self.client.post(
            self.list_url,
            {"name": "Wall Tiles"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_create_category(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            self.list_url,
            {"name": "Wall Tiles"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Category.objects.filter(slug="wall-tiles").exists())

    def test_anonymous_user_can_retrieve_category(self):
        response = self.client.get(f"{self.list_url}tiles/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Tiles")

    def test_customer_cannot_update_category(self):
        self.client.force_authenticate(user=self.customer)

        response = self.client.patch(
            f"{self.list_url}tiles/",
            {"name": "Updated Tiles"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_update_category(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.patch(
            f"{self.list_url}tiles/",
            {"description": "Updated description"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.parent.refresh_from_db()
        self.assertEqual(
            self.parent.description,
            "Updated description",
        )

    def test_inactive_category_is_not_publicly_visible(self):
        self.parent.is_active = False
        self.parent.save()

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

from decimal import Decimal

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.catalog.models import Category, Product
from apps.sellers.models import SellerProfile


class SellerProductFilterTests(APITestCase):
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
        self.user, self.seller = self.create_seller(
            "seller@example.com",
            "Test Store",
        )

        self.other_user, self.other_seller = self.create_seller(
            "other@example.com",
            "Other Store",
        )

        self.category = Category.objects.create(name="Tiles")

        self.create_product(
            self.seller,
            "Ceramic Tile",
            "TILE-001",
            Product.Status.PENDING,
            True,
            "120.00",
        )

        self.create_product(
            self.seller,
            "Wall Tile",
            "TILE-002",
            Product.Status.APPROVED,
            True,
            "250.00",
        )

        self.create_product(
            self.seller,
            "Outdoor Tile",
            "TILE-003",
            Product.Status.REJECTED,
            False,
            "300.00",
        )

        self.create_product(
            self.other_seller,
            "Other Tile",
            "OTHER-001",
            Product.Status.PENDING,
            True,
            "100.00",
        )

        self.url = "/api/catalog/seller/products/"
        self.client.force_authenticate(user=self.user)

    def create_product(self, seller, name, sku, product_status, is_active, price):
        return Product.objects.create(
            seller=seller,
            category=self.category,
            name=name,
            sku=sku,
            description=f"Description for {name}",
            price=Decimal(price),
            stock=20,
            status=product_status,
            is_active=is_active,
        )

    def test_seller_only_sees_own_products(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 3)

    def test_filter_by_pending_status(self):
        response = self.client.get(self.url, {"status": "pending"})

        self.assertEqual(response.data["count"], 1)

    def test_filter_by_approved_status(self):
        response = self.client.get(self.url, {"status": "approved"})

        self.assertEqual(response.data["count"], 1)

    def test_filter_by_rejected_status(self):
        response = self.client.get(self.url, {"status": "rejected"})

        self.assertEqual(response.data["count"], 1)

    def test_filter_by_category(self):
        response = self.client.get(self.url, {"category": str(self.category.id)})

        self.assertEqual(response.data["count"], 3)

    def test_filter_by_active_status(self):
        response = self.client.get(self.url, {"is_active": "false"})

        self.assertEqual(response.data["count"], 1)

    def test_search_by_product_name(self):
        response = self.client.get(self.url, {"search": "Ceramic"})

        self.assertEqual(response.data["count"], 1)

    def test_order_by_price(self):
        response = self.client.get(self.url, {"ordering": "price"})

        prices = [Decimal(item["price"]) for item in response.data["results"]]

        self.assertEqual(prices, sorted(prices))

    def test_seller_pagination(self):
        for index in range(12):
            self.create_product(
                self.seller,
                f"Extra Product {index}",
                f"EXTRA-{index}",
                Product.Status.PENDING,
                True,
                "100.00",
            )

        response = self.client.get(self.url)

        self.assertEqual(response.data["count"], 15)
        self.assertEqual(len(response.data["results"]), 12)

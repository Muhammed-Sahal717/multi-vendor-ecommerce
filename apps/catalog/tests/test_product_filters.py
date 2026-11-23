from decimal import Decimal

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.catalog.models import Category, Product
from apps.sellers.models import SellerProfile


class ProductFilterTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="seller@example.com",
            password="TestPass123!",
            role=User.Role.SELLER,
        )

        self.seller = SellerProfile.objects.create(
            user=self.user,
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

        self.tiles = Category.objects.create(name="Tiles")
        self.paint = Category.objects.create(name="Paint")

        self.create_product(
            "Ceramic Floor Tile",
            "TILE-001",
            self.tiles,
            "120.00",
        )

        self.create_product(
            "Premium Wall Tile",
            "TILE-002",
            self.tiles,
            "250.00",
        )

        self.create_product(
            "Interior Paint",
            "PAINT-001",
            self.paint,
            "800.00",
        )

        self.url = "/api/catalog/products/"

    def create_product(self, name, sku, category, price):
        return Product.objects.create(
            seller=self.seller,
            category=category,
            name=name,
            sku=sku,
            description=f"Description for {name}",
            price=Decimal(price),
            stock=20,
            status=Product.Status.APPROVED,
        )

    def test_filter_by_category(self):
        response = self.client.get(
            self.url,
            {"category": self.tiles.slug},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)

    def test_filter_by_minimum_price(self):
        response = self.client.get(
            self.url,
            {"min_price": "200"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)

    def test_filter_by_maximum_price(self):
        response = self.client.get(
            self.url,
            {"max_price": "200"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_filter_by_price_range(self):
        response = self.client.get(
            self.url,
            {
                "min_price": "100",
                "max_price": "300",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)

    def test_search_by_product_name(self):
        response = self.client.get(
            self.url,
            {"search": "Ceramic"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_order_products_by_price(self):
        response = self.client.get(
            self.url,
            {"ordering": "price"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        prices = [Decimal(item["price"]) for item in response.data["results"]]

        self.assertEqual(prices, sorted(prices))

    def test_pagination_returns_twelve_products_per_page(self):
        for index in range(15):
            self.create_product(
                f"Extra Product {index}",
                f"EXTRA-{index}",
                self.tiles,
                "100.00",
            )

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 18)
        self.assertEqual(len(response.data["results"]), 12)

    def test_custom_page_size(self):
        for index in range(15):
            self.create_product(
                f"Extra Product {index}",
                f"EXTRA-{index}",
                self.tiles,
                "100.00",
            )

        response = self.client.get(
            self.url,
            {"page_size": 5},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 5)

    def test_page_size_cannot_exceed_maximum(self):
        for index in range(15):
            self.create_product(
                f"Extra Product {index}",
                f"EXTRA-{index}",
                self.tiles,
                "100.00",
            )

        response = self.client.get(
            self.url,
            {"page_size": 100},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 18)

    def test_filter_by_parent_category_includes_subcategories(self):
        clothing = Category.objects.create(name="Clothing")
        shirts = Category.objects.create(name="Shirts", parent=clothing)
        jeans = Category.objects.create(name="Jeans", parent=clothing)

        self.create_product("Cotton Shirt", "SHIRT-001", shirts, "500.00")
        self.create_product("Denim Jeans", "JEANS-001", jeans, "1200.00")
        self.create_product("Generic Clothes", "CLOTH-001", clothing, "800.00")

        # Filtering by parent "clothing" should return all 3
        response = self.client.get(self.url, {"category": clothing.slug})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_skus = {item["sku"] for item in response.data["results"]}
        self.assertIn("SHIRT-001", returned_skus)
        self.assertIn("JEANS-001", returned_skus)
        self.assertIn("CLOTH-001", returned_skus)

        # Filtering by subcategory "shirts" should return only the shirt
        response_sub = self.client.get(self.url, {"category": shirts.slug})
        self.assertEqual(response_sub.status_code, status.HTTP_200_OK)
        sub_skus = {item["sku"] for item in response_sub.data["results"]}
        self.assertEqual(sub_skus, {"SHIRT-001"})

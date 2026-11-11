from decimal import Decimal

from django.db import IntegrityError, transaction
from django.test import TestCase

from apps.accounts.models import User
from apps.sellers.models import SellerProfile
from apps.catalog.models import Category, Product, ProductImage


class CatalogModelTests(TestCase):
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
            approved_at=__import__("django.utils.timezone", fromlist=["now"]).now(),
        )

        self.category = Category.objects.create(name="Tiles")

        self.product = Product.objects.create(
            seller=self.seller,
            category=self.category,
            name="Ceramic Floor Tile",
            sku="TILE-001",
            description="Premium ceramic floor tile",
            price=Decimal("120.00"),
            stock=50,
        )

    def test_category_slug_is_generated(self):
        self.assertEqual(self.category.slug, "tiles")

    def test_category_supports_subcategories(self):
        subcategory = Category.objects.create(
            name="Floor Tiles",
            parent=self.category,
        )

        self.assertEqual(subcategory.parent, self.category)
        self.assertIn(subcategory, self.category.subcategories.all())

    def test_product_slug_is_generated(self):
        self.assertEqual(self.product.slug, "ceramic-floor-tile")

    def test_product_defaults_to_pending(self):
        self.assertEqual(self.product.status, Product.Status.PENDING)

    def test_sku_must_be_unique_per_seller(self):
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Product.objects.create(
                    seller=self.seller,
                    category=self.category,
                    name="Another Tile",
                    sku="TILE-001",
                    description="Another product",
                    price=Decimal("100.00"),
                    stock=10,
                )

    def test_same_sku_is_allowed_for_different_sellers(self):
        another_user = User.objects.create_user(
            email="seller2@example.com",
            password="TestPass123!",
            role=User.Role.SELLER,
        )

        another_seller = SellerProfile.objects.create(
            user=another_user,
            business_name="Another Store",
            business_type="Retail",
            business_email="seller2@example.com",
            business_phone="9876543211",
            business_address="Another Address",
            city="Kochi",
            state="Kerala",
            postal_code="682001",
            country="India",
            approved_at=__import__("django.utils.timezone", fromlist=["now"]).now(),
        )

        product = Product.objects.create(
            seller=another_seller,
            category=self.category,
            name="Another Tile",
            sku="TILE-001",
            description="Another product",
            price=Decimal("100.00"),
            stock=10,
        )

        self.assertEqual(product.sku, self.product.sku)

    def test_only_one_primary_image_per_product(self):
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                ProductImage.objects.create(
                    product=self.product,
                    image="products/test1.jpg",
                    is_primary=True,
                )
                ProductImage.objects.create(
                    product=self.product,
                    image="products/test2.jpg",
                    is_primary=True,
                )

    def test_multiple_non_primary_images_are_allowed(self):
        ProductImage.objects.create(
            product=self.product,
            image="products/test1.jpg",
        )
        ProductImage.objects.create(
            product=self.product,
            image="products/test2.jpg",
        )

        self.assertEqual(self.product.images.count(), 2)

from decimal import Decimal
from io import BytesIO

from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from PIL import Image

from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.catalog.models import Category, Product, ProductImage
from apps.sellers.models import SellerProfile


class ProductImageAPITests(APITestCase):
    def create_image(self, name="test.png"):
        image = Image.new("RGB", (100, 100), color="red")
        buffer = BytesIO()
        image.save(buffer, format="PNG")
        buffer.seek(0)

        return SimpleUploadedFile(
            name,
            buffer.read(),
            content_type="image/png",
        )

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

        self.other_user = User.objects.create_user(
            email="other@example.com",
            password="TestPass123!",
            role=User.Role.SELLER,
        )

        self.other_seller = SellerProfile.objects.create(
            user=self.other_user,
            business_name="Other Store",
            business_type="Retail",
            business_email="other@example.com",
            business_phone="9876543211",
            business_address="Other Address",
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
            description="Premium tile",
            price=Decimal("120.00"),
            stock=50,
        )

        self.other_product = Product.objects.create(
            seller=self.other_seller,
            category=self.category,
            name="Other Tile",
            sku="TILE-002",
            description="Another tile",
            price=Decimal("100.00"),
            stock=20,
        )

        self.url = f"/api/catalog/seller/products/{self.product.slug}/images/"

        self.client.force_authenticate(user=self.user)

    def test_seller_can_upload_product_image(self):
        response = self.client.post(
            self.url,
            {"image": self.create_image()},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(self.product.images.count(), 1)

    def test_seller_can_upload_primary_image(self):
        response = self.client.post(
            self.url,
            {
                "image": self.create_image(),
                "is_primary": True,
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        self.assertTrue(self.product.images.get().is_primary)

    def test_new_primary_image_replaces_previous_primary(self):
        first = ProductImage.objects.create(
            product=self.product,
            image="products/first.png",
            is_primary=True,
        )

        response = self.client.post(
            self.url,
            {
                "image": self.create_image("second.png"),
                "is_primary": True,
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        first.refresh_from_db()
        self.assertFalse(first.is_primary)

        self.assertEqual(
            self.product.images.filter(is_primary=True).count(),
            1,
        )

    def test_seller_can_list_product_images(self):
        ProductImage.objects.create(
            product=self.product,
            image="products/test.png",
        )

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_seller_cannot_access_another_sellers_images(self):
        url = f"/api/catalog/seller/products/{self.other_product.slug}/images/"

        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_seller_cannot_upload_to_another_sellers_product(self):
        url = f"/api/catalog/seller/products/{self.other_product.slug}/images/"

        response = self.client.post(
            url,
            {"image": self.create_image()},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_deleting_secondary_image_keeps_primary_image(self):
        first = ProductImage.objects.create(
            product=self.product,
            image="products/first.png",
            is_primary=True,
            display_order=1,
        )

        second = ProductImage.objects.create(
            product=self.product,
            image="products/second.png",
            display_order=2,
        )

        response = self.client.delete(
            f"{self.url}{second.id}/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_204_NO_CONTENT,
        )

        first.refresh_from_db()
        self.assertTrue(first.is_primary)

    def test_deleting_primary_image_promotes_remaining_image(self):
        primary = ProductImage.objects.create(
            product=self.product,
            image="products/primary.png",
            is_primary=True,
            display_order=1,
        )

        secondary = ProductImage.objects.create(
            product=self.product,
            image="products/secondary.png",
            display_order=2,
        )

        response = self.client.delete(f"{self.url}{primary.id}/")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        secondary.refresh_from_db()
        self.assertTrue(secondary.is_primary)

    def test_invalid_image_type_is_rejected(self):
        invalid_file = SimpleUploadedFile(
            "document.txt",
            b"not an image",
            content_type="text/plain",
        )

        response = self.client.post(
            self.url,
            {"image": invalid_file},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unauthenticated_user_cannot_upload_images(self):
        self.client.force_authenticate(user=None)

        response = self.client.post(
            self.url,
            {"image": self.create_image()},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

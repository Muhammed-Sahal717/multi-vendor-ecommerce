from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from apps.catalog.models import Category, Product
from apps.sellers.models import SellerProfile

from django.utils import timezone

User = get_user_model()


class CartTestBase(APITestCase):
    def setUp(self):
        self.customer = User.objects.create_user(
            email="customer@example.com",
            password="TestPass123!",
            first_name="Test",
            role="customer",
        )

        self.seller_user = User.objects.create_user(
            email="seller@example.com",
            password="TestPass123!",
            first_name="Seller",
            role="seller",
        )


        self.seller = SellerProfile.objects.create(
            user=self.seller_user,
            business_name="Test Store",
            business_type="individual",
            business_email="seller@example.com",
            business_phone="9876543210",
            business_address="Test Address",
            city="Malappuram",
            state="Kerala",
            postal_code="676519",
            country="India",
            status=SellerProfile.Status.ACTIVE,
            approved_at=timezone.now(),
        )


        self.category = Category.objects.create(
            name="Electronics",
            is_active=True,
        )

        self.product = Product.objects.create(
            seller=self.seller,
            category=self.category,
            name="Test Product",
            sku="TEST-001",
            description="Test description",
            price=Decimal("100.00"),
            stock=10,
            status="approved",
            is_active=True,
        )

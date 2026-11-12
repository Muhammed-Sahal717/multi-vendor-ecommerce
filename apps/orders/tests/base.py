from decimal import Decimal

from django.utils import timezone
from rest_framework.test import APITestCase

from apps.accounts.models import Address
from apps.cart.models import Cart, CartItem
from apps.catalog.models import Product
from apps.sellers.models import SellerProfile

from apps.cart.tests.base import CartTestBase
from django.contrib.auth import get_user_model

User = get_user_model()


class OrderTestBase(CartTestBase):
    def setUp(self):
        super().setUp()

        self.address = Address.objects.create(
            user=self.customer,
            full_name="Test Customer",
            mobile="9876543210",
            address_line_1="House 123",
            address_line_2="Test Road",
            city="Malappuram",
            state="Kerala",
            postal_code="676519",
            country="India",
            is_default=True,
        )

        self.cart = Cart.objects.create(user=self.customer)

        self.cart_item = CartItem.objects.create(
            cart=self.cart,
            product=self.product,
            quantity=2,
        )

        self.checkout_url = "/api/orders/checkout/"

        self.checkout_data = {
            "address_id": str(self.address.id),
            "payment_method": "cod",
        }

    def create_second_seller_product(self):
        seller_user = User.objects.create_user(
            email="seller2@example.com",
            password="TestPass123!",
            first_name="Seller Two",
            role="seller",
        )

        seller = SellerProfile.objects.create(
            user=seller_user,
            business_name="Second Store",
            business_type="individual",
            business_email="seller2@example.com",
            business_phone="9876543211",
            business_address="Second Address",
            city="Kozhikode",
            state="Kerala",
            postal_code="673001",
            country="India",
            status=SellerProfile.Status.ACTIVE,
            approved_at=timezone.now(),
        )

        return Product.objects.create(
            seller=seller,
            category=self.category,
            name="Second Product",
            sku="TEST-002",
            description="Second test product",
            price=Decimal("200.00"),
            stock=5,
            status=Product.Status.APPROVED,
            is_active=True,
        )

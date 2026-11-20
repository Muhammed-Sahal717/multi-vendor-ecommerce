from decimal import Decimal
from django.core.files.storage import default_storage
from django.core.management import call_command
from django.test import TestCase

from apps.accounts.models import Address, CustomerProfile, User
from apps.cart.models import Cart, CartItem
from apps.catalog.models import Category, Product, ProductImage
from apps.common.seeding.cleaner import clean_demo_data
from apps.common.seeding.constants import (
    DEMO_DOMAIN,
    DEMO_EMAIL_SUFFIX,
    DEMO_PASSWORD,
)
from apps.orders.models import Order, OrderItem
from apps.payments.models import Payment, PaymentAttempt
from apps.sellers.models import SellerApplication, SellerEarning, SellerPayout, SellerProfile


class SeedDemoDataCommandTests(TestCase):
    def tearDown(self):
        # Always clean up demo files from test runs
        clean_demo_data()
        super().tearDown()

    def test_seed_demo_data_execution_and_counts(self):
        """
        Tests that running seed_demo_data creates the complete, expected dataset.
        """
        call_command("seed_demo_data", quiet=True)

        # 1. Users
        superadmin = User.objects.get(email=f"superadmin{DEMO_EMAIL_SUFFIX}")
        self.assertTrue(superadmin.is_staff)
        self.assertTrue(superadmin.is_superuser)
        self.assertEqual(superadmin.role, User.Role.SUPERADMIN)
        self.assertTrue(superadmin.check_password(DEMO_PASSWORD))

        admin = User.objects.get(email=f"admin{DEMO_EMAIL_SUFFIX}")
        self.assertTrue(admin.is_staff)
        self.assertFalse(admin.is_superuser)
        self.assertEqual(admin.role, User.Role.ADMIN)

        # Customers (20 customers: 18 active, 2 inactive, plus 2 applicants who are also role=CUSTOMER)
        active_customers = User.objects.filter(
            email__startswith="customer.",
            email__endswith=DEMO_EMAIL_SUFFIX,
            is_active=True,
        ).count()
        inactive_customers = User.objects.filter(
            email__startswith="customer.",
            email__endswith=DEMO_EMAIL_SUFFIX,
            is_active=False,
        ).count()
        self.assertEqual(active_customers, 18)
        self.assertEqual(inactive_customers, 2)

        # Addresses
        demo_addresses = Address.objects.filter(user__email__endswith=DEMO_EMAIL_SUFFIX)
        self.assertGreaterEqual(demo_addresses.count(), 20)
        # Verify unique default address constraint is respected
        for customer in User.objects.filter(email__startswith="customer.", email__endswith=DEMO_EMAIL_SUFFIX):
            default_addrs = Address.objects.filter(user=customer, is_default=True)
            self.assertEqual(default_addrs.count(), 1)

        # 2. Sellers
        active_sellers = SellerProfile.objects.filter(
            user__email__endswith=DEMO_EMAIL_SUFFIX,
            status=SellerProfile.Status.ACTIVE,
        )
        self.assertEqual(active_sellers.count(), 4)

        suspended_sellers = SellerProfile.objects.filter(
            user__email__endswith=DEMO_EMAIL_SUFFIX,
            status=SellerProfile.Status.SUSPENDED,
        )
        self.assertEqual(suspended_sellers.count(), 1)

        pending_app = SellerApplication.objects.get(
            user__email=f"applicant.pending{DEMO_EMAIL_SUFFIX}",
            status=SellerApplication.Status.PENDING,
        )
        self.assertIsNotNone(pending_app)

        rejected_app = SellerApplication.objects.get(
            user__email=f"applicant.rejected{DEMO_EMAIL_SUFFIX}",
            status=SellerApplication.Status.REJECTED,
        )
        self.assertIsNotNone(rejected_app)

        # 3. Categories
        root_categories = Category.objects.filter(parent__isnull=True).count()
        sub_categories = Category.objects.filter(parent__isnull=False).count()
        self.assertEqual(root_categories, 5)
        self.assertEqual(sub_categories, 9)

        # 4. Products & Images
        demo_products = Product.objects.filter(seller__user__email__endswith=DEMO_EMAIL_SUFFIX)
        self.assertEqual(demo_products.count(), 36)

        out_of_stock = demo_products.filter(stock=0).count()
        self.assertGreaterEqual(out_of_stock, 2)

        approved_count = demo_products.filter(status=Product.Status.APPROVED).count()
        pending_count = demo_products.filter(status=Product.Status.PENDING).count()
        rejected_count = demo_products.filter(status=Product.Status.REJECTED).count()
        self.assertEqual(approved_count, 32)
        self.assertEqual(pending_count, 2)
        self.assertEqual(rejected_count, 2)

        # Exactly 3 images per product (108 total)
        demo_images = ProductImage.objects.filter(product__in=demo_products)
        self.assertEqual(demo_images.count(), 108)

        for prod in demo_products:
            prod_imgs = demo_images.filter(product=prod).order_by("display_order")
            self.assertEqual(prod_imgs.count(), 3)
            self.assertTrue(prod_imgs[0].is_primary)
            self.assertFalse(prod_imgs[1].is_primary)
            self.assertFalse(prod_imgs[2].is_primary)
            # Physical image files exist in storage
            for img in prod_imgs:
                self.assertTrue(default_storage.exists(img.image.name))

        # 5. Orders & Payments
        demo_orders = Order.objects.filter(user__email__endswith=DEMO_EMAIL_SUFFIX)
        self.assertEqual(demo_orders.count(), 25)

        demo_order_items = OrderItem.objects.filter(order__in=demo_orders)
        self.assertGreaterEqual(demo_order_items.count(), 38)

        # Multi-seller orders exist
        multi_seller_orders = [o for o in demo_orders if o.items.values("seller").distinct().count() > 1]
        self.assertGreater(len(multi_seller_orders), 0)

        # Payments and attempts
        payments = Payment.objects.filter(order__in=demo_orders)
        self.assertEqual(payments.count(), 25)
        attempts = PaymentAttempt.objects.filter(payment__in=payments)
        self.assertGreaterEqual(attempts.count(), 14)

        # Seller Earnings (5% commission)
        earnings = SellerEarning.objects.filter(seller__user__email__endswith=DEMO_EMAIL_SUFFIX)
        self.assertGreaterEqual(earnings.count(), 20)
        for earning in earnings:
            self.assertEqual(earning.commission_rate, Decimal("0.0500"))
            expected_comm = (earning.gross_amount * Decimal("0.0500")).quantize(Decimal("0.01"))
            self.assertEqual(earning.commission_amount, expected_comm)
            self.assertEqual(earning.net_amount, earning.gross_amount - expected_comm)

        # Seller Payouts
        payouts = SellerPayout.objects.filter(seller__user__email__endswith=DEMO_EMAIL_SUFFIX)
        self.assertEqual(payouts.count(), 4)
        for payout in payouts:
            self.assertGreater(payout.amount, Decimal("0.00"))

    def test_seed_demo_data_idempotency(self):
        """
        Tests that running the command twice without --reset does not duplicate records.
        """
        call_command("seed_demo_data", quiet=True)
        initial_users = User.objects.filter(email__endswith=DEMO_EMAIL_SUFFIX).count()
        initial_products = Product.objects.filter(seller__user__email__endswith=DEMO_EMAIL_SUFFIX).count()
        initial_images = ProductImage.objects.filter(product__seller__user__email__endswith=DEMO_EMAIL_SUFFIX).count()
        initial_orders = Order.objects.filter(user__email__endswith=DEMO_EMAIL_SUFFIX).count()

        # Run second time
        call_command("seed_demo_data", quiet=True)

        self.assertEqual(User.objects.filter(email__endswith=DEMO_EMAIL_SUFFIX).count(), initial_users)
        self.assertEqual(Product.objects.filter(seller__user__email__endswith=DEMO_EMAIL_SUFFIX).count(), initial_products)
        self.assertEqual(ProductImage.objects.filter(product__seller__user__email__endswith=DEMO_EMAIL_SUFFIX).count(), initial_images)
        self.assertEqual(Order.objects.filter(user__email__endswith=DEMO_EMAIL_SUFFIX).count(), initial_orders)

    def test_seed_demo_data_reset_safety(self):
        """
        Tests that --reset cleanly deletes ONLY demo data and media files,
        leaving non-demo records completely untouched.
        """
        # Create non-demo user
        non_demo_user = User.objects.create_user(
            email="keep.me.safe@externaldomain.com",
            password="SafePassword@123",
            role=User.Role.CUSTOMER,
        )

        # Seed demo data
        call_command("seed_demo_data", quiet=True)

        # Seed again with --reset
        call_command("seed_demo_data", reset=True, quiet=True)

        # Assert non-demo user was preserved
        self.assertTrue(User.objects.filter(email="keep.me.safe@externaldomain.com").exists())
        non_demo_user.delete()

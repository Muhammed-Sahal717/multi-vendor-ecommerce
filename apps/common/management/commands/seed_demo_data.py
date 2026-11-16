from django.core.management.base import BaseCommand
from django.db import transaction

from apps.accounts.models import Address, CustomerProfile, User
from apps.cart.models import Cart, CartItem
from apps.catalog.models import Category, Product, ProductImage
from apps.common.seeding.carts import seed_demo_carts
from apps.common.seeding.catalog import seed_categories, seed_products
from apps.common.seeding.cleaner import clean_demo_data
from apps.common.seeding.constants import DEMO_EMAIL_SUFFIX, DEMO_PASSWORD
from apps.common.seeding.orders import seed_orders
from apps.common.seeding.payouts import seed_seller_payouts
from apps.common.seeding.users import seed_users
from apps.orders.models import Order, OrderItem
from apps.payments.models import Payment, PaymentAttempt
from apps.sellers.models import SellerApplication, SellerEarning, SellerPayout, SellerProfile


class Command(BaseCommand):
    help = "Seeds a complete, realistic demo dataset for the Galla marketplace."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Purge all existing demo data and generated media files before seeding.",
        )
        parser.add_argument(
            "--quiet",
            action="store_true",
            help="Suppress detailed statistics and output only final success message.",
        )

    def handle(self, *args, **options):
        reset = options["reset"]
        quiet = options["quiet"]

        self.stdout.write(self.style.MIGRATE_HEADING("=== GALLA DEMO DATABASE SEEDER ==="))

        if reset:
            self.stdout.write(self.style.WARNING("Reset requested: purging existing demo records & media..."))
            cleaned_stats = clean_demo_data()
            if not quiet:
                self.stdout.write(f"Cleaned {cleaned_stats.get('image_files', 0)} demo media files from storage.")
                self.stdout.write(f"Purged {cleaned_stats.get('users', 0)} demo users and related domain objects.")

        self.stdout.write("Seeding users, sellers, and customer profiles...")
        users_result = seed_users()

        self.stdout.write("Seeding categories and products with local Pillow placeholder images...")
        categories_map = seed_categories()
        catalog_result = seed_products(categories_map)

        self.stdout.write("Seeding orders, payment attempts, order item fulfillment, and earnings...")
        orders_result = seed_orders(
            customers=users_result["customers"],
            admin_user=users_result["admin"],
        )

        self.stdout.write("Populating customer shopping carts...")
        carts_result = seed_demo_carts(
            customers=users_result["customers"],
            products=catalog_result["products"],
        )

        self.stdout.write("Processing weekly seller payouts...")
        payouts_result = seed_seller_payouts(admin_user=users_result["admin"])

        # Aggregate final demo database counts
        total_demo_users = User.objects.filter(email__endswith=DEMO_EMAIL_SUFFIX).count()
        total_customers = User.objects.filter(email__endswith=DEMO_EMAIL_SUFFIX, role=User.Role.CUSTOMER).count()
        total_sellers = SellerProfile.objects.filter(user__email__endswith=DEMO_EMAIL_SUFFIX).count()
        total_categories = Category.objects.count()
        total_products = Product.objects.filter(seller__user__email__endswith=DEMO_EMAIL_SUFFIX).count()
        total_images = ProductImage.objects.filter(product__seller__user__email__endswith=DEMO_EMAIL_SUFFIX).count()
        total_orders = Order.objects.filter(user__email__endswith=DEMO_EMAIL_SUFFIX).count()
        total_order_items = OrderItem.objects.filter(order__user__email__endswith=DEMO_EMAIL_SUFFIX).count()
        total_payments = Payment.objects.filter(order__user__email__endswith=DEMO_EMAIL_SUFFIX).count()
        total_attempts = PaymentAttempt.objects.filter(payment__order__user__email__endswith=DEMO_EMAIL_SUFFIX).count()
        total_earnings = SellerEarning.objects.filter(seller__user__email__endswith=DEMO_EMAIL_SUFFIX).count()
        total_payouts = SellerPayout.objects.filter(seller__user__email__endswith=DEMO_EMAIL_SUFFIX).count()
        total_carts = Cart.objects.filter(user__email__endswith=DEMO_EMAIL_SUFFIX).count()
        total_cart_items = CartItem.objects.filter(cart__user__email__endswith=DEMO_EMAIL_SUFFIX).count()

        if not quiet:
            self.stdout.write("\n" + self.style.SUCCESS("Demo database seeding completed successfully!"))
            self.stdout.write("--------------------------------------------------")
            self.stdout.write(f"• Demo Users:         {total_demo_users} (1 Superadmin, 1 Admin, {total_customers} Customers, {total_sellers} Sellers)")
            self.stdout.write(f"• Seller Profiles:    {total_sellers} (4 Active, 1 Suspended, 2 Applicants)")
            self.stdout.write(f"• Categories:         {total_categories} (5 Root, 9 Subcategories)")
            self.stdout.write(f"• Products:           {total_products} (32 Approved, 2 Pending, 2 Rejected)")
            self.stdout.write(f"• Product Images:     {total_images} (Local Pillow 800x800: 3 per product)")
            self.stdout.write(f"• Active Carts:       {total_carts} carts ({total_cart_items} items)")
            self.stdout.write(f"• Customer Orders:    {total_orders} orders ({total_order_items} items)")
            self.stdout.write(f"• Payments:           {total_payments} records ({total_attempts} payment attempts)")
            self.stdout.write(f"• Seller Earnings:    {total_earnings} earning events (5% platform fee)")
            self.stdout.write(f"• Seller Payouts:     {total_payouts} completed payouts recorded")
            self.stdout.write("--------------------------------------------------")
            self.stdout.write("Demo Credentials:")
            self.stdout.write(f"  Password (all accounts): {DEMO_PASSWORD}")
            self.stdout.write(f"  Superadmin:             superadmin{DEMO_EMAIL_SUFFIX}")
            self.stdout.write(f"  Admin:                  admin{DEMO_EMAIL_SUFFIX}")
            self.stdout.write(f"  Sample Seller:          seller.malabar{DEMO_EMAIL_SUFFIX}")
            self.stdout.write(f"  Sample Customer:        customer.rahul.nair{DEMO_EMAIL_SUFFIX}")
            self.stdout.write("--------------------------------------------------")
        else:
            self.stdout.write(self.style.SUCCESS("Demo database seeding complete."))

import logging
from django.core.files.storage import default_storage
from django.db import transaction

from apps.accounts.models import Address, CustomerProfile, User
from apps.audit.models import AuditEvent
from apps.cart.models import Cart, CartItem
from apps.catalog.models import Category, Product, ProductImage
from apps.common.seeding.constants import (
    CATEGORIES_TREE,
    DEMO_EMAIL_SUFFIX,
)
from apps.orders.models import Order, OrderItem
from apps.payments.models import Payment, PaymentAttempt
from apps.sellers.models import SellerApplication, SellerEarning, SellerPayout, SellerProfile

logger = logging.getLogger(__name__)


def clean_demo_data() -> dict[str, int]:
    """
    Safely and idempotently deletes all demo-generated data and media files.
    Strictly restricted to users and records with email ending in @demo.galla.store.
    Non-demo users, catalog items, and logs are completely preserved.
    """
    stats = {}

    # 1. Clean demo image files on disk
    demo_images = ProductImage.objects.filter(
        product__seller__user__email__endswith=DEMO_EMAIL_SUFFIX
    )
    deleted_files = 0
    for img in demo_images:
        try:
            if img.image and default_storage.exists(img.image.name):
                default_storage.delete(img.image.name)
                deleted_files += 1
        except Exception as exc:
            logger.warning(f"Failed to delete demo image file {img.image}: {exc}")
    stats["image_files"] = deleted_files

    with transaction.atomic():
        # 2. Financial records
        stats["payouts"], _ = SellerPayout.objects.filter(
            seller__user__email__endswith=DEMO_EMAIL_SUFFIX
        ).delete()
        stats["earnings"], _ = SellerEarning.objects.filter(
            seller__user__email__endswith=DEMO_EMAIL_SUFFIX
        ).delete()

        # 3. Payments
        stats["payment_attempts"], _ = PaymentAttempt.objects.filter(
            payment__order__user__email__endswith=DEMO_EMAIL_SUFFIX
        ).delete()
        stats["payments"], _ = Payment.objects.filter(
            order__user__email__endswith=DEMO_EMAIL_SUFFIX
        ).delete()

        # 4. Orders
        stats["order_items"], _ = OrderItem.objects.filter(
            order__user__email__endswith=DEMO_EMAIL_SUFFIX
        ).delete()
        stats["orders"], _ = Order.objects.filter(
            user__email__endswith=DEMO_EMAIL_SUFFIX
        ).delete()

        # 5. Carts
        stats["cart_items"], _ = CartItem.objects.filter(
            cart__user__email__endswith=DEMO_EMAIL_SUFFIX
        ).delete()
        stats["carts"], _ = Cart.objects.filter(
            user__email__endswith=DEMO_EMAIL_SUFFIX
        ).delete()

        # 6. Catalog
        stats["product_images"], _ = ProductImage.objects.filter(
            product__seller__user__email__endswith=DEMO_EMAIL_SUFFIX
        ).delete()
        stats["products"], _ = Product.objects.filter(
            seller__user__email__endswith=DEMO_EMAIL_SUFFIX
        ).delete()

        # Clean demo categories if no non-demo products reference them
        subcat_slugs = []
        root_slugs = []
        for root in CATEGORIES_TREE:
            root_slugs.append(root["slug"])
            for child in root.get("children", []):
                subcat_slugs.append(child["slug"])

        # Delete subcategories first
        deleted_cats = 0
        for sub_slug in subcat_slugs:
            cat = Category.objects.filter(slug=sub_slug).first()
            if cat and not cat.products.exists():
                cat.delete()
                deleted_cats += 1

        # Delete root categories
        for r_slug in root_slugs:
            cat = Category.objects.filter(slug=r_slug).first()
            if cat and not cat.products.exists() and not cat.subcategories.exists():
                cat.delete()
                deleted_cats += 1
        stats["categories"] = deleted_cats

        # 7. Sellers
        stats["seller_profiles"], _ = SellerProfile.objects.filter(
            user__email__endswith=DEMO_EMAIL_SUFFIX
        ).delete()
        stats["seller_applications"], _ = SellerApplication.objects.filter(
            user__email__endswith=DEMO_EMAIL_SUFFIX
        ).delete()

        # 8. Accounts & Profiles
        stats["addresses"], _ = Address.objects.filter(
            user__email__endswith=DEMO_EMAIL_SUFFIX
        ).delete()
        stats["customer_profiles"], _ = CustomerProfile.objects.filter(
            user__email__endswith=DEMO_EMAIL_SUFFIX
        ).delete()

        # 9. Users (AuditEvent.actor will be set to NULL via on_delete=SET_NULL,
        # respecting the PostgreSQL immutability trigger)
        stats["users"], _ = User.objects.filter(
            email__endswith=DEMO_EMAIL_SUFFIX
        ).delete()

    return stats

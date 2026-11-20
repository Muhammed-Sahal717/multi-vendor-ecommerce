from apps.catalog.models import Category, Product, ProductImage
from apps.common.seeding.constants import CATEGORIES_TREE, PRODUCTS_DATA
from apps.common.seeding.images import generate_product_image_file
from apps.sellers.models import SellerProfile


def seed_categories() -> dict[str, Category]:
    """
    Seeds hierarchical parent-child category tree (5 root categories, 9 subcategories).
    Returns mapping of slug -> Category instance.
    """
    categories = {}

    for root_data in CATEGORIES_TREE:
        root_cat, _ = Category.objects.get_or_create(
            slug=root_data["slug"],
            defaults={
                "name": root_data["name"],
                "description": root_data["description"],
                "is_active": True,
            },
        )
        categories[root_cat.slug] = root_cat

        for child_data in root_data.get("children", []):
            child_cat, _ = Category.objects.get_or_create(
                slug=child_data["slug"],
                defaults={
                    "name": child_data["name"],
                    "description": child_data["description"],
                    "parent": root_cat,
                    "is_active": True,
                },
            )
            categories[child_cat.slug] = child_cat

    return categories


def seed_products(categories: dict[str, Category]) -> dict[str, any]:
    """
    Seeds demo products across multiple categories and sellers.
    Generates exactly 3 local Pillow images (primary, alternate, detail) per product.
    """
    results = {
        "products": [],
        "images": [],
    }

    seller_cache = {}

    for prod_data in PRODUCTS_DATA:
        seller_email = prod_data["seller_email"]
        if seller_email not in seller_cache:
            seller = SellerProfile.objects.get(user__email=seller_email)
            seller_cache[seller_email] = seller
        else:
            seller = seller_cache[seller_email]

        category = categories[prod_data["category_slug"]]

        product, created = Product.objects.get_or_create(
            seller=seller,
            sku=prod_data["sku"],
            defaults={
                "category": category,
                "name": prod_data["name"],
                "slug": prod_data["slug"],
                "price": prod_data["price"],
                "stock": prod_data["stock"],
                "status": prod_data["status"],
                "rejection_reason": prod_data.get("rejection_reason", ""),
                "description": prod_data["description"],
                "is_active": True,
            },
        )

        # Update if changed
        if not created:
            product.category = category
            product.name = prod_data["name"]
            product.price = prod_data["price"]
            product.stock = prod_data["stock"]
            product.status = prod_data["status"]
            product.rejection_reason = prod_data.get("rejection_reason", "")
            product.description = prod_data["description"]
            product.save()

        results["products"].append(product)

        # Ensure exactly 3 images per product
        existing_images_count = ProductImage.objects.filter(product=product).count()
        if existing_images_count < 3:
            # Delete any partial images to cleanly regenerate 3 variations
            ProductImage.objects.filter(product=product).delete()

            for variant_idx in range(3):
                is_primary = (variant_idx == 0)
                _, content_file = generate_product_image_file(
                    product_name=product.name,
                    category_slug=category.slug,
                    sku=product.sku,
                    variant_index=variant_idx,
                )

                prod_image = ProductImage.objects.create(
                    product=product,
                    image=content_file,
                    is_primary=is_primary,
                    display_order=variant_idx,
                )
                results["images"].append(prod_image)
        else:
            for img in ProductImage.objects.filter(product=product).order_by("display_order"):
                results["images"].append(img)

    return results

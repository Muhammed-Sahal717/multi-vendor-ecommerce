from django.contrib import admin

from .models import Category, Product, ProductImage


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "parent", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "seller",
        "category",
        "price",
        "stock",
        "status",
        "is_active",
    )
    list_filter = ("status", "is_active", "category")
    search_fields = ("name", "sku", "seller__business_name")
    readonly_fields = ("id", "created_at", "updated_at")

@admin.register(ProductImage)
class ProductImageAdmin(admin.ModelAdmin):
    list_display = ("product", "is_primary", "display_order", "created_at")
    list_filter = ("is_primary",)
    search_fields = ("product__name",)
    readonly_fields = ("id", "created_at")
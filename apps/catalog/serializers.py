from rest_framework import serializers
from .models import Category, Product, ProductImage

from apps.sellers.models import SellerProfile


class CategorySerializer(serializers.ModelSerializer):
    subcategories = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "parent",
            "subcategories",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "slug",
            "subcategories",
            "created_at",
            "updated_at",
        ]

    def get_subcategories(self, obj):
        children = obj.subcategories.filter(is_active=True)
        return CategorySerializer(children, many=True).data


class ProductSerializer(serializers.ModelSerializer):
    seller_name = serializers.CharField(
        source="seller.business_name",
        read_only=True,
    )
    category_name = serializers.CharField(
        source="category.name",
        read_only=True,
    )

    class Meta:
        model = Product
        fields = [
            "id",
            "seller",
            "seller_name",
            "category",
            "category_name",
            "name",
            "slug",
            "sku",
            "description",
            "price",
            "stock",
            "status",
            "rejection_reason",
            "is_active",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "seller",
            "seller_name",
            "slug",
            "status",
            "rejection_reason",
            "created_at",
            "updated_at",
        ]

    def validate_category(self, category):
        if not category.is_active:
            raise serializers.ValidationError(
                "Products cannot be assigned to inactive categories."
            )
        return category

    def validate(self, attrs):
        if self.instance is None:
            return attrs

        if (
            self.instance.status == Product.Status.APPROVED
            and "category" in attrs
            and attrs["category"] != self.instance.category
        ):
            raise serializers.ValidationError(
                {
                    "category": (
                        "Changing the category of an approved product "
                        "requires admin review."
                    )
                }
            )

        return attrs

    def create(self, validated_data):
        user = self.context["request"].user

        seller = SellerProfile.objects.get(user=user)

        return Product.objects.create(
            seller=seller,
            **validated_data,
        )


class ProductReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ["status", "rejection_reason"]

    def validate(self, attrs):
        status_value = attrs.get("status")

        if not status_value:
            raise serializers.ValidationError(
                {"status": "A review decision is required."}
            )

        if status_value not in [
            Product.Status.APPROVED,
            Product.Status.REJECTED,
        ]:
            raise serializers.ValidationError(
                {"status": "Products can only be approved or rejected."}
            )

        if (
            status_value == Product.Status.REJECTED
            and not attrs.get("rejection_reason", "").strip()
        ):
            raise serializers.ValidationError(
                {"rejection_reason": "A rejection reason is required."}
            )

        return attrs


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = [
            "id",
            "product",
            "image",
            "is_primary",
            "display_order",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "product",
            "created_at",
        ]

    def validate_image(self, image):
        max_size = 5 * 1024 * 1024

        if image.size > max_size:
            raise serializers.ValidationError("Image size cannot exceed 5 MB.")

        allowed_types = [
            "image/jpeg",
            "image/png",
            "image/webp",
        ]

        if image.content_type not in allowed_types:
            raise serializers.ValidationError(
                "Only JPEG, PNG, and WebP images are allowed."
            )

        return image

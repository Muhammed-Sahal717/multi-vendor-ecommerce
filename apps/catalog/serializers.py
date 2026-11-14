from rest_framework import serializers
from .models import Category, Product, ProductImage
from django.db import transaction
from apps.sellers.models import SellerProfile
from PIL import Image, UnidentifiedImageError
from apps.audit.constants import AuditAction, AuditEntity
from apps.audit.services import record_audit_event


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
        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        user = request.user
        seller = SellerProfile.objects.get(user=user)

        with transaction.atomic():
            product = Product.objects.create(
                seller=seller,
                **validated_data,
            )

            record_audit_event(
                actor=user,
                action=AuditAction.PRODUCT_CREATED,
                entity_type=AuditEntity.PRODUCT,
                entity_id=product.id,
                ip_address=request.META.get("REMOTE_ADDR"),
                user_agent=request.META.get("HTTP_USER_AGENT", ""),
            )

        return product

    def to_internal_value(self, data):
        protected_fields = {
            "seller",
            "status",
            "rejection_reason",
            "slug",
        }

        submitted_fields = protected_fields.intersection(data.keys())

        if submitted_fields:
            raise serializers.ValidationError(
                {
                    field: "This field cannot be modified directly."
                    for field in submitted_fields
                }
            )

        return super().to_internal_value(data)

    def update(self, instance, validated_data):
        sensitive_fields = {
            "name",
            "category",
            "sku",
            "description",
            "price",
        }

        requires_reapproval = instance.status == Product.Status.APPROVED and any(
            field in validated_data
            and validated_data[field] != getattr(instance, field)
            for field in sensitive_fields
        )

        request = self.context.get("request")

        with transaction.atomic():
            for attr, value in validated_data.items():
                setattr(instance, attr, value)

            if requires_reapproval:
                instance.status = Product.Status.PENDING
                instance.rejection_reason = ""

            instance.save()

            record_audit_event(
                actor=request.user if request else instance.seller.user,
                action=AuditAction.PRODUCT_UPDATED,
                entity_type=AuditEntity.PRODUCT,
                entity_id=instance.id,
                ip_address=request.META.get("REMOTE_ADDR") if request else None,
                user_agent=request.META.get("HTTP_USER_AGENT", "") if request else "",
            )

        return instance


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

        allowed_formats = {
            "JPEG",
            "PNG",
            "WEBP",
        }

        try:
            image.seek(0)

            with Image.open(image) as img:
                if img.format not in allowed_formats:
                    raise serializers.ValidationError(
                        "Only JPEG, PNG, and WebP images are allowed."
                    )

                img.verify()

        except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
            raise serializers.ValidationError("The uploaded file is not a valid image.")

        finally:
            image.seek(0)

        return image

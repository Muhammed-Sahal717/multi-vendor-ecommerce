from django.db import transaction
from django.shortcuts import get_object_or_404

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.generics import (
    ListAPIView,
    ListCreateAPIView,
    RetrieveAPIView,
    RetrieveUpdateAPIView,
    RetrieveUpdateDestroyAPIView,
)
from rest_framework.permissions import (
    AllowAny,
    IsAuthenticatedOrReadOnly,
)
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.audit.constants import AuditAction, AuditEntity
from apps.audit.services import record_audit_event
from apps.sellers.models import SellerProfile

from .filters import ProductFilter
from .models import Category, Product
from .pagination import ProductPagination
from .permissions import (
    IsActiveSeller,
    IsPlatformAdmin,
    IsProductOwnerOrAdmin,
)
from .serializers import (
    CategorySerializer,
    ProductReviewSerializer,
    ProductSerializer,
)


class CategoryListCreateView(ListCreateAPIView):
    serializer_class = CategorySerializer

    def get_queryset(self):
        return Category.objects.filter(
            parent__isnull=True,
            is_active=True,
        ).prefetch_related("subcategories")

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsPlatformAdmin()]

        return [IsAuthenticatedOrReadOnly()]


class CategoryDetailView(RetrieveUpdateDestroyAPIView):
    serializer_class = CategorySerializer
    lookup_field = "slug"

    def get_queryset(self):
        return Category.objects.filter(is_active=True)

    def get_permissions(self):
        if self.request.method in ["PUT", "PATCH", "DELETE"]:
            return [IsPlatformAdmin()]

        return [IsAuthenticatedOrReadOnly()]

    def perform_destroy(self, instance):
        if instance.subcategories.filter(is_active=True).exists():
            raise ValidationError("Deactivate or remove active subcategories first.")

        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])


class SellerProductListCreateView(ListCreateAPIView):
    serializer_class = ProductSerializer
    permission_classes = [IsActiveSeller]

    filter_backends = [
        DjangoFilterBackend,
        SearchFilter,
        OrderingFilter,
    ]

    filterset_fields = ["status", "category", "is_active"]

    search_fields = ["name", "sku", "description"]

    ordering_fields = ["price", "created_at", "name", "stock"]

    ordering = ["-created_at"]
    pagination_class = ProductPagination

    def get_queryset(self):
        return (
            Product.objects.filter(seller__user=self.request.user)
            .select_related(
                "seller",
                "category",
            )
            .prefetch_related("images")
        )

    def perform_create(self, serializer):
        serializer.save()


class SellerProductDetailView(RetrieveUpdateAPIView):
    serializer_class = ProductSerializer
    permission_classes = [IsActiveSeller]
    lookup_field = "slug"

    def get_queryset(self):
        return Product.objects.filter(seller__user=self.request.user).select_related(
            "seller", "category"
        )


class PublicProductListView(ListAPIView):
    serializer_class = ProductSerializer
    permission_classes = [AllowAny]

    filter_backends = [
        DjangoFilterBackend,
        SearchFilter,
        OrderingFilter,
    ]

    filterset_class = ProductFilter

    search_fields = [
        "name",
        "description",
        "seller__business_name",
    ]

    ordering_fields = [
        "price",
        "created_at",
        "name",
    ]

    ordering = ["-created_at"]
    pagination_class = ProductPagination

    def get_queryset(self):
        return (
            Product.objects.filter(
                status=Product.Status.APPROVED,
                is_active=True,
                seller__status=SellerProfile.Status.ACTIVE,
                category__is_active=True,
            )
            .select_related(
                "seller",
                "category",
            )
            .prefetch_related("images")
        )


class PublicProductDetailView(RetrieveAPIView):
    serializer_class = ProductSerializer
    permission_classes = [AllowAny]
    lookup_field = "slug"

    def get_queryset(self):
        return Product.objects.filter(
            status=Product.Status.APPROVED,
            is_active=True,
            seller__status=SellerProfile.Status.ACTIVE,
            category__is_active=True,
        ).select_related("seller", "category")


class AdminProductListView(ListAPIView):
    serializer_class = ProductSerializer
    permission_classes = [IsPlatformAdmin]

    def get_queryset(self):
        queryset = Product.objects.all().select_related(
            "seller",
            "category",
        )

        product_status = self.request.query_params.get("status")

        if product_status:
            queryset = queryset.filter(status=product_status)

        return queryset


class AdminProductReviewView(APIView):
    permission_classes = [IsPlatformAdmin]

    def patch(self, request, slug):
        with transaction.atomic():
            product = get_object_or_404(
                Product.objects.select_for_update(),
                slug=slug,
            )

            if product.status != Product.Status.PENDING:
                return Response(
                    {"detail": "This product has already been reviewed."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if product.seller.status != SellerProfile.Status.ACTIVE:
                return Response(
                    {"detail": "Cannot approve a product from an inactive seller."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if not product.category.is_active:
                return Response(
                    {"detail": "Cannot approve a product in an inactive category."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            serializer = ProductReviewSerializer(
                product,
                data=request.data,
                partial=True,
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()
            decision = serializer.validated_data["status"]

            record_audit_event(
                actor=request.user,
                action=(
                    AuditAction.PRODUCT_APPROVED
                    if decision == Product.Status.APPROVED
                    else AuditAction.PRODUCT_REJECTED
                ),
                entity_type=AuditEntity.PRODUCT,
                entity_id=product.id,
                ip_address=request.META.get("REMOTE_ADDR"),
                user_agent=request.META.get("HTTP_USER_AGENT", ""),
            )

        return Response(
            ProductSerializer(product).data,
            status=status.HTTP_200_OK,
        )

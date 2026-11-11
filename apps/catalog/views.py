from django.db import transaction
from django.shortcuts import get_object_or_404

from rest_framework import status
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
from apps.sellers.models import SellerProfile

from .models import Category, Product
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


class SellerProductListCreateView(ListCreateAPIView):
    serializer_class = ProductSerializer
    permission_classes = [IsActiveSeller]

    def get_queryset(self):
        return Product.objects.filter(seller__user=self.request.user).select_related(
            "seller", "category"
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

    def get_queryset(self):
        return Product.objects.filter(
            status=Product.Status.APPROVED,
            is_active=True,
            seller__status=SellerProfile.Status.ACTIVE,
            category__is_active=True,
        ).select_related("seller", "category")


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

            serializer = ProductReviewSerializer(
                product,
                data=request.data,
                partial=True,
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()

        return Response(
            ProductSerializer(product).data,
            status=status.HTTP_200_OK,
        )

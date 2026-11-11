from django.db import IntegrityError, transaction
from django.shortcuts import get_object_or_404

from rest_framework.generics import ListCreateAPIView, RetrieveDestroyAPIView
from rest_framework.exceptions import ValidationError

from .models import Product, ProductImage
from .serializers import ProductImageSerializer
from .permissions import IsActiveSeller


class SellerProductImageListCreateView(ListCreateAPIView):
    serializer_class = ProductImageSerializer
    permission_classes = [IsActiveSeller]

    def get_product(self):
        return get_object_or_404(
            Product,
            slug=self.kwargs["slug"],
            seller__user=self.request.user,
        )

    def get_queryset(self):
        return ProductImage.objects.filter(
            product__slug=self.kwargs["slug"],
            product__seller__user=self.request.user,
        ).select_related("product")

    def perform_create(self, serializer):
        product = self.get_product()

        try:
            with transaction.atomic():
                if serializer.validated_data.get("is_primary"):
                    ProductImage.objects.filter(
                        product=product,
                        is_primary=True,
                    ).update(is_primary=False)

                serializer.save(product=product)

        except IntegrityError:
            raise ValidationError("Unable to save product image. Please try again.")


class SellerProductImageDetailView(RetrieveDestroyAPIView):
    serializer_class = ProductImageSerializer
    permission_classes = [IsActiveSeller]

    def get_queryset(self):
        return ProductImage.objects.filter(
            product__seller__user=self.request.user,
            product__slug=self.kwargs["slug"],
        )
    def perform_destroy(self, instance):
        product = instance.product
        was_primary = instance.is_primary

        with transaction.atomic():
            instance.delete()

            if was_primary:
                next_image = (
                    ProductImage.objects
                    .filter(product=product)
                    .order_by("display_order", "created_at")
                    .first()
                )

                if next_image:
                    next_image.is_primary = True
                    next_image.save(update_fields=["is_primary"])
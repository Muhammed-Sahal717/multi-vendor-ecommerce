from django.db import IntegrityError, transaction

from rest_framework import generics, serializers, mixins

from apps.cart.models import Cart, CartItem
from apps.cart.permissions import IsCustomer
from apps.cart.serializers import CartSerializer, CartItemSerializer


class CartDetailView(generics.RetrieveAPIView):
    serializer_class = CartSerializer
    permission_classes = [IsCustomer]

    def get_object(self):
        cart, _ = Cart.objects.get_or_create(user=self.request.user)
        return Cart.objects.prefetch_related(
            "items__product__seller",
            "items__product__category",
        ).get(pk=cart.pk)


class CartItemCreateView(generics.CreateAPIView):
    serializer_class = CartItemSerializer
    permission_classes = [IsCustomer]

    def perform_create(self, serializer):
        cart, _ = Cart.objects.get_or_create(user=self.request.user)

        try:
            with transaction.atomic():
                serializer.save(cart=cart)
        except IntegrityError as exc:
            cause = exc.__cause__
            constraint_name = getattr(
                getattr(cause, "diag", None),
                "constraint_name",
                None,
            )

            if constraint_name == "unique_product_per_cart":
                raise serializers.ValidationError(
                    {"product": "This product is already in your cart."}
                )

            raise


class CartItemDetailView(
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    generics.GenericAPIView,
):
    serializer_class = CartItemSerializer
    permission_classes = [IsCustomer]
    lookup_field = "pk"

    def get_queryset(self):
        return CartItem.objects.filter(cart__user=self.request.user).select_related(
            "product",
            "product__seller",
            "product__category",
        )

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)

    def delete(self, request, *args, **kwargs):
        return self.destroy(request, *args, **kwargs)

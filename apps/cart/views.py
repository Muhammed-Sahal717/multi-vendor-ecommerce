from django.db import IntegrityError, transaction

from rest_framework import generics, serializers

from apps.cart.models import Cart, CartItem
from apps.cart.permissions import IsCustomer
from apps.cart.serializers import CartSerializer, CartItemSerializer


class CartDetailView(generics.RetrieveAPIView):
    serializer_class = CartSerializer
    permission_classes = [IsCustomer]

    def get_object(self):
        cart, _ = Cart.objects.get_or_create(user=self.request.user)
        return Cart.objects.prefetch_related("items__product").get(pk=cart.pk)


class CartItemCreateView(generics.CreateAPIView):
    serializer_class = CartItemSerializer
    permission_classes = [IsCustomer]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        cart, _ = Cart.objects.get_or_create(user=self.request.user)
        context["cart"] = cart
        return context

    def perform_create(self, serializer):
        cart = self.request.user.cart

        try:
            with transaction.atomic():
                serializer.save(cart=cart)
        except IntegrityError:
            raise serializers.ValidationError(
                {"product": "This product is already in your cart."}
            )


class CartItemDetailView(generics.UpdateAPIView, generics.DestroyAPIView):
    serializer_class = CartItemSerializer
    permission_classes = [IsCustomer]
    lookup_field = "pk"

    def get_queryset(self):
        return CartItem.objects.filter(cart__user=self.request.user).select_related(
            "product",
            "product__seller",
            "product__category",
        )

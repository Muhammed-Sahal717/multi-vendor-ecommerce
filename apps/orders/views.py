from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.cart.permissions import IsCustomer
from apps.orders.serializers import CheckoutSerializer, OrderSerializer
from apps.orders.services import create_order
from apps.orders.models import Order
from apps.sellers.permissions import IsActiveSeller
from apps.orders.models import OrderItem
from apps.orders.serializers import SellerOrderItemSerializer


class CheckoutView(generics.GenericAPIView):
    serializer_class = CheckoutSerializer
    permission_classes = [IsAuthenticated, IsCustomer]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        order = create_order(
            user=request.user,
            address=serializer.validated_data["address"],
            payment_method=serializer.validated_data["payment_method"],
        )

        response_serializer = OrderSerializer(order)

        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED,
        )


class OrderListView(generics.ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated, IsCustomer]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).prefetch_related("items")


class OrderDetailView(generics.RetrieveAPIView):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated, IsCustomer]
    lookup_field = "pk"

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).prefetch_related("items")


class SellerOrderListView(generics.ListAPIView):
    serializer_class = SellerOrderItemSerializer
    permission_classes = [IsAuthenticated, IsActiveSeller]

    def get_queryset(self):
        return OrderItem.objects.filter(seller__user=self.request.user).select_related(
            "order", "product", "seller"
        )


class SellerOrderDetailView(generics.RetrieveAPIView):
    serializer_class = SellerOrderItemSerializer
    permission_classes = [IsAuthenticated, IsActiveSeller]
    lookup_field = "pk"

    def get_queryset(self):
        return OrderItem.objects.filter(seller__user=self.request.user).select_related(
            "order", "product", "seller"
        )

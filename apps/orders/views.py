from django.db import transaction
from django.shortcuts import get_object_or_404

from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.cart.permissions import IsCustomer
from apps.orders.models import Order, OrderItem
from apps.orders.serializers import (
    CheckoutSerializer,
    OrderSerializer,
    SellerOrderItemSerializer,
    SellerOrderStatusSerializer,
)
from apps.orders.services import (
    create_order,
    update_seller_order_item_status,
    cancel_customer_order_item,
)
from apps.common.permissions import IsActiveSeller


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
            ip_address=request.META.get("REMOTE_ADDR"),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
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


class SellerOrderStatusUpdateView(generics.UpdateAPIView):
    serializer_class = SellerOrderStatusSerializer
    permission_classes = [IsAuthenticated, IsActiveSeller]
    http_method_names = ["patch", "options", "head"]
    lookup_field = "pk"

    def get_queryset(self):
        return OrderItem.objects.filter(
            seller__user=self.request.user,
            seller__status="active",
        )

    def update(self, request, *args, **kwargs):
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field

        order_item = update_seller_order_item_status(
            order_item_id=self.kwargs[lookup_url_kwarg],
            seller_user=request.user,
            new_status=request.data.get("status"),
            ip_address=request.META.get("REMOTE_ADDR"),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
        )

        serializer = self.get_serializer(order_item)
        return Response(serializer.data)


class CustomerOrderItemCancelView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsCustomer]

    def post(self, request, order_id, item_id, *args, **kwargs):
        order_item = cancel_customer_order_item(
            order_id=order_id,
            order_item_id=item_id,
            customer_user=request.user,
            ip_address=request.META.get("REMOTE_ADDR"),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
        )

        return Response(
            {
                "message": "Order item cancelled successfully.",
                "item_id": str(order_item.id),
                "status": order_item.status,
            },
            status=status.HTTP_200_OK,
        )

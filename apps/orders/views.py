from django.db import transaction
from django.db.models import Count, Prefetch
from django.shortcuts import get_object_or_404
from django.utils.dateparse import parse_date

from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.cart.permissions import IsCustomer
from apps.common.permissions import IsActiveSeller, IsPlatformAdmin
from apps.orders.models import Order, OrderItem
from apps.orders.pagination import OrderPagination
from apps.orders.serializers import (
    AdminOrderDetailSerializer,
    AdminOrderListSerializer,
    CheckoutSerializer,
    OrderSerializer,
    SellerOrderItemSerializer,
    SellerOrderStatusSerializer,
)
from apps.orders.services import (
    cancel_customer_order_item,
    create_order,
    update_seller_order_item_status,
)
from apps.payments.models import Payment


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


class AdminOrderListView(generics.ListAPIView):
    serializer_class = AdminOrderListSerializer
    permission_classes = [IsPlatformAdmin]
    pagination_class = OrderPagination
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = [
        "order_number",
        "user__email",
        "shipping_full_name",
        "shipping_mobile",
    ]
    ordering_fields = ["created_at", "total_amount", "status"]
    ordering = ["-created_at"]

    def get_queryset(self):
        queryset = (
            Order.objects.select_related("user", "payment")
            .annotate(item_count=Count("items", distinct=True))
            .distinct()
        )

        status_param = self.request.query_params.get("status")
        if status_param:
            if status_param not in Order.Status.values:
                raise ValidationError({"status": "Enter a valid order status."})
            queryset = queryset.filter(status=status_param)

        payment_method = self.request.query_params.get("payment_method")
        if payment_method:
            if payment_method not in Order.PaymentMethod.values:
                raise ValidationError({"payment_method": "Enter a valid payment method."})
            queryset = queryset.filter(payment_method=payment_method)

        payment_status = self.request.query_params.get("payment_status")
        if payment_status:
            if payment_status not in Payment.Status.values:
                raise ValidationError({"payment_status": "Enter a valid payment status."})
            queryset = queryset.filter(payment__status=payment_status)

        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")

        if date_from:
            parsed_date_from = parse_date(date_from)
            if not parsed_date_from:
                raise ValidationError(
                    {"date_from": "Enter a valid date in YYYY-MM-DD format."}
                )
            queryset = queryset.filter(created_at__date__gte=parsed_date_from)

        if date_to:
            parsed_date_to = parse_date(date_to)
            if not parsed_date_to:
                raise ValidationError(
                    {"date_to": "Enter a valid date in YYYY-MM-DD format."}
                )
            queryset = queryset.filter(created_at__date__lte=parsed_date_to)

        if date_from and date_to and parsed_date_from > parsed_date_to:
            raise ValidationError(
                {"date_to": "Must be greater than or equal to date_from."}
            )

        return queryset


class AdminOrderDetailView(generics.RetrieveAPIView):
    serializer_class = AdminOrderDetailSerializer
    permission_classes = [IsPlatformAdmin]
    lookup_field = "pk"

    def get_queryset(self):
        return (
            Order.objects.select_related("user", "payment")
            .prefetch_related(
                Prefetch(
                    "items",
                    queryset=OrderItem.objects.select_related("seller", "product"),
                )
            )
        )

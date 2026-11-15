from django.utils.dateparse import parse_date
from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.cart.permissions import IsCustomer
from apps.common.permissions import IsPlatformAdmin
from apps.payments.models import Payment
from apps.payments.pagination import PaymentPagination
from apps.payments.serializers import (
    AdminPaymentDetailSerializer,
    AdminPaymentListSerializer,
    MockPaymentProcessSerializer,
    PaymentAttemptSerializer,
    PaymentDetailSerializer,
    PaymentSummarySerializer,
)
from apps.payments.services import (
    confirm_cod_payment_collection,
    process_mock_payment,
)


class CustomerPaymentListView(generics.ListAPIView):
    serializer_class = PaymentSummarySerializer
    permission_classes = [IsAuthenticated, IsCustomer]

    def get_queryset(self):
        return Payment.objects.filter(order__user=self.request.user).select_related(
            "order"
        )


class CustomerPaymentDetailView(generics.RetrieveAPIView):
    serializer_class = PaymentDetailSerializer
    permission_classes = [IsAuthenticated, IsCustomer]

    def get_queryset(self):
        return (
            Payment.objects.filter(order__user=self.request.user)
            .select_related("order")
            .prefetch_related("attempts")
        )


class MockPaymentProcessView(APIView):
    permission_classes = [IsAuthenticated, IsCustomer]

    def post(self, request, pk):
        serializer = MockPaymentProcessSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        attempt = process_mock_payment(
            payment_id=pk,
            customer_user=request.user,
            outcome=serializer.validated_data["outcome"],
            failure_reason=serializer.validated_data.get("failure_reason", ""),
            ip_address=request.META.get("REMOTE_ADDR"),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
        )

        return Response(
            PaymentAttemptSerializer(attempt).data,
            status=status.HTTP_201_CREATED,
        )


class AdminPaymentListView(generics.ListAPIView):
    serializer_class = AdminPaymentListSerializer
    permission_classes = [IsPlatformAdmin]
    pagination_class = PaymentPagination
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = [
        "order__order_number",
        "order__user__email",
        "attempts__transaction_reference",
    ]
    ordering_fields = ["created_at", "amount", "status", "paid_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        queryset = (
            Payment.objects.select_related("order", "order__user")
            .prefetch_related("attempts")
            .distinct()
        )

        status_param = self.request.query_params.get("status")
        if status_param:
            if status_param not in Payment.Status.values:
                raise ValidationError({"status": "Enter a valid payment status."})
            queryset = queryset.filter(status=status_param)

        method_param = self.request.query_params.get("method")
        if method_param:
            if method_param not in Payment.Method.values:
                raise ValidationError({"method": "Enter a valid payment method."})
            queryset = queryset.filter(method=method_param)

        provider_param = self.request.query_params.get("provider")
        if provider_param:
            if provider_param not in Payment.Provider.values:
                raise ValidationError({"provider": "Enter a valid payment provider."})
            queryset = queryset.filter(provider=provider_param)

        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")
        parsed_date_from = None
        parsed_date_to = None

        if date_from:
            parsed_date_from = parse_date(date_from)
            if not parsed_date_from:
                raise ValidationError(
                    {"date_from": "Enter a valid date in YYYY-MM-DD format."}
                )

        if date_to:
            parsed_date_to = parse_date(date_to)
            if not parsed_date_to:
                raise ValidationError(
                    {"date_to": "Enter a valid date in YYYY-MM-DD format."}
                )

        if parsed_date_from and parsed_date_to and parsed_date_from > parsed_date_to:
            raise ValidationError(
                {"date_to": "Must be greater than or equal to date_from."}
            )

        if parsed_date_from:
            queryset = queryset.filter(created_at__date__gte=parsed_date_from)

        if parsed_date_to:
            queryset = queryset.filter(created_at__date__lte=parsed_date_to)

        return queryset


class AdminPaymentDetailView(generics.RetrieveAPIView):
    serializer_class = AdminPaymentDetailSerializer
    permission_classes = [IsPlatformAdmin]
    lookup_field = "pk"
    queryset = (
        Payment.objects.select_related("order", "order__user")
        .prefetch_related("attempts")
    )


class AdminCODPaymentCollectionConfirmView(APIView):
    permission_classes = [IsPlatformAdmin]

    def post(self, request, pk):
        payment = confirm_cod_payment_collection(
            payment_id=pk,
            actor=request.user,
            ip_address=request.META.get("REMOTE_ADDR"),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
        )

        return Response(
            AdminPaymentDetailSerializer(payment).data,
            status=status.HTTP_200_OK,
        )

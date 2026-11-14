from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.cart.permissions import IsCustomer
from apps.payments.models import Payment
from apps.payments.serializers import (
    PaymentSummarySerializer,
    PaymentDetailSerializer,
    MockPaymentProcessSerializer,
    PaymentAttemptSerializer,
)
from apps.payments.services import process_mock_payment


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

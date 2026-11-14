from rest_framework import serializers

from apps.payments.models import Payment, PaymentAttempt


class PaymentSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            "id",
            "method",
            "provider",
            "amount",
            "status",
            "paid_at",
        ]
        read_only_fields = fields


class PaymentAttemptSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentAttempt
        fields = [
            "id",
            "attempt_number",
            "transaction_reference",
            "status",
            "failure_reason",
            "created_at",
        ]
        read_only_fields = fields


class PaymentDetailSerializer(serializers.ModelSerializer):
    attempts = PaymentAttemptSerializer(many=True, read_only=True)
    order_number = serializers.CharField(
        source="order.order_number",
        read_only=True,
    )

    class Meta:
        model = Payment
        fields = [
            "id",
            "order",
            "order_number",
            "method",
            "provider",
            "amount",
            "status",
            "paid_at",
            "attempts",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class MockPaymentProcessSerializer(serializers.Serializer):
    outcome = serializers.ChoiceField(
        choices=PaymentAttempt.Status.choices,
    )
    failure_reason = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=2000,
    )

    def validate_outcome(self, value):
        if value not in (
            PaymentAttempt.Status.SUCCESSFUL,
            PaymentAttempt.Status.FAILED,
        ):
            raise serializers.ValidationError("Choose either successful or failed.")
        return value

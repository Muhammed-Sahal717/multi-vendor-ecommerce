from rest_framework import serializers

from apps.orders.models import Order
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


class AdminOrderSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = [
            "id",
            "order_number",
            "status",
            "total_amount",
            "created_at",
        ]
        read_only_fields = fields


class AdminPaymentListSerializer(serializers.ModelSerializer):
    order_id = serializers.UUIDField(source="order.id", read_only=True)
    order_number = serializers.CharField(source="order.order_number", read_only=True)
    customer_email = serializers.EmailField(source="order.user.email", read_only=True)
    transaction_reference = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = [
            "id",
            "order_id",
            "order_number",
            "customer_email",
            "method",
            "provider",
            "status",
            "amount",
            "transaction_reference",
            "paid_at",
            "created_at",
        ]
        read_only_fields = fields

    def get_transaction_reference(self, obj):
        attempts = getattr(obj, "_prefetched_objects_cache", {}).get("attempts")
        if attempts is not None:
            latest = max(attempts, key=lambda a: a.attempt_number, default=None)
            return latest.transaction_reference if latest else None
        last_attempt = obj.attempts.order_by("-attempt_number").first()
        return last_attempt.transaction_reference if last_attempt else None


class AdminPaymentDetailSerializer(serializers.ModelSerializer):
    order = AdminOrderSummarySerializer(read_only=True)
    customer = serializers.SerializerMethodField()
    attempts = PaymentAttemptSerializer(many=True, read_only=True)

    class Meta:
        model = Payment
        fields = [
            "id",
            "order",
            "customer",
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

    def get_customer(self, obj):
        user = obj.order.user
        return {
            "id": str(user.id),
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
        }

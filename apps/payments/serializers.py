from rest_framework import serializers

from apps.payments.models import Payment


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

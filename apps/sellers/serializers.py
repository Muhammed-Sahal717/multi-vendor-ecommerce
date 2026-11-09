from rest_framework import serializers

from apps.accounts.models import User
from .models import SellerApplication


class SellerApplicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = SellerApplication
        fields = [
            "id",
            "business_name",
            "business_type",
            "business_email",
            "business_phone",
            "business_address",
            "city",
            "state",
            "postal_code",
            "country",
            "website",
            "description",
            "status",
            "submitted_at",
        ]

        read_only_fields = [
            "id",
            "status",
            "submitted_at",
        ]

    def validate(self, attrs):
        user = self.context["request"].user

        if user.role != User.Role.CUSTOMER:
            raise serializers.ValidationError(
                "Only customers can apply to become sellers."
            )

        if SellerApplication.objects.filter(
            user=user,
            status=SellerApplication.Status.PENDING,
        ).exists():
            raise serializers.ValidationError(
                "You already have a pending seller application."
            )

        return attrs

    def create(self, validated_data):
        return SellerApplication.objects.create(
            user=self.context["request"].user,
            **validated_data,
        )

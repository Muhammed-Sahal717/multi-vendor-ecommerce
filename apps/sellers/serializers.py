from rest_framework import serializers

from apps.accounts.models import User
from .models import SellerApplication, SellerProfile
from django.db import IntegrityError, transaction


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
        user = self.context["request"].user

        try:
            with transaction.atomic():
                return SellerApplication.objects.create(
                    user=user,
                    **validated_data,
                )

        except IntegrityError:
            if SellerApplication.objects.filter(
                user=user,
                status=SellerApplication.Status.PENDING,
            ).exists():
                raise serializers.ValidationError(
                    "You already have a pending seller application."
                )

            raise


class AdminSellerApplicationSerializer(serializers.ModelSerializer):
    applicant_email = serializers.EmailField(
        source="user.email",
        read_only=True,
    )

    applicant_name = serializers.CharField(
        source="user.get_full_name",
        read_only=True,
    )

    class Meta:
        model = SellerApplication
        fields = [
            "id",
            "applicant_email",
            "applicant_name",
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
            "reviewed_by",
            "review_notes",
            "submitted_at",
            "reviewed_at",
        ]

        read_only_fields = fields


class SellerApplicationReviewSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=[
            SellerApplication.Status.APPROVED,
            SellerApplication.Status.REJECTED,
        ]
    )

    review_notes = serializers.CharField(
        required=False,
        allow_blank=True,
    )


class SellerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = SellerProfile
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
            "approved_at",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "status",
            "approved_at",
            "created_at",
            "updated_at",
        ]

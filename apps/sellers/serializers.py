from rest_framework import serializers

from apps.accounts.models import User
from .models import SellerApplication, SellerProfile
from django.db import IntegrityError, transaction
from apps.audit.constants import AuditAction, AuditEntity
from apps.audit.services import record_audit_event


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
        request = self.context["request"]
        user = request.user

        try:
            with transaction.atomic():
                application = SellerApplication.objects.create(
                    user=user,
                    **validated_data,
                )

                record_audit_event(
                    actor=user,
                    action=AuditAction.SELLER_APPLICATION_SUBMITTED,
                    entity_type=AuditEntity.SELLER_APPLICATION,
                    entity_id=application.id,
                    ip_address=request.META.get("REMOTE_ADDR"),
                    user_agent=request.META.get("HTTP_USER_AGENT", ""),
                )

                return application

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


class AdminSellerProfileSerializer(serializers.ModelSerializer):
    user_id = serializers.UUIDField(source="user.id", read_only=True)
    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_first_name = serializers.CharField(
        source="user.first_name",
        read_only=True,
    )
    user_last_name = serializers.CharField(
        source="user.last_name",
        read_only=True,
    )

    class Meta:
        model = SellerProfile
        fields = [
            "id",
            "user_id",
            "user_email",
            "user_first_name",
            "user_last_name",
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
        read_only_fields = fields


class AdminSellerStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=[
            SellerProfile.Status.ACTIVE,
            SellerProfile.Status.SUSPENDED,
        ]
    )
    reason = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
    )

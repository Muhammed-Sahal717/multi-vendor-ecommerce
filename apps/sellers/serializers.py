from decimal import Decimal
from rest_framework import serializers

from apps.accounts.models import User
from .models import SellerApplication, SellerEarning, SellerPayout, SellerProfile
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


class SellerEarningsSummarySerializer(serializers.Serializer):
    total_gross_earnings = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_commission_deducted = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_net_earnings = serializers.DecimalField(max_digits=12, decimal_places=2)
    already_paid = serializers.DecimalField(max_digits=12, decimal_places=2)
    pending_payout_balance = serializers.DecimalField(max_digits=12, decimal_places=2)


class SellerEarningSerializer(serializers.ModelSerializer):
    order_id = serializers.UUIDField(source="order_item.order.id", read_only=True)
    order_number = serializers.CharField(source="order_item.order.order_number", read_only=True)
    order_item_id = serializers.UUIDField(source="order_item.id", read_only=True)
    product_name = serializers.CharField(source="order_item.product_name", read_only=True)
    product_sku = serializers.CharField(source="order_item.product_sku", read_only=True)
    quantity = serializers.IntegerField(source="order_item.quantity", read_only=True)

    class Meta:
        model = SellerEarning
        fields = [
            "id",
            "order_id",
            "order_number",
            "order_item_id",
            "product_name",
            "product_sku",
            "quantity",
            "gross_amount",
            "commission_rate",
            "commission_amount",
            "net_amount",
            "created_at",
        ]
        read_only_fields = fields


class SellerPayoutSerializer(serializers.ModelSerializer):
    class Meta:
        model = SellerPayout
        fields = [
            "id",
            "amount",
            "payout_date",
            "transaction_reference",
            "notes",
            "created_at",
        ]
        read_only_fields = fields


class AdminSellerPayoutSerializer(serializers.ModelSerializer):
    seller_id = serializers.UUIDField(source="seller.id", read_only=True)
    seller_name = serializers.CharField(source="seller.business_name", read_only=True)
    created_by_email = serializers.EmailField(source="created_by.email", read_only=True)

    class Meta:
        model = SellerPayout
        fields = [
            "id",
            "seller_id",
            "seller_name",
            "amount",
            "payout_date",
            "transaction_reference",
            "notes",
            "created_by_email",
            "created_at",
        ]
        read_only_fields = fields


class AdminSellerPayoutCreateSerializer(serializers.Serializer):
    amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=Decimal("0.01"),
    )
    payout_date = serializers.DateField()
    transaction_reference = serializers.CharField(max_length=100)
    notes = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
    )


class AdminSellerEarningsOverviewSerializer(serializers.ModelSerializer):
    seller_id = serializers.UUIDField(source="id", read_only=True)
    total_gross_earnings = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    total_commission_deducted = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    total_net_earnings = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    already_paid = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    pending_payout_balance = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = SellerProfile
        fields = [
            "seller_id",
            "business_name",
            "business_email",
            "status",
            "total_gross_earnings",
            "total_commission_deducted",
            "total_net_earnings",
            "already_paid",
            "pending_payout_balance",
        ]
        read_only_fields = fields

from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.audit.constants import AuditAction, AuditEntity
from apps.audit.services import record_audit_event
from apps.common.permissions import IsActiveSeller, IsPlatformAdmin
from .models import SellerApplication, SellerProfile
from .pagination import SellerPagination
from .serializers import (
    AdminSellerApplicationSerializer,
    AdminSellerProfileSerializer,
    AdminSellerStatusUpdateSerializer,
    SellerApplicationReviewSerializer,
    SellerApplicationSerializer,
    SellerProfileSerializer,
)


class SellerApplicationCreateView(generics.CreateAPIView):
    serializer_class = SellerApplicationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return SellerApplication.objects.filter(user=self.request.user)


class AdminSellerApplicationListView(generics.ListAPIView):
    serializer_class = AdminSellerApplicationSerializer
    permission_classes = [IsPlatformAdmin]

    queryset = SellerApplication.objects.select_related(
        "user",
        "reviewed_by",
    ).all()


class AdminSellerApplicationReviewView(APIView):
    permission_classes = [IsPlatformAdmin]

    def patch(self, request, pk):
        serializer = SellerApplicationReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            try:
                application = (
                    SellerApplication.objects.select_for_update()
                    .select_related("user")
                    .get(pk=pk)
                )
            except SellerApplication.DoesNotExist:
                return Response(
                    {"detail": "Application not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if application.status != SellerApplication.Status.PENDING:
                raise ValidationError("This application has already been reviewed.")

            decision = serializer.validated_data["status"]
            review_notes = serializer.validated_data.get("review_notes", "")

            if decision == SellerApplication.Status.APPROVED:
                user = User.objects.select_for_update().get(pk=application.user_id)

                if user.role != User.Role.CUSTOMER:
                    raise ValidationError(
                        "Only customer accounts can be approved as sellers."
                    )

                if SellerProfile.objects.filter(user=user).exists():
                    raise ValidationError("This user already has a seller profile.")

                SellerProfile.objects.create(
                    user=user,
                    business_name=application.business_name,
                    business_type=application.business_type,
                    business_email=application.business_email,
                    business_phone=application.business_phone,
                    business_address=application.business_address,
                    city=application.city,
                    state=application.state,
                    postal_code=application.postal_code,
                    country=application.country,
                    website=application.website,
                    description=application.description,
                    status=SellerProfile.Status.ACTIVE,
                    approved_at=timezone.now(),
                )

                user.role = User.Role.SELLER
                user.save(update_fields=["role"])

            application.status = decision
            application.review_notes = review_notes
            application.reviewed_by = request.user
            application.reviewed_at = timezone.now()

            application.save(
                update_fields=[
                    "status",
                    "review_notes",
                    "reviewed_by",
                    "reviewed_at",
                    "updated_at",
                ]
            )
            record_audit_event(
                actor=request.user,
                action=(
                    AuditAction.SELLER_APPLICATION_APPROVED
                    if decision == SellerApplication.Status.APPROVED
                    else AuditAction.SELLER_APPLICATION_REJECTED
                ),
                entity_type=AuditEntity.SELLER_APPLICATION,
                entity_id=application.id,
                ip_address=request.META.get("REMOTE_ADDR"),
                user_agent=request.META.get("HTTP_USER_AGENT", ""),
            )

        return Response(
            AdminSellerApplicationSerializer(application).data,
            status=status.HTTP_200_OK,
        )


class SellerProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = SellerProfileSerializer
    permission_classes = [IsActiveSeller]
    http_method_names = ["get", "patch", "head", "options"]

    def get_object(self):
        return SellerProfile.objects.get(user=self.request.user)


class AdminSellerListView(generics.ListAPIView):
    serializer_class = AdminSellerProfileSerializer
    permission_classes = [IsPlatformAdmin]
    pagination_class = SellerPagination
    filter_backends = [
        DjangoFilterBackend,
        SearchFilter,
        OrderingFilter,
    ]
    filterset_fields = ["status", "city", "state"]
    search_fields = [
        "business_name",
        "business_email",
        "business_phone",
        "user__email",
        "user__first_name",
        "user__last_name",
    ]
    ordering_fields = ["created_at", "business_name", "approved_at"]
    ordering = ["-created_at"]
    queryset = SellerProfile.objects.select_related("user").all()


class AdminSellerDetailView(generics.RetrieveAPIView):
    serializer_class = AdminSellerProfileSerializer
    permission_classes = [IsPlatformAdmin]
    queryset = SellerProfile.objects.select_related("user").all()


class AdminSellerStatusUpdateView(APIView):
    permission_classes = [IsPlatformAdmin]

    def patch(self, request, pk):
        serializer = AdminSellerStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data["status"]
        reason = serializer.validated_data.get("reason", "")

        with transaction.atomic():
            try:
                seller = SellerProfile.objects.select_for_update().select_related("user").get(pk=pk)
            except SellerProfile.DoesNotExist:
                return Response(
                    {"detail": "Seller profile not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            old_status = seller.status

            if old_status == new_status:
                raise ValidationError({"status": f"Seller is already {new_status}."})

            if (
                old_status == SellerProfile.Status.INACTIVE
                or new_status == SellerProfile.Status.INACTIVE
            ):
                raise ValidationError(
                    {"status": "Transitions involving inactive status are not supported."}
                )

            valid_transition = (
                (old_status == SellerProfile.Status.ACTIVE and new_status == SellerProfile.Status.SUSPENDED)
                or (old_status == SellerProfile.Status.SUSPENDED and new_status == SellerProfile.Status.ACTIVE)
            )

            if not valid_transition:
                raise ValidationError(
                    {"status": f"Cannot transition seller status from '{old_status}' to '{new_status}'."}
                )

            seller.status = new_status
            seller.save(update_fields=["status", "updated_at"])

            record_audit_event(
                actor=request.user,
                action=(
                    AuditAction.SELLER_SUSPENDED
                    if new_status == SellerProfile.Status.SUSPENDED
                    else AuditAction.SELLER_REACTIVATED
                ),
                entity_type=AuditEntity.SELLER,
                entity_id=seller.id,
                metadata={
                    "old_status": old_status,
                    "new_status": new_status,
                    "reason": reason,
                },
                ip_address=request.META.get("REMOTE_ADDR"),
                user_agent=request.META.get("HTTP_USER_AGENT", ""),
            )

        return Response(
            AdminSellerProfileSerializer(seller).data,
            status=status.HTTP_200_OK,
        )

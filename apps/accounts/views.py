from django.db import transaction
from django.utils.dateparse import parse_date
from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.pagination import CustomerPagination
from apps.audit.constants import AuditAction, AuditEntity
from apps.audit.services import record_audit_event
from apps.common.permissions import IsPlatformAdmin

from .models import User, CustomerProfile, Address
from .serializers import (
    AddressSerializer,
    AdminCustomerDetailSerializer,
    AdminCustomerListSerializer,
    AdminCustomerStatusUpdateSerializer,
    CustomerProfileSerializer,
    ProfileImageSerializer,
    RegisterSerializer,
)


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        return Response(
            {
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": user.role,
            }
        )


class CustomerProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = CustomerProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        profile, created = CustomerProfile.objects.get_or_create(user=self.request.user)
        return profile


class ProfileImageView(generics.UpdateAPIView):
    serializer_class = ProfileImageSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["patch", "options"]

    def get_object(self):
        profile, created = CustomerProfile.objects.get_or_create(user=self.request.user)
        return profile


class AddressListCreateView(generics.ListCreateAPIView):
    serializer_class = AddressSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save()


class AddressDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AddressSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user)

    def perform_destroy(self, instance):
        with transaction.atomic():
            address = Address.objects.select_for_update().get(
                pk=instance.pk,
                user=self.request.user,
            )

            was_default = address.is_default
            address.delete()

            if was_default:
                next_address = (
                    Address.objects.filter(user=self.request.user)
                    .order_by("-created_at", "-id")
                    .first()
                )

                if next_address:
                    next_address.is_default = True
                    next_address.save(update_fields=["is_default"])


class AdminCustomerListView(generics.ListAPIView):
    serializer_class = AdminCustomerListSerializer
    permission_classes = [IsPlatformAdmin]
    pagination_class = CustomerPagination
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = [
        "email",
        "first_name",
        "last_name",
        "customer_profile__mobile",
    ]
    ordering_fields = ["date_joined", "first_name", "last_name", "email"]
    ordering = ["-date_joined"]

    def get_queryset(self):
        queryset = (
            User.objects.filter(role=User.Role.CUSTOMER)
            .select_related("customer_profile")
            .distinct()
        )

        status_param = self.request.query_params.get("status")
        if status_param is not None:
            status_param_lower = status_param.strip().lower()
            if status_param_lower == "active":
                queryset = queryset.filter(is_active=True)
            elif status_param_lower == "inactive":
                queryset = queryset.filter(is_active=False)
            else:
                raise ValidationError(
                    {"status": "Enter a valid account status ('active' or 'inactive')."}
                )

        is_active_param = self.request.query_params.get("is_active")
        if is_active_param is not None:
            is_active_lower = is_active_param.strip().lower()
            if is_active_lower in ("true", "1"):
                queryset = queryset.filter(is_active=True)
            elif is_active_lower in ("false", "0"):
                queryset = queryset.filter(is_active=False)
            else:
                raise ValidationError(
                    {"is_active": "Enter a valid boolean value ('true' or 'false')."}
                )

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
            queryset = queryset.filter(date_joined__date__gte=parsed_date_from)

        if parsed_date_to:
            queryset = queryset.filter(date_joined__date__lte=parsed_date_to)

        return queryset


class AdminCustomerDetailView(generics.RetrieveAPIView):
    serializer_class = AdminCustomerDetailSerializer
    permission_classes = [IsPlatformAdmin]
    lookup_field = "pk"

    def get_queryset(self):
        return (
            User.objects.filter(role=User.Role.CUSTOMER)
            .select_related("customer_profile")
            .prefetch_related("addresses")
        )


class AdminCustomerStatusUpdateView(APIView):
    permission_classes = [IsPlatformAdmin]

    def patch(self, request, pk):
        serializer = AdminCustomerStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_is_active = serializer.validated_data["is_active"]

        with transaction.atomic():
            try:
                customer = User.objects.select_for_update().get(pk=pk)
            except User.DoesNotExist:
                return Response(
                    {"detail": "Customer not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Prevent modification of non-customer accounts (Admin, Superadmin, Seller)
            if customer.role != User.Role.CUSTOMER:
                raise ValidationError(
                    {"detail": "Only customer accounts can be managed through this endpoint."}
                )

            old_is_active = customer.is_active

            # Reject redundant transitions
            if old_is_active == new_is_active:
                status_str = "active" if new_is_active else "inactive"
                raise ValidationError(
                    {"is_active": f"Customer account is already {status_str}."}
                )

            customer.is_active = new_is_active
            customer.save(update_fields=["is_active"])

            record_audit_event(
                actor=request.user,
                action=(
                    AuditAction.USER_ACTIVATED
                    if new_is_active
                    else AuditAction.USER_DEACTIVATED
                ),
                entity_type=AuditEntity.USER,
                entity_id=customer.id,
                metadata={
                    "customer_id": str(customer.id),
                    "customer_email": customer.email,
                    "old_is_active": old_is_active,
                    "new_is_active": new_is_active,
                },
                ip_address=request.META.get("REMOTE_ADDR"),
                user_agent=request.META.get("HTTP_USER_AGENT", ""),
            )

        return Response(
            AdminCustomerDetailSerializer(customer).data,
            status=status.HTTP_200_OK,
        )

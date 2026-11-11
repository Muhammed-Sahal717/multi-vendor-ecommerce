from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from .models import SellerApplication
from .serializers import SellerApplicationSerializer
from django.db import transaction
from django.utils import timezone

from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User

from .models import SellerApplication, SellerProfile
from .permissions import IsPlatformAdmin
from .serializers import (
    AdminSellerApplicationSerializer,
    SellerApplicationReviewSerializer,
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

        return Response(
            AdminSellerApplicationSerializer(application).data,
            status=status.HTTP_200_OK,
        )

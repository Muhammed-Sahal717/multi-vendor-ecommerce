from rest_framework import generics
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import User, CustomerProfile, Address
from .serializers import (
    RegisterSerializer,
    CustomerProfileSerializer,
    ProfileImageSerializer,
    AddressSerializer,
)
from django.db import transaction


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

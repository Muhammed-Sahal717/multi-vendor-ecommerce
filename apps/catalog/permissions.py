from rest_framework.permissions import BasePermission

from apps.accounts.models import User
from apps.sellers.models import SellerProfile


class IsPlatformAdmin(BasePermission):
    message = "Only platform administrators can manage categories."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role
            in [
                User.Role.ADMIN,
                User.Role.SUPERADMIN,
            ]
        )


class IsActiveSeller(BasePermission):
    message = "An active approved seller account is required."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if request.user.role != User.Role.SELLER:
            return False

        return SellerProfile.objects.filter(
            user=request.user,
            status=SellerProfile.Status.ACTIVE,
        ).exists()


class IsProductOwnerOrAdmin(BasePermission):
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False

        if request.user.role in [
            User.Role.ADMIN,
            User.Role.SUPERADMIN,
        ]:
            return True

        return (
            request.user.role == User.Role.SELLER
            and obj.seller.user_id == request.user.id
        )

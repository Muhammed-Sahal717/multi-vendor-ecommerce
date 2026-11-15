from rest_framework.permissions import BasePermission

from apps.accounts.models import User


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

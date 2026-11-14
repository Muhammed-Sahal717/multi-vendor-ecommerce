from rest_framework.permissions import BasePermission

from apps.accounts.models import User


class IsSuperAdmin(BasePermission):
    message = "Only super administrators can access audit records."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == User.Role.SUPERADMIN
        )

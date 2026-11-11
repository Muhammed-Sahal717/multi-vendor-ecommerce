from rest_framework.permissions import BasePermission

from apps.accounts.models import User


class IsPlatformAdmin(BasePermission):
    message = "Only platform administrators can access this endpoint."

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
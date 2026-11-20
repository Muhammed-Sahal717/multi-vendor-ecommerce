from django.contrib.admin import AdminSite

from apps.accounts.models import User


class SuperAdminSite(AdminSite):
    site_header = "Galla Superadmin"
    site_title = "Galla Administration"
    index_title = "Platform Management"

    def has_permission(self, request):
        user = request.user

        return (
            user.is_authenticated
            and user.is_active
            and user.is_staff
            and user.is_superuser
            and user.role == User.Role.SUPERADMIN
        )


admin_site = SuperAdminSite(name="superadmin")

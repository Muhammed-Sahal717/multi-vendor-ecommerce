from django.contrib.admin.apps import AdminConfig


class GallaAdminConfig(AdminConfig):
    default_site = "apps.common.admin_site.SuperAdminSite"

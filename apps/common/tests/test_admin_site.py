from django.contrib.admin.sites import AdminSite
from django.test import RequestFactory, TestCase

from apps.accounts.models import User
from apps.common.admin_site import SuperAdminSite


class SuperAdminSiteTests(TestCase):
    def setUp(self):
        self.site = SuperAdminSite()
        self.factory = RequestFactory()

    def check_permission(self, user):
        request = self.factory.get("/admin/")
        request.user = user
        return self.site.has_permission(request)

    def test_superadmin_can_access(self):
        user = User.objects.create_superuser(
            email="superadmin@example.com",
            password="TestPassword123!",
        )
        self.assertTrue(self.check_permission(user))

    def test_regular_admin_cannot_access(self):
        user = User.objects.create_user(
            email="admin@example.com",
            password="TestPassword123!",
            role=User.Role.ADMIN,
            is_staff=True,
        )
        self.assertFalse(self.check_permission(user))

    def test_customer_cannot_access(self):
        user = User.objects.create_user(
            email="customer@example.com",
            password="TestPassword123!",
            role=User.Role.CUSTOMER,
            is_staff=True,
        )
        self.assertFalse(self.check_permission(user))

    def test_inactive_superadmin_cannot_access(self):
        user = User.objects.create_superuser(
            email="inactive@example.com",
            password="TestPassword123!",
        )
        user.is_active = False
        user.save(update_fields=["is_active"])

        self.assertFalse(self.check_permission(user))

    def test_superadmin_without_superuser_flag_cannot_access(self):
        user = User.objects.create_user(
            email="notroot@example.com",
            password="TestPassword123!",
            role=User.Role.SUPERADMIN,
            is_staff=True,
        )
        self.assertFalse(self.check_permission(user))

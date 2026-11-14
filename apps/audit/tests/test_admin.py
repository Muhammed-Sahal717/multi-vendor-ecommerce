from django.contrib.admin.sites import AdminSite
from django.test import TestCase, RequestFactory

from apps.accounts.models import User
from apps.audit.admin import AuditEventAdmin
from apps.audit.models import AuditEvent


class AuditEventAdminTests(TestCase):
    def setUp(self):
        self.site = AdminSite()
        self.admin = AuditEventAdmin(AuditEvent, self.site)
        self.factory = RequestFactory()

        self.superadmin = User.objects.create_superuser(
            email="superadmin@example.com",
            password="TestPassword123!",
        )

        self.request = self.factory.get("/admin/audit/auditevent/")
        self.request.user = self.superadmin

    def test_admin_cannot_add_audit_events(self):
        self.assertFalse(self.admin.has_add_permission(self.request))

    def test_admin_cannot_change_audit_events(self):
        self.assertFalse(self.admin.has_change_permission(self.request))

    def test_admin_cannot_delete_audit_events(self):
        self.assertFalse(self.admin.has_delete_permission(self.request))

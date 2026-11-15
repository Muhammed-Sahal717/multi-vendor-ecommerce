from django.db import DatabaseError, transaction
from django.test import TestCase

from apps.accounts.models import User
from apps.audit.models import AuditEvent


class AuditEventDatabaseImmutabilityTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="audit-test@example.com",
            password="TestPassword123!",
        )

        self.event = AuditEvent.objects.create(
            actor=self.user,
            action="USER_REGISTERED",
            entity_type="user",
            entity_id=self.user.id,
        )

    def test_bulk_update_is_blocked(self):
        with self.assertRaises(DatabaseError):
            with transaction.atomic():
                AuditEvent.objects.filter(pk=self.event.pk).update(
                    action="PROFILE_UPDATED"
                )

    def test_bulk_delete_is_blocked(self):
        with self.assertRaises(DatabaseError):
            with transaction.atomic():
                AuditEvent.objects.filter(pk=self.event.pk).delete()

        self.assertTrue(AuditEvent.objects.filter(pk=self.event.pk).exists())

    def test_user_deletion_preserves_audit_event(self):
        event_id = self.event.pk

        self.user.delete()

        event = AuditEvent.objects.get(pk=event_id)

        self.assertIsNone(event.actor)
        self.assertEqual(event.action, "USER_REGISTERED")

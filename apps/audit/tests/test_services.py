from django.test import TestCase

from apps.audit.models import AuditEvent
from apps.audit.services import record_audit_event
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.exceptions import ValidationError
from apps.audit.models import AuditEvent


class RecordAuditEventTests(TestCase):
    def test_creates_audit_event(self):
        event = record_audit_event(
            action="USER_REGISTERED",
            entity_type="user",
            entity_id="00000000-0000-0000-0000-000000000001",
            metadata={"source": "registration"},
        )

        self.assertIsInstance(event, AuditEvent)
        self.assertEqual(event.action, "USER_REGISTERED")
        self.assertEqual(event.entity_type, "user")
        self.assertEqual(event.metadata, {"source": "registration"})
        self.assertIsNone(event.actor)

    def test_associates_event_with_actor(self):

        User = get_user_model()
        user = User.objects.create_user(
            email="audit@example.com",
            password="TestPassword123!",
        )

        event = record_audit_event(
            action="USER_REGISTERED",
            entity_type="user",
            entity_id=user.id,
            actor=user,
        )

        self.assertEqual(event.actor, user)
        self.assertEqual(event.actor_id, user.id)

    def test_creates_event_without_actor(self):
        event = record_audit_event(
            action="PAYMENT_SUCCEEDED",
            entity_type="payment",
            entity_id="00000000-0000-0000-0000-000000000002",
        )

        self.assertIsNone(event.actor)

    def test_stores_request_metadata(self):
        event = record_audit_event(
            action="PROFILE_UPDATED",
            entity_type="user",
            entity_id="00000000-0000-0000-0000-000000000003",
            ip_address="192.168.1.10",
            user_agent="Mozilla/5.0",
        )

        self.assertEqual(event.ip_address, "192.168.1.10")
        self.assertEqual(event.user_agent, "Mozilla/5.0")

    def test_rejects_invalid_action(self):
        with self.assertRaises(ValidationError):
            record_audit_event(
                action="INVALID_ACTION",
                entity_type="user",
                entity_id="00000000-0000-0000-0000-000000000004",
            )

    def test_rejects_invalid_entity_type(self):
        with self.assertRaises(ValidationError):
            record_audit_event(
                action="USER_REGISTERED",
                entity_type="invalid_entity",
                entity_id="00000000-0000-0000-0000-000000000005",
            )

    def test_metadata_defaults_to_empty_dict(self):
        event = record_audit_event(
            action="USER_REGISTERED",
            entity_type="user",
            entity_id="00000000-0000-0000-0000-000000000006",
        )

        self.assertEqual(event.metadata, {})

    def test_existing_event_cannot_be_updated(self):
        event = record_audit_event(
            action="USER_REGISTERED",
            entity_type="user",
            entity_id="00000000-0000-0000-0000-000000000007",
        )

        event.action = "PROFILE_UPDATED"

        with self.assertRaises(ValidationError):
            event.save()

    def test_existing_event_cannot_be_deleted(self):
        event = record_audit_event(
            action="USER_REGISTERED",
            entity_type="user",
            entity_id="00000000-0000-0000-0000-000000000008",
        )

        with self.assertRaises(ValidationError):
            event.delete()

        self.assertTrue(AuditEvent.objects.filter(pk=event.pk).exists())

    def test_rejects_non_dictionary_metadata(self):
        with self.assertRaises(ValidationError):
            record_audit_event(
                action="USER_REGISTERED",
                entity_type="user",
                entity_id="00000000-0000-0000-0000-000000000009",
                metadata=["invalid", "metadata"],
            )

    def test_rejects_sensitive_metadata_keys(self):
        with self.assertRaises(ValidationError):
            record_audit_event(
                action="USER_REGISTERED",
                entity_type="user",
                entity_id="00000000-0000-0000-0000-000000000010",
                metadata={"password": "secret123"},
            )

    def test_rejects_nested_sensitive_metadata(self):
        with self.assertRaises(ValidationError):
            record_audit_event(
                action="USER_REGISTERED",
                entity_type="user",
                entity_id="00000000-0000-0000-0000-000000000011",
                metadata={
                    "user": {
                        "password": "secret123",
                    }
                },
            )

    def test_rejects_sensitive_metadata_inside_list(self):
        with self.assertRaises(ValidationError):
            record_audit_event(
                action="USER_REGISTERED",
                entity_type="user",
                entity_id="00000000-0000-0000-0000-000000000012",
                metadata={"users": [{"password": "secret123"}]},
            )

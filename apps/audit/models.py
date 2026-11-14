import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from apps.audit.constants import AUDIT_ACTIONS, AUDIT_ENTITY_TYPES


class AuditEvent(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_events",
    )

    action = models.CharField(
        max_length=100,
        choices=AUDIT_ACTIONS,
    )

    entity_type = models.CharField(
        max_length=50,
        choices=AUDIT_ENTITY_TYPES,
    )
    entity_id = models.UUIDField()

    metadata = models.JSONField(default=dict, blank=True)

    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["actor", "-created_at"]),
            models.Index(fields=["action", "-created_at"]),
            models.Index(fields=["entity_type", "entity_id"]),
        ]
        constraints = [
            models.CheckConstraint(
                condition=~models.Q(entity_type=""),
                name="audit_entity_type_not_empty",
            ),
            models.CheckConstraint(
                condition=~models.Q(action=""),
                name="audit_action_not_empty",
            ),
        ]

    def __str__(self):
        return f"{self.action} - {self.entity_type}:{self.entity_id}"

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise ValidationError("Audit events cannot be modified.")
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Audit events cannot be deleted.")

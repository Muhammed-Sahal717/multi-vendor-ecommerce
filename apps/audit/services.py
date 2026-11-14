from django.core.exceptions import ValidationError

from apps.audit.constants import AuditAction, AuditEntity
from apps.audit.models import AuditEvent


def record_audit_event(
    *,
    action,
    entity_type,
    entity_id,
    actor=None,
    metadata=None,
    ip_address=None,
    user_agent="",
):
    valid_actions = {
        value
        for name, value in vars(AuditAction).items()
        if name.isupper() and not name.startswith("_")
    }

    valid_entity_types = {
        value
        for name, value in vars(AuditEntity).items()
        if name.isupper() and not name.startswith("_")
    }

    if action not in valid_actions:
        raise ValidationError(f"Unsupported audit action: {action}")

    if entity_type not in valid_entity_types:
        raise ValidationError(f"Unsupported audit entity type: {entity_type}")

    if metadata is not None and not isinstance(metadata, dict):
        raise ValidationError("Audit metadata must be a dictionary.")

    sensitive_keys = {
        "password",
        "password_hash",
        "access_token",
        "refresh_token",
        "authorization",
        "secret",
        "api_key",
        "card_number",
        "cvv",
    }

    def validate_metadata(data):
        if isinstance(data, dict):
            for key, value in data.items():
                if not isinstance(key, str):
                    raise ValidationError("Metadata keys must be strings.")
                if key.lower() in sensitive_keys:
                    raise ValidationError(
                        f"Sensitive metadata field is not allowed: {key}"
                    )
                validate_metadata(value)

        elif isinstance(data, list):
            for item in data:
                validate_metadata(item)

    if metadata:
        validate_metadata(metadata)

    return AuditEvent.objects.create(
        actor=actor,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        metadata=metadata or {},
        ip_address=ip_address,
        user_agent=user_agent,
    )

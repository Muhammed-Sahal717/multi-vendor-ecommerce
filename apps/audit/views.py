import uuid

from rest_framework.generics import ListAPIView

from apps.audit.models import AuditEvent
from apps.audit.permissions import IsSuperAdmin
from apps.audit.serializers import AuditEventSerializer
from django.utils.dateparse import parse_date
from rest_framework.exceptions import ValidationError
from apps.audit.pagination import AuditEventPagination
from apps.audit.constants import AUDIT_ACTIONS, AUDIT_ENTITY_TYPES


class AuditEventListView(ListAPIView):
    serializer_class = AuditEventSerializer
    permission_classes = [IsSuperAdmin]
    pagination_class = AuditEventPagination

    queryset = AuditEvent.objects.select_related("actor").all()

    def get_queryset(self):
        queryset = super().get_queryset()

        action = self.request.query_params.get("action")
        entity_type = self.request.query_params.get("entity_type")
        if action and action not in dict(AUDIT_ACTIONS):
            raise ValidationError({"action": "Enter a valid audit action."})

        if entity_type and entity_type not in dict(AUDIT_ENTITY_TYPES):
            raise ValidationError({"entity_type": "Enter a valid audit entity type."})

        actor_id = self.request.query_params.get("actor")
        entity_id = self.request.query_params.get("entity_id")

        if actor_id:
            try:
                uuid.UUID(actor_id)
            except ValueError:
                raise ValidationError({"actor": "Enter a valid user UUID."})

        if entity_id:
            try:
                uuid.UUID(entity_id)
            except ValueError:
                raise ValidationError({"entity_id": "Enter a valid entity UUID."})

        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")

        if action:
            queryset = queryset.filter(action=action)

        if entity_type:
            queryset = queryset.filter(entity_type=entity_type)

        if actor_id:
            queryset = queryset.filter(actor_id=actor_id)

        if entity_id:
            queryset = queryset.filter(entity_id=entity_id)

        if date_from:
            parsed_date_from = parse_date(date_from)

            if not parsed_date_from:
                raise ValidationError(
                    {"date_from": "Enter a valid date in YYYY-MM-DD format."}
                )

            queryset = queryset.filter(created_at__date__gte=parsed_date_from)

        if date_to:
            parsed_date_to = parse_date(date_to)

            if not parsed_date_to:
                raise ValidationError(
                    {"date_to": "Enter a valid date in YYYY-MM-DD format."}
                )

            queryset = queryset.filter(created_at__date__lte=parsed_date_to)

        if date_from and date_to and parsed_date_from > parsed_date_to:
            raise ValidationError(
                {"date_to": "Must be greater than or equal to date_from."}
            )
        return queryset

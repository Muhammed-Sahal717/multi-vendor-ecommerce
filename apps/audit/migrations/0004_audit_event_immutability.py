from django.db import migrations


FORWARD_SQL = """
CREATE OR REPLACE FUNCTION prevent_audit_event_mutation()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE'
       AND OLD.actor_id IS NOT NULL
       AND NEW.actor_id IS NULL
       AND (to_jsonb(NEW) - 'actor_id') = (to_jsonb(OLD) - 'actor_id')
    THEN
        RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Audit events cannot be modified or deleted.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_event_immutability_trigger
BEFORE UPDATE OR DELETE ON audit_auditevent
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_event_mutation();
"""


REVERSE_SQL = """
DROP TRIGGER IF EXISTS audit_event_immutability_trigger
ON audit_auditevent;

DROP FUNCTION IF EXISTS prevent_audit_event_mutation();
"""


class Migration(migrations.Migration):
    dependencies = [
        ("audit", "0003_alter_auditevent_entity_type"),
    ]

    operations = [
        migrations.RunSQL(
            sql=FORWARD_SQL,
            reverse_sql=REVERSE_SQL,
        ),
    ]

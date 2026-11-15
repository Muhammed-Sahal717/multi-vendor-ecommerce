from django.db import transaction
from django.utils import timezone

from rest_framework.exceptions import NotFound, ValidationError

from apps.payments.models import Payment, PaymentAttempt
from apps.audit.constants import AuditAction, AuditEntity
from apps.audit.services import record_audit_event


@transaction.atomic
def process_mock_payment(
    *,
    payment_id,
    customer_user,
    outcome,
    failure_reason="",
    ip_address=None,
    user_agent="",
):
    # 1. Lock the payment and verify customer ownership.
    try:
        payment = Payment.objects.select_for_update().get(
            id=payment_id,
            order__user=customer_user,
        )
    except Payment.DoesNotExist:
        raise NotFound("Payment not found.")

    # 2. Only pending mock online payments can be processed.
    if (
        payment.method != Payment.Method.RAZORPAY
        or payment.provider != Payment.Provider.MOCK
    ):
        raise ValidationError("This payment cannot use the mock gateway.")

    if payment.status != Payment.Status.PENDING:
        raise ValidationError("This payment has already been completed.")

    # 3. Validate the simulated outcome.
    if outcome not in (
        PaymentAttempt.Status.SUCCESSFUL,
        PaymentAttempt.Status.FAILED,
    ):
        raise ValidationError({"outcome": "Choose either successful or failed."})

    # 4. Calculate the next attempt number.
    attempt_number = PaymentAttempt.objects.filter(payment=payment).count() + 1

    # 5. Create the payment attempt.
    attempt = PaymentAttempt.objects.create(
        payment=payment,
        attempt_number=attempt_number,
        status=outcome,
        failure_reason=(
            failure_reason.strip() if outcome == PaymentAttempt.Status.FAILED else ""
        ),
    )

    # 6. Update overall payment and record the audit event.
    if outcome == PaymentAttempt.Status.SUCCESSFUL:
        payment.status = Payment.Status.SUCCESSFUL
        payment.paid_at = timezone.now()
        payment.save(update_fields=["status", "paid_at", "updated_at"])

        record_audit_event(
            actor=customer_user,
            action=AuditAction.PAYMENT_SUCCEEDED,
            entity_type=AuditEntity.PAYMENT,
            entity_id=payment.id,
            metadata={
                "order_id": str(payment.order_id),
                "attempt_id": str(attempt.id),
                "amount": str(payment.amount),
            },
            ip_address=ip_address,
            user_agent=user_agent,
        )

    else:
        record_audit_event(
            actor=customer_user,
            action=AuditAction.PAYMENT_FAILED,
            entity_type=AuditEntity.PAYMENT,
            entity_id=payment.id,
            metadata={
                "order_id": str(payment.order_id),
                "attempt_id": str(attempt.id),
                "failure_reason": attempt.failure_reason,
            },
            ip_address=ip_address,
            user_agent=user_agent,
        )
    return attempt

from django.db import transaction
from django.utils import timezone

from rest_framework.exceptions import NotFound, ValidationError

from apps.payments.models import Payment, PaymentAttempt
from apps.orders.models import Order, OrderItem
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


@transaction.atomic
def confirm_cod_payment_collection(
    *,
    payment_id,
    actor,
    ip_address=None,
    user_agent="",
):
    # Lookup payment without lock to obtain order_id.
    try:
        unlocked_payment = Payment.objects.only("id", "order_id").get(id=payment_id)
    except Payment.DoesNotExist:
        raise NotFound("Payment not found.")

    # 1. Lock the parent Order FIRST to preserve strict Order -> Payment locking order.
    try:
        order = Order.objects.select_for_update().get(id=unlocked_payment.order_id)
    except Order.DoesNotExist:
        raise NotFound("Associated order not found.")

    # 2. Lock the Payment SECOND.
    payment = Payment.objects.select_for_update().get(id=payment_id)

    # 3. Only COD payments can use this workflow.
    if (
        payment.method != Payment.Method.COD
        or payment.provider != Payment.Provider.MANUAL
        or order.payment_method != Order.PaymentMethod.COD
    ):
        raise ValidationError("Only Cash on Delivery (COD) payments can use this collection workflow.")

    # 4. Check payment status to prevent duplicate or invalid collections.
    if payment.status == Payment.Status.SUCCESSFUL:
        raise ValidationError("COD payment has already been collected and marked successful.")

    if payment.status != Payment.Status.PENDING:
        raise ValidationError(f"Cannot confirm collection for payment with status '{payment.status}'.")

    # 5. Verify that the order has reached DELIVERED or PARTIALLY_CANCELLED state.
    if order.status not in (Order.Status.DELIVERED, Order.Status.PARTIALLY_CANCELLED):
        raise ValidationError(
            "Cannot confirm COD payment collection for an order that is not delivered or partially cancelled."
        )

    # 6. Verify order items: must have items, at least one DELIVERED, and all non-cancelled items DELIVERED.
    items = order.items.all()
    if not items.exists():
        raise ValidationError("Cannot confirm COD payment collection for an order without items.")

    if not items.filter(status=OrderItem.Status.DELIVERED).exists():
        raise ValidationError("Cannot confirm COD payment collection until order items are delivered.")

    if items.exclude(status__in=[OrderItem.Status.DELIVERED, OrderItem.Status.CANCELLED]).exists():
        raise ValidationError(
            "Cannot confirm COD payment collection until all order items are delivered."
        )

    # 7. Update payment status and paid_at atomically, preserving amount.
    payment.status = Payment.Status.SUCCESSFUL
    payment.paid_at = timezone.now()
    payment.save(update_fields=["status", "paid_at", "updated_at"])

    # 7a. Recognize seller earnings for delivered items now that COD payment is collected.
    from apps.sellers.services import record_order_item_earning

    for item in items.filter(status=OrderItem.Status.DELIVERED):
        record_order_item_earning(
            order_item=item,
            actor=actor,
            ip_address=ip_address,
            user_agent=user_agent,
        )

    # 8. Record PAYMENT_SUCCEEDED audit event.
    record_audit_event(
        actor=actor,
        action=AuditAction.PAYMENT_SUCCEEDED,
        entity_type=AuditEntity.PAYMENT,
        entity_id=payment.id,
        metadata={
            "order_id": str(order.id),
            "order_number": order.order_number,
            "method": payment.method,
            "provider": payment.provider,
            "amount": str(payment.amount),
            "confirmation_type": "admin_cod_collection",
        },
        ip_address=ip_address,
        user_agent=user_agent,
    )

    return payment

from decimal import Decimal, ROUND_HALF_UP

from django.db import IntegrityError, transaction
from django.db.models import F, OuterRef, Subquery, Sum
from django.db.models.functions import Coalesce
from rest_framework.exceptions import NotFound, ValidationError

from apps.audit.constants import AuditAction, AuditEntity
from apps.audit.services import record_audit_event
from apps.orders.models import OrderItem
from apps.payments.models import Payment
from apps.sellers.models import SellerEarning, SellerPayout, SellerProfile

COMMISSION_RATE = Decimal("0.0500")


def record_order_item_earning(
    *,
    order_item,
    actor=None,
    ip_address=None,
    user_agent="",
):
    """
    Atomically recognizes seller earnings for an individual order item.
    Guarantees idempotency and race-safety:
    - OrderItem must have DELIVERED status.
    - Associated Order Payment must have SUCCESSFUL status.
    - Gross amount is order_item.subtotal (excluding delivery charges and taxes).
    - 5% commission is calculated using Decimal and ROUND_HALF_UP.
    - OneToOne uniqueness on OrderItem prevents duplicates.
    - get_or_create ensures duplicate invocations safely return the existing
      record without failing enclosing transactions.
    """
    if order_item.status != OrderItem.Status.DELIVERED:
        return None

    try:
        payment = Payment.objects.get(order_id=order_item.order_id)
    except Payment.DoesNotExist:
        return None

    if payment.status != Payment.Status.SUCCESSFUL:
        return None

    gross_amount = order_item.subtotal
    commission_amount = (gross_amount * COMMISSION_RATE).quantize(
        Decimal("0.01"),
        rounding=ROUND_HALF_UP,
    )
    net_amount = gross_amount - commission_amount

    earning, created = SellerEarning.objects.get_or_create(
        order_item=order_item,
        defaults={
            "seller": order_item.seller,
            "gross_amount": gross_amount,
            "commission_rate": COMMISSION_RATE,
            "commission_amount": commission_amount,
            "net_amount": net_amount,
        },
    )

    if created:
        record_audit_event(
            actor=actor,
            action=AuditAction.SELLER_EARNING_RECORDED,
            entity_type=AuditEntity.SELLER_EARNING,
            entity_id=earning.id,
            metadata={
                "seller_id": str(earning.seller_id),
                "order_item_id": str(order_item.id),
                "order_id": str(order_item.order_id),
                "gross_amount": str(gross_amount),
                "commission_amount": str(commission_amount),
                "net_amount": str(net_amount),
            },
            ip_address=ip_address,
            user_agent=user_agent,
        )

    return earning


def get_seller_balance_summary(seller):
    """
    Computes financial totals for a single seller using database aggregations.
    Returns:
    - total_gross_earnings
    - total_commission_deducted
    - total_net_earnings
    - already_paid
    - pending_payout_balance
    """
    earning_agg = SellerEarning.objects.filter(seller=seller).aggregate(
        gross=Sum("gross_amount", default=Decimal("0.00")),
        commission=Sum("commission_amount", default=Decimal("0.00")),
        net=Sum("net_amount", default=Decimal("0.00")),
    )

    already_paid = SellerPayout.objects.filter(seller=seller).aggregate(
        paid=Sum("amount", default=Decimal("0.00"))
    )["paid"]

    pending_payout = earning_agg["net"] - already_paid

    return {
        "total_gross_earnings": earning_agg["gross"],
        "total_commission_deducted": earning_agg["commission"],
        "total_net_earnings": earning_agg["net"],
        "already_paid": already_paid,
        "pending_payout_balance": pending_payout,
    }


def get_admin_seller_earnings_queryset():
    """
    Returns a SellerProfile queryset annotated with earnings and payout metrics.
    Uses independent subqueries for earnings and payouts to prevent Cartesian product
    multiplication caused by joining multiple one-to-many relationships.
    """
    earnings_base = SellerEarning.objects.filter(seller=OuterRef("pk")).values("seller")
    gross_subquery = earnings_base.annotate(total=Sum("gross_amount")).values("total")
    commission_subquery = earnings_base.annotate(total=Sum("commission_amount")).values("total")
    net_subquery = earnings_base.annotate(total=Sum("net_amount")).values("total")

    payouts_base = SellerPayout.objects.filter(seller=OuterRef("pk")).values("seller")
    paid_subquery = payouts_base.annotate(total=Sum("amount")).values("total")

    return (
        SellerProfile.objects.annotate(
            total_gross_earnings=Coalesce(
                Subquery(gross_subquery),
                Decimal("0.00"),
            ),
            total_commission_deducted=Coalesce(
                Subquery(commission_subquery),
                Decimal("0.00"),
            ),
            total_net_earnings=Coalesce(
                Subquery(net_subquery),
                Decimal("0.00"),
            ),
            already_paid=Coalesce(
                Subquery(paid_subquery),
                Decimal("0.00"),
            ),
        )
        .annotate(
            pending_payout_balance=F("total_net_earnings") - F("already_paid")
        )
        .order_by("-total_net_earnings")
    )


@transaction.atomic
def record_seller_payout(
    *,
    seller_id,
    amount,
    payout_date,
    transaction_reference,
    admin_user,
    notes="",
    ip_address=None,
    user_agent="",
):
    """
    Atomically records a completed weekly payout to a seller.
    Enforces concurrency protection:
    - Locks the SellerProfile row with select_for_update() to serialize payouts.
    - Validates amount is strictly positive and does not exceed available balance.
    - Validates transaction_reference is unique.
    - Records SELLER_PAYOUT_RECORDED audit event.
    """
    try:
        seller = SellerProfile.objects.select_for_update().get(id=seller_id)
    except SellerProfile.DoesNotExist:
        raise NotFound("Seller profile not found.")

    if amount <= Decimal("0.00"):
        raise ValidationError({"amount": "Payout amount must be strictly greater than zero."})

    # Compute available balance inside the locked transaction
    summary = get_seller_balance_summary(seller)
    available_balance = summary["pending_payout_balance"]

    if amount > available_balance:
        raise ValidationError(
            {
                "amount": (
                    f"Payout amount (₹{amount}) exceeds seller's available balance "
                    f"(₹{available_balance})."
                )
            }
        )

    ref = transaction_reference.strip()
    if not ref:
        raise ValidationError({"transaction_reference": "Transaction reference is required."})

    if SellerPayout.objects.filter(transaction_reference=ref).exists():
        raise ValidationError(
            {"transaction_reference": "A payout with this transaction reference already exists."}
        )

    try:
        with transaction.atomic():
            payout = SellerPayout.objects.create(
                seller=seller,
                amount=amount,
                payout_date=payout_date,
                transaction_reference=ref,
                notes=notes.strip() if notes else "",
                created_by=admin_user,
            )
    except IntegrityError as exc:
        if SellerPayout.objects.filter(transaction_reference=ref).exists():
            raise ValidationError(
                {"transaction_reference": "A payout with this transaction reference already exists."}
            )
        raise exc

    record_audit_event(
        actor=admin_user,
        action=AuditAction.SELLER_PAYOUT_RECORDED,
        entity_type=AuditEntity.SELLER_PAYOUT,
        entity_id=payout.id,
        metadata={
            "seller_id": str(seller.id),
            "amount": str(amount),
            "payout_date": str(payout_date),
            "transaction_reference": ref,
            "remaining_balance": str(available_balance - amount),
        },
        ip_address=ip_address,
        user_agent=user_agent,
    )

    return payout

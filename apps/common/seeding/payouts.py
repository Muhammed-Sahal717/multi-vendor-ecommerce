from decimal import Decimal
import uuid
from django.utils import timezone

from apps.sellers.models import SellerPayout, SellerProfile
from apps.sellers.services import get_seller_balance_summary, record_seller_payout


def seed_seller_payouts(admin_user) -> list:
    """
    Records realistic weekly payouts for active sellers with positive available balances.
    Leaves remaining positive pending balance for ongoing tracking.
    """
    payout_records = []
    active_sellers = SellerProfile.objects.filter(status=SellerProfile.Status.ACTIVE)

    for idx, seller in enumerate(active_sellers, start=1):
        summary = get_seller_balance_summary(seller)
        pending = summary["pending_payout_balance"]

        if pending >= Decimal("500.00"):
            # Pay roughly 50-60% of pending earnings, rounded to ₹100
            target_amount = (pending * Decimal("0.55")).quantize(Decimal("100.00"))
            if target_amount <= Decimal("0.00"):
                target_amount = Decimal("250.00")
            if target_amount > pending:
                target_amount = pending

            ref = f"DEMO-PO-{seller.business_name[:3].upper()}-{timezone.localdate().strftime('%Y%m%d')}-{idx:03d}"

            if SellerPayout.objects.filter(transaction_reference=ref).exists():
                payout_records.append(SellerPayout.objects.get(transaction_reference=ref))
                continue

            payout = record_seller_payout(
                seller_id=seller.id,
                amount=target_amount,
                payout_date=timezone.localdate(),
                transaction_reference=ref,
                admin_user=admin_user,
                notes=f"Weekly payout batch disbursed via NEFT for {seller.business_name}.",
            )
            payout_records.append(payout)

    return payout_records

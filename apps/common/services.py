from decimal import Decimal

from django.db.models import Count, Q, Sum

from apps.accounts.models import User
from apps.catalog.models import Product
from apps.orders.models import Order
from apps.payments.models import Payment
from apps.sellers.models import SellerApplication, SellerProfile


def get_admin_dashboard_stats():
    # 1. Customer statistics (only users with the CUSTOMER role)
    customer_agg = User.objects.filter(role=User.Role.CUSTOMER).aggregate(
        total=Count("id"),
        active=Count("id", filter=Q(is_active=True)),
        inactive=Count("id", filter=Q(is_active=False)),
    )

    # 2. Seller statistics
    seller_agg = SellerProfile.objects.aggregate(
        total=Count("id"),
        active=Count("id", filter=Q(status=SellerProfile.Status.ACTIVE)),
        suspended=Count("id", filter=Q(status=SellerProfile.Status.SUSPENDED)),
    )
    pending_applications = SellerApplication.objects.filter(
        status=SellerApplication.Status.PENDING
    ).count()

    # 3. Product statistics
    product_agg = Product.objects.aggregate(
        total=Count("id"),
        approved=Count("id", filter=Q(status=Product.Status.APPROVED)),
        pending_approval=Count("id", filter=Q(status=Product.Status.PENDING)),
        out_of_stock=Count("id", filter=Q(stock__lte=0)),
    )

    # 4. Order statistics
    order_agg = Order.objects.aggregate(
        total=Count("id"),
        pending=Count("id", filter=Q(status=Order.Status.PENDING)),
        confirmed=Count("id", filter=Q(status=Order.Status.CONFIRMED)),
        processing=Count("id", filter=Q(status=Order.Status.PROCESSING)),
        partially_shipped=Count("id", filter=Q(status=Order.Status.PARTIALLY_SHIPPED)),
        shipped=Count("id", filter=Q(status=Order.Status.SHIPPED)),
        partially_delivered=Count("id", filter=Q(status=Order.Status.PARTIALLY_DELIVERED)),
        delivered=Count("id", filter=Q(status=Order.Status.DELIVERED)),
        partially_cancelled=Count("id", filter=Q(status=Order.Status.PARTIALLY_CANCELLED)),
        cancelled=Count("id", filter=Q(status=Order.Status.CANCELLED)),
    )

    # 5. Payment statistics
    payment_agg = Payment.objects.aggregate(
        successful_count=Count(
            "id",
            filter=Q(status=Payment.Status.SUCCESSFUL),
        ),
        successful_amount_total=Sum(
            "amount",
            filter=Q(status=Payment.Status.SUCCESSFUL),
            default=Decimal("0.00"),
        ),
        pending_cod_count=Count(
            "id",
            filter=Q(
                method=Payment.Method.COD,
                provider=Payment.Provider.MANUAL,
                status=Payment.Status.PENDING,
            ),
        ),
        pending_cod_amount_total=Sum(
            "amount",
            filter=Q(
                method=Payment.Method.COD,
                provider=Payment.Provider.MANUAL,
                status=Payment.Status.PENDING,
            ),
            default=Decimal("0.00"),
        ),
    )

    return {
        "customers": {
            "total": customer_agg["total"],
            "active": customer_agg["active"],
            "inactive": customer_agg["inactive"],
        },
        "sellers": {
            "total": seller_agg["total"],
            "active": seller_agg["active"],
            "suspended": seller_agg["suspended"],
            "pending_applications": pending_applications,
        },
        "products": {
            "total": product_agg["total"],
            "approved": product_agg["approved"],
            "pending_approval": product_agg["pending_approval"],
            "out_of_stock": product_agg["out_of_stock"],
        },
        "orders": {
            "total": order_agg["total"],
            "pending": order_agg["pending"],
            "confirmed": order_agg["confirmed"],
            "processing": order_agg["processing"],
            "partially_shipped": order_agg["partially_shipped"],
            "shipped": order_agg["shipped"],
            "partially_delivered": order_agg["partially_delivered"],
            "delivered": order_agg["delivered"],
            "partially_cancelled": order_agg["partially_cancelled"],
            "cancelled": order_agg["cancelled"],
        },
        "payments": {
            "successful_count": payment_agg["successful_count"],
            "successful_amount_total": f"{payment_agg['successful_amount_total']:.2f}",
            "pending_cod_count": payment_agg["pending_cod_count"],
            "pending_cod_amount_total": f"{payment_agg['pending_cod_amount_total']:.2f}",
        },
    }

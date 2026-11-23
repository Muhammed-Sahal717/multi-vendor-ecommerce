import logging
from apps.cart.models import Cart, CartItem
from apps.catalog.models import Product
from apps.orders.models import Order, OrderItem
from apps.orders.services import (
    cancel_customer_order_item,
    create_order,
    update_seller_order_item_status,
)
from apps.payments.models import PaymentAttempt
from apps.common.seeding.payments import confirm_delivered_cod_order, pay_mock_online_order

logger = logging.getLogger(__name__)


def progress_item_to_status(order_item: OrderItem, target_status: str):
    """
    Sequentially advances an order item through allowed transitions.
    """
    chain = {
        OrderItem.Status.CONFIRMED: [OrderItem.Status.CONFIRMED],
        OrderItem.Status.PROCESSING: [OrderItem.Status.CONFIRMED, OrderItem.Status.PROCESSING],
        OrderItem.Status.SHIPPED: [
            OrderItem.Status.CONFIRMED,
            OrderItem.Status.PROCESSING,
            OrderItem.Status.SHIPPED,
        ],
        OrderItem.Status.DELIVERED: [
            OrderItem.Status.CONFIRMED,
            OrderItem.Status.PROCESSING,
            OrderItem.Status.SHIPPED,
            OrderItem.Status.DELIVERED,
        ],
    }

    steps = chain.get(target_status, [])
    for step in steps:
        order_item.refresh_from_db()
        if order_item.status != step:
            update_seller_order_item_status(
                order_item_id=order_item.id,
                seller_user=order_item.seller.user,
                new_status=step,
            )


def seed_orders(customers: list, admin_user) -> dict[str, any]:
    """
    Seeds 25 realistic orders with 45-55 items spanning multiple sellers,
    payment flows, fulfillment progressions, and cancellation scenarios.
    Idempotent: skips if demo orders have already been generated.
    """
    existing_orders = list(Order.objects.filter(user__email__endswith="@demo.galla.store"))
    if len(existing_orders) >= 20:
        existing_items = list(OrderItem.objects.filter(order__in=existing_orders))
        logger.info("Demo orders already exist; skipping duplicate creation.")
        return {
            "orders": existing_orders,
            "order_items": existing_items,
        }

    results = {
        "orders": [],
        "order_items": [],
    }

    # Fetch products by SKU for reliable assignment
    products_by_sku = {p.sku: p for p in Product.objects.filter(status=Product.Status.APPROVED)}

    # Defined order blueprints
    order_specs = [
        # 1. Multi-seller Delivered Online
        {
            "customer_idx": 0,
            "skus": ["COCHIN-AUD-001", "WEAVES-SAR-001"],
            "method": Order.PaymentMethod.RAZORPAY,
            "flow": "online_delivered",
        },
        # 2. Single-seller Delivered Online
        {
            "customer_idx": 1,
            "skus": ["MALABAR-IRN-001"],
            "method": Order.PaymentMethod.RAZORPAY,
            "flow": "online_delivered",
        },
        # 3. Single-seller Delivered Online
        {
            "customer_idx": 2,
            "skus": ["GRNVAL-OIL-001", "GRNVAL-SRM-003"],
            "method": Order.PaymentMethod.RAZORPAY,
            "flow": "online_delivered",
        },
        # 4. Multi-seller Delivered COD (Admin Confirmed)
        {
            "customer_idx": 3,
            "skus": ["MALABAR-CLY-004", "GRNVAL-OIL-001"],
            "method": Order.PaymentMethod.COD,
            "flow": "cod_delivered",
        },
        # 5. Single-seller Delivered COD (Admin Confirmed)
        {
            "customer_idx": 4,
            "skus": ["WEAVES-MND-003"],
            "method": Order.PaymentMethod.COD,
            "flow": "cod_delivered",
        },
        # 6. Multi-seller Delivered COD (Admin Confirmed)
        {
            "customer_idx": 5,
            "skus": ["GRNVAL-OIL-002", "MALABAR-CLY-004"],
            "method": Order.PaymentMethod.COD,
            "flow": "cod_delivered",
        },
        # 7. Multi-seller Delivered Online
        {
            "customer_idx": 6,
            "skus": ["WEAVES-ANK-004", "GRNVAL-SOP-005"],
            "method": Order.PaymentMethod.RAZORPAY,
            "flow": "online_delivered",
        },
        # 8. Single-seller Delivered Online
        {
            "customer_idx": 7,
            "skus": ["COCHIN-ACC-003"],
            "method": Order.PaymentMethod.RAZORPAY,
            "flow": "online_delivered",
        },
        # 9. Multi-seller Shipped Online
        {
            "customer_idx": 8,
            "skus": ["MALABAR-BRZ-003", "COCHIN-ACC-004"],
            "method": Order.PaymentMethod.RAZORPAY,
            "flow": "online_shipped",
        },
        # 10. Single-seller Shipped COD
        {
            "customer_idx": 9,
            "skus": ["WEAVES-MND-003"],
            "method": Order.PaymentMethod.COD,
            "flow": "cod_shipped",
        },
        # 11. Single-seller Processing Online
        {
            "customer_idx": 10,
            "skus": ["GRNVAL-OIL-004"],
            "method": Order.PaymentMethod.RAZORPAY,
            "flow": "online_processing",
        },
        # 12. Multi-seller Processing COD
        {
            "customer_idx": 11,
            "skus": ["COCHIN-ACC-003", "GRNVAL-OIL-001"],
            "method": Order.PaymentMethod.COD,
            "flow": "cod_processing",
        },
        # 13. Single-seller Confirmed Online
        {
            "customer_idx": 12,
            "skus": ["MALABAR-JAR-006"],
            "method": Order.PaymentMethod.RAZORPAY,
            "flow": "online_confirmed",
        },
        # 14. Single-seller Confirmed COD
        {
            "customer_idx": 13,
            "skus": ["WEAVES-BAG-005"],
            "method": Order.PaymentMethod.COD,
            "flow": "cod_confirmed",
        },
        # 15. Multi-seller Online Paid Pending
        {
            "customer_idx": 0,
            "skus": ["COCHIN-ACC-006", "MALABAR-NUT-007"],
            "method": Order.PaymentMethod.RAZORPAY,
            "flow": "online_pending_paid",
        },
        # 16. Single-seller COD Pending
        {
            "customer_idx": 1,
            "skus": ["GRNVAL-SOP-005"],
            "method": Order.PaymentMethod.COD,
            "flow": "cod_pending",
        },
        # 17. Multi-seller Partially Cancelled COD (Item 1 cancelled, Item 2 delivered & confirmed)
        {
            "customer_idx": 2,
            "skus": ["WEAVES-BAG-005", "MALABAR-BOK-008"],
            "method": Order.PaymentMethod.COD,
            "flow": "cod_partial_delivered",
        },
        # 18. Multi-seller In-flight Partial Cancellation (Item 1 cancelled, Item 2 confirmed)
        {
            "customer_idx": 3,
            "skus": ["COCHIN-ACC-003", "GRNVAL-OIL-002"],
            "method": Order.PaymentMethod.COD,
            "flow": "cod_partial_inflight",
        },
        # 19. Single-seller Fully Cancelled COD
        {
            "customer_idx": 4,
            "skus": ["MALABAR-BOK-009"],
            "method": Order.PaymentMethod.COD,
            "flow": "cod_fully_cancelled",
        },
        # 20. Single-seller Failed Mock Online Payment
        {
            "customer_idx": 5,
            "skus": ["COCHIN-AUD-001"],
            "method": Order.PaymentMethod.RAZORPAY,
            "flow": "online_failed_payment",
        },
        # 21. Single-seller Online Payment Retried & Succeeded
        {
            "customer_idx": 6,
            "skus": ["GRNVAL-SRM-003"],
            "method": Order.PaymentMethod.RAZORPAY,
            "flow": "online_retry_payment",
        },
        # 22. Multi-seller Delivered COD
        {
            "customer_idx": 7,
            "skus": ["COCHIN-ACC-003", "WEAVES-BAG-005"],
            "method": Order.PaymentMethod.COD,
            "flow": "cod_delivered",
        },
        # 23. Single-seller Delivered Online
        {
            "customer_idx": 8,
            "skus": ["MALABAR-PEN-010"],
            "method": Order.PaymentMethod.RAZORPAY,
            "flow": "online_delivered",
        },
        # 24. Multi-seller Delivered Online
        {
            "customer_idx": 9,
            "skus": ["GRNVAL-OIL-001", "MALABAR-PEN-011"],
            "method": Order.PaymentMethod.RAZORPAY,
            "flow": "online_delivered",
        },
        # 25. Multi-seller Delivered COD
        {
            "customer_idx": 10,
            "skus": ["MALABAR-COR-005", "GRNVAL-SOP-005"],
            "method": Order.PaymentMethod.COD,
            "flow": "cod_delivered",
        },
    ]

    for spec in order_specs:
        customer = customers[spec["customer_idx"]]
        address = customer.addresses.filter(is_default=True).first()
        if not address:
            address = customer.addresses.first()

        # 1. Prepare cart
        cart, _ = Cart.objects.get_or_create(user=customer)
        CartItem.objects.filter(cart=cart).delete()

        valid_skus = [sku for sku in spec["skus"] if sku in products_by_sku]
        if not valid_skus:
            continue

        for sku in valid_skus:
            prod = products_by_sku[sku]
            CartItem.objects.create(cart=cart, product=prod, quantity=1)

        # 2. Create order via official service
        order = create_order(
            user=customer,
            address=address,
            payment_method=spec["method"],
        )
        results["orders"].append(order)

        items = list(order.items.all().order_by("created_at"))
        results["order_items"].extend(items)

        flow = spec["flow"]

        # 3. Handle fulfillment and payment flows
        if flow == "online_delivered":
            pay_mock_online_order(order, PaymentAttempt.Status.SUCCESSFUL)
            for item in items:
                progress_item_to_status(item, OrderItem.Status.DELIVERED)

        elif flow == "cod_delivered":
            for item in items:
                progress_item_to_status(item, OrderItem.Status.DELIVERED)
            order.refresh_from_db()
            confirm_delivered_cod_order(order, admin_user)

        elif flow == "online_shipped":
            pay_mock_online_order(order, PaymentAttempt.Status.SUCCESSFUL)
            for item in items:
                progress_item_to_status(item, OrderItem.Status.SHIPPED)

        elif flow == "cod_shipped":
            for item in items:
                progress_item_to_status(item, OrderItem.Status.SHIPPED)

        elif flow == "online_processing":
            pay_mock_online_order(order, PaymentAttempt.Status.SUCCESSFUL)
            for item in items:
                progress_item_to_status(item, OrderItem.Status.PROCESSING)

        elif flow == "cod_processing":
            for item in items:
                progress_item_to_status(item, OrderItem.Status.PROCESSING)

        elif flow == "online_confirmed":
            pay_mock_online_order(order, PaymentAttempt.Status.SUCCESSFUL)
            for item in items:
                progress_item_to_status(item, OrderItem.Status.CONFIRMED)

        elif flow == "cod_confirmed":
            for item in items:
                progress_item_to_status(item, OrderItem.Status.CONFIRMED)

        elif flow == "online_pending_paid":
            pay_mock_online_order(order, PaymentAttempt.Status.SUCCESSFUL)

        elif flow == "cod_pending":
            # Leaves items at PENDING
            pass

        elif flow == "cod_partial_delivered":
            # Cancel item 0 as customer, deliver item 1, confirm collection
            if len(items) >= 2:
                cancel_customer_order_item(
                    order_id=order.id,
                    order_item_id=items[0].id,
                    customer_user=customer,
                )
                progress_item_to_status(items[1], OrderItem.Status.DELIVERED)
                order.refresh_from_db()
                confirm_delivered_cod_order(order, admin_user)

        elif flow == "cod_partial_inflight":
            # Cancel item 0, confirm item 1
            if len(items) >= 2:
                cancel_customer_order_item(
                    order_id=order.id,
                    order_item_id=items[0].id,
                    customer_user=customer,
                )
                progress_item_to_status(items[1], OrderItem.Status.CONFIRMED)

        elif flow == "cod_fully_cancelled":
            for item in items:
                cancel_customer_order_item(
                    order_id=order.id,
                    order_item_id=item.id,
                    customer_user=customer,
                )

        elif flow == "online_failed_payment":
            pay_mock_online_order(
                order,
                PaymentAttempt.Status.FAILED,
                failure_reason="Customer bank payment authorization declined by issuing bank.",
            )

        elif flow == "online_retry_payment":
            # First attempt fails
            pay_mock_online_order(
                order,
                PaymentAttempt.Status.FAILED,
                failure_reason="Transaction timed out waiting for SMS OTP.",
            )
            # Second attempt succeeds
            pay_mock_online_order(order, PaymentAttempt.Status.SUCCESSFUL)
            for item in items:
                progress_item_to_status(item, OrderItem.Status.CONFIRMED)

    return results

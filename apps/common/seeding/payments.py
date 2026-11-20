import logging
from apps.orders.models import Order
from apps.payments.models import Payment, PaymentAttempt
from apps.payments.services import confirm_cod_payment_collection, process_mock_payment

logger = logging.getLogger(__name__)


def pay_mock_online_order(order: Order, outcome: str = PaymentAttempt.Status.SUCCESSFUL, failure_reason: str = ""):
    """
    Executes mock online payment for a customer order.
    """
    payment = order.payment
    return process_mock_payment(
        payment_id=payment.id,
        customer_user=order.user,
        outcome=outcome,
        failure_reason=failure_reason,
    )


def confirm_delivered_cod_order(order: Order, admin_user):
    """
    Confirms cash collection for a delivered COD order, which atomically
    recognizes seller earnings for all delivered items.
    """
    payment = order.payment
    return confirm_cod_payment_collection(
        payment_id=payment.id,
        actor=admin_user,
    )

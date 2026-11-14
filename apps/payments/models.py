import uuid

from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q


def generate_transaction_reference():
    return f"GLL-PAY-{uuid.uuid4().hex[:12].upper()}"


class Payment(models.Model):
    class Method(models.TextChoices):
        COD = "cod", "Cash on Delivery"
        RAZORPAY = "razorpay", "Razorpay"

    class Provider(models.TextChoices):
        MANUAL = "manual", "Manual / Cash on Delivery"
        MOCK = "mock", "Mock Payment"
        RAZORPAY = "razorpay", "Razorpay"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        SUCCESSFUL = "successful", "Successful"
        FAILED = "failed", "Failed"
        REFUNDED = "refunded", "Refunded"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    order = models.OneToOneField(
        "orders.Order",
        on_delete=models.PROTECT,
        related_name="payment",
    )

    method = models.CharField(
        max_length=20,
        choices=Method.choices,
    )

    provider = models.CharField(
        max_length=20,
        choices=Provider.choices,
    )

    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0)],
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )

    paid_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=Q(amount__gte=0),
                name="payment_amount_nonnegative",
            ),
        ]

    def __str__(self):
        return f"{self.order.order_number} - {self.status}"


class PaymentAttempt(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        SUCCESSFUL = "successful", "Successful"
        FAILED = "failed", "Failed"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    payment = models.ForeignKey(
        Payment,
        on_delete=models.CASCADE,
        related_name="attempts",
    )

    attempt_number = models.PositiveIntegerField()

    transaction_reference = models.CharField(
        max_length=100,
        unique=True,
        default=generate_transaction_reference,
        editable=False,
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )

    failure_reason = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["attempt_number"]
        constraints = [
            models.UniqueConstraint(
                fields=["payment", "attempt_number"],
                name="unique_payment_attempt_number",
            ),
            models.CheckConstraint(
                condition=Q(attempt_number__gt=0),
                name="payment_attempt_number_positive",
            ),
        ]

    def __str__(self):
        return f"{self.payment.order.order_number} - Attempt {self.attempt_number}"

import uuid

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q
from django.utils import timezone


def generate_order_number():
    date = timezone.localdate().strftime("%Y%m%d")
    unique_part = uuid.uuid4().hex[:8].upper()
    return f"GLL-{date}-{unique_part}"


class Order(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        CONFIRMED = "confirmed", "Confirmed"
        PROCESSING = "processing", "Processing"
        PARTIALLY_SHIPPED = "partially_shipped", "Partially Shipped"
        SHIPPED = "shipped", "Shipped"
        PARTIALLY_DELIVERED = "partially_delivered", "Partially Delivered"
        DELIVERED = "delivered", "Delivered"
        PARTIALLY_CANCELLED = "partially_cancelled", "Partially Cancelled"
        CANCELLED = "cancelled", "Cancelled"

    class PaymentMethod(models.TextChoices):
        COD = "cod", "Cash on Delivery"
        RAZORPAY = "razorpay", "Razorpay"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    order_number = models.CharField(
        max_length=30,
        unique=True,
        default=generate_order_number,
        editable=False,
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="orders",
    )

    status = models.CharField(
        max_length=25,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )

    payment_method = models.CharField(
        max_length=20,
        choices=PaymentMethod.choices,
    )

    # Price snapshots
    subtotal = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0)],
    )

    shipping_fee = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
    )

    total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0)],
    )

    # Shipping address snapshot
    shipping_full_name = models.CharField(max_length=150)
    shipping_mobile = models.CharField(max_length=15)
    shipping_address_line_1 = models.CharField(max_length=255)
    shipping_address_line_2 = models.CharField(max_length=255, blank=True)
    shipping_city = models.CharField(max_length=100)
    shipping_state = models.CharField(max_length=100)
    shipping_postal_code = models.CharField(max_length=10)
    shipping_country = models.CharField(max_length=100)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["user", "-created_at"],
                name="order_user_created_idx",
            ),
        ]
        constraints = [
            models.CheckConstraint(
                condition=Q(subtotal__gte=0),
                name="order_subtotal_nonnegative",
            ),
            models.CheckConstraint(
                condition=Q(shipping_fee__gte=0),
                name="order_shipping_nonnegative",
            ),
            models.CheckConstraint(
                condition=Q(total_amount__gte=0),
                name="order_total_nonnegative",
            ),
        ]

    def __str__(self):
        return self.order_number


class OrderItem(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        CONFIRMED = "confirmed", "Confirmed"
        PROCESSING = "processing", "Processing"
        SHIPPED = "shipped", "Shipped"
        DELIVERED = "delivered", "Delivered"
        CANCELLED = "cancelled", "Cancelled"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="items",
    )

    seller = models.ForeignKey(
        "sellers.SellerProfile",
        on_delete=models.PROTECT,
        related_name="order_items",
    )

    product = models.ForeignKey(
        "catalog.Product",
        on_delete=models.PROTECT,
        related_name="order_items",
    )

    # Product snapshots
    product_name = models.CharField(max_length=255)
    product_sku = models.CharField(max_length=100)

    quantity = models.PositiveIntegerField()

    unit_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0)],
    )

    subtotal = models.DecimalField(
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

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(
                fields=["seller", "status"],
                name="orderitem_seller_status_idx",
            ),
        ]
        constraints = [
            models.CheckConstraint(
                condition=Q(quantity__gt=0),
                name="orderitem_quantity_positive",
            ),
            models.CheckConstraint(
                condition=Q(unit_price__gte=0),
                name="orderitem_price_nonnegative",
            ),
            models.CheckConstraint(
                condition=Q(subtotal__gte=0),
                name="orderitem_subtotal_nonnegative",
            ),
        ]

    def __str__(self):
        return f"{self.product_name} - {self.order.order_number}"

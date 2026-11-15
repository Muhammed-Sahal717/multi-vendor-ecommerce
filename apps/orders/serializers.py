from rest_framework import serializers

from apps.accounts.models import Address
from .models import Order, OrderItem

from apps.orders.services import validate_order_item_transition
from apps.payments.serializers import PaymentSummarySerializer

class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = [
            "id",
            "product",
            "product_name",
            "product_sku",
            "quantity",
            "unit_price",
            "subtotal",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    payment = PaymentSummarySerializer(read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "order_number",
            "status",
            "payment_method",
            "payment",
            "subtotal",
            "shipping_fee",
            "total_amount",
            "shipping_full_name",
            "shipping_mobile",
            "shipping_address_line_1",
            "shipping_address_line_2",
            "shipping_city",
            "shipping_state",
            "shipping_postal_code",
            "shipping_country",
            "items",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class CheckoutSerializer(serializers.Serializer):
    address_id = serializers.PrimaryKeyRelatedField(
        source="address",
        queryset=Address.objects.none(),
    )

    payment_method = serializers.ChoiceField(
        choices=Order.PaymentMethod.choices,
    )

    def get_fields(self):
        fields = super().get_fields()

        request = self.context.get("request")

        if request and request.user.is_authenticated:
            fields["address_id"].queryset = Address.objects.filter(
                user=request.user,
            )

        return fields


class SellerOrderItemSerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(
        source="order.order_number",
        read_only=True,
    )
    order_date = serializers.DateTimeField(
        source="order.created_at",
        read_only=True,
    )
    shipping_full_name = serializers.CharField(
        source="order.shipping_full_name",
        read_only=True,
    )
    shipping_mobile = serializers.CharField(
        source="order.shipping_mobile",
        read_only=True,
    )
    shipping_address_line_1 = serializers.CharField(
        source="order.shipping_address_line_1",
        read_only=True,
    )
    shipping_address_line_2 = serializers.CharField(
        source="order.shipping_address_line_2",
        read_only=True,
    )
    shipping_city = serializers.CharField(
        source="order.shipping_city",
        read_only=True,
    )
    shipping_state = serializers.CharField(
        source="order.shipping_state",
        read_only=True,
    )
    shipping_postal_code = serializers.CharField(
        source="order.shipping_postal_code",
        read_only=True,
    )
    shipping_country = serializers.CharField(
        source="order.shipping_country",
        read_only=True,
    )

    class Meta:
        model = OrderItem
        fields = [
            "id",
            "order_number",
            "order_date",
            "product_name",
            "product_sku",
            "quantity",
            "unit_price",
            "subtotal",
            "status",
            "shipping_full_name",
            "shipping_mobile",
            "shipping_address_line_1",
            "shipping_address_line_2",
            "shipping_city",
            "shipping_state",
            "shipping_postal_code",
            "shipping_country",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class SellerOrderStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ["status"]

    def validate_status(self, value):

        validate_order_item_transition(self.instance.status, value)

        return value


class AdminOrderItemDetailSerializer(serializers.ModelSerializer):
    seller_id = serializers.UUIDField(source="seller.id", read_only=True)
    seller_business_name = serializers.CharField(
        source="seller.business_name",
        read_only=True,
    )

    class Meta:
        model = OrderItem
        fields = [
            "id",
            "product",
            "product_name",
            "product_sku",
            "quantity",
            "unit_price",
            "subtotal",
            "status",
            "seller_id",
            "seller_business_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class AdminOrderListSerializer(serializers.ModelSerializer):
    customer_email = serializers.EmailField(source="user.email", read_only=True)
    customer_name = serializers.SerializerMethodField()
    payment_status = serializers.CharField(
        source="payment.status",
        read_only=True,
        default=None,
    )
    item_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "order_number",
            "customer_email",
            "customer_name",
            "status",
            "payment_method",
            "payment_status",
            "subtotal",
            "shipping_fee",
            "total_amount",
            "item_count",
            "created_at",
        ]
        read_only_fields = fields

    def get_customer_name(self, obj):
        name = f"{obj.user.first_name} {obj.user.last_name}".strip()
        return name or obj.user.email


class AdminOrderDetailSerializer(serializers.ModelSerializer):
    customer = serializers.SerializerMethodField()
    payment = PaymentSummarySerializer(read_only=True)
    items = AdminOrderItemDetailSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "order_number",
            "status",
            "payment_method",
            "payment",
            "customer",
            "subtotal",
            "shipping_fee",
            "total_amount",
            "shipping_full_name",
            "shipping_mobile",
            "shipping_address_line_1",
            "shipping_address_line_2",
            "shipping_city",
            "shipping_state",
            "shipping_postal_code",
            "shipping_country",
            "items",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_customer(self, obj):
        return {
            "id": str(obj.user.id),
            "email": obj.user.email,
            "first_name": obj.user.first_name,
            "last_name": obj.user.last_name,
        }

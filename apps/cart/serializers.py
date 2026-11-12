from django.db.models import Q
from rest_framework import serializers

from apps.catalog.models import Product
from apps.cart.models import Cart, CartItem


class CartItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_slug = serializers.CharField(source="product.slug", read_only=True)
    product_price = serializers.DecimalField(
        source="product.price",
        max_digits=12,
        decimal_places=2,
        read_only=True,
    )
    subtotal = serializers.SerializerMethodField()
    product_stock = serializers.IntegerField(
        source="product.stock",
        read_only=True,
    )
    is_available = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = [
            "id",
            "product",
            "product_name",
            "product_slug",
            "product_price",
            "quantity",
            "product_stock",
            "is_available",
            "subtotal",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "product_name",
            "product_slug",
            "product_price",
            "subtotal",
            "created_at",
            "updated_at",
        ]

    def get_subtotal(self, obj):
        return obj.product.price * obj.quantity

    def get_is_available(self, obj):
        product = obj.product

        return (
            product.status == "approved"
            and product.is_active
            and product.seller.status == "active"
            and product.category.is_active
            and product.stock >= obj.quantity
        )

    def validate(self, attrs):
        product = attrs.get(
            "product",
            getattr(self.instance, "product", None),
        )
        quantity = attrs.get(
            "quantity",
            getattr(self.instance, "quantity", 1),
        )

        if product is None:
            raise serializers.ValidationError({"product": "A product is required."})

        product = Product.objects.select_related("seller", "category").get(
            pk=product.pk
        )

        if (
            product.status != "approved"
            or not product.is_active
            or product.seller.status != "active"
            or not product.category.is_active
        ):
            raise serializers.ValidationError(
                {"product": "This product is currently unavailable."}
            )

        if quantity > product.stock:
            raise serializers.ValidationError(
                {"quantity": (f"Only {product.stock} items are currently available.")}
            )

        cart = self.context.get("cart")

        if cart is None:
            cart = Cart.objects.filter(user=self.context["request"].user).first()

        if cart:
            duplicate = CartItem.objects.filter(
                cart=cart,
                product=product,
            )

            if self.instance:
                duplicate = duplicate.exclude(pk=self.instance.pk)

            if duplicate.exists():
                raise serializers.ValidationError(
                    {
                        "product": (
                            "This product is already in your cart. "
                            "Update its quantity instead."
                        )
                    }
                )

        attrs["product"] = product
        return attrs

    def get_fields(self):
        fields = super().get_fields()

        if self.instance:
            fields["product"].read_only = True

        return fields

    def to_internal_value(self, data):
        if self.instance and "product" in data:
            raise serializers.ValidationError(
                {
                    "product": (
                        "You cannot change a cart item's product. "
                        "Remove the item and add another product."
                    )
                }
            )

        return super().to_internal_value(data)


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total_items = serializers.SerializerMethodField()
    total_price = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = [
            "id",
            "items",
            "total_items",
            "total_price",
            "created_at",
            "updated_at",
        ]

    def get_total_items(self, obj):
        return sum(item.quantity for item in obj.items.all())

    def get_total_price(self, obj):
        return sum(
            (item.product.price * item.quantity for item in obj.items.all()),
            start=0,
        )

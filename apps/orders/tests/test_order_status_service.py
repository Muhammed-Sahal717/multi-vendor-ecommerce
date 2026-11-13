from apps.orders.models import Order, OrderItem
from apps.orders.services import update_order_status
from apps.orders.tests.base import OrderTestBase


class OrderStatusServiceTests(OrderTestBase):
    def setUp(self):
        super().setUp()

        self.client.force_authenticate(user=self.customer)
        response = self.client.post(
            "/api/orders/checkout/",
            self.checkout_data,
            format="json",
        )
        self.assertEqual(response.status_code, 201)

        self.order = Order.objects.get(user=self.customer)
        self.order_item = self.order.items.first()

    def test_updates_parent_order_status(self):
        self.order_item.status = OrderItem.Status.CONFIRMED
        self.order_item.save(update_fields=["status"])

        updated_order = update_order_status(order_id=self.order.id)

        self.assertEqual(updated_order.status, Order.Status.CONFIRMED)

    def test_updates_parent_to_partially_cancelled(self):
        OrderItem.objects.create(
            order=self.order,
            seller=self.order_item.seller,
            product=self.order_item.product,
            product_name=self.order_item.product_name,
            product_sku=self.order_item.product_sku,
            quantity=1,
            unit_price=self.order_item.unit_price,
            subtotal=self.order_item.unit_price,
        )

        self.order_item.status = OrderItem.Status.CANCELLED
        self.order_item.save(update_fields=["status"])

        updated_order = update_order_status(order_id=self.order.id)

        self.assertEqual(
            updated_order.status,
            Order.Status.PARTIALLY_CANCELLED,
        )

    def test_all_cancelled_updates_parent_order(self):
        self.order_item.status = OrderItem.Status.CANCELLED
        self.order_item.save(update_fields=["status"])

        updated_order = update_order_status(order_id=self.order.id)

        self.assertEqual(updated_order.status, Order.Status.CANCELLED)

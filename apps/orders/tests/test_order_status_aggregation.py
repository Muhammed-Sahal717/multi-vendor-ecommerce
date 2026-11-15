from django.test import SimpleTestCase

from apps.orders.models import Order, OrderItem
from apps.orders.services import calculate_order_status


class OrderStatusAggregationTests(SimpleTestCase):
    def test_all_pending_items(self):
        result = calculate_order_status(
            [
                OrderItem.Status.PENDING,
                OrderItem.Status.PENDING,
            ]
        )
        self.assertEqual(result, Order.Status.PENDING)

    def test_all_confirmed_items(self):
        result = calculate_order_status(
            [
                OrderItem.Status.CONFIRMED,
                OrderItem.Status.CONFIRMED,
            ]
        )
        self.assertEqual(result, Order.Status.CONFIRMED)

    def test_pending_and_processing(self):
        result = calculate_order_status(
            [
                OrderItem.Status.PENDING,
                OrderItem.Status.PROCESSING,
            ]
        )
        self.assertEqual(result, Order.Status.PENDING)

    def test_processing_and_shipped(self):
        result = calculate_order_status(
            [
                OrderItem.Status.PROCESSING,
                OrderItem.Status.SHIPPED,
            ]
        )
        self.assertEqual(result, Order.Status.PARTIALLY_SHIPPED)

    def test_shipped_and_delivered(self):
        result = calculate_order_status(
            [
                OrderItem.Status.SHIPPED,
                OrderItem.Status.DELIVERED,
            ]
        )
        self.assertEqual(result, Order.Status.PARTIALLY_DELIVERED)

    def test_cancelled_and_pending(self):
        result = calculate_order_status(
            [
                OrderItem.Status.CANCELLED,
                OrderItem.Status.PENDING,
            ]
        )
        self.assertEqual(result, Order.Status.PARTIALLY_CANCELLED)

    def test_all_cancelled_items(self):
        result = calculate_order_status(
            [
                OrderItem.Status.CANCELLED,
                OrderItem.Status.CANCELLED,
            ]
        )
        self.assertEqual(result, Order.Status.CANCELLED)

    def test_delivered_and_cancelled(self):
        result = calculate_order_status(
            [
                OrderItem.Status.DELIVERED,
                OrderItem.Status.CANCELLED,
            ]
        )
        self.assertEqual(result, Order.Status.PARTIALLY_CANCELLED)

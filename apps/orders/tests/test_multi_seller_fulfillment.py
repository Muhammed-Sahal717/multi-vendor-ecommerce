from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Address
from apps.audit.constants import AuditAction, AuditEntity
from apps.audit.models import AuditEvent
from apps.catalog.models import Category, Product
from apps.orders.models import Order, OrderItem
from apps.payments.models import Payment
from apps.sellers.models import SellerProfile

User = get_user_model()


class MultiSellerFulfillmentIntegrationTests(APITestCase):
    """
    End-to-end integration tests for multi-seller order fulfillment.
    Verifies that a customer can purchase products from multiple independent
    sellers in a single order, and that each seller can only inspect and manage
    their own order items through the full fulfillment lifecycle using real JWT
    authentication.
    """

    def setUp(self):
        self.password = "StrongPassword123!"

        # 1. Customer One
        self.customer = User.objects.create_user(
            email="customer_multi@example.com",
            password=self.password,
            first_name="Customer",
            last_name="One",
            role=User.Role.CUSTOMER,
        )
        self.address = Address.objects.create(
            user=self.customer,
            full_name="Customer One",
            mobile="9876543210",
            address_line_1="MG Road 101",
            address_line_2="Near Metro",
            city="Kochi",
            state="Kerala",
            postal_code="682001",
            country="India",
            is_default=True,
        )

        # 2. Seller A
        self.seller_user_a = User.objects.create_user(
            email="seller_a@example.com",
            password=self.password,
            first_name="Seller",
            last_name="Alpha",
            role=User.Role.SELLER,
        )
        self.seller_a = SellerProfile.objects.create(
            user=self.seller_user_a,
            business_name="Alpha Traders",
            business_type="Retail",
            business_email="alpha@example.com",
            business_phone="9876543211",
            business_address="10 Alpha Street",
            city="Kochi",
            state="Kerala",
            postal_code="682001",
            country="India",
            status=SellerProfile.Status.ACTIVE,
            approved_at=timezone.now(),
        )

        # 3. Seller B
        self.seller_user_b = User.objects.create_user(
            email="seller_b@example.com",
            password=self.password,
            first_name="Seller",
            last_name="Beta",
            role=User.Role.SELLER,
        )
        self.seller_b = SellerProfile.objects.create(
            user=self.seller_user_b,
            business_name="Beta Merchants",
            business_type="Wholesale",
            business_email="beta@example.com",
            business_phone="9876543212",
            business_address="20 Beta Avenue",
            city="Calicut",
            state="Kerala",
            postal_code="673001",
            country="India",
            status=SellerProfile.Status.ACTIVE,
            approved_at=timezone.now(),
        )

        # 4. Catalog Category and Products
        self.category = Category.objects.create(
            name="Kerala Spices & Produce",
            is_active=True,
        )
        self.product_a = Product.objects.create(
            seller=self.seller_a,
            category=self.category,
            name="Cardamom 500g",
            sku="SKU-CARD-01",
            description="Premium Idukki Cardamom",
            price=Decimal("150.00"),
            stock=10,
            status=Product.Status.APPROVED,
            is_active=True,
        )
        self.product_b = Product.objects.create(
            seller=self.seller_b,
            category=self.category,
            name="Black Pepper 1kg",
            sku="SKU-PEPP-02",
            description="Wayanad Black Pepper",
            price=Decimal("250.00"),
            stock=10,
            status=Product.Status.APPROVED,
            is_active=True,
        )

    def authenticate_jwt(self, user):
        """Log in via actual project JWT authentication endpoint and set Bearer token."""
        response = self.client.post(
            "/api/auth/login/",
            {
                "email": user.email,
                "password": self.password,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        access_token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        return access_token

    def test_end_to_end_multi_seller_fulfillment_workflow(self):
        """
        Comprehensive 10-step multi-seller lifecycle test using real JWT authentication:
        1. Setup verified (Seller A, Seller B, Product A, Product B).
        2. Authenticate customer with JWT and add products from both sellers to cart.
        3. Checkout creating single multi-seller order; verify stock & cart clearing.
        4. Authenticate Seller A with JWT: inspects own item, verified blocked from Seller B's item.
        5. Seller A moves item through CONFIRMED -> PROCESSING -> SHIPPED.
        6. Verify parent order status becomes PARTIALLY_SHIPPED (DB & Customer API).
        7. Authenticate Seller B with JWT: inspects own item, verified blocked from Seller A's item.
        8. Seller B moves item through CONFIRMED -> PROCESSING -> SHIPPED.
        9. Verify parent order status becomes SHIPPED.
        10. Seller A delivers item -> PARTIALLY_DELIVERED. Seller B delivers item -> DELIVERED.
            Verify final states, stock retention, and structured audit events.
        """
        # --- Step 1 to 4: Customer adds both products to cart via API ---
        self.authenticate_jwt(self.customer)

        add_a_response = self.client.post(
            "/api/cart/items/",
            {"product": str(self.product_a.id), "quantity": 2},
            format="json",
        )
        self.assertEqual(add_a_response.status_code, status.HTTP_201_CREATED)

        add_b_response = self.client.post(
            "/api/cart/items/",
            {"product": str(self.product_b.id), "quantity": 3},
            format="json",
        )
        self.assertEqual(add_b_response.status_code, status.HTTP_201_CREATED)

        # Verify cart via API
        cart_response = self.client.get("/api/cart/")
        self.assertEqual(cart_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(cart_response.data["items"]), 2)

        # --- Step 5: Checkout creating single multi-seller order ---
        checkout_response = self.client.post(
            "/api/orders/checkout/",
            {
                "address_id": str(self.address.id),
                "payment_method": "cod",
            },
            format="json",
        )
        self.assertEqual(checkout_response.status_code, status.HTTP_201_CREATED)
        order_data = checkout_response.data

        order_id = str(order_data["id"])
        self.assertEqual(order_data["status"], Order.Status.PENDING)
        self.assertEqual(len(order_data["items"]), 2)

        # Identify items belonging to each product
        item_a = next(i for i in order_data["items"] if str(i["product"]) == str(self.product_a.id))
        item_b = next(i for i in order_data["items"] if str(i["product"]) == str(self.product_b.id))
        item_a_id = str(item_a["id"])
        item_b_id = str(item_b["id"])

        # Stock immediately decremented under lock
        self.product_a.refresh_from_db()
        self.product_b.refresh_from_db()
        self.assertEqual(self.product_a.stock, 8)  # 10 - 2
        self.assertEqual(self.product_b.stock, 7)  # 10 - 3

        # Cart is now empty
        cart_empty_response = self.client.get("/api/cart/")
        self.assertEqual(len(cart_empty_response.data["items"]), 0)

        # --- Step 6: Authenticate Seller A with JWT ---
        self.authenticate_jwt(self.seller_user_a)

        # Seller A lists order items: sees only their own item
        seller_a_list_resp = self.client.get("/api/orders/seller/")
        self.assertEqual(seller_a_list_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(seller_a_list_resp.data), 1)
        self.assertEqual(str(seller_a_list_resp.data[0]["id"]), item_a_id)

        # Seller A retrieves their own item: 200 OK
        seller_a_detail_resp = self.client.get(f"/api/orders/seller/{item_a_id}/")
        self.assertEqual(seller_a_detail_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(seller_a_detail_resp.data["product_name"], self.product_a.name)

        # Seller A cannot access or modify Seller B's item
        seller_a_cross_read = self.client.get(f"/api/orders/seller/{item_b_id}/")
        self.assertEqual(seller_a_cross_read.status_code, status.HTTP_404_NOT_FOUND)

        seller_a_cross_patch = self.client.patch(
            f"/api/orders/seller/{item_b_id}/status/",
            {"status": "confirmed"},
            format="json",
        )
        self.assertEqual(seller_a_cross_patch.status_code, status.HTTP_404_NOT_FOUND)

        # Move Seller A's item: PENDING -> CONFIRMED -> PROCESSING -> SHIPPED
        patch_conf_a = self.client.patch(
            f"/api/orders/seller/{item_a_id}/status/",
            {"status": "confirmed"},
            format="json",
        )
        self.assertEqual(patch_conf_a.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_conf_a.data["status"], OrderItem.Status.CONFIRMED)

        patch_proc_a = self.client.patch(
            f"/api/orders/seller/{item_a_id}/status/",
            {"status": "processing"},
            format="json",
        )
        self.assertEqual(patch_proc_a.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_proc_a.data["status"], OrderItem.Status.PROCESSING)

        patch_ship_a = self.client.patch(
            f"/api/orders/seller/{item_a_id}/status/",
            {"status": "shipped"},
            format="json",
        )
        self.assertEqual(patch_ship_a.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_ship_a.data["status"], OrderItem.Status.SHIPPED)

        # Verify parent order status is now PARTIALLY_SHIPPED
        order = Order.objects.get(id=order_id)
        self.assertEqual(order.status, Order.Status.PARTIALLY_SHIPPED)

        # Verify via Customer API using Customer JWT
        self.authenticate_jwt(self.customer)
        customer_order_resp = self.client.get(f"/api/orders/{order_id}/")
        self.assertEqual(customer_order_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(customer_order_resp.data["status"], Order.Status.PARTIALLY_SHIPPED)

        # --- Step 7: Authenticate Seller B with JWT ---
        self.authenticate_jwt(self.seller_user_b)

        # Seller B lists order items: sees only their own item
        seller_b_list_resp = self.client.get("/api/orders/seller/")
        self.assertEqual(seller_b_list_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(seller_b_list_resp.data), 1)
        self.assertEqual(str(seller_b_list_resp.data[0]["id"]), item_b_id)

        # Seller B cannot access or modify Seller A's item
        seller_b_cross_read = self.client.get(f"/api/orders/seller/{item_a_id}/")
        self.assertEqual(seller_b_cross_read.status_code, status.HTTP_404_NOT_FOUND)

        seller_b_cross_patch = self.client.patch(
            f"/api/orders/seller/{item_a_id}/status/",
            {"status": "confirmed"},
            format="json",
        )
        self.assertEqual(seller_b_cross_patch.status_code, status.HTTP_404_NOT_FOUND)

        # Move Seller B's item: PENDING -> CONFIRMED -> PROCESSING -> SHIPPED
        patch_conf_b = self.client.patch(
            f"/api/orders/seller/{item_b_id}/status/",
            {"status": "confirmed"},
            format="json",
        )
        self.assertEqual(patch_conf_b.status_code, status.HTTP_200_OK)

        patch_proc_b = self.client.patch(
            f"/api/orders/seller/{item_b_id}/status/",
            {"status": "processing"},
            format="json",
        )
        self.assertEqual(patch_proc_b.status_code, status.HTTP_200_OK)

        patch_ship_b = self.client.patch(
            f"/api/orders/seller/{item_b_id}/status/",
            {"status": "shipped"},
            format="json",
        )
        self.assertEqual(patch_ship_b.status_code, status.HTTP_200_OK)

        # Both items are now SHIPPED; parent order must become SHIPPED
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.SHIPPED)

        # --- Step 8: Seller A delivers their item with JWT ---
        self.authenticate_jwt(self.seller_user_a)

        patch_del_a = self.client.patch(
            f"/api/orders/seller/{item_a_id}/status/",
            {"status": "delivered"},
            format="json",
        )
        self.assertEqual(patch_del_a.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_del_a.data["status"], OrderItem.Status.DELIVERED)

        # Parent order must become PARTIALLY_DELIVERED
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.PARTIALLY_DELIVERED)

        # --- Step 9: Seller B delivers their item with JWT ---
        self.authenticate_jwt(self.seller_user_b)

        patch_del_b = self.client.patch(
            f"/api/orders/seller/{item_b_id}/status/",
            {"status": "delivered"},
            format="json",
        )
        self.assertEqual(patch_del_b.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_del_b.data["status"], OrderItem.Status.DELIVERED)

        # Parent order must become DELIVERED
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.DELIVERED)

        # --- Step 10: Verify final states, stock, and audit events ---
        item_a_record = OrderItem.objects.get(id=item_a_id)
        item_b_record = OrderItem.objects.get(id=item_b_id)
        self.assertEqual(item_a_record.status, OrderItem.Status.DELIVERED)
        self.assertEqual(item_b_record.status, OrderItem.Status.DELIVERED)

        self.product_a.refresh_from_db()
        self.product_b.refresh_from_db()
        self.assertEqual(self.product_a.stock, 8)
        self.assertEqual(self.product_b.stock, 7)

        # 1. Verify ORDER_CREATED audit event
        created_event = AuditEvent.objects.get(
            action=AuditAction.ORDER_CREATED,
            entity_id=order_id,
        )
        self.assertEqual(created_event.actor, self.customer)
        self.assertEqual(created_event.entity_type, AuditEntity.ORDER)

        # 2. Verify ORDER_STATUS_CHANGED audit transitions
        status_events = list(
            AuditEvent.objects.filter(
                action=AuditAction.ORDER_STATUS_CHANGED,
                entity_id=order_id,
            ).order_by("created_at")
        )
        self.assertEqual(len(status_events), 4)

        # Transition 1: Seller A shipped -> parent order: pending -> partially_shipped
        self.assertEqual(status_events[0].actor, self.seller_user_a)
        self.assertEqual(status_events[0].metadata["old_status"], Order.Status.PENDING)
        self.assertEqual(status_events[0].metadata["new_status"], Order.Status.PARTIALLY_SHIPPED)

        # Transition 2: Seller B shipped -> parent order: partially_shipped -> shipped
        self.assertEqual(status_events[1].actor, self.seller_user_b)
        self.assertEqual(status_events[1].metadata["old_status"], Order.Status.PARTIALLY_SHIPPED)
        self.assertEqual(status_events[1].metadata["new_status"], Order.Status.SHIPPED)

        # Transition 3: Seller A delivered -> parent order: shipped -> partially_delivered
        self.assertEqual(status_events[2].actor, self.seller_user_a)
        self.assertEqual(status_events[2].metadata["old_status"], Order.Status.SHIPPED)
        self.assertEqual(status_events[2].metadata["new_status"], Order.Status.PARTIALLY_DELIVERED)

        # Transition 4: Seller B delivered -> parent order: partially_delivered -> delivered
        self.assertEqual(status_events[3].actor, self.seller_user_b)
        self.assertEqual(status_events[3].metadata["old_status"], Order.Status.PARTIALLY_DELIVERED)
        self.assertEqual(status_events[3].metadata["new_status"], Order.Status.DELIVERED)

    def test_seller_a_cannot_update_seller_b_order_item(self):
        """Seller A cannot patch or access Seller B's OrderItem."""
        self.authenticate_jwt(self.customer)
        self.client.post(
            "/api/cart/items/",
            {"product": str(self.product_b.id), "quantity": 1},
            format="json",
        )
        checkout_resp = self.client.post(
            "/api/orders/checkout/",
            {"address_id": str(self.address.id), "payment_method": "cod"},
            format="json",
        )
        item_b_id = str(checkout_resp.data["items"][0]["id"])

        # Authenticate Seller A with JWT
        self.authenticate_jwt(self.seller_user_a)

        patch_resp = self.client.patch(
            f"/api/orders/seller/{item_b_id}/status/",
            {"status": "confirmed"},
            format="json",
        )
        self.assertEqual(patch_resp.status_code, status.HTTP_404_NOT_FOUND)

        item_b = OrderItem.objects.get(id=item_b_id)
        self.assertEqual(item_b.status, OrderItem.Status.PENDING)

    def test_seller_b_cannot_update_seller_a_order_item(self):
        """Seller B cannot patch or access Seller A's OrderItem."""
        self.authenticate_jwt(self.customer)
        self.client.post(
            "/api/cart/items/",
            {"product": str(self.product_a.id), "quantity": 1},
            format="json",
        )
        checkout_resp = self.client.post(
            "/api/orders/checkout/",
            {"address_id": str(self.address.id), "payment_method": "cod"},
            format="json",
        )
        item_a_id = str(checkout_resp.data["items"][0]["id"])

        # Authenticate Seller B with JWT
        self.authenticate_jwt(self.seller_user_b)

        patch_resp = self.client.patch(
            f"/api/orders/seller/{item_a_id}/status/",
            {"status": "confirmed"},
            format="json",
        )
        self.assertEqual(patch_resp.status_code, status.HTTP_404_NOT_FOUND)

        item_a = OrderItem.objects.get(id=item_a_id)
        self.assertEqual(item_a.status, OrderItem.Status.PENDING)

    def test_customer_cannot_call_seller_fulfillment_endpoints(self):
        """Customers are strictly blocked with 403 Forbidden on seller endpoints."""
        self.authenticate_jwt(self.customer)
        self.client.post(
            "/api/cart/items/",
            {"product": str(self.product_a.id), "quantity": 1},
            format="json",
        )
        checkout_resp = self.client.post(
            "/api/orders/checkout/",
            {"address_id": str(self.address.id), "payment_method": "cod"},
            format="json",
        )
        item_id = str(checkout_resp.data["items"][0]["id"])

        # Calling seller endpoints as customer with JWT
        list_resp = self.client.get("/api/orders/seller/")
        self.assertEqual(list_resp.status_code, status.HTTP_403_FORBIDDEN)

        detail_resp = self.client.get(f"/api/orders/seller/{item_id}/")
        self.assertEqual(detail_resp.status_code, status.HTTP_403_FORBIDDEN)

        patch_resp = self.client.patch(
            f"/api/orders/seller/{item_id}/status/",
            {"status": "confirmed"},
            format="json",
        )
        self.assertEqual(patch_resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_invalid_state_transitions_are_rejected(self):
        """Verify invalid or skipped status transitions return 400 Bad Request."""
        self.authenticate_jwt(self.customer)
        self.client.post(
            "/api/cart/items/",
            {"product": str(self.product_a.id), "quantity": 1},
            format="json",
        )
        checkout_resp = self.client.post(
            "/api/orders/checkout/",
            {"address_id": str(self.address.id), "payment_method": "cod"},
            format="json",
        )
        item_id = str(checkout_resp.data["items"][0]["id"])

        self.authenticate_jwt(self.seller_user_a)

        # Invalid from PENDING: cannot jump to SHIPPED or DELIVERED
        resp_skip_ship = self.client.patch(
            f"/api/orders/seller/{item_id}/status/",
            {"status": "shipped"},
            format="json",
        )
        self.assertEqual(resp_skip_ship.status_code, status.HTTP_400_BAD_REQUEST)

        resp_skip_del = self.client.patch(
            f"/api/orders/seller/{item_id}/status/",
            {"status": "delivered"},
            format="json",
        )
        self.assertEqual(resp_skip_del.status_code, status.HTTP_400_BAD_REQUEST)

        # Invalid string
        resp_invalid_str = self.client.patch(
            f"/api/orders/seller/{item_id}/status/",
            {"status": "invalid_status"},
            format="json",
        )
        self.assertEqual(resp_invalid_str.status_code, status.HTTP_400_BAD_REQUEST)

        # Advance to CONFIRMED
        self.client.patch(
            f"/api/orders/seller/{item_id}/status/",
            {"status": "confirmed"},
            format="json",
        )

        # Invalid from CONFIRMED: cannot jump directly to DELIVERED
        resp_conf_to_del = self.client.patch(
            f"/api/orders/seller/{item_id}/status/",
            {"status": "delivered"},
            format="json",
        )
        self.assertEqual(resp_conf_to_del.status_code, status.HTTP_400_BAD_REQUEST)

        # Advance through to DELIVERED
        self.client.patch(
            f"/api/orders/seller/{item_id}/status/",
            {"status": "processing"},
            format="json",
        )
        self.client.patch(
            f"/api/orders/seller/{item_id}/status/",
            {"status": "shipped"},
            format="json",
        )
        self.client.patch(
            f"/api/orders/seller/{item_id}/status/",
            {"status": "delivered"},
            format="json",
        )

        # Invalid from DELIVERED: terminal state, no further transitions allowed
        resp_after_del = self.client.patch(
            f"/api/orders/seller/{item_id}/status/",
            {"status": "shipped"},
            format="json",
        )
        self.assertEqual(resp_after_del.status_code, status.HTTP_400_BAD_REQUEST)

    def test_seller_cannot_fulfill_unpaid_razorpay_order(self):
        """Online orders with pending payment cannot be fulfilled by sellers."""
        self.authenticate_jwt(self.customer)
        self.client.post(
            "/api/cart/items/",
            {"product": str(self.product_a.id), "quantity": 1},
            format="json",
        )
        checkout_resp = self.client.post(
            "/api/orders/checkout/",
            {"address_id": str(self.address.id), "payment_method": "razorpay"},
            format="json",
        )
        self.assertEqual(checkout_resp.status_code, status.HTTP_201_CREATED)
        item_id = str(checkout_resp.data["items"][0]["id"])

        # Payment remains PENDING
        payment = Payment.objects.get(order_id=checkout_resp.data["id"])
        self.assertEqual(payment.status, Payment.Status.PENDING)

        # Seller attempts to confirm item with JWT
        self.authenticate_jwt(self.seller_user_a)
        patch_resp = self.client.patch(
            f"/api/orders/seller/{item_id}/status/",
            {"status": "confirmed"},
            format="json",
        )
        self.assertEqual(patch_resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("payment", str(patch_resp.data).lower())

        item = OrderItem.objects.get(id=item_id)
        self.assertEqual(item.status, OrderItem.Status.PENDING)

    def test_seller_access_scoped_by_product_ownership_across_different_customers(self):
        """
        Verify seller access is strictly scoped by product ownership rather than
        the identity of the customer who placed the order:
        1. Customer Two places an order containing a product from Seller A.
        2. Seller A can list and retrieve that OrderItem.
        3. Seller A can update that OrderItem through the fulfillment API.
        4. Seller B cannot retrieve or modify that OrderItem.
        """
        customer_two = User.objects.create_user(
            email="customer_two@example.com",
            password=self.password,
            first_name="Customer",
            last_name="Two",
            role=User.Role.CUSTOMER,
        )
        address_two = Address.objects.create(
            user=customer_two,
            full_name="Customer Two",
            mobile="9876543299",
            address_line_1="Beach Road 50",
            city="Calicut",
            state="Kerala",
            postal_code="673001",
            country="India",
            is_default=True,
        )

        # 1. Customer Two places an order containing a product from Seller A
        self.authenticate_jwt(customer_two)
        self.client.post(
            "/api/cart/items/",
            {"product": str(self.product_a.id), "quantity": 1},
            format="json",
        )
        checkout_resp = self.client.post(
            "/api/orders/checkout/",
            {"address_id": str(address_two.id), "payment_method": "cod"},
            format="json",
        )
        self.assertEqual(checkout_resp.status_code, status.HTTP_201_CREATED)
        item_id = str(checkout_resp.data["items"][0]["id"])

        # 2. Seller A can list and retrieve that OrderItem
        self.authenticate_jwt(self.seller_user_a)

        list_resp = self.client.get("/api/orders/seller/")
        self.assertEqual(list_resp.status_code, status.HTTP_200_OK)
        seller_a_item_ids = [str(item["id"]) for item in list_resp.data]
        self.assertIn(item_id, seller_a_item_ids)

        get_resp = self.client.get(f"/api/orders/seller/{item_id}/")
        self.assertEqual(get_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(get_resp.data["product_name"], self.product_a.name)
        self.assertEqual(get_resp.data["shipping_full_name"], "Customer Two")

        # 3. Seller A can update that OrderItem through the fulfillment API
        patch_resp = self.client.patch(
            f"/api/orders/seller/{item_id}/status/",
            {"status": "confirmed"},
            format="json",
        )
        self.assertEqual(patch_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_resp.data["status"], OrderItem.Status.CONFIRMED)

        # 4. Seller B cannot retrieve or modify that OrderItem
        self.authenticate_jwt(self.seller_user_b)

        seller_b_get = self.client.get(f"/api/orders/seller/{item_id}/")
        self.assertEqual(seller_b_get.status_code, status.HTTP_404_NOT_FOUND)

        seller_b_patch = self.client.patch(
            f"/api/orders/seller/{item_id}/status/",
            {"status": "processing"},
            format="json",
        )
        self.assertEqual(seller_b_patch.status_code, status.HTTP_404_NOT_FOUND)

        # Item status remains confirmed
        item = OrderItem.objects.get(id=item_id)
        self.assertEqual(item.status, OrderItem.Status.CONFIRMED)

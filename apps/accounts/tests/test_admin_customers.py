from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import Address, CustomerProfile
from apps.audit.constants import AuditAction, AuditEntity
from apps.audit.models import AuditEvent
from apps.sellers.models import SellerProfile

User = get_user_model()


class AdminCustomerTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            email="admin@example.com",
            password="StrongPassword123!",
            first_name="Admin",
            last_name="User",
            role=User.Role.ADMIN,
        )
        self.superadmin = User.objects.create_superuser(
            email="superadmin@example.com",
            password="StrongPassword123!",
            first_name="Super",
            last_name="Admin",
        )
        self.seller_user = User.objects.create_user(
            email="seller@example.com",
            password="StrongPassword123!",
            first_name="Seller",
            last_name="User",
            role=User.Role.SELLER,
        )
        self.seller_profile = SellerProfile.objects.create(
            user=self.seller_user,
            business_name="Seller Store",
            business_type="Retail",
            business_email="seller_store@example.com",
            business_phone="9876543210",
            business_address="123 Market Road",
            city="Kochi",
            state="Kerala",
            postal_code="682001",
            status=SellerProfile.Status.ACTIVE,
            approved_at=timezone.now(),
        )

        self.customer1 = User.objects.create_user(
            email="customer1@example.com",
            password="StrongPassword123!",
            first_name="Aarav",
            last_name="Kumar",
            role=User.Role.CUSTOMER,
        )
        profile1 = self.customer1.customer_profile
        profile1.mobile = "9876543201"
        profile1.save()

        self.address1 = Address.objects.create(
            user=self.customer1,
            full_name="Aarav Kumar",
            mobile="9876543201",
            address_line_1="Flat 4B, Palm Grove",
            city="Kochi",
            state="Kerala",
            postal_code="682001",
            country="India",
            is_default=True,
        )

        self.customer2 = User.objects.create_user(
            email="customer2@example.com",
            password="StrongPassword123!",
            first_name="Diya",
            last_name="Menon",
            role=User.Role.CUSTOMER,
            is_active=False,
        )
        profile2 = self.customer2.customer_profile
        profile2.mobile = "9876543202"
        profile2.save()

        self.list_url = "/api/accounts/admin/customers/"
        self.detail_url_1 = f"/api/accounts/admin/customers/{self.customer1.id}/"
        self.detail_url_2 = f"/api/accounts/admin/customers/{self.customer2.id}/"
        self.status_url_1 = f"/api/accounts/admin/customers/{self.customer1.id}/status/"
        self.status_url_2 = f"/api/accounts/admin/customers/{self.customer2.id}/status/"

    # --- Permissions & Authorization Tests ---

    def test_anonymous_user_cannot_access_admin_customer_endpoints(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        response = self.client.get(self.detail_url_1)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        response = self.client.patch(self.status_url_1, {"is_active": False})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_customer_cannot_access_admin_customer_endpoints(self):
        self.client.force_authenticate(user=self.customer1)

        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        response = self.client.get(self.detail_url_1)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        response = self.client.patch(self.status_url_1, {"is_active": False})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_seller_cannot_access_admin_customer_endpoints(self):
        self.client.force_authenticate(user=self.seller_user)

        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        response = self.client.get(self.detail_url_1)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        response = self.client.patch(self.status_url_1, {"is_active": False})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_and_superadmin_retain_access_to_administrative_endpoints(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.client.force_authenticate(user=self.superadmin)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    # --- Listing & Detail Tests ---

    def test_admin_can_list_customers_with_pagination(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("results", response.data)
        self.assertIn("count", response.data)
        self.assertEqual(response.data["count"], 2)

        # Verify only customer accounts appear (seller and admins are excluded)
        returned_emails = [item["email"] for item in response.data["results"]]
        self.assertIn(self.customer1.email, returned_emails)
        self.assertIn(self.customer2.email, returned_emails)
        self.assertNotIn(self.seller_user.email, returned_emails)
        self.assertNotIn(self.admin.email, returned_emails)
        self.assertNotIn(self.superadmin.email, returned_emails)

        # Verify exposed fields
        item = next(c for c in response.data["results"] if c["email"] == self.customer1.email)
        self.assertEqual(str(item["id"]), str(self.customer1.id))
        self.assertEqual(item["first_name"], "Aarav")
        self.assertEqual(item["last_name"], "Kumar")
        self.assertEqual(item["mobile"], "9876543201")
        self.assertTrue(item["is_active"])
        self.assertIn("date_joined", item)

        # Verify sensitive fields are NOT exposed
        self.assertNotIn("password", item)
        self.assertNotIn("is_staff", item)
        self.assertNotIn("is_superuser", item)
        self.assertNotIn("role", item)

    def test_pagination_maximum_page_size_enforced(self):
        self.client.force_authenticate(user=self.admin)

        # Bulk create additional customers to exceed 100
        new_users = [
            User(
                email=f"bulk_cust_{i}@example.com",
                first_name="Bulk",
                last_name=f"Customer{i}",
                role=User.Role.CUSTOMER,
            )
            for i in range(105)
        ]
        User.objects.bulk_create(new_users)

        # Request page_size=500
        response = self.client.get(self.list_url, {"page_size": 500})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data["count"], 107)
        self.assertEqual(len(response.data["results"]), 100)

    def test_search_customers_by_email_name_and_mobile(self):
        self.client.force_authenticate(user=self.admin)

        # Search by email
        response = self.client.get(self.list_url, {"search": "customer1@example.com"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["email"], self.customer1.email)

        # Search by first name
        response = self.client.get(self.list_url, {"search": "Diya"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["email"], self.customer2.email)

        # Search by last name
        response = self.client.get(self.list_url, {"search": "Menon"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

        # Search by mobile
        response = self.client.get(self.list_url, {"search": "9876543201"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["email"], self.customer1.email)

    def test_filter_customers_by_status(self):
        self.client.force_authenticate(user=self.admin)

        # Filter by active
        response = self.client.get(self.list_url, {"status": "active"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["email"], self.customer1.email)

        # Filter by inactive
        response = self.client.get(self.list_url, {"status": "inactive"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["email"], self.customer2.email)

        # Filter by is_active boolean
        response = self.client.get(self.list_url, {"is_active": "true"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["email"], self.customer1.email)

        # Filter by is_active=false
        response = self.client.get(self.list_url, {"is_active": "false"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["email"], self.customer2.email)

        # Invalid is_active filter returns 400
        response = self.client.get(self.list_url, {"is_active": "not_a_bool"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("is_active", response.data)

        # Invalid status filter
        response = self.client.get(self.list_url, {"status": "invalid_status"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_filter_customers_by_registration_date_range(self):
        self.client.force_authenticate(user=self.admin)

        today_str = timezone.localdate().strftime("%Y-%m-%d")
        yesterday_str = (timezone.localdate() - timedelta(days=1)).strftime("%Y-%m-%d")
        tomorrow_str = (timezone.localdate() + timedelta(days=1)).strftime("%Y-%m-%d")

        response = self.client.get(
            self.list_url,
            {"date_from": yesterday_str, "date_to": tomorrow_str},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)

        # Invalid date format
        response = self.client.get(self.list_url, {"date_from": "bad-date"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # date_from > date_to
        response = self.client.get(
            self.list_url,
            {"date_from": tomorrow_str, "date_to": yesterday_str},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_can_retrieve_customer_detail(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(self.detail_url_1)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        self.assertEqual(str(data["id"]), str(self.customer1.id))
        self.assertEqual(data["email"], self.customer1.email)
        self.assertEqual(data["first_name"], self.customer1.first_name)
        self.assertEqual(data["last_name"], self.customer1.last_name)
        self.assertEqual(data["mobile"], "9876543201")
        self.assertTrue(data["is_active"])
        self.assertIn("date_joined", data)
        self.assertIn("last_login", data)

        # Verify address is included
        self.assertEqual(len(data["addresses"]), 1)
        self.assertEqual(str(data["addresses"][0]["id"]), str(self.address1.id))
        self.assertEqual(data["addresses"][0]["city"], "Kochi")

        # Verify password and privilege fields are NOT exposed
        self.assertNotIn("password", data)
        self.assertNotIn("is_staff", data)
        self.assertNotIn("is_superuser", data)
        self.assertNotIn("role", data)

    def test_retrieve_customer_detail_not_found_or_non_customer(self):
        self.client.force_authenticate(user=self.admin)

        non_existent_id = "00000000-0000-0000-0000-000000000000"
        response = self.client.get(f"/api/accounts/admin/customers/{non_existent_id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        # Attempting to retrieve admin user via customer detail endpoint returns 404
        response = self.client.get(f"/api/accounts/admin/customers/{self.admin.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # --- Customer Status Update Tests ---

    def test_admin_can_deactivate_and_reactivate_customer(self):
        self.client.force_authenticate(user=self.admin)

        # 1. Deactivate active customer1
        response = self.client.patch(
            self.status_url_1,
            {"is_active": False},
            REMOTE_ADDR="192.168.1.10",
            HTTP_USER_AGENT="AdminAgent/1.0",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["is_active"])

        self.customer1.refresh_from_db()
        self.assertFalse(self.customer1.is_active)

        # Verify USER_DEACTIVATED audit event
        audit_events = AuditEvent.objects.filter(
            action=AuditAction.USER_DEACTIVATED,
            entity_type=AuditEntity.USER,
            entity_id=self.customer1.id,
        )
        self.assertEqual(audit_events.count(), 1)
        audit_event = audit_events.first()
        self.assertEqual(audit_event.actor, self.admin)
        self.assertEqual(audit_event.metadata["customer_email"], self.customer1.email)
        self.assertTrue(audit_event.metadata["old_is_active"])
        self.assertFalse(audit_event.metadata["new_is_active"])
        self.assertEqual(audit_event.ip_address, "192.168.1.10")
        self.assertEqual(audit_event.user_agent, "AdminAgent/1.0")

        # 2. Reactivate customer1
        response = self.client.patch(
            self.status_url_1,
            {"is_active": True},
            REMOTE_ADDR="192.168.1.11",
            HTTP_USER_AGENT="AdminAgent/1.1",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["is_active"])

        self.customer1.refresh_from_db()
        self.assertTrue(self.customer1.is_active)

        # Verify USER_ACTIVATED audit event
        audit_events = AuditEvent.objects.filter(
            action=AuditAction.USER_ACTIVATED,
            entity_type=AuditEntity.USER,
            entity_id=self.customer1.id,
        )
        self.assertEqual(audit_events.count(), 1)
        audit_event = audit_events.first()
        self.assertEqual(audit_event.actor, self.admin)
        self.assertFalse(audit_event.metadata["old_is_active"])
        self.assertTrue(audit_event.metadata["new_is_active"])

    def test_superadmin_can_manage_customer_status(self):
        self.client.force_authenticate(user=self.superadmin)

        response = self.client.patch(self.status_url_1, {"is_active": False})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["is_active"])

        self.customer1.refresh_from_db()
        self.assertFalse(self.customer1.is_active)

    def test_reject_redundant_status_transitions(self):
        self.client.force_authenticate(user=self.admin)

        # Customer 1 is already active
        response = self.client.patch(self.status_url_1, {"is_active": True})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already active", str(response.data))

        # Customer 2 is already inactive
        response = self.client.patch(self.status_url_2, {"is_active": False})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already inactive", str(response.data))

        # No audit events created for failed redundant transitions
        self.assertEqual(
            AuditEvent.objects.filter(
                action__in=[AuditAction.USER_ACTIVATED, AuditAction.USER_DEACTIVATED],
            ).count(),
            0,
        )

    def test_reject_malformed_request_body(self):
        self.client.force_authenticate(user=self.admin)

        # Empty body
        response = self.client.patch(self.status_url_1, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Missing is_active key
        response = self.client.patch(self.status_url_1, {"foo": "bar"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Invalid type
        response = self.client.patch(
            self.status_url_1,
            {"is_active": "not_a_bool"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # No audit events created
        self.assertEqual(
            AuditEvent.objects.filter(
                action__in=[AuditAction.USER_ACTIVATED, AuditAction.USER_DEACTIVATED],
            ).count(),
            0,
        )

    def test_admin_and_superadmin_accounts_cannot_be_deactivated(self):
        self.client.force_authenticate(user=self.admin)

        # Try to deactivate Admin account
        response = self.client.patch(
            f"/api/accounts/admin/customers/{self.admin.id}/status/",
            {"is_active": False},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.admin.refresh_from_db()
        self.assertTrue(self.admin.is_active)

        # Try to deactivate Superadmin account
        response = self.client.patch(
            f"/api/accounts/admin/customers/{self.superadmin.id}/status/",
            {"is_active": False},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.superadmin.refresh_from_db()
        self.assertTrue(self.superadmin.is_active)

    def test_status_update_nonexistent_customer_returns_404(self):
        self.client.force_authenticate(user=self.admin)

        non_existent_id = "00000000-0000-0000-0000-000000000000"
        response = self.client.patch(
            f"/api/accounts/admin/customers/{non_existent_id}/status/",
            {"is_active": False},
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # --- Authentication & Security Tests ---

    def test_deactivated_customer_cannot_use_existing_jwt_access_token(self):
        # 1. Obtain JWT token for active customer1
        refresh = RefreshToken.for_user(self.customer1)
        access_token = str(refresh.access_token)

        # 2. Access protected endpoint with token -> succeeds
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        response = self.client.get("/api/accounts/me/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], self.customer1.email)

        # 3. Administrator deactivates customer1
        self.client.credentials()  # clear credentials
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(self.status_url_1, {"is_active": False})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # 4. Customer attempts to use previously issued access token -> rejected 401
        self.client.force_authenticate(user=None)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        response = self.client.get("/api/accounts/me/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn("user_inactive", str(response.data))

        # 5. Customer attempts to access customer profile -> rejected 401
        response = self.client.get("/api/accounts/profile/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

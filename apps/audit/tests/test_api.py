from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.audit.models import AuditEvent


class AuditEventAPITests(APITestCase):
    def setUp(self):
        self.customer = User.objects.create_user(
            email="customer@example.com",
            password="TestPassword123!",
        )
        self.seller = User.objects.create_user(
            email="seller@example.com",
            password="TestPassword123!",
            role=User.Role.SELLER,
        )
        self.admin = User.objects.create_user(
            email="admin@example.com",
            password="TestPassword123!",
            role=User.Role.ADMIN,
        )
        self.superadmin = User.objects.create_user(
            email="superadmin@example.com",
            password="TestPassword123!",
            role=User.Role.SUPERADMIN,
        )

        AuditEvent.objects.create(
            action="USER_REGISTERED",
            entity_type="user",
            entity_id=self.customer.id,
        )

        self.url = "/api/audit/"

    def test_unauthenticated_user_is_denied(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_customer_is_denied(self):
        self.client.force_authenticate(user=self.customer)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_seller_is_denied(self):
        self.client.force_authenticate(user=self.seller)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_regular_admin_is_denied(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_superadmin_can_access_audit_events(self):
        self.client.force_authenticate(user=self.superadmin)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_filter_by_action(self):
        self.client.force_authenticate(user=self.superadmin)

        response = self.client.get(
            self.url,
            {"action": "USER_REGISTERED"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(len(response.data["results"]), 1)

    def test_filter_by_entity_type(self):
        self.client.force_authenticate(user=self.superadmin)

        response = self.client.get(
            self.url,
            {"entity_type": "user"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(len(response.data["results"]), 1)

    def test_invalid_action_filter_returns_400(self):
        self.client.force_authenticate(user=self.superadmin)

        response = self.client.get(
            self.url,
            {"action": "INVALID_ACTION"},
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_entity_type_filter_returns_400(self):
        self.client.force_authenticate(user=self.superadmin)

        response = self.client.get(
            self.url,
            {"entity_type": "invalid_entity"},
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_filter_by_actor(self):
        AuditEvent.objects.create(
            actor=self.customer,
            action="PROFILE_UPDATED",
            entity_type="user",
            entity_id=self.customer.id,
        )

        self.client.force_authenticate(user=self.superadmin)

        response = self.client.get(
            self.url,
            {"actor": str(self.customer.id)},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(len(response.data["results"]), 1)

    def test_filter_by_entity_id(self):
        self.client.force_authenticate(user=self.superadmin)

        response = self.client.get(
            self.url,
            {"entity_id": str(self.customer.id)},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(len(response.data["results"]), 1)

    def test_filter_by_date_range(self):
        self.client.force_authenticate(user=self.superadmin)

        response = self.client.get(
            self.url,
            {
                "date_from": "2026-01-01",
                "date_to": "2026-12-31",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(len(response.data["results"]), 1)

    def test_rejects_invalid_date(self):
        self.client.force_authenticate(user=self.superadmin)

        response = self.client.get(
            self.url,
            {"date_from": "invalid-date"},
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rejects_reversed_date_range(self):
        self.client.force_authenticate(user=self.superadmin)

        response = self.client.get(
            self.url,
            {
                "date_from": "2026-12-31",
                "date_to": "2026-01-01",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_pagination_returns_twenty_records_by_default(self):
        AuditEvent.objects.bulk_create(
            [
                AuditEvent(
                    action="USER_REGISTERED",
                    entity_type="user",
                    entity_id=self.customer.id,
                )
                for _ in range(24)
            ]
        )

        self.client.force_authenticate(user=self.superadmin)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 25)
        self.assertEqual(len(response.data["results"]), 20)

    def test_page_size_can_be_customized(self):
        AuditEvent.objects.bulk_create(
            [
                AuditEvent(
                    action="USER_REGISTERED",
                    entity_type="user",
                    entity_id=self.customer.id,
                )
                for _ in range(9)
            ]
        )

        self.client.force_authenticate(user=self.superadmin)

        response = self.client.get(self.url, {"page_size": 5})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 10)
        self.assertEqual(len(response.data["results"]), 5)

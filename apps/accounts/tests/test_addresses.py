from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Address, User


class AddressAPITests(APITestCase):
    addresses_url = "/api/accounts/addresses/"

    def setUp(self):
        self.user = User.objects.create_user(
            email="test@example.com",
            password="StrongPassword123!",
        )

        self.other_user = User.objects.create_user(
            email="other@example.com",
            password="StrongPassword123!",
        )

        self.client.force_authenticate(user=self.user)

        self.address_data = {
            "full_name": "Sahal AP",
            "mobile": "9876543210",
            "address_line_1": "Main Street",
            "address_line_2": "",
            "city": "Malappuram",
            "state": "Kerala",
            "postal_code": "676xxx",
            "country": "India",
        }

    def test_create_address(self):
        response = self.client.post(
            self.addresses_url,
            self.address_data,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        address = Address.objects.get(user=self.user)

        self.assertTrue(address.is_default)

    def test_list_own_addresses(self):
        Address.objects.create(
            user=self.user,
            **self.address_data,
            is_default=True,
        )

        Address.objects.create(
            user=self.other_user,
            **self.address_data,
            is_default=True,
        )

        response = self.client.get(self.addresses_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_update_address(self):
        address = Address.objects.create(
            user=self.user,
            **self.address_data,
            is_default=True,
        )

        response = self.client.patch(
            f"{self.addresses_url}{address.id}/",
            {"city": "Kozhikode"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        address.refresh_from_db()
        self.assertEqual(address.city, "Kozhikode")

    def test_delete_address(self):
        address = Address.objects.create(
            user=self.user,
            **self.address_data,
            is_default=True,
        )

        response = self.client.delete(f"{self.addresses_url}{address.id}/")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Address.objects.filter(id=address.id).exists())

    def test_cannot_update_another_users_address(self):
        address = Address.objects.create(
            user=self.other_user,
            **self.address_data,
            is_default=True,
        )

        response = self.client.patch(
            f"{self.addresses_url}{address.id}/",
            {"city": "Kozhikode"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_only_one_default_address_per_user(self):
        first_address = Address.objects.create(
            user=self.user,
            **self.address_data,
            is_default=True,
        )

        second_address_data = self.address_data.copy()
        second_address_data["city"] = "Kozhikode"

        response = self.client.post(
            self.addresses_url,
            {
                **second_address_data,
                "is_default": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        first_address.refresh_from_db()
        self.assertFalse(first_address.is_default)

        self.assertTrue(Address.objects.get(id=response.data["id"]).is_default)

    def test_unauthenticated_access(self):
        self.client.force_authenticate(user=None)

        response = self.client.get(self.addresses_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_deleting_default_address_promotes_another_address(self):
        first_address = Address.objects.create(
            user=self.user,
            **self.address_data,
            is_default=True,
        )

        second_data = self.address_data.copy()
        second_data["city"] = "Kozhikode"

        second_address = Address.objects.create(
            user=self.user,
            **second_data,
            is_default=False,
        )

        response = self.client.delete(
            f"{self.addresses_url}{first_address.id}/"
        )

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        second_address.refresh_from_db()
        self.assertTrue(second_address.is_default)
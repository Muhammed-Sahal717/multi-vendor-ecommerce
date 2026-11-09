from io import BytesIO

from PIL import Image
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
import os
from io import BytesIO
from PIL import Image
from django.core.files.uploadedfile import SimpleUploadedFile

class ProfileImageAPITests(APITestCase):
    image_url = "/api/accounts/profile/image/"

    def setUp(self):
        self.user = User.objects.create_user(
            email="test@example.com",
            password="StrongPassword123!",
        )
        self.client.force_authenticate(user=self.user)

    def create_image(self, image_format="JPEG", size=(100, 100)):
        image = Image.new("RGB", size, color="red")
        image_file = BytesIO()
        image.save(image_file, format=image_format)
        image_file.seek(0)

        extension = image_format.lower()

        return SimpleUploadedFile(
            f"profile.{extension}",
            image_file.read(),
            content_type=f"image/{extension}",
        )

    def test_valid_image_upload(self):
        image = self.create_image()

        response = self.client.patch(
            self.image_url,
            {"profile_image": image},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["profile_image"])

    def test_invalid_file_upload(self):
        invalid_file = SimpleUploadedFile(
            "document.txt",
            b"This is not an image.",
            content_type="text/plain",
        )

        response = self.client.patch(
            self.image_url,
            {"profile_image": invalid_file},
            format="multipart",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_oversized_image_upload(self):
        # Generate random image data so PNG compression
        # cannot reduce the file below 5 MB.
        image_data = os.urandom(1600 * 1600 * 3)

        image = Image.frombytes(
            "RGB",
            (1600, 1600),
            image_data,
        )

        image_file = BytesIO()
        image.save(image_file, format="PNG")
        image_file.seek(0)

        oversized_file = SimpleUploadedFile(
            "large_profile.png",
            image_file.read(),
            content_type="image/png",
        )

        response = self.client.patch(
            self.image_url,
            {"profile_image": oversized_file},
            format="multipart",
        )

        self.assertGreater(oversized_file.size, 5 * 1024 * 1024)

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_unauthenticated_upload(self):
        self.client.force_authenticate(user=None)

        response = self.client.patch(
            self.image_url,
            {"profile_image": self.create_image()},
            format="multipart",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

from django.contrib.auth import password_validation
from rest_framework import serializers

from .models import User, CustomerProfile


class RegisterSerializer(serializers.ModelSerializer):
    last_name = serializers.CharField(
        required=False,
        allow_blank=True,
    )
    password = serializers.CharField(
        write_only=True,
        min_length=8,
        validators=[password_validation.validate_password],
    )

    confirm_password = serializers.CharField(
        write_only=True,
    )

    class Meta:
        model = User
        fields = [
            "id",
            "first_name",
            "last_name",
            "email",
            "password",
            "confirm_password",
        ]
        read_only_fields = ["id"]

    def validate_email(self, value):
        email = User.objects.normalize_email(value)

        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError(
                "An account with this email already exists."
            )

        return email

    def validate(self, attrs):
        if attrs["password"] != attrs["confirm_password"]:
            raise serializers.ValidationError(
                {"confirm_password": "Passwords do not match."}
            )

        return attrs

    def create(self, validated_data):
        validated_data.pop("confirm_password")

        return User.objects.create_user(
            role=User.Role.CUSTOMER,
            **validated_data,
        )


class CustomerProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)
    first_name = serializers.CharField(
        source="user.first_name",
        required=False,
    )
    last_name = serializers.CharField(
        source="user.last_name",
        required=False,
        allow_blank=True,
    )

    class Meta:
        model = CustomerProfile
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "mobile",
            "profile_image",
        ]
        read_only_fields = ["id", "email", "profile_image"]

    def update(self, instance, validated_data):
        user_data = validated_data.pop("user", {})

        for field, value in user_data.items():
            setattr(instance.user, field, value)

        if user_data:
            instance.user.save()

        return super().update(instance, validated_data)


class ProfileImageSerializer(serializers.ModelSerializer):
    profile_image = serializers.ImageField(
        required=True,
        allow_null=False,
    )

    class Meta:
        model = CustomerProfile
        fields = ["profile_image"]

    def validate_profile_image(self, value):
        max_size = 5 * 1024 * 1024  # 5 MB
        allowed_formats = {"JPEG", "PNG", "WEBP"}

        if value.size > max_size:
            raise serializers.ValidationError("Image size cannot exceed 5 MB.")

        if value.image.format not in allowed_formats:
            raise serializers.ValidationError(
                "Only JPEG, PNG, and WebP images are allowed."
            )

        return value

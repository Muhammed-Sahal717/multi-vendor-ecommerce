from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User
from .forms import CustomUserCreationForm, CustomUserChangeForm


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    add_form = CustomUserCreationForm
    form = CustomUserChangeForm
    model = User

    list_display = (
        "email",
        "first_name",
        "last_name",
        "role",
        "is_active",
        "is_staff",
    )

    list_filter = (
        "role",
        "is_active",
        "is_staff",
    )

    search_fields = (
        "email",
        "first_name",
        "last_name",
    )

    ordering = ("email",)

    fieldsets = (
        (
            None,
            {
                "fields": ("email", "password"),
            },
        ),
        (
            "Personal Information",
            {
                "fields": ("first_name", "last_name"),
            },
        ),
        (
            "Galla Role",
            {
                "fields": ("role",),
            },
        ),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                ),
            },
        ),
        (
            "Important Dates",
            {
                "fields": ("last_login", "date_joined"),
            },
        ),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "first_name",
                    "last_name",
                    "role",
                    "password1",
                    "password2",
                ),
            },
        ),
    )
    readonly_fields = (
        "is_staff",
        "is_superuser",
        "groups",
        "user_permissions",
        "last_login",
        "date_joined",
    )

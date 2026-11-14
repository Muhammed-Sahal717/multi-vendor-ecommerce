from django.contrib import admin

from .models import Payment, PaymentAttempt


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = (
        "order",
        "method",
        "provider",
        "amount",
        "status",
        "paid_at",
        "created_at",
    )
    list_filter = ("method", "provider", "status")
    search_fields = (
        "order__order_number",
        "order__user__email",
    )
    readonly_fields = (
        "id",
        "order",
        "method",
        "provider",
        "amount",
        "status",
        "paid_at",
        "created_at",
        "updated_at",
    )
    ordering = ("-created_at",)

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(PaymentAttempt)
class PaymentAttemptAdmin(admin.ModelAdmin):
    list_display = (
        "transaction_reference",
        "payment",
        "attempt_number",
        "status",
        "created_at",
    )
    list_filter = ("status",)
    search_fields = (
        "transaction_reference",
        "payment__order__order_number",
    )
    readonly_fields = (
        "id",
        "payment",
        "attempt_number",
        "transaction_reference",
        "status",
        "failure_reason",
        "created_at",
    )
    ordering = ("-created_at",)

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

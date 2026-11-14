from django.urls import path

from apps.payments.views import (
    CustomerPaymentListView,
    CustomerPaymentDetailView,
    MockPaymentProcessView,
)

urlpatterns = [
    path("", CustomerPaymentListView.as_view(), name="payment-list"),
    path("<uuid:pk>/", CustomerPaymentDetailView.as_view(), name="payment-detail"),
    path(
        "<uuid:pk>/mock-process/",
        MockPaymentProcessView.as_view(),
        name="mock-payment-process",
    ),
]

from django.urls import path

from apps.payments.views import (
    AdminCODPaymentCollectionConfirmView,
    AdminPaymentDetailView,
    AdminPaymentListView,
    CustomerPaymentDetailView,
    CustomerPaymentListView,
    MockPaymentProcessView,
)

urlpatterns = [
    path("admin/", AdminPaymentListView.as_view(), name="admin-payment-list"),
    path(
        "admin/<uuid:pk>/",
        AdminPaymentDetailView.as_view(),
        name="admin-payment-detail",
    ),
    path(
        "admin/<uuid:pk>/confirm-cod/",
        AdminCODPaymentCollectionConfirmView.as_view(),
        name="admin-payment-confirm-cod",
    ),
    path("", CustomerPaymentListView.as_view(), name="payment-list"),
    path("<uuid:pk>/", CustomerPaymentDetailView.as_view(), name="payment-detail"),
    path(
        "<uuid:pk>/mock-process/",
        MockPaymentProcessView.as_view(),
        name="mock-payment-process",
    ),
]

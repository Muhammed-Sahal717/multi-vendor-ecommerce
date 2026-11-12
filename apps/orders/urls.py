from django.urls import path

from apps.orders.views import (
    CheckoutView,
    OrderDetailView,
    OrderListView,
    SellerOrderDetailView,
    SellerOrderListView,
    SellerOrderStatusUpdateView,
)

urlpatterns = [
    path("checkout/", CheckoutView.as_view(), name="order-checkout"),
    path("seller/", SellerOrderListView.as_view(), name="seller-order-list"),
    path(
        "seller/<uuid:pk>/",
        SellerOrderDetailView.as_view(),
        name="seller-order-detail",
    ),
    path(
        "seller/<uuid:pk>/status/",
        SellerOrderStatusUpdateView.as_view(),
        name="seller-order-status-update",
    ),
    path("", OrderListView.as_view(), name="order-list"),
    path("<uuid:pk>/", OrderDetailView.as_view(), name="order-detail"),
]


from django.urls import path

from apps.orders.views import (
    CheckoutView,
    OrderDetailView,
    OrderListView,
    SellerOrderDetailView,
    SellerOrderListView,
)

urlpatterns = [
    path("checkout/", CheckoutView.as_view(), name="order-checkout"),

    path("seller/", SellerOrderListView.as_view(), name="seller-order-list"),
    path(
        "seller/<uuid:pk>/",
        SellerOrderDetailView.as_view(),
        name="seller-order-detail",
    ),

    path("", OrderListView.as_view(), name="order-list"),
    path("<uuid:pk>/", OrderDetailView.as_view(), name="order-detail"),
]

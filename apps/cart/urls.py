from django.urls import path

from apps.cart.views import (
    CartDetailView,
    CartItemCreateView,
    CartItemDetailView,
)

urlpatterns = [
    path("", CartDetailView.as_view(), name="cart-detail"),
    path("items/", CartItemCreateView.as_view(), name="cart-item-create"),
    path(
        "items/<uuid:pk>/",
        CartItemDetailView.as_view(),
        name="cart-item-detail",
    ),
]

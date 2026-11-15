from django.urls import path

from apps.orders.views import (
    AdminOrderDetailView,
    AdminOrderListView,
    CheckoutView,
    CustomerOrderItemCancelView,
    OrderDetailView,
    OrderListView,
    SellerOrderDetailView,
    SellerOrderListView,
    SellerOrderStatusUpdateView,
)

urlpatterns = [
    path("checkout/", CheckoutView.as_view(), name="order-checkout"),
    path("admin/", AdminOrderListView.as_view(), name="admin-order-list"),
    path("admin/<uuid:pk>/", AdminOrderDetailView.as_view(), name="admin-order-detail"),
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
    path(
        "<uuid:order_id>/items/<uuid:item_id>/cancel/",
        CustomerOrderItemCancelView.as_view(),
        name="customer-order-item-cancel",
    ),
]

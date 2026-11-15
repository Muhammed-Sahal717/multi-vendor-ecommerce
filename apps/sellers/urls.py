from django.urls import path
from .views import (
    AdminSellerApplicationListView,
    AdminSellerApplicationReviewView,
    AdminSellerDetailView,
    AdminSellerListView,
    AdminSellerStatusUpdateView,
    SellerApplicationCreateView,
    SellerProfileView,
)

urlpatterns = [
    path(
        "applications/",
        SellerApplicationCreateView.as_view(),
        name="seller-application-create",
    ),
    path(
        "admin/applications/",
        AdminSellerApplicationListView.as_view(),
        name="admin-seller-applications",
    ),
    path(
        "admin/applications/<uuid:pk>/review/",
        AdminSellerApplicationReviewView.as_view(),
        name="admin-seller-application-review",
    ),
    path(
        "admin/sellers/",
        AdminSellerListView.as_view(),
        name="admin-seller-list",
    ),
    path(
        "admin/sellers/<uuid:pk>/",
        AdminSellerDetailView.as_view(),
        name="admin-seller-detail",
    ),
    path(
        "admin/sellers/<uuid:pk>/status/",
        AdminSellerStatusUpdateView.as_view(),
        name="admin-seller-status-update",
    ),
    path(
        "profile/",
        SellerProfileView.as_view(),
        name="seller-profile",
    ),
]

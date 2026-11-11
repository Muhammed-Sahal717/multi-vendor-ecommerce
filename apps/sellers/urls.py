from django.urls import path
from .views import (
    AdminSellerApplicationListView,
    AdminSellerApplicationReviewView,
)
from .views import SellerApplicationCreateView

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
]

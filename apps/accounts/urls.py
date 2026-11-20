from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from .views import (
    AddressDetailView,
    AddressListCreateView,
    AdminCustomerDetailView,
    AdminCustomerListView,
    AdminCustomerStatusUpdateView,
    CustomerProfileView,
    MeView,
    ProfileImageView,
    RegisterView,
)

urlpatterns = [
    path(
        "admin/customers/",
        AdminCustomerListView.as_view(),
        name="admin-customer-list",
    ),
    path(
        "admin/customers/<uuid:pk>/",
        AdminCustomerDetailView.as_view(),
        name="admin-customer-detail",
    ),
    path(
        "admin/customers/<uuid:pk>/status/",
        AdminCustomerStatusUpdateView.as_view(),
        name="admin-customer-status",
    ),
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("me/", MeView.as_view(), name="me"),
    path("profile/", CustomerProfileView.as_view(), name="customer-profile"),
    path("profile/image/", ProfileImageView.as_view(), name="profile-image"),
    path("addresses/", AddressListCreateView.as_view(), name="address-list-create"),
    path("addresses/<uuid:pk>/", AddressDetailView.as_view(), name="address-detail"),
]

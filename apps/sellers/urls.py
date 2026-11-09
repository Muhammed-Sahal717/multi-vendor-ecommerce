from django.urls import path

from .views import SellerApplicationCreateView

urlpatterns = [
    path(
        "applications/",
        SellerApplicationCreateView.as_view(),
        name="seller-application-create",
    ),
]

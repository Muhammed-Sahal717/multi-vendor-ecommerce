from django.urls import path

from .views import (
    CategoryListCreateView,
    CategoryDetailView,
    SellerProductListCreateView,
    SellerProductDetailView,
    PublicProductListView,
    PublicProductDetailView,
    AdminProductListView,
    AdminProductReviewView,
)
from .image_views import (
    SellerProductImageListCreateView,
    SellerProductImageDetailView,
)

urlpatterns = [
    path("categories/", CategoryListCreateView.as_view(), name="category-list"),
    path(
        "categories/<slug:slug>/",
        CategoryDetailView.as_view(),
        name="category-detail",
    ),
    path(
        "products/",
        PublicProductListView.as_view(),
        name="public-product-list",
    ),
    path(
        "products/<slug:slug>/",
        PublicProductDetailView.as_view(),
        name="public-product-detail",
    ),
    path(
        "seller/products/",
        SellerProductListCreateView.as_view(),
        name="seller-product-list",
    ),
    path(
        "seller/products/<slug:slug>/",
        SellerProductDetailView.as_view(),
        name="seller-product-detail",
    ),
    path(
        "admin/products/",
        AdminProductListView.as_view(),
        name="admin-product-list",
    ),
    path(
        "admin/products/<slug:slug>/review/",
        AdminProductReviewView.as_view(),
        name="admin-product-review",
    ),
    path(
        "seller/products/<slug:slug>/images/",
        SellerProductImageListCreateView.as_view(),
        name="seller-product-image-list",
    ),
    path(
        "seller/products/<slug:slug>/images/<uuid:pk>/",
        SellerProductImageDetailView.as_view(),
        name="seller-product-image-detail",
    ),
]

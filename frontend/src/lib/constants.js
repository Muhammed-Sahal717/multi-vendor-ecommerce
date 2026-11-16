export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "") ||
  "http://localhost:8000/api";

export const ROLES = {
  CUSTOMER: "customer",
  SELLER: "seller",
  ADMIN: "admin",
  SUPERADMIN: "superadmin",
};

export const PAYMENT_METHODS = {
  COD: "cod",
  RAZORPAY: "razorpay",
};

export const FULFILLMENT_STATUS = {
  CONFIRMED: "confirmed",
  PROCESSING: "processing",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
};

export const SELLER_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  ACTIVE: "active",
  SUSPENDED: "suspended",
  DEACTIVATED: "deactivated",
};

export const PRODUCT_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};

export const API_ENDPOINTS = {
  // 1. Auth & Accounts
  AUTH: {
    REGISTER: "/auth/register/",
    LOGIN: "/auth/login/",
    REFRESH_TOKEN: "/auth/token/refresh/",
    ME: "/auth/me/",
    PROFILE: "/auth/profile/",
    PROFILE_IMAGE: "/auth/profile/image/",
    ADDRESSES: "/auth/addresses/",
    ADDRESS_DETAIL: (id) => `/auth/addresses/${id}/`,
    ADMIN_CUSTOMERS: "/auth/admin/customers/",
    ADMIN_CUSTOMER_DETAIL: (id) => `/auth/admin/customers/${id}/`,
    ADMIN_CUSTOMER_STATUS: (id) => `/auth/admin/customers/${id}/status/`,
  },

  // 2. Product Catalog & Categories
  CATALOG: {
    CATEGORIES: "/catalog/categories/",
    CATEGORY_DETAIL: (slug) => `/catalog/categories/${slug}/`,
    PRODUCTS: "/catalog/products/",
    PRODUCT_DETAIL: (slug) => `/catalog/products/${slug}/`,
    SELLER_PRODUCTS: "/catalog/seller/products/",
    SELLER_PRODUCT_DETAIL: (slug) => `/catalog/seller/products/${slug}/`,
    SELLER_PRODUCT_IMAGES: (slug) => `/catalog/seller/products/${slug}/images/`,
    SELLER_PRODUCT_IMAGE_DETAIL: (slug, id) =>
      `/catalog/seller/products/${slug}/images/${id}/`,
    ADMIN_PRODUCTS: "/catalog/admin/products/",
    ADMIN_PRODUCT_REVIEW: (slug) => `/catalog/admin/products/${slug}/review/`,
  },

  // 3. Shopping Cart
  CART: {
    BASE: "/cart/",
    ITEMS: "/cart/items/",
    ITEM_DETAIL: (id) => `/cart/items/${id}/`,
  },

  // 4. Orders & Checkout
  ORDERS: {
    CHECKOUT: "/orders/checkout/",
    LIST: "/orders/",
    DETAIL: (id) => `/orders/${id}/`,
    CANCEL_ITEM: (orderId, itemId) =>
      `/orders/${orderId}/items/${itemId}/cancel/`,
    SELLER_LIST: "/orders/seller/",
    SELLER_DETAIL: (id) => `/orders/seller/${id}/`,
    SELLER_STATUS: (id) => `/orders/seller/${id}/status/`,
    ADMIN_LIST: "/orders/admin/",
    ADMIN_DETAIL: (id) => `/orders/admin/${id}/`,
  },

  // 5. Payments
  PAYMENTS: {
    LIST: "/payments/",
    DETAIL: (id) => `/payments/${id}/`,
    MOCK_PROCESS: (id) => `/payments/${id}/mock-process/`,
    ADMIN_LIST: "/payments/admin/",
    ADMIN_DETAIL: (id) => `/payments/admin/${id}/`,
    ADMIN_CONFIRM_COD: (id) => `/payments/admin/${id}/confirm-cod/`,
  },

  // 6. Seller Management & Onboarding
  SELLERS: {
    APPLICATIONS: "/sellers/applications/",
    PROFILE: "/sellers/profile/",
    ADMIN_APPLICATIONS: "/sellers/admin/applications/",
    ADMIN_APPLICATION_REVIEW: (id) =>
      `/sellers/admin/applications/${id}/review/`,
    ADMIN_SELLERS: "/sellers/admin/sellers/",
    ADMIN_SELLER_DETAIL: (id) => `/sellers/admin/sellers/${id}/`,
    ADMIN_SELLER_STATUS: (id) => `/sellers/admin/sellers/${id}/status/`,
  },

  // 7. Seller Earnings & Payouts
  EARNINGS: {
    SELLER_DASHBOARD: "/sellers/earnings/dashboard/",
    SELLER_LIST: "/sellers/earnings/",
    SELLER_PAYOUTS: "/sellers/payouts/",
    ADMIN_OVERVIEW: "/sellers/admin/earnings/",
    ADMIN_SELLER_EARNINGS: (id) => `/sellers/admin/sellers/${id}/earnings/`,
    ADMIN_SELLER_PAYOUTS: (id) => `/sellers/admin/sellers/${id}/payouts/`,
  },

  // 8. Admin Dashboard
  ADMIN: {
    DASHBOARD: "/admin/dashboard/",
  },

  // 9. Audit Logs
  AUDIT: {
    LOGS: "/audit/",
  },
};

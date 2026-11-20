export const ROUTE_PATHS = {
  // Public Storefront & Commerce
  STOREFRONT: {
    HOME: '/',
    PRODUCTS: '/products',
    PRODUCT_DETAILS: (slug = ':slug') => `/products/${slug}`,
    CATEGORIES: '/categories',
    CATEGORY_PRODUCTS: (slug = ':slug') => `/categories/${slug}`,
    CART: '/cart',
    CHECKOUT: '/checkout',
    ORDER_SUCCESS: '/checkout/success',
  },

  // Auth
  AUTH: {
    LOGIN: '/login',
    REGISTER: '/register',
  },

  // Customer Portal
  CUSTOMER: {
    DASHBOARD: '/customer/dashboard',
    ORDERS: '/customer/orders',
    ORDER_DETAILS: (id = ':id') => `/customer/orders/${id}`,
    PROFILE: '/customer/profile',
    ADDRESSES: '/customer/addresses',
    PAYMENTS: '/customer/payments',
    SELLER_APPLICATION_STATUS: '/customer/seller-application-status',
  },

  // Seller Portal
  SELLER: {
    DASHBOARD: '/seller/dashboard',
    PRODUCTS: '/seller/products',
    CREATE_PRODUCT: '/seller/products/new',
    EDIT_PRODUCT: (slug = ':slug') => `/seller/products/${slug}/edit`,
    ORDERS: '/seller/orders',
    ORDER_DETAILS: (id = ':id') => `/seller/orders/${id}`,
    EARNINGS_DASHBOARD: '/seller/earnings',
    EARNINGS_HISTORY: '/seller/earnings/history',
    PAYOUT_HISTORY: '/seller/payouts',
    PROFILE: '/seller/profile',
    APPLICATION: '/seller/apply',
  },

  // Admin Portal
  ADMIN: {
    DASHBOARD: '/admin/dashboard',
    CUSTOMERS: '/admin/customers',
    CUSTOMER_DETAILS: (id = ':id') => `/admin/customers/${id}`,
    SELLERS: '/admin/sellers',
    SELLER_DETAILS: (id = ':id') => `/admin/sellers/${id}`,
    SELLER_APPLICATIONS: '/admin/seller-applications',
    CATEGORIES: '/admin/categories',
    PRODUCTS: '/admin/products',
    ORDERS: '/admin/orders',
    ORDER_DETAILS: (id = ':id') => `/admin/orders/${id}`,
    PAYMENTS: '/admin/payments',
    PAYMENT_DETAILS: (id = ':id') => `/admin/payments/${id}`,
    EARNINGS: '/admin/earnings',
    SELLER_PAYOUTS: '/admin/seller-payouts',
  },

  // Superadmin
  SUPER_ADMIN: {
    AUDIT_LOGS: '/admin/audit-logs',
  },
};

export default ROUTE_PATHS;

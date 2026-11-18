import apiClient from '../../../lib/axios.js';
import { API_ENDPOINTS } from '../../../lib/constants.js';

export const adminService = {
  // Platform Dashboard
  getDashboardStats: async () => {
    const response = await apiClient.get(API_ENDPOINTS.ADMIN.DASHBOARD);
    return response.data;
  },

  // Customer Management
  getCustomers: async (params = {}) => {
    const response = await apiClient.get(API_ENDPOINTS.AUTH.ADMIN_CUSTOMERS, { params });
    return response.data;
  },

  getCustomer: async (id) => {
    const response = await apiClient.get(API_ENDPOINTS.AUTH.ADMIN_CUSTOMER_DETAIL(id));
    return response.data;
  },

  updateCustomerStatus: async (id, isActive) => {
    const response = await apiClient.patch(API_ENDPOINTS.AUTH.ADMIN_CUSTOMER_STATUS(id), {
      is_active: isActive,
    });
    return response.data;
  },

  // Category Moderation
  createCategory: async (categoryData) => {
    const response = await apiClient.post(API_ENDPOINTS.CATALOG.CATEGORIES, categoryData);
    return response.data;
  },

  updateCategory: async (slug, categoryData, isPartial = true) => {
    const method = isPartial ? 'patch' : 'put';
    const response = await apiClient[method](
      API_ENDPOINTS.CATALOG.CATEGORY_DETAIL(slug),
      categoryData
    );
    return response.data;
  },

  deleteCategory: async (slug) => {
    const response = await apiClient.delete(API_ENDPOINTS.CATALOG.CATEGORY_DETAIL(slug));
    return response.data;
  },

  // Product Moderation
  getProducts: async (params = {}) => {
    const response = await apiClient.get(API_ENDPOINTS.CATALOG.ADMIN_PRODUCTS, { params });
    return response.data;
  },

  reviewProduct: async (slug, reviewData) => {
    const status =
      reviewData.status ||
      (reviewData.action === 'approve'
        ? 'approved'
        : reviewData.action === 'reject'
        ? 'rejected'
        : reviewData.action);

    const payload = {
      status,
      rejection_reason: reviewData.rejection_reason || '',
    };

    const response = await apiClient.patch(
      API_ENDPOINTS.CATALOG.ADMIN_PRODUCT_REVIEW(slug),
      payload
    );
    return response.data;
  },

  // Order Oversight
  getOrders: async (params = {}) => {
    const response = await apiClient.get(API_ENDPOINTS.ORDERS.ADMIN_LIST, { params });
    return response.data;
  },

  getOrder: async (id) => {
    const response = await apiClient.get(API_ENDPOINTS.ORDERS.ADMIN_DETAIL(id));
    return response.data;
  },

  // Payment Oversight & COD
  getPayments: async (params = {}) => {
    const response = await apiClient.get(API_ENDPOINTS.PAYMENTS.ADMIN_LIST, { params });
    return response.data;
  },

  getPayment: async (id) => {
    const response = await apiClient.get(API_ENDPOINTS.PAYMENTS.ADMIN_DETAIL(id));
    return response.data;
  },

  confirmCodCollection: async (paymentId, payload = {}) => {
    const response = await apiClient.post(
      API_ENDPOINTS.PAYMENTS.ADMIN_CONFIRM_COD(paymentId),
      payload
    );
    return response.data;
  },

  // Seller Onboarding & Management
  getSellerApplications: async (params = {}) => {
    const response = await apiClient.get(API_ENDPOINTS.SELLERS.ADMIN_APPLICATIONS, { params });
    return response.data;
  },

  reviewSellerApplication: async (id, reviewData) => {
    const status =
      reviewData.status ||
      (reviewData.action === 'approve'
        ? 'approved'
        : reviewData.action === 'reject'
        ? 'rejected'
        : reviewData.action);
    const review_notes = reviewData.review_notes ?? reviewData.notes ?? '';

    const payload = {
      status,
      review_notes,
    };

    const response = await apiClient.patch(
      API_ENDPOINTS.SELLERS.ADMIN_APPLICATION_REVIEW(id),
      payload
    );
    return response.data;
  },

  getSellers: async (params = {}) => {
    const response = await apiClient.get(API_ENDPOINTS.SELLERS.ADMIN_SELLERS, { params });
    return response.data;
  },

  getSeller: async (id) => {
    const response = await apiClient.get(API_ENDPOINTS.SELLERS.ADMIN_SELLER_DETAIL(id));
    return response.data;
  },

  updateSellerStatus: async (id, status) => {
    const response = await apiClient.patch(
      API_ENDPOINTS.SELLERS.ADMIN_SELLER_STATUS(id),
      { status }
    );
    return response.data;
  },

  // Seller Earnings & Payouts Oversight
  getSellerEarningsOverview: async (params = {}) => {
    const response = await apiClient.get(API_ENDPOINTS.EARNINGS.ADMIN_OVERVIEW, { params });
    return response.data;
  },

  getSellerEarnings: async (sellerId, params = {}) => {
    const response = await apiClient.get(
      API_ENDPOINTS.EARNINGS.ADMIN_SELLER_EARNINGS(sellerId),
      { params }
    );
    return response.data;
  },

  getSellerPayouts: async (sellerId, params = {}) => {
    const response = await apiClient.get(
      API_ENDPOINTS.EARNINGS.ADMIN_SELLER_PAYOUTS(sellerId),
      { params }
    );
    return response.data;
  },

  recordSellerPayout: async (sellerId, payoutData) => {
    const payload = {
      ...payoutData,
      payout_date:
        payoutData.payout_date || new Date().toISOString().split('T')[0],
    };
    const response = await apiClient.post(
      API_ENDPOINTS.EARNINGS.ADMIN_SELLER_PAYOUTS(sellerId),
      payload
    );
    return response.data;
  },
};

export default adminService;

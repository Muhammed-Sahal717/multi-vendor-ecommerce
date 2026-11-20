import apiClient from '../../../lib/axios.js';
import { API_ENDPOINTS } from '../../../lib/constants.js';
import { uploadProductImage } from '../../../services/upload.js';

export const sellerService = {
  // Store Profile
  getProfile: async () => {
    const response = await apiClient.get(API_ENDPOINTS.SELLERS.PROFILE);
    return response.data;
  },

  updateProfile: async (profileData) => {
    const response = await apiClient.patch(API_ENDPOINTS.SELLERS.PROFILE, profileData);
    return response.data;
  },

  // Seller Products
  getProducts: async (params = {}) => {
    const response = await apiClient.get(API_ENDPOINTS.CATALOG.SELLER_PRODUCTS, { params });
    return response.data;
  },

  getProduct: async (slug) => {
    const response = await apiClient.get(API_ENDPOINTS.CATALOG.SELLER_PRODUCT_DETAIL(slug));
    return response.data;
  },

  createProduct: async (productData) => {
    const response = await apiClient.post(API_ENDPOINTS.CATALOG.SELLER_PRODUCTS, productData);
    return response.data;
  },

  updateProduct: async (slug, productData, isPartial = true) => {
    const method = isPartial ? 'patch' : 'put';
    const response = await apiClient[method](
      API_ENDPOINTS.CATALOG.SELLER_PRODUCT_DETAIL(slug),
      productData
    );
    return response.data;
  },

  // Product Images
  getProductImages: async (slug) => {
    const response = await apiClient.get(API_ENDPOINTS.CATALOG.SELLER_PRODUCT_IMAGES(slug));
    return response.data;
  },

  uploadImage: async (slug, file, extraData = {}, onProgress = null) => {
    return uploadProductImage(slug, file, extraData, onProgress);
  },

  deleteProductImage: async (slug, imageId) => {
    const response = await apiClient.delete(
      API_ENDPOINTS.CATALOG.SELLER_PRODUCT_IMAGE_DETAIL(slug, imageId)
    );
    return response.data;
  },

  // Seller Orders & Fulfillment
  getOrderItems: async (params = {}) => {
    const response = await apiClient.get(API_ENDPOINTS.ORDERS.SELLER_LIST, { params });
    return response.data;
  },

  getOrderItem: async (id) => {
    const response = await apiClient.get(API_ENDPOINTS.ORDERS.SELLER_DETAIL(id));
    return response.data;
  },

  updateFulfillmentStatus: async (id, status) => {
    const response = await apiClient.patch(API_ENDPOINTS.ORDERS.SELLER_STATUS(id), {
      status,
    });
    return response.data;
  },

  // Earnings & Payouts
  getEarningsDashboard: async () => {
    const response = await apiClient.get(API_ENDPOINTS.EARNINGS.SELLER_DASHBOARD);
    return response.data;
  },

  getEarningsHistory: async (params = {}) => {
    const response = await apiClient.get(API_ENDPOINTS.EARNINGS.SELLER_LIST, { params });
    return response.data;
  },

  getPayoutHistory: async (params = {}) => {
    const response = await apiClient.get(API_ENDPOINTS.EARNINGS.SELLER_PAYOUTS, { params });
    return response.data;
  },
};

export default sellerService;

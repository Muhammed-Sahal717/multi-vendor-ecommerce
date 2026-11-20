import apiClient from '../../../lib/axios.js';
import { API_ENDPOINTS } from '../../../lib/constants.js';

export const catalogService = {
  // Categories
  getCategories: async () => {
    const response = await apiClient.get(API_ENDPOINTS.CATALOG.CATEGORIES);
    return response.data;
  },

  getCategoryBySlug: async (slug) => {
    const response = await apiClient.get(API_ENDPOINTS.CATALOG.CATEGORY_DETAIL(slug));
    return response.data;
  },

  // Products
  getProducts: async (params = {}) => {
    const response = await apiClient.get(API_ENDPOINTS.CATALOG.PRODUCTS, { params });
    return response.data;
  },

  getProductBySlug: async (slug) => {
    const response = await apiClient.get(API_ENDPOINTS.CATALOG.PRODUCT_DETAIL(slug));
    return response.data;
  },
};

export default catalogService;

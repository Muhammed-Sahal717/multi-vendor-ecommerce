import apiClient from '../../../lib/axios.js';
import { API_ENDPOINTS } from '../../../lib/constants.js';

export const orderService = {
  getOrders: async (params = {}) => {
    const response = await apiClient.get(API_ENDPOINTS.ORDERS.LIST, { params });
    return response.data;
  },

  getOrderDetails: async (orderId) => {
    const response = await apiClient.get(API_ENDPOINTS.ORDERS.DETAIL(orderId));
    return response.data;
  },

  cancelOrderItem: async (orderId, itemId, payload = {}) => {
    const response = await apiClient.post(
      API_ENDPOINTS.ORDERS.CANCEL_ITEM(orderId, itemId),
      payload
    );
    return response.data;
  },
};

export default orderService;

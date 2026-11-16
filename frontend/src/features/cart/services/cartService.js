import apiClient from '../../../lib/axios.js';
import { API_ENDPOINTS } from '../../../lib/constants.js';

export const cartService = {
  getCart: async () => {
    const response = await apiClient.get(API_ENDPOINTS.CART.BASE);
    return response.data;
  },

  addItem: async (itemData) => {
    const response = await apiClient.post(API_ENDPOINTS.CART.ITEMS, itemData);
    return response.data;
  },

  updateItemQuantity: async (itemId, quantity) => {
    const response = await apiClient.patch(API_ENDPOINTS.CART.ITEM_DETAIL(itemId), {
      quantity,
    });
    return response.data;
  },

  removeItem: async (itemId) => {
    const response = await apiClient.delete(API_ENDPOINTS.CART.ITEM_DETAIL(itemId));
    return response.data;
  },
};

export default cartService;

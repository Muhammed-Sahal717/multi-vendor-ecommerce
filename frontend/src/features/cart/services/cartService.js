import apiClient from '../../../lib/axios.js';
import { API_ENDPOINTS } from '../../../lib/constants.js';

export const cartService = {
  getCart: async () => {
    const response = await apiClient.get(API_ENDPOINTS.CART.BASE);
    return response.data;
  },

  addItem: async (itemData) => {
    const payload = {
      product: itemData.product || itemData.productId || itemData.product_id,
      quantity: Number(itemData.quantity) || 1,
    };
    const response = await apiClient.post(API_ENDPOINTS.CART.ITEMS, payload);
    return response.data;
  },

  updateItemQuantity: async (itemId, quantity) => {
    const response = await apiClient.patch(API_ENDPOINTS.CART.ITEM_DETAIL(itemId), {
      quantity: Number(quantity),
    });
    return response.data;
  },

  removeItem: async (itemId) => {
    const response = await apiClient.delete(API_ENDPOINTS.CART.ITEM_DETAIL(itemId));
    return response.data;
  },
};

export default cartService;

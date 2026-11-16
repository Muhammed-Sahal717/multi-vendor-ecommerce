import apiClient from "../../../lib/axios.js";
import { API_ENDPOINTS } from "../../../lib/constants.js";

export const checkoutService = {
  /**
   * Places an order from the user's active cart.
   * @param {Object} payload
   * @param {string} payload.address_id - UUID of shipping address
   * @param {'cod'|'razorpay'} payload.payment_method - Payment method
   */
  placeOrder: async ({ address_id, payment_method, ...extra }) => {
    const response = await apiClient.post(API_ENDPOINTS.ORDERS.CHECKOUT, {
      address_id,
      payment_method,
      ...extra,
    });
    return response.data;
  },
};

export default checkoutService;

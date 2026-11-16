import apiClient from '../../../lib/axios.js';
import { API_ENDPOINTS } from '../../../lib/constants.js';

export const paymentService = {
  getPayments: async (params = {}) => {
    const response = await apiClient.get(API_ENDPOINTS.PAYMENTS.LIST, { params });
    return response.data;
  },

  getPaymentDetails: async (paymentId) => {
    const response = await apiClient.get(API_ENDPOINTS.PAYMENTS.DETAIL(paymentId));
    return response.data;
  },

  /**
   * Simulates an online payment outcome for the mock Razorpay integration.
   * @param {string|number} paymentId
   * @param {Object} [data] - e.g. { status: 'success' | 'failed' }
   */
  mockProcessPayment: async (paymentId, data = { status: 'success' }) => {
    const response = await apiClient.post(
      API_ENDPOINTS.PAYMENTS.MOCK_PROCESS(paymentId),
      data
    );
    return response.data;
  },
};

export default paymentService;

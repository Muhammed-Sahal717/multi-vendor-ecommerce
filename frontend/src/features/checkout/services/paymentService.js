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
   * @param {Object} [data] - e.g. { outcome: 'successful' | 'failed', failure_reason?: string }
   */
  mockProcessPayment: async (paymentId, data = { outcome: 'successful' }) => {
    const outcome =
      data.outcome ||
      (data.status === 'success' ? 'successful' : data.status) ||
      'successful';
    const payload = {
      outcome,
      failure_reason: data.failure_reason || '',
    };
    const response = await apiClient.post(
      API_ENDPOINTS.PAYMENTS.MOCK_PROCESS(paymentId),
      payload
    );
    return response.data;
  },
};

export default paymentService;

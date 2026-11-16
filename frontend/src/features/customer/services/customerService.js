import apiClient from '../../../lib/axios.js';
import { API_ENDPOINTS } from '../../../lib/constants.js';

export const customerService = {
  applyForSeller: async (applicationData) => {
    const response = await apiClient.post(
      API_ENDPOINTS.SELLERS.APPLICATIONS,
      applicationData
    );
    return response.data;
  },
};

export default customerService;

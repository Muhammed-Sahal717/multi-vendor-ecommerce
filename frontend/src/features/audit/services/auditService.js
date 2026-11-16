import apiClient from '../../../lib/axios.js';
import { API_ENDPOINTS } from '../../../lib/constants.js';

export const auditService = {
  /**
   * Fetches audit event logs (Superadmin only).
   * @param {Object} [params] - Filters: action, entity_type, actor, entity_id, date_from, date_to
   */
  getAuditLogs: async (params = {}) => {
    const response = await apiClient.get(API_ENDPOINTS.AUDIT.LOGS, { params });
    return response.data;
  },
};

export default auditService;

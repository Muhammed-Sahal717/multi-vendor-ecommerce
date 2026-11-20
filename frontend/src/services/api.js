import apiClient from '../lib/axios.js';

/**
 * Extracts a user-friendly error message from Axios/DRF errors
 */
export const getErrorMessage = (error) => {
  if (!error) return 'An unexpected error occurred.';

  const data = error.response?.data;
  if (!data) {
    return error.message || 'Unable to connect to the server.';
  }

  if (typeof data === 'string') return data;
  if (data.detail) return data.detail;
  if (data.message) return data.message;
  if (Array.isArray(data.non_field_errors)) return data.non_field_errors.join(' ');

  // If validation errors is an object: { field: ["error1", "error2"] }
  const firstKey = Object.keys(data)[0];
  if (firstKey) {
    const val = data[firstKey];
    if (Array.isArray(val)) return `${firstKey}: ${val.join(' ')}`;
    if (typeof val === 'string') return `${firstKey}: ${val}`;
  }

  return 'Operation failed. Please check your input.';
};

export const api = {
  get: async (url, config = {}) => {
    const res = await apiClient.get(url, config);
    return res.data;
  },

  post: async (url, data = {}, config = {}) => {
    const res = await apiClient.post(url, data, config);
    return res.data;
  },

  put: async (url, data = {}, config = {}) => {
    const res = await apiClient.put(url, data, config);
    return res.data;
  },

  patch: async (url, data = {}, config = {}) => {
    const res = await apiClient.patch(url, data, config);
    return res.data;
  },

  delete: async (url, config = {}) => {
    const res = await apiClient.delete(url, config);
    return res.data;
  },
};

export default api;

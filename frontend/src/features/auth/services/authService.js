import apiClient from '../../../lib/axios.js';
import { API_ENDPOINTS } from '../../../lib/constants.js';
import { uploadProfileImage } from '../../../services/upload.js';

export const authService = {
  // Authentication
  register: async (userData) => {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.REGISTER, userData);
    return response.data;
  },

  login: async (credentials) => {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.LOGIN, credentials);
    return response.data;
  },

  refreshToken: async (refreshToken) => {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.REFRESH_TOKEN, {
      refresh: refreshToken,
    });
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await apiClient.get(API_ENDPOINTS.AUTH.ME);
    return response.data;
  },

  // Profile Management
  getProfile: async () => {
    const response = await apiClient.get(API_ENDPOINTS.AUTH.PROFILE);
    return response.data;
  },

  updateProfile: async (profileData, isPartial = true) => {
    const method = isPartial ? 'patch' : 'put';
    const response = await apiClient[method](API_ENDPOINTS.AUTH.PROFILE, profileData);
    return response.data;
  },

  uploadAvatar: async (file, onUploadProgress = null) => {
    return uploadProfileImage(file, onUploadProgress);
  },

  // Address Management
  getAddresses: async () => {
    const response = await apiClient.get(API_ENDPOINTS.AUTH.ADDRESSES);
    return response.data;
  },

  createAddress: async (addressData) => {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.ADDRESSES, addressData);
    return response.data;
  },

  getAddress: async (id) => {
    const response = await apiClient.get(API_ENDPOINTS.AUTH.ADDRESS_DETAIL(id));
    return response.data;
  },

  updateAddress: async (id, addressData) => {
    const response = await apiClient.patch(API_ENDPOINTS.AUTH.ADDRESS_DETAIL(id), addressData);
    return response.data;
  },

  deleteAddress: async (id) => {
    const response = await apiClient.delete(API_ENDPOINTS.AUTH.ADDRESS_DETAIL(id));
    return response.data;
  },
};

export default authService;

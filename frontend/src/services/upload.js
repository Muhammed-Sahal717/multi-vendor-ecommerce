import apiClient from '../lib/axios.js';
import { API_ENDPOINTS } from '../lib/constants.js';

/**
 * Generic helper for uploading files via multipart/form-data
 */
export const uploadFormData = async (url, formData, method = 'post', onUploadProgress = null) => {
  const response = await apiClient({
    url,
    method,
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress,
  });

  return response.data;
};

/**
 * Uploads user profile image
 */
export const uploadProfileImage = async (file, onUploadProgress = null) => {
  const formData = new FormData();
  formData.append('image', file);

  return uploadFormData(
    API_ENDPOINTS.AUTH.PROFILE_IMAGE,
    formData,
    'patch',
    onUploadProgress
  );
};

/**
 * Uploads an image for a seller product
 */
export const uploadProductImage = async (productSlug, file, extraData = {}, onUploadProgress = null) => {
  const formData = new FormData();
  formData.append('image', file);

  Object.entries(extraData).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, value);
    }
  });

  return uploadFormData(
    API_ENDPOINTS.CATALOG.SELLER_PRODUCT_IMAGES(productSlug),
    formData,
    'post',
    onUploadProgress
  );
};

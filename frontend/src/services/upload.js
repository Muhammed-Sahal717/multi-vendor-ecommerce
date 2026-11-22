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
  formData.append('profile_image', file);

  try {
    return await uploadFormData(
      API_ENDPOINTS.AUTH.PROFILE_IMAGE,
      formData,
      'patch',
      onUploadProgress
    );
  } catch (error) {
    // If PATCH /auth/profile/image/ fails with 404 or 405, fallback to PATCH /auth/profile/
    if (error?.response?.status === 404 || error?.response?.status === 405) {
      return await uploadFormData(
        API_ENDPOINTS.AUTH.PROFILE,
        formData,
        'patch',
        onUploadProgress
      );
    }
    throw error;
  }
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

export { cn } from 'cn';

/**
 * Resolves media URLs (e.g., /media/...) against the backend origin if relative.
 */
export const getMediaUrl = (url) => {
  if (!url) return null;
  if (typeof url === 'object') {
    url = url.url || url.image || url.file || url.src;
  }
  if (!url || typeof url !== 'string') return null;

  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:') ||
    url.startsWith('blob:')
  ) {
    return url;
  }

  try {
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
    const origin = new URL(apiBase, window?.location?.origin || 'http://localhost:8000').origin;
    return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
  } catch {
    return `http://localhost:8000${url.startsWith('/') ? '' : '/'}${url}`;
  }
};

/**
 * Extracts and formats the user/artisan profile avatar URL across various DRF patterns.
 */
export const getUserAvatarUrl = (userOrProfile) => {
  if (!userOrProfile) return null;
  const raw =
    userOrProfile.profile_image ||
    userOrProfile.image ||
    userOrProfile.avatar ||
    userOrProfile.profile_picture ||
    userOrProfile.profile?.profile_image ||
    userOrProfile.profile?.image ||
    userOrProfile.profile?.avatar ||
    userOrProfile.user?.profile_image ||
    userOrProfile.user?.image ||
    userOrProfile.user?.avatar;

  return getMediaUrl(raw);
};

/**
 * Extracts and formats the primary image URL for a product from various DRF schema patterns.
 */
export const getProductImageUrl = (product) => {
  if (!product) return null;

  // If already a URL string
  if (typeof product === 'string') {
    return getMediaUrl(product);
  }

  let rawUrl = null;

  // 1. primary_image field (can be string or object)
  if (product.primary_image) {
    if (typeof product.primary_image === 'string') {
      rawUrl = product.primary_image;
    } else if (typeof product.primary_image === 'object') {
      rawUrl =
        product.primary_image.image ||
        product.primary_image.url ||
        product.primary_image.file;
    }
  }

  // 2. nested product object if product is a cart item or order item
  if (!rawUrl && product.product && typeof product.product === 'object') {
    return getProductImageUrl(product.product);
  }

  // 3. images array: find explicit is_primary or fallback to first image
  if (!rawUrl && Array.isArray(product.images) && product.images.length > 0) {
    const primaryImg =
      product.images.find((img) => img && (img.is_primary || img.isPrimary)) ||
      product.images[0];

    if (typeof primaryImg === 'string') {
      rawUrl = primaryImg;
    } else if (typeof primaryImg === 'object' && primaryImg !== null) {
      rawUrl = primaryImg.image || primaryImg.url || primaryImg.file;
    }
  }

  // 4. direct image, thumbnail, or product_image fields
  if (!rawUrl) {
    rawUrl =
      product.image ||
      product.thumbnail ||
      product.cover_image ||
      product.product_image;
  }

  return getMediaUrl(rawUrl);
};

/**
 * Pure date formatting helper that avoids calling Date.now() during render.
 */
export const formatDate = (dateStr, options = { month: 'short', day: 'numeric', year: 'numeric' }) => {
  if (!dateStr) return 'Recent';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Recent';
    return d.toLocaleDateString('en-US', options);
  } catch {
    return 'Recent';
  }
};


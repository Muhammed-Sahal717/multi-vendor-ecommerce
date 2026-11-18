export { cn } from 'cn';

/**
 * Resolves media URLs (e.g., /media/...) against the backend origin if relative.
 */
export const getMediaUrl = (url) => {
  if (!url) return null;
  if (typeof url !== 'string') return null;

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
 * Extracts and formats the primary image URL for a product from various DRF schema patterns.
 */
export const getProductImageUrl = (product) => {
  if (!product) return null;

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

  // 2. images array: find explicit is_primary or fallback to first image
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

  // 3. direct image or thumbnail fields
  if (!rawUrl) {
    rawUrl = product.image || product.thumbnail || product.cover_image;
  }

  return getMediaUrl(rawUrl);
};

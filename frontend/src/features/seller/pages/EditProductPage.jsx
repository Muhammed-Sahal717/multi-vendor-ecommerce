import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Package,
  Upload,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  XCircle,
  Star,
} from 'lucide-react';
import { sellerService } from '../services/sellerService.js';
import { catalogService } from '../../storefront/services/catalogService.js';
import { queryKeys } from '../../../lib/queryClient.js';
import { ROUTE_PATHS } from '../../../routes/routePaths.js';
import { getProductImageUrl } from '../../../lib/utils.js';
import { Card } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Input } from '../../../components/ui/input.jsx';
import { Label } from '../../../components/ui/label.jsx';
import { Textarea } from '../../../components/ui/textarea.jsx';
import { Badge } from '../../../components/ui/badge.jsx';

export const EditProductPage = () => {
  const { slug } = useParams();
  const queryClient = useQueryClient();

  const [formSuccess, setFormSuccess] = useState('');
  const [formError, setFormError] = useState('');
  const [uploadError, setUploadError] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    sku: '',
    price: '',
    stock: '',
    description: '',
    is_active: true,
  });

  // Fetch product data
  const { data: product, isLoading: isProductLoading, isError: isProductError } = useQuery({
    queryKey: queryKeys.seller.product(slug),
    queryFn: () => sellerService.getProduct(slug),
    enabled: !!slug,
  });

  // Fetch product images
  const { data: imagesData, isLoading: isImagesLoading } = useQuery({
    queryKey: queryKeys.seller.images(slug),
    queryFn: () => sellerService.getProductImages(slug),
    enabled: !!slug,
  });

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: queryKeys.catalog.categories(),
    queryFn: catalogService.getCategories,
  });

  const categories = Array.isArray(categoriesData)
    ? categoriesData
    : categoriesData?.results || [];
  const images = Array.isArray(imagesData) ? imagesData : imagesData?.results || [];

  // Sync state from server product (React docs compliant state sync on render)
  const [syncedSlug, setSyncedSlug] = useState('');
  if (product && syncedSlug !== product.slug) {
    setSyncedSlug(product.slug);
    setFormData({
      name: product.name || '',
      category: product.category || '',
      sku: product.sku || '',
      price: product.price || '',
      stock: product.stock !== undefined ? product.stock : '',
      description: product.description || '',
      is_active: product.is_active ?? true,
    });
  }

  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: (data) => sellerService.updateProduct(slug, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.seller.product(slug) });
      queryClient.invalidateQueries({ queryKey: queryKeys.seller.all });
      setFormSuccess('Product details saved successfully!');
      setFormError('');
      setTimeout(() => setFormSuccess(''), 3000);
    },
    onError: (err) => {
      const data = err?.response?.data;
      if (typeof data === 'object') {
        const firstKey = Object.keys(data)[0];
        setFormError(`${firstKey}: ${data[firstKey]}`);
      } else {
        setFormError(err?.message || 'Failed to update product.');
      }
    },
  });

  // Upload image mutation
  const uploadImageMutation = useMutation({
    mutationFn: ({ file, is_primary }) =>
      sellerService.uploadImage(slug, file, { is_primary }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.seller.images(slug) });
      queryClient.invalidateQueries({ queryKey: queryKeys.seller.product(slug) });
      setUploadError('');
    },
    onError: (err) => {
      setUploadError(err?.response?.data?.detail || err?.message || 'Failed to upload image.');
    },
  });

  // Delete image mutation
  const deleteImageMutation = useMutation({
    mutationFn: (imageId) => sellerService.deleteProductImage(slug, imageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.seller.images(slug) });
      queryClient.invalidateQueries({ queryKey: queryKeys.seller.product(slug) });
    },
  });

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    updateProductMutation.mutate({
      ...formData,
      price: parseFloat(formData.price),
      stock: parseInt(formData.stock, 10),
    });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadImageMutation.mutate({
        file,
        is_primary: images.length === 0,
      });
      e.target.value = '';
    }
  };

  if (isProductLoading) {
    return (
      <div className="py-16 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
        <Loader2 size={16} className="animate-spin text-primary" />
        <span>Loading product details...</span>
      </div>
    );
  }

  if (isProductError || !product) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-center space-y-2">
        <p className="text-sm font-semibold text-destructive">Product not found.</p>
        <Button asChild size="sm" className="rounded-xl text-xs bg-primary text-primary-foreground">
          <Link to={ROUTE_PATHS.SELLER.PRODUCTS}>Back to Products</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="space-y-2 border-b border-border pb-4">
        <Link
          to={ROUTE_PATHS.SELLER.PRODUCTS}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft size={13} />
          <span>Back to Catalog</span>
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
            Edit: {product.name}
          </h1>

          <div className="flex items-center gap-2">
            {product.status === 'approved' ? (
              <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 font-bold text-xs gap-1 py-0.5">
                <CheckCircle2 size={12} /> Approved
              </Badge>
            ) : product.status === 'pending' ? (
              <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-600 font-bold text-xs gap-1 py-0.5">
                <Clock size={12} /> Pending Review
              </Badge>
            ) : (
              <Badge variant="destructive" className="font-bold text-xs gap-1 py-0.5">
                <XCircle size={12} /> Rejected
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Moderation Rejection Alert if rejected */}
      {product.status === 'rejected' && product.rejection_reason && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive space-y-1">
          <p className="font-bold flex items-center gap-1.5">
            <AlertCircle size={14} /> Moderation Review Feedback:
          </p>
          <p className="pl-5 leading-relaxed">{product.rejection_reason}</p>
        </div>
      )}

      {/* Success / Error Feedback */}
      {formSuccess && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
          <CheckCircle2 size={15} />
          <span>{formSuccess}</span>
        </div>
      )}

      {formError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
          <AlertCircle size={15} />
          <span>{formError}</span>
        </div>
      )}

      {/* 1. Product Images Gallery Card */}
      <Card className="p-6 rounded-3xl border border-border bg-card shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h2 className="text-base font-bold text-foreground">Product Gallery & Media</h2>
            <p className="text-xs text-muted-foreground">Upload multiple photos showing different angles, packaging, and handmade textures.</p>
          </div>

          <label
            htmlFor="product-image-upload"
            className="inline-flex items-center gap-1.5 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 text-xs px-3.5 py-2 shadow-2xs cursor-pointer transition-transform active:scale-95"
          >
            <Upload size={14} />
            <span>Upload Photo</span>
            <input
              id="product-image-upload"
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploadImageMutation.isPending}
            />
          </label>
        </div>

        {uploadError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            {uploadError}
          </div>
        )}

        {isImagesLoading ? (
          <div className="py-6 text-center text-xs text-muted-foreground">Loading gallery photos...</div>
        ) : images.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center space-y-2">
            <Package size={28} className="mx-auto text-muted-foreground opacity-60" />
            <p className="text-xs font-semibold text-foreground">No photos uploaded yet</p>
            <p className="text-[11px] text-muted-foreground">Upload at least one primary photo so customers can see your creation.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {images.map((img) => {
              const url = getProductImageUrl(img.image);
              return (
                <div
                  key={img.id}
                  className="group relative aspect-square overflow-hidden rounded-2xl border border-border bg-muted/30"
                >
                  <img
                    src={url}
                    alt={img.alt_text || product.name}
                    className="h-full w-full object-cover object-center transition-transform group-hover:scale-105"
                  />

                  {img.is_primary && (
                    <div className="absolute top-2 left-2 rounded-lg bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground shadow-xs flex items-center gap-1">
                      <Star size={10} className="fill-current" />
                      <span>Primary</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => deleteImageMutation.mutate(img.id)}
                    disabled={deleteImageMutation.isPending}
                    className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 hover:bg-destructive transition-all cursor-pointer"
                    title="Delete image"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* 2. Product Information Form Card */}
      <Card className="p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-xs">
        <form onSubmit={handleFormSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="e_name" className="text-xs font-semibold">
              Product Title *
            </Label>
            <Input
              id="e_name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="h-10 text-xs rounded-xl"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="e_category" className="text-xs font-semibold">
                Category *
              </Label>
              <select
                id="e_category"
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className="w-full h-10 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground focus:outline-none"
                required
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="e_sku" className="text-xs font-semibold">
                SKU (Stock Keeping Unit) *
              </Label>
              <Input
                id="e_sku"
                value={formData.sku}
                onChange={(e) => handleInputChange('sku', e.target.value)}
                className="h-10 text-xs rounded-xl font-mono"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="e_price" className="text-xs font-semibold">
                Price (₹ INR) *
              </Label>
              <Input
                id="e_price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => handleInputChange('price', e.target.value)}
                className="h-10 text-xs rounded-xl"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="e_stock" className="text-xs font-semibold">
                Stock Inventory *
              </Label>
              <Input
                id="e_stock"
                type="number"
                min="0"
                value={formData.stock}
                onChange={(e) => handleInputChange('stock', e.target.value)}
                className="h-10 text-xs rounded-xl"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="e_description" className="text-xs font-semibold">
              Description & Craft Details *
            </Label>
            <Textarea
              id="e_description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="min-h-28 text-xs rounded-xl"
              required
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              id="e_is_active"
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => handleInputChange('is_active', e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
            />
            <Label htmlFor="e_is_active" className="text-xs font-medium text-foreground cursor-pointer">
              Product is active and purchasable by customers (when approved)
            </Label>
          </div>

          <div className="flex justify-end pt-4 border-t border-border">
            <Button
              type="submit"
              disabled={updateProductMutation.isPending}
              className="h-10 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 text-xs px-6 shadow-xs cursor-pointer gap-2"
            >
              {updateProductMutation.isPending ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default EditProductPage;

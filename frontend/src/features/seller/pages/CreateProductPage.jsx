import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Package,
  Sparkles,
  AlertCircle,
  Loader2,
  Wand2,
} from 'lucide-react';
import { sellerService } from '../services/sellerService.js';
import { catalogService } from '../../storefront/services/catalogService.js';
import { queryKeys } from '../../../lib/queryClient.js';
import { ROUTE_PATHS } from '../../../routes/routePaths.js';
import { Card } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Input } from '../../../components/ui/input.jsx';
import { Label } from '../../../components/ui/label.jsx';
import { Textarea } from '../../../components/ui/textarea.jsx';

export const CreateProductPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    sku: '',
    price: '',
    stock: '',
    description: '',
    is_active: true,
  });

  // Fetch categories
  const { data: categoriesData, isLoading: isCategoriesLoading } = useQuery({
    queryKey: queryKeys.catalog.categories(),
    queryFn: catalogService.getCategories,
  });

  const categories = Array.isArray(categoriesData)
    ? categoriesData
    : categoriesData?.results || [];

  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: (data) => sellerService.createProduct(data),
    onSuccess: (product) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.seller.all });
      // Redirect to edit page so images can be attached
      navigate(ROUTE_PATHS.SELLER.EDIT_PRODUCT(product.slug), {
        state: { newlyCreated: true },
      });
    },
    onError: (err) => {
      const data = err?.response?.data;
      if (typeof data === 'object') {
        const firstKey = Object.keys(data)[0];
        const val = Array.isArray(data[firstKey]) ? data[firstKey][0] : data[firstKey];
        setFormError(`${firstKey}: ${val}`);
      } else {
        setFormError(err?.message || 'Failed to create product listing.');
      }
    },
  });

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleGenerateSKU = () => {
    if (!formData.name) return;
    const prefix = formData.name
      .split(' ')
      .slice(0, 2)
      .map((w) => w.substring(0, 3).toUpperCase())
      .join('-');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    setFormData((prev) => ({ ...prev, sku: `${prefix}-${randomSuffix}` }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    if (
      !formData.name ||
      !formData.category ||
      !formData.sku ||
      !formData.price ||
      !formData.stock ||
      !formData.description
    ) {
      setFormError('Please fill in all required fields.');
      return;
    }

    createProductMutation.mutate({
      ...formData,
      price: parseFloat(formData.price),
      stock: parseInt(formData.stock, 10),
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="space-y-1 border-b border-border pb-4">
        <Link
          to={ROUTE_PATHS.SELLER.PRODUCTS}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors mb-1"
        >
          <ArrowLeft size={13} />
          <span>Back to Catalog</span>
        </Link>
        <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
          List a New Artisan Creation
        </h1>
        <p className="text-xs text-muted-foreground">
          Provide your product information, crafting details, and inventory count.
        </p>
      </div>

      {formError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
          <AlertCircle size={15} className="shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* Form Card */}
      <Card className="p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-xs">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Product Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-semibold">
              Product Title *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="e.g. Cold-Pressed Pure Castor Oil 200ml"
              className="h-10 text-xs rounded-xl"
              required
            />
          </div>

          {/* Category & SKU */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="category" className="text-xs font-semibold">
                Category *
              </Label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className="w-full h-10 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                required
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="sku" className="text-xs font-semibold">
                  SKU (Stock Keeping Unit) *
                </Label>
                <button
                  type="button"
                  onClick={handleGenerateSKU}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                >
                  <Wand2 size={11} />
                  <span>Auto-generate</span>
                </button>
              </div>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => handleInputChange('sku', e.target.value)}
                placeholder="e.g. CAS-OIL-1001"
                className="h-10 text-xs rounded-xl font-mono"
                required
              />
            </div>
          </div>

          {/* Price & Stock Inventory */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="price" className="text-xs font-semibold">
                Selling Price (₹ INR) *
              </Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="1"
                value={formData.price}
                onChange={(e) => handleInputChange('price', e.target.value)}
                placeholder="₹ 499.00"
                className="h-10 text-xs rounded-xl"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="stock" className="text-xs font-semibold">
                Available Stock Inventory *
              </Label>
              <Input
                id="stock"
                type="number"
                min="0"
                step="1"
                value={formData.stock}
                onChange={(e) => handleInputChange('stock', e.target.value)}
                placeholder="e.g. 50"
                className="h-10 text-xs rounded-xl"
                required
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs font-semibold">
              Product Story & Detailed Description *
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Highlight handcrafted ingredients, artisan methods, benefits, usage instructions..."
              className="min-h-28 text-xs rounded-xl"
              required
            />
          </div>

          {/* Active status */}
          <div className="flex items-center gap-2 pt-2">
            <input
              id="is_active"
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => handleInputChange('is_active', e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
            />
            <Label htmlFor="is_active" className="text-xs font-medium text-foreground cursor-pointer">
              List as active (visible on storefront after admin review approval)
            </Label>
          </div>

          {/* Submission CTA */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button asChild variant="outline" size="sm" className="rounded-xl text-xs">
              <Link to={ROUTE_PATHS.SELLER.PRODUCTS}>Cancel</Link>
            </Button>
            <Button
              type="submit"
              disabled={createProductMutation.isPending || isCategoriesLoading}
              className="h-10 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 text-xs px-6 shadow-xs cursor-pointer gap-2"
            >
              {createProductMutation.isPending ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Creating Listing...</span>
                </>
              ) : (
                <>
                  <span>Create & Add Images</span>
                  <Sparkles size={14} />
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default CreateProductPage;

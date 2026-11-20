import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package,
  Plus,
  Search,
  Edit2,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Loader2,
  Eye,
  Layers,
} from 'lucide-react';
import { sellerService } from '../services/sellerService.js';
import { queryKeys } from '../../../lib/queryClient.js';
import { ROUTE_PATHS } from '../../../routes/routePaths.js';
import { getProductImageUrl } from '../../../lib/utils.js';
import { Card } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Input } from '../../../components/ui/input.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { PriceDisplay } from '../../../components/common/PriceDisplay.jsx';

const STATUS_FILTERS = [
  { label: 'All Products', value: '' },
  { label: 'Approved', value: 'approved' },
  { label: 'Pending Review', value: 'pending' },
  { label: 'Rejected', value: 'rejected' },
];

export const ProductsPage = () => {
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch seller products
  const { data: productsData, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.seller.products({
      status: selectedStatus || undefined,
      search: searchQuery || undefined,
    }),
    queryFn: () =>
      sellerService.getProducts({
        status: selectedStatus || undefined,
        search: searchQuery || undefined,
      }),
  });

  // Toggle active status mutation
  const toggleActiveMutation = useMutation({
    mutationFn: ({ slug, is_active }) =>
      sellerService.updateProduct(slug, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.seller.all });
    },
  });

  const products = Array.isArray(productsData) ? productsData : productsData?.results || [];

  const getStatusBadge = (status, rejectionReason) => {
    switch (status) {
      case 'approved':
        return (
          <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 font-bold text-xs py-0.5 gap-1">
            <CheckCircle2 size={12} />
            <span>Approved</span>
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-600 font-bold text-xs py-0.5 gap-1">
            <Clock size={12} />
            <span>Pending Review</span>
          </Badge>
        );
      case 'rejected':
        return (
          <div className="flex flex-col gap-1">
            <Badge variant="destructive" className="font-bold text-xs py-0.5 gap-1">
              <XCircle size={12} />
              <span>Rejected</span>
            </Badge>
            {rejectionReason && (
              <span className="text-[10px] text-destructive max-w-xs">{rejectionReason}</span>
            )}
          </div>
        );
      default:
        return <Badge variant="outline" className="capitalize text-xs">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
            Product Catalog & Inventory
          </h1>
          <p className="text-xs text-muted-foreground">
            Manage your listings, stock inventory, and moderation status.
          </p>
        </div>

        <Button asChild size="sm" className="h-10 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 text-xs px-4 shadow-xs gap-1.5 cursor-pointer shrink-0">
          <Link to={ROUTE_PATHS.SELLER.CREATE_PRODUCT}>
            <Plus size={15} />
            <span>Add New Product</span>
          </Link>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          {STATUS_FILTERS.map((filter) => {
            const isSelected = selectedStatus === filter.value;
            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => setSelectedStatus(filter.value)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-card border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative max-w-xs w-full">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or SKU..."
            className="pl-9 h-9 text-xs rounded-xl"
          />
        </div>
      </div>

      {isLoading && (
        <div className="py-16 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 size={16} className="animate-spin text-primary" />
          <span>Loading products...</span>
        </div>
      )}

      {isError && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5 text-center space-y-2">
          <p className="text-xs text-destructive font-semibold">Failed to load product catalog.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs">
            Retry
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && products.length === 0 && (
        <Card className="rounded-3xl border border-dashed border-border p-12 text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Package size={28} />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-foreground">No products found</h2>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {searchQuery || selectedStatus
                ? 'No products matched your search or status filter.'
                : 'Your studio has not listed any products yet. Create your first product listing!'}
            </p>
          </div>
          <Button asChild className="rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 text-xs px-5 shadow-xs gap-1.5">
            <Link to={ROUTE_PATHS.SELLER.CREATE_PRODUCT}>
              <Plus size={14} />
              <span>Create Product</span>
            </Link>
          </Button>
        </Card>
      )}

      {/* Products Grid / Cards */}
      <div className="space-y-3">
        {products.map((product) => {
          const imgUrl = getProductImageUrl(product.primary_image || product.images?.[0]?.image);
          const isLowStock = product.stock <= 5 && product.stock > 0;
          const isOutOfStock = product.stock === 0;

          return (
            <Card
              key={product.id}
              className="p-4 sm:p-5 rounded-2xl border border-border bg-card hover:border-primary/30 transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            >
              <div className="flex items-start gap-4 flex-1 min-w-0">
                {/* Product Thumbnail */}
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border bg-muted/40">
                  {imgUrl ? (
                    <img
                      src={imgUrl}
                      alt={product.name}
                      className="h-full w-full object-cover object-center"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <Package size={20} />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-foreground text-sm line-clamp-1">{product.name}</h3>
                    {getStatusBadge(product.status, product.rejection_reason)}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Layers size={12} className="text-primary" />
                      <span>{product.category_name || 'Category'}</span>
                    </span>
                    <span className="font-mono text-[11px]">SKU: {product.sku || 'N/A'}</span>
                    <span className={`font-semibold ${isOutOfStock ? 'text-destructive' : isLowStock ? 'text-chart-5' : 'text-foreground'}`}>
                      Stock: {product.stock} {isOutOfStock ? '(Out of Stock)' : isLowStock ? '(Low)' : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Price, Toggle, & Edit Action */}
              <div className="flex items-center justify-between sm:justify-end gap-5 border-t border-border/60 pt-3 sm:border-0 sm:pt-0 shrink-0">
                <PriceDisplay price={product.price} size="md" className="font-extrabold text-foreground" />

                {/* Active / Inactive switch button */}
                <button
                  type="button"
                  onClick={() =>
                    toggleActiveMutation.mutate({
                      slug: product.slug,
                      is_active: !product.is_active,
                    })
                  }
                  disabled={toggleActiveMutation.isPending}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                    product.is_active
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                      : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted'
                  }`}
                  title="Toggle product listing visibility"
                >
                  {product.is_active ? 'Active' : 'Hidden'}
                </button>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button asChild variant="outline" size="sm" className="h-8 rounded-xl text-xs font-semibold gap-1.5 border-border hover:border-primary/40 hover:bg-primary/5">
                    <Link to={ROUTE_PATHS.SELLER.EDIT_PRODUCT(product.slug)}>
                      <Edit2 size={12} />
                      <span>Edit</span>
                    </Link>
                  </Button>

                  {product.status === 'approved' && (
                    <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg" title="View product on storefront">
                      <Link to={`/products/${product.slug}`} target="_blank">
                        <Eye size={14} />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default ProductsPage;

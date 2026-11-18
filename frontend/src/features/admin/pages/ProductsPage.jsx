import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Package,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Store,
  Layers,
  AlertCircle,
  Loader2,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { adminService } from '../services/adminService.js';
import { queryKeys } from '../../../lib/queryClient.js';
import { ROUTE_PATHS } from '../../../routes/routePaths.js';
import { getProductImageUrl } from '../../../lib/utils.js';
import { Card } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Input } from '../../../components/ui/input.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { PriceDisplay } from '../../../components/common/PriceDisplay.jsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../../components/ui/dialog.jsx';
import { Textarea } from '../../../components/ui/textarea.jsx';
import { Label } from '../../../components/ui/label.jsx';

const STATUS_FILTERS = [
  { label: 'All Products', value: '' },
  { label: 'Pending Review', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
];

export const ProductsPage = () => {
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');

  // Moderation Dialog State
  const [reviewModalProduct, setReviewModalProduct] = useState(null);
  const [reviewAction, setReviewAction] = useState('approve'); // 'approve' | 'reject'
  const [rejectionReason, setRejectionReason] = useState('');
  const [modalError, setModalError] = useState('');

  // Fetch admin products
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.admin.products({
      status: selectedStatus || undefined,
      search: searchQuery || undefined,
    }),
    queryFn: () =>
      adminService.getProducts({
        status: selectedStatus || undefined,
        search: searchQuery || undefined,
      }),
  });

  // Mutation for review
  const reviewMutation = useMutation({
    mutationFn: ({ slug, status, rejection_reason }) =>
      adminService.reviewProduct(slug, { status, rejection_reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      setReviewModalProduct(null);
      setRejectionReason('');
      setModalError('');
    },
    onError: (err) => {
      const data = err?.response?.data;
      const msg =
        (typeof data === 'string' && data) ||
        data?.detail ||
        (Array.isArray(data?.status) && data.status[0]) ||
        (Array.isArray(data?.rejection_reason) && data.rejection_reason[0]) ||
        data?.message ||
        err?.message ||
        'Failed to submit product review';
      setModalError(msg);
    },
  });

  const rawProducts = Array.isArray(data) ? data : data?.results || [];
  const products = rawProducts.filter((prod) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      prod.title?.toLowerCase().includes(q) ||
      prod.seller_name?.toLowerCase().includes(q) ||
      prod.category?.name?.toLowerCase().includes(q)
    );
  });

  const handleOpenReview = (product, defaultAction = 'approve') => {
    setReviewModalProduct(product);
    setReviewAction(defaultAction);
    setRejectionReason('');
    setModalError('');
  };

  const handleConfirmReview = () => {
    if (!reviewModalProduct) return;
    if (reviewAction === 'reject' && !rejectionReason.trim()) {
      setModalError('Please specify the reason for rejecting this product.');
      return;
    }
    const decisionStatus = reviewAction === 'approve' ? 'approved' : 'rejected';
    reviewMutation.mutate({
      slug: reviewModalProduct.slug,
      status: decisionStatus,
      rejection_reason: rejectionReason.trim(),
    });
  };

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return (
          <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 font-bold text-xs py-0.5 gap-1">
            <CheckCircle2 size={12} />
            <span>Approved</span>
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="outline" className="border-rose-500/40 bg-rose-500/10 text-rose-600 font-bold text-xs py-0.5 gap-1">
            <XCircle size={12} />
            <span>Rejected</span>
          </Badge>
        );
      case 'pending':
      default:
        return (
          <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-600 font-bold text-xs py-0.5 gap-1">
            <Clock size={12} />
            <span>Pending Review</span>
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
              Product Moderation
            </h1>
            <Badge variant="secondary" className="font-bold text-xs">
              {products.length}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Audit artisan listings, verify quality guidelines and authenticity before products appear in the storefront.
          </p>
        </div>
      </div>

      {/* Filters Toolbar */}
      <Card className="p-4 border-border/80 bg-card/60 backdrop-blur-xs space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-muted/60 p-1 rounded-xl">
            {STATUS_FILTERS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setSelectedStatus(tab.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  selectedStatus === tab.value
                    ? 'bg-card text-foreground shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search title, seller, category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs rounded-xl bg-card border-border"
            />
          </div>
        </div>
      </Card>

      {/* Product Moderation List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-5 animate-pulse border-border bg-card">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 bg-muted rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 bg-muted rounded" />
                  <div className="h-3 w-1/4 bg-muted/60 rounded" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <Card className="p-8 text-center border-destructive/20 bg-destructive/5 space-y-3">
          <AlertCircle size={32} className="mx-auto text-destructive" />
          <h3 className="text-sm font-bold text-foreground">Failed to load moderation queue</h3>
          <p className="text-xs text-muted-foreground">Unable to fetch products for review.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="cursor-pointer">
            Retry
          </Button>
        </Card>
      ) : products.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-border bg-card/40 space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Package size={28} />
          </div>
          <h3 className="text-sm font-bold text-foreground">No products in this queue</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {selectedStatus
              ? `There are currently no products with ${selectedStatus} status.`
              : 'No products matched your search.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {products.map((product) => {
            const imageUrl = getProductImageUrl(
              product.primary_image?.image || product.images?.[0]?.image || product.image
            );
            return (
              <Card
                key={product.id || product.slug}
                className="p-5 border-border bg-card hover:border-primary/30 transition-all shadow-2xs space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  {/* Thumbnail & Title */}
                  <div className="flex items-start gap-4">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-border bg-muted/30">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={product.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
                          <Package size={24} />
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-extrabold text-foreground">
                          {product.title}
                        </h3>
                        {getStatusBadge(product.status)}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Store size={13} className="text-primary/70" />
                          <span className="font-semibold text-foreground">
                            {product.seller_name || product.seller?.store_name || 'Artisan Seller'}
                          </span>
                        </div>

                        {product.category && (
                          <div className="flex items-center gap-1">
                            <Layers size={13} className="text-muted-foreground" />
                            <span>{product.category?.name || product.category}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">Stock:</span>
                          <span className="font-bold text-foreground">
                            {product.stock ?? product.inventory ?? '0'} units
                          </span>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="pt-1">
                        <PriceDisplay
                          price={product.price}
                          originalPrice={product.original_price}
                          size="md"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 sm:self-center">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="rounded-xl text-xs h-8 px-3 text-muted-foreground hover:text-foreground cursor-pointer gap-1.5"
                    >
                      <Link to={ROUTE_PATHS.STOREFRONT.PRODUCT_DETAILS(product.slug)} target="_blank">
                        <ExternalLink size={12} />
                        <span>Preview</span>
                      </Link>
                    </Button>

                    {product.status === 'pending' ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleOpenReview(product, 'approve')}
                          className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-3 gap-1.5 shadow-2xs cursor-pointer"
                        >
                          <CheckCircle2 size={13} />
                          <span>Approve</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenReview(product, 'reject')}
                          className="rounded-xl font-bold border-rose-500/40 text-rose-600 hover:bg-rose-500/10 text-xs h-8 px-3 gap-1.5 cursor-pointer"
                        >
                          <XCircle size={13} />
                          <span>Reject</span>
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleOpenReview(
                            product,
                            product.status === 'approved' ? 'reject' : 'approve'
                          )
                        }
                        className="rounded-xl text-xs h-8 px-3 font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <span>Change Status</span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Rejection Reason display if rejected */}
                {product.status === 'rejected' && product.rejection_reason && (
                  <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-rose-600">
                      <ShieldAlert size={14} />
                      <span>Rejection Reason:</span>
                    </div>
                    <p className="text-muted-foreground pl-5">{product.rejection_reason}</p>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Product Moderation Dialog */}
      <Dialog open={!!reviewModalProduct} onOpenChange={(open) => !open && setReviewModalProduct(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
              <Package size={18} className="text-primary" />
              <span>Moderate Listing</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Reviewing artisan product listing:{' '}
              <strong className="text-foreground">{reviewModalProduct?.title}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Action Toggle */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Decision</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setReviewAction('approve')}
                  className={`flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-bold border transition-all cursor-pointer ${
                    reviewAction === 'approve'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <CheckCircle2 size={15} />
                  <span>Approve Listing</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReviewAction('reject')}
                  className={`flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-bold border transition-all cursor-pointer ${
                    reviewAction === 'reject'
                      ? 'border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <XCircle size={15} />
                  <span>Reject</span>
                </button>
              </div>
            </div>

            {/* Rejection Reason Input */}
            <div className="space-y-1.5">
              <Label htmlFor="productNotes" className="text-xs font-bold text-foreground">
                {reviewAction === 'reject' ? 'Rejection Reason (Required)' : 'Moderation Notes (Optional)'}
              </Label>
              <Textarea
                id="productNotes"
                placeholder={
                  reviewAction === 'reject'
                    ? 'State why this product cannot be approved (e.g. low-resolution image, copyrighted materials, missing provenance)...'
                    : 'Notes for internal records or feedback to artisan...'
                }
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="text-xs rounded-xl min-h-[90px] bg-background border-border"
              />
            </div>

            {modalError && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/30 p-2.5 text-xs text-destructive font-medium flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{modalError}</span>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setReviewModalProduct(null)}
              className="rounded-xl text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={reviewMutation.isPending}
              onClick={handleConfirmReview}
              className={`rounded-xl text-xs font-bold text-white shadow-2xs gap-1.5 cursor-pointer ${
                reviewAction === 'approve'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {reviewMutation.isPending ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <span>Confirm {reviewAction === 'approve' ? 'Approval' : 'Rejection'}</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductsPage;

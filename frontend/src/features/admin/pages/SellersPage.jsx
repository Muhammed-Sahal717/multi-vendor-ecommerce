import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Store,
  Search,
  CheckCircle2,
  XCircle,
  Eye,
  Mail,
  MapPin,
  Package,
  Receipt,
  AlertCircle,
  Loader2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { adminService } from '../services/adminService.js';
import { queryKeys } from '../../../lib/queryClient.js';
import { ROUTE_PATHS } from '../../../routes/routePaths.js';
import { Card } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Input } from '../../../components/ui/input.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../components/ui/alert-dialog.jsx';

const STATUS_FILTERS = [
  { label: 'All Sellers', value: '' },
  { label: 'Active', value: 'active' },
  { label: 'Suspended', value: 'suspended' },
];

export const SellersPage = () => {
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Seller to toggle status
  const [sellerToToggle, setSellerToToggle] = useState(null);

  // Fetch sellers
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.admin.sellers({
      status: selectedStatus || undefined,
      search: searchQuery || undefined,
    }),
    queryFn: () =>
      adminService.getSellers({
        status: selectedStatus || undefined,
        search: searchQuery || undefined,
      }),
  });

  // Update status mutation
  const toggleMutation = useMutation({
    mutationFn: ({ id, status }) => adminService.updateSellerStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      setSellerToToggle(null);
    },
  });

  const rawSellers = Array.isArray(data) ? data : data?.results || [];
  const sellers = rawSellers.filter((seller) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      seller.store_name?.toLowerCase().includes(q) ||
      seller.business_name?.toLowerCase().includes(q) ||
      seller.owner_name?.toLowerCase().includes(q) ||
      seller.email?.toLowerCase().includes(q) ||
      seller.city?.toLowerCase().includes(q)
    );
  });

  const handleConfirmToggle = () => {
    if (!sellerToToggle) return;
    const newStatus = sellerToToggle.status === 'active' ? 'suspended' : 'active';
    toggleMutation.mutate({
      id: sellerToToggle.id,
      status: newStatus,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
              Artisan Sellers
            </h1>
            <Badge variant="secondary" className="font-bold text-xs">
              {sellers.length}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Oversee verified artisan stores, monitor inventory health, and manage store operational status.
          </p>
        </div>
      </div>

      {/* Toolbar */}
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
              placeholder="Search store name, artisan, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs rounded-xl bg-card border-border"
            />
          </div>
        </div>
      </Card>

      {/* Sellers List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-5 animate-pulse border-border bg-card">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-muted" />
                <div className="space-y-2 flex-1">
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
          <h3 className="text-sm font-bold text-foreground">Failed to load artisan sellers</h3>
          <p className="text-xs text-muted-foreground">Unable to fetch seller directory at this moment.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="cursor-pointer">
            Retry
          </Button>
        </Card>
      ) : sellers.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-border bg-card/40 space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Store size={28} />
          </div>
          <h3 className="text-sm font-bold text-foreground">No sellers found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {selectedStatus
              ? `There are no sellers with ${selectedStatus} status.`
              : 'No artisan sellers match your filter.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {sellers.map((seller) => {
            const storeName = seller.store_name || seller.business_name || 'Artisan Workshop';
            const isActive = seller.status === 'active';

            return (
              <Card
                key={seller.id}
                className="p-5 border-border bg-card hover:border-primary/30 transition-all shadow-2xs space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-3">
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Store size={22} />
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to={ROUTE_PATHS.ADMIN.SELLER_DETAILS(seller.id)}
                          className="text-base font-extrabold text-foreground hover:text-primary transition-colors"
                        >
                          {storeName}
                        </Link>
                        {isActive ? (
                          <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 font-bold text-xs py-0.5 gap-1">
                            <CheckCircle2 size={12} />
                            <span>Active Seller</span>
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-rose-500/40 bg-rose-500/10 text-rose-600 font-bold text-xs py-0.5 gap-1">
                            <XCircle size={12} />
                            <span>Suspended</span>
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span>
                          Owner:{' '}
                          <strong className="text-foreground font-semibold">
                            {seller.owner_name || seller.user?.name || seller.user?.email || 'Artisan'}
                          </strong>
                        </span>

                        {(seller.email || seller.business_email) && (
                          <span className="flex items-center gap-1">
                            <Mail size={12} className="text-primary/70" />
                            <span>{seller.email || seller.business_email}</span>
                          </span>
                        )}

                        {seller.city && (
                          <span className="flex items-center gap-1">
                            <MapPin size={12} className="text-primary/70" />
                            <span>{[seller.city, seller.state].filter(Boolean).join(', ')}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="rounded-xl text-xs h-8 px-3 font-semibold text-muted-foreground hover:text-foreground cursor-pointer gap-1.5"
                    >
                      <Link to={ROUTE_PATHS.ADMIN.SELLER_DETAILS(seller.id)}>
                        <Eye size={13} />
                        <span>Store Overview</span>
                      </Link>
                    </Button>

                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="rounded-xl text-xs h-8 px-3 font-semibold text-muted-foreground hover:text-foreground cursor-pointer gap-1.5"
                    >
                      <Link to={`${ROUTE_PATHS.ADMIN.SELLER_PAYOUTS}?seller=${seller.id}`}>
                        <Receipt size={13} />
                        <span>Payouts</span>
                      </Link>
                    </Button>

                    {isActive ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSellerToToggle(seller)}
                        className="rounded-xl border-rose-500/30 text-rose-600 hover:bg-rose-500/10 text-xs h-8 px-3 font-semibold gap-1.5 cursor-pointer"
                      >
                        <ShieldAlert size={13} />
                        <span>Suspend</span>
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => setSellerToToggle(seller)}
                        className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-3 font-semibold gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <ShieldCheck size={13} />
                        <span>Reactivate</span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Performance Highlights Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="rounded-xl bg-muted/30 p-2.5">
                    <span className="text-muted-foreground block text-[11px]">Total Products</span>
                    <span className="text-sm font-extrabold text-foreground flex items-center gap-1.5 mt-0.5">
                      <Package size={14} className="text-primary" />
                      {seller.products_count ?? seller.product_count ?? 0} items
                    </span>
                  </div>

                  <div className="rounded-xl bg-muted/30 p-2.5">
                    <span className="text-muted-foreground block text-[11px]">Commission Rate</span>
                    <span className="text-sm font-extrabold text-foreground flex items-center gap-1.5 mt-0.5">
                      <TrendingUp size={14} className="text-emerald-500" />
                      {seller.commission_rate ? `${seller.commission_rate}%` : '10% Standard'}
                    </span>
                  </div>

                  <div className="rounded-xl bg-muted/30 p-2.5">
                    <span className="text-muted-foreground block text-[11px]">Pending Balance</span>
                    <span className="text-sm font-extrabold text-foreground flex items-center gap-1.5 mt-0.5">
                      <Receipt size={14} className="text-amber-500" />
                      ₹{seller.pending_balance ?? '0.00'}
                    </span>
                  </div>

                  <div className="rounded-xl bg-muted/30 p-2.5">
                    <span className="text-muted-foreground block text-[11px]">Store Rating</span>
                    <span className="text-sm font-extrabold text-foreground flex items-center gap-1.5 mt-0.5">
                      ⭐ {seller.rating ?? '5.0'} / 5.0
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Suspend / Activate Alert Dialog */}
      <AlertDialog open={!!sellerToToggle} onOpenChange={(open) => !open && setSellerToToggle(null)}>
        <AlertDialogContent className="rounded-2xl bg-card border-border sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
              <Shield size={18} className="text-primary" />
              <span>
                {sellerToToggle?.status === 'active'
                  ? 'Suspend Artisan Seller?'
                  : 'Reactivate Artisan Seller?'}
              </span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              {sellerToToggle?.status === 'active'
                ? `Suspending "${sellerToToggle?.store_name || sellerToToggle?.business_name}" will temporarily hide their listings from the storefront and prevent order fulfillment.`
                : `Reactivating "${sellerToToggle?.store_name || sellerToToggle?.business_name}" will restore their public store listings and enable customer checkouts.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl text-xs cursor-pointer">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmToggle}
              disabled={toggleMutation.isPending}
              className={`rounded-xl text-xs font-bold text-white cursor-pointer ${
                sellerToToggle?.status === 'active'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {toggleMutation.isPending ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <span>Confirm {sellerToToggle?.status === 'active' ? 'Suspension' : 'Reactivation'}</span>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SellersPage;

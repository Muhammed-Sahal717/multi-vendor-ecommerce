import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  TrendingUp,
  Package,
  PlusCircle,
  Clock,
  ArrowRight,
  Loader2,
  DollarSign,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Receipt,
  Store,
  Sparkles,
  ShoppingBag,
  Phone,
  Layers,
} from 'lucide-react';
import { sellerService } from '../services/sellerService.js';
import { queryKeys } from '../../../lib/queryClient.js';
import { ROUTE_PATHS } from '../../../routes/routePaths.js';
import { useAuth } from '../../../context/AuthProvider.jsx';
import { getProductImageUrl } from '../../../lib/utils.js';
import { Card } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { PriceDisplay } from '../../../components/common/PriceDisplay.jsx';

export const DashboardPage = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch store profile
  const { data: profile } = useQuery({
    queryKey: queryKeys.seller.profile(),
    queryFn: sellerService.getProfile,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch earnings dashboard
  const { data: earnings } = useQuery({
    queryKey: queryKeys.seller.dashboard(),
    queryFn: sellerService.getEarningsDashboard,
  });

  // Fetch products count
  const { data: productsData } = useQuery({
    queryKey: queryKeys.seller.products({ page_size: 1 }),
    queryFn: () => sellerService.getProducts({ page_size: 1 }),
  });

  // Fetch recent order items awaiting fulfillment
  const { data: ordersData, isLoading: isOrdersLoading } = useQuery({
    queryKey: queryKeys.orders.sellerList({ page_size: 5 }),
    queryFn: () => sellerService.getOrderItems({ page_size: 5 }),
  });

  // Update order item status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => sellerService.updateFulfillmentStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.seller.dashboard() });
    },
  });

  const orders = Array.isArray(ordersData) ? ordersData : ordersData?.results || [];
  const totalProducts = productsData?.count ?? (Array.isArray(productsData) ? productsData.length : 0);
  const storeName = profile?.business_name || (user?.first_name ? `${user.first_name}'s Studio` : 'Artisan Workshop');

  const getStatusBadge = (rawStatus) => {
    const status = (rawStatus || '').toLowerCase().trim();
    switch (status) {
      case 'delivered':
        return <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 font-bold text-xs py-0.5">Delivered</Badge>;
      case 'shipped':
        return <Badge variant="outline" className="border-blue-500/40 bg-blue-500/10 text-blue-600 font-bold text-xs py-0.5">Shipped</Badge>;
      case 'processing':
        return <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary font-bold text-xs py-0.5">Processing</Badge>;
      case 'confirmed':
        return <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-600 font-bold text-xs py-0.5">Confirmed</Badge>;
      case 'pending':
        return <Badge variant="outline" className="border-orange-500/40 bg-orange-500/10 text-orange-600 font-bold text-xs py-0.5">Pending</Badge>;
      case 'cancelled':
        return <Badge variant="destructive" className="font-bold text-xs py-0.5">Cancelled</Badge>;
      default:
        return <Badge variant="outline" className="capitalize text-xs py-0.5">{status}</Badge>;
    }
  };

  const getNextStatusAction = (currentStatus) => {
    const status = (currentStatus || '').toLowerCase().trim();
    if (status === 'pending') return { next: 'confirmed', label: 'Confirm Order' };
    if (status === 'confirmed') return { next: 'processing', label: 'Start Processing' };
    if (status === 'processing') return { next: 'shipped', label: 'Mark Shipped' };
    if (status === 'shipped') return { next: 'delivered', label: 'Mark Delivered' };
    return null;
  };

  // Pending tasks count
  const pendingFulfillmentCount = orders.filter((o) => {
    const s = (o.status || o.fulfillment_status || '').toLowerCase();
    return s === 'pending' || s === 'confirmed' || s === 'processing';
  }).length;

  return (
    <div className="space-y-8">
      {/* 1. STUDIO HERO BANNER */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xs">
        {/* Subtle decorative gradient overlay */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary font-bold text-xs py-1 px-2.5 gap-1.5">
                <Store size={13} className="text-primary" />
                <span>{storeName}</span>
              </Badge>
              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 font-bold text-xs py-1 px-2.5 gap-1">
                <ShieldCheck size={13} />
                <span>Verified Artisan Studio</span>
              </Badge>
            </div>

            <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl font-heading">
              Welcome back, {user?.first_name || 'Artisan'}!
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
              Here is your studio&apos;s daily operational summary. You have{' '}
              <strong className="text-foreground">{pendingFulfillmentCount} order items</strong> awaiting package dispatch.
            </p>
          </div>

          {/* Quick Header Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild size="default" className="rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 text-xs px-4 gap-2 shadow-xs cursor-pointer">
              <Link to={ROUTE_PATHS.SELLER.CREATE_PRODUCT}>
                <PlusCircle size={15} />
                <span>New Listing</span>
              </Link>
            </Button>

            <Button asChild variant="outline" size="default" className="rounded-xl font-semibold text-xs px-4 border-border hover:border-primary/40 gap-2 cursor-pointer">
              <Link to={ROUTE_PATHS.SELLER.ORDERS}>
                <ShoppingBag size={15} className="text-primary" />
                <span>Fulfillment Orders</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* 2. KPI METRICS CARDS */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Gross Revenue */}
        <Card className="rounded-2xl border border-border bg-card p-5 space-y-3 shadow-2xs hover:border-primary/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Gross Revenue</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <TrendingUp size={18} />
            </div>
          </div>
          <div>
            <PriceDisplay
              price={earnings?.total_gross_earnings || 0}
              size="lg"
              className="text-2xl font-black text-foreground"
            />
            <p className="text-[11px] text-muted-foreground mt-0.5">Total customer orders value</p>
          </div>
        </Card>

        {/* Net Earnings */}
        <Card className="rounded-2xl border border-border bg-card p-5 space-y-3 shadow-2xs hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Net Earnings</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <DollarSign size={18} />
            </div>
          </div>
          <div>
            <PriceDisplay
              price={earnings?.total_net_earnings || 0}
              size="lg"
              className="text-2xl font-black text-emerald-600 dark:text-emerald-400"
            />
            <p className="text-[11px] text-muted-foreground mt-0.5">After platform commission</p>
          </div>
        </Card>

        {/* Pending Payout */}
        <Card className="rounded-2xl border border-border bg-card p-5 space-y-3 shadow-2xs hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Pending Payout</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
              <Clock size={18} />
            </div>
          </div>
          <div>
            <PriceDisplay
              price={earnings?.pending_payout_balance || 0}
              size="lg"
              className="text-2xl font-black text-amber-600 dark:text-amber-400"
            />
            <p className="text-[11px] text-muted-foreground mt-0.5">Ready for next settlement</p>
          </div>
        </Card>

        {/* Live Catalog */}
        <Card className="rounded-2xl border border-border bg-card p-5 space-y-3 shadow-2xs hover:border-blue-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Live Catalog</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
              <Package size={18} />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-foreground">{totalProducts}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Artisan creations listed</p>
          </div>
        </Card>
      </div>

      {/* 3. QUICK WORKFLOW SHORTCUTS */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Link
          to={ROUTE_PATHS.SELLER.PRODUCTS}
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 hover:border-primary/40 hover:bg-muted/30 transition-all group"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
            <Layers size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-foreground truncate">Manage Catalog</p>
            <p className="text-[11px] text-muted-foreground truncate">Stock & listings</p>
          </div>
        </Link>

        <Link
          to={ROUTE_PATHS.SELLER.ORDERS}
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 hover:border-primary/40 hover:bg-muted/30 transition-all group"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
            <ShoppingBag size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-foreground truncate">Order Queue</p>
            <p className="text-[11px] text-muted-foreground truncate">Dispatch packages</p>
          </div>
        </Link>

        <Link
          to={ROUTE_PATHS.SELLER.PAYOUT_HISTORY}
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 hover:border-primary/40 hover:bg-muted/30 transition-all group"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
            <Receipt size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-foreground truncate">Payout Ledger</p>
            <p className="text-[11px] text-muted-foreground truncate">Bank settlements</p>
          </div>
        </Link>

        <Link
          to={ROUTE_PATHS.SELLER.PROFILE}
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 hover:border-primary/40 hover:bg-muted/30 transition-all group"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
            <Store size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-foreground truncate">Store Profile</p>
            <p className="text-[11px] text-muted-foreground truncate">Business settings</p>
          </div>
        </Link>
      </div>

      {/* 4. BALANCED MAIN SECTION: FULFILLMENT QUEUE & FINANCIAL HEALTH */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Left Column: Fulfillment Queue (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h2 className="text-lg font-bold text-foreground">Fulfillment Queue</h2>
                <p className="text-xs text-muted-foreground">
                  Orders requiring preparation, packing, and shipment handover.
                </p>
              </div>

              <Button asChild variant="ghost" size="sm" className="text-xs font-semibold text-primary gap-1 cursor-pointer">
                <Link to={ROUTE_PATHS.SELLER.ORDERS}>
                  <span>View All Orders</span>
                  <ArrowRight size={13} />
                </Link>
              </Button>
            </div>

            {isOrdersLoading ? (
              <div className="py-12 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin text-primary" />
                <span>Loading fulfillment orders...</span>
              </div>
            ) : orders.length === 0 ? (
              <div className="py-14 text-center space-y-3">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                  <Package size={24} />
                </div>
                <p className="text-sm font-semibold text-foreground">All caught up! No pending fulfillments</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  When customers purchase your handcrafted items, they will appear here ready for packaging.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {orders.map((item) => {
                  const currentStatus = (item.status || item.fulfillment_status || 'pending').toLowerCase().trim();
                  const action = getNextStatusAction(currentStatus);
                  const isItemPending = updateStatusMutation.isPending && updateStatusMutation.variables?.id === item.id;
                  const itemImg = getProductImageUrl(item.product?.primary_image?.image || item.image || item.product?.image);

                  return (
                    <div key={item.id} className="py-4.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Thumbnail */}
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-border bg-muted/40">
                          {itemImg ? (
                            <img src={itemImg} alt={item.product_name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-muted-foreground/50">
                              <Package size={16} />
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-bold text-foreground">
                              #{item.order_number || item.order?.slice(0, 8)}
                            </span>
                            {getStatusBadge(currentStatus)}
                          </div>

                          <p className="text-xs font-bold text-foreground truncate max-w-md">
                            {item.product_name}
                          </p>

                          <p className="text-[11px] text-muted-foreground">
                            Qty: <strong className="text-foreground">{item.quantity}</strong> • Deliver to:{' '}
                            <span className="text-foreground font-medium">{item.shipping_full_name}</span> ({item.shipping_city}, {item.shipping_state})
                          </p>
                        </div>
                      </div>

                      {/* Right Action buttons */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t border-border/50 sm:border-0">
                        <PriceDisplay
                          price={item.subtotal || (parseFloat(item.unit_price) * item.quantity)}
                          size="md"
                          className="font-black text-foreground"
                        />

                        {action && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => updateStatusMutation.mutate({ id: item.id, status: action.next })}
                            disabled={isItemPending}
                            className="h-8 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 text-xs px-3 shadow-2xs cursor-pointer gap-1.5"
                          >
                            {isItemPending ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <CheckCircle2 size={12} />
                            )}
                            <span>{action.label}</span>
                          </Button>
                        )}

                        <Button asChild variant="outline" size="sm" className="h-8 rounded-xl text-xs font-semibold border-border gap-1 cursor-pointer">
                          <Link to={ROUTE_PATHS.SELLER.ORDER_DETAILS(item.id)}>
                            <span>Details</span>
                            <ChevronRight size={12} />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Studio Financial Health & Store Status (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Financial Snapshot */}
          <Card className="rounded-3xl border border-border bg-card p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <DollarSign size={16} className="text-primary" />
                <h3 className="text-sm font-bold text-foreground">Financial Health</h3>
              </div>
              <Badge variant="outline" className="text-[10px] font-semibold">Weekly Cycle</Badge>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Settlement Balance</span>
                <PriceDisplay price={earnings?.pending_payout_balance || 0} size="sm" className="font-bold text-foreground" />
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Total Payouts Settled</span>
                <PriceDisplay price={earnings?.already_paid || earnings?.total_payouts_completed || 0} size="sm" className="font-bold text-emerald-600" />
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Platform Fee Deducted</span>
                <PriceDisplay price={earnings?.total_commission_deducted || 0} size="sm" className="font-semibold text-muted-foreground" />
              </div>

              <div className="rounded-2xl border border-border/80 bg-muted/20 p-3.5 space-y-1.5">
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Sparkles size={12} className="text-primary" />
                  <span>Platform Settlements</span>
                </p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Payouts are settled directly into your registered bank account with complete audit logs.
                </p>
              </div>

              <Button asChild variant="outline" size="sm" className="w-full rounded-xl text-xs font-semibold justify-between border-border cursor-pointer">
                <Link to={ROUTE_PATHS.SELLER.EARNINGS_DASHBOARD}>
                  <span>View Earnings & Commission</span>
                  <ChevronRight size={13} />
                </Link>
              </Button>
            </div>
          </Card>

          {/* Artisan Quality & Studio Checklist */}
          <Card className="rounded-3xl border border-border bg-card p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <ShieldCheck size={16} className="text-primary" />
              <h3 className="text-sm font-bold text-foreground">Studio Status</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                  <CheckCircle2 size={13} />
                </div>
                <span className="text-foreground font-medium">Artisan Verification Approved</span>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                  <CheckCircle2 size={13} />
                </div>
                <span className="text-foreground font-medium">Public Storefront Active</span>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Sparkles size={13} />
                </div>
                <span className="text-foreground font-medium">Fast Fulfillment Guarantee</span>
              </div>

              <div className="pt-2">
                <Button asChild variant="ghost" size="sm" className="w-full rounded-xl text-xs font-semibold justify-between text-primary hover:bg-primary/10 cursor-pointer">
                  <Link to={ROUTE_PATHS.SELLER.PROFILE}>
                    <span>Edit Store Information</span>
                    <ChevronRight size={13} />
                  </Link>
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;

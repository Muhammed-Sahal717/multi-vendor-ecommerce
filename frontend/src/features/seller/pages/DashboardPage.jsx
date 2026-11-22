import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  TrendingUp,
  Package,
  Clock,
  ArrowRight,
  Loader2,
  DollarSign,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Store,
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
    queryKey: queryKeys.orders.sellerList({ page_size: 6 }),
    queryFn: () => sellerService.getOrderItems({ page_size: 6 }),
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
  const storeName = profile?.business_name || (user?.first_name ? `${user.first_name}'s Studio` : 'Artisan Studio');

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

  const pendingFulfillmentCount = orders.filter((o) => {
    const s = (o.status || o.fulfillment_status || '').toLowerCase();
    return s === 'pending' || s === 'confirmed' || s === 'processing';
  }).length;

  return (
    <div className="space-y-6">
      {/* 1. COMPACT GREETING HEADER */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-xs text-primary flex items-center gap-1">
              <Store size={13} />
              {storeName}
            </span>
            <span className="text-muted-foreground/40">•</span>
            <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
              <ShieldCheck size={12} />
              Verified Studio
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
            Welcome, {user?.first_name || 'Artisan'}
          </h1>
        </div>

        {pendingFulfillmentCount > 0 ? (
          <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary font-bold text-xs py-1 px-3 self-start sm:self-auto">
            {pendingFulfillmentCount} {pendingFulfillmentCount === 1 ? 'order' : 'orders'} to fulfill
          </Badge>
        ) : (
          <Badge variant="outline" className="border-border text-muted-foreground text-xs py-1 px-3 self-start sm:self-auto">
            All orders fulfilled
          </Badge>
        )}
      </div>

      {/* 2. KPI METRICS CARDS */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {/* Gross Sales */}
        <Card className="rounded-2xl border border-border bg-card p-4 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Gross Sales</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <TrendingUp size={16} />
            </div>
          </div>
          <PriceDisplay
            price={earnings?.total_gross_earnings || 0}
            size="lg"
            className="text-xl sm:text-2xl font-black text-foreground block"
          />
        </Card>

        {/* Net Earnings */}
        <Card className="rounded-2xl border border-border bg-card p-4 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Net Earnings</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <DollarSign size={16} />
            </div>
          </div>
          <PriceDisplay
            price={earnings?.total_net_earnings || 0}
            size="lg"
            className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 block"
          />
        </Card>

        {/* Pending Payout */}
        <Card className="rounded-2xl border border-border bg-card p-4 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Pending Payout</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
              <Clock size={16} />
            </div>
          </div>
          <PriceDisplay
            price={earnings?.pending_payout_balance || 0}
            size="lg"
            className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 block"
          />
        </Card>

        {/* Active Products */}
        <Card className="rounded-2xl border border-border bg-card p-4 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Live Catalog</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
              <Package size={16} />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-foreground">
            {totalProducts}
          </p>
        </Card>
      </div>

      {/* 3. MAIN DASHBOARD CONTENT */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Fulfillment Queue (8 cols) */}
        <div className="lg:col-span-8">
          <Card className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div>
                <h2 className="text-base font-bold text-foreground">Fulfillment Queue</h2>
                <p className="text-xs text-muted-foreground">Orders awaiting processing or shipment</p>
              </div>

              <Button asChild variant="ghost" size="sm" className="text-xs font-semibold text-primary gap-1 cursor-pointer h-8">
                <Link to={ROUTE_PATHS.SELLER.ORDERS}>
                  <span>All Orders</span>
                  <ArrowRight size={13} />
                </Link>
              </Button>
            </div>

            {isOrdersLoading ? (
              <div className="py-12 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin text-primary" />
                <span>Loading orders...</span>
              </div>
            ) : orders.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <Package size={28} className="mx-auto text-muted-foreground/40" />
                <p className="text-sm font-semibold text-foreground">No orders pending fulfillment</p>
                <p className="text-xs text-muted-foreground">New customer orders will appear here.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/70">
                {orders.map((item) => {
                  const currentStatus = (item.status || item.fulfillment_status || 'pending').toLowerCase().trim();
                  const action = getNextStatusAction(currentStatus);
                  const isItemPending = updateStatusMutation.isPending && updateStatusMutation.variables?.id === item.id;
                  const itemImg = getProductImageUrl(item.product?.primary_image?.image || item.image || item.product?.image);

                  return (
                    <div key={item.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Thumbnail */}
                        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-border bg-muted/40">
                          {itemImg ? (
                            <img src={itemImg} alt={item.product_name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
                              <Package size={15} />
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-bold text-foreground">
                              #{item.order_number || item.id?.slice(0, 8)}
                            </span>
                            {getStatusBadge(currentStatus)}
                          </div>

                          <p className="text-xs font-bold text-foreground truncate max-w-sm">
                            {item.product_name}
                          </p>

                          <p className="text-[11px] text-muted-foreground truncate">
                            Qty: <strong className="text-foreground">{item.quantity}</strong> • {item.shipping_full_name} ({item.shipping_city})
                          </p>
                        </div>
                      </div>

                      {/* Right Action buttons */}
                      <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-1 sm:pt-0">
                        <PriceDisplay
                          price={item.subtotal || (parseFloat(item.unit_price) * item.quantity)}
                          size="md"
                          className="font-extrabold text-foreground"
                        />

                        {action && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => updateStatusMutation.mutate({ id: item.id, status: action.next })}
                            disabled={isItemPending}
                            className="h-7 rounded-lg font-bold bg-primary text-primary-foreground hover:bg-primary/90 text-xs px-2.5 shadow-2xs cursor-pointer gap-1"
                          >
                            {isItemPending ? (
                              <Loader2 size={11} className="animate-spin" />
                            ) : (
                              <CheckCircle2 size={11} />
                            )}
                            <span>{action.label}</span>
                          </Button>
                        )}

                        <Button asChild variant="outline" size="sm" className="h-7 rounded-lg text-xs font-medium border-border px-2.5 cursor-pointer">
                          <Link to={ROUTE_PATHS.SELLER.ORDER_DETAILS(item.id)}>
                            <span>Details</span>
                            <ChevronRight size={11} />
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

        {/* Financial Summary (4 cols) */}
        <div className="lg:col-span-4">
          <Card className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <h3 className="text-sm font-bold text-foreground">Financial Overview</h3>
              <Badge variant="outline" className="text-[10px] font-semibold text-muted-foreground">Weekly</Badge>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground">Gross Sales</span>
                <PriceDisplay price={earnings?.total_gross_earnings || 0} size="sm" className="font-semibold text-foreground" />
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground">Platform Commission</span>
                <PriceDisplay price={earnings?.total_commission_deducted || 0} size="sm" className="font-semibold text-muted-foreground" />
              </div>

              <div className="flex items-center justify-between py-1 border-t border-border/60 pt-2 font-bold">
                <span className="text-foreground">Net Earnings</span>
                <PriceDisplay price={earnings?.total_net_earnings || 0} size="sm" className="text-emerald-600 font-bold" />
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground">Already Paid Out</span>
                <PriceDisplay price={earnings?.already_paid || 0} size="sm" className="font-semibold text-foreground" />
              </div>

              <div className="flex items-center justify-between py-1 bg-amber-500/10 rounded-xl px-3 text-amber-700 dark:text-amber-400 font-bold">
                <span>Available Settlement</span>
                <PriceDisplay price={earnings?.pending_payout_balance || 0} size="sm" className="font-extrabold" />
              </div>

              <div className="pt-2">
                <Button asChild variant="outline" size="sm" className="w-full rounded-xl text-xs font-semibold justify-between border-border cursor-pointer h-8">
                  <Link to={ROUTE_PATHS.SELLER.PAYOUT_HISTORY}>
                    <span>View Payout History</span>
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

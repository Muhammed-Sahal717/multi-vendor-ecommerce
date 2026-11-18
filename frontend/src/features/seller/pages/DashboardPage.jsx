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
  ShieldAlert,
} from 'lucide-react';
import { sellerService } from '../services/sellerService.js';
import { queryKeys } from '../../../lib/queryClient.js';
import { ROUTE_PATHS } from '../../../routes/routePaths.js';
import { Card } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { PriceDisplay } from '../../../components/common/PriceDisplay.jsx';

export const DashboardPage = () => {
  const queryClient = useQueryClient();

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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'delivered':
        return <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 font-bold text-xs py-0.5">Delivered</Badge>;
      case 'shipped':
        return <Badge variant="outline" className="border-blue-500/40 bg-blue-500/10 text-blue-600 font-bold text-xs py-0.5">Shipped</Badge>;
      case 'processing':
        return <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary font-bold text-xs py-0.5">Processing</Badge>;
      case 'confirmed':
        return <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-600 font-bold text-xs py-0.5">Confirmed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive" className="font-bold text-xs py-0.5">Cancelled</Badge>;
      default:
        return <Badge variant="outline" className="capitalize text-xs py-0.5">{status}</Badge>;
    }
  };

  const getNextStatusAction = (currentStatus) => {
    if (currentStatus === 'confirmed') return { next: 'processing', label: 'Mark Processing' };
    if (currentStatus === 'processing') return { next: 'shipped', label: 'Mark Shipped' };
    if (currentStatus === 'shipped') return { next: 'delivered', label: 'Mark Delivered' };
    return null;
  };

  return (
    <div className="space-y-8">
      {/* 1. Studio Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
            Artisan Studio Dashboard
          </h1>
          <p className="text-xs text-muted-foreground">
            Overview of your sales, pending fulfillment tasks, and artisan catalog.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild size="sm" className="rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 text-xs gap-1.5 shadow-xs">
            <Link to={ROUTE_PATHS.SELLER.CREATE_PRODUCT}>
              <PlusCircle size={14} />
              <span>Add Product</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. Key Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="rounded-2xl border border-border bg-card p-5 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Gross Revenue</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <TrendingUp size={16} />
            </div>
          </div>
          <PriceDisplay
            price={earnings?.total_gross_earnings || 0}
            size="lg"
            className="text-2xl font-extrabold text-foreground"
          />
          <p className="text-[11px] text-muted-foreground">Total customer sales</p>
        </Card>

        <Card className="rounded-2xl border border-border bg-card p-5 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Net Earnings</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <DollarSign size={16} />
            </div>
          </div>
          <PriceDisplay
            price={earnings?.total_net_earnings || 0}
            size="lg"
            className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400"
          />
          <p className="text-[11px] text-muted-foreground">After platform commission</p>
        </Card>

        <Card className="rounded-2xl border border-border bg-card p-5 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Pending Payout</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
              <Clock size={16} />
            </div>
          </div>
          <PriceDisplay
            price={earnings?.pending_payout_balance || 0}
            size="lg"
            className="text-2xl font-extrabold text-amber-600 dark:text-amber-400"
          />
          <p className="text-[11px] text-muted-foreground">Ready for settlement</p>
        </Card>

        <Card className="rounded-2xl border border-border bg-card p-5 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Live Catalog</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
              <Package size={16} />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-foreground">{totalProducts}</p>
          <p className="text-[11px] text-muted-foreground">Listed artisan creations</p>
        </Card>
      </div>

      {/* 3. Orders Awaiting Fulfillment */}
      <Card className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Fulfillment Queue</h2>
            <p className="text-xs text-muted-foreground">Manage and update shipment status for items ordered from your studio.</p>
          </div>
          <Button asChild variant="ghost" size="sm" className="text-xs font-semibold text-primary gap-1">
            <Link to={ROUTE_PATHS.SELLER.ORDERS}>
              <span>View All Orders</span>
              <ArrowRight size={13} />
            </Link>
          </Button>
        </div>

        {isOrdersLoading ? (
          <div className="py-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin text-primary" />
            <span>Loading orders...</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Package size={24} />
            </div>
            <p className="text-sm font-semibold text-foreground">No orders pending fulfillment</p>
            <p className="text-xs text-muted-foreground">When customers purchase items from your studio, they will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {orders.map((item) => {
              const action = getNextStatusAction(item.status);
              return (
                <div key={item.id} className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-mono text-xs font-bold text-foreground">
                        Order #{item.order_number || item.order?.slice(0, 8)}
                      </span>
                      {getStatusBadge(item.status)}
                    </div>

                    <p className="text-sm font-bold text-foreground line-clamp-1">{item.product_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Qty: <span className="font-semibold text-foreground">{item.quantity}</span> • Destination: {item.shipping_city}, {item.shipping_state}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                    <PriceDisplay price={item.subtotal || (parseFloat(item.unit_price) * item.quantity)} size="md" className="font-extrabold text-foreground" />

                    {action && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => updateStatusMutation.mutate({ id: item.id, status: action.next })}
                        disabled={updateStatusMutation.isPending}
                        className="h-8 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 text-xs px-3 shadow-2xs cursor-pointer"
                      >
                        {action.label}
                      </Button>
                    )}

                    <Button asChild variant="outline" size="sm" className="h-8 rounded-xl text-xs font-semibold border-border gap-1">
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
  );
};

export default DashboardPage;

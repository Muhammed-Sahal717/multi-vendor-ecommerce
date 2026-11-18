import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package,
  Calendar,
  Phone,
  MapPin,
  ChevronRight,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { sellerService } from '../services/sellerService.js';
import { queryKeys } from '../../../lib/queryClient.js';
import { ROUTE_PATHS } from '../../../routes/routePaths.js';
import { Card } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { PriceDisplay } from '../../../components/common/PriceDisplay.jsx';

const STATUS_FILTERS = [
  { label: 'All Orders', value: '' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Processing', value: 'processing' },
  { label: 'Shipped', value: 'shipped' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Cancelled', value: 'cancelled' },
];

export const OrdersPage = () => {
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState('');

  // Fetch seller order items
  const { data: ordersData, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.orders.sellerList(selectedStatus ? { status: selectedStatus } : {}),
    queryFn: () => sellerService.getOrderItems(selectedStatus ? { status: selectedStatus } : {}),
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => sellerService.updateFulfillmentStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.seller.dashboard() });
    },
  });

  const orders = Array.isArray(ordersData) ? ordersData : ordersData?.results || [];

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

  const getNextAction = (status) => {
    if (status === 'confirmed') return { next: 'processing', label: 'Mark Processing' };
    if (status === 'processing') return { next: 'shipped', label: 'Mark Shipped' };
    if (status === 'shipped') return { next: 'delivered', label: 'Mark Delivered' };
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
            Orders & Fulfillment
          </h1>
          <p className="text-xs text-muted-foreground">
            Track customer orders, prepare studio packages, and dispatch shipments.
          </p>
        </div>

        {/* Filter Pills */}
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
      </div>

      {isLoading && (
        <div className="py-16 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 size={16} className="animate-spin text-primary" />
          <span>Loading order items...</span>
        </div>
      )}

      {isError && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5 text-center space-y-2">
          <p className="text-xs text-destructive font-semibold">Failed to load orders.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs">
            Retry
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && orders.length === 0 && (
        <Card className="rounded-3xl border border-dashed border-border p-12 text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Package size={24} />
          </div>
          <h2 className="text-base font-bold text-foreground">No orders found</h2>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {selectedStatus ? `No orders with status "${selectedStatus}".` : 'You have no customer orders yet.'}
          </p>
        </Card>
      )}

      {/* Order Items Cards */}
      <div className="space-y-4">
        {orders.map((item) => {
          const action = getNextAction(item.status);
          return (
            <Card
              key={item.id}
              className="p-6 rounded-2xl border border-border bg-card hover:border-primary/30 transition-all space-y-4"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-sm font-bold text-foreground">
                    #{item.order_number || item.order?.slice(0, 8)}
                  </span>
                  {getStatusBadge(item.status)}
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar size={12} />
                    {item.order_date
                      ? new Date(item.order_date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'Recent'}
                  </span>
                </div>

                <PriceDisplay price={item.subtotal || (parseFloat(item.unit_price) * item.quantity)} size="md" className="font-extrabold text-primary" />
              </div>

              {/* Product and Shipping details */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
                <div className="space-y-1">
                  <p className="font-bold text-foreground text-sm line-clamp-1">{item.product_name}</p>
                  <p className="text-muted-foreground">
                    Quantity: <span className="font-semibold text-foreground">{item.quantity}</span> • Unit Price: <PriceDisplay price={item.unit_price} size="sm" />
                  </p>
                </div>

                <div className="space-y-1 sm:text-right text-muted-foreground">
                  <p className="font-semibold text-foreground">
                    Deliver to: {item.shipping_full_name}
                  </p>
                  <p>{item.shipping_city}, {item.shipping_state}</p>
                  {item.shipping_mobile && (
                    <p className="flex items-center gap-1 sm:justify-end text-primary font-medium">
                      <Phone size={11} />
                      <span>{item.shipping_mobile}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between border-t border-border/80 pt-3">
                <Button asChild variant="outline" size="sm" className="h-8 rounded-xl text-xs font-semibold gap-1">
                  <Link to={ROUTE_PATHS.SELLER.ORDER_DETAILS(item.id)}>
                    <span>View Fulfillment Details</span>
                    <ChevronRight size={12} />
                  </Link>
                </Button>

                {action && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => updateStatusMutation.mutate({ id: item.id, status: action.next })}
                    disabled={updateStatusMutation.isPending}
                    className="h-8 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 text-xs px-4 shadow-2xs cursor-pointer gap-1.5"
                  >
                    <CheckCircle2 size={13} />
                    <span>{action.label}</span>
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default OrdersPage;

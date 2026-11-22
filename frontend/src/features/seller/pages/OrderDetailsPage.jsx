import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Package,
  Calendar,
  MapPin,
  Phone,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Truck,
  ShieldCheck,
  XCircle,
  Clock,
  Check,
} from 'lucide-react';
import { sellerService } from '../services/sellerService.js';
import { queryKeys } from '../../../lib/queryClient.js';
import { ROUTE_PATHS } from '../../../routes/routePaths.js';
import { Card } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { PriceDisplay } from '../../../components/common/PriceDisplay.jsx';

const VALID_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

const FULFILLMENT_STEPS = [
  { key: 'pending', label: 'Order Placed' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'processing', label: 'Processing' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
];

export const OrderDetailsPage = () => {
  const { id } = useParams();
  const queryClient = useQueryClient();

  const [updateError, setUpdateError] = useState('');
  const [updateSuccess, setUpdateSuccess] = useState('');

  // Fetch order item
  const { data: item, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.orders.sellerDetail(id),
    queryFn: () => sellerService.getOrderItem(id),
    enabled: !!id,
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: (newStatus) => sellerService.updateFulfillmentStatus(id, newStatus),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.sellerDetail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.seller.dashboard() });
      setUpdateSuccess(`Order fulfillment status updated to "${updated?.status || 'updated'}"!`);
      setUpdateError('');
      setTimeout(() => setUpdateSuccess(''), 4000);
    },
    onError: (err) => {
      const data = err?.response?.data;
      if (typeof data === 'object') {
        const firstKey = Object.keys(data)[0];
        setUpdateError(`${firstKey}: ${data[firstKey]}`);
      } else {
        setUpdateError(err?.message || 'Failed to update order status.');
      }
    },
  });

  if (isLoading) {
    return (
      <div className="py-16 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
        <Loader2 size={16} className="animate-spin text-primary" />
        <span>Loading fulfillment details...</span>
      </div>
    );
  }

  if (isError || !item) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-center space-y-3">
        <p className="text-sm font-semibold text-destructive">Could not load order item details.</p>
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs">
            Retry
          </Button>
          <Button asChild size="sm" className="text-xs bg-primary text-primary-foreground">
            <Link to={ROUTE_PATHS.SELLER.ORDERS}>Back to Orders</Link>
          </Button>
        </div>
      </div>
    );
  }

  const currentStatus = (item.status || item.fulfillment_status || 'pending').toLowerCase().trim();
  const nextTransitions = VALID_TRANSITIONS[currentStatus] || [];
  const currentStepIndex = FULFILLMENT_STEPS.findIndex((s) => s.key === currentStatus);
  const isCancelled = currentStatus === 'cancelled';
  const isDelivered = currentStatus === 'delivered';

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
        return <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-600 font-bold text-xs py-0.5">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="space-y-2 border-b border-border pb-4">
        <Link
          to={ROUTE_PATHS.SELLER.ORDERS}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft size={13} />
          <span>Back to Fulfillment List</span>
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl font-mono">
              Order #{item.order_number || (typeof item.order === 'object' && item.order !== null ? item.order.order_number || item.order.id?.slice(0, 8) : item.order?.slice?.(0, 8)) || item.id?.slice(0, 8)}
            </h1>
            {getStatusBadge(currentStatus)}
          </div>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar size={13} />
            {item.order_date
              ? new Date(item.order_date).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : 'Recent Order'}
          </span>
        </div>
      </div>

      {updateSuccess && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
          <CheckCircle2 size={15} />
          <span>{updateSuccess}</span>
        </div>
      )}

      {updateError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
          <AlertCircle size={15} />
          <span>{updateError}</span>
        </div>
      )}

      {/* Fulfillment Progress Stepper */}
      {!isCancelled && (
        <Card className="p-6 rounded-2xl border border-border bg-card space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Fulfillment Journey
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
            {FULFILLMENT_STEPS.map((step, idx) => {
              const isCompleted = idx <= currentStepIndex;
              const isCurrent = idx === currentStepIndex;

              return (
                <div key={step.key} className="flex flex-col items-center text-center space-y-1.5">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-all ${
                      isCurrent
                        ? 'bg-primary text-primary-foreground ring-4 ring-primary/20 shadow-xs'
                        : isCompleted
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {isCompleted ? <Check size={15} className="stroke-[2.5]" /> : idx + 1}
                  </div>
                  <span
                    className={`text-xs ${
                      isCurrent
                        ? 'text-foreground font-bold'
                        : isCompleted
                        ? 'text-foreground font-semibold'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Fulfillment Status Advance Actions Panel */}
      <Card className="p-6 rounded-2xl border border-primary/20 bg-primary/5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-primary/15 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
            <Truck size={16} />
            <span>Update Fulfillment Stage</span>
          </div>
          <span className="text-xs text-muted-foreground">
            Current Stage: <strong className="text-foreground capitalize">{currentStatus}</strong>
          </span>
        </div>

        {nextTransitions.length > 0 ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Select the next status to advance the delivery workflow:
            </p>

            <div className="flex flex-wrap items-center gap-2.5">
              {nextTransitions.map((nextStatus) => {
                const isCancel = nextStatus === 'cancelled';
                let label = `Mark as ${nextStatus}`;
                if (nextStatus === 'confirmed') label = 'Confirm Order';
                if (nextStatus === 'processing') label = 'Start Processing';
                if (nextStatus === 'shipped') label = 'Mark as Shipped';
                if (nextStatus === 'delivered') label = 'Mark as Delivered';
                if (nextStatus === 'cancelled') label = 'Cancel Item';

                return (
                  <Button
                    key={nextStatus}
                    type="button"
                    onClick={() => updateStatusMutation.mutate(nextStatus)}
                    disabled={updateStatusMutation.isPending}
                    variant={isCancel ? 'outline' : 'default'}
                    className={`rounded-xl text-xs font-bold h-10 px-5 cursor-pointer capitalize shadow-xs gap-1.5 ${
                      isCancel
                        ? 'border-destructive/30 text-destructive hover:bg-destructive/10'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                    }`}
                  >
                    {updateStatusMutation.isPending ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : isCancel ? (
                      <XCircle size={14} />
                    ) : (
                      <CheckCircle2 size={14} />
                    )}
                    <span>{label}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        ) : isDelivered ? (
          <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
            <CheckCircle2 size={16} />
            <span>This order item has been delivered to the customer. Fulfillment is complete.</span>
          </div>
        ) : isCancelled ? (
          <div className="flex items-center gap-2 text-xs text-destructive font-semibold bg-destructive/10 p-3 rounded-xl border border-destructive/20">
            <XCircle size={16} />
            <span>This order item has been cancelled.</span>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">
            No further fulfillment actions available for this stage.
          </div>
        )}
      </Card>

      {/* Order Item & Buyer Details */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Product Purchased */}
        <Card className="p-5 rounded-2xl border border-border bg-card space-y-3">
          <div className="flex items-center gap-2 border-b border-border pb-2.5">
            <Package size={16} className="text-primary" />
            <h2 className="text-sm font-bold text-foreground">Ordered Product</h2>
          </div>
          <div className="space-y-1.5 text-xs">
            <p className="font-bold text-foreground text-sm">{item.product_name}</p>
            <p className="text-muted-foreground font-mono">SKU: {item.product_sku || 'N/A'}</p>
            <div className="flex justify-between items-center pt-2 border-t border-border/60">
              <span className="text-muted-foreground">Quantity Ordered:</span>
              <span className="font-bold text-foreground text-sm">{item.quantity}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Unit Price:</span>
              <PriceDisplay price={item.unit_price} size="sm" className="font-bold text-foreground" />
            </div>
            <div className="flex justify-between items-center border-t border-border/60 pt-2 text-sm font-extrabold text-foreground">
              <span>Subtotal:</span>
              <PriceDisplay price={item.subtotal || (parseFloat(item.unit_price) * item.quantity)} size="md" className="text-primary" />
            </div>
          </div>
        </Card>

        {/* Shipping Delivery Destination */}
        <Card className="p-5 rounded-2xl border border-border bg-card space-y-3">
          <div className="flex items-center gap-2 border-b border-border pb-2.5">
            <MapPin size={16} className="text-primary" />
            <h2 className="text-sm font-bold text-foreground">Shipping Destination</h2>
          </div>
          <div className="text-xs text-muted-foreground space-y-1.5">
            <p className="text-sm font-bold text-foreground">{item.shipping_full_name}</p>
            <p>
              {item.shipping_address_line_1}
              {item.shipping_address_line_2 ? `, ${item.shipping_address_line_2}` : ''}
            </p>
            <p>
              {item.shipping_city}, {item.shipping_state} - <span className="font-semibold text-foreground">{item.shipping_postal_code}</span>
            </p>
            <p className="text-foreground/80 font-medium">{item.shipping_country || 'India'}</p>

            {item.shipping_mobile && (
              <p className="pt-2 flex items-center gap-1.5 text-primary font-bold">
                <Phone size={12} />
                <span>{item.shipping_mobile}</span>
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default OrderDetailsPage;

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
} from 'lucide-react';
import { sellerService } from '../services/sellerService.js';
import { queryKeys } from '../../../lib/queryClient.js';
import { ROUTE_PATHS } from '../../../routes/routePaths.js';
import { Card } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { PriceDisplay } from '../../../components/common/PriceDisplay.jsx';

const VALID_TRANSITIONS = {
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

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
      setUpdateSuccess(`Order status updated to "${updated.status || 'updated'}"!`);
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

  const nextTransitions = VALID_TRANSITIONS[item.status] || [];

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
          <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl font-mono">
            Order #{item.order_number || item.order?.slice(0, 8)}
          </h1>
          <Badge variant="outline" className="text-xs font-bold capitalize py-0.5">
            {item.status}
          </Badge>
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

      {/* Fulfillment Status Advance Actions */}
      {nextTransitions.length > 0 && (
        <Card className="p-6 rounded-2xl border border-primary/20 bg-primary/5 space-y-3 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
            <Truck size={16} />
            <span>Update Fulfillment Stage</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Current status: <strong className="text-foreground capitalize">{item.status}</strong>. Advance the fulfillment status as you process and package this item:
          </p>

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            {nextTransitions.map((nextStatus) => (
              <Button
                key={nextStatus}
                type="button"
                onClick={() => updateStatusMutation.mutate(nextStatus)}
                disabled={updateStatusMutation.isPending}
                variant={nextStatus === 'cancelled' ? 'outline' : 'default'}
                className={`rounded-xl text-xs font-bold h-9 px-4 cursor-pointer capitalize ${
                  nextStatus === 'cancelled'
                    ? 'border-destructive/30 text-destructive hover:bg-destructive/10'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                }`}
              >
                {updateStatusMutation.isPending ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <span>Mark as {nextStatus}</span>
                )}
              </Button>
            ))}
          </div>
        </Card>
      )}

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

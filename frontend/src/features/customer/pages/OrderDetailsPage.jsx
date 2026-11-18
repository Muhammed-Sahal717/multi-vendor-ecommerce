import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package,
  Calendar,
  MapPin,
  CreditCard,
  Banknote,
  ArrowLeft,
  Phone,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  XCircle,
  Truck,
  ShieldCheck,
} from 'lucide-react';
import { orderService } from '../services/orderService.js';
import { queryKeys } from '../../../lib/queryClient.js';
import { ROUTE_PATHS } from '../../../routes/routePaths.js';
import { Card } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { PriceDisplay } from '../../../components/common/PriceDisplay.jsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../../components/ui/dialog.jsx';

const ORDER_STEPS = [
  { key: 'pending', label: 'Order Placed' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'processing', label: 'Processing' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
];

export const OrderDetailsPage = () => {
  const { id } = useParams();
  const queryClient = useQueryClient();

  const [cancelModalItem, setCancelModalItem] = useState(null);
  const [cancelError, setCancelError] = useState('');
  const [cancelSuccess, setCancelSuccess] = useState('');

  // Fetch order details
  const { data: order, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.orders.detail(id),
    queryFn: () => orderService.getOrderDetails(id),
    enabled: !!id,
  });

  // Cancel item mutation
  const cancelItemMutation = useMutation({
    mutationFn: ({ itemId }) => orderService.cancelOrderItem(id, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      setCancelSuccess('Item cancelled successfully.');
      setCancelModalItem(null);
      setTimeout(() => setCancelSuccess(''), 4000);
    },
    onError: (err) => {
      setCancelError(err?.response?.data?.detail || err?.message || 'Failed to cancel order item.');
    },
  });

  const handleConfirmCancel = () => {
    if (!cancelModalItem) return;
    setCancelError('');
    cancelItemMutation.mutate({ itemId: cancelModalItem.id });
  };

  if (isLoading) {
    return (
      <div className="py-16 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
        <Loader2 size={16} className="animate-spin text-primary" />
        <span>Loading order details...</span>
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-center space-y-3">
        <p className="text-sm font-semibold text-destructive">Could not load order details.</p>
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs">
            Retry
          </Button>
          <Button asChild size="sm" className="text-xs bg-primary text-primary-foreground">
            <Link to={ROUTE_PATHS.CUSTOMER.ORDERS}>Back to Orders</Link>
          </Button>
        </div>
      </div>
    );
  }

  const isCOD = order.payment_method === 'cod';
  const isCancelled = order.status === 'cancelled';

  // Find step index
  const currentStepIndex = ORDER_STEPS.findIndex((s) => s.key === order.status);

  return (
    <div className="space-y-6">
      {/* Back button & Page Title */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div className="space-y-1">
          <Link
            to={ROUTE_PATHS.CUSTOMER.ORDERS}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft size={13} />
            <span>Back to Orders</span>
          </Link>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl font-mono">
              #{order.order_number}
            </h1>
            <Badge
              variant={isCancelled ? 'destructive' : 'outline'}
              className="text-xs font-bold capitalize py-0.5"
            >
              {order.status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Placed on {order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            }) : 'Recent'}
          </p>
        </div>
      </div>

      {cancelSuccess && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
          <CheckCircle2 size={15} />
          <span>{cancelSuccess}</span>
        </div>
      )}

      {/* Fulfillment Progress Stepper (if not cancelled) */}
      {!isCancelled && (
        <Card className="p-6 rounded-2xl border border-border bg-card space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Shipment Status
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
            {ORDER_STEPS.map((step, idx) => {
              const isCompleted = idx <= currentStepIndex;
              const isCurrent = idx === currentStepIndex;

              return (
                <div key={step.key} className="flex flex-col items-center text-center space-y-2">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-all ${
                      isCurrent
                        ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                        : isCompleted
                        ? 'bg-primary/20 text-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 size={16} /> : idx + 1}
                  </div>
                  <span
                    className={`text-xs font-semibold ${
                      isCompleted ? 'text-foreground font-bold' : 'text-muted-foreground'
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

      {/* Info Cards: Shipping & Payment */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Shipping Address */}
        <Card className="p-5 rounded-2xl border border-border bg-card space-y-2">
          <div className="flex items-center gap-2 border-b border-border pb-2.5">
            <MapPin size={16} className="text-primary" />
            <h2 className="text-sm font-bold text-foreground">Delivery Destination</h2>
          </div>
          <div className="text-xs text-muted-foreground space-y-1 pt-1">
            <p className="text-sm font-bold text-foreground">{order.shipping_full_name}</p>
            <p>
              {order.shipping_address_line_1}
              {order.shipping_address_line_2 ? `, ${order.shipping_address_line_2}` : ''}
            </p>
            <p>
              {order.shipping_city}, {order.shipping_state} - <span className="font-semibold text-foreground">{order.shipping_postal_code}</span>, {order.shipping_country || 'India'}
            </p>
            <p className="pt-1 text-foreground/80 flex items-center gap-1.5">
              <Phone size={11} className="text-primary" />
              <span>{order.shipping_mobile}</span>
            </p>
          </div>
        </Card>

        {/* Payment Details */}
        <Card className="p-5 rounded-2xl border border-border bg-card space-y-2">
          <div className="flex items-center gap-2 border-b border-border pb-2.5">
            {isCOD ? <Banknote size={16} className="text-emerald-600" /> : <CreditCard size={16} className="text-primary" />}
            <h2 className="text-sm font-bold text-foreground">Payment Information</h2>
          </div>
          <div className="text-xs text-muted-foreground space-y-2 pt-1">
            <div className="flex justify-between items-center">
              <span>Method:</span>
              <span className="font-bold text-foreground">
                {isCOD ? 'Cash on Delivery (COD)' : 'Online Payment (Razorpay)'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Payment Status:</span>
              <Badge variant="outline" className="text-[11px] capitalize">
                {order.payment?.status || (isCOD ? 'Pending on Delivery' : 'Completed')}
              </Badge>
            </div>
            {order.payment?.paid_at && (
              <div className="flex justify-between items-center">
                <span>Paid At:</span>
                <span className="text-foreground">
                  {new Date(order.payment.paid_at).toLocaleString('en-IN')}
                </span>
              </div>
            )}
            <div className="border-t border-border/60 pt-2 flex justify-between items-center">
              <span>Security Guarantee:</span>
              <span className="text-[11px] text-primary flex items-center gap-1 font-semibold">
                <ShieldCheck size={12} /> 100% Protected
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Ordered Items List */}
      <Card className="p-6 rounded-2xl border border-border bg-card space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Package size={16} className="text-primary" />
            <h2 className="text-sm font-bold text-foreground">
              Order Items ({order.items?.length || 0})
            </h2>
          </div>
        </div>

        <div className="divide-y divide-border">
          {order.items?.map((item) => {
            const canCancelItem = ['pending', 'confirmed'].includes(item.status);
            return (
              <div key={item.id} className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs">
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-foreground text-sm line-clamp-1">{item.product_name}</p>
                    <Badge variant="outline" className="text-[10px] font-semibold capitalize py-0">
                      {item.status}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Qty: <span className="font-semibold text-foreground">{item.quantity}</span> × <PriceDisplay price={item.unit_price} size="sm" />
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0">
                  <PriceDisplay price={item.subtotal} size="md" className="font-extrabold text-foreground" />

                  {/* Cancel Item Button (only if pending or confirmed) */}
                  {canCancelItem && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCancelModalItem(item)}
                      className="h-8 rounded-xl text-xs font-semibold text-destructive border-destructive/30 hover:bg-destructive/10"
                    >
                      Cancel Item
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Pricing Summary */}
        <div className="border-t border-border pt-4 space-y-2 text-xs">
          <div className="flex justify-between text-muted-foreground">
            <span>Items Subtotal</span>
            <PriceDisplay price={order.subtotal} size="sm" className="font-semibold text-foreground" />
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Shipping & Handling</span>
            {parseFloat(order.shipping_fee) === 0 ? (
              <span className="font-bold text-emerald-600 dark:text-emerald-400">Free</span>
            ) : (
              <PriceDisplay price={order.shipping_fee} size="sm" className="font-semibold text-foreground" />
            )}
          </div>
          <div className="flex justify-between border-t border-border pt-3 text-base font-extrabold text-foreground">
            <span>Total Amount</span>
            <PriceDisplay price={order.total_amount} size="lg" className="text-primary font-extrabold" />
          </div>
        </div>
      </Card>

      {/* Cancel Item Confirmation Dialog */}
      <Dialog open={!!cancelModalItem} onOpenChange={(open) => { if (!open) setCancelModalItem(null); }}>
        <DialogContent className="max-w-md rounded-2xl bg-card border border-border p-6 shadow-xl space-y-4">
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle size={20} />
              <DialogTitle className="text-base font-bold text-foreground">
                Cancel Order Item
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to cancel <span className="font-semibold text-foreground">{cancelModalItem?.product_name}</span>?
            </DialogDescription>
          </DialogHeader>

          {cancelError && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              {cancelError}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            This action cannot be undone. If you paid online, the refund will be credited back to your original payment method within 5-7 business days.
          </p>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCancelModalItem(null)}
              className="rounded-xl text-xs"
            >
              Keep Item
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleConfirmCancel}
              disabled={cancelItemMutation.isPending}
              className="rounded-xl text-xs font-bold"
            >
              {cancelItemMutation.isPending ? 'Cancelling...' : 'Confirm Cancellation'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrderDetailsPage;

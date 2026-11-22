import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ShoppingBag,
  User,
  MapPin,
  Calendar,
  CreditCard,
  Truck,
  Package,
  Store,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { adminService } from '../services/adminService.js';
import { sellerService } from '../../seller/services/sellerService.js';
import { queryKeys } from '../../../lib/queryClient.js';
import { ROUTE_PATHS } from '../../../routes/routePaths.js';
import { getProductImageUrl, formatDate } from '../../../lib/utils.js';
import { Card } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { PriceDisplay } from '../../../components/common/PriceDisplay.jsx';

export const OrderDetailsPage = () => {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState({ text: '', type: '' });

  const { data: order, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.orders.adminDetail(id),
    queryFn: () => adminService.getOrder(id),
    enabled: !!id,
  });

  const updateItemStatusMutation = useMutation({
    mutationFn: ({ itemId, status }) => sellerService.updateFulfillmentStatus(itemId, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.adminDetail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      setFeedback({ text: `Item #${variables.itemId} status set to "${variables.status}"`, type: 'success' });
      setTimeout(() => setFeedback({ text: '', type: '' }), 4000);
    },
    onError: (err) => {
      setFeedback({ text: err?.response?.data?.detail || err?.message || 'Failed to update item status.', type: 'error' });
      setTimeout(() => setFeedback({ text: '', type: '' }), 5000);
    },
  });

  const getItemBadge = (rawStatus) => {
    const status = (rawStatus || '').toLowerCase().trim();
    switch (status) {
      case 'delivered':
        return <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 font-bold text-[11px] py-0.5">Delivered</Badge>;
      case 'shipped':
        return <Badge variant="outline" className="border-blue-500/40 bg-blue-500/10 text-blue-600 font-bold text-[11px] py-0.5">Shipped</Badge>;
      case 'processing':
        return <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary font-bold text-[11px] py-0.5">Processing</Badge>;
      case 'confirmed':
        return <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-600 font-bold text-[11px] py-0.5">Confirmed</Badge>;
      case 'pending':
        return <Badge variant="outline" className="border-orange-500/40 bg-orange-500/10 text-orange-600 font-bold text-[11px] py-0.5">Pending</Badge>;
      case 'cancelled':
        return <Badge variant="destructive" className="font-bold text-[11px] py-0.5">Cancelled</Badge>;
      default:
        return <Badge variant="outline" className="capitalize text-[11px] py-0.5">{status || 'Pending'}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 bg-muted rounded animate-pulse" />
        <Card className="p-8 border-border bg-card animate-pulse space-y-4">
          <div className="h-6 w-48 bg-muted rounded" />
          <div className="h-4 w-72 bg-muted/60 rounded" />
        </Card>
      </div>
    );
  }

  if (isError || !order) {
    return (
      <Card className="p-10 text-center border-destructive/20 bg-destructive/5 space-y-4">
        <AlertCircle size={36} className="mx-auto text-destructive" />
        <h2 className="text-base font-extrabold text-foreground">Order Not Found</h2>
        <p className="text-xs text-muted-foreground">
          Unable to locate the order record for ID #{id}.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <Button asChild variant="outline" size="sm" className="rounded-xl text-xs cursor-pointer">
            <Link to={ROUTE_PATHS.ADMIN.ORDERS}>
              <ArrowLeft size={13} className="mr-1.5" />
              <span>Back to Orders</span>
            </Link>
          </Button>
          <Button size="sm" onClick={() => refetch()} className="rounded-xl text-xs cursor-pointer">
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  const items = order.items || [];
  const address = order.shipping_address || order.address || {};
  const customerName =
    order.customer_name ||
    order.user?.name ||
    order.user?.email ||
    order.customer_email ||
    'Registered Buyer';

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link
          to={ROUTE_PATHS.ADMIN.ORDERS}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={13} />
          <span>Back to All Orders</span>
        </Link>
      </div>

      {/* Order Top Banner */}
      <Card className="p-6 border-border bg-card shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShoppingBag size={24} />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-extrabold text-foreground font-mono">
                  Order #{order.order_number || order.id}
                </h1>
                <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary font-bold text-xs py-0.5 capitalize">
                  {order.status || 'Confirmed'}
                </Badge>
                <Badge
                  variant="secondary"
                  className={`text-[10px] font-bold uppercase ${
                    order.payment_method === 'cod'
                      ? 'bg-amber-500/10 text-amber-600'
                      : 'bg-emerald-500/10 text-emerald-600'
                  }`}
                >
                  {order.payment_method === 'cod' ? 'Cash on Delivery' : 'Prepaid'}
                </Badge>
              </div>

              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                <Calendar size={12} />
                <span>
                  Placed on {formatDate(order.created_at)}
                </span>
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs text-muted-foreground block">Total Amount</span>
            <PriceDisplay price={order.total_amount || order.grand_total || '0'} size="lg" />
          </div>
        </div>

        {/* Customer & Shipping Summary Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
          {/* Customer Card */}
          <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-2">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <User size={14} className="text-primary" />
              <span>Customer Information</span>
            </div>
            <div className="space-y-0.5 text-muted-foreground">
              <p className="font-semibold text-foreground">{customerName}</p>
              <p>{order.customer_email || order.user?.email || 'No email provided'}</p>
              {order.customer_phone && <p>Phone: {order.customer_phone}</p>}
            </div>
          </div>

          {/* Shipping Address Card */}
          <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-2">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <MapPin size={14} className="text-primary" />
              <span>Delivery Address</span>
            </div>
            <div className="space-y-0.5 text-muted-foreground">
              <p className="font-semibold text-foreground">{address.full_name || customerName}</p>
              <p>{address.street_address || address.address_line_1 || 'Address details on file'}</p>
              <p>
                {[address.city, address.state, address.postal_code, address.country]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Feedback banner */}
      {feedback.text && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            feedback.type === 'error'
              ? 'bg-destructive/10 text-destructive border border-destructive/20'
              : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
          }`}
        >
          {feedback.type === 'error' ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Ordered Products Table */}
      <Card className="p-6 border-border bg-card shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <Package size={16} className="text-primary" />
            <h2 className="text-sm font-extrabold text-foreground">
              Ordered Artisan Items ({items.length})
            </h2>
          </div>
        </div>

        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            No line items found for this order.
          </p>
        ) : (
          <div className="divide-y divide-border/60">
            {items.map((item, idx) => {
              const itemImg = getProductImageUrl(
                item.product?.primary_image?.image || item.image || item.product?.image
              );
              const currentItemStatus = (item.status || item.fulfillment_status || 'pending').toLowerCase().trim();
              const isUpdating = updateItemStatusMutation.isPending && updateItemStatusMutation.variables?.itemId === item.id;

              return (
                <div key={item.id || idx} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-border bg-muted/30">
                      {itemImg ? (
                        <img
                          src={itemImg}
                          alt={item.product_title || item.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
                          <Package size={18} />
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xs font-bold text-foreground">
                          {item.product_title || item.title || item.product?.title || 'Artisan Product'}
                        </h3>
                        {getItemBadge(currentItemStatus)}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <Store size={11} className="text-primary/70" />
                        <span>{item.seller_name || item.seller?.store_name || 'Artisan Workshop'}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Qty: <strong className="text-foreground">{item.quantity}</strong> × ₹{item.price || item.unit_price}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0">
                    <div className="text-right">
                      <span className="text-[11px] text-muted-foreground block">Line Total</span>
                      <PriceDisplay
                        price={(item.quantity || 1) * (Number(item.price || item.unit_price) || 0)}
                        size="sm"
                      />
                    </div>

                    {/* Status update control for admin */}
                    {item.id && (
                      <div className="flex items-center gap-1.5 pt-1">
                        <span className="text-[11px] text-muted-foreground font-medium">Status:</span>
                        <select
                          value={currentItemStatus}
                          onChange={(e) => updateItemStatusMutation.mutate({ itemId: item.id, status: e.target.value })}
                          disabled={isUpdating}
                          aria-label={`Update fulfillment status for ${item.product_title || item.title || 'item'}`}
                          className="h-7 text-[11px] rounded-lg border border-border bg-background px-2 font-medium text-foreground focus:border-primary focus:outline-hidden cursor-pointer"
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="processing">Processing</option>
                          <option value="shipped">Shipped</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                        {isUpdating && <Loader2 size={12} className="animate-spin text-primary" />}
                      </div>
                    )}
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

export default OrderDetailsPage;

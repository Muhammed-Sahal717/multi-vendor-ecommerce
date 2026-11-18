import { useState } from 'react';
import { useLocation, Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle2,
  Package,
  MapPin,
  CreditCard,
  Banknote,
  ArrowRight,
  ShoppingBag,
  Copy,
  Check,
  Calendar,
  Truck,
} from 'lucide-react';
import { orderService } from '../../customer/services/orderService.js';
import { ROUTE_PATHS } from '../../../routes/routePaths.js';
import { Button } from '../../../components/ui/button.jsx';
import { Card } from '../../../components/ui/card.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { PriceDisplay } from '../../../components/common/PriceDisplay.jsx';

export const OrderSuccessPage = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [copied, setCopied] = useState(false);

  // 1. Check if order was passed via navigation state
  const stateOrder = location.state?.order;
  const paidOnline = location.state?.paidOnline;

  const orderIdFromUrl = searchParams.get('order_id');

  // Fallback query if state is empty (e.g. page refreshed)
  const { data: fetchedOrder, isLoading } = useQuery({
    queryKey: ['order', orderIdFromUrl || stateOrder?.id],
    queryFn: () => orderService.getOrderDetails(orderIdFromUrl || stateOrder?.id),
    enabled: !stateOrder && !!orderIdFromUrl,
  });

  const order = stateOrder || fetchedOrder;

  const handleCopyOrderNumber = () => {
    if (order?.order_number && navigator?.clipboard) {
      navigator.clipboard.writeText(order.order_number);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center text-sm text-muted-foreground">
        Loading order details...
      </div>
    );
  }

  // If no order data exists at all
  if (!order) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <ShoppingBag size={32} />
        </div>
        <h1 className="text-xl font-bold text-foreground">No Order Found</h1>
        <p className="text-xs text-muted-foreground">
          We couldn't retrieve your recent order session. You can view your order history from your customer dashboard.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <Button asChild className="rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 text-xs">
            <Link to={ROUTE_PATHS.CUSTOMER.ORDERS}>View Orders</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl font-semibold text-xs">
            <Link to={ROUTE_PATHS.STOREFRONT.PRODUCTS}>Continue Shopping</Link>
          </Button>
        </div>
      </div>
    );
  }

  const isCOD = order.payment_method === 'cod';

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8 space-y-8">
      {/* Celebration Header */}
      <div className="text-center space-y-3">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-8 ring-emerald-500/5">
          <CheckCircle2 size={46} className="stroke-[2.2]" />
        </div>

        <div className="space-y-1">
          <Badge variant="outline" className="text-xs font-bold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/5 px-3 py-1">
            Order Confirmed
          </Badge>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl pt-1">
            Thank You for Your Order!
          </h1>
          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            Your order has been placed successfully with our verified local sellers. A confirmation receipt has been sent to your registered email.
          </p>
        </div>

        {/* Order Number Box */}
        <div className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2 shadow-2xs">
          <span className="text-xs text-muted-foreground">Order ID:</span>
          <span className="text-xs font-mono font-bold text-foreground">
            {order.order_number}
          </span>
          <button
            type="button"
            onClick={handleCopyOrderNumber}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
            title="Copy Order ID"
          >
            {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
          </button>
        </div>
      </div>

      {/* Order Info & Logistics Overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4 rounded-2xl border border-border bg-card space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Calendar size={14} className="text-primary" />
            <span>Order Date</span>
          </div>
          <p className="text-sm font-bold text-foreground">
            {order.created_at
              ? new Date(order.created_at).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : 'Today'}
          </p>
        </Card>

        <Card className="p-4 rounded-2xl border border-border bg-card space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            {isCOD ? <Banknote size={14} className="text-emerald-600" /> : <CreditCard size={14} className="text-primary" />}
            <span>Payment Method</span>
          </div>
          <p className="text-sm font-bold text-foreground">
            {isCOD ? 'Cash on Delivery (COD)' : paidOnline ? 'Online (Paid)' : 'Online (Razorpay)'}
          </p>
        </Card>

        <Card className="p-4 rounded-2xl border border-border bg-card space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Truck size={14} className="text-primary" />
            <span>Estimated Delivery</span>
          </div>
          <p className="text-sm font-bold text-foreground">
            3 - 5 Business Days
          </p>
        </Card>
      </div>

      {/* Delivery Address & Order Items Cards */}
      <div className="space-y-6">
        {/* Shipping Address */}
        <Card className="p-6 rounded-2xl border border-border bg-card space-y-3">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <MapPin size={16} className="text-primary" />
            <h2 className="text-sm font-bold text-foreground">Delivery Address</h2>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="text-sm font-bold text-foreground">{order.shipping_full_name}</p>
            <p>
              {order.shipping_address_line_1}
              {order.shipping_address_line_2 ? `, ${order.shipping_address_line_2}` : ''}
            </p>
            <p>
              {order.shipping_city}, {order.shipping_state} - <span className="font-semibold text-foreground">{order.shipping_postal_code}</span>, {order.shipping_country || 'India'}
            </p>
            <p className="pt-1 text-foreground/80">Phone: <span className="font-semibold">{order.shipping_mobile}</span></p>
          </div>
        </Card>

        {/* Ordered Items Summary */}
        <Card className="p-6 rounded-2xl border border-border bg-card space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Package size={16} className="text-primary" />
              <h2 className="text-sm font-bold text-foreground">Ordered Items ({order.items?.length || 0})</h2>
            </div>
            <span className="text-xs font-bold text-primary">
              Total: <PriceDisplay price={order.total_amount} size="sm" />
            </span>
          </div>

          <div className="divide-y divide-border">
            {order.items?.map((item) => (
              <div key={item.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                <div className="space-y-0.5 flex-1 min-w-0">
                  <p className="font-bold text-foreground line-clamp-1">{item.product_name}</p>
                  <p className="text-muted-foreground text-[11px]">
                    Qty: {item.quantity} × <PriceDisplay price={item.unit_price} size="sm" />
                  </p>
                </div>
                <div className="text-right font-bold text-foreground shrink-0">
                  <PriceDisplay price={item.subtotal} size="sm" />
                </div>
              </div>
            ))}
          </div>

          {/* Pricing calculation summary */}
          <div className="border-t border-border pt-4 space-y-2 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <PriceDisplay price={order.subtotal} size="sm" className="font-semibold text-foreground" />
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Shipping Fee</span>
              {parseFloat(order.shipping_fee) === 0 ? (
                <span className="font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 text-[11px]">
                  Free
                </span>
              ) : (
                <PriceDisplay price={order.shipping_fee} size="sm" className="font-semibold text-foreground" />
              )}
            </div>
            <div className="flex justify-between border-t border-border pt-2 text-sm font-extrabold text-foreground">
              <span>Grand Total</span>
              <PriceDisplay price={order.total_amount} size="md" className="text-primary font-extrabold" />
            </div>
          </div>
        </Card>
      </div>

      {/* Action CTA Buttons */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center pt-2">
        <Button
          asChild
          size="lg"
          className="rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-6 shadow-sm gap-2 cursor-pointer"
        >
          <Link to={ROUTE_PATHS.CUSTOMER.ORDERS}>
            <span>View All Orders</span>
            <ArrowRight size={15} />
          </Link>
        </Button>

        <Button
          asChild
          variant="outline"
          size="lg"
          className="rounded-xl font-semibold border-border hover:bg-muted h-12 px-6 cursor-pointer"
        >
          <Link to={ROUTE_PATHS.STOREFRONT.PRODUCTS}>
            <span>Continue Shopping</span>
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default OrderSuccessPage;

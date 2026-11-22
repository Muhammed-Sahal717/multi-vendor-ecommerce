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

  const stateOrder = location.state?.order;
  const paidOnline = location.state?.paidOnline;
  const orderIdFromUrl = searchParams.get('order_id');

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
      <div className="mx-auto max-w-4xl px-4 py-16 text-center text-xs text-muted-foreground">
        Loading order confirmation details...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center space-y-5">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-muted text-muted-foreground">
          <ShoppingBag size={30} />
        </div>
        <h1 className="text-xl font-black text-foreground font-heading">No Order Found</h1>
        <p className="text-xs text-muted-foreground leading-relaxed">
          We couldn&rsquo;t retrieve your recent order session. You can view your order history anytime from your account dashboard.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <Button asChild className="rounded-2xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 text-xs shadow-md shadow-primary/20">
            <Link to={ROUTE_PATHS.CUSTOMER.ORDERS}>View Orders</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-2xl font-semibold text-xs border-border/80">
            <Link to={ROUTE_PATHS.STOREFRONT.PRODUCTS}>Continue Shopping</Link>
          </Button>
        </div>
      </div>
    );
  }

  const isCOD = order.payment_method === 'cod';

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8 space-y-8">
      {/* Commerce Stepper Bar: All Completed */}
      <div className="flex items-center justify-center gap-2 sm:gap-4 py-2 border-b border-border/60 pb-5">
        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[11px] font-black">
            <Check size={12} className="stroke-[3]" />
          </span>
          <span>Shopping Cart</span>
        </div>
        <div className="h-px w-6 sm:w-14 bg-emerald-500/30" />
        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[11px] font-black">
            <Check size={12} className="stroke-[3]" />
          </span>
          <span>Checkout</span>
        </div>
        <div className="h-px w-6 sm:w-14 bg-emerald-500/30" />
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white text-[11px] font-black shadow-xs">
            <Check size={12} className="stroke-[3]" />
          </span>
          <span>Order Confirmed</span>
        </div>
      </div>

      {/* Celebration Header */}
      <div className="text-center space-y-3 pt-2">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-8 ring-emerald-500/5 shadow-xs">
          <CheckCircle2 size={44} className="stroke-[2.2]" />
        </div>

        <div className="space-y-1.5">
          <Badge variant="outline" className="text-xs font-bold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 rounded-full">
            Order Successfully Placed
          </Badge>
          <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl font-heading pt-1">
            Thank You for Your Order!
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            Your order has been placed with verified artisan sellers. A confirmation receipt has been sent to your registered email.
          </p>
        </div>

        {/* Order Number Box */}
        <div className="inline-flex items-center gap-2.5 rounded-full border border-border/80 bg-card px-4 py-2 shadow-2xs">
          <span className="text-xs text-muted-foreground font-medium">Order ID:</span>
          <span className="text-xs font-mono font-bold text-foreground">
            {order.order_number}
          </span>
          <button
            type="button"
            onClick={handleCopyOrderNumber}
            className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
            title="Copy Order ID"
          >
            {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
          </button>
        </div>
      </div>

      {/* Order Info & Logistics Overview */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="p-4 rounded-3xl border border-border/60 bg-card space-y-1 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Calendar size={14} className="text-primary" />
            <span>Order Date</span>
          </div>
          <p className="text-sm font-bold text-foreground font-heading">
            {order.created_at
              ? new Date(order.created_at).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : 'Today'}
          </p>
        </Card>

        <Card className="p-4 rounded-3xl border border-border/60 bg-card space-y-1 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            {isCOD ? <Banknote size={14} className="text-emerald-600" /> : <CreditCard size={14} className="text-primary" />}
            <span>Payment Method</span>
          </div>
          <p className="text-sm font-bold text-foreground font-heading">
            {isCOD ? 'Cash on Delivery (COD)' : paidOnline ? 'Online (Paid)' : 'Online (Razorpay)'}
          </p>
        </Card>

        <Card className="p-4 rounded-3xl border border-border/60 bg-card space-y-1 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Truck size={14} className="text-primary" />
            <span>Estimated Delivery</span>
          </div>
          <p className="text-sm font-bold text-foreground font-heading">
            3 - 5 Business Days
          </p>
        </Card>
      </div>

      {/* Delivery Address & Order Items Cards */}
      <div className="space-y-6">
        {/* Shipping Address */}
        <Card className="p-6 rounded-3xl border border-border/60 bg-card space-y-3 shadow-sm">
          <div className="flex items-center gap-2.5 border-b border-border/60 pb-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <MapPin size={15} />
            </div>
            <h2 className="text-sm font-bold text-foreground font-heading">Delivery Address</h2>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="text-sm font-bold text-foreground">{order.shipping_full_name}</p>
            <p className="leading-relaxed">
              {order.shipping_address_line_1}
              {order.shipping_address_line_2 ? `, ${order.shipping_address_line_2}` : ''}
            </p>
            <p>
              {order.shipping_city}, {order.shipping_state} - <span className="font-bold text-foreground">{order.shipping_postal_code}</span>, {order.shipping_country || 'India'}
            </p>
            <p className="pt-1 text-foreground/80 font-medium">Contact: <span>{order.shipping_mobile}</span></p>
          </div>
        </Card>

        {/* Ordered Items Summary */}
        <Card className="p-6 rounded-3xl border border-border/60 bg-card space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Package size={15} />
              </div>
              <h2 className="text-sm font-bold text-foreground font-heading">Ordered Items ({order.items?.length || 0})</h2>
            </div>
            <span className="text-xs font-bold text-primary">
              Total: <PriceDisplay price={order.total_amount} size="sm" />
            </span>
          </div>

          <div className="divide-y divide-border/60">
            {order.items?.map((item) => (
              <div key={item.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                <div className="space-y-0.5 flex-1 min-w-0">
                  <p className="font-bold text-foreground line-clamp-1">{item.product_name}</p>
                  <p className="text-muted-foreground text-[11px]">
                    Qty: {item.quantity} × <PriceDisplay price={item.unit_price} size="sm" />
                  </p>
                </div>
                <div className="text-right font-black text-foreground shrink-0 font-heading">
                  <PriceDisplay price={item.subtotal} size="sm" />
                </div>
              </div>
            ))}
          </div>

          {/* Pricing calculation summary */}
          <div className="border-t border-border/60 pt-4 space-y-2 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <PriceDisplay price={order.subtotal} size="sm" className="font-bold text-foreground" />
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Shipping Fee</span>
              {parseFloat(order.shipping_fee) === 0 ? (
                <span className="font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 text-[11px]">
                  Free Delivery
                </span>
              ) : (
                <PriceDisplay price={order.shipping_fee} size="sm" className="font-bold text-foreground" />
              )}
            </div>
            <div className="flex justify-between border-t border-border/60 pt-3 text-sm font-black text-foreground">
              <span className="font-heading">Grand Total</span>
              <PriceDisplay price={order.total_amount} size="md" className="text-foreground font-black font-heading text-lg" />
            </div>
          </div>
        </Card>
      </div>

      {/* Action CTA Buttons */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center pt-2">
        <Button
          asChild
          size="lg"
          className="rounded-2xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-7 shadow-md shadow-primary/25 gap-2 cursor-pointer text-xs sm:text-sm"
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
          className="rounded-2xl font-semibold border-border/80 hover:bg-muted h-12 px-7 cursor-pointer text-xs sm:text-sm"
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

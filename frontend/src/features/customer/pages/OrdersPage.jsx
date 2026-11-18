import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Package,
  Calendar,
  CreditCard,
  Banknote,
  ArrowRight,
  ShoppingBag,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { orderService } from '../services/orderService.js';
import { queryKeys } from '../../../lib/queryClient.js';
import { ROUTE_PATHS } from '../../../routes/routePaths.js';
import { Card } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { PriceDisplay } from '../../../components/common/PriceDisplay.jsx';

const STATUS_FILTERS = [
  { label: 'All Orders', value: '' },
  { label: 'Processing', value: 'processing' },
  { label: 'Shipped', value: 'shipped' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Cancelled', value: 'cancelled' },
];

export const OrdersPage = () => {
  const [selectedStatus, setSelectedStatus] = useState('');

  // Fetch orders
  const { data: ordersData, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.orders.list(selectedStatus ? { status: selectedStatus } : {}),
    queryFn: () => orderService.getOrders(selectedStatus ? { status: selectedStatus } : {}),
  });

  const orders = Array.isArray(ordersData) ? ordersData : ordersData?.results || [];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'delivered':
        return (
          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 font-bold text-xs py-0.5">
            Delivered
          </Badge>
        );
      case 'shipped':
        return (
          <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-600 font-bold text-xs py-0.5">
            Shipped
          </Badge>
        );
      case 'processing':
      case 'confirmed':
        return (
          <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary font-bold text-xs py-0.5">
            Processing
          </Badge>
        );
      case 'cancelled':
        return <Badge variant="destructive" className="font-bold text-xs py-0.5">Cancelled</Badge>;
      default:
        return (
          <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-600 font-bold text-xs py-0.5">
            Pending
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
            My Orders
          </h1>
          <p className="text-xs text-muted-foreground">
            Track real-time shipment updates, cancellations, and order receipts.
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
          <span>Loading your orders...</span>
        </div>
      )}

      {isError && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5 text-center space-y-2">
          <p className="text-xs text-destructive font-semibold">Could not load orders.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs">
            Retry
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && orders.length === 0 && (
        <Card className="rounded-3xl border border-dashed border-border p-12 text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Package size={28} />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-foreground">No orders found</h2>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {selectedStatus
                ? `No orders matching filter "${selectedStatus}".`
                : "You haven't placed any orders yet. Discover our collection of natural artisan creations!"}
            </p>
          </div>
          <Button
            asChild
            className="rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 text-xs px-5 shadow-xs cursor-pointer gap-1.5"
          >
            <Link to={ROUTE_PATHS.STOREFRONT.PRODUCTS}>
              <ShoppingBag size={14} />
              <span>Explore Products</span>
            </Link>
          </Button>
        </Card>
      )}

      {/* Orders List */}
      <div className="space-y-4">
        {orders.map((order) => {
          const isCOD = order.payment_method === 'cod';
          return (
            <Card
              key={order.id}
              className="rounded-2xl border border-border bg-card p-6 shadow-2xs space-y-4 hover:border-primary/30 transition-all"
            >
              {/* Order Card Header */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-mono text-sm font-bold text-foreground">
                    #{order.order_number}
                  </span>
                  {getStatusBadge(order.status)}
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar size={12} />
                    {order.created_at
                      ? new Date(order.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'Recently'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-border text-xs text-muted-foreground gap-1 py-0.5">
                    {isCOD ? <Banknote size={11} className="text-emerald-600" /> : <CreditCard size={11} className="text-primary" />}
                    <span>{isCOD ? 'Cash on Delivery' : 'Online Payment'}</span>
                  </Badge>
                </div>
              </div>

              {/* Items Summary */}
              <div className="space-y-2">
                {order.items?.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-xs py-1">
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="font-semibold text-foreground line-clamp-1">{item.product_name}</p>
                      <p className="text-[11px] text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                    <PriceDisplay price={item.subtotal} size="sm" className="font-semibold text-foreground shrink-0" />
                  </div>
                ))}
              </div>

              {/* Card Footer: Delivery recipient & Total & Detail Button */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-border/80 pt-3 text-xs">
                <p className="text-muted-foreground text-[11px]">
                  Shipping to: <span className="font-semibold text-foreground">{order.shipping_full_name}</span> ({order.shipping_city}, {order.shipping_state})
                </p>

                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Total</span>
                    <PriceDisplay price={order.total_amount} size="md" className="font-extrabold text-primary" />
                  </div>

                  <Button asChild variant="outline" size="sm" className="h-9 rounded-xl font-bold border-border text-xs gap-1.5 hover:border-primary/40 hover:bg-primary/5">
                    <Link to={ROUTE_PATHS.CUSTOMER.ORDER_DETAILS(order.id)}>
                      <span>View Details</span>
                      <ChevronRight size={13} />
                    </Link>
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default OrdersPage;

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ShoppingBag,
  Search,
  Eye,
  Calendar,
  CreditCard,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Package,
} from 'lucide-react';
import { adminService } from '../services/adminService.js';
import { queryKeys } from '../../../lib/queryClient.js';
import { ROUTE_PATHS } from '../../../routes/routePaths.js';
import { formatDate } from '../../../lib/utils.js';
import { Card } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Input } from '../../../components/ui/input.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { PriceDisplay } from '../../../components/common/PriceDisplay.jsx';

const STATUS_FILTERS = [
  { label: 'All Orders', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Processing', value: 'processing' },
  { label: 'Shipped', value: 'shipped' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Cancelled', value: 'cancelled' },
];

export const OrdersPage = () => {
  const [selectedStatus, setSelectedStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch admin orders
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.orders.adminList({
      status: selectedStatus || undefined,
      search: searchQuery || undefined,
    }),
    queryFn: () =>
      adminService.getOrders({
        status: selectedStatus || undefined,
        search: searchQuery || undefined,
      }),
  });

  const rawOrders = Array.isArray(data) ? data : data?.results || [];
  const orders = rawOrders.filter((order) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const orderNum = (order.order_number || order.id || '').toString().toLowerCase();
    const custEmail = (order.customer_email || order.user?.email || order.user?.name || '').toLowerCase();
    return orderNum.includes(q) || custEmail.includes(q);
  });

  const getFulfillmentBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'delivered':
        return (
          <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 font-bold text-xs py-0.5 gap-1">
            <CheckCircle2 size={11} />
            <span>Delivered</span>
          </Badge>
        );
      case 'shipped':
        return (
          <Badge variant="outline" className="border-blue-500/40 bg-blue-500/10 text-blue-600 font-bold text-xs py-0.5 gap-1">
            <Truck size={11} />
            <span>Shipped</span>
          </Badge>
        );
      case 'processing':
      case 'confirmed':
        return (
          <Badge variant="outline" className="border-indigo-500/40 bg-indigo-500/10 text-indigo-600 font-bold text-xs py-0.5 gap-1">
            <Package size={11} />
            <span className="capitalize">{status}</span>
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="outline" className="border-rose-500/40 bg-rose-500/10 text-rose-600 font-bold text-xs py-0.5 gap-1">
            <XCircle size={11} />
            <span>Cancelled</span>
          </Badge>
        );
      case 'pending':
      default:
        return (
          <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-600 font-bold text-xs py-0.5 gap-1">
            <Clock size={11} />
            <span>Pending</span>
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
              Platform Orders
            </h1>
            <Badge variant="secondary" className="font-bold text-xs">
              {orders.length}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitor orders across all artisan sellers, inspect delivery tracking, and resolve fulfillment bottlenecks.
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <Card className="p-4 border-border/80 bg-card/60 backdrop-blur-xs space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-muted/60 p-1 rounded-xl">
            {STATUS_FILTERS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setSelectedStatus(tab.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  selectedStatus === tab.value
                    ? 'bg-card text-foreground shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search order #, customer email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs rounded-xl bg-card border-border"
            />
          </div>
        </div>
      </Card>

      {/* Orders List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-4 animate-pulse border-border bg-card">
              <div className="h-5 w-1/3 bg-muted rounded mb-2" />
              <div className="h-4 w-1/4 bg-muted/60 rounded" />
            </Card>
          ))}
        </div>
      ) : isError ? (
        <Card className="p-8 text-center border-destructive/20 bg-destructive/5 space-y-3">
          <AlertCircle size={32} className="mx-auto text-destructive" />
          <h3 className="text-sm font-bold text-foreground">Failed to load platform orders</h3>
          <p className="text-xs text-muted-foreground">Unable to fetch orders right now.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="cursor-pointer">
            Retry
          </Button>
        </Card>
      ) : orders.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-border bg-card/40 space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShoppingBag size={28} />
          </div>
          <h3 className="text-sm font-bold text-foreground">No orders found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {selectedStatus
              ? `No orders currently matching "${selectedStatus}" status.`
              : 'No orders have been recorded matching your search.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const customerName =
              order.customer_name ||
              order.user?.name ||
              order.user?.email ||
              order.customer_email ||
              'Customer';
            const orderDate = formatDate(order.created_at);
            const itemCount = order.items_count ?? order.items?.length ?? 1;

            return (
              <Card
                key={order.id}
                className="p-4 border-border bg-card hover:border-primary/30 transition-all shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <ShoppingBag size={20} />
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={ROUTE_PATHS.ADMIN.ORDER_DETAILS(order.id)}
                        className="text-sm font-extrabold text-foreground hover:text-primary transition-colors font-mono"
                      >
                        #{order.order_number || order.id}
                      </Link>
                      {getFulfillmentBadge(order.status || order.fulfillment_status)}

                      <Badge
                        variant="secondary"
                        className={`text-[10px] font-bold py-0 uppercase ${
                          order.payment_method === 'cod'
                            ? 'bg-amber-500/10 text-amber-600'
                            : 'bg-emerald-500/10 text-emerald-600'
                        }`}
                      >
                        {order.payment_method === 'cod' ? 'Cash on Delivery' : 'Online Prepaid'}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span>
                        Buyer: <strong className="text-foreground font-semibold">{customerName}</strong>
                      </span>
                      <span>•</span>
                      <span>{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        <span>{orderDate}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 self-stretch sm:self-center">
                  <div className="text-right">
                    <span className="text-[11px] text-muted-foreground block">Order Total</span>
                    <PriceDisplay price={order.total_amount || order.grand_total || '0'} size="md" />
                  </div>

                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="rounded-xl text-xs h-8 px-3 font-semibold text-muted-foreground hover:text-foreground cursor-pointer gap-1.5"
                  >
                    <Link to={ROUTE_PATHS.ADMIN.ORDER_DETAILS(order.id)}>
                      <Eye size={13} />
                      <span>Details</span>
                    </Link>
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OrdersPage;

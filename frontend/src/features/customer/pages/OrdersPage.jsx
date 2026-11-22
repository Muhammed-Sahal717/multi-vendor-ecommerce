import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Package,
  Calendar,
  CreditCard,
  Banknote,
  ShoppingBag,
  Loader2,
  ChevronRight,
  Search,
  X,
  MapPin,
} from 'lucide-react';
import { orderService } from '../services/orderService.js';
import { queryKeys } from '../../../lib/queryClient.js';
import { ROUTE_PATHS } from '../../../routes/routePaths.js';
import { Card } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { Input } from '../../../components/ui/input.jsx';
import { PriceDisplay } from '../../../components/common/PriceDisplay.jsx';
import { getProductImageUrl } from '../../../lib/utils.js';

const STATUS_FILTERS = [
  {
    label: 'All Orders',
    value: '',
    matches: null, // matches everything
  },
  {
    label: 'Processing',
    value: 'processing',
    matches: ['processing', 'confirmed', 'pending'],
  },
  {
    label: 'Shipped',
    value: 'shipped',
    matches: ['shipped', 'in_transit'],
  },
  {
    label: 'Delivered',
    value: 'delivered',
    matches: ['delivered', 'completed'],
  },
  {
    label: 'Cancelled',
    value: 'cancelled',
    matches: ['cancelled', 'refunded', 'rejected'],
  },
];

export const OrdersPage = () => {
  const [selectedStatus, setSelectedStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch orders (fetch comprehensive list to enable instant client-side filtering and real-time badge counts)
  const { data: ordersData, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.orders.list({ page_size: 100 }),
    queryFn: () => orderService.getOrders({ page_size: 100 }),
  });

  const allOrders = useMemo(() => {
    return Array.isArray(ordersData) ? ordersData : ordersData?.results || [];
  }, [ordersData]);

  // Compute count for each filter pill
  const filterCounts = useMemo(() => {
    const counts = { '': allOrders.length };

    STATUS_FILTERS.forEach((filter) => {
      if (!filter.value) return;
      const count = allOrders.filter((order) => {
        const status = (order.status || order.order_status || order.fulfillment_status || '').toLowerCase();
        return filter.matches.includes(status);
      }).length;
      counts[filter.value] = count;
    });

    return counts;
  }, [allOrders]);

  // Filter orders by selected status and search query
  const filteredOrders = useMemo(() => {
    return allOrders.filter((order) => {
      // 1. Status Filter
      if (selectedStatus) {
        const currentFilter = STATUS_FILTERS.find((f) => f.value === selectedStatus);
        const matchSet = currentFilter?.matches || [selectedStatus];
        const status = (order.status || order.order_status || order.fulfillment_status || '').toLowerCase();
        if (!matchSet.includes(status)) {
          return false;
        }
      }

      // 2. Search Query Filter (Order ID or item product name)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesOrderNumber = (order.order_number || '').toLowerCase().includes(q);
        const matchesRecipient = (order.shipping_full_name || '').toLowerCase().includes(q);
        const matchesItems = order.items?.some((item) =>
          (item.product_name || '').toLowerCase().includes(q)
        );

        if (!matchesOrderNumber && !matchesRecipient && !matchesItems) {
          return false;
        }
      }

      return true;
    });
  }, [allOrders, selectedStatus, searchQuery]);

  const getStatusBadge = (rawStatus) => {
    const status = (rawStatus || '').toLowerCase();
    switch (status) {
      case 'delivered':
      case 'completed':
        return (
          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] rounded-full px-2.5 py-0.5">
            Delivered
          </Badge>
        );
      case 'shipped':
      case 'in_transit':
        return (
          <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-[11px] rounded-full px-2.5 py-0.5">
            Shipped
          </Badge>
        );
      case 'processing':
      case 'confirmed':
      case 'pending':
        return (
          <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary font-bold text-[11px] rounded-full px-2.5 py-0.5">
            Processing
          </Badge>
        );
      case 'cancelled':
      case 'refunded':
      case 'rejected':
        return (
          <Badge variant="destructive" className="font-bold text-[11px] rounded-full px-2.5 py-0.5">
            Cancelled
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-[11px] rounded-full px-2.5 py-0.5">
            {rawStatus || 'Pending'}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls Toolbar */}
      <div className="flex flex-col gap-4 border-b border-border/60 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground font-heading">
              My Orders
            </h1>
            <p className="text-xs text-muted-foreground">
              Track shipments, cancellations, and order receipts in real-time.
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by ID or item..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 pl-9 pr-8 text-xs rounded-2xl border-border/80 bg-card shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
                title="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Filter Pills with Live Order Counts */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth pt-1">
          {STATUS_FILTERS.map((filter) => {
            const isSelected = selectedStatus === filter.value;
            const count = filterCounts[filter.value] ?? 0;

            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => setSelectedStatus(filter.value)}
                className={`group flex items-center gap-1.5 rounded-2xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25 font-heading'
                    : 'bg-card border border-border/70 text-muted-foreground hover:border-primary/40 hover:text-foreground'
                }`}
              >
                <span>{filter.label}</span>
                <span
                  className={`inline-flex items-center justify-center rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                    isSelected
                      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : 'bg-muted text-muted-foreground group-hover:text-foreground'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="py-20 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 size={18} className="animate-spin text-primary" />
          <span>Fetching your orders...</span>
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="rounded-3xl border border-destructive/30 bg-destructive/10 p-6 text-center space-y-3">
          <p className="text-xs font-bold text-destructive">Could not load orders.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="rounded-2xl text-xs">
            Retry
          </Button>
        </div>
      )}

      {/* Empty State: No Orders in Filter / Search */}
      {!isLoading && !isError && filteredOrders.length === 0 && (
        <Card className="rounded-3xl border border-dashed border-border/80 p-12 text-center space-y-4 bg-muted/5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-muted text-muted-foreground">
            <Package size={30} className="stroke-[1.5]" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-foreground font-heading">
              {allOrders.length === 0
                ? "You haven't placed any orders yet"
                : searchQuery
                  ? `No orders matching "${searchQuery}"`
                  : `No ${selectedStatus ? `"${STATUS_FILTERS.find((f) => f.value === selectedStatus)?.label}"` : ''} orders found`}
            </h2>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {allOrders.length === 0
                ? 'Discover our curated collection of authentic artisan creations and place your first order!'
                : 'Try clearing your active filters or searching with a different keyword.'}
            </p>
          </div>

          <div className="flex justify-center gap-2.5 pt-1">
            {allOrders.length > 0 ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSelectedStatus('');
                  setSearchQuery('');
                }}
                className="rounded-2xl font-bold text-xs px-5 border-border/80 hover:border-primary/40 cursor-pointer"
              >
                Clear All Filters
              </Button>
            ) : (
              <Button
                asChild
                className="rounded-2xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 text-xs px-6 shadow-md shadow-primary/20 cursor-pointer gap-1.5"
              >
                <Link to={ROUTE_PATHS.STOREFRONT.PRODUCTS}>
                  <ShoppingBag size={14} />
                  <span>Start Shopping</span>
                </Link>
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Orders List */}
      {!isLoading && filteredOrders.length > 0 && (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const isCOD = order.payment_method === 'cod';
            return (
              <Card
                key={order.id}
                className="rounded-3xl border border-border/60 bg-card p-5 sm:p-6 shadow-sm space-y-4 hover:border-primary/40 hover:shadow-md transition-all duration-200"
              >
                {/* Order Card Header */}
                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-3.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-mono text-xs sm:text-sm font-bold text-foreground bg-muted/40 px-2.5 py-1 rounded-xl border border-border/60">
                      #{order.order_number}
                    </span>
                    {getStatusBadge(order.status)}
                    <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium pl-1">
                      <Calendar size={12} className="text-primary/70" />
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
                    <Badge variant="outline" className="border-border/80 text-[11px] font-semibold text-muted-foreground gap-1.5 py-0.5 rounded-full px-3">
                      {isCOD ? (
                        <Banknote size={12} className="text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <CreditCard size={12} className="text-primary" />
                      )}
                      <span>{isCOD ? 'Cash on Delivery' : 'Online Payment'}</span>
                    </Badge>
                  </div>
                </div>

                {/* Items Summary with Product Pods */}
                <div className="space-y-2">
                  {order.items?.map((item) => {
                    const imgUrl = getProductImageUrl(item) || getProductImageUrl(item?.primary_image || item?.image);
                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 rounded-2xl border border-border/40 bg-muted/15 p-2 sm:p-2.5 text-xs transition-colors"
                      >
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-border/60 bg-muted/40">
                          {imgUrl ? (
                            <img
                              src={imgUrl}
                              alt={item.product_name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                              <Package size={14} />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-foreground line-clamp-1">
                            {item.product_name}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Qty: <span className="font-semibold text-foreground">{item.quantity}</span> &bull; <PriceDisplay price={item.unit_price} size="sm" />
                          </p>
                        </div>

                        <div className="text-right font-black text-foreground shrink-0 font-heading">
                          <PriceDisplay price={item.subtotal} size="sm" />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Card Footer */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-border/60 pt-3 text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                    <MapPin size={13} className="text-primary/70 shrink-0" />
                    <span className="truncate">
                      Delivering to: <strong className="text-foreground">{order.shipping_full_name}</strong> ({order.shipping_city}, {order.shipping_state})
                    </span>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-5">
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground block leading-tight">Total</span>
                      <PriceDisplay price={order.total_amount} size="md" className="font-black text-foreground text-base font-heading" />
                    </div>

                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="h-9 rounded-2xl font-bold border-border/80 text-xs gap-1.5 hover:border-primary/50 hover:bg-primary/5 cursor-pointer"
                    >
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
      )}
    </div>
  );
};

export default OrdersPage;

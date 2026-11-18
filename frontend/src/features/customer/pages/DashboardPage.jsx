import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Package,
  Clock,
  MapPin,
  ShoppingBag,
  ArrowRight,
  Store,
  ChevronRight,
} from 'lucide-react';
import { orderService } from '../services/orderService.js';
import { authService } from '../../auth/services/authService.js';
import { useCart } from '../../cart/hooks/useCart.js';
import { useAuth } from '../../../context/AuthProvider.jsx';
import { queryKeys } from '../../../lib/queryClient.js';
import { ROUTE_PATHS } from '../../../routes/routePaths.js';
import { ROLES } from '../../../lib/constants.js';
import { Card } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { PriceDisplay } from '../../../components/common/PriceDisplay.jsx';

export const DashboardPage = () => {
  const { role } = useAuth();
  const { totalItems: cartItemsCount } = useCart();

  // Fetch recent orders
  const { data: ordersData, isLoading: isOrdersLoading } = useQuery({
    queryKey: queryKeys.orders.list({ page_size: 5 }),
    queryFn: () => orderService.getOrders({ page_size: 5 }),
  });

  // Fetch saved addresses
  const { data: addressesData } = useQuery({
    queryKey: queryKeys.auth.addresses(),
    queryFn: authService.getAddresses,
  });

  const orders = Array.isArray(ordersData) ? ordersData : ordersData?.results || [];
  const addresses = Array.isArray(addressesData) ? addressesData : addressesData?.results || [];

  const totalOrders = ordersData?.count ?? orders.length;
  const activeOrders = orders.filter((o) =>
    ['pending', 'confirmed', 'processing', 'shipped'].includes(o.status)
  ).length;

  const isSeller = role === ROLES.SELLER;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'delivered':
        return <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 font-bold text-[11px]">Delivered</Badge>;
      case 'shipped':
        return <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-600 font-bold text-[11px]">Shipped</Badge>;
      case 'processing':
      case 'confirmed':
        return <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary font-bold text-[11px]">Processing</Badge>;
      case 'cancelled':
        return <Badge variant="destructive" className="font-bold text-[11px]">Cancelled</Badge>;
      default:
        return <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-600 font-bold text-[11px]">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Quick Stats Overview */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="rounded-2xl border border-border bg-card p-5 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Total Orders</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Package size={16} />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-foreground">{totalOrders}</p>
          <p className="text-[11px] text-muted-foreground">Lifetime purchases</p>
        </Card>

        <Card className="rounded-2xl border border-border bg-card p-5 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Active Orders</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
              <Clock size={16} />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-foreground">{activeOrders}</p>
          <p className="text-[11px] text-muted-foreground">In transit or processing</p>
        </Card>

        <Card className="rounded-2xl border border-border bg-card p-5 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Saved Addresses</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
              <MapPin size={16} />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-foreground">{addresses.length}</p>
          <p className="text-[11px] text-muted-foreground">Delivery locations</p>
        </Card>

        <Card className="rounded-2xl border border-border bg-card p-5 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Shopping Cart</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <ShoppingBag size={16} />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-foreground">{cartItemsCount}</p>
          <p className="text-[11px] text-muted-foreground">Items awaiting checkout</p>
        </Card>
      </div>

      {/* 2. Recent Orders Section */}
      <Card className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Recent Orders</h2>
            <p className="text-xs text-muted-foreground">Track fulfillment and view receipts of your recent orders.</p>
          </div>
          <Button asChild variant="ghost" size="sm" className="text-xs font-semibold text-primary gap-1">
            <Link to={ROUTE_PATHS.CUSTOMER.ORDERS}>
              <span>View All</span>
              <ArrowRight size={13} />
            </Link>
          </Button>
        </div>

        {isOrdersLoading ? (
          <div className="py-8 text-center text-xs text-muted-foreground">Loading recent orders...</div>
        ) : orders.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Package size={24} />
            </div>
            <p className="text-sm font-semibold text-foreground">You haven't placed any orders yet</p>
            <p className="text-xs text-muted-foreground">Explore handcrafted artisan products and place your first order!</p>
            <Button asChild size="sm" className="rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 text-xs mt-2">
              <Link to={ROUTE_PATHS.STOREFRONT.PRODUCTS}>Start Shopping</Link>
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {orders.slice(0, 5).map((order) => (
              <div key={order.id} className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-foreground">
                      #{order.order_number}
                    </span>
                    {getStatusBadge(order.status)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Placed on {order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent'} • {order.items?.length || 1} {(order.items?.length || 1) === 1 ? 'item' : 'items'}
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <PriceDisplay price={order.total_amount} size="md" className="font-extrabold text-foreground" />
                  <Button asChild variant="outline" size="sm" className="h-8 rounded-xl text-xs font-semibold border-border gap-1">
                    <Link to={ROUTE_PATHS.CUSTOMER.ORDER_DETAILS(order.id)}>
                      <span>Details</span>
                      <ChevronRight size={12} />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 3. Account Actions & Become a Seller CTA */}
      {!isSeller && (
        <Card className="rounded-3xl border border-primary/20 bg-primary/5 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shrink-0">
              <Store size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Sell your artisanal products on GALLA.</h3>
              <p className="text-xs text-muted-foreground">Join our community of authentic local artisans and reach conscious customers nationwide.</p>
            </div>
          </div>
          <Button asChild size="sm" className="rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 text-xs px-4 shrink-0">
            <Link to={ROUTE_PATHS.CUSTOMER.PROFILE}>Become a Seller</Link>
          </Button>
        </Card>
      )}
    </div>
  );
};

export default DashboardPage;

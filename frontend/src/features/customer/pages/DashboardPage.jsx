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
  Sparkles,
  User,
  Truck,
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
        return (
          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] rounded-full px-2.5 py-0.5">
            Delivered
          </Badge>
        );
      case 'shipped':
        return (
          <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-[10px] rounded-full px-2.5 py-0.5">
            In Transit
          </Badge>
        );
      case 'processing':
      case 'confirmed':
        return (
          <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary font-bold text-[10px] rounded-full px-2.5 py-0.5">
            Processing
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="destructive" className="font-bold text-[10px] rounded-full px-2.5 py-0.5">
            Cancelled
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-[10px] rounded-full px-2.5 py-0.5">
            Pending
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* 1. Quick Stats Metrics Cards */}
      <div className="grid grid-cols-2 gap-3.5 sm:gap-4 lg:grid-cols-4">
        {/* Total Orders Card */}
        <Link
          to={ROUTE_PATHS.CUSTOMER.ORDERS}
          className="group block rounded-3xl border border-border/60 bg-card p-5 sm:p-6 shadow-sm hover:border-primary/40 hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Total Orders</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary group-hover:scale-105 transition-transform">
              <Package size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl sm:text-3xl font-black text-foreground font-heading">
            {totalOrders}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
            <span>Lifetime purchases</span>
            <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
          </p>
        </Link>

        {/* Active In-Transit Orders Card */}
        <Link
          to={ROUTE_PATHS.CUSTOMER.ORDERS}
          className="group block rounded-3xl border border-border/60 bg-card p-5 sm:p-6 shadow-sm hover:border-primary/40 hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Active Orders</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
              <Clock size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl sm:text-3xl font-black text-foreground font-heading">
            {activeOrders}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {activeOrders > 0 ? (
              <span className="text-amber-600 dark:text-amber-400 font-semibold">In transit & processing</span>
            ) : (
              <span>All orders delivered</span>
            )}
          </p>
        </Link>

        {/* Saved Addresses Card */}
        <Link
          to={ROUTE_PATHS.CUSTOMER.ADDRESSES}
          className="group block rounded-3xl border border-border/60 bg-card p-5 sm:p-6 shadow-sm hover:border-primary/40 hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Saved Addresses</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/10 text-accent group-hover:scale-105 transition-transform">
              <MapPin size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl sm:text-3xl font-black text-foreground font-heading">
            {addresses.length}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
            <span>Delivery destinations</span>
            <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
          </p>
        </Link>

        {/* Shopping Cart Card */}
        <Link
          to={ROUTE_PATHS.STOREFRONT.CART}
          className="group block rounded-3xl border border-border/60 bg-card p-5 sm:p-6 shadow-sm hover:border-primary/40 hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">In Your Cart</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
              <ShoppingBag size={18} />
            </div>
          </div>
          <p className="mt-3 text-2xl sm:text-3xl font-black text-foreground font-heading">
            {cartItemsCount}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
            {cartItemsCount > 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Proceed to checkout</span>
            ) : (
              <span>Cart is empty</span>
            )}
            <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
          </p>
        </Link>
      </div>

      {/* 2. Quick Actions Bar */}
      <div className="rounded-3xl border border-border/60 bg-card p-5 sm:p-6 shadow-sm space-y-3">
        <h2 className="text-sm font-bold text-foreground font-heading flex items-center gap-2">
          <Sparkles size={14} className="text-primary" />
          <span>Quick Shortcuts</span>
        </h2>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Button
            asChild
            variant="outline"
            className="h-11 rounded-2xl text-xs font-bold border-border/70 hover:border-primary/40 hover:bg-muted/40 justify-start px-3.5 gap-2"
          >
            <Link to={ROUTE_PATHS.STOREFRONT.PRODUCTS}>
              <ShoppingBag size={14} className="text-primary" />
              <span>Browse Products</span>
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="h-11 rounded-2xl text-xs font-bold border-border/70 hover:border-primary/40 hover:bg-muted/40 justify-start px-3.5 gap-2"
          >
            <Link to={ROUTE_PATHS.CUSTOMER.ORDERS}>
              <Truck size={14} className="text-primary" />
              <span>Track Orders</span>
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="h-11 rounded-2xl text-xs font-bold border-border/70 hover:border-primary/40 hover:bg-muted/40 justify-start px-3.5 gap-2"
          >
            <Link to={ROUTE_PATHS.CUSTOMER.ADDRESSES}>
              <MapPin size={14} className="text-primary" />
              <span>Add Address</span>
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="h-11 rounded-2xl text-xs font-bold border-border/70 hover:border-primary/40 hover:bg-muted/40 justify-start px-3.5 gap-2"
          >
            <Link to={ROUTE_PATHS.CUSTOMER.PROFILE}>
              <User size={14} className="text-primary" />
              <span>Edit Profile</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* 3. Recent Orders Section */}
      <Card className="rounded-3xl border border-border/60 bg-card p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div>
            <h2 className="text-lg font-black text-foreground font-heading">Recent Orders</h2>
            <p className="text-xs text-muted-foreground">Track fulfillment and view receipts for your orders.</p>
          </div>
          <Button asChild variant="outline" size="sm" className="rounded-full text-xs font-bold border-border/80 hover:border-primary/40 gap-1.5 h-8">
            <Link to={ROUTE_PATHS.CUSTOMER.ORDERS}>
              <span>View All</span>
              <ArrowRight size={12} />
            </Link>
          </Button>
        </div>

        {isOrdersLoading ? (
          <div className="py-12 text-center text-xs text-muted-foreground">Loading recent orders...</div>
        ) : orders.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-muted text-muted-foreground">
              <Package size={28} className="stroke-[1.5]" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-foreground font-heading">No orders placed yet</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">Explore authentic handcrafted products from local artisans and place your first order.</p>
            </div>
            <Button asChild size="sm" className="rounded-2xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 text-xs shadow-md shadow-primary/20 px-5 h-10 mt-2 cursor-pointer">
              <Link to={ROUTE_PATHS.STOREFRONT.PRODUCTS}>
                <Sparkles size={13} className="mr-1.5" />
                <span>Start Exploring</span>
              </Link>
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {orders.slice(0, 5).map((order) => (
              <div key={order.id} className="py-4.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold text-foreground">
                      #{order.order_number}
                    </span>
                    {getStatusBadge(order.status)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Placed on {order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent'} &bull; {order.items?.length || 1} {(order.items?.length || 1) === 1 ? 'item' : 'items'}
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-5">
                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground block font-medium">Total Amount</span>
                    <PriceDisplay price={order.total_amount} size="md" className="font-black text-foreground font-heading" />
                  </div>
                  <Button asChild variant="outline" size="sm" className="h-9 rounded-2xl text-xs font-bold border-border/80 hover:border-primary/40 gap-1 px-3.5">
                    <Link to={ROUTE_PATHS.CUSTOMER.ORDER_DETAILS(order.id)}>
                      <span>Details</span>
                      <ChevronRight size={13} />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 4. Seller Promotion Strip */}
      {!isSeller ? (
        <Card className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/10 via-card to-card p-6 sm:p-7 shadow-xs">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-xs shrink-0">
                <Store size={22} />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-foreground font-heading">Sell your crafts on GALLA.</h3>
                  <Badge variant="outline" className="border-primary/30 bg-primary/15 text-primary text-[10px] font-bold py-0 rounded-full">
                    Artisans Welcome
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Join our curated marketplace of verified local makers and start selling nationwide with zero listing fees.
                </p>
              </div>
            </div>

            <Button
              asChild
              className="rounded-2xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 text-xs px-5 h-11 shadow-md shadow-primary/20 shrink-0 cursor-pointer gap-1.5"
            >
              <Link to={ROUTE_PATHS.CUSTOMER.PROFILE}>
                <span>Become a Seller</span>
                <ArrowRight size={13} />
              </Link>
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
              <Store size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground font-heading">You are an active seller on GALLA.</h3>
              <p className="text-xs text-muted-foreground">Manage your artisan catalog, inventory, and order fulfillment from your studio portal.</p>
            </div>
          </div>
          <Button asChild size="sm" className="rounded-2xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 px-4 h-10 shrink-0 shadow-sm">
            <Link to={ROUTE_PATHS.SELLER.DASHBOARD}>
              <span>Go to Seller Studio</span>
              <ArrowRight size={13} />
            </Link>
          </Button>
        </Card>
      )}
    </div>
  );
};

export default DashboardPage;

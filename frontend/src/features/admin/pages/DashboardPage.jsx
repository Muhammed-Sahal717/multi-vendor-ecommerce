import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  Users,
  Store,
  Package,
  ShoppingBag,
  CreditCard,
  AlertTriangle,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Clock,
  Layers,
  Banknote,
} from 'lucide-react';
import { adminService } from '../services/adminService.js';
import { queryKeys } from '../../../lib/queryClient.js';
import { ROUTE_PATHS } from '../../../routes/routePaths.js';
import { Card } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { PriceDisplay } from '../../../components/common/PriceDisplay.jsx';

export const DashboardPage = () => {
  const { data: stats, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.admin.dashboard(),
    queryFn: adminService.getDashboardStats,
  });

  if (isLoading) {
    return (
      <div className="py-20 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
        <Loader2 size={16} className="animate-spin text-primary" />
        <span>Loading platform operational metrics...</span>
      </div>
    );
  }

  if (isError || !stats) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-center space-y-2">
        <p className="text-sm font-semibold text-destructive">Failed to load platform dashboard statistics.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs">
          Retry
        </Button>
      </div>
    );
  }

  const pendingApps = stats.sellers?.pending_applications || 0;
  const pendingProducts = stats.products?.pending_approval || 0;
  const pendingCOD = stats.payments?.pending_cod_count || 0;

  return (
    <div className="space-y-8">
      {/* 1. Header */}
      <div className="border-b border-border pb-4">
        <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
          Platform Operations Command Center
        </h1>
        <p className="text-xs text-muted-foreground">
          Real-time oversight of artisan sellers, customer accounts, catalog moderation, and financial settlements.
        </p>
      </div>

      {/* 2. Actionable Moderation Alerts */}
      {(pendingApps > 0 || pendingProducts > 0 || pendingCOD > 0) && (
        <div className="space-y-2.5">
          {pendingApps > 0 && (
            <div className="flex items-center justify-between rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs">
              <div className="flex items-center gap-2.5 text-amber-800 dark:text-amber-300">
                <Clock size={16} className="text-amber-600 shrink-0" />
                <span>
                  <strong>{pendingApps}</strong> artisan seller {pendingApps === 1 ? 'application is' : 'applications are'} awaiting verification and approval.
                </span>
              </div>
              <Button asChild size="sm" className="rounded-xl font-bold bg-amber-600 hover:bg-amber-700 text-white text-xs h-8 px-3.5 shrink-0 gap-1">
                <Link to={ROUTE_PATHS.ADMIN.SELLER_APPLICATIONS}>
                  <span>Review</span>
                  <ArrowRight size={12} />
                </Link>
              </Button>
            </div>
          )}

          {pendingProducts > 0 && (
            <div className="flex items-center justify-between rounded-2xl border border-primary/30 bg-primary/10 p-4 text-xs">
              <div className="flex items-center gap-2.5 text-primary">
                <Package size={16} className="text-primary shrink-0" />
                <span>
                  <strong>{pendingProducts}</strong> artisan {pendingProducts === 1 ? 'creation is' : 'creations are'} queued for quality review before public listing.
                </span>
              </div>
              <Button asChild size="sm" className="rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 text-xs h-8 px-3.5 shrink-0 gap-1">
                <Link to={ROUTE_PATHS.ADMIN.PRODUCTS}>
                  <span>Moderate</span>
                  <ArrowRight size={12} />
                </Link>
              </Button>
            </div>
          )}

          {pendingCOD > 0 && (
            <div className="flex items-center justify-between rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 text-xs">
              <div className="flex items-center gap-2.5 text-blue-800 dark:text-blue-300">
                <Banknote size={16} className="text-blue-600 shrink-0" />
                <span>
                  <strong>{pendingCOD}</strong> Cash on Delivery payments ({<PriceDisplay price={stats.payments?.pending_cod_amount_total || 0} size="sm" className="font-bold inline" />}) awaiting courier collection confirmation.
                </span>
              </div>
              <Button asChild size="sm" className="rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-3.5 shrink-0 gap-1">
                <Link to={ROUTE_PATHS.ADMIN.PAYMENTS}>
                  <span>Confirm</span>
                  <ArrowRight size={12} />
                </Link>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* 3. Top KPI Metric Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Total GMV */}
        <Card className="p-5 rounded-2xl border border-border bg-card space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Total GMV
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <TrendingUp size={16} />
            </div>
          </div>
          <PriceDisplay
            price={stats.payments?.successful_amount_total || 0}
            size="lg"
            className="text-2xl font-extrabold text-foreground"
          />
          <p className="text-[11px] text-muted-foreground">
            {stats.payments?.successful_count || 0} settled transactions
          </p>
        </Card>

        {/* Pending COD */}
        <Card className="p-5 rounded-2xl border border-border bg-card space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Pending COD
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
              <Banknote size={16} />
            </div>
          </div>
          <PriceDisplay
            price={stats.payments?.pending_cod_amount_total || 0}
            size="lg"
            className="text-2xl font-extrabold text-blue-600 dark:text-blue-400"
          />
          <p className="text-[11px] text-muted-foreground">{pendingCOD} uncollected orders</p>
        </Card>

        {/* Customers */}
        <Card className="p-5 rounded-2xl border border-border bg-card space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Customers
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <Users size={16} />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-foreground">{stats.customers?.total || 0}</p>
          <p className="text-[11px] text-muted-foreground">
            {stats.customers?.active || 0} active • {stats.customers?.inactive || 0} suspended
          </p>
        </Card>

        {/* Sellers */}
        <Card className="p-5 rounded-2xl border border-border bg-card space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Artisan Studios
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
              <Store size={16} />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-foreground">{stats.sellers?.total || 0}</p>
          <p className="text-[11px] text-muted-foreground">
            {stats.sellers?.active || 0} active • {stats.sellers?.suspended || 0} suspended
          </p>
        </Card>
      </div>

      {/* 4. Products & Catalog Health Breakdown */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Product Catalog Stats */}
        <Card className="p-6 rounded-3xl border border-border bg-card shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Package size={16} className="text-primary" />
              <h2 className="text-sm font-bold text-foreground">Catalog Quality & Stock</h2>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-xs font-semibold text-primary">
              <Link to={ROUTE_PATHS.ADMIN.PRODUCTS}>Manage</Link>
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-1">
              <span className="text-muted-foreground text-[11px]">Approved Listings</span>
              <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                {stats.products?.approved || 0}
              </p>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-1">
              <span className="text-muted-foreground text-[11px]">Pending Review</span>
              <p className="text-lg font-extrabold text-amber-600 dark:text-amber-400">
                {stats.products?.pending_approval || 0}
              </p>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-1">
              <span className="text-muted-foreground text-[11px]">Total Catalog Items</span>
              <p className="text-lg font-extrabold text-foreground">
                {stats.products?.total || 0}
              </p>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-1">
              <span className="text-muted-foreground text-[11px]">Out of Stock</span>
              <p className="text-lg font-extrabold text-destructive">
                {stats.products?.out_of_stock || 0}
              </p>
            </div>
          </div>
        </Card>

        {/* Orders Pipeline Breakdown */}
        <Card className="p-6 rounded-3xl border border-border bg-card shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <ShoppingBag size={16} className="text-primary" />
              <h2 className="text-sm font-bold text-foreground">Orders Fulfillment Pipeline</h2>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-xs font-semibold text-primary">
              <Link to={ROUTE_PATHS.ADMIN.ORDERS}>View All</Link>
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-1">
              <span className="text-muted-foreground text-[11px]">Delivered & Fulfilled</span>
              <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                {stats.orders?.delivered || 0}
              </p>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-1">
              <span className="text-muted-foreground text-[11px]">In Transit (Shipped)</span>
              <p className="text-lg font-extrabold text-blue-600 dark:text-blue-400">
                {stats.orders?.shipped || 0}
              </p>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-1">
              <span className="text-muted-foreground text-[11px]">Processing with Sellers</span>
              <p className="text-lg font-extrabold text-primary">
                {stats.orders?.processing || stats.orders?.confirmed || 0}
              </p>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-1">
              <span className="text-muted-foreground text-[11px]">Total Platform Orders</span>
              <p className="text-lg font-extrabold text-foreground">
                {stats.orders?.total || 0}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;

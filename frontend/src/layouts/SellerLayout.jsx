import { Outlet, NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  PlusCircle,
  ShoppingBag,
  TrendingUp,
  Receipt,
  Store,
  ChevronRight,
  LogOut,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { Logo } from '../components/shared/Logo.jsx';
import { useAuth } from '../context/AuthProvider.jsx';
import { ROUTE_PATHS } from '../routes/routePaths.js';
import { Badge } from '../components/ui/badge.jsx';

const SELLER_NAV_ITEMS = [
  {
    label: 'Studio Dashboard',
    path: ROUTE_PATHS.SELLER.DASHBOARD,
    icon: LayoutDashboard,
  },
  {
    label: 'Products & Inventory',
    path: ROUTE_PATHS.SELLER.PRODUCTS,
    icon: Package,
  },
  {
    label: 'Add New Product',
    path: ROUTE_PATHS.SELLER.CREATE_PRODUCT,
    icon: PlusCircle,
  },
  {
    label: 'Orders & Fulfillment',
    path: ROUTE_PATHS.SELLER.ORDERS,
    icon: ShoppingBag,
  },
  {
    label: 'Earnings & Revenue',
    path: ROUTE_PATHS.SELLER.EARNINGS_DASHBOARD,
    icon: TrendingUp,
  },
  {
    label: 'Payout Ledger',
    path: ROUTE_PATHS.SELLER.PAYOUT_HISTORY,
    icon: Receipt,
  },
  {
    label: 'Artisan Store Profile',
    path: ROUTE_PATHS.SELLER.PROFILE,
    icon: Store,
  },
];

export const SellerLayout = () => {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-muted/20 text-foreground">
      {/* Top Seller Bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Logo />
            <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary text-[11px] font-bold py-0.5 gap-1">
              <Store size={12} className="text-primary" />
              <span>Seller Studio</span>
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to={ROUTE_PATHS.STOREFRONT.HOME}
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors shadow-2xs"
            >
              <span>Live Storefront</span>
              <ExternalLink size={12} />
            </Link>

            <div className="flex items-center gap-2 border-l border-border pl-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-xs font-bold text-primary-foreground shadow-xs">
                {user?.first_name ? user.first_name[0].toUpperCase() : 'S'}
              </div>
              <span className="hidden sm:inline-block text-xs font-bold text-foreground">
                {user?.first_name ? `${user.first_name}` : 'Artisan Seller'}
              </span>
              <button
                type="button"
                onClick={logout}
                className="ml-2 rounded-lg p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                title="Log out"
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Studio Body */}
      <main className="flex-1 py-8 sm:py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
            {/* Sidebar Navigation */}
            <aside className="lg:col-span-3">
              <div className="rounded-2xl border border-border bg-card p-2.5 shadow-2xs sticky top-24 space-y-1">
                {SELLER_NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === ROUTE_PATHS.SELLER.DASHBOARD}
                      className={({ isActive }) =>
                        `flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all ${
                          isActive
                            ? 'bg-primary text-primary-foreground shadow-xs'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`
                      }
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon size={16} />
                        <span>{item.label}</span>
                      </div>
                      <ChevronRight size={13} className="opacity-60" />
                    </NavLink>
                  );
                })}

                <div className="pt-3 mt-3 border-t border-border/80 px-2">
                  <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-[11px] text-muted-foreground space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-foreground">
                      <ShieldCheck size={13} className="text-primary" />
                      <span>Artisan Guarantee</span>
                    </div>
                    <p className="leading-tight">All products undergo quality review before public listing.</p>
                  </div>
                </div>
              </div>
            </aside>

            {/* Sub-page Content */}
            <div className="lg:col-span-9 min-w-0">
              <Outlet />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SellerLayout;

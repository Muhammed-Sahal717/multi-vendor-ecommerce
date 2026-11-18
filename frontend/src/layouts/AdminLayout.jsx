import { Outlet, NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Store,
  FileCheck,
  Package,
  Layers,
  ShoppingBag,
  CreditCard,
  TrendingUp,
  Receipt,
  ShieldCheck,
  LogOut,
  ExternalLink,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { Logo } from '../components/shared/Logo.jsx';
import { useAuth } from '../context/AuthProvider.jsx';
import { ROUTE_PATHS } from '../routes/routePaths.js';
import { ROLES } from '../lib/constants.js';
import { Badge } from '../components/ui/badge.jsx';

const ADMIN_NAV_ITEMS = [
  {
    label: 'Overview & Stats',
    path: ROUTE_PATHS.ADMIN.DASHBOARD,
    icon: LayoutDashboard,
  },
  {
    label: 'Customer Accounts',
    path: ROUTE_PATHS.ADMIN.CUSTOMERS,
    icon: Users,
  },
  {
    label: 'Artisan Sellers',
    path: ROUTE_PATHS.ADMIN.SELLERS,
    icon: Store,
  },
  {
    label: 'Seller Applications',
    path: ROUTE_PATHS.ADMIN.SELLER_APPLICATIONS,
    icon: FileCheck,
  },
  {
    label: 'Product Review',
    path: ROUTE_PATHS.ADMIN.PRODUCTS,
    icon: Package,
  },
  {
    label: 'Categories Taxonomy',
    path: ROUTE_PATHS.ADMIN.CATEGORIES,
    icon: Layers,
  },
  {
    label: 'Platform Orders',
    path: ROUTE_PATHS.ADMIN.ORDERS,
    icon: ShoppingBag,
  },
  {
    label: 'Payments & COD',
    path: ROUTE_PATHS.ADMIN.PAYMENTS,
    icon: CreditCard,
  },
  {
    label: 'Revenue & Commission',
    path: ROUTE_PATHS.ADMIN.EARNINGS,
    icon: TrendingUp,
  },
  {
    label: 'Seller Payouts',
    path: ROUTE_PATHS.ADMIN.SELLER_PAYOUTS,
    icon: Receipt,
  },
];

export const AdminLayout = () => {
  const { user, role, logout } = useAuth();
  const isSuperAdmin = role === ROLES.SUPERADMIN;

  return (
    <div className="flex min-h-screen flex-col bg-muted/20 text-foreground">
      {/* Top Admin Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Logo />
            <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary text-[11px] font-bold py-0.5 gap-1">
              <Shield size={12} className="text-primary" />
              <span>{isSuperAdmin ? 'Super Admin' : 'Admin Operations'}</span>
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
                {user?.first_name ? user.first_name[0].toUpperCase() : 'A'}
              </div>
              <span className="hidden sm:inline-block text-xs font-bold text-foreground">
                {user?.first_name ? `${user.first_name}` : 'Administrator'}
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

      {/* Main Admin Portal */}
      <main className="flex-1 py-8 sm:py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
            {/* Sidebar Navigation */}
            <aside className="lg:col-span-3">
              <div className="rounded-2xl border border-border bg-card p-2.5 shadow-2xs sticky top-24 space-y-1">
                {ADMIN_NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === ROUTE_PATHS.ADMIN.DASHBOARD}
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

                {/* Superadmin Audit Trail Link */}
                {isSuperAdmin && (
                  <NavLink
                    to={ROUTE_PATHS.SUPER_ADMIN.AUDIT_LOGS}
                    className={({ isActive }) =>
                      `flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold mt-2 border-t border-border/80 pt-3 transition-all ${
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-xs'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`
                    }
                  >
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck size={16} className="text-primary" />
                      <span>Audit Logs Trail</span>
                    </div>
                    <ChevronRight size={13} className="opacity-60" />
                  </NavLink>
                )}
              </div>
            </aside>

            {/* Sub-page Outlet */}
            <div className="lg:col-span-9 min-w-0">
              <Outlet />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;

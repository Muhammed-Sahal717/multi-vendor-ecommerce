import { Outlet, NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  User,
  MapPin,
  CreditCard,
  Store,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { Navbar } from '../components/shared/Navbar.jsx';
import { Footer } from '../components/shared/Footer.jsx';
import { useAuth } from '../context/AuthProvider.jsx';
import { ROUTE_PATHS } from '../routes/routePaths.js';
import { Badge } from '../components/ui/badge.jsx';
import { Card } from '../components/ui/card.jsx';

const NAV_ITEMS = [
  {
    label: 'Overview',
    path: ROUTE_PATHS.CUSTOMER.DASHBOARD,
    icon: LayoutDashboard,
  },
  {
    label: 'My Orders',
    path: ROUTE_PATHS.CUSTOMER.ORDERS,
    icon: Package,
  },
  {
    label: 'Profile & Settings',
    path: ROUTE_PATHS.CUSTOMER.PROFILE,
    icon: User,
  },
  {
    label: 'Delivery Addresses',
    path: ROUTE_PATHS.CUSTOMER.ADDRESSES,
    icon: MapPin,
  },
  {
    label: 'Payment History',
    path: ROUTE_PATHS.CUSTOMER.PAYMENTS,
    icon: CreditCard,
  },
  {
    label: 'Seller Application',
    path: ROUTE_PATHS.CUSTOMER.SELLER_APPLICATION_STATUS,
    icon: Store,
  },
];

export const CustomerLayout = () => {
  const { user, role, logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-muted/20 text-foreground">
      <Navbar />

      <main className="flex-1 py-8 sm:py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Breadcrumbs & Greeting Banner */}
          <div className="mb-8 rounded-3xl border border-border bg-card p-6 shadow-xs sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary text-xl font-bold text-primary-foreground shadow-sm">
                  {user?.first_name ? user.first_name[0].toUpperCase() : user?.email?.[0].toUpperCase() || 'U'}
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
                      Welcome, {user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : 'Customer'}!
                    </h1>
                    <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary text-xs font-bold capitalize">
                      {role || 'Customer'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </div>

              {/* Quick links to storefront */}
              <div className="flex items-center gap-3">
                <Link
                  to={ROUTE_PATHS.STOREFRONT.PRODUCTS}
                  className="rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:border-primary/40 hover:bg-muted/40 transition-colors shadow-2xs"
                >
                  Explore Storefront
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  className="flex items-center gap-1.5 rounded-xl border border-destructive/20 bg-destructive/5 px-3.5 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                >
                  <LogOut size={13} />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>

          {/* Two-Column Grid: Sidebar Nav on Left, Active Page on Right */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
            {/* Sidebar Navigation */}
            <aside className="lg:col-span-3">
              <Card className="rounded-2xl border border-border bg-card p-2.5 shadow-2xs sticky top-24">
                <div className="space-y-1">
                  {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === ROUTE_PATHS.CUSTOMER.DASHBOARD}
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
                </div>
              </Card>
            </aside>

            {/* Sub-view Content */}
            <div className="lg:col-span-9 min-w-0">
              <Outlet />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CustomerLayout;

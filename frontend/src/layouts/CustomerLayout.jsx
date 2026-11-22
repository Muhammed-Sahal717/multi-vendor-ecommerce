import { useState } from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Package,
  User,
  MapPin,
  CreditCard,
  Store,
  LogOut,
  Sparkles,
  Mail,
  Camera,
  ShieldCheck,
} from 'lucide-react';
import { Navbar } from '../components/shared/Navbar.jsx';
import { Footer } from '../components/shared/Footer.jsx';
import { useAuth } from '../context/AuthProvider.jsx';
import { authService } from '../features/auth/services/authService.js';
import { queryKeys } from '../lib/queryClient.js';
import { ROUTE_PATHS } from '../routes/routePaths.js';
import { getUserAvatarUrl } from '../lib/utils.js';
import { Badge } from '../components/ui/badge.jsx';
import { Button } from '../components/ui/button.jsx';

const NAV_TABS = [
  {
    label: 'Overview',
    path: ROUTE_PATHS.CUSTOMER.DASHBOARD,
    icon: LayoutDashboard,
    exact: true,
  },
  {
    label: 'My Orders',
    path: ROUTE_PATHS.CUSTOMER.ORDERS,
    icon: Package,
  },
  {
    label: 'Addresses',
    path: ROUTE_PATHS.CUSTOMER.ADDRESSES,
    icon: MapPin,
  },
  {
    label: 'Profile & Settings',
    path: ROUTE_PATHS.CUSTOMER.PROFILE,
    icon: User,
  },
  {
    label: 'Payment History',
    path: ROUTE_PATHS.CUSTOMER.PAYMENTS,
    icon: CreditCard,
  },
  {
    label: 'Seller Portal',
    path: ROUTE_PATHS.CUSTOMER.SELLER_APPLICATION_STATUS,
    icon: Store,
  },
];

export const CustomerLayout = () => {
  const { user, role, logout } = useAuth();
  const [imgLoadError, setImgLoadError] = useState(false);

  // Fetch full profile to guarantee the uploaded avatar is always loaded & synced
  const { data: profile } = useQuery({
    queryKey: queryKeys.auth.profile(),
    queryFn: authService.getProfile,
    staleTime: 1000 * 60 * 5,
  });

  const avatarUrl = !imgLoadError ? getUserAvatarUrl(profile) || getUserAvatarUrl(user) : null;
  const isSeller = role === 'seller';

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />

      <main className="flex-1 py-6 sm:py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
          {/* 1. Header Profile Banner Card */}
          <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-card p-6 sm:p-7 shadow-sm">
            {/* Abstract White-Orange Wavy Background Image */}
            <div
              className="absolute inset-0 bg-cover bg-center pointer-events-none opacity-85 dark:opacity-35"
              style={{ backgroundImage: `url('/footer-bg.jpg')` }}
            />
            {/* Subtle Glass/Card Overlay for Crisp Typography & Contrast */}
            <div className="absolute inset-0 bg-gradient-to-r from-card/95 via-card/85 to-card/70 backdrop-blur-[1px] pointer-events-none" />

            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              {/* User Avatar + Details */}
              <div className="flex items-center gap-4 sm:gap-5">
                {/* Profile Image with Hover Quick-Change Action */}
                <div className="relative group shrink-0">
                  <div className="flex h-18 w-18 sm:h-20 sm:w-20 items-center justify-center rounded-2xl sm:rounded-3xl border-2 border-border/80 bg-muted/40 text-2xl font-black text-foreground shadow-xs overflow-hidden">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={user?.first_name || 'Profile'}
                        onError={() => setImgLoadError(true)}
                        className="h-full w-full object-cover object-center"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-primary text-primary-foreground font-black text-2xl sm:text-3xl font-heading">
                        {user?.first_name
                          ? user.first_name[0].toUpperCase()
                          : user?.email
                            ? user.email[0].toUpperCase()
                            : 'U'}
                      </div>
                    )}
                  </div>

                  {/* Camera Shortcut to Profile Image Settings */}
                  <Link
                    to={ROUTE_PATHS.CUSTOMER.PROFILE}
                    className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition-transform active:scale-90"
                    title="Change profile picture"
                  >
                    <Camera size={13} />
                  </Link>
                </div>

                {/* Name, Badges & Email */}
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground font-heading">
                      Welcome, {user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : 'Customer'}!
                    </h1>
                    <Badge
                      variant="outline"
                      className="border-primary/30 bg-primary/10 text-primary text-[11px] font-bold capitalize px-2.5 py-0.5 rounded-full"
                    >
                      {role || 'Customer'}
                    </Badge>
                    <div className="hidden sm:inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck size={11} />
                      <span>Verified</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5 truncate">
                      <Mail size={12} className="text-muted-foreground/80 shrink-0" />
                      <span className="truncate">{user?.email}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 self-start sm:self-center shrink-0 pt-2 sm:pt-0">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="rounded-full h-10 px-4 text-xs font-bold border-border/80 hover:border-primary/50 hover:bg-muted/40 transition-all shadow-2xs gap-1.5"
                >
                  <Link to={ROUTE_PATHS.STOREFRONT.PRODUCTS}>
                    <Sparkles size={13} className="text-primary" />
                    <span>Explore Storefront</span>
                  </Link>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={logout}
                  className="rounded-full h-10 px-4 text-xs font-bold border-destructive/30 text-destructive hover:bg-destructive/10 transition-all cursor-pointer gap-1.5"
                >
                  <LogOut size={13} />
                  <span>Logout</span>
                </Button>
              </div>
            </div>
          </div>

          {/* 2. Modern Segmented Tab Bar Navigation */}
          <div className="rounded-2xl border border-border/60 bg-card p-1.5 shadow-2xs">
            <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth" aria-label="Customer portal navigation">
              {NAV_TABS.map((tab) => {
                const Icon = tab.icon;
                // If it's the seller tab and user is active seller, label as Seller Portal
                const tabLabel = tab.path === ROUTE_PATHS.CUSTOMER.SELLER_APPLICATION_STATUS && isSeller
                  ? 'Seller Portal'
                  : tab.label;

                return (
                  <NavLink
                    key={tab.path}
                    to={tab.path}
                    end={tab.exact}
                    className={({ isActive }) =>
                      `flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold whitespace-nowrap transition-all duration-150 cursor-pointer ${
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25 font-heading'
                          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground font-medium'
                      }`
                    }
                  >
                    <Icon size={15} className="shrink-0" />
                    <span>{tabLabel}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* 3. Sub-View Main Content */}
          <div className="min-w-0">
            <Outlet />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CustomerLayout;

import { useState } from 'react';
import { Outlet, NavLink, Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
  PanelLeftClose,
  PanelLeft,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthProvider.jsx';
import { sellerService } from '../features/seller/services/sellerService.js';
import { queryKeys } from '../lib/queryClient.js';
import { ROUTE_PATHS } from '../routes/routePaths.js';
import { getUserAvatarUrl } from '../lib/utils.js';
import { Badge } from '../components/ui/badge.jsx';
import { Button } from '../components/ui/button.jsx';

const SELLER_NAV_GROUPS = [
  {
    title: 'Studio',
    items: [
      {
        label: 'Dashboard',
        path: ROUTE_PATHS.SELLER.DASHBOARD,
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: 'Catalog & Sales',
    items: [
      {
        label: 'Products & Inventory',
        path: ROUTE_PATHS.SELLER.PRODUCTS,
        icon: Package,
      },
      {
        label: 'Add Product',
        path: ROUTE_PATHS.SELLER.CREATE_PRODUCT,
        icon: PlusCircle,
      },
      {
        label: 'Orders & Fulfillment',
        path: ROUTE_PATHS.SELLER.ORDERS,
        icon: ShoppingBag,
      },
    ],
  },
  {
    title: 'Financials',
    items: [
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
    ],
  },
  {
    title: 'Settings',
    items: [
      {
        label: 'Store Profile',
        path: ROUTE_PATHS.SELLER.PROFILE,
        icon: Store,
      },
    ],
  },
];

export const SellerLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  // Collapsible sidebar state stored in localStorage
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('galla_seller_sidebar_collapsed') === 'true';
  });

  // Mobile menu drawer state
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('galla_seller_sidebar_collapsed', String(next));
      return next;
    });
  };

  // Fetch store business name
  const { data: profile } = useQuery({
    queryKey: queryKeys.seller.profile(),
    queryFn: sellerService.getProfile,
    staleTime: 5 * 60 * 1000,
  });

  const storeName = profile?.business_name || (user?.first_name ? `${user.first_name}'s Studio` : 'Artisan Studio');
  const avatarUrl = getUserAvatarUrl(user);

  // Determine current page title
  const getCurrentPageTitle = () => {
    const path = location.pathname;
    if (path === ROUTE_PATHS.SELLER.DASHBOARD) return 'Studio Dashboard';
    if (path === ROUTE_PATHS.SELLER.PRODUCTS) return 'Products & Inventory';
    if (path === ROUTE_PATHS.SELLER.CREATE_PRODUCT) return 'Add New Product';
    if (path.includes('/seller/products/') && path.includes('/edit')) return 'Edit Product';
    if (path === ROUTE_PATHS.SELLER.ORDERS) return 'Orders & Fulfillment';
    if (path.includes('/seller/orders/')) return 'Order Fulfillment Details';
    if (path === ROUTE_PATHS.SELLER.EARNINGS_DASHBOARD) return 'Earnings & Revenue';
    if (path === ROUTE_PATHS.SELLER.PAYOUT_HISTORY) return 'Payout Ledger';
    if (path === ROUTE_PATHS.SELLER.PROFILE) return 'Artisan Store Profile';
    return 'Seller Studio';
  };

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      {/* 1. DESKTOP SHRINKABLE SIDEBAR WITH SMOOTH TRANSITION */}
      <aside
        className={`hidden lg:flex flex-col border-r border-border bg-card/95 backdrop-blur-md shrink-0 select-none relative z-30 transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] will-change-[width] overflow-hidden ${
          isCollapsed ? 'w-[68px]' : 'w-64'
        }`}
      >
        {/* Sidebar Header (Typographic Brand - No Logo Image) */}
        <div className="h-16 flex items-center justify-between px-3 border-b border-border/80 overflow-hidden shrink-0">
          <div className="flex items-center min-w-0 overflow-hidden">
            <Link
              to={ROUTE_PATHS.SELLER.DASHBOARD}
              className="flex items-center gap-2.5 font-heading tracking-wider uppercase font-black text-foreground overflow-hidden group"
            >
              {/* Monogram Box (Clean vector, no image) */}
              {/* <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground font-black text-sm shadow-xs select-none transition-transform duration-200 group-hover:scale-105">
                G
              </span> */}

              {/* Collapsible Brand Text with smooth width/opacity transition */}
              <div
                className={`flex items-center gap-2 overflow-hidden whitespace-nowrap transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                  isCollapsed ? 'max-w-0 opacity-0 pointer-events-none' : 'max-w-[140px] opacity-100'
                }`}
              >
                <span className="text-base font-black tracking-tight text-foreground font-heading">
                  GALLA<span className="text-primary">.</span>
                </span>
                <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary text-[10px] font-bold py-0.5 px-1.5 shrink-0">
                  Studio
                </Badge>
              </div>
            </Link>
          </div>

          <button
            type="button"
            onClick={toggleCollapse}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0"
          >
            {isCollapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>

        {/* Sidebar Nav Items */}
        <div className="flex-1 overflow-y-auto px-2 py-4 space-y-4 scrollbar-none">
          {SELLER_NAV_GROUPS.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1">
              {/* Section Header with smooth collapse */}
              <div
                className={`overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                  isCollapsed ? 'max-h-0 opacity-0 mb-1' : 'max-h-6 opacity-100 pb-1 px-3'
                }`}
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 whitespace-nowrap">
                  {group.title}
                </p>
              </div>

              {isCollapsed && groupIdx > 0 && (
                <div className="my-2 border-t border-border/40 mx-2 transition-opacity duration-300" />
              )}

              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === ROUTE_PATHS.SELLER.DASHBOARD}
                    className={({ isActive }) =>
                      `group relative flex items-center h-10 rounded-xl transition-all cursor-pointer ${
                        isCollapsed ? 'justify-center mx-auto w-10 px-0' : 'w-full px-3'
                      } ${
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-xs font-bold'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground font-medium'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon size={17} className="shrink-0 transition-transform duration-200 group-hover:scale-105" />

                        <span
                          className={`overflow-hidden whitespace-nowrap text-xs transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                            isCollapsed
                              ? 'max-w-0 opacity-0 pointer-events-none ml-0'
                              : 'max-w-[160px] opacity-100 ml-2.5 font-semibold'
                          }`}
                        >
                          {item.label}
                        </span>

                        {!isCollapsed && isActive && (
                          <ChevronRight size={12} className="ml-auto opacity-70 shrink-0" />
                        )}

                        {/* Floating tooltip only when collapsed */}
                        {isCollapsed && (
                          <span className="absolute left-full ml-3 px-2.5 py-1 bg-popover text-popover-foreground border border-border text-xs font-semibold rounded-lg shadow-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-200 z-50 translate-x-1 group-hover:translate-x-0">
                            {item.label}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </div>

        {/* Sidebar Footer with smooth transitions */}
        <div className="p-2 border-t border-border/80 space-y-1.5 bg-card shrink-0">
          {/* Live Storefront */}
          <Link
            to={ROUTE_PATHS.STOREFRONT.HOME}
            target="_blank"
            rel="noreferrer"
            title={isCollapsed ? 'Live Storefront' : undefined}
            className={`group relative flex items-center rounded-xl border border-border bg-muted/20 text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all ${
              isCollapsed ? 'h-10 w-10 mx-auto justify-center' : 'h-9 px-3 justify-between'
            }`}
          >
            <div className="flex items-center">
              <ExternalLink size={14} className="text-primary shrink-0 transition-transform duration-200 group-hover:scale-105" />
              <span
                className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                  isCollapsed ? 'max-w-0 opacity-0 pointer-events-none ml-0' : 'max-w-[140px] opacity-100 ml-2.5'
                }`}
              >
                Live Storefront
              </span>
            </div>
            {!isCollapsed && <ChevronRight size={11} className="opacity-50 shrink-0" />}

            {isCollapsed && (
              <span className="absolute left-full ml-3 px-2.5 py-1 bg-popover text-popover-foreground border border-border text-xs font-semibold rounded-lg shadow-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-200 z-50 translate-x-1 group-hover:translate-x-0">
                Live Storefront
              </span>
            )}
          </Link>

          {/* Seller Profile Block */}
          <div
            className={`flex items-center rounded-xl border border-border/70 bg-muted/30 transition-all ${
              isCollapsed ? 'p-1.5 justify-center' : 'p-2 justify-between'
            }`}
          >
            <div className="flex items-center min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground shadow-2xs overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                ) : user?.first_name ? (
                  user.first_name[0].toUpperCase()
                ) : (
                  'S'
                )}
              </div>

              <div
                className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                  isCollapsed ? 'max-w-0 opacity-0 pointer-events-none ml-0' : 'max-w-[130px] opacity-100 ml-2'
                }`}
              >
                <p className="text-xs font-bold text-foreground truncate leading-tight">
                  {storeName}
                </p>
                <p className="text-[10px] text-muted-foreground truncate leading-tight">
                  {user?.email || 'Artisan Partner'}
                </p>
              </div>
            </div>

            {!isCollapsed && (
              <button
                type="button"
                onClick={logout}
                title="Log out"
                aria-label="Log out"
                className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer shrink-0 ml-1"
              >
                <LogOut size={14} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* 2. MOBILE DRAWER & BACKDROP */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
            onClick={() => setIsMobileOpen(false)}
          />

          {/* Drawer Menu */}
          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-card border-r border-border p-4 shadow-2xl flex flex-col justify-between transition-transform duration-300 animate-in slide-in-from-left z-10">
            <div>
              {/* Drawer Header (Typographic Brand - No Logo Image) */}
              <div className="flex items-center justify-between pb-4 border-b border-border/80">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground font-black text-sm shadow-xs select-none">
                    G
                  </span>
                  <span className="text-base font-black tracking-tight text-foreground font-heading">
                    GALLA<span className="text-primary">.</span>
                  </span>
                  <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary text-[10px] font-bold py-0.5 px-1.5">
                    Studio
                  </Badge>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileOpen(false)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                  aria-label="Close menu"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Drawer Nav Items */}
              <div className="py-4 space-y-4 overflow-y-auto max-h-[calc(100vh-180px)]">
                {SELLER_NAV_GROUPS.map((group, groupIdx) => (
                  <div key={groupIdx} className="space-y-1">
                    <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                      {group.title}
                    </p>
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          end={item.path === ROUTE_PATHS.SELLER.DASHBOARD}
                          onClick={() => setIsMobileOpen(false)}
                          className={({ isActive }) =>
                            `flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
                              isActive
                                ? 'bg-primary text-primary-foreground shadow-xs font-bold'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            }`
                          }
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon size={16} />
                            <span>{item.label}</span>
                          </div>
                          <ChevronRight size={12} className="opacity-60" />
                        </NavLink>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="pt-3 border-t border-border/80 space-y-2">
              <Link
                to={ROUTE_PATHS.STOREFRONT.HOME}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <ExternalLink size={14} className="text-primary" />
                  <span>Live Storefront</span>
                </div>
                <ChevronRight size={11} className="opacity-50" />
              </Link>

              <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/30 p-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground shadow-2xs overflow-hidden">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                    ) : user?.first_name ? (
                      user.first_name[0].toUpperCase()
                    ) : (
                      'S'
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-foreground truncate">{storeName}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={logout}
                  title="Log out"
                  className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer shrink-0"
                >
                  <LogOut size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. MAIN APPLICATION VIEWPORT */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Sticky Topbar */}
        <header className="sticky top-0 z-20 h-16 border-b border-border bg-card/85 backdrop-blur-md px-4 sm:px-6 lg:px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile menu trigger */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsMobileOpen(true)}
              className="lg:hidden h-9 w-9 rounded-xl border-border cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu size={17} />
            </Button>

            <div>
              <h1 className="text-sm font-extrabold text-foreground sm:text-base tracking-tight">
                {getCurrentPageTitle()}
              </h1>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2.5">
            <Button asChild size="sm" className="rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 text-xs gap-1.5 shadow-2xs h-8 px-3 cursor-pointer">
              <Link to={ROUTE_PATHS.SELLER.CREATE_PRODUCT}>
                <PlusCircle size={14} />
                <span className="hidden sm:inline">Add Product</span>
              </Link>
            </Button>

            <Link
              to={ROUTE_PATHS.STOREFRONT.HOME}
              target="_blank"
              rel="noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors shadow-2xs h-8"
            >
              <span>Storefront</span>
              <ExternalLink size={12} />
            </Link>

            <div className="h-6 w-px bg-border hidden sm:block" />

            {/* Profile Avatar & Badge */}
            <Link
              to={ROUTE_PATHS.SELLER.PROFILE}
              className="flex items-center gap-2 pl-1 rounded-xl p-1 hover:bg-muted/50 transition-colors"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-xs font-bold text-primary-foreground shadow-xs overflow-hidden shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Seller Avatar" className="h-full w-full object-cover" />
                ) : user?.first_name ? (
                  user.first_name[0].toUpperCase()
                ) : (
                  'S'
                )}
              </div>
              <div className="hidden xl:block text-left">
                <p className="text-xs font-bold text-foreground leading-tight truncate max-w-[120px]">
                  {storeName}
                </p>
                <span className="text-[10px] text-primary font-medium flex items-center gap-1">
                  <ShieldCheck size={10} />
                  <span>Artisan</span>
                </span>
              </div>
            </Link>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-muted/10">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default SellerLayout;

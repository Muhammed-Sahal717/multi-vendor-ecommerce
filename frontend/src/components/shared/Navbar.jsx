import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  User,
  Store,
  LogOut,
  Package,
  MapPin,
  LayoutDashboard,
  Shield,
  ChevronDown,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Logo } from './Logo.jsx';
import { SearchInput } from './SearchInput.jsx';
import { Button } from '../ui/button.jsx';
import { Badge } from '../ui/badge.jsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu.jsx';
import { useAuth } from '../../context/AuthProvider.jsx';
import { ROUTE_PATHS } from '../../routes/routePaths.js';
import { ROLES } from '../../lib/constants.js';
import { cartService } from '../../features/cart/services/cartService.js';
import { queryKeys } from '../../lib/queryClient.js';
import { getUserAvatarUrl } from '../../lib/utils.js';

export const Navbar = () => {
  const navigate = useNavigate();
  const { user, role, isAuthenticated, logout } = useAuth();
  const avatarUrl = getUserAvatarUrl(user);

  // Fetch cart data when authenticated as customer to show item badge
  const { data: cartData } = useQuery({
    queryKey: queryKeys.cart.all,
    queryFn: cartService.getCart,
    enabled: isAuthenticated && role === ROLES.CUSTOMER,
    staleTime: 1000 * 30,
  });

  const cartItemCount =
    cartData?.total_items ??
    cartData?.items?.reduce((total, item) => total + (item.quantity || 1), 0) ??
    0;

  const isSeller = role === ROLES.SELLER;
  const isAdmin = role === ROLES.ADMIN || role === ROLES.SUPERADMIN;

  const handleLogout = () => {
    logout();
    navigate(ROUTE_PATHS.STOREFRONT.HOME);
  };

  return (
    <>
      {/* Top Notification / Promo Bar */}
      <div className="bg-primary px-4 py-1.5 text-center text-xs font-semibold text-primary-foreground shadow-xs">
        <span>⚡ Free delivery on orders over ₹999 & Cash On Delivery available across India</span>
      </div>

      {/* Main Header / Navigation */}
      <header className="sticky top-0 z-40 border-b border-border/80 bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          {/* Left: Brand Logo & Navigation Links */}
          <div className="flex items-center gap-6 lg:gap-8 shrink-0">
            <Logo imgClassName="h-8 w-8 sm:h-9 sm:w-9" textClassName="text-xl sm:text-2xl" />
            <nav className="hidden items-center gap-5 text-xs font-bold uppercase tracking-wider text-muted-foreground md:flex">
              <Link
                to={ROUTE_PATHS.STOREFRONT.PRODUCTS}
                className="transition-colors hover:text-primary"
              >
                Products
              </Link>
              {!isSeller && !isAdmin && (
                <Link
                  to={ROUTE_PATHS.SELLER.APPLICATION}
                  className="transition-colors hover:text-primary"
                >
                  Sell on Galla
                </Link>
              )}
            </nav>
          </div>

          {/* Center: Search bar */}
          <div className="hidden max-w-md flex-1 md:block mx-2 lg:mx-4">
            <SearchInput />
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Shopping Cart Button */}
            <Button
              asChild
              variant="outline"
              size="sm"
              className="relative h-9 rounded-full px-3.5 border-border/80 hover:border-primary/40 hover:bg-muted/40 transition-all cursor-pointer shadow-2xs"
            >
              <Link to={ROUTE_PATHS.STOREFRONT.CART} aria-label="Shopping Cart" className="flex items-center gap-1.5">
                <div className="relative">
                  <ShoppingCart size={16} className="text-foreground" />
                  {cartItemCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground shadow-xs">
                      {cartItemCount}
                    </span>
                  )}
                </div>
                <span className="hidden sm:inline text-xs font-semibold text-foreground">Cart</span>
              </Link>
            </Button>

            {/* Auth State Button / Dropdown */}
            {isAuthenticated ? (
              <div className="flex items-center">
                {/* Account Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex h-9 items-center gap-2 rounded-full border border-border/80 bg-card px-2.5 py-1 text-xs font-semibold text-foreground shadow-2xs hover:border-primary/40 hover:bg-muted/40 focus:outline-none transition-all cursor-pointer">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground overflow-hidden shrink-0">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                      ) : user?.first_name ? (
                        user.first_name[0].toUpperCase()
                      ) : (
                        <User size={13} />
                      )}
                    </div>
                    <span className="hidden max-w-28 truncate sm:inline-block">
                      {user?.first_name ? `${user.first_name}` : user?.email?.split('@')[0] || 'Account'}
                    </span>
                    <ChevronDown size={14} className="text-muted-foreground" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-2xl border border-border bg-card shadow-lg">
                    <DropdownMenuGroup>
                      <DropdownMenuLabel className="font-normal px-2 py-1.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground overflow-hidden shrink-0">
                            {avatarUrl ? (
                              <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                            ) : user?.first_name ? (
                              user.first_name[0].toUpperCase()
                            ) : (
                              <User size={12} />
                            )}
                          </div>
                          <div className="flex flex-col space-y-0.5 min-w-0">
                            <p className="text-xs font-bold leading-none text-foreground truncate">{user?.first_name || 'My Account'}</p>
                            <p className="text-[11px] leading-none text-muted-foreground truncate">{user?.email}</p>
                          </div>
                        </div>
                      </DropdownMenuLabel>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator className="my-1" />

                    {/* Customer Links */}
                    <DropdownMenuGroup>
                      <DropdownMenuItem
                        onClick={() => navigate(ROUTE_PATHS.CUSTOMER.DASHBOARD)}
                        className="cursor-pointer gap-2 rounded-xl text-xs"
                      >
                        <LayoutDashboard size={14} /> Dashboard
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => navigate(ROUTE_PATHS.CUSTOMER.ORDERS)}
                        className="cursor-pointer gap-2 rounded-xl text-xs"
                      >
                        <Package size={14} /> My Orders
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => navigate(ROUTE_PATHS.CUSTOMER.ADDRESSES)}
                        className="cursor-pointer gap-2 rounded-xl text-xs"
                      >
                        <MapPin size={14} /> Addresses
                      </DropdownMenuItem>
                    </DropdownMenuGroup>

                    {/* Role based links */}
                    {isSeller && (
                      <>
                        <DropdownMenuSeparator className="my-1" />
                        <DropdownMenuGroup>
                          <DropdownMenuItem
                            onClick={() => navigate(ROUTE_PATHS.SELLER.DASHBOARD)}
                            className="cursor-pointer gap-2 rounded-xl text-xs font-semibold text-chart-5"
                          >
                            <Store size={14} /> Seller Portal
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      </>
                    )}

                    {isAdmin && (
                      <>
                        <DropdownMenuSeparator className="my-1" />
                        <DropdownMenuGroup>
                          <DropdownMenuItem
                            onClick={() => navigate(ROUTE_PATHS.ADMIN.DASHBOARD)}
                            className="cursor-pointer gap-2 rounded-xl text-xs font-semibold text-chart-3"
                          >
                            <Shield size={14} /> Admin Portal
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      </>
                    )}

                    <DropdownMenuSeparator className="my-1" />
                    <DropdownMenuGroup>
                      <DropdownMenuItem
                        onClick={handleLogout}
                        className="cursor-pointer gap-2 rounded-xl text-xs font-semibold text-destructive focus:text-destructive focus:bg-destructive/10"
                      >
                        <LogOut size={14} /> Log Out
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button asChild variant="ghost" size="sm" className="h-9 rounded-full px-3 text-xs font-semibold text-foreground hover:bg-muted/50 cursor-pointer">
                  <Link to={ROUTE_PATHS.AUTH.LOGIN}>Sign In</Link>
                </Button>
                <Button asChild size="sm" className="h-9 rounded-full px-4 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs cursor-pointer">
                  <Link to={ROUTE_PATHS.AUTH.REGISTER}>Register</Link>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Search input bar */}
        <div className="border-t border-border p-2.5 md:hidden bg-card">
          <SearchInput />
        </div>
      </header>
    </>
  );
};

export default Navbar;

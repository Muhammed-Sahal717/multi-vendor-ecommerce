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

export const Navbar = () => {
  const navigate = useNavigate();
  const { user, role, isAuthenticated, logout } = useAuth();

  // Fetch cart data when authenticated to show item badge
  const { data: cartData } = useQuery({
    queryKey: queryKeys.cart.all,
    queryFn: cartService.getCart,
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 2,
  });

  const cartItemCount =
    cartData?.items?.reduce((total, item) => total + (item.quantity || 1), 0) ||
    cartData?.total_items ||
    (Array.isArray(cartData) ? cartData.length : 0);

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
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          {/* Logo & Navigation */}
          <div className="flex items-center gap-8">
            <Logo />
            <nav className="hidden items-center gap-6 text-sm font-semibold text-muted-foreground md:flex">
              <Link
                to={ROUTE_PATHS.STOREFRONT.PRODUCTS}
                className="transition-colors hover:text-foreground"
              >
                Products
              </Link>
              <Link
                to={ROUTE_PATHS.STOREFRONT.CATEGORIES}
                className="transition-colors hover:text-foreground"
              >
                Categories
              </Link>
            </nav>
          </div>

          {/* Search bar */}
          <div className="hidden max-w-md flex-1 md:block">
            <SearchInput />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Shopping Cart Button */}
            <Button asChild variant="outline" size="sm" className="relative h-9 px-3 border-border hover:border-primary/40">
              <Link to={ROUTE_PATHS.STOREFRONT.CART} aria-label="Shopping Cart">
                <ShoppingCart size={17} className="text-foreground" />
                {cartItemCount > 0 && (
                  <Badge
                    className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground shadow-xs"
                  >
                    {cartItemCount}
                  </Badge>
                )}
              </Link>
            </Button>

            {/* Auth State Button / Dropdown */}
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                {/* Account Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex h-9 items-center gap-2 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground shadow-2xs hover:border-primary/40 hover:bg-muted/40 focus:outline-none transition-all">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                      {user?.first_name ? user.first_name[0].toUpperCase() : <User size={13} />}
                    </div>
                    <span className="hidden max-w-28 truncate sm:inline-block">
                      {user?.first_name ? `${user.first_name}` : user?.email?.split('@')[0] || 'Account'}
                    </span>
                    <ChevronDown size={14} className="text-muted-foreground" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuGroup>
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-semibold leading-none text-foreground">{user?.first_name || 'My Account'}</p>
                          <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                        </div>
                      </DropdownMenuLabel>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />

                    {/* Customer Links */}
                    <DropdownMenuGroup>
                      <DropdownMenuItem
                        onClick={() => navigate(ROUTE_PATHS.CUSTOMER.DASHBOARD)}
                        className="cursor-pointer gap-2"
                      >
                        <LayoutDashboard size={15} /> Dashboard
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => navigate(ROUTE_PATHS.CUSTOMER.ORDERS)}
                        className="cursor-pointer gap-2"
                      >
                        <Package size={15} /> My Orders
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => navigate(ROUTE_PATHS.CUSTOMER.ADDRESSES)}
                        className="cursor-pointer gap-2"
                      >
                        <MapPin size={15} /> Addresses
                      </DropdownMenuItem>
                    </DropdownMenuGroup>

                    {/* Role based links */}
                    {isSeller && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                          <DropdownMenuItem
                            onClick={() => navigate(ROUTE_PATHS.SELLER.DASHBOARD)}
                            className="cursor-pointer gap-2 font-semibold text-chart-5"
                          >
                            <Store size={15} /> Seller Portal
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      </>
                    )}

                    {isAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                          <DropdownMenuItem
                            onClick={() => navigate(ROUTE_PATHS.ADMIN.DASHBOARD)}
                            className="cursor-pointer gap-2 font-semibold text-chart-3"
                          >
                            <Shield size={15} /> Admin Portal
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      </>
                    )}

                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuItem
                        onClick={handleLogout}
                        className="cursor-pointer gap-2 font-semibold text-destructive focus:text-destructive focus:bg-destructive/10"
                      >
                        <LogOut size={15} /> Log Out
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Direct Visible Logout Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="h-9 gap-1.5 px-2.5 text-xs font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  title="Sign out of your account"
                >
                  <LogOut size={15} />
                  <span className="hidden md:inline">Log Out</span>
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button asChild variant="ghost" size="sm" className="font-semibold text-muted-foreground hover:text-foreground">
                  <Link to={ROUTE_PATHS.AUTH.LOGIN}>Sign In</Link>
                </Button>
                <Button asChild size="sm" className="bg-primary text-primary-foreground font-semibold hover:bg-primary/90 shadow-xs">
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

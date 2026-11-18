import { Link } from 'react-router-dom';
import { ShoppingCart, User, Store, LogOut, Package, MapPin, LayoutDashboard, Shield } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Logo } from './Logo.jsx';
import { SearchInput } from './SearchInput.jsx';
import { Button } from '../ui/button.jsx';
import { Badge } from '../ui/badge.jsx';
import {
  DropdownMenu,
  DropdownMenuContent,
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

  return (
    <>
      {/* Top Notification / Promo Bar */}
      <div className="bg-neutral-900 px-4 py-2 text-center text-xs font-medium text-neutral-300">
        <span>⚡ Free delivery on orders over ₹999 & Cash On Delivery available across India</span>
      </div>

      {/* Main Header / Navigation */}
      <header className="sticky top-0 z-40 border-b border-neutral-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          {/* Logo & Navigation */}
          <div className="flex items-center gap-8">
            <Logo />
            <nav className="hidden items-center gap-6 text-sm font-medium text-neutral-600 md:flex">
              <Link
                to={ROUTE_PATHS.STOREFRONT.PRODUCTS}
                className="transition-colors hover:text-neutral-900"
              >
                Products
              </Link>
              <Link
                to={ROUTE_PATHS.STOREFRONT.CATEGORIES}
                className="transition-colors hover:text-neutral-900"
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
          <div className="flex items-center gap-3">
            {/* Shopping Cart Button */}
            <Button asChild variant="outline" size="sm" className="relative h-9 px-3">
              <Link to={ROUTE_PATHS.STOREFRONT.CART} aria-label="Shopping Cart">
                <ShoppingCart size={18} />
                {cartItemCount > 0 && (
                  <Badge
                    className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-neutral-950"
                  >
                    {cartItemCount}
                  </Badge>
                )}
              </Link>
            </Button>

            {/* Auth State Button / Dropdown */}
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 px-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white">
                      {user?.first_name ? user.first_name[0].toUpperCase() : <User size={14} />}
                    </div>
                    <span className="hidden max-w-28 truncate text-xs font-medium sm:inline-block">
                      {user?.first_name ? `${user.first_name}` : user?.email || 'Account'}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-semibold leading-none">{user?.first_name || 'My Account'}</p>
                      <p className="text-xs leading-none text-neutral-500">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  {/* Customer Links */}
                  <DropdownMenuItem asChild>
                    <Link to={ROUTE_PATHS.CUSTOMER.DASHBOARD} className="cursor-pointer gap-2">
                      <LayoutDashboard size={15} /> Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to={ROUTE_PATHS.CUSTOMER.ORDERS} className="cursor-pointer gap-2">
                      <Package size={15} /> My Orders
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to={ROUTE_PATHS.CUSTOMER.ADDRESSES} className="cursor-pointer gap-2">
                      <MapPin size={15} /> Addresses
                    </Link>
                  </DropdownMenuItem>

                  {/* Role based links */}
                  {isSeller && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to={ROUTE_PATHS.SELLER.DASHBOARD} className="cursor-pointer gap-2 text-amber-600 font-medium">
                          <Store size={15} /> Seller Portal
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}

                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to={ROUTE_PATHS.ADMIN.DASHBOARD} className="cursor-pointer gap-2 text-red-600 font-medium">
                          <Shield size={15} /> Admin Portal
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}

                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="cursor-pointer gap-2 text-red-600">
                    <LogOut size={15} /> Log Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Button asChild variant="ghost" size="sm">
                  <Link to={ROUTE_PATHS.AUTH.LOGIN}>Sign In</Link>
                </Button>
                <Button asChild size="sm" className="bg-neutral-900 text-white hover:bg-neutral-800">
                  <Link to={ROUTE_PATHS.AUTH.REGISTER}>Register</Link>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Search input bar */}
        <div className="border-t border-neutral-100 p-2.5 md:hidden">
          <SearchInput />
        </div>
      </header>
    </>
  );
};

export default Navbar;

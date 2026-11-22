import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ShoppingBag,
  ArrowLeft,
  LogIn,
  UserPlus,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Truck,
  RotateCcw,
} from 'lucide-react';
import { useCart } from '../hooks/useCart.js';
import { CartItem } from '../components/CartItem.jsx';
import { CartSummary } from '../components/CartSummary.jsx';
import { ProductCard } from '../../storefront/components/ProductCard.jsx';
import { catalogService } from '../../storefront/services/catalogService.js';
import { queryKeys } from '../../../lib/queryClient.js';
import { ROUTE_PATHS } from '../../../routes/routePaths.js';
import { Button } from '../../../components/ui/button.jsx';
import { Card } from '../../../components/ui/card.jsx';
import { LoadingState } from '../../../components/shared/LoadingState.jsx';
import { ErrorState } from '../../../components/shared/ErrorState.jsx';

export const CartPage = () => {
  const navigate = useNavigate();
  const {
    items,
    totalItems,
    totalPrice,
    isLoading,
    isError,
    error,
    refetch,
    isCustomer,
    isAuthenticated,
    hasUnavailableItems,
    updateQuantity,
    isUpdating,
    removeItem,
    isRemoving,
  } = useCart();

  // Cross-sell recommendations
  const { data: recommendationsData } = useQuery({
    queryKey: queryKeys.catalog.products({ page_size: 4 }),
    queryFn: () => catalogService.getProducts({ page_size: 4 }),
    staleTime: 1000 * 60 * 5,
  });

  const recommendedProducts =
    recommendationsData?.results ||
    (Array.isArray(recommendationsData) ? recommendationsData : []);

  const handleProceedToCheckout = () => {
    navigate(ROUTE_PATHS.STOREFRONT.CHECKOUT);
  };

  // 1. Guest / Not Logged In State
  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-md text-center space-y-6">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 text-primary shadow-xs">
            <ShoppingBag size={40} className="stroke-[1.75]" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl font-heading">
              Sign In to View Your Cart
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Log in to access your saved items, view special seller discounts, and complete your purchase securely.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button
              onClick={() =>
                navigate(ROUTE_PATHS.AUTH.LOGIN, {
                  state: { from: { pathname: ROUTE_PATHS.STOREFRONT.CART } },
                })
              }
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-6 rounded-2xl font-bold cursor-pointer shadow-md shadow-primary/20"
            >
              <LogIn size={16} />
              <span>Log In</span>
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                navigate(ROUTE_PATHS.AUTH.REGISTER, {
                  state: { from: { pathname: ROUTE_PATHS.STOREFRONT.CART } },
                })
              }
              className="gap-2 h-11 px-6 rounded-2xl font-semibold border-border hover:bg-muted cursor-pointer"
            >
              <UserPlus size={16} />
              <span>Create Account</span>
            </Button>
          </div>

          <div className="pt-4 border-t border-border/60">
            <Link
              to={ROUTE_PATHS.STOREFRONT.PRODUCTS}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
            >
              <ArrowLeft size={13} />
              <span>Continue exploring products as guest</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. Non-customer role check (e.g. Seller or Admin logged in)
  if (!isCustomer) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <Card className="mx-auto max-w-lg p-8 text-center space-y-4 rounded-3xl border border-border/70 bg-card shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <AlertCircle size={28} />
          </div>
          <h2 className="text-xl font-bold text-foreground font-heading">Customer Cart Only</h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Shopping cart and checkout features are reserved for customer accounts. Please switch to a customer account to purchase.
          </p>
          <div className="pt-2">
            <Button asChild variant="outline" className="rounded-2xl font-semibold">
              <Link to={ROUTE_PATHS.STOREFRONT.HOME}>Back to Storefront</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // 3. Loading State
  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <LoadingState message="Fetching your shopping cart..." />
      </div>
    );
  }

  // 4. Error State
  if (isError) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <ErrorState
          title="Could not load your cart"
          message={error?.response?.data?.detail || error?.message || 'Failed to retrieve your shopping cart.'}
          onRetry={refetch}
        />
      </div>
    );
  }

  // 5. Empty Cart State
  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 space-y-12">
        <div className="mx-auto max-w-md text-center space-y-5 pt-8">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 text-primary shadow-xs">
            <ShoppingBag size={40} className="stroke-[1.5]" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground font-heading">
              Your Cart is Empty
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Looks like you haven&rsquo;t added anything to your cart yet. Explore our handcrafted, authentic artisan collections!
            </p>
          </div>

          <Button
            asChild
            size="lg"
            className="rounded-2xl font-bold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-8 shadow-md shadow-primary/25 cursor-pointer text-xs sm:text-sm"
          >
            <Link to={ROUTE_PATHS.STOREFRONT.PRODUCTS}>
              <Sparkles size={16} />
              <span>Explore Catalog</span>
            </Link>
          </Button>
        </div>

        {/* Recommended Products for Empty State */}
        {recommendedProducts.length > 0 && (
          <div className="mt-16 border-t border-border/60 pt-10">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black tracking-tight text-foreground font-heading">
                  Popular Handcrafted Picks
                </h2>
                <p className="text-xs text-muted-foreground">Handpicked selections by our marketplace curators</p>
              </div>
              <Button asChild variant="outline" size="sm" className="rounded-full text-xs font-semibold border-border/80 hover:border-primary/40">
                <Link to={ROUTE_PATHS.STOREFRONT.PRODUCTS}>View All</Link>
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-4 md:gap-5">
              {recommendedProducts.slice(0, 4).map((product, index) => (
                <ProductCard key={product.id || product.slug} product={product} index={index} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 6. Active Cart View
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-8">
      {/* Commerce Stepper Bar */}
      <div className="flex items-center justify-center gap-2 sm:gap-4 py-2 border-b border-border/60 pb-5">
        <div className="flex items-center gap-2 text-xs font-bold text-primary">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] font-black shadow-xs">
            1
          </span>
          <span>Shopping Cart</span>
        </div>
        <div className="h-px w-6 sm:w-14 bg-border/80" />
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border/80 bg-card text-[11px]">
            2
          </span>
          <span>Checkout</span>
        </div>
        <div className="h-px w-6 sm:w-14 bg-border/80" />
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border/80 bg-card text-[11px]">
            3
          </span>
          <span>Order Confirmation</span>
        </div>
      </div>

      {/* Header Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl font-heading">
              Shopping Cart
            </h1>
            <span className="inline-flex items-center rounded-full border border-border/70 bg-card px-3 py-0.5 text-xs font-bold text-foreground shadow-2xs">
              {totalItems} {totalItems === 1 ? 'item' : 'items'}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Review your selected items before proceeding to secure checkout.
          </p>
        </div>

        <Link
          to={ROUTE_PATHS.STOREFRONT.PRODUCTS}
          className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card px-3.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-primary/40 shadow-2xs transition-all w-fit"
        >
          <ArrowLeft size={13} />
          <span>Continue Shopping</span>
        </Link>
      </div>

      {/* Main Two-Column Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
        {/* Left Column: Cart Items List */}
        <div className="space-y-3.5 lg:col-span-8">
          {items.map((item) => (
            <CartItem
              key={item.id}
              item={item}
              onUpdateQuantity={(itemId, quantity) =>
                updateQuantity({ itemId, quantity })
              }
              onRemove={(itemId) => removeItem(itemId)}
              isUpdating={isUpdating}
              isRemoving={isRemoving}
            />
          ))}

          {/* Guarantee / Buyer Protection Strip */}
          <div className="mt-4 rounded-3xl border border-border/60 bg-muted/20 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-card border border-border/60 text-accent shadow-2xs shrink-0">
                <ShieldCheck size={18} className="stroke-[2]" />
              </div>
              <p className="leading-relaxed">
                All purchases covered by our <strong className="text-foreground">Buyer Protection Program</strong>. Easy 7-day replacements directly with verified sellers.
              </p>
            </div>

            <div className="flex items-center gap-4 shrink-0 text-[11px] font-semibold text-foreground/80 pl-12 sm:pl-0">
              <span className="flex items-center gap-1">
                <Truck size={13} className="text-primary" />
                <span>Fast COD</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <RotateCcw size={13} className="text-emerald-500" />
                <span>7-Day Return</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary */}
        <div className="lg:col-span-4">
          <CartSummary
            totalPrice={totalPrice}
            totalItems={totalItems}
            hasUnavailableItems={hasUnavailableItems}
            onProceedToCheckout={handleProceedToCheckout}
          />
        </div>
      </div>

      {/* Bottom Cross-Sell / Recommendations */}
      {recommendedProducts.length > 0 && (
        <div className="mt-16 border-t border-border/60 pt-10">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black tracking-tight text-foreground font-heading">
                You Might Also Like
              </h2>
              <p className="text-xs text-muted-foreground">Recommended artisanal crafts from our marketplace</p>
            </div>
            <Button asChild variant="outline" size="sm" className="rounded-full text-xs font-semibold border-border/80 hover:border-primary/40">
              <Link to={ROUTE_PATHS.STOREFRONT.PRODUCTS}>Explore More</Link>
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 sm:gap-4 md:gap-5">
            {recommendedProducts.slice(0, 4).map((product, index) => (
              <ProductCard key={product.id || product.slug} product={product} index={index} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;

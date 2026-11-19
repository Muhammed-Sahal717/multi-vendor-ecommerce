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

  const recommendedProducts = recommendationsData?.results || (Array.isArray(recommendationsData) ? recommendationsData : []);

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
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Sign In to View Your Cart
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Log in to access your saved items, view prices and discounts, and complete your purchase securely.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button
              onClick={() =>
                navigate(ROUTE_PATHS.AUTH.LOGIN, {
                  state: { from: { pathname: ROUTE_PATHS.STOREFRONT.CART } },
                })
              }
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-6 rounded-xl font-bold cursor-pointer"
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
              className="gap-2 h-11 px-6 rounded-xl font-semibold border-border hover:bg-muted cursor-pointer"
            >
              <UserPlus size={16} />
              <span>Create Account</span>
            </Button>
          </div>

          <div className="pt-4 border-t border-border">
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

  // 2. Non-customer role check (e.g., Seller or Admin logged in)
  if (!isCustomer) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <Card className="mx-auto max-w-lg p-8 text-center space-y-4 rounded-2xl border-border">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <AlertCircle size={28} />
          </div>
          <h2 className="text-xl font-bold text-foreground">Customer Cart Only</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Shopping cart and checkout features are dedicated to customer accounts. Please log in with a customer account to make purchases.
          </p>
          <div className="pt-2">
            <Button
              asChild
              variant="outline"
              className="rounded-xl font-semibold"
            >
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
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-md text-center space-y-6">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-primary/10 text-primary shadow-xs">
            <ShoppingBag size={48} className="stroke-[1.5]" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Your Cart is Empty
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Looks like you haven't added anything to your cart yet. Explore our handcrafted, authentic artisan collections!
            </p>
          </div>

          <Button
            asChild
            size="lg"
            className="rounded-xl font-bold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-8 shadow-sm cursor-pointer"
          >
            <Link to={ROUTE_PATHS.STOREFRONT.PRODUCTS}>
              <Sparkles size={16} />
              <span>Start Shopping</span>
            </Link>
          </Button>
        </div>

        {/* Recommended Products for Empty State */}
        {recommendedProducts.length > 0 && (
          <div className="mt-20 border-t border-border pt-12">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-foreground">Popular Picks You Might Like</h2>
                <p className="text-xs text-muted-foreground">Hand-picked by our editors</p>
              </div>
              <Button asChild variant="ghost" size="sm" className="text-xs font-semibold text-primary">
                <Link to={ROUTE_PATHS.STOREFRONT.PRODUCTS}>View All</Link>
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {recommendedProducts.slice(0, 4).map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 6. Active Cart View
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              Shopping Cart
            </h1>
            <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              {totalItems} {totalItems === 1 ? 'item' : 'items'}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Review your selected artisan products before proceeding to secure checkout.
          </p>
        </div>

        <Link
          to={ROUTE_PATHS.STOREFRONT.PRODUCTS}
          className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Continue Shopping</span>
        </Link>
      </div>

      {/* Main Two-Column Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
        {/* Left Column: Cart Items List */}
        <div className="space-y-4 lg:col-span-8">
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

          {/* Guarantee info card */}
          <div className="mt-6 rounded-2xl border border-border bg-card/60 p-4 sm:p-5 flex items-center gap-3 text-xs text-muted-foreground">
            <ShieldCheck size={20} className="text-primary shrink-0" />
            <p>
              All orders are protected by our <span className="font-semibold text-foreground">Buyer Protection Program</span>. If an item arrives damaged or not as described, return it within 7 days for a full refund.
            </p>
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
        <div className="mt-20 border-t border-border pt-12">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground">You Might Also Like</h2>
              <p className="text-xs text-muted-foreground">Popular recommendations from verified sellers</p>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-xs font-semibold text-primary">
              <Link to={ROUTE_PATHS.STOREFRONT.PRODUCTS}>Explore More</Link>
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {recommendedProducts.slice(0, 4).map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;

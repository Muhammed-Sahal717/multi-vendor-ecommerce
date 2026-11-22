import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  AlertTriangle,
  Check,
  Truck,
  RotateCcw,
} from 'lucide-react';
import { useCart } from '../../cart/hooks/useCart.js';
import { checkoutService } from '../services/checkoutService.js';
import { queryKeys } from '../../../lib/queryClient.js';
import { ROUTE_PATHS } from '../../../routes/routePaths.js';
import { AddressSelector } from '../components/AddressSelector.jsx';
import { PaymentMethodSelector } from '../components/PaymentMethodSelector.jsx';
import { CheckoutOrderSummary } from '../components/CheckoutOrderSummary.jsx';
import { RazorpaySimulatorModal } from '../components/RazorpaySimulatorModal.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { LoadingState } from '../../../components/shared/LoadingState.jsx';

export const CheckoutPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    items,
    totalItems,
    totalPrice,
    isLoading: isCartLoading,
    hasUnavailableItems,
  } = useCart();

  // Preserves items & totals during active checkout so backend cart clearing doesn't cause empty-screen flash
  const [prevItems, setPrevItems] = useState(items);
  const [cachedSnapshot, setCachedSnapshot] = useState({ items, totalItems, totalPrice });

  if (items !== prevItems) {
    setPrevItems(items);
    if (items.length > 0) {
      setCachedSnapshot({ items, totalItems, totalPrice });
    }
  }

  const displayItems = items.length > 0 ? items : cachedSnapshot.items;
  const displayTotalItems = items.length > 0 ? totalItems : cachedSnapshot.totalItems;
  const displayTotalPrice = items.length > 0 ? totalPrice : cachedSnapshot.totalPrice;

  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('cod');
  const [checkoutError, setCheckoutError] = useState('');

  // Razorpay simulation modal state
  const [razorpayOrder, setRazorpayOrder] = useState(null);
  const [isRazorpayModalOpen, setIsRazorpayModalOpen] = useState(false);

  // Place order mutation
  const placeOrderMutation = useMutation({
    mutationFn: (payload) => checkoutService.placeOrder(payload),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });

      if (selectedPaymentMethod === 'razorpay') {
        setRazorpayOrder(order);
        setIsRazorpayModalOpen(true);
      } else {
        queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
        navigate(ROUTE_PATHS.STOREFRONT.ORDER_SUCCESS, {
          state: { order },
          replace: true,
        });
      }
    },
    onError: (err) => {
      const data = err?.response?.data;
      if (typeof data === 'object') {
        const firstKey = Object.keys(data)[0];
        const val = Array.isArray(data[firstKey]) ? data[firstKey][0] : data[firstKey];
        setCheckoutError(`${firstKey}: ${val}`);
      } else {
        setCheckoutError(err?.message || 'Failed to place order. Please try again.');
      }
    },
  });

  const handlePlaceOrder = () => {
    setCheckoutError('');
    if (!selectedAddressId) {
      setCheckoutError('Please select or add a shipping address.');
      return;
    }

    placeOrderMutation.mutate({
      address_id: selectedAddressId,
      payment_method: selectedPaymentMethod,
    });
  };

  const handleRazorpaySuccess = (completedOrder) => {
    setIsRazorpayModalOpen(false);
    queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });

    navigate(ROUTE_PATHS.STOREFRONT.ORDER_SUCCESS, {
      state: { order: completedOrder, paidOnline: true },
      replace: true,
    });
  };

  if (isCartLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <LoadingState message="Preparing secure checkout..." />
      </div>
    );
  }

  // If cart is empty and no active order or payment modal is open
  if (displayItems.length === 0 && !razorpayOrder && !isRazorpayModalOpen) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-md text-center space-y-6">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 text-primary shadow-xs">
            <ShoppingBag size={40} className="stroke-[1.5]" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl font-heading">
              Your Cart is Empty
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              You don&rsquo;t have any items in your cart to checkout. Add items before checking out.
            </p>
          </div>

          <Button
            asChild
            size="lg"
            className="rounded-2xl font-bold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-6 shadow-md shadow-primary/25 cursor-pointer text-xs sm:text-sm"
          >
            <Link to={ROUTE_PATHS.STOREFRONT.PRODUCTS}>
              <Sparkles size={16} />
              <span>Explore Products</span>
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // If cart has unavailable items
  if (hasUnavailableItems) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-md text-center space-y-6">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-destructive/10 text-destructive shadow-xs">
            <AlertTriangle size={38} />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-black tracking-tight text-foreground font-heading">
              Unavailable Items Detected
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Some items in your cart are currently out of stock or unavailable. Please review your cart and remove them to proceed.
            </p>
          </div>

          <Button
            asChild
            className="rounded-2xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-6 cursor-pointer"
          >
            <Link to={ROUTE_PATHS.STOREFRONT.CART}>Back to Cart</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-8">
      {/* Commerce Stepper Bar */}
      <div className="flex items-center justify-center gap-2 sm:gap-4 py-2 border-b border-border/60 pb-5">
        <Link
          to={ROUTE_PATHS.STOREFRONT.CART}
          className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[11px] font-black">
            <Check size={12} className="stroke-[3]" />
          </span>
          <span>Shopping Cart</span>
        </Link>
        <div className="h-px w-6 sm:w-14 bg-border/80" />
        <div className="flex items-center gap-2 text-xs font-bold text-primary">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] font-black shadow-xs">
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

      {/* Header & Back Link */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
            <Link
              to={ROUTE_PATHS.STOREFRONT.CART}
              className="inline-flex items-center gap-1.5 hover:text-primary transition-colors"
            >
              <ArrowLeft size={13} />
              <span>Back to Cart</span>
            </Link>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl font-heading">
            Secure Checkout
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Complete your shipping address and payment method to place your order.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-border/80 bg-card px-4 py-2 text-xs text-muted-foreground shadow-2xs w-fit">
          <ShieldCheck size={15} className="text-primary shrink-0" />
          <span className="font-semibold text-foreground">Guaranteed Safe & Secure Checkout</span>
        </div>
      </div>

      {/* Main Grid: Steps on Left, Sticky Summary on Right */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
        {/* Left Column: Checkout Steps */}
        <div className="space-y-6 lg:col-span-8">
          {/* Step 1: Address Selection */}
          <AddressSelector
            selectedAddressId={selectedAddressId}
            onSelectAddress={setSelectedAddressId}
          />

          {/* Step 2: Payment Method */}
          <PaymentMethodSelector
            selectedMethod={selectedPaymentMethod}
            onSelectMethod={setSelectedPaymentMethod}
          />

          {/* Delivery & Buyer Protection Guarantee */}
          <div className="rounded-3xl border border-border/60 bg-muted/20 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-card border border-border/60 text-accent shadow-2xs shrink-0">
                <ShieldCheck size={18} className="stroke-[2]" />
              </div>
              <p className="leading-relaxed">
                Directly fulfilled by verified marketplace artisans. Protected by our <strong className="text-foreground">100% Genuine Guarantee</strong>.
              </p>
            </div>

            <div className="flex items-center gap-4 shrink-0 text-[11px] font-semibold text-foreground/80 pl-12 sm:pl-0">
              <span className="flex items-center gap-1">
                <Truck size={13} className="text-primary" />
                <span>Tracked Courier</span>
              </span>
              <span>&bull;</span>
              <span className="flex items-center gap-1">
                <RotateCcw size={13} className="text-emerald-500" />
                <span>Free Returns</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary & Place Order */}
        <div className="lg:col-span-4">
          <CheckoutOrderSummary
            items={displayItems}
            totalPrice={displayTotalPrice}
            totalItems={displayTotalItems}
            isSubmitting={placeOrderMutation.isPending}
            onPlaceOrder={handlePlaceOrder}
            selectedAddressId={selectedAddressId}
            selectedPaymentMethod={selectedPaymentMethod}
            errorMessage={checkoutError}
          />
        </div>
      </div>

      {/* Razorpay Simulation Modal */}
      <RazorpaySimulatorModal
        isOpen={isRazorpayModalOpen}
        order={razorpayOrder}
        onPaymentSuccess={handleRazorpaySuccess}
        onPaymentFailure={() => {}}
        onClose={() => {
          setIsRazorpayModalOpen(false);
          queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
          if (razorpayOrder) {
            navigate(ROUTE_PATHS.STOREFRONT.ORDER_SUCCESS, {
              state: { order: razorpayOrder, paidOnline: false },
              replace: true,
            });
          }
        }}
      />
    </div>
  );
};

export default CheckoutPage;

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  AlertTriangle,
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

  // Storing information from previous renders pattern (React docs compliant)
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
      // Invalidate orders and payments so queries stay updated
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });

      if (selectedPaymentMethod === 'razorpay') {
        // Open Razorpay Simulator for online payment
        setRazorpayOrder(order);
        setIsRazorpayModalOpen(true);
      } else {
        // COD order completed immediately - now clear cart cache
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
        <LoadingState message="Preparing checkout..." />
      </div>
    );
  }

  // If cart is empty and no active order or payment modal is open
  if (displayItems.length === 0 && !razorpayOrder && !isRazorpayModalOpen) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-md text-center space-y-6">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 text-primary shadow-xs">
            <ShoppingBag size={38} className="stroke-[1.75]" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Your Cart is Empty
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You don't have any items in your cart to checkout. Add items before checking out.
            </p>
          </div>

          <Button
            asChild
            className="rounded-xl font-bold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-6 shadow-sm cursor-pointer"
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
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Unavailable Items Detected
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Some items in your cart are currently out of stock or unavailable. Please review your cart and remove them to proceed.
            </p>
          </div>

          <Button
            asChild
            className="rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-6 cursor-pointer"
          >
            <Link to={ROUTE_PATHS.STOREFRONT.CART}>Back to Cart</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header & Back Link */}
      <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-2">
            <Link
              to={ROUTE_PATHS.STOREFRONT.CART}
              className="inline-flex items-center gap-1.5 hover:text-primary transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Back to Cart</span>
            </Link>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Secure Checkout
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Complete your shipping address and payment method to place your order.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-1.5 text-xs text-muted-foreground shadow-2xs">
          <ShieldCheck size={16} className="text-primary" />
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
          // Still redirect to order success since order was created
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

import { ArrowRight, ShieldCheck, Truck, Lock, AlertCircle, Sparkles } from 'lucide-react';
import { Card } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { PriceDisplay } from '../../../components/common/PriceDisplay.jsx';

const FREE_SHIPPING_THRESHOLD = 999;
const STANDARD_SHIPPING_FEE = 99;

export const CartSummary = ({
  totalPrice = 0,
  totalItems = 0,
  hasUnavailableItems = false,
  onProceedToCheckout,
  isLoading = false,
}) => {
  const isFreeShipping = totalPrice >= FREE_SHIPPING_THRESHOLD;
  const shippingFee = totalPrice === 0 ? 0 : isFreeShipping ? 0 : STANDARD_SHIPPING_FEE;
  const finalTotal = totalPrice + shippingFee;
  const amountNeededForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - totalPrice);
  const progressPercent = Math.min(100, Math.round((totalPrice / FREE_SHIPPING_THRESHOLD) * 100));

  return (
    <Card className="rounded-2xl border border-border bg-card p-6 shadow-sm sticky top-24 space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <h2 className="text-lg font-bold text-foreground">Order Summary</h2>
        <span className="text-xs font-semibold text-muted-foreground">
          {totalItems} {totalItems === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* Free Shipping Progress Indicator */}
      {totalPrice > 0 && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="flex items-center gap-1.5 text-primary font-bold">
              <Sparkles size={14} className="text-primary" />
              {isFreeShipping ? (
                'You unlocked FREE Delivery!'
              ) : (
                <>Add <span className="text-primary font-bold">₹{amountNeededForFreeShipping.toFixed(0)}</span> more for Free Delivery</>
              )}
            </span>
            <span className="font-bold text-muted-foreground">{progressPercent}%</span>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-primary/20">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Price Breakdown */}
      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between text-muted-foreground">
          <span>Items Subtotal</span>
          <PriceDisplay price={totalPrice} size="sm" className="font-semibold text-foreground" />
        </div>

        <div className="flex items-center justify-between text-muted-foreground">
          <span>Shipping & Handling</span>
          {shippingFee === 0 ? (
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Free
            </span>
          ) : (
            <PriceDisplay price={shippingFee} size="sm" className="font-semibold text-foreground" />
          )}
        </div>

        <div className="flex items-center justify-between text-muted-foreground">
          <span>Taxes</span>
          <span className="text-xs font-medium text-muted-foreground">Included in MRP</span>
        </div>

        <div className="border-t border-border pt-4">
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-base font-bold text-foreground">Total Amount</span>
              <p className="text-[11px] text-muted-foreground">All taxes included</p>
            </div>
            <PriceDisplay
              price={finalTotal}
              size="lg"
              className="font-extrabold text-primary text-xl"
            />
          </div>
        </div>
      </div>

      {/* Warning if any item is unavailable */}
      {hasUnavailableItems && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          <span>
            Some items in your cart are currently out of stock or unavailable. Please remove them before proceeding to checkout.
          </span>
        </div>
      )}

      {/* Checkout Button */}
      <Button
        type="button"
        size="lg"
        onClick={onProceedToCheckout}
        disabled={totalItems === 0 || hasUnavailableItems || isLoading}
        className="w-full h-12 rounded-xl text-sm font-bold shadow-md gap-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:translate-y-[-1px] active:translate-y-[0px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span>Proceed to Checkout</span>
        <ArrowRight size={16} />
      </Button>

      {/* Trust Badges */}
      <div className="space-y-2.5 border-t border-border pt-5 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Lock size={14} className="text-primary shrink-0" />
          <span>256-bit encrypted secure checkout</span>
        </div>
        <div className="flex items-center gap-2">
          <Truck size={14} className="text-primary shrink-0" />
          <span>Cash on Delivery (COD) supported</span>
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-primary shrink-0" />
          <span>100% Genuine and authentic products</span>
        </div>
      </div>
    </Card>
  );
};

export default CartSummary;

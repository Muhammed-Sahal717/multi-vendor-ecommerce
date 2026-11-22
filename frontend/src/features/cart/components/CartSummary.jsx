import { ArrowRight, ShieldCheck, Truck, Lock, AlertCircle, RotateCcw } from 'lucide-react';
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
    <Card className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm sticky top-24 space-y-5">
      <div className="flex items-center justify-between border-b border-border/60 pb-4">
        <h2 className="text-base font-bold text-foreground font-heading">Order Summary</h2>
        <span className="inline-flex items-center rounded-full border border-border/80 bg-muted/30 px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
          {totalItems} {totalItems === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* Free Delivery Progress Indicator */}
      {totalPrice > 0 && (
        <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-bold">
              {isFreeShipping ? (
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <Truck size={14} className="text-emerald-500" />
                  <span>You unlocked FREE Delivery!</span>
                </span>
              ) : (
                <span className="text-foreground flex items-center gap-1.5">
                  <Truck size={14} className="text-primary" />
                  <span>
                    Add <strong className="text-primary">₹{amountNeededForFreeShipping.toFixed(0)}</strong> for Free Delivery
                  </span>
                </span>
              )}
            </span>
            <span className="font-bold text-muted-foreground">{progressPercent}%</span>
          </div>

          <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/60">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${
                isFreeShipping ? 'bg-emerald-500' : 'bg-primary'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Price Calculations */}
      <div className="space-y-3 text-xs sm:text-sm">
        <div className="flex items-center justify-between text-muted-foreground">
          <span>Items Subtotal</span>
          <PriceDisplay price={totalPrice} priceClassName="font-semibold text-foreground text-xs sm:text-sm" />
        </div>

        <div className="flex items-center justify-between text-muted-foreground">
          <span>Shipping & Handling</span>
          {shippingFee === 0 ? (
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Free Delivery
            </span>
          ) : (
            <PriceDisplay price={shippingFee} priceClassName="font-semibold text-foreground text-xs sm:text-sm" />
          )}
        </div>

        <div className="border-t border-border/60 pt-3">
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-base font-black text-foreground font-heading">Total Payable</span>
              <p className="text-[11px] text-muted-foreground">Free delivery on orders over ₹999</p>
            </div>
            <PriceDisplay
              price={finalTotal}
              priceClassName="font-black text-foreground text-xl sm:text-2xl font-heading"
            />
          </div>
        </div>
      </div>

      {/* Warning if any item is unavailable */}
      {hasUnavailableItems && (
        <div className="flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          <span>
            Some items in your cart are currently out of stock or unavailable. Please remove them before proceeding to checkout.
          </span>
        </div>
      )}

      {/* Checkout Action Button */}
      <Button
        type="button"
        size="lg"
        onClick={onProceedToCheckout}
        disabled={totalItems === 0 || hasUnavailableItems || isLoading}
        className="group w-full h-12 rounded-2xl text-xs sm:text-sm font-bold shadow-md shadow-primary/25 gap-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span>Proceed to Checkout</span>
        <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
      </Button>

      {/* Trust Badges Strip */}
      <div className="grid grid-cols-2 gap-2 border-t border-border/60 pt-4 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Lock size={12} className="text-accent shrink-0" />
          <span>256-bit Encrypted</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Truck size={12} className="text-primary shrink-0" />
          <span>Cash on Delivery</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ShieldCheck size={12} className="text-accent shrink-0" />
          <span>100% Genuine</span>
        </div>
        <div className="flex items-center gap-1.5">
          <RotateCcw size={12} className="text-emerald-500 shrink-0" />
          <span>7-Day Return</span>
        </div>
      </div>
    </Card>
  );
};

export default CartSummary;

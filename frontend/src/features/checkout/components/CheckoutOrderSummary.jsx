import { useState } from 'react';
import {
  Lock,
  ArrowRight,
  ShieldCheck,
  Package,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Loader2,
  Truck,
} from 'lucide-react';
import { Card } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { PriceDisplay } from '../../../components/common/PriceDisplay.jsx';
import { getProductImageUrl } from '../../../lib/utils.js';

const FREE_SHIPPING_THRESHOLD = 999;
const STANDARD_SHIPPING_FEE = 99;

export const CheckoutOrderSummary = ({
  items = [],
  totalPrice = 0,
  totalItems = 0,
  isSubmitting = false,
  onPlaceOrder,
  selectedAddressId,
  selectedPaymentMethod,
  errorMessage = '',
}) => {
  const [showItemsList, setShowItemsList] = useState(true);

  const isFreeShipping = totalPrice >= FREE_SHIPPING_THRESHOLD;
  const shippingFee = totalPrice === 0 ? 0 : isFreeShipping ? 0 : STANDARD_SHIPPING_FEE;
  const finalTotal = totalPrice + shippingFee;

  const canPlaceOrder = !!selectedAddressId && !!selectedPaymentMethod && !isSubmitting && totalItems > 0;

  return (
    <Card className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm sticky top-24 space-y-5">
      <div className="flex items-center justify-between border-b border-border/60 pb-4">
        <div>
          <h2 className="text-lg font-black text-foreground font-heading">Order Summary</h2>
          <p className="text-xs text-muted-foreground">Final price breakdown</p>
        </div>
        <span className="inline-flex items-center rounded-full border border-border/70 bg-muted/40 px-2.5 py-0.5 text-xs font-bold text-foreground">
          {totalItems} {totalItems === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* Free Shipping Status Badge */}
      <div className="rounded-2xl border border-border/60 bg-muted/20 p-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Truck size={15} className={isFreeShipping ? 'text-emerald-500' : 'text-primary'} />
          <span className="text-muted-foreground font-medium">Delivery:</span>
        </div>
        {isFreeShipping ? (
          <span className="font-bold text-emerald-600 dark:text-emerald-400">
            Free Shipping Unlocked!
          </span>
        ) : (
          <span className="font-medium text-muted-foreground">
            Standard: <PriceDisplay price={STANDARD_SHIPPING_FEE} size="sm" className="font-bold text-foreground" />
          </span>
        )}
      </div>

      {/* Collapsible Items Preview */}
      <div className="space-y-2.5">
        <button
          type="button"
          onClick={() => setShowItemsList((prev) => !prev)}
          className="flex w-full items-center justify-between text-xs font-bold text-foreground/80 hover:text-foreground cursor-pointer py-1"
        >
          <span className="flex items-center gap-1.5">
            <Package size={13} className="text-primary" />
            <span>Review Items ({items.length})</span>
          </span>
          {showItemsList ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {showItemsList && (
          <div className="max-h-56 space-y-2.5 overflow-y-auto pr-1">
            {items.map((item) => {
              const imgUrl = getProductImageUrl(item) || getProductImageUrl(item?.primary_image || item?.image);
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-2xl border border-border/60 bg-muted/20 p-2.5 text-xs transition-colors"
                >
                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-border/60 bg-muted/40">
                    {imgUrl ? (
                      <img
                        src={imgUrl}
                        alt={item.product_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <Package size={14} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="line-clamp-1 font-bold text-foreground">
                      {item.product_name}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Qty: {item.quantity} × <PriceDisplay price={item.product_price} size="sm" />
                    </p>
                  </div>
                  <div className="text-right font-black text-foreground shrink-0 font-heading">
                    <PriceDisplay price={item.subtotal || (parseFloat(item.product_price) * item.quantity)} size="sm" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Price Calculations */}
      <div className="space-y-3 text-xs border-t border-border/60 pt-4">
        <div className="flex items-center justify-between text-muted-foreground">
          <span>Items Subtotal</span>
          <PriceDisplay price={totalPrice} size="sm" className="font-bold text-foreground" />
        </div>

        <div className="flex items-center justify-between text-muted-foreground">
          <span>Delivery Charges</span>
          {shippingFee === 0 ? (
            <span className="font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 text-[11px]">
              Free Delivery
            </span>
          ) : (
            <PriceDisplay price={shippingFee} size="sm" className="font-bold text-foreground" />
          )}
        </div>

        <div className="flex items-center justify-between text-muted-foreground">
          <span>Estimated GST & Taxes</span>
          <span className="font-medium text-muted-foreground">Included in MRP</span>
        </div>

        <div className="border-t border-border/60 pt-3">
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-sm font-black text-foreground font-heading">Total Payable</span>
              <p className="text-[10px] text-muted-foreground">Inclusive of all local taxes</p>
            </div>
            <PriceDisplay
              price={finalTotal}
              size="lg"
              className="font-black text-foreground text-2xl font-heading"
            />
          </div>
        </div>
      </div>

      {/* Error alert if any */}
      {errorMessage && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Place Order CTA */}
      <div className="space-y-2 pt-1">
        <Button
          type="button"
          size="lg"
          onClick={onPlaceOrder}
          disabled={!canPlaceOrder}
          className="w-full h-12 rounded-2xl text-xs sm:text-sm font-bold shadow-md shadow-primary/25 gap-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:translate-y-[-1px] active:translate-y-[0px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Placing Order...</span>
            </>
          ) : (
            <>
              <span>Place Order</span>
              <ArrowRight size={16} />
            </>
          )}
        </Button>

        {!selectedAddressId && (
          <p className="text-center text-[11px] font-semibold text-amber-600 dark:text-amber-400">
            Please select or add a shipping address to proceed
          </p>
        )}
      </div>

      {/* Trust badges */}
      <div className="space-y-2 border-t border-border/60 pt-4 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-2">
          <Lock size={12} className="text-primary shrink-0" />
          <span>256-bit SSL encrypted safe checkout</span>
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck size={12} className="text-primary shrink-0" />
          <span>7-day easy returns & verified buyer protection</span>
        </div>
      </div>
    </Card>
  );
};

export default CheckoutOrderSummary;

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2, AlertTriangle, AlertCircle, Package } from 'lucide-react';
import { Button } from '../../../components/ui/button.jsx';
import { Card } from '../../../components/ui/card.jsx';
import { PriceDisplay } from '../../../components/common/PriceDisplay.jsx';
import { getProductImageUrl } from '../../../lib/utils.js';

export const CartItem = ({
  item,
  onUpdateQuantity,
  onRemove,
  isUpdating = false,
  isRemoving = false,
}) => {
  const [imageError, setImageError] = useState(false);

  const imageUrl =
    getProductImageUrl(item) ||
    getProductImageUrl(item?.primary_image) ||
    getProductImageUrl(item?.image);
  const maxStock = item.product_stock ?? 999;
  const isOutOfStock = !item.is_available || maxStock === 0;
  const exceedsStock = item.quantity > maxStock;
  const isLowStock = !isOutOfStock && maxStock <= 5;

  const handleDecrement = () => {
    if (item.quantity > 1) {
      onUpdateQuantity(item.id, item.quantity - 1);
    }
  };

  const handleIncrement = () => {
    if (item.quantity < maxStock) {
      onUpdateQuantity(item.id, item.quantity + 1);
    }
  };

  return (
    <Card
      className={`overflow-hidden rounded-3xl p-3.5 sm:p-5 transition-all border shadow-xs ${
        !item.is_available || exceedsStock
          ? 'border-destructive/30 bg-destructive/5'
          : 'border-border/60 bg-card hover:border-border'
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: Product Thumbnail & Title/Price info */}
        <div className="flex items-start gap-3.5 sm:gap-4 flex-1 min-w-0">
          {/* Thumbnail Container */}
          <Link
            to={item.product_slug ? `/products/${item.product_slug}` : '#'}
            className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-border/40 bg-muted/15 p-2 transition-transform hover:scale-102 sm:h-22 sm:w-22 flex items-center justify-center shadow-2xs"
          >
            {imageUrl && !imageError ? (
              <img
                src={imageUrl}
                alt={item.product_name}
                onError={() => setImageError(true)}
                className="h-full w-full object-contain rounded-xl transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-xl text-muted-foreground/50">
                <Package size={24} className="stroke-[1.3]" />
              </div>
            )}
          </Link>

          {/* Details */}
          <div className="flex-1 min-w-0 space-y-1">
            <Link
              to={item.product_slug ? `/products/${item.product_slug}` : '#'}
              className="line-clamp-2 text-xs sm:text-sm font-bold text-foreground hover:text-primary transition-colors leading-snug"
            >
              {item.product_name}
            </Link>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>Price:</span>
              <PriceDisplay
                price={item.product_price}
                priceClassName="font-semibold text-foreground text-xs"
              />
            </div>

            {/* Stock status indicator */}
            <div className="pt-0.5">
              {!item.is_available ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-destructive">
                  <AlertCircle size={13} />
                  <span>Unavailable • Please remove to checkout</span>
                </span>
              ) : exceedsStock ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-destructive">
                  <AlertTriangle size={13} />
                  <span>Only {maxStock} left in stock</span>
                </span>
              ) : isLowStock ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <span>Only {maxStock} left</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span>In Stock</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Quantity Stepper, Subtotal, Remove Button */}
        <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 border-t border-border/50 pt-3 sm:border-0 sm:pt-0">
          {/* Quantity Stepper */}
          <div className="inline-flex items-center rounded-xl border border-border/80 bg-card p-1 shadow-2xs">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={handleDecrement}
              disabled={item.quantity <= 1 || isUpdating || isOutOfStock}
              className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-30"
              aria-label="Decrease quantity"
            >
              <Minus size={12} />
            </Button>

            <span className="w-8 text-center text-xs font-bold text-foreground select-none">
              {item.quantity}
            </span>

            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={handleIncrement}
              disabled={item.quantity >= maxStock || isUpdating || isOutOfStock}
              className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-30"
              aria-label="Increase quantity"
            >
              <Plus size={12} />
            </Button>
          </div>

          {/* Subtotal Display */}
          <div className="text-right min-w-[70px]">
            <span className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Subtotal</span>
            <PriceDisplay
              price={item.subtotal || parseFloat(item.product_price) * item.quantity}
              priceClassName="text-sm sm:text-base font-black text-foreground font-heading"
            />
          </div>

          {/* Trash Remove Button */}
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            disabled={isRemoving}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer disabled:opacity-40"
            title="Remove from cart"
            aria-label="Remove item"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </Card>
  );
};

export default CartItem;

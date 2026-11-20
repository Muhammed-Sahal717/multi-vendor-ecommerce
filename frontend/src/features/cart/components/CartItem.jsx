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
      className={`overflow-hidden rounded-3xl p-4 sm:p-5 transition-all border shadow-2xs ${
        !item.is_available || exceedsStock
          ? 'border-destructive/30 bg-destructive/5'
          : 'border-border/80 bg-card hover:border-primary/30'
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: Product Thumbnail & Info */}
        <div className="flex items-start gap-4 flex-1 min-w-0">
          {/* Thumbnail Pod with Crisp Frame */}
          <Link
            to={item.product_slug ? `/products/${item.product_slug}` : '#'}
            className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-border/80 bg-white dark:bg-card transition-transform hover:scale-102 sm:h-22 sm:w-22 p-1.5 shadow-2xs"
          >
            {imageUrl && !imageError ? (
              <img
                src={imageUrl}
                alt={item.product_name}
                onError={() => setImageError(true)}
                className="h-full w-full object-contain object-center rounded-xl transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-xl bg-muted/30 text-muted-foreground/60">
                <Package size={22} className="stroke-[1.5]" />
              </div>
            )}
          </Link>

          {/* Details */}
          <div className="flex-1 min-w-0 space-y-1.5">
            <Link
              to={item.product_slug ? `/products/${item.product_slug}` : '#'}
              className="line-clamp-2 text-xs sm:text-sm font-bold text-foreground hover:text-primary transition-colors"
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

            {/* Stock & Availability Warnings (Clean & minimal, no loud chunky badge) */}
            <div className="pt-0.5">
              {!item.is_available ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-destructive">
                  <AlertCircle size={12} />
                  Unavailable • Please remove to checkout
                </span>
              ) : exceedsStock ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-destructive">
                  <AlertTriangle size={12} />
                  Only {maxStock} left in stock
                </span>
              ) : isLowStock ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-500">
                  <AlertTriangle size={12} />
                  Only {maxStock} left
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  In Stock
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Quantity Controls, Subtotal, Remove */}
        <div className="flex items-center justify-between sm:justify-end gap-5 sm:gap-6 border-t border-border/60 pt-3 sm:border-0 sm:pt-0">
          {/* Quantity Stepper */}
          <div className="inline-flex items-center rounded-xl border border-border/80 bg-background/50 p-0.5 shadow-2xs">
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

            <div className="w-8 text-center text-xs font-bold text-foreground">
              {item.quantity}
            </div>

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

          {/* Subtotal */}
          <div className="min-w-20 text-right">
            <span className="block text-[10px] uppercase font-semibold text-muted-foreground sm:hidden">
              Subtotal
            </span>
            <PriceDisplay
              price={item.subtotal || (parseFloat(item.product_price) * item.quantity)}
              priceClassName="font-extrabold text-foreground text-sm sm:text-base"
            />
          </div>

          {/* Remove Button */}
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => onRemove(item.id)}
            disabled={isRemoving}
            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors cursor-pointer"
            title="Remove item"
            aria-label={`Remove ${item.product_name} from cart`}
          >
            <Trash2 size={15} />
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default CartItem;

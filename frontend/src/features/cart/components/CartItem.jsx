import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2, AlertTriangle, AlertCircle, Package } from 'lucide-react';
import { Button } from '../../../components/ui/button.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
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

  const imageUrl = getProductImageUrl(item.primary_image || item.image);
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
    <Card className={`overflow-hidden p-4 sm:p-5 transition-all border ${
      !item.is_available || exceedsStock
        ? 'border-destructive/30 bg-destructive/5'
        : 'border-border bg-card hover:border-primary/20'
    }`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: Product Thumbnail & Info */}
        <div className="flex items-start gap-4 flex-1 min-w-0">
          {/* Thumbnail */}
          <Link
            to={item.product_slug ? `/products/${item.product_slug}` : '#'}
            className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-border bg-muted/40 transition-transform hover:scale-105 sm:h-24 sm:w-24"
          >
            {imageUrl && !imageError ? (
              <img
                src={imageUrl}
                alt={item.product_name}
                onError={() => setImageError(true)}
                className="h-full w-full object-cover object-center transition-transform group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                <Package size={24} />
              </div>
            )}
          </Link>

          {/* Details */}
          <div className="flex-1 min-w-0 space-y-1">
            <Link
              to={item.product_slug ? `/products/${item.product_slug}` : '#'}
              className="line-clamp-2 text-sm font-semibold text-foreground hover:text-primary transition-colors sm:text-base"
            >
              {item.product_name}
            </Link>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Unit price:</span>
              <PriceDisplay
                price={item.product_price}
                size="sm"
                className="font-medium text-foreground"
              />
            </div>

            {/* Stock & Availability Warnings */}
            <div className="pt-1 flex flex-wrap items-center gap-1.5">
              {!item.is_available ? (
                <Badge variant="destructive" className="gap-1 text-[11px] font-semibold py-0.5">
                  <AlertCircle size={12} />
                  Unavailable - Remove to proceed
                </Badge>
              ) : exceedsStock ? (
                <Badge variant="destructive" className="gap-1 text-[11px] font-semibold py-0.5">
                  <AlertTriangle size={12} />
                  Only {maxStock} left in stock
                </Badge>
              ) : isLowStock ? (
                <span className="text-[11px] font-medium text-chart-5 flex items-center gap-1">
                  <AlertTriangle size={12} />
                  Only {maxStock} left!
                </span>
              ) : (
                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  In Stock
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Quantity Controls, Subtotal, Remove */}
        <div className="flex items-center justify-between sm:justify-end gap-6 border-t border-border/60 pt-3 sm:border-0 sm:pt-0">
          {/* Quantity Controls */}
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleDecrement}
              disabled={item.quantity <= 1 || isUpdating || isOutOfStock}
              className="h-8 w-8 rounded-lg border-border text-foreground hover:bg-muted disabled:opacity-40"
              aria-label="Decrease quantity"
            >
              <Minus size={13} />
            </Button>

            <div className="flex h-8 w-11 items-center justify-center rounded-lg border border-border bg-background text-xs font-bold text-foreground">
              {item.quantity}
            </div>

            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleIncrement}
              disabled={item.quantity >= maxStock || isUpdating || isOutOfStock}
              className="h-8 w-8 rounded-lg border-border text-foreground hover:bg-muted disabled:opacity-40"
              aria-label="Increase quantity"
            >
              <Plus size={13} />
            </Button>
          </div>

          {/* Subtotal */}
          <div className="min-w-20 text-right">
            <span className="block text-[10px] uppercase font-semibold text-muted-foreground sm:hidden">
              Subtotal
            </span>
            <PriceDisplay
              price={item.subtotal || (parseFloat(item.product_price) * item.quantity)}
              size="md"
              className="font-bold text-primary"
            />
          </div>

          {/* Remove Button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onRemove(item.id)}
            disabled={isRemoving}
            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
            title="Remove item"
            aria-label={`Remove ${item.product_name} from cart`}
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default CartItem;

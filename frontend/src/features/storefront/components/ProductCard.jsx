import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Check, Package } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PriceDisplay } from '../../../components/common/PriceDisplay.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Card } from '../../../components/ui/card.jsx';
import { cartService } from '../../cart/services/cartService.js';
import { queryKeys } from '../../../lib/queryClient.js';
import { ROUTE_PATHS } from '../../../routes/routePaths.js';
import { useAuth } from '../../../context/AuthProvider.jsx';
import { getProductImageUrl, cn } from '../../../lib/utils.js';

const PASTEL_THEMES = [
  // Soft Lavender / Violet
  'bg-purple-50/80 hover:bg-purple-50/95 border-purple-200/70 hover:border-purple-300 dark:bg-purple-950/20 dark:border-purple-800/40',
  // Soft Mint / Sage
  'bg-emerald-50/80 hover:bg-emerald-50/95 border-emerald-200/70 hover:border-emerald-300 dark:bg-emerald-950/20 dark:border-emerald-800/40',
  // Soft Peach / Coral
  'bg-rose-50/80 hover:bg-rose-50/95 border-rose-200/70 hover:border-rose-300 dark:bg-rose-950/20 dark:border-rose-800/40',
  // Soft Sky / Baby Blue
  'bg-sky-50/80 hover:bg-sky-50/95 border-sky-200/70 hover:border-sky-300 dark:bg-sky-950/20 dark:border-sky-800/40',
  // Soft Amber / Warm Butter
  'bg-amber-50/80 hover:bg-amber-50/95 border-amber-200/70 hover:border-amber-300 dark:bg-amber-950/20 dark:border-amber-800/40',
  // Soft Teal / Aqua
  'bg-teal-50/80 hover:bg-teal-50/95 border-teal-200/70 hover:border-teal-300 dark:bg-teal-950/20 dark:border-teal-800/40',
  // Soft Honeydew / Matcha
  'bg-lime-50/80 hover:bg-lime-50/95 border-lime-200/70 hover:border-lime-300 dark:bg-lime-950/20 dark:border-lime-800/40',
  // Soft Pink / Orchid
  'bg-pink-50/80 hover:bg-pink-50/95 border-pink-200/70 hover:border-pink-300 dark:bg-pink-950/20 dark:border-pink-800/40',
  // Soft Indigo / Periwinkle
  'bg-indigo-50/80 hover:bg-indigo-50/95 border-indigo-200/70 hover:border-indigo-300 dark:bg-indigo-950/20 dark:border-indigo-800/40',
  // Soft Orange / Apricot
  'bg-orange-50/80 hover:bg-orange-50/95 border-orange-200/70 hover:border-orange-300 dark:bg-orange-950/20 dark:border-orange-800/40',
];

const getPastelTheme = (product, index) => {
  const key = String(product?.id || product?.slug || product?.title || product?.name || (index ?? '0'));
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  const offset = typeof index === 'number' ? index * 3 : 0;
  return PASTEL_THEMES[Math.abs(hash + offset) % PASTEL_THEMES.length];
};

export const ProductCard = ({ product, index }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const [isAdded, setIsAdded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const pastelTheme = getPastelTheme(product, index);

  const {
    id,
    title,
    name,
    slug,
    price,
    original_price,
    compare_at_price,
    category,
    category_name,
    in_stock = true,
  } = product || {};

  const displayTitle = title || name || 'Artisan Product';
  const displayImage = getProductImageUrl(product);

  const getReadableCategoryName = () => {
    if (category_name) return category_name;
    if (typeof category === 'object' && category?.name) return category.name;
    if (typeof category === 'string') {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(category);
      const isNumeric = /^\d+$/.test(category);
      if (!isUUID && !isNumeric) {
        return category;
      }
    }
    return null;
  };

  const displayCategory = getReadableCategoryName();
  const displayOriginalPrice = original_price || compare_at_price;

  const addToCartMutation = useMutation({
    mutationFn: () => cartService.addItem({ product: id, quantity: 1 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 1800);
    },
  });

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      navigate(ROUTE_PATHS.AUTH.LOGIN);
      return;
    }

    addToCartMutation.mutate();
  };

  return (
    <Card
      className={cn(
        'group relative flex flex-col justify-between overflow-hidden rounded-2xl sm:rounded-3xl border p-2.5 sm:p-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg',
        pastelTheme
      )}
    >
      {/* Product Image Frame with Cute Border */}
      <div className="relative aspect-square w-full overflow-hidden rounded-xl sm:rounded-2xl border border-white/80 dark:border-white/10 bg-white dark:bg-card shadow-2xs">
        <Link
          to={ROUTE_PATHS.STOREFRONT.PRODUCT_DETAILS(slug || id)}
          className="block h-full w-full"
        >
          {displayImage && !imgError ? (
            <img
              src={displayImage}
              alt={displayTitle}
              className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-muted-foreground/60 bg-muted/30">
              <Package size={30} className="stroke-[1.5]" />
              <span className="text-[10px] font-medium">No image</span>
            </div>
          )}
        </Link>

        {/* Out of stock Badge if applicable */}
        {!in_stock && (
          <div className="absolute top-2 left-2">
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 font-bold rounded-md">
              Out of stock
            </Badge>
          </div>
        )}
      </div>

      {/* Product Details Section */}
      <div className="mt-2.5 flex flex-1 flex-col justify-between">
        <div>
          {/* Category subtitle */}
          {displayCategory && (
            <span className="block text-[11px] font-semibold text-muted-foreground truncate">
              {displayCategory}
            </span>
          )}

          {/* Product Title */}
          <Link
            to={ROUTE_PATHS.STOREFRONT.PRODUCT_DETAILS(slug || id)}
            className="mt-0.5 block line-clamp-1 text-xs sm:text-sm font-bold text-foreground transition-colors hover:text-primary"
            title={displayTitle}
          >
            {displayTitle}
          </Link>
        </div>

        {/* Price & Add to Cart Action Row */}
        <div className="mt-3 flex items-center justify-between gap-1.5 pt-1.5 border-t border-black/[0.06] dark:border-white/[0.08]">
          <PriceDisplay
            price={price}
            originalPrice={displayOriginalPrice}
            priceClassName="text-sm sm:text-base font-extrabold text-foreground"
            originalPriceClassName="text-[11px] text-muted-foreground line-through ml-1"
          />

          <Button
            size="sm"
            disabled={!in_stock || addToCartMutation.isPending}
            onClick={handleAddToCart}
            variant={isAdded ? 'secondary' : 'default'}
            className={`h-7 sm:h-8 px-2 sm:px-3 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              isAdded
                ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40'
                : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xs'
            }`}
          >
            {isAdded ? (
              <>
                <Check size={13} className="stroke-[2.5]" />
                <span className="hidden xs:inline ml-1">Added</span>
              </>
            ) : (
              <>
                <ShoppingCart size={13} />
                <span className="hidden xs:inline ml-1">Add</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default ProductCard;

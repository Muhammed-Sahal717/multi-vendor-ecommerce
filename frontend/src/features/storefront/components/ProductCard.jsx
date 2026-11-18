import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Check, Star, Package } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PriceDisplay } from '../../../components/common/PriceDisplay.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Card } from '../../../components/ui/card.jsx';
import { cartService } from '../../cart/services/cartService.js';
import { queryKeys } from '../../../lib/queryClient.js';
import { ROUTE_PATHS } from '../../../routes/routePaths.js';
import { useAuth } from '../../../context/AuthProvider.jsx';
import { getProductImageUrl } from '../../../lib/utils.js';

export const ProductCard = ({ product }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const [isAdded, setIsAdded] = useState(false);
  const [imgError, setImgError] = useState(false);

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
    rating,
    average_rating,
  } = product || {};

  const displayTitle = title || name || 'Product';
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
  const displayRating = rating || average_rating;

  const addToCartMutation = useMutation({
    mutationFn: () => cartService.addItem({ product_id: id, quantity: 1 }),
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
    <Card className="group relative flex flex-col overflow-hidden rounded-2xl border-border bg-card transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
      {/* Product Image */}
      <Link
        to={ROUTE_PATHS.STOREFRONT.PRODUCT_DETAILS(slug || id)}
        className="relative aspect-square w-full overflow-hidden bg-muted/40"
      >
        {displayImage && !imgError ? (
          <img
            src={displayImage}
            alt={displayTitle}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <Package size={36} className="stroke-[1.5] text-muted-foreground/50" />
            <span className="text-xs font-medium">No image available</span>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
          {displayCategory && (
            <Badge
              variant="outline"
              className="border-primary/20 bg-card/90 text-primary text-[11px] font-semibold backdrop-blur-xs shadow-2xs"
            >
              {displayCategory}
            </Badge>
          )}
          {!in_stock && (
            <Badge variant="destructive" className="text-[11px]">
              Out of stock
            </Badge>
          )}
        </div>
      </Link>

      {/* Product Information */}
      <div className="flex flex-1 flex-col p-4">
        {displayRating && (
          <div className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-chart-5">
            <Star size={13} className="fill-chart-5 stroke-chart-5" />
            <span>{Number(displayRating).toFixed(1)}</span>
          </div>
        )}

        <Link
          to={ROUTE_PATHS.STOREFRONT.PRODUCT_DETAILS(slug || id)}
          className="line-clamp-2 text-sm font-semibold text-card-foreground transition-colors hover:text-primary"
          title={displayTitle}
        >
          {displayTitle}
        </Link>

        {/* Price & Add to Cart button */}
        <div className="mt-auto pt-4 flex items-center justify-between gap-2">
          <PriceDisplay
            price={price}
            originalPrice={displayOriginalPrice}
            priceClassName="text-base font-bold text-foreground"
            originalPriceClassName="text-xs text-muted-foreground line-through"
          />

          <Button
            size="sm"
            disabled={!in_stock || addToCartMutation.isPending}
            onClick={handleAddToCart}
            variant={isAdded ? 'secondary' : 'default'}
            className={`h-8 px-3 text-xs font-semibold transition-all ${
              isAdded ? 'bg-chart-2/15 text-chart-2 border border-chart-2/30' : ''
            }`}
          >
            {isAdded ? (
              <>
                <Check size={14} className="mr-1 stroke-[2.5]" />
                <span>Added</span>
              </>
            ) : (
              <>
                <ShoppingCart size={14} className="mr-1" />
                <span>Add</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default ProductCard;

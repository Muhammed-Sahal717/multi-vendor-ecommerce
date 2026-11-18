import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShoppingCart,
  Check,
  ShieldCheck,
  Truck,
  RotateCcw,
  Store,
  Minus,
  Plus,
  Package,
  Share2,
} from 'lucide-react';
import { catalogService } from '../services/catalogService.js';
import { cartService } from '../../cart/services/cartService.js';
import { queryKeys } from '../../../lib/queryClient.js';
import { ROUTE_PATHS } from '../../../routes/routePaths.js';
import { useAuth } from '../../../context/AuthProvider.jsx';
import { PriceDisplay } from '../../../components/common/PriceDisplay.jsx';
import { LoadingState } from '../../../components/shared/LoadingState.jsx';
import { ErrorState } from '../../../components/shared/ErrorState.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { Card } from '../../../components/ui/card.jsx';
import { getProductImageUrl, getMediaUrl } from '../../../lib/utils.js';

export const ProductDetailsPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  const [selectedImage, setSelectedImage] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Fetch product details
  const {
    data: product,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.catalog.product(slug),
    queryFn: () => catalogService.getProductBySlug(slug),
    enabled: Boolean(slug),
  });

  // Add to cart mutation
  const addToCartMutation = useMutation({
    mutationFn: (qty = 1) =>
      cartService.addItem({
        product: product?.id,
        quantity: qty,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 2000);
    },
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16">
        <LoadingState message="Loading product details..." />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16">
        <ErrorState
          title="Product not found"
          message="The requested product could not be found or is no longer active."
          onRetry={refetch}
        />
      </div>
    );
  }

  const {
    name,
    title,
    price,
    stock = 0,
    sku,
    description,
    category_name,
    category,
    seller_name,
    images = [],
  } = product;

  const displayTitle = title || name || 'Product';
  const displayCategory =
    category_name || (typeof category === 'object' ? category?.name : null);

  // Collect all image URLs
  const allImages = [];
  const primaryImgUrl = getProductImageUrl(product);
  if (primaryImgUrl) allImages.push(primaryImgUrl);

  if (Array.isArray(images)) {
    images.forEach((imgObj) => {
      const url = getMediaUrl(
        typeof imgObj === 'string' ? imgObj : imgObj?.image || imgObj?.url
      );
      if (url && !allImages.includes(url)) {
        allImages.push(url);
      }
    });
  }

  const activeImage = selectedImage || allImages[0] || null;
  const isOutOfStock = stock <= 0;

  const handleQuantityChange = (delta) => {
    setQuantity((prev) => {
      const updated = prev + delta;
      if (updated < 1) return 1;
      if (stock && updated > stock) return stock;
      return updated;
    });
  };

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      navigate(ROUTE_PATHS.AUTH.LOGIN, { state: { from: { pathname: `/products/${slug}` } } });
      return;
    }
    addToCartMutation.mutate(quantity);
  };

  const handleBuyNow = async () => {
    if (!isAuthenticated) {
      navigate(ROUTE_PATHS.AUTH.LOGIN, { state: { from: { pathname: `/products/${slug}` } } });
      return;
    }
    await addToCartMutation.mutateAsync(quantity);
    navigate(ROUTE_PATHS.STOREFRONT.CHECKOUT);
  };

  const handleShare = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-12">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Link to={ROUTE_PATHS.STOREFRONT.HOME} className="hover:text-primary transition-colors">
          Home
        </Link>
        <span>/</span>
        <Link to={ROUTE_PATHS.STOREFRONT.PRODUCTS} className="hover:text-primary transition-colors">
          Products
        </Link>
        {displayCategory && (
          <>
            <span>/</span>
            <Link
              to={`${ROUTE_PATHS.STOREFRONT.PRODUCTS}?category=${category?.slug || ''}`}
              className="hover:text-primary transition-colors"
            >
              {displayCategory}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="truncate max-w-xs text-foreground font-semibold">{displayTitle}</span>
      </nav>

      {/* Main Section: Gallery + Product Buy Box */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-14">
        {/* Left Column: Image Gallery (5 cols) */}
        <div className="space-y-4 lg:col-span-6">
          {/* Main Hero Preview */}
          <Card className="relative aspect-square w-full overflow-hidden rounded-3xl border-border bg-card p-2 shadow-sm">
            {activeImage ? (
              <img
                src={activeImage}
                alt={displayTitle}
                className="h-full w-full object-contain rounded-2xl transition-all duration-300"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
                <Package size={48} className="text-muted-foreground/40 stroke-[1.5]" />
                <span className="text-sm">No photo preview</span>
              </div>
            )}

            {/* Badges Overlay */}
            <div className="absolute top-4 left-4 flex flex-col gap-1.5">
              {displayCategory && (
                <Badge
                  variant="outline"
                  className="border-primary/25 bg-card/90 text-primary text-xs font-semibold backdrop-blur-xs shadow-2xs"
                >
                  {displayCategory}
                </Badge>
              )}
            </div>

            {/* Share button */}
            <button
              type="button"
              onClick={handleShare}
              className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-card/90 border border-border text-muted-foreground hover:text-foreground shadow-2xs backdrop-blur-xs transition-colors"
              title="Share product link"
            >
              {copiedLink ? <Check size={14} className="text-chart-2" /> : <Share2 size={14} />}
            </button>
          </Card>

          {/* Thumbnails Row */}
          {allImages.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              {allImages.map((imgUrl, idx) => (
                <button
                  key={imgUrl || idx}
                  type="button"
                  onClick={() => setSelectedImage(imgUrl)}
                  className={`relative h-18 w-18 shrink-0 overflow-hidden rounded-xl border-2 transition-all p-1 bg-card ${
                    activeImage === imgUrl
                      ? 'border-primary ring-2 ring-primary/20 scale-102'
                      : 'border-border opacity-70 hover:opacity-100 hover:border-primary/50'
                  }`}
                >
                  <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} className="h-full w-full object-cover rounded-lg" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Information & Purchase (6 cols) */}
        <div className="space-y-6 lg:col-span-6">
          {/* Header & Seller Info */}
          <div className="space-y-2 border-b border-border pb-5">
            {seller_name && (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-chart-2/30 bg-chart-2/15 px-2.5 py-0.5 text-xs font-bold text-chart-2">
                <Store size={13} />
                <span>Sold by {seller_name}</span>
              </div>
            )}

            <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl lg:text-4xl font-heading">
              {displayTitle}
            </h1>

            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-muted-foreground">
              {sku && <span>SKU: <strong className="text-foreground">{sku}</strong></span>}
              <span>•</span>
              {/* Stock Status Badge */}
              {isOutOfStock ? (
                <Badge variant="destructive" className="text-xs">
                  Out of Stock
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="border-chart-4/30 bg-chart-4/15 text-foreground font-semibold text-xs"
                >
                  In Stock ({stock} available)
                </Badge>
              )}
            </div>
          </div>

          {/* Price Box */}
          <div className="flex items-baseline gap-4 py-2">
            <PriceDisplay
              price={price}
              priceClassName="text-3xl font-black text-foreground font-heading"
              originalPriceClassName="text-sm text-muted-foreground line-through"
            />
            <span className="text-xs font-medium text-muted-foreground">Inclusive of all taxes</span>
          </div>

          {/* Quantity Selector & Action CTAs */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-4">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Quantity:
              </span>
              <div className="flex items-center rounded-xl border border-border bg-card p-1 shadow-2xs">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  disabled={quantity <= 1 || isOutOfStock}
                  onClick={() => handleQuantityChange(-1)}
                  className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                >
                  <Minus size={12} />
                </Button>
                <span className="w-10 text-center text-xs font-bold text-foreground">
                  {quantity}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  disabled={isOutOfStock || quantity >= stock}
                  onClick={() => handleQuantityChange(1)}
                  className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                >
                  <Plus size={12} />
                </Button>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                type="button"
                size="lg"
                disabled={isOutOfStock || addToCartMutation.isPending}
                onClick={handleAddToCart}
                className="flex-1 h-11 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 gap-2"
              >
                {isAdded ? (
                  <>
                    <Check size={16} className="text-chart-2 stroke-[2.5]" />
                    <span>Added to Cart!</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart size={16} />
                    <span>Add to Cart</span>
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="lg"
                disabled={isOutOfStock || addToCartMutation.isPending}
                onClick={handleBuyNow}
                className="flex-1 h-11 text-xs font-bold border-primary text-primary hover:bg-primary/10"
              >
                Buy Now
              </Button>
            </div>
          </div>

          {/* Guarantee Badges */}
          <Card className="grid grid-cols-3 gap-3 rounded-2xl border-border bg-card/60 p-4 text-center">
            <div className="flex flex-col items-center gap-1.5">
              <ShieldCheck size={20} className="text-chart-2" />
              <span className="text-[11px] font-bold text-foreground">100% Genuine</span>
              <span className="text-[10px] text-muted-foreground">Direct from seller</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 border-x border-border">
              <Truck size={20} className="text-chart-4" />
              <span className="text-[11px] font-bold text-foreground">Fast Delivery</span>
              <span className="text-[10px] text-muted-foreground">Free over ₹999</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <RotateCcw size={20} className="text-chart-5" />
              <span className="text-[11px] font-bold text-foreground">Easy Return</span>
              <span className="text-[10px] text-muted-foreground">7-day replacement</span>
            </div>
          </Card>
        </div>
      </div>

      {/* Description & Details Section */}
      <section className="space-y-4 pt-6 border-t border-border">
        <h2 className="text-xl font-black tracking-tight text-foreground font-heading">
          Product Description
        </h2>
        <Card className="rounded-2xl border-border bg-card p-6 shadow-2xs">
          <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {description || 'No detailed description provided for this product.'}
          </p>
        </Card>
      </section>
    </div>
  );
};

export default ProductDetailsPage;

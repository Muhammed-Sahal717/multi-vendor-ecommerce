import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShoppingCart,
  Check,
  ShieldCheck,
  Truck,
  RotateCcw,
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
import { ProductCard } from '../components/ProductCard.jsx';
import { Button } from '../../../components/ui/button.jsx';
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

  const categorySlug =
    typeof product?.category === 'object'
      ? product?.category?.slug
      : product?.category || '';

  // Fetch related products for bottom recommendations
  const { data: relatedData } = useQuery({
    queryKey: queryKeys.catalog.products({
      category: categorySlug,
      page_size: 5,
    }),
    queryFn: () =>
      catalogService.getProducts({
        category: categorySlug,
        page_size: 5,
      }),
    enabled: Boolean(categorySlug),
    staleTime: 1000 * 60 * 5,
  });

  const relatedProducts = (
    relatedData?.results || (Array.isArray(relatedData) ? relatedData : [])
  ).filter((p) => p.id !== product?.id && p.slug !== product?.slug).slice(0, 4);

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
    original_price,
    compare_at_price,
    stock = 0,
    sku,
    description,
    category_name,
    category,
    seller_name,
    images = [],
  } = product;

  const displayTitle = title || name || 'Product';
  const displayOriginalPrice = original_price || compare_at_price;
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
      {/* Breadcrumbs Navigation */}
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
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12 items-start">
        {/* Left Column: Image Gallery (6 cols) */}
        <div className="space-y-4 lg:col-span-6">
          {/* Main Hero Preview with cute border container */}
          <div className="relative aspect-square w-full overflow-hidden rounded-3xl border border-border/70 bg-card p-3 shadow-xs">
            <div className="relative h-full w-full overflow-hidden rounded-2xl bg-muted/15 flex items-center justify-center border border-border/40">
              {activeImage ? (
                <img
                  src={activeImage}
                  alt={displayTitle}
                  className="h-full w-full object-contain p-2 transition-all duration-300"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground/60">
                  <Package size={42} className="stroke-[1.5]" />
                  <span className="text-xs font-medium">No photo preview</span>
                </div>
              )}
            </div>

            {/* Share button */}
            <button
              type="button"
              onClick={handleShare}
              className="absolute top-5 right-5 flex h-8 w-8 items-center justify-center rounded-full bg-card/90 border border-border/80 text-muted-foreground hover:text-foreground shadow-2xs backdrop-blur-xs transition-colors cursor-pointer"
              title="Share product link"
            >
              {copiedLink ? <Check size={14} className="text-emerald-500" /> : <Share2 size={14} />}
            </button>
          </div>

          {/* Thumbnails Row */}
          {allImages.length > 1 && (
            <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
              {allImages.map((imgUrl, idx) => (
                <button
                  key={imgUrl || idx}
                  type="button"
                  onClick={() => setSelectedImage(imgUrl)}
                  className={`relative h-16 w-16 sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-2xl border transition-all p-1 bg-card cursor-pointer ${
                    activeImage === imgUrl
                      ? 'border-primary ring-2 ring-primary/20 scale-102 shadow-xs'
                      : 'border-border/70 opacity-70 hover:opacity-100 hover:border-primary/40'
                  }`}
                >
                  <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} className="h-full w-full object-cover rounded-xl" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Information & Purchase (6 cols) */}
        <div className="space-y-6 lg:col-span-6">
          {/* Header & Seller Info */}
          <div className="space-y-2 border-b border-border/60 pb-5">
            {displayCategory && (
              <span className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {displayCategory}
              </span>
            )}

            <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl lg:text-4xl font-heading leading-tight">
              {displayTitle}
            </h1>

            <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs text-muted-foreground">
              {seller_name && (
                <>
                  <span>
                    Sold by{' '}
                    <span className="font-bold text-foreground">
                      {seller_name}
                    </span>
                  </span>
                  <span>•</span>
                </>
              )}

              {/* Minimal Clean Stock Status */}
              {isOutOfStock ? (
                <span className="inline-flex items-center gap-1.5 font-bold text-rose-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                  Out of Stock
                </span>
              ) : stock <= 5 ? (
                <span className="inline-flex items-center gap-1.5 font-semibold text-amber-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Only {stock} left in stock
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  In Stock ({stock} available)
                </span>
              )}

              {sku && (
                <>
                  <span>•</span>
                  <span>SKU: <strong className="text-foreground">{sku}</strong></span>
                </>
              )}
            </div>
          </div>

          {/* Price Box */}
          <div className="space-y-1">
            <div className="flex items-baseline gap-3">
              <PriceDisplay
                price={price}
                originalPrice={displayOriginalPrice}
                priceClassName="text-3xl sm:text-4xl font-black text-foreground font-heading"
                originalPriceClassName="text-base text-muted-foreground line-through"
              />
            </div>
            <p className="text-xs text-muted-foreground">Inclusive of all applicable taxes • Free shipping over ₹999</p>
          </div>

          {/* Quantity Selector & Action CTAs */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Qty:
              </span>
              <div className="inline-flex items-center rounded-xl border border-border/80 bg-card p-1 shadow-2xs">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  disabled={quantity <= 1 || isOutOfStock}
                  onClick={() => handleQuantityChange(-1)}
                  className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
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
                  className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
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
                className="flex-1 h-12 text-xs font-bold rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/25 gap-2 cursor-pointer transition-all"
              >
                {isAdded ? (
                  <>
                    <Check size={16} className="stroke-[2.5]" />
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
                className="flex-1 h-12 text-xs font-bold rounded-2xl border-primary/50 text-foreground hover:bg-primary/10 cursor-pointer transition-all"
              >
                Buy Now
              </Button>
            </div>
          </div>

          {/* Minimal Clean Guarantee Strip */}
          <div className="grid grid-cols-3 gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4 text-center">
            <div className="flex flex-col items-center gap-1">
              <ShieldCheck size={18} className="text-primary stroke-[2]" />
              <span className="text-[11px] font-bold text-foreground">100% Genuine</span>
              <span className="text-[10px] text-muted-foreground">Direct from seller</span>
            </div>
            <div className="flex flex-col items-center gap-1 border-x border-border/60">
              <Truck size={18} className="text-primary stroke-[2]" />
              <span className="text-[11px] font-bold text-foreground">Fast Delivery</span>
              <span className="text-[10px] text-muted-foreground">Free above ₹999</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <RotateCcw size={18} className="text-primary stroke-[2]" />
              <span className="text-[11px] font-bold text-foreground">Easy Return</span>
              <span className="text-[10px] text-muted-foreground">7-day replacement</span>
            </div>
          </div>
        </div>
      </div>

      {/* Description Section */}
      <section className="space-y-4 pt-6 border-t border-border/60">
        <h2 className="text-xl font-black tracking-tight text-foreground font-heading">
          Product Details & Description
        </h2>
        <Card className="rounded-3xl border-border/70 bg-card p-6 sm:p-8 shadow-2xs">
          <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {description || 'No detailed description provided for this product.'}
          </p>
        </Card>
      </section>

      {/* Related Recommendations Section */}
      {relatedProducts.length > 0 && (
        <section className="space-y-6 pt-6 border-t border-border/60">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black tracking-tight text-foreground font-heading">
                Related Products
              </h2>
              <p className="text-xs text-muted-foreground">Explore more items in this category</p>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-xs font-semibold text-primary">
              <Link to={`${ROUTE_PATHS.STOREFRONT.PRODUCTS}?category=${categorySlug}`}>View All</Link>
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 sm:gap-4 md:gap-5">
            {relatedProducts.map((p, idx) => (
              <ProductCard key={p.id || p.slug} product={p} index={idx} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default ProductDetailsPage;

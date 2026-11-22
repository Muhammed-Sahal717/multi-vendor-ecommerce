import { useState, useMemo } from 'react';
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
  Store,
  BadgeCheck,
  ArrowLeft,
  ArrowRight,
  FileText,
  Sparkles,
  ChevronRight,
  CheckCircle2,
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
  const [activeTab, setActiveTab] = useState('description');

  // 1. Fetch Product Details
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

  // Fetch categories to resolve category slug and name accurately
  const { data: categoriesData } = useQuery({
    queryKey: queryKeys.catalog.categories(),
    queryFn: catalogService.getCategories,
  });

  const categories = useMemo(() => {
    return Array.isArray(categoriesData)
      ? categoriesData
      : categoriesData?.results || [];
  }, [categoriesData]);

  const matchedCategory = useMemo(() => {
    if (!product) return null;
    return (
      categories.find(
        (c) =>
          c.id === product.category ||
          String(c.id) === String(product.category) ||
          c.slug === product.category ||
          (typeof product.category === 'object' &&
            (c.id === product.category?.id || c.slug === product.category?.slug)) ||
          (product.category_name &&
            c.name?.toLowerCase() === product.category_name.toLowerCase())
      ) || null
    );
  }, [categories, product]);

  const resolvedCategorySlug =
    matchedCategory?.slug ||
    product?.category_slug ||
    (typeof product?.category === 'object' ? product?.category?.slug : null) ||
    (product?.category && !/^[0-9a-f-]{36}$/i.test(product.category)
      ? product.category
      : '');

  const resolvedCategoryName =
    matchedCategory?.name ||
    product?.category_name ||
    (typeof product?.category === 'object' ? product?.category?.name : null);

  // 2. Fetch Related & Recommended Products
  const { data: relatedData } = useQuery({
    queryKey: queryKeys.catalog.products({
      category: resolvedCategorySlug,
      page_size: 6,
    }),
    queryFn: () =>
      catalogService.getProducts({
        category: resolvedCategorySlug,
        page_size: 6,
      }),
    enabled: Boolean(resolvedCategorySlug),
    staleTime: 1000 * 60 * 5,
  });

  // Fetch storewide top recommendations to backfill
  const { data: fallbackData } = useQuery({
    queryKey: queryKeys.catalog.products({ page_size: 8 }),
    queryFn: () => catalogService.getProducts({ page_size: 8 }),
    staleTime: 1000 * 60 * 5,
  });

  const recommendedProducts = useMemo(() => {
    const categoryMatches = (
      relatedData?.results || (Array.isArray(relatedData) ? relatedData : [])
    ).filter((p) => p.id !== product?.id && p.slug !== product?.slug);

    if (categoryMatches.length >= 4) {
      return categoryMatches.slice(0, 4);
    }

    const fallbacks = (
      fallbackData?.results || (Array.isArray(fallbackData) ? fallbackData : [])
    ).filter(
      (p) =>
        p.id !== product?.id &&
        p.slug !== product?.slug &&
        !categoryMatches.some((cm) => cm.id === p.id)
    );

    return [...categoryMatches, ...fallbacks].slice(0, 4);
  }, [relatedData, fallbackData, product]);

  // 3. Add to Cart Mutation
  const addToCartMutation = useMutation({
    mutationFn: (qty = 1) =>
      cartService.addItem({
        product: product?.id,
        quantity: qty,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 2200);
    },
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20">
        <LoadingState message="Loading artisan product details..." />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20">
        <ErrorState
          title="Product not found"
          message="The requested product could not be found or has been unlisted."
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
    description,
    seller_name,
    images = [],
  } = product;

  const displayTitle = title || name || 'Artisan Product';
  const displayOriginalPrice = original_price || compare_at_price;
  const displayCategory = resolvedCategoryName;

  // Gather image gallery items
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

  // Calculate discount percentage if original price is greater
  const discountPercent =
    displayOriginalPrice && Number(displayOriginalPrice) > Number(price)
      ? Math.round(
          ((Number(displayOriginalPrice) - Number(price)) /
            Number(displayOriginalPrice)) *
            100
        )
      : 0;

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
      navigate(ROUTE_PATHS.AUTH.LOGIN, {
        state: { from: { pathname: `/products/${slug}` } },
      });
      return;
    }
    addToCartMutation.mutate(quantity);
  };

  const handleBuyNow = async () => {
    if (!isAuthenticated) {
      navigate(ROUTE_PATHS.AUTH.LOGIN, {
        state: { from: { pathname: `/products/${slug}` } },
      });
      return;
    }
    await addToCartMutation.mutateAsync(quantity);
    navigate(ROUTE_PATHS.STOREFRONT.CHECKOUT);
  };

  const handleShare = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-12">
      {/* 1. Header Toolbar & Clean Breadcrumbs Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-muted-foreground"
        >
          <Link
            to={ROUTE_PATHS.STOREFRONT.HOME}
            className="hover:text-foreground transition-colors"
          >
            Home
          </Link>
          <ChevronRight size={13} className="text-muted-foreground/60" />
          <Link
            to={ROUTE_PATHS.STOREFRONT.PRODUCTS}
            className="hover:text-foreground transition-colors"
          >
            Products
          </Link>
          {displayCategory && (
            <>
              <ChevronRight size={13} className="text-muted-foreground/60" />
              <Link
                to={`${ROUTE_PATHS.STOREFRONT.PRODUCTS}?category=${encodeURIComponent(resolvedCategorySlug || '')}`}
                className="hover:text-foreground transition-colors"
              >
                {displayCategory}
              </Link>
            </>
          )}
          <ChevronRight size={13} className="text-muted-foreground/60" />
          <span className="truncate max-w-[200px] sm:max-w-xs font-semibold text-foreground">
            {displayTitle}
          </span>
        </nav>

        <Link
          to={ROUTE_PATHS.STOREFRONT.PRODUCTS}
          className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card px-3.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-primary/40 shadow-2xs transition-all"
        >
          <ArrowLeft size={13} />
          <span>Back to Catalog</span>
        </Link>
      </div>

      {/* 2. Main Two-Column Showcase (Gallery + Buy Box) */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12 items-start">
        {/* Left Column: Image Gallery (7 cols, generous showcase size) */}
        <div className="lg:col-span-7">
          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4 items-start">
            {/* Small Thumbnails (Left side on sm+, bottom on mobile) */}
            {allImages.length > 1 && (
              <div className="flex sm:flex-col gap-2 overflow-x-auto sm:overflow-y-auto max-h-[520px] scrollbar-none shrink-0 w-full sm:w-auto pb-1 sm:pb-0">
                {allImages.map((imgUrl, idx) => {
                  const isActive = activeImage === imgUrl;
                  return (
                    <button
                      key={imgUrl || idx}
                      type="button"
                      onClick={() => setSelectedImage(imgUrl)}
                      className={`relative h-11 w-11 sm:h-13 sm:w-13 shrink-0 overflow-hidden rounded-xl border-2 transition-colors p-0.5 bg-card cursor-pointer ${
                        isActive
                          ? 'border-primary'
                          : 'border-border/60 opacity-60 hover:opacity-100 hover:border-border'
                      }`}
                    >
                      <img
                        src={imgUrl}
                        alt={`Thumbnail ${idx + 1}`}
                        className="h-full w-full object-cover rounded-[8px]"
                      />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Main Hero Image Canvas (Increased Prominent Size) */}
            <div className="relative aspect-square w-full flex-1 overflow-hidden rounded-3xl border border-border/60 bg-card p-3 sm:p-5 shadow-sm group">
              <div className="relative h-full w-full overflow-hidden rounded-2xl bg-muted/15 border border-border/30 flex items-center justify-center">
                {activeImage ? (
                  <img
                    src={activeImage}
                    alt={displayTitle}
                    className="h-full w-full object-contain p-2 sm:p-4 transition-transform duration-500 ease-out group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground/50">
                    <Package size={44} className="stroke-[1.3]" />
                    <span className="text-xs font-medium">No photo available</span>
                  </div>
                )}
              </div>

              {/* Floating Top Indicators */}
              <div className="absolute top-5 left-5 flex flex-col gap-1.5">
                {discountPercent > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-extrabold text-primary-foreground shadow-xs">
                    <Sparkles size={12} />
                    <span>{discountPercent}% OFF</span>
                  </span>
                )}

                {isOutOfStock && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/90 backdrop-blur-xs px-3 py-1 text-xs font-bold text-white shadow-xs">
                    Out of Stock
                  </span>
                )}
              </div>

              {/* Share / Copy Link Button */}
              <button
                type="button"
                onClick={handleShare}
                className="absolute top-5 right-5 flex h-9 w-9 items-center justify-center rounded-full bg-card/90 border border-border/80 text-muted-foreground hover:text-foreground shadow-2xs backdrop-blur-xs transition-all hover:scale-105 cursor-pointer"
                title="Share product link"
                aria-label="Share product link"
              >
                {copiedLink ? (
                  <Check size={15} className="text-emerald-500 stroke-[2.5]" />
                ) : (
                  <Share2 size={15} />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Buy Box & Product Info (5 cols, sticky) */}
        <div className="space-y-6 lg:col-span-5 lg:sticky lg:top-24">
          {/* Header Row: Category Pill & Product Title */}
          <div className="space-y-2.5">
            {displayCategory && (
              <div>
                <Link
                  to={`${ROUTE_PATHS.STOREFRONT.PRODUCTS}?category=${encodeURIComponent(resolvedCategorySlug || '')}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card px-3 py-1 text-xs font-semibold text-foreground hover:border-primary/40 hover:text-primary transition-colors shadow-2xs"
                >
                  <span>{displayCategory}</span>
                </Link>
              </div>
            )}

            {/* Product Title */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-foreground font-heading leading-tight">
              {displayTitle}
            </h1>

            {/* Verified Seller Badge & Stock Status (No counts, clean dots) */}
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              {seller_name && (
                <div className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-muted/25 px-3 py-1.5 text-xs text-muted-foreground">
                  <Store size={14} className="text-accent" />
                  <span>
                    Sold by <strong className="font-bold text-foreground">{seller_name}</strong>
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-accent">
                    <BadgeCheck size={13} className="text-accent stroke-[2.2]" />
                    <span>Verified</span>
                  </span>
                </div>
              )}

              {/* Clean Stock Status Badge */}
              {isOutOfStock ? (
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                  <span>Out of Stock</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span>In Stock</span>
                </span>
              )}
            </div>
          </div>

          {/* Pricing Text (Pure text presentation, no card wrapper, no taxes text) */}
          <div className="space-y-1 pt-1">
            <div className="flex flex-wrap items-baseline gap-3">
              <PriceDisplay
                price={price}
                originalPrice={displayOriginalPrice}
                priceClassName="text-3xl sm:text-4xl font-black text-foreground font-heading"
                originalPriceClassName="text-base text-muted-foreground line-through"
              />
              {discountPercent > 0 && (
                <span className="rounded-md bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  Save {discountPercent}%
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Free delivery on orders over ₹999
            </p>
          </div>

          {/* Quantity Selector & CTAs */}
          <div className="space-y-4 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Quantity
              </span>
              <div className="inline-flex items-center rounded-xl border border-border/80 bg-card p-1 shadow-2xs">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  disabled={quantity <= 1 || isOutOfStock}
                  onClick={() => handleQuantityChange(-1)}
                  className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                  aria-label="Decrease quantity"
                >
                  <Minus size={12} />
                </Button>
                <span className="w-10 text-center text-xs font-bold text-foreground select-none">
                  {quantity}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  disabled={isOutOfStock || quantity >= stock}
                  onClick={() => handleQuantityChange(1)}
                  className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                  aria-label="Increase quantity"
                >
                  <Plus size={12} />
                </Button>
              </div>
            </div>

            {/* Action Buttons Row */}
            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <Button
                type="button"
                size="lg"
                disabled={isOutOfStock || addToCartMutation.isPending}
                onClick={handleAddToCart}
                className="flex-1 h-12 text-xs sm:text-sm font-bold rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/25 gap-2 cursor-pointer transition-all"
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
                className="flex-1 h-12 text-xs sm:text-sm font-bold rounded-2xl border-2 border-foreground/15 bg-card hover:bg-muted/40 text-foreground hover:border-foreground/30 cursor-pointer transition-all"
              >
                Buy Now
              </Button>
            </div>
          </div>

          {/* Minimal Clean Guarantee Strip */}
          <div className="grid grid-cols-3 gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4 text-center">
            <div className="flex flex-col items-center gap-1.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-card border border-border/60 shadow-2xs">
                <ShieldCheck size={16} className="text-accent stroke-[2]" />
              </div>
              <span className="text-[11px] font-bold text-foreground leading-tight">100% Authentic</span>
              <span className="text-[10px] text-muted-foreground">Direct from artisan</span>
            </div>

            <div className="flex flex-col items-center gap-1.5 border-x border-border/60 px-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-card border border-border/60 shadow-2xs">
                <Truck size={16} className="text-primary stroke-[2]" />
              </div>
              <span className="text-[11px] font-bold text-foreground leading-tight">Fast Shipping</span>
              <span className="text-[10px] text-muted-foreground">Free above ₹999</span>
            </div>

            <div className="flex flex-col items-center gap-1.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-card border border-border/60 shadow-2xs">
                <RotateCcw size={16} className="text-emerald-500 stroke-[2]" />
              </div>
              <span className="text-[11px] font-bold text-foreground leading-tight">Easy Returns</span>
              <span className="text-[10px] text-muted-foreground">7-day replacement</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Product Information Tabs (Fresh Segmented Layout) */}
      <section className="space-y-6 pt-4 border-t border-border/60">
        {/* Segmented Pill Tabs Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('description')}
            className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'description'
                ? 'bg-foreground text-background shadow-xs'
                : 'border border-border/80 bg-card text-muted-foreground hover:text-foreground hover:border-foreground/30'
            }`}
          >
            <FileText size={14} />
            <span>Description</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('shipping')}
            className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'shipping'
                ? 'bg-foreground text-background shadow-xs'
                : 'border border-border/80 bg-card text-muted-foreground hover:text-foreground hover:border-foreground/30'
            }`}
          >
            <Truck size={14} />
            <span>Shipping & Delivery</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('seller')}
            className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'seller'
                ? 'bg-foreground text-background shadow-xs'
                : 'border border-border/80 bg-card text-muted-foreground hover:text-foreground hover:border-foreground/30'
            }`}
          >
            <Store size={14} />
            <span>Seller Profile</span>
          </button>
        </div>

        {/* Tab Content Box */}
        <div className="rounded-3xl border border-border/60 bg-card p-6 sm:p-8 shadow-2xs">
          {activeTab === 'description' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-foreground font-heading">
                About this item
              </h3>
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {description ||
                  'No detailed description provided for this artisan item. Each product on Galla is verified for authenticity and crafted with utmost care.'}
              </p>

              <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-border/50 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                  <span>Handcrafted & verified quality standards</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                  <span>Standard protective packaging</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                  <span>Direct shipment from authorized merchant</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                  <span>Transparent tax invoices with every purchase</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'shipping' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-foreground font-heading">
                Shipping & Return Policy
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm text-muted-foreground">
                <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-foreground font-bold text-xs sm:text-sm">
                    <Truck size={16} className="text-primary" />
                    <span>Express Pan-India Delivery</span>
                  </div>
                  <p className="leading-relaxed">
                    Orders are processed by the merchant within 24–48 hours. Typical doorstep delivery takes 3–5 business days depending on delivery location.
                  </p>
                </div>

                <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-foreground font-bold text-xs sm:text-sm">
                    <RotateCcw size={16} className="text-emerald-500" />
                    <span>7-Day Replacement Guarantee</span>
                  </div>
                  <p className="leading-relaxed">
                    If an item arrives damaged, defective, or incorrect, you can request an easy replacement or refund via your Customer Dashboard within 7 days.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'seller' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 border border-accent/20 text-accent font-bold text-lg">
                  <Store size={22} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground font-heading">
                    {seller_name || 'Independent Artisan'}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Verified Merchant on Galla Marketplace
                  </p>
                </div>
              </div>

              <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground">
                This merchant is an authorized seller adhering to Galla&rsquo;s strict customer satisfaction, authentic packaging, and prompt shipping requirements.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* 4. Recommended Products Section */}
      {recommendedProducts.length > 0 && (
        <section className="space-y-6 pt-6 border-t border-border/60">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground font-heading flex items-center gap-2">
                <Sparkles size={20} className="text-primary stroke-[2.2]" />
                <span>Recommended Products</span>
              </h2>
              <p className="text-xs text-muted-foreground">
                {displayCategory
                  ? `Curated selections from ${displayCategory} and trending marketplace crafts`
                  : 'Handpicked artisan crafts and trending selections you might like'}
              </p>
            </div>

            <Button
              asChild
              variant="outline"
              size="sm"
              className="rounded-full text-xs font-semibold border-border/80 hover:border-primary/40 cursor-pointer"
            >
              <Link
                to={
                  resolvedCategorySlug
                    ? `${ROUTE_PATHS.STOREFRONT.PRODUCTS}?category=${encodeURIComponent(resolvedCategorySlug)}`
                    : ROUTE_PATHS.STOREFRONT.PRODUCTS
                }
              >
                <span>View More</span>
                <ArrowRight size={13} className="ml-1" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 sm:gap-4 md:gap-5">
            {recommendedProducts.map((p, idx) => (
              <ProductCard key={p.id || p.slug} product={p} index={idx} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default ProductDetailsPage;

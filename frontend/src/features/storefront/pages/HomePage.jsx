import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Sparkles } from 'lucide-react';
import { HeroCarousel } from '../components/HeroCarousel.jsx';
import { CategoryCard } from '../components/CategoryCard.jsx';
import { ProductCard } from '../components/ProductCard.jsx';
import { LoadingState } from '../../../components/shared/LoadingState.jsx';
import { ErrorState } from '../../../components/shared/ErrorState.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { catalogService } from '../services/catalogService.js';
import { queryKeys } from '../../../lib/queryClient.js';
import { ROUTE_PATHS } from '../../../routes/routePaths.js';

export const HomePage = () => {
  // 1. Fetch Categories
  const {
    data: categoriesData,
    isLoading: isLoadingCategories,
    isError: isErrorCategories,
    refetch: refetchCategories,
  } = useQuery({
    queryKey: queryKeys.catalog.categories(),
    queryFn: catalogService.getCategories,
  });

  // 2. Fetch Latest Products (fetching 10 for the 5-column small card layout)
  const {
    data: productsData,
    isLoading: isLoadingProducts,
    isError: isErrorProducts,
    refetch: refetchProducts,
  } = useQuery({
    queryKey: queryKeys.catalog.products({ page_size: 10 }),
    queryFn: () => catalogService.getProducts({ page_size: 10 }),
  });

  const categories = Array.isArray(categoriesData)
    ? categoriesData
    : categoriesData?.results || [];

  const products = Array.isArray(productsData)
    ? productsData
    : productsData?.results || [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-16">
      {/* 1. Hero Image Carousel (No text or CTA overlays, pure carousel) */}
      <section>
        <HeroCarousel />
      </section>

      {/* 2. Categories Section (Directly under carousel, horizontal slide if overflow) */}
      <section className="-mt-8 sm:-mt-10">
        {isLoadingCategories ? (
          <LoadingState message="Loading categories..." />
        ) : isErrorCategories ? (
          <ErrorState
            title="Failed to load categories"
            message="Could not load the categories at this time."
            onRetry={refetchCategories}
          />
        ) : categories.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground py-4">
            No categories available right now.
          </p>
        ) : (
          <div className="w-full overflow-x-auto scrollbar-none pb-3 pt-1 px-1">
            <div className="flex items-center justify-start sm:justify-center gap-4 sm:gap-6 md:gap-8 w-max min-w-full px-2">
              {categories.map((cat, index) => (
                <CategoryCard
                  key={cat.id || cat.slug}
                  category={cat}
                  index={index}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 3. Featured / Trending Products Section */}
      <section className="space-y-6">
        {/* Centered Heading */}
        <div className="text-center max-w-xl mx-auto space-y-1.5">
          <h2 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl font-heading">
            Trending Products
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Top-rated artisanal products, unique crafts, and bestsellers from regional creators
          </p>
        </div>

        {isLoadingProducts ? (
          <LoadingState message="Loading trending products..." />
        ) : isErrorProducts ? (
          <ErrorState
            title="Failed to load products"
            message="Unable to retrieve product listings from the catalog."
            onRetry={refetchProducts}
          />
        ) : products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
            <p className="text-base font-semibold text-foreground">No products published yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Be the first seller to list an item on Galla!</p>
            <Button asChild size="sm" className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90">
              <Link to={ROUTE_PATHS.SELLER.APPLICATION}>Start Selling</Link>
            </Button>
          </div>
        ) : (
          <div>
            {/* Small & compact cards grid (2-cols mobile, 3-cols tablet, 4-cols laptop, 5-cols desktop) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-5">
              {products.map((prod, index) => (
                <ProductCard key={prod.id || prod.slug} product={prod} index={index} />
              ))}
            </div>

            {/* Centered View All Products Button */}
            <div className="mt-10 flex justify-center">
              <Button
                asChild
                className="group h-11 rounded-full font-bold px-8 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/25 text-xs sm:text-sm transition-all cursor-pointer"
              >
                <Link to={ROUTE_PATHS.STOREFRONT.PRODUCTS} className="inline-flex items-center justify-center gap-2 whitespace-nowrap">
                  <span>Explore All Products</span>
                  <ArrowRight size={16} className="shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* 4. Become a Seller Card (Simple clean card with /seller.jpg as background) */}
      <section className="relative overflow-hidden rounded-3xl border border-border/80 shadow-md">
        {/* Background Image from public/seller.jpg */}
        <img
          src="/seller.jpg"
          alt="Grow your business on Galla"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />

        {/* Contrast Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/75 to-slate-950/40" />

        {/* Simple Content Container */}
        <div className="relative z-10 flex flex-col justify-center items-start p-8 sm:p-12 lg:p-16 max-w-2xl space-y-4 text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/20 px-3.5 py-1 text-xs font-bold text-white backdrop-blur-md shadow-xs">
            <Sparkles size={13} className="text-primary-foreground" />
            <span>Seller Onboarding Open</span>
          </div>

          <h3 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white font-heading leading-tight">
            Grow your business with Galla.
          </h3>

          <p className="text-xs sm:text-base font-medium text-slate-200 leading-relaxed max-w-xl">
            Join hundreds of verified merchants and master artisans. List your handcrafted products, reach thousands of buyers nationwide, and receive prompt weekly bank payouts.
          </p>

          <div className="pt-2">
            <Button
              asChild
              className="group h-12 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/30 text-xs sm:text-sm px-7 transition-all cursor-pointer"
            >
              <Link to={ROUTE_PATHS.CUSTOMER.PROFILE} className="inline-flex items-center justify-center gap-2 whitespace-nowrap">
                <span>Apply to Sell on Galla</span>
                <ArrowRight size={16} className="shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;

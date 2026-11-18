import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Sparkles, TrendingUp, Store } from 'lucide-react';
import { HeroBanner } from '../components/HeroBanner.jsx';
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

  // 2. Fetch Latest Products
  const {
    data: productsData,
    isLoading: isLoadingProducts,
    isError: isErrorProducts,
    refetch: refetchProducts,
  } = useQuery({
    queryKey: queryKeys.catalog.products({ page_size: 8 }),
    queryFn: () => catalogService.getProducts({ page_size: 8 }),
  });

  const categories = Array.isArray(categoriesData)
    ? categoriesData
    : categoriesData?.results || [];

  const products = Array.isArray(productsData)
    ? productsData
    : productsData?.results || [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-16">
      {/* 1. Hero Section */}
      <HeroBanner />

      {/* 2. Top Categories Section */}
      <section>
        <div className="flex items-end justify-between mb-6">
          <div>
            <Badge
              variant="outline"
              className="gap-1.5 border-primary/25 bg-primary/10 text-primary font-bold uppercase tracking-wider text-[11px] px-2.5 py-0.5"
            >
              <Sparkles size={12} className="stroke-[2.5]" />
              <span>Explore Collections</span>
            </Badge>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-foreground sm:text-3xl font-heading">
              Browse Categories
            </h2>
          </div>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <Link to={ROUTE_PATHS.STOREFRONT.CATEGORIES}>
              View All <ArrowRight size={14} />
            </Link>
          </Button>
        </div>

        {isLoadingCategories ? (
          <LoadingState message="Loading categories..." />
        ) : isErrorCategories ? (
          <ErrorState
            title="Failed to load categories"
            message="Could not load the categories at this time."
            onRetry={refetchCategories}
          />
        ) : categories.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground py-8">
            No categories available right now.
          </p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5 sm:gap-3">
            {categories.slice(0, 8).map((cat, index) => (
              <CategoryCard
                key={cat.id || cat.slug}
                category={cat}
                index={index}
              />
            ))}
          </div>
        )}
      </section>

      {/* 3. Featured / Trending Products Section */}
      <section>
        <div className="flex items-end justify-between mb-6">
          <div>
            <Badge
              variant="outline"
              className="gap-1.5 border-chart-2/30 bg-chart-2/15 text-chart-2 font-bold uppercase tracking-wider text-[11px] px-2.5 py-0.5"
            >
              <TrendingUp size={12} className="stroke-[2.5]" />
              <span>Popular Picks</span>
            </Badge>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-foreground sm:text-3xl font-heading">
              Trending Products
            </h2>
          </div>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <Link to={ROUTE_PATHS.STOREFRONT.PRODUCTS}>
              Explore More <ArrowRight size={14} />
            </Link>
          </Button>
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
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {products.map((prod) => (
              <ProductCard key={prod.id || prod.slug} product={prod} />
            ))}
          </div>
        )}
      </section>

      {/* 4. Merchant CTA Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-primary/25 bg-gradient-to-r from-primary/10 via-chart-2/10 to-chart-4/10 p-8 sm:p-12 text-foreground shadow-sm">
        <div className="relative z-10 flex flex-col items-center justify-between gap-6 text-center md:flex-row md:text-left">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground shadow-xs">
              <Store size={14} />
              <span>Seller Onboarding Open</span>
            </div>
            <h3 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl text-foreground font-heading">
              Grow your business with Galla.
            </h3>
            <p className="mt-2 text-sm sm:text-base font-medium text-muted-foreground">
              Join hundreds of verified merchants. List your products, accept orders with automated delivery tracking, and receive prompt payouts.
            </p>
          </div>

          <Button
            asChild
            size="lg"
            className="bg-primary text-primary-foreground font-bold hover:bg-primary/90 shadow-md shadow-primary/20 shrink-0"
          >
            <Link to={ROUTE_PATHS.SELLER.APPLICATION}>
              Apply to Sell <ArrowRight size={17} className="ml-1" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
};

export default HomePage;

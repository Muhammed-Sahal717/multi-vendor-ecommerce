import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Sparkles, TrendingUp, Store } from 'lucide-react';
import { HeroBanner } from '../components/HeroBanner.jsx';
import { CategoryCard } from '../components/CategoryCard.jsx';
import { ProductCard } from '../components/ProductCard.jsx';
import { LoadingState } from '../../../components/shared/LoadingState.jsx';
import { ErrorState } from '../../../components/shared/ErrorState.jsx';
import { Button } from '../../../components/ui/button.jsx';
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
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-600">
              <Sparkles size={14} />
              <span>Explore Collections</span>
            </div>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
              Browse Categories
            </h2>
          </div>
          <Button asChild variant="ghost" size="sm" className="gap-1 font-semibold text-neutral-600 hover:text-neutral-900">
            <Link to={ROUTE_PATHS.STOREFRONT.CATEGORIES}>
              View All <ArrowRight size={16} />
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
          <p className="text-center text-sm text-neutral-400 py-8">
            No categories available right now.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {categories.slice(0, 6).map((cat) => (
              <CategoryCard key={cat.id || cat.slug} category={cat} />
            ))}
          </div>
        )}
      </section>

      {/* 3. Featured / Trending Products Section */}
      <section>
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-600">
              <TrendingUp size={14} />
              <span>Popular Picks</span>
            </div>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
              Trending Products
            </h2>
          </div>
          <Button asChild variant="ghost" size="sm" className="gap-1 font-semibold text-neutral-600 hover:text-neutral-900">
            <Link to={ROUTE_PATHS.STOREFRONT.PRODUCTS}>
              Explore More <ArrowRight size={16} />
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
          <div className="rounded-2xl border border-dashed border-neutral-200 p-12 text-center text-neutral-500">
            <p className="text-base font-semibold text-neutral-700">No products published yet</p>
            <p className="mt-1 text-sm text-neutral-400">Be the first seller to list an item on Galla!</p>
            <Button asChild size="sm" className="mt-4 bg-neutral-900">
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
      <section className="relative overflow-hidden rounded-3xl bg-amber-500 p-8 sm:p-12 text-neutral-950">
        <div className="relative z-10 flex flex-col items-center justify-between gap-6 text-center md:flex-row md:text-left">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-neutral-950 px-3 py-1 text-xs font-bold text-amber-400">
              <Store size={14} />
              <span>Seller Onboarding Open</span>
            </div>
            <h3 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl text-neutral-950">
              Grow your business with Galla.
            </h3>
            <p className="mt-2 text-sm sm:text-base font-medium text-neutral-800">
              Join hundreds of verified merchants. List your products, accept orders with automated delivery tracking, and receive prompt payouts.
            </p>
          </div>

          <Button
            asChild
            size="lg"
            className="bg-neutral-950 text-white font-bold hover:bg-neutral-900 shrink-0"
          >
            <Link to={ROUTE_PATHS.SELLER.APPLICATION}>
              Apply to Sell <ArrowRight size={18} className="ml-1" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
};

export default HomePage;

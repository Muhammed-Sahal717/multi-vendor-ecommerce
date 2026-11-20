import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { catalogService } from '../services/catalogService.js';
import { queryKeys } from '../../../lib/queryClient.js';
import { CategoryCard } from '../components/CategoryCard.jsx';
import { LoadingState } from '../../../components/shared/LoadingState.jsx';
import { ErrorState } from '../../../components/shared/ErrorState.jsx';
import { ROUTE_PATHS } from '../../../routes/routePaths.js';

export const CategoriesPage = () => {
  const {
    data: categoriesData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.catalog.categories(),
    queryFn: catalogService.getCategories,
  });

  const categories = Array.isArray(categoriesData)
    ? categoriesData
    : categoriesData?.results || [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-10">
      {/* Breadcrumbs Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Link to={ROUTE_PATHS.STOREFRONT.HOME} className="hover:text-primary transition-colors">
          Home
        </Link>
        <span>/</span>
        <span className="text-foreground font-semibold">Categories</span>
      </nav>

      {/* Centered Minimal Header */}
      <div className="text-center max-w-2xl mx-auto space-y-2.5">
        <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl lg:text-4xl font-heading">
          Explore Categories
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Discover authentic handcrafted items and modern essentials across all verified departments.
        </p>
      </div>

      {isLoading ? (
        <LoadingState message="Loading categories..." />
      ) : isError ? (
        <ErrorState
          title="Failed to load categories"
          message="Could not retrieve store categories. Please check your connection."
          onRetry={refetch}
        />
      ) : categories.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <p className="text-sm font-medium text-muted-foreground">No categories found in the catalog.</p>
          <Link
            to={ROUTE_PATHS.STOREFRONT.PRODUCTS}
            className="inline-block text-xs font-semibold text-primary hover:underline"
          >
            Explore all products instead
          </Link>
        </div>
      ) : (
        <div className="rounded-3xl border border-border/60 bg-card/60 p-6 sm:p-8 md:p-10 shadow-2xs backdrop-blur-xs">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-y-8 gap-x-4 sm:gap-x-6 justify-items-center">
            {categories.map((cat, idx) => (
              <CategoryCard key={cat.id || cat.slug} category={cat} index={idx} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoriesPage;

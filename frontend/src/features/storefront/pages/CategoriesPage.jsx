import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Layers } from 'lucide-react';
import { catalogService } from '../services/catalogService.js';
import { queryKeys } from '../../../lib/queryClient.js';
import { CategoryCard } from '../components/CategoryCard.jsx';
import { LoadingState } from '../../../components/shared/LoadingState.jsx';
import { ErrorState } from '../../../components/shared/ErrorState.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Breadcrumbs & Header */}
      <div>
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Link to={ROUTE_PATHS.STOREFRONT.HOME} className="hover:text-primary transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="text-foreground font-semibold">Categories</span>
        </nav>

        <div className="mt-3">
          <Badge
            variant="outline"
            className="gap-1.5 border-primary/25 bg-primary/10 text-primary font-bold uppercase tracking-wider text-[11px] px-2.5 py-0.5"
          >
            <Layers size={12} className="stroke-[2.5]" />
            <span>Store Taxonomy</span>
          </Badge>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-foreground sm:text-3xl font-heading">
            All Product Categories
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Browse our wide selection of regional and specialty merchandise.
          </p>
        </div>
      </div>

      {isLoading ? (
        <LoadingState message="Loading catalog categories..." />
      ) : isError ? (
        <ErrorState
          title="Failed to load categories"
          message="Could not retrieve store categories. Please check your connection."
          onRetry={refetch}
        />
      ) : categories.length === 0 ? (
        <p className="text-center text-xs text-muted-foreground py-12">
          No categories found.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
          {categories.map((cat, idx) => (
            <CategoryCard key={cat.id || cat.slug} category={cat} index={idx} />
          ))}
        </div>
      )}
    </div>
  );
};

export default CategoriesPage;

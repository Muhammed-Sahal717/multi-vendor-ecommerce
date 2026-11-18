import { useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  SlidersHorizontal,
  X,
  ArrowUpDown,
  Search,
  Filter,
  Layers,
  ChevronDown,
  Check,
} from 'lucide-react';
import { catalogService } from '../services/catalogService.js';
import { queryKeys } from '../../../lib/queryClient.js';
import { ProductCard } from '../components/ProductCard.jsx';
import { Pagination } from '../../../components/common/Pagination.jsx';
import { LoadingState } from '../../../components/shared/LoadingState.jsx';
import { ErrorState } from '../../../components/shared/ErrorState.jsx';
import { EmptyState } from '../../../components/shared/EmptyState.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Input } from '../../../components/ui/input.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { Card } from '../../../components/ui/card.jsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu.jsx';
import { ROUTE_PATHS } from '../../../routes/routePaths.js';

const SORT_OPTIONS = [
  { label: 'Newest Arrivals', value: '-created_at' },
  { label: 'Price: Low to High', value: 'price' },
  { label: 'Price: High to Low', value: '-price' },
  { label: 'Product Name (A-Z)', value: 'name' },
];

const PAGE_SIZE = 12;

export const ProductsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Extract query filters from URL
  const selectedCategory = searchParams.get('category') || '';
  const searchQuery = searchParams.get('search') || '';
  const minPriceParam = searchParams.get('min_price') || '';
  const maxPriceParam = searchParams.get('max_price') || '';
  const selectedOrdering = searchParams.get('ordering') || '-created_at';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  // Local price inputs
  const [minPriceInput, setMinPriceInput] = useState(minPriceParam);
  const [maxPriceInput, setMaxPriceInput] = useState(maxPriceParam);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Query object for API
  const queryParams = useMemo(() => {
    const params = {
      page: currentPage,
      page_size: PAGE_SIZE,
      ordering: selectedOrdering,
    };
    if (selectedCategory) params.category = selectedCategory;
    if (searchQuery) params.search = searchQuery;
    if (minPriceParam) params.min_price = minPriceParam;
    if (maxPriceParam) params.max_price = maxPriceParam;
    return params;
  }, [
    currentPage,
    selectedOrdering,
    selectedCategory,
    searchQuery,
    minPriceParam,
    maxPriceParam,
  ]);

  // 1. Fetch Categories for Filter Sidebar
  const { data: categoriesData } = useQuery({
    queryKey: queryKeys.catalog.categories(),
    queryFn: catalogService.getCategories,
  });

  const categories = Array.isArray(categoriesData)
    ? categoriesData
    : categoriesData?.results || [];

  // 2. Fetch Products with Active Filters
  const {
    data: productsData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.catalog.products(queryParams),
    queryFn: () => catalogService.getProducts(queryParams),
  });

  const products = Array.isArray(productsData)
    ? productsData
    : productsData?.results || [];

  const totalCount = productsData?.count || products.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Update query params helper
  const updateFilters = (newParams) => {
    const updated = new URLSearchParams(searchParams);

    Object.entries(newParams).forEach(([key, val]) => {
      if (val === undefined || val === null || val === '') {
        updated.delete(key);
      } else {
        updated.set(key, String(val));
      }
    });

    // Reset to page 1 on filter changes unless changing page itself
    if (!('page' in newParams)) {
      updated.set('page', '1');
    }

    setSearchParams(updated);
  };

  const handleApplyPriceFilter = (e) => {
    e.preventDefault();
    updateFilters({
      min_price: minPriceInput.trim(),
      max_price: maxPriceInput.trim(),
    });
  };

  const handleClearFilters = () => {
    setMinPriceInput('');
    setMaxPriceInput('');
    setSearchParams(new URLSearchParams());
  };

  // Find active category label
  const activeCategoryObj = categories.find((c) => c.slug === selectedCategory);
  const activeCategoryName = activeCategoryObj?.name || selectedCategory;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumbs & Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Link to={ROUTE_PATHS.STOREFRONT.HOME} className="hover:text-primary transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="text-foreground font-semibold">Products</span>
          {activeCategoryName && (
            <>
              <span>/</span>
              <span className="text-primary font-bold">{activeCategoryName}</span>
            </>
          )}
        </div>

        <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl font-heading">
              {activeCategoryName ? activeCategoryName : 'Explore Catalog'}
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Showing {products.length} of {totalCount} verified products
            </p>
          </div>

          {/* Top Sort & Mobile Filter Toggle */}
          <div className="flex items-center gap-2.5">
            {/* Mobile Filter Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMobileFilterOpen((prev) => !prev)}
              className="h-9 gap-1.5 lg:hidden text-xs font-semibold"
            >
              <SlidersHorizontal size={14} />
              <span>Filters</span>
            </Button>

            {/* Sort Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex h-9 items-center gap-2 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground shadow-2xs hover:border-primary/40 hover:bg-muted/40 focus:outline-none transition-all cursor-pointer">
                <ArrowUpDown size={13} className="text-muted-foreground" />
                <span>{(SORT_OPTIONS.find((opt) => opt.value === selectedOrdering) || SORT_OPTIONS[0]).label}</span>
                <ChevronDown size={14} className="text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 p-1.5 rounded-xl border border-border bg-card shadow-lg">
                <DropdownMenuGroup>
                  {SORT_OPTIONS.map((opt) => {
                    const isSelected = selectedOrdering === opt.value;
                    return (
                      <DropdownMenuItem
                        key={opt.value}
                        onClick={() => updateFilters({ ordering: opt.value })}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                          isSelected ? 'bg-primary/10 text-primary font-bold' : 'text-foreground hover:bg-muted/50'
                        }`}
                      >
                        <span>{opt.label}</span>
                        {isSelected && <Check size={14} className="text-primary stroke-[2.5]" />}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Active Filter Chips */}
        {(selectedCategory || searchQuery || minPriceParam || maxPriceParam) && (
          <div className="mt-4 flex flex-wrap items-center gap-2 pt-2 border-t border-border">
            <span className="text-xs font-semibold text-muted-foreground">Active:</span>

            {selectedCategory && (
              <Badge
                variant="outline"
                className="gap-1 border-primary/25 bg-primary/10 text-primary text-xs pl-2.5 pr-1.5 py-1"
              >
                <span>Category: {activeCategoryName}</span>
                <button
                  type="button"
                  onClick={() => updateFilters({ category: '' })}
                  className="rounded-full hover:bg-primary/20 p-0.5"
                >
                  <X size={12} />
                </button>
              </Badge>
            )}

            {searchQuery && (
              <Badge
                variant="outline"
                className="gap-1 border-chart-2/30 bg-chart-2/15 text-chart-2 text-xs pl-2.5 pr-1.5 py-1"
              >
                <span>Search: &ldquo;{searchQuery}&rdquo;</span>
                <button
                  type="button"
                  onClick={() => updateFilters({ search: '' })}
                  className="rounded-full hover:bg-chart-2/25 p-0.5"
                >
                  <X size={12} />
                </button>
              </Badge>
            )}

            {(minPriceParam || maxPriceParam) && (
              <Badge
                variant="outline"
                className="gap-1 border-chart-5/30 bg-chart-5/15 text-chart-5 text-xs pl-2.5 pr-1.5 py-1"
              >
                <span>
                  Price: ₹{minPriceParam || '0'} - ₹{maxPriceParam || '∞'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setMinPriceInput('');
                    setMaxPriceInput('');
                    updateFilters({ min_price: '', max_price: '' });
                  }}
                  className="rounded-full hover:bg-chart-5/25 p-0.5"
                >
                  <X size={12} />
                </button>
              </Badge>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="h-6 px-2 text-[11px] font-semibold text-muted-foreground hover:text-destructive"
            >
              Clear All
            </Button>
          </div>
        )}
      </div>

      {/* Main Grid: Sidebar + Product Listings */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
        {/* Desktop Filter Sidebar (and Mobile collapsible) */}
        <aside
          className={`space-y-6 lg:block ${
            mobileFilterOpen ? 'block' : 'hidden'
          }`}
        >
          {/* Categories Filter Card */}
          <Card className="rounded-2xl border-border bg-card p-4 shadow-2xs">
            <div className="flex items-center gap-2 mb-3 text-xs font-bold text-foreground uppercase tracking-wider">
              <Layers size={14} className="text-primary" />
              <span>Categories</span>
            </div>

            <div className="space-y-1">
              <button
                type="button"
                onClick={() => updateFilters({ category: '' })}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  !selectedCategory
                    ? 'bg-primary text-primary-foreground font-bold shadow-2xs'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                All Categories
              </button>

              {categories.map((cat) => {
                const isSelected = selectedCategory === cat.slug;
                return (
                  <button
                    key={cat.id || cat.slug}
                    type="button"
                    onClick={() => updateFilters({ category: cat.slug })}
                    className={`flex items-center justify-between w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isSelected
                        ? 'bg-primary text-primary-foreground font-bold shadow-2xs'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    }`}
                  >
                    <span className="truncate">{cat.name}</span>
                    {cat.product_count !== undefined && (
                      <span className={`text-[10px] ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground/60'}`}>
                        {cat.product_count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Price Range Filter Card */}
          <Card className="rounded-2xl border-border bg-card p-4 shadow-2xs">
            <div className="flex items-center gap-2 mb-3 text-xs font-bold text-foreground uppercase tracking-wider">
              <Filter size={14} className="text-chart-2" />
              <span>Price Range (₹)</span>
            </div>

            <form onSubmit={handleApplyPriceFilter} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="min-price-input" className="text-[10px] font-semibold text-muted-foreground block mb-1">
                    Min
                  </label>
                  <Input
                    id="min-price-input"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={minPriceInput}
                    onChange={(e) => setMinPriceInput(e.target.value)}
                    className="h-8 text-xs rounded-lg border-input bg-background/50"
                  />
                </div>
                <div>
                  <label htmlFor="max-price-input" className="text-[10px] font-semibold text-muted-foreground block mb-1">
                    Max
                  </label>
                  <Input
                    id="max-price-input"
                    type="number"
                    min="0"
                    placeholder="5000"
                    value={maxPriceInput}
                    onChange={(e) => setMaxPriceInput(e.target.value)}
                    className="h-8 text-xs rounded-lg border-input bg-background/50"
                  />
                </div>
              </div>

              <Button
                type="submit"
                size="sm"
                className="w-full h-8 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Apply Price
              </Button>
            </form>
          </Card>
        </aside>

        {/* Product Cards Grid Area */}
        <main className="lg:col-span-3 space-y-8">
          {isLoading ? (
            <LoadingState message="Loading catalog products..." />
          ) : isError ? (
            <ErrorState
              title="Failed to load products"
              message="Could not load the products for this selection."
              onRetry={refetch}
            />
          ) : products.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No products match your filters"
              description="Try adjusting your category, price range, or search keyword."
              actionLabel="Reset All Filters"
              onAction={handleClearFilters}
            />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3">
                {products.map((product) => (
                  <ProductCard key={product.id || product.slug} product={product} />
                ))}
              </div>

              {/* Pagination */}
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(p) => updateFilters({ page: p })}
                className="pt-6 border-t border-border"
              />
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default ProductsPage;

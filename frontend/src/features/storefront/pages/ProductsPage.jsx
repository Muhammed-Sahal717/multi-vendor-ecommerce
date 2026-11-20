import { useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  SlidersHorizontal,
  X,
  ArrowUpDown,
  Search,
  ChevronDown,
  Check,
  RotateCcw,
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
  const hasActiveFilters = Boolean(selectedCategory || searchQuery || minPriceParam || maxPriceParam);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Breadcrumbs Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
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
      </nav>

      {/* Page Header with Minimal Clean Title and Action Controls */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end border-b border-border/60 pb-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl lg:text-4xl font-heading">
            {activeCategoryName ? activeCategoryName : 'Explore Catalog'}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Showing {products.length} of {totalCount} verified items
          </p>
        </div>

        {/* Top Sort & Mobile Filter Toggle */}
        <div className="flex items-center gap-2.5">
          {/* Mobile Filter Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMobileFilterOpen((prev) => !prev)}
            className="h-9 gap-1.5 rounded-full border-border/80 px-3.5 text-xs font-semibold lg:hidden cursor-pointer"
          >
            <SlidersHorizontal size={14} />
            <span>Filters {hasActiveFilters && '•'}</span>
          </Button>

          {/* Sort Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex h-9 items-center gap-2 rounded-full border border-border/80 bg-card px-4 text-xs font-semibold text-foreground shadow-2xs hover:border-primary/40 hover:bg-muted/30 focus:outline-none transition-all cursor-pointer">
              <ArrowUpDown size={13} className="text-muted-foreground" />
              <span>{(SORT_OPTIONS.find((opt) => opt.value === selectedOrdering) || SORT_OPTIONS[0]).label}</span>
              <ChevronDown size={13} className="text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 p-1.5 rounded-2xl border border-border/80 bg-card shadow-lg">
              <DropdownMenuGroup>
                {SORT_OPTIONS.map((opt) => {
                  const isSelected = selectedOrdering === opt.value;
                  return (
                    <DropdownMenuItem
                      key={opt.value}
                      onClick={() => updateFilters({ ordering: opt.value })}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
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

      {/* Horizontal Category Quick-Pills for One-Tap Category Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => updateFilters({ category: '' })}
          className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
            !selectedCategory
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'border border-border/80 bg-card text-muted-foreground hover:text-foreground hover:border-primary/40'
          }`}
        >
          All
        </button>
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.slug;
          return (
            <button
              key={cat.id || cat.slug}
              type="button"
              onClick={() => updateFilters({ category: cat.slug })}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                isSelected
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'border border-border/80 bg-card text-muted-foreground hover:text-foreground hover:border-primary/40'
              }`}
            >
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* Active Filter Chips (Clean & Minimal without loud multi-colored badges) */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-semibold text-muted-foreground">Filters:</span>

          {selectedCategory && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card px-3 py-1 text-xs font-medium text-foreground shadow-2xs">
              <span>{activeCategoryName}</span>
              <button
                type="button"
                onClick={() => updateFilters({ category: '' })}
                className="rounded-full text-muted-foreground hover:text-foreground"
                aria-label="Remove category filter"
              >
                <X size={12} />
              </button>
            </span>
          )}

          {searchQuery && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card px-3 py-1 text-xs font-medium text-foreground shadow-2xs">
              <span>&ldquo;{searchQuery}&rdquo;</span>
              <button
                type="button"
                onClick={() => updateFilters({ search: '' })}
                className="rounded-full text-muted-foreground hover:text-foreground"
                aria-label="Remove search filter"
              >
                <X size={12} />
              </button>
            </span>
          )}

          {(minPriceParam || maxPriceParam) && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card px-3 py-1 text-xs font-medium text-foreground shadow-2xs">
              <span>₹{minPriceParam || '0'} – ₹{maxPriceParam || '∞'}</span>
              <button
                type="button"
                onClick={() => {
                  setMinPriceInput('');
                  setMaxPriceInput('');
                  updateFilters({ min_price: '', max_price: '' });
                }}
                className="rounded-full text-muted-foreground hover:text-foreground"
                aria-label="Remove price filter"
              >
                <X size={12} />
              </button>
            </span>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="h-7 px-2.5 text-xs font-semibold text-muted-foreground hover:text-destructive gap-1"
          >
            <RotateCcw size={12} />
            <span>Reset</span>
          </Button>
        </div>
      )}

      {/* Main Grid: Sidebar + Product Listings */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-4 pt-2">
        {/* Desktop Filter Sidebar & Mobile Drawer */}
        <aside
          className={`space-y-6 lg:block ${
            mobileFilterOpen
              ? 'fixed inset-0 z-50 overflow-y-auto bg-background/80 backdrop-blur-md p-6 lg:static lg:p-0 lg:bg-transparent lg:backdrop-blur-none'
              : 'hidden'
          }`}
        >
          {/* Mobile drawer header */}
          <div className="flex items-center justify-between pb-4 border-b border-border lg:hidden">
            <h3 className="text-base font-bold text-foreground">Filters</h3>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setMobileFilterOpen(false)}
              className="rounded-full"
            >
              <X size={18} />
            </Button>
          </div>

          {/* Categories Filter Card */}
          <Card className="rounded-2xl border-border/80 bg-card p-4 shadow-2xs">
            <span className="block mb-3 text-xs font-bold text-foreground uppercase tracking-wider">
              Categories
            </span>

            <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
              <button
                type="button"
                onClick={() => {
                  updateFilters({ category: '' });
                  setMobileFilterOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
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
                    onClick={() => {
                      updateFilters({ category: cat.slug });
                      setMobileFilterOpen(false);
                    }}
                    className={`flex items-center justify-between w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
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
          <Card className="rounded-2xl border-border/80 bg-card p-4 shadow-2xs">
            <span className="block mb-3 text-xs font-bold text-foreground uppercase tracking-wider">
              Price Range (₹)
            </span>

            <form
              onSubmit={(e) => {
                handleApplyPriceFilter(e);
                setMobileFilterOpen(false);
              }}
              className="space-y-3"
            >
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
                    className="h-8 text-xs rounded-xl border-border/80 bg-background/50"
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
                    className="h-8 text-xs rounded-xl border-border/80 bg-background/50"
                  />
                </div>
              </div>

              <Button
                type="submit"
                size="sm"
                className="w-full h-8 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-xs"
              >
                Apply Price
              </Button>
            </form>
          </Card>

          {/* Mobile Close / Done button */}
          <div className="pt-2 lg:hidden">
            <Button
              type="button"
              onClick={() => setMobileFilterOpen(false)}
              className="w-full h-10 rounded-xl font-bold bg-secondary text-secondary-foreground"
            >
              Done
            </Button>
          </div>
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
              {/* Product Cards Grid matching Homepage compact sizing */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 sm:gap-4 md:gap-5">
                {products.map((product, index) => (
                  <ProductCard key={product.id || product.slug} product={product} index={index} />
                ))}
              </div>

              {/* Pagination */}
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(p) => updateFilters({ page: p })}
                className="pt-6 border-t border-border/60"
              />
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default ProductsPage;

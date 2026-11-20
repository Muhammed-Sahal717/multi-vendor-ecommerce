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
  Sparkles,
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

const PRICE_PRESETS = [
  { label: 'Under ₹500', min: '', max: '500' },
  { label: '₹500 – ₹1,500', min: '500', max: '1500' },
  { label: '₹1,500 – ₹5,000', min: '1500', max: '5000' },
  { label: 'Above ₹5,000', min: '5000', max: '' },
];

const PAGE_SIZE = 15;

export const ProductsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Extract query filters from URL
  const selectedCategory = searchParams.get('category') || '';
  const searchQuery = searchParams.get('search') || '';
  const minPriceParam = searchParams.get('min_price') || '';
  const maxPriceParam = searchParams.get('max_price') || '';
  const selectedOrdering = searchParams.get('ordering') || '-created_at';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  // Local filter states
  const [minPriceInput, setMinPriceInput] = useState(minPriceParam);
  const [maxPriceInput, setMaxPriceInput] = useState(maxPriceParam);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

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

  // 1. Fetch Categories
  const { data: categoriesData } = useQuery({
    queryKey: queryKeys.catalog.categories(),
    queryFn: catalogService.getCategories,
  });

  const categories = Array.isArray(categoriesData)
    ? categoriesData
    : categoriesData?.results || [];

  // 2. Fetch Products
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

    if (!('page' in newParams)) {
      updated.set('page', '1');
    }

    setSearchParams(updated);
  };

  const handleApplyCustomPrice = (e) => {
    e.preventDefault();
    updateFilters({
      min_price: minPriceInput.trim(),
      max_price: maxPriceInput.trim(),
    });
    setIsFilterDrawerOpen(false);
  };

  const handleApplyPresetPrice = (min, max) => {
    setMinPriceInput(min);
    setMaxPriceInput(max);
    updateFilters({
      min_price: min,
      max_price: max,
    });
    setIsFilterDrawerOpen(false);
  };

  const handleClearFilters = () => {
    setMinPriceInput('');
    setMaxPriceInput('');
    setSearchParams(new URLSearchParams());
    setIsFilterDrawerOpen(false);
  };

  // Find active category label
  const activeCategoryObj = categories.find((c) => c.slug === selectedCategory);
  const activeCategoryName = activeCategoryObj?.name || selectedCategory;

  // Count how many active filters
  const activeFilterCount = [
    Boolean(selectedCategory),
    Boolean(searchQuery),
    Boolean(minPriceParam || maxPriceParam),
  ].filter(Boolean).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8 space-y-5">
      {/* Breadcrumb Row */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Link to={ROUTE_PATHS.STOREFRONT.HOME} className="hover:text-primary transition-colors">
          Home
        </Link>
        <span>/</span>
        <span className={activeCategoryName ? 'text-muted-foreground' : 'text-foreground font-semibold'}>
          Products
        </span>
        {activeCategoryName && (
          <>
            <span>/</span>
            <span className="text-foreground font-semibold">{activeCategoryName}</span>
          </>
        )}
      </nav>

      {/* Modern Horizontal Category Carousel & Filter Action Bar */}
      <div className="space-y-3.5">
        {/* Category Quick Pills */}
        <div className="relative flex items-center">
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none scroll-smooth w-full">
            <button
              type="button"
              onClick={() => updateFilters({ category: '' })}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                !selectedCategory
                  ? 'bg-foreground text-background shadow-xs font-bold'
                  : 'border border-border/80 bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground'
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
                  onClick={() => updateFilters({ category: isSelected ? '' : cat.slug })}
                  className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-primary text-primary-foreground shadow-xs font-bold'
                      : 'border border-border/80 bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Toolbar: Filter Trigger, Active Count, Sort Dropdown */}
        <div className="flex items-center justify-between gap-3 border-y border-border/60 py-3">
          {/* Left Action Buttons */}
          <div className="flex items-center gap-2.5">
            {/* Filter Drawer Trigger Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFilterDrawerOpen(true)}
              className={`h-9 gap-2 rounded-full border px-4 text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
                activeFilterCount > 0
                  ? 'border-primary/50 bg-primary/10 text-primary font-bold'
                  : 'border-border/80 bg-card text-foreground hover:border-primary/40'
              }`}
            >
              <SlidersHorizontal size={14} />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </Button>

            {/* Quick Reset if filters active */}
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="hidden sm:inline-flex h-9 gap-1.5 rounded-full px-3 text-xs font-medium text-muted-foreground hover:text-destructive cursor-pointer"
              >
                <RotateCcw size={13} />
                <span>Reset</span>
              </Button>
            )}
          </div>

          {/* Right Action: Sort Menu */}
          <div className="flex items-center gap-3">
            {/* Sort Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex h-9 items-center gap-2 rounded-full border border-border/80 bg-card px-3.5 sm:px-4 text-xs font-semibold text-foreground shadow-2xs hover:border-primary/40 hover:bg-muted/30 focus:outline-none transition-all cursor-pointer">
                <ArrowUpDown size={13} className="text-muted-foreground" />
                <span className="truncate max-w-[130px] sm:max-w-none">
                  {(SORT_OPTIONS.find((opt) => opt.value === selectedOrdering) || SORT_OPTIONS[0]).label}
                </span>
                <ChevronDown size={14} className="text-muted-foreground shrink-0" />
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

        {/* Active Filter Chips Row */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            {selectedCategory && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card px-3 py-1 text-xs font-medium text-foreground shadow-2xs">
                <span>Category: <strong className="font-bold">{activeCategoryName}</strong></span>
                <button
                  type="button"
                  onClick={() => updateFilters({ category: '' })}
                  className="rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
                  aria-label="Remove category filter"
                >
                  <X size={13} />
                </button>
              </span>
            )}

            {searchQuery && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card px-3 py-1 text-xs font-medium text-foreground shadow-2xs">
                <span>Keyword: <strong className="font-bold">&ldquo;{searchQuery}&rdquo;</strong></span>
                <button
                  type="button"
                  onClick={() => updateFilters({ search: '' })}
                  className="rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
                  aria-label="Remove search filter"
                >
                  <X size={13} />
                </button>
              </span>
            )}

            {(minPriceParam || maxPriceParam) && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card px-3 py-1 text-xs font-medium text-foreground shadow-2xs">
                <span>Price: <strong className="font-bold">₹{minPriceParam || '0'} – ₹{maxPriceParam || '∞'}</strong></span>
                <button
                  type="button"
                  onClick={() => {
                    setMinPriceInput('');
                    setMaxPriceInput('');
                    updateFilters({ min_price: '', max_price: '' });
                  }}
                  className="rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
                  aria-label="Remove price filter"
                >
                  <X size={13} />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={handleClearFilters}
              className="text-xs font-semibold text-muted-foreground hover:text-destructive underline-offset-4 hover:underline ml-1 cursor-pointer"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Full-Width Responsive Products Grid Area */}
      <main className="space-y-8 pt-2">
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
            title="No products found"
            description="Try selecting a different category or clearing your active filters."
            actionLabel="Reset All Filters"
            onAction={handleClearFilters}
          />
        ) : (
          <>
            {/* Fluid, Full-Width Responsive Grid: 2-cols mobile, 3-cols tablet, 4-cols laptop, 5-cols desktop */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-4 md:gap-5">
              {products.map((product) => (
                <ProductCard key={product.id || product.slug} product={product} />
              ))}
            </div>

            {/* Pagination Controls */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(p) => updateFilters({ page: p })}
              className="pt-8 border-t border-border/60"
            />
          </>
        )}
      </main>

      {/* Modern Slide-Over Filter Drawer (Works on Mobile, Tablet & Desktop) */}
      {isFilterDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
            onClick={() => setIsFilterDrawerOpen(false)}
          />

          {/* Drawer Sheet */}
          <div className="relative z-10 flex h-full w-full max-w-sm flex-col bg-card shadow-2xl border-l border-border/80 p-6 overflow-y-auto animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 border-b border-border/60">
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={16} className="text-primary" />
                <h3 className="text-base font-bold text-foreground">Filter Catalog</h3>
              </div>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setIsFilterDrawerOpen(false)}
                className="rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X size={18} />
              </Button>
            </div>

            {/* Filter Content */}
            <div className="space-y-6 py-5 flex-1">
              {/* Categories Section */}
              <div className="space-y-3">
                <span className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Department
                </span>

                <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                  <button
                    type="button"
                    onClick={() => {
                      updateFilters({ category: '' });
                      setIsFilterDrawerOpen(false);
                    }}
                    className={`flex items-center justify-between w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                      !selectedCategory
                        ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    }`}
                  >
                    <span>All Departments</span>
                    {!selectedCategory && <Check size={14} className="stroke-[2.5]" />}
                  </button>

                  {categories.map((cat) => {
                    const isSelected = selectedCategory === cat.slug;
                    return (
                      <button
                        key={cat.id || cat.slug}
                        type="button"
                        onClick={() => {
                          updateFilters({ category: isSelected ? '' : cat.slug });
                          setIsFilterDrawerOpen(false);
                        }}
                        className={`flex items-center justify-between w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                        }`}
                      >
                        <span className="truncate">{cat.name}</span>
                        {isSelected ? (
                          <Check size={14} className="stroke-[2.5]" />
                        ) : cat.product_count !== undefined ? (
                          <span className="text-[10px] text-muted-foreground/60">{cat.product_count}</span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Price Presets */}
              <div className="space-y-3 border-t border-border/60 pt-5">
                <span className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Price Range
                </span>

                <div className="grid grid-cols-2 gap-2">
                  {PRICE_PRESETS.map((preset) => {
                    const isCurrent = minPriceParam === preset.min && maxPriceParam === preset.max;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => handleApplyPresetPrice(preset.min, preset.max)}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold text-center transition-all cursor-pointer border ${
                          isCurrent
                            ? 'border-primary bg-primary/10 text-primary font-bold'
                            : 'border-border/80 bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Min/Max Input */}
                <form onSubmit={handleApplyCustomPrice} className="space-y-3 pt-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="drawer-min-price" className="text-[10px] font-semibold text-muted-foreground block mb-1">
                        Min (₹)
                      </label>
                      <Input
                        id="drawer-min-price"
                        type="number"
                        min="0"
                        placeholder="0"
                        value={minPriceInput}
                        onChange={(e) => setMinPriceInput(e.target.value)}
                        className="h-8 text-xs rounded-xl border-border/80 bg-background"
                      />
                    </div>
                    <div>
                      <label htmlFor="drawer-max-price" className="text-[10px] font-semibold text-muted-foreground block mb-1">
                        Max (₹)
                      </label>
                      <Input
                        id="drawer-max-price"
                        type="number"
                        min="0"
                        placeholder="10000"
                        value={maxPriceInput}
                        onChange={(e) => setMaxPriceInput(e.target.value)}
                        className="h-8 text-xs rounded-xl border-border/80 bg-background"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    size="sm"
                    className="w-full h-8 text-xs font-bold rounded-xl bg-foreground text-background hover:bg-foreground/90 cursor-pointer shadow-xs"
                  >
                    Set Custom Range
                  </Button>
                </form>
              </div>
            </div>

            {/* Drawer Bottom Actions */}
            <div className="border-t border-border/60 pt-4 flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClearFilters}
                className="flex-1 h-10 rounded-xl text-xs font-bold border-border/80 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Reset
              </Button>
              <Button
                type="button"
                onClick={() => setIsFilterDrawerOpen(false)}
                className="flex-1 h-10 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-md shadow-primary/20"
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { ROUTE_PATHS } from '../../routes/routePaths.js';

export const SearchInput = ({
  placeholder = 'Search products, brands, categories...',
  defaultValue = '',
  className = '',
  onSearch,
}) => {
  const [query, setQuery] = useState(defaultValue);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (onSearch) {
      onSearch(trimmed);
    } else {
      navigate(`${ROUTE_PATHS.STOREFRONT.PRODUCTS}?search=${encodeURIComponent(trimmed)}`);
    }
  };

  const handleClear = () => {
    setQuery('');
    if (onSearch) {
      onSearch('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`relative flex items-center ${className}`}>
      <Search
        size={18}
        className="pointer-events-none absolute left-3 text-neutral-400"
      />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-full border border-neutral-200 bg-neutral-50 pl-10 pr-9 text-sm text-neutral-900 transition-colors placeholder:text-neutral-400 focus:border-neutral-900 focus:bg-white focus:outline-none"
      />
      {query && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 text-neutral-400 hover:text-neutral-600"
        >
          <X size={16} />
        </button>
      )}
    </form>
  );
};

export default SearchInput;

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/button.jsx';

export const Pagination = ({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  className = '',
}) => {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const delta = 1;
    const range = [];
    const rangeWithDots = [];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return Array.from(new Set(rangeWithDots));
  };

  const pages = getPageNumbers();

  return (
    <nav
      role="navigation"
      aria-label="pagination"
      className={`flex items-center justify-center gap-1.5 ${className}`}
    >
      {/* Previous Button */}
      <Button
        variant="outline"
        size="sm"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        className="h-8 gap-1 px-2.5 text-xs font-semibold"
        aria-label="Go to previous page"
      >
        <ChevronLeft size={14} />
        <span className="hidden sm:inline">Previous</span>
      </Button>

      {/* Numbered Page Buttons */}
      <div className="flex items-center gap-1">
        {pages.map((p, idx) => {
          if (p === '...') {
            return (
              <span
                key={`dots-${idx}`}
                className="flex h-8 w-8 items-center justify-center text-xs text-muted-foreground"
              >
                ...
              </span>
            );
          }

          const isCurrent = p === currentPage;

          return (
            <Button
              key={p}
              size="sm"
              variant={isCurrent ? 'default' : 'outline'}
              onClick={() => onPageChange(p)}
              className={`h-8 w-8 p-0 text-xs font-semibold ${
                isCurrent
                  ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                  : 'hover:border-primary/40'
              }`}
              aria-current={isCurrent ? 'page' : undefined}
            >
              {p}
            </Button>
          );
        })}
      </div>

      {/* Next Button */}
      <Button
        variant="outline"
        size="sm"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className="h-8 gap-1 px-2.5 text-xs font-semibold"
        aria-label="Go to next page"
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight size={14} />
      </Button>
    </nav>
  );
};

export default Pagination;

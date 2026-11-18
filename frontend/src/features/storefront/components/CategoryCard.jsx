import { Link } from 'react-router-dom';
import { Layers, Sparkles, ShoppingBag, Tag, Star, Shirt, Heart, Laptop } from 'lucide-react';
import { Card } from '../../../components/ui/card.jsx';
import { ROUTE_PATHS } from '../../../routes/routePaths.js';
import { getMediaUrl } from '../../../lib/utils.js';

// Color themes based on index.css chart colors (Violet, Aqua, Coral, Lime, Amber)
const COLOR_VARIANTS = [
  {
    iconBg: 'bg-chart-1/10 text-chart-1 border-chart-1/25 group-hover:bg-chart-1 group-hover:text-primary-foreground',
    border: 'hover:border-chart-1/50 hover:shadow-chart-1/10',
    badge: 'text-chart-1 bg-chart-1/10',
    icon: Sparkles,
  },
  {
    iconBg: 'bg-chart-2/15 text-chart-2 border-chart-2/30 group-hover:bg-chart-2 group-hover:text-primary-foreground',
    border: 'hover:border-chart-2/50 hover:shadow-chart-2/10',
    badge: 'text-chart-2 bg-chart-2/10',
    icon: ShoppingBag,
  },
  {
    iconBg: 'bg-chart-3/12 text-chart-3 border-chart-3/25 group-hover:bg-chart-3 group-hover:text-primary-foreground',
    border: 'hover:border-chart-3/50 hover:shadow-chart-3/10',
    badge: 'text-chart-3 bg-chart-3/10',
    icon: Heart,
  },
  {
    iconBg: 'bg-chart-4/20 text-chart-4 border-chart-4/35 group-hover:bg-chart-4 group-hover:text-foreground',
    border: 'hover:border-chart-4/50 hover:shadow-chart-4/10',
    badge: 'text-foreground bg-chart-4/20',
    icon: Tag,
  },
  {
    iconBg: 'bg-chart-5/15 text-chart-5 border-chart-5/30 group-hover:bg-chart-5 group-hover:text-foreground',
    border: 'hover:border-chart-5/50 hover:shadow-chart-5/10',
    badge: 'text-chart-5 bg-chart-5/10',
    icon: Star,
  },
  {
    iconBg: 'bg-chart-1/10 text-chart-1 border-chart-1/25 group-hover:bg-chart-1 group-hover:text-primary-foreground',
    border: 'hover:border-chart-1/50 hover:shadow-chart-1/10',
    badge: 'text-chart-1 bg-chart-1/10',
    icon: Shirt,
  },
  {
    iconBg: 'bg-chart-2/15 text-chart-2 border-chart-2/30 group-hover:bg-chart-2 group-hover:text-primary-foreground',
    border: 'hover:border-chart-2/50 hover:shadow-chart-2/10',
    badge: 'text-chart-2 bg-chart-2/10',
    icon: Laptop,
  },
  {
    iconBg: 'bg-chart-3/12 text-chart-3 border-chart-3/25 group-hover:bg-chart-3 group-hover:text-primary-foreground',
    border: 'hover:border-chart-3/50 hover:shadow-chart-3/10',
    badge: 'text-chart-3 bg-chart-3/10',
    icon: Layers,
  },
];

export const CategoryCard = ({ category, index = 0 }) => {
  const { name, slug, image, product_count } = category || {};
  const imageUrl = getMediaUrl(image);

  // Deterministic color theme selection
  const theme = COLOR_VARIANTS[index % COLOR_VARIANTS.length];
  const FallbackIcon = theme.icon || Layers;

  return (
    <Link
      to={ROUTE_PATHS.STOREFRONT.CATEGORY_PRODUCTS(slug)}
      className="group block focus:outline-none"
    >
      <Card
        className={`flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-3 text-center transition-all duration-200 hover:-translate-y-1 hover:shadow-md ${theme.border}`}
      >
        {/* Little compact icon container */}
        <div
          className={`flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center overflow-hidden rounded-xl border transition-all duration-200 ${theme.iconBg}`}
        >
          {imageUrl ? (
            <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
          ) : (
            <FallbackIcon size={20} className="stroke-[2] transition-transform duration-200 group-hover:scale-110" />
          )}
        </div>

        {/* Category Name */}
        <h4 className="mt-2 text-xs font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1 w-full text-center">
          {name}
        </h4>

        {/* Item Count */}
        {product_count !== undefined && (
          <span className="mt-0.5 text-[10px] font-medium text-muted-foreground">
            {product_count} {product_count === 1 ? 'item' : 'items'}
          </span>
        )}
      </Card>
    </Link>
  );
};

export default CategoryCard;

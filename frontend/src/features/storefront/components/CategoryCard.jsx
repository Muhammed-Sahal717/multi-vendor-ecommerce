import { Link } from 'react-router-dom';
import {
  Monitor,
  UtensilsCrossed,
  Shirt,
  Headphones,
  Smartphone,
  Home,
  BookOpen,
  Sparkles,
  Gem,
  Palette,
  Footprints,
  Layers,
} from 'lucide-react';
import { ROUTE_PATHS } from '../../../routes/routePaths.js';
import { getMediaUrl } from '../../../lib/utils.js';

/**
 * Returns the matching icon element for a given category with dark foreground color.
 */
const renderCategoryIcon = (category) => {
  const text = `${category?.name || ''} ${category?.slug || ''}`.toLowerCase();
  const iconProps = {
    size: 20,
    className:
      'sm:w-5 sm:h-5 text-foreground stroke-[2.2] transition-transform duration-200 group-hover:scale-110 group-hover:text-primary',
  };

  // Electronics, tech, monitors, computers
  if (
    text.includes('electron') ||
    text.includes('gadget') ||
    text.includes('tech') ||
    text.includes('monitor') ||
    text.includes('computer')
  ) {
    return <Monitor {...iconProps} />;
  }

  // Audio & headphones
  if (
    text.includes('audio') ||
    text.includes('headphone') ||
    text.includes('earbud') ||
    text.includes('speaker')
  ) {
    return <Headphones {...iconProps} />;
  }

  // Smartphones & accessories
  if (text.includes('phone') || text.includes('mobile')) {
    return <Smartphone {...iconProps} />;
  }

  // Kitchen, cookware, dining, plates & knife
  if (
    text.includes('kitch') ||
    text.includes('cook') ||
    text.includes('plate') ||
    text.includes('knife') ||
    text.includes('cutler') ||
    text.includes('dining') ||
    text.includes('utensil') ||
    text.includes('food')
  ) {
    return <UtensilsCrossed {...iconProps} />;
  }

  // Fashion, apparel, shirts, sarees, kurtas
  if (
    text.includes('fashion') ||
    text.includes('apparel') ||
    text.includes('shirt') ||
    text.includes('cloth') ||
    text.includes('saree') ||
    text.includes('kurta') ||
    text.includes('ethnic') ||
    text.includes('wear')
  ) {
    return <Shirt {...iconProps} />;
  }

  // Footwear & shoes
  if (text.includes('shoe') || text.includes('footwear') || text.includes('sneaker')) {
    return <Footprints {...iconProps} />;
  }

  // Home decor, handicrafts & furniture
  if (
    text.includes('decor') ||
    text.includes('home') ||
    text.includes('living') ||
    text.includes('furnish')
  ) {
    return <Home {...iconProps} />;
  }

  // Books, literature, stationery & notebooks
  if (
    text.includes('book') ||
    text.includes('stationer') ||
    text.includes('journal') ||
    text.includes('notebook') ||
    text.includes('literature')
  ) {
    return <BookOpen {...iconProps} />;
  }

  // Beauty, wellness, ayurveda & care
  if (
    text.includes('beauty') ||
    text.includes('wellness') ||
    text.includes('ayurved') ||
    text.includes('care') ||
    text.includes('cosmetic')
  ) {
    return <Sparkles {...iconProps} />;
  }

  // Jewelry & accessories
  if (text.includes('jewel') || text.includes('gem') || text.includes('watch')) {
    return <Gem {...iconProps} />;
  }

  // Artisan craft & pottery
  if (text.includes('craft') || text.includes('artisan') || text.includes('pottery')) {
    return <Palette {...iconProps} />;
  }

  return <Layers {...iconProps} />;
};

export const CategoryCard = ({ category }) => {
  const { name, slug, image } = category || {};
  const imageUrl = getMediaUrl(image);

  return (
    <Link
      to={`${ROUTE_PATHS.STOREFRONT.PRODUCTS}?category=${encodeURIComponent(slug || '')}`}
      className="group flex flex-col items-center justify-center shrink-0 focus:outline-hidden select-none"
      title={name}
    >
      {/* Small & cute 3D gradient elevating circular button */}
      <div
        className="relative flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-gradient-to-b from-card via-card to-muted/60 border border-border border-t-white/80 dark:border-t-white/15 ring-1 ring-inset ring-white/40 dark:ring-white/5 shadow-[0_3.5px_0_0_hsl(var(--border)),0_6px_10px_-2px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 hover:shadow-[0_5px_0_0_hsl(var(--border)),0_10px_16px_-2px_rgba(0,0,0,0.1)] active:translate-y-1 active:shadow-[0_1px_0_0_hsl(var(--border))] transition-all duration-200 cursor-pointer"
      >
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="h-7 w-7 sm:h-8 sm:w-8 rounded-full object-cover" />
        ) : (
          renderCategoryIcon(category)
        )}
      </div>

      {/* Category label under the button */}
      <span className="mt-2 text-[11px] sm:text-xs font-semibold text-foreground text-center line-clamp-1 group-hover:text-primary transition-colors max-w-[70px] sm:max-w-[85px]">
        {name}
      </span>
    </Link>
  );
};

export default CategoryCard;

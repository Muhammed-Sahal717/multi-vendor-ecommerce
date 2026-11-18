import { Link } from 'react-router-dom';
import { Layers } from 'lucide-react';
import { ROUTE_PATHS } from '../../../routes/routePaths.js';
import { getMediaUrl } from '../../../lib/utils.js';

export const CategoryCard = ({ category }) => {
  const { name, slug, image, product_count } = category || {};
  const imageUrl = getMediaUrl(image);

  return (
    <Link
      to={ROUTE_PATHS.STOREFRONT.CATEGORY_PRODUCTS(slug)}
      className="group flex flex-col items-center rounded-2xl border border-neutral-100 bg-white p-5 text-center shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-neutral-200 hover:shadow-md"
    >
      <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-neutral-50 text-neutral-600 transition-colors group-hover:bg-amber-50 group-hover:text-amber-600">
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          <Layers size={32} className="stroke-[1.75]" />
        )}
      </div>

      <h4 className="mt-3 text-sm font-semibold text-neutral-900 group-hover:text-amber-600">
        {name}
      </h4>

      {product_count !== undefined && (
        <span className="mt-0.5 text-xs text-neutral-400">
          {product_count} {product_count === 1 ? 'item' : 'items'}
        </span>
      )}
    </Link>
  );
};

export default CategoryCard;

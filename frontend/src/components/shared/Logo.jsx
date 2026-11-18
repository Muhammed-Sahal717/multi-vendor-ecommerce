import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { ROUTE_PATHS } from '../../routes/routePaths.js';

export const Logo = ({ className = '', iconSize = 22, textClassName = 'text-xl' }) => {
  return (
    <Link
      to={ROUTE_PATHS.STOREFRONT.HOME}
      className={`inline-flex items-center gap-2 font-bold tracking-tight text-neutral-900 transition-opacity hover:opacity-90 ${className}`}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-900 text-white shadow-sm">
        <ShoppingBag size={iconSize} className="stroke-[2.5]" />
      </div>
      <span className={`font-black tracking-wider uppercase ${textClassName}`}>
        GALLA<span className="text-amber-500">.</span>
      </span>
    </Link>
  );
};

export default Logo;

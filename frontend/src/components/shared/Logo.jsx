import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { ROUTE_PATHS } from '../../routes/routePaths.js';

export const Logo = ({ className = '', iconSize = 20, textClassName = 'text-xl' }) => {
  return (
    <Link
      to={ROUTE_PATHS.STOREFRONT.HOME}
      className={`inline-flex items-center gap-2 font-bold tracking-tight text-foreground transition-opacity hover:opacity-90 ${className}`}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
        <ShoppingBag size={iconSize} className="stroke-[2.5]" />
      </div>
      <span className={`font-black tracking-wider uppercase text-foreground ${textClassName}`}>
        GALLA<span className="text-primary">.</span>
      </span>
    </Link>
  );
};

export default Logo;

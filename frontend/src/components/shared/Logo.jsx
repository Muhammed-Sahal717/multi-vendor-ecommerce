import { Link } from 'react-router-dom';
import { ROUTE_PATHS } from '../../routes/routePaths.js';

export const Logo = ({
  className = '',
  imgClassName = 'h-8 w-8 sm:h-9 sm:w-9',
  textClassName = 'text-xl',
  showText = true,
}) => {
  return (
    <Link
      to={ROUTE_PATHS.STOREFRONT.HOME}
      className={`group inline-flex items-center gap-2.5 font-bold tracking-tight text-foreground transition-opacity hover:opacity-95 ${className}`}
    >
      <img
        src="/logo.png"
        alt="GALLA."
        className={`object-contain shrink-0 transition-transform duration-300 group-hover:scale-105 drop-shadow-xs dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.2)] ${imgClassName}`}
      />
      {showText && (
        <span className={`font-black tracking-wider uppercase text-foreground font-heading select-none ${textClassName}`}>
          GALLA<span className="text-primary">.</span>
        </span>
      )}
    </Link>
  );
};

export default Logo;

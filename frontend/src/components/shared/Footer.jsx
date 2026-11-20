import { Link } from 'react-router-dom';
import { Logo } from './Logo.jsx';
import { ROUTE_PATHS } from '../../routes/routePaths.js';

// Social Icon Components
const YouTubeIcon = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const FacebookIcon = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const XIcon = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

export const Footer = () => {
  return (
    <footer className="mt-16 border-t border-border bg-card text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Branding Column */}
          <div className="space-y-4">
            <Logo imgClassName="h-9 w-9 sm:h-10 sm:w-10" textClassName="text-2xl" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              GALLA. is a trusted multi-vendor marketplace connecting authentic regional merchants with customers nationwide.
            </p>

            {/* Social Icons & Links */}
            <div className="pt-2 space-y-2">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Follow Us
              </span>
              <div className="flex items-center gap-2.5">
                <a
                  href="https://youtube.com"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="YouTube"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border/80 bg-background text-muted-foreground transition-all duration-200 hover:-translate-y-0.5 hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-500 shadow-2xs"
                >
                  <YouTubeIcon className="h-4 w-4" />
                </a>
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Facebook"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border/80 bg-background text-muted-foreground transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-600/50 hover:bg-blue-600/10 hover:text-blue-600 shadow-2xs"
                >
                  <FacebookIcon className="h-4 w-4" />
                </a>
                <a
                  href="https://x.com"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="X (formerly Twitter)"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border/80 bg-background text-muted-foreground transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/50 hover:bg-foreground/10 hover:text-foreground shadow-2xs"
                >
                  <XIcon className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-bold tracking-wider text-foreground uppercase">Shop</h4>
            <ul className="mt-4 space-y-2.5 text-xs font-medium text-muted-foreground">
              <li>
                <Link to={ROUTE_PATHS.STOREFRONT.PRODUCTS} className="transition-colors hover:text-primary">
                  All Products
                </Link>
              </li>
              <li>
                <Link to={ROUTE_PATHS.STOREFRONT.CART} className="transition-colors hover:text-primary">
                  Shopping Cart
                </Link>
              </li>
            </ul>
          </div>

          {/* Merchant / Sell */}
          <div>
            <h4 className="text-xs font-bold tracking-wider text-foreground uppercase">Sell With Us</h4>
            <ul className="mt-4 space-y-2.5 text-xs font-medium text-muted-foreground">
              <li>
                <Link to={ROUTE_PATHS.SELLER.APPLICATION} className="transition-colors hover:text-primary">
                  Become a Seller
                </Link>
              </li>
              <li>
                <Link to={ROUTE_PATHS.SELLER.DASHBOARD} className="transition-colors hover:text-primary">
                  Seller Dashboard
                </Link>
              </li>
              <li>
                <Link to={ROUTE_PATHS.CUSTOMER.SELLER_APPLICATION_STATUS} className="transition-colors hover:text-primary">
                  Application Status
                </Link>
              </li>
            </ul>
          </div>

          {/* Support & Policies */}
          <div>
            <h4 className="text-xs font-bold tracking-wider text-foreground uppercase">Support</h4>
            <ul className="mt-4 space-y-2.5 text-xs font-medium text-muted-foreground">
              <li>
                <Link to={ROUTE_PATHS.CUSTOMER.ORDERS} className="transition-colors hover:text-primary">
                  Order Tracking
                </Link>
              </li>
              <li>
                <span className="text-muted-foreground/80">Payment Protection & COD</span>
              </li>
              <li>
                <span className="text-muted-foreground/80">24/7 Customer Care</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between border-t border-border/70 pt-6 text-xs text-muted-foreground sm:flex-row gap-4">
          <p>© {new Date().getFullYear()} GALLA Inc. All rights reserved.</p>
          <p className="mt-2 sm:mt-0">Built for high scale, reliable commerce.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

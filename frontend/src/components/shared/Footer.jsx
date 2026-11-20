import { Link } from 'react-router-dom';
import { Logo } from './Logo.jsx';
import { ROUTE_PATHS } from '../../routes/routePaths.js';

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
                <Link to={ROUTE_PATHS.STOREFRONT.CATEGORIES} className="transition-colors hover:text-primary">
                  Categories
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

        <div className="mt-12 flex flex-col items-center justify-between border-t border-border/70 pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} GALLA Inc. All rights reserved.</p>
          <p className="mt-2 sm:mt-0">Built for high scale, reliable commerce.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

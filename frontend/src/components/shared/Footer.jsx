import { Link } from 'react-router-dom';
import { Logo } from './Logo.jsx';
import { ROUTE_PATHS } from '../../routes/routePaths.js';

export const Footer = () => {
  return (
    <footer className="mt-16 border-t border-neutral-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Branding Column */}
          <div className="space-y-4">
            <Logo />
            <p className="text-sm text-neutral-500">
              GALLA. is a trusted multi-vendor marketplace connecting authentic regional merchants with customers nationwide.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-bold tracking-wider text-neutral-900 uppercase">Shop</h4>
            <ul className="mt-4 space-y-2.5 text-sm text-neutral-600">
              <li>
                <Link to={ROUTE_PATHS.STOREFRONT.PRODUCTS} className="hover:text-neutral-900">
                  All Products
                </Link>
              </li>
              <li>
                <Link to={ROUTE_PATHS.STOREFRONT.CATEGORIES} className="hover:text-neutral-900">
                  Categories
                </Link>
              </li>
              <li>
                <Link to={ROUTE_PATHS.STOREFRONT.CART} className="hover:text-neutral-900">
                  Shopping Cart
                </Link>
              </li>
            </ul>
          </div>

          {/* Merchant / Sell */}
          <div>
            <h4 className="text-sm font-bold tracking-wider text-neutral-900 uppercase">Sell With Us</h4>
            <ul className="mt-4 space-y-2.5 text-sm text-neutral-600">
              <li>
                <Link to={ROUTE_PATHS.SELLER.APPLICATION} className="hover:text-neutral-900">
                  Become a Seller
                </Link>
              </li>
              <li>
                <Link to={ROUTE_PATHS.SELLER.DASHBOARD} className="hover:text-neutral-900">
                  Seller Dashboard
                </Link>
              </li>
              <li>
                <Link to={ROUTE_PATHS.CUSTOMER.SELLER_APPLICATION_STATUS} className="hover:text-neutral-900">
                  Application Status
                </Link>
              </li>
            </ul>
          </div>

          {/* Support & Policies */}
          <div>
            <h4 className="text-sm font-bold tracking-wider text-neutral-900 uppercase">Support</h4>
            <ul className="mt-4 space-y-2.5 text-sm text-neutral-600">
              <li>
                <Link to={ROUTE_PATHS.CUSTOMER.ORDERS} className="hover:text-neutral-900">
                  Order Tracking
                </Link>
              </li>
              <li>
                <span className="text-neutral-500">Payment Protection & COD</span>
              </li>
              <li>
                <span className="text-neutral-500">24/7 Customer Care</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between border-t border-neutral-100 pt-6 text-xs text-neutral-400 sm:flex-row">
          <p>© {new Date().getFullYear()} GALLA Inc. All rights reserved.</p>
          <p className="mt-2 sm:mt-0">Built for high scale, reliable commerce.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

import { Link, Outlet } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '../components/shared/Logo.jsx';
import { ROUTE_PATHS } from '../routes/routePaths.js';

const AUTH_BG_IMAGE =
  'https://img.magnific.com/free-vector/soft-hexagonal-mosaic-pattern-background_1409-1938.jpg?semt=ais_hybrid&w=740&q=80';

export const AuthLayout = () => {
  return (
    <div className="relative flex min-h-screen flex-col justify-between bg-background text-foreground px-4 py-8 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background Mosaic Pattern */}
      <div
        className="fixed inset-0 pointer-events-none bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${AUTH_BG_IMAGE})` }}
      />
      {/* Subtle overlay for optimal contrast and readability */}
      <div className="fixed inset-0 pointer-events-none bg-background/35 dark:bg-background/88 backdrop-blur-[1px]" />

      {/* Background Decorative Blurs from index.css */}
      {/* <div className="pointer-events-none fixed -top-24 -left-24 h-96 w-96 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none fixed -bottom-24 -right-24 h-96 w-96 rounded-full bg-chart-2/15 blur-3xl" /> */}

      {/* Header bar */}
      <header className="relative mx-auto flex w-full max-w-7xl items-center justify-between">
        <Logo />
        <Link
          to={ROUTE_PATHS.STOREFRONT.HOME}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={14} />
          <span>Back to Store</span>
        </Link>
      </header>

      {/* Main Auth Form Container */}
      <main className="relative mx-auto my-8 flex w-full max-w-md flex-col justify-center">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="relative mx-auto w-full max-w-7xl text-center text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} GALLA Inc. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default AuthLayout;

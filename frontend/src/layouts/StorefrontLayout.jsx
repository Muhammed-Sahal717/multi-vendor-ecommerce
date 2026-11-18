import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/shared/Navbar.jsx';
import { Footer } from '../components/shared/Footer.jsx';

export const StorefrontLayout = () => {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-50/50 text-neutral-900">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default StorefrontLayout;

import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ROUTE_PATHS } from './routePaths.js';
import { ROLES } from '../lib/constants.js';

// Guards
import ProtectedRoute from './ProtectedRoute.jsx';
import RoleRoute from './RoleRoute.jsx';

// Layouts
import RootLayout from '../layouts/RootLayout.jsx';
import StorefrontLayout from '../layouts/StorefrontLayout.jsx';
import AuthLayout from '../layouts/AuthLayout.jsx';
import CustomerLayout from '../layouts/CustomerLayout.jsx';
import SellerLayout from '../layouts/SellerLayout.jsx';
import AdminLayout from '../layouts/AdminLayout.jsx';
import SuperAdminLayout from '../layouts/SuperAdminLayout.jsx';

// Storefront & Cart Pages
import HomePage from '../features/storefront/pages/HomePage.jsx';
import ProductsPage from '../features/storefront/pages/ProductsPage.jsx';
import ProductDetailsPage from '../features/storefront/pages/ProductDetailsPage.jsx';
import CategoriesPage from '../features/storefront/pages/CategoriesPage.jsx';
import CategoryProductsPage from '../features/storefront/pages/CategoryProductsPage.jsx';
import CartPage from '../features/cart/pages/CartPage.jsx';
import CheckoutPage from '../features/checkout/pages/CheckoutPage.jsx';
import OrderSuccessPage from '../features/checkout/pages/OrderSuccessPage.jsx';

// Auth Pages
import LoginPage from '../features/auth/pages/LoginPage.jsx';
import RegisterPage from '../features/auth/pages/RegisterPage.jsx';

// Customer Pages
import CustomerDashboardPage from '../features/customer/pages/DashboardPage.jsx';
import CustomerOrdersPage from '../features/customer/pages/OrdersPage.jsx';
import CustomerOrderDetailsPage from '../features/customer/pages/OrderDetailsPage.jsx';
import CustomerProfilePage from '../features/customer/pages/ProfilePage.jsx';
import CustomerAddressesPage from '../features/customer/pages/AddressesPage.jsx';
import CustomerPaymentsPage from '../features/customer/pages/PaymentsPage.jsx';
import SellerApplicationStatusPage from '../features/customer/pages/SellerApplicationStatusPage.jsx';

// Seller Pages
import SellerDashboardPage from '../features/seller/pages/DashboardPage.jsx';
import SellerProductsPage from '../features/seller/pages/ProductsPage.jsx';
import SellerCreateProductPage from '../features/seller/pages/CreateProductPage.jsx';
import SellerEditProductPage from '../features/seller/pages/EditProductPage.jsx';
import SellerOrdersPage from '../features/seller/pages/OrdersPage.jsx';
import SellerOrderDetailsPage from '../features/seller/pages/OrderDetailsPage.jsx';
import SellerEarningsDashboardPage from '../features/seller/pages/EarningsDashboardPage.jsx';
import SellerEarningsHistoryPage from '../features/seller/pages/EarningsHistoryPage.jsx';
import SellerPayoutHistoryPage from '../features/seller/pages/PayoutHistoryPage.jsx';
import SellerProfilePage from '../features/seller/pages/SellerProfilePage.jsx';
import SellerApplicationPage from '../features/seller/pages/SellerApplicationPage.jsx';

// Admin Pages
import AdminDashboardPage from '../features/admin/pages/DashboardPage.jsx';
import AdminCustomersPage from '../features/admin/pages/CustomersPage.jsx';
import AdminCustomerDetailsPage from '../features/admin/pages/CustomerDetailsPage.jsx';
import AdminSellersPage from '../features/admin/pages/SellersPage.jsx';
import AdminSellerDetailsPage from '../features/admin/pages/SellerDetailsPage.jsx';
import AdminSellerApplicationsPage from '../features/admin/pages/SellerApplicationsPage.jsx';
import AdminCategoriesPage from '../features/admin/pages/CategoriesPage.jsx';
import AdminProductsPage from '../features/admin/pages/ProductsPage.jsx';
import AdminOrdersPage from '../features/admin/pages/OrdersPage.jsx';
import AdminOrderDetailsPage from '../features/admin/pages/OrderDetailsPage.jsx';
import AdminPaymentsPage from '../features/admin/pages/PaymentsPage.jsx';
import AdminPaymentDetailsPage from '../features/admin/pages/PaymentDetailsPage.jsx';
import AdminEarningsPage from '../features/admin/pages/EarningsPage.jsx';
import AdminSellerPayoutsPage from '../features/admin/pages/SellerPayoutsPage.jsx';

// Audit Pages
import AuditLogsPage from '../features/audit/pages/AuditLogsPage.jsx';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      // 1. Storefront Routes
      {
        element: <StorefrontLayout />,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'products', element: <ProductsPage /> },
          { path: 'products/:slug', element: <ProductDetailsPage /> },
          { path: 'categories', element: <CategoriesPage /> },
          { path: 'categories/:slug', element: <CategoryProductsPage /> },
          { path: 'cart', element: <CartPage /> },
          {
            element: <ProtectedRoute />,
            children: [
              { path: 'checkout', element: <CheckoutPage /> },
              { path: 'checkout/success', element: <OrderSuccessPage /> },
            ],
          },
        ],
      },

      // 2. Auth Routes
      {
        element: <AuthLayout />,
        children: [
          { path: 'login', element: <LoginPage /> },
          { path: 'register', element: <RegisterPage /> },
        ],
      },

      // 3. Customer Portal Routes
      {
        path: 'customer',
        element: (
          <ProtectedRoute>
            <RoleRoute allowedRoles={[ROLES.CUSTOMER, ROLES.SELLER, ROLES.ADMIN, ROLES.SUPERADMIN]}>
              <CustomerLayout />
            </RoleRoute>
          </ProtectedRoute>
        ),
        children: [
          { path: 'dashboard', element: <CustomerDashboardPage /> },
          { path: 'orders', element: <CustomerOrdersPage /> },
          { path: 'orders/:id', element: <CustomerOrderDetailsPage /> },
          { path: 'profile', element: <CustomerProfilePage /> },
          { path: 'addresses', element: <CustomerAddressesPage /> },
          { path: 'payments', element: <CustomerPaymentsPage /> },
          { path: 'seller-application-status', element: <SellerApplicationStatusPage /> },
        ],
      },

      // 4. Seller Portal Routes
      {
        path: 'seller',
        element: (
          <ProtectedRoute>
            <RoleRoute allowedRoles={[ROLES.SELLER]}>
              <SellerLayout />
            </RoleRoute>
          </ProtectedRoute>
        ),
        children: [
          { path: 'dashboard', element: <SellerDashboardPage /> },
          { path: 'products', element: <SellerProductsPage /> },
          { path: 'products/new', element: <SellerCreateProductPage /> },
          { path: 'products/:slug/edit', element: <SellerEditProductPage /> },
          { path: 'orders', element: <SellerOrdersPage /> },
          { path: 'orders/:id', element: <SellerOrderDetailsPage /> },
          { path: 'earnings', element: <SellerEarningsDashboardPage /> },
          { path: 'earnings/history', element: <SellerEarningsHistoryPage /> },
          { path: 'payouts', element: <SellerPayoutHistoryPage /> },
          { path: 'profile', element: <SellerProfilePage /> },
          { path: 'apply', element: <SellerApplicationPage /> },
        ],
      },

      // 5. Admin Portal Routes
      {
        path: 'admin',
        element: (
          <ProtectedRoute>
            <RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.SUPERADMIN]}>
              <AdminLayout />
            </RoleRoute>
          </ProtectedRoute>
        ),
        children: [
          { path: 'dashboard', element: <AdminDashboardPage /> },
          { path: 'customers', element: <AdminCustomersPage /> },
          { path: 'customers/:id', element: <AdminCustomerDetailsPage /> },
          { path: 'sellers', element: <AdminSellersPage /> },
          { path: 'sellers/:id', element: <AdminSellerDetailsPage /> },
          { path: 'seller-applications', element: <AdminSellerApplicationsPage /> },
          { path: 'categories', element: <AdminCategoriesPage /> },
          { path: 'products', element: <AdminProductsPage /> },
          { path: 'orders', element: <AdminOrdersPage /> },
          { path: 'orders/:id', element: <AdminOrderDetailsPage /> },
          { path: 'payments', element: <AdminPaymentsPage /> },
          { path: 'payments/:id', element: <AdminPaymentDetailsPage /> },
          { path: 'earnings', element: <AdminEarningsPage /> },
          { path: 'seller-payouts', element: <AdminSellerPayoutsPage /> },
        ],
      },

      // 6. Super Admin (Audit Logs) Routes
      {
        path: 'admin/audit-logs',
        element: (
          <ProtectedRoute>
            <RoleRoute allowedRoles={[ROLES.SUPERADMIN]}>
              <SuperAdminLayout />
            </RoleRoute>
          </ProtectedRoute>
        ),
        children: [{ index: true, element: <AuditLogsPage /> }],
      },

      // Fallback
      {
        path: '*',
        element: <Navigate to={ROUTE_PATHS.STOREFRONT.HOME} replace />,
      },
    ],
  },
]);

export default router;

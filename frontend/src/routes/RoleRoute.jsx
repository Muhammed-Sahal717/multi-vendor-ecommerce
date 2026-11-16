import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider.jsx';
import { ROLES } from '../lib/constants.js';
import { ROUTE_PATHS } from './routePaths.js';

export const RoleRoute = ({
  allowedRoles = [],
  redirectTo = ROUTE_PATHS.STOREFRONT.HOME,
  children,
}) => {
  const { user, role, isAuthenticated, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTE_PATHS.AUTH.LOGIN} state={{ from: location }} replace />;
  }

  const currentRole = (role || user?.role || '').toLowerCase();
  const normalizedAllowedRoles = (
    Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]
  ).map((r) => r.toLowerCase());

  // Superadmin inherently has access to admin-protected routes
  const hasAccess =
    normalizedAllowedRoles.includes(currentRole) ||
    (currentRole === ROLES.SUPERADMIN && normalizedAllowedRoles.includes(ROLES.ADMIN));

  if (!hasAccess) {
    return <Navigate to={redirectTo} replace />;
  }

  return children ? children : <Outlet />;
};

export default RoleRoute;

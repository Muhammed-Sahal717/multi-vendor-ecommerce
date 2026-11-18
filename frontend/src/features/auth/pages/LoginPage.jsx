import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, LogIn, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '../../../components/ui/button.jsx';
import { Input } from '../../../components/ui/input.jsx';
import { Label } from '../../../components/ui/label.jsx';
import { Alert, AlertDescription } from '../../../components/ui/alert.jsx';
import { authService } from '../services/authService.js';
import { useAuthStore } from '../../../stores/authStore.js';
import { useAuth } from '../../../context/AuthProvider.jsx';
import { getErrorMessage } from '../../../services/api.js';
import { ROUTE_PATHS } from '../../../routes/routePaths.js';
import { ROLES } from '../../../lib/constants.js';

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const setTokens = useAuthStore((state) => state.setTokens);
  const setUser = useAuthStore((state) => state.setUser);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // If already authenticated, redirect immediately
  useEffect(() => {
    if (isAuthenticated) {
      navigate(ROUTE_PATHS.STOREFRONT.HOME, { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errorMessage) setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!formData.email.trim() || !formData.password) {
      setErrorMessage('Please fill in both email and password.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Obtain JWT tokens
      const tokenResponse = await authService.login({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      const accessToken = tokenResponse?.access || tokenResponse?.accessToken;
      const refreshToken = tokenResponse?.refresh || tokenResponse?.refreshToken;

      if (!accessToken) {
        throw new Error('Access token was not provided by the server.');
      }

      setTokens({ accessToken, refreshToken });

      // 2. Hydrate user profile data
      const userData = await authService.getCurrentUser();
      setUser(userData);

      // 3. Smart redirection
      const destination = location.state?.from?.pathname;
      if (destination) {
        navigate(destination, { replace: true });
      } else if (userData?.role === ROLES.SELLER) {
        navigate(ROUTE_PATHS.SELLER.DASHBOARD, { replace: true });
      } else if (userData?.role === ROLES.ADMIN || userData?.role === ROLES.SUPERADMIN) {
        navigate(ROUTE_PATHS.ADMIN.DASHBOARD, { replace: true });
      } else {
        navigate(ROUTE_PATHS.STOREFRONT.HOME, { replace: true });
      }
    } catch (err) {
      const msg = getErrorMessage(err);
      if (err.response?.status === 401) {
        setErrorMessage('Invalid email or password. Please try again.');
      } else {
        setErrorMessage(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-3xl border border-neutral-200/80 bg-white p-8 shadow-xl shadow-neutral-100 sm:p-10">
      <div className="text-center">
        <h1 className="text-2xl font-black tracking-tight text-neutral-900 sm:text-3xl">
          Welcome back
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          Sign in to access your orders, wishlist, and dashboard.
        </p>
      </div>

      {location.state?.registered && !errorMessage && (
        <Alert className="mt-6 border-emerald-200 bg-emerald-50 text-emerald-800">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertDescription className="text-xs font-medium">
            Account created successfully! Please sign in with your credentials.
          </AlertDescription>
        </Alert>
      )}

      {errorMessage && (
        <Alert variant="destructive" className="mt-6 border-red-200 bg-red-50 text-red-800">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-xs font-medium">{errorMessage}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {/* Email */}
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-semibold text-neutral-700">
            Email address
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            value={formData.email}
            onChange={handleChange}
            className="h-11 rounded-xl border-neutral-200 bg-neutral-50/50 text-sm focus:border-neutral-900 focus:bg-white"
          />
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-xs font-semibold text-neutral-700">
              Password
            </Label>
          </div>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              className="h-11 rounded-xl border-neutral-200 bg-neutral-50/50 pr-10 text-sm focus:border-neutral-900 focus:bg-white"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-400 hover:text-neutral-600"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isLoading}
          className="mt-2 h-11 w-full rounded-xl bg-neutral-900 text-sm font-bold text-white transition-all hover:bg-neutral-800"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>Signing in...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <LogIn size={16} />
              <span>Sign In</span>
            </div>
          )}
        </Button>
      </form>

      {/* Switch to Register */}
      <div className="mt-8 border-t border-neutral-100 pt-6 text-center text-xs text-neutral-500">
        Don&apos;t have an account?{' '}
        <Link
          to={ROUTE_PATHS.AUTH.REGISTER}
          className="font-bold text-neutral-900 underline-offset-4 hover:underline"
        >
          Create an account
        </Link>
      </div>
    </div>
  );
};

export default LoginPage;

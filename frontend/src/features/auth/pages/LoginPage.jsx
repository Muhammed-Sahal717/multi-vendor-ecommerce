import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, LogIn, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '../../../components/ui/button.jsx';
import { Input } from '../../../components/ui/input.jsx';
import { Label } from '../../../components/ui/label.jsx';
import { Card } from '../../../components/ui/card.jsx';
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
    <Card className="rounded-3xl border border-border/80 bg-card/95 backdrop-blur-md p-8 shadow-2xl text-card-foreground sm:p-10">
      <div className="text-center">
        <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl font-heading">
          Welcome back
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to access your orders, wishlist, and dashboard.
        </p>
      </div>

      {location.state?.registered && !errorMessage && (
        <Alert className="mt-6 border-chart-4/30 bg-chart-4/15 text-foreground">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <AlertDescription className="text-xs font-semibold">
            Account created successfully! Please sign in with your credentials.
          </AlertDescription>
        </Alert>
      )}

      {errorMessage && (
        <Alert variant="destructive" className="mt-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs font-semibold">{errorMessage}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {/* Email */}
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-semibold text-foreground">
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
            className="h-10 rounded-xl border-input bg-background/50 text-sm focus:border-primary focus:bg-card"
          />
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-xs font-semibold text-foreground">
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
              className="h-10 rounded-xl border-input bg-background/50 pr-10 text-sm focus:border-primary focus:bg-card"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
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
          className="mt-2 h-10 w-full rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 shadow-md shadow-primary/20 transition-all"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
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
      <div className="mt-8 border-t border-border pt-6 text-center text-xs text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link
          to={ROUTE_PATHS.AUTH.REGISTER}
          className="font-bold text-primary underline-offset-4 hover:underline"
        >
          Create an account
        </Link>
      </div>
    </Card>
  );
};

export default LoginPage;

import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, UserPlus, AlertCircle } from 'lucide-react';
import { Button } from '../../../components/ui/button.jsx';
import { Input } from '../../../components/ui/input.jsx';
import { Label } from '../../../components/ui/label.jsx';
import { Alert, AlertDescription } from '../../../components/ui/alert.jsx';
import { authService } from '../services/authService.js';
import { useAuthStore } from '../../../stores/authStore.js';
import { useAuth } from '../../../context/AuthProvider.jsx';
import { getErrorMessage } from '../../../services/api.js';
import { ROUTE_PATHS } from '../../../routes/routePaths.js';

export const RegisterPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const setTokens = useAuthStore((state) => state.setTokens);
  const setUser = useAuthStore((state) => state.setUser);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirm_password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // If already authenticated, redirect
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

    // Client-side validations
    if (!formData.first_name.trim()) {
      setErrorMessage('First name is required.');
      return;
    }

    if (!formData.email.trim()) {
      setErrorMessage('Email address is required.');
      return;
    }

    if (formData.password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (formData.password !== formData.confirm_password) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Submit Registration
      await authService.register({
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        confirm_password: formData.confirm_password,
      });

      // 2. Automatically log the user in
      try {
        const tokenResponse = await authService.login({
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
        });

        const accessToken = tokenResponse?.access || tokenResponse?.accessToken;
        const refreshToken = tokenResponse?.refresh || tokenResponse?.refreshToken;

        if (accessToken) {
          setTokens({ accessToken, refreshToken });
          const userData = await authService.getCurrentUser();
          setUser(userData);

          const destination = location.state?.from?.pathname || ROUTE_PATHS.STOREFRONT.HOME;
          navigate(destination, { replace: true });
          return;
        }
      } catch {
        // Fallback to manual login redirect if auto-login fails
        navigate(ROUTE_PATHS.AUTH.LOGIN, {
          replace: true,
          state: { registered: true },
        });
        return;
      }

      navigate(ROUTE_PATHS.STOREFRONT.HOME, { replace: true });
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-3xl border border-neutral-200/80 bg-white p-8 shadow-xl shadow-neutral-100 sm:p-10">
      <div className="text-center">
        <h1 className="text-2xl font-black tracking-tight text-neutral-900 sm:text-3xl">
          Create an account
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          Join Galla to order products, track packages, and receive exclusive offers.
        </p>
      </div>

      {errorMessage && (
        <Alert variant="destructive" className="mt-6 border-red-200 bg-red-50 text-red-800">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-xs font-medium">{errorMessage}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {/* Name Fields */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="first_name" className="text-xs font-semibold text-neutral-700">
              First name *
            </Label>
            <Input
              id="first_name"
              name="first_name"
              type="text"
              required
              placeholder="John"
              value={formData.first_name}
              onChange={handleChange}
              className="h-11 rounded-xl border-neutral-200 bg-neutral-50/50 text-sm focus:border-neutral-900 focus:bg-white"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="last_name" className="text-xs font-semibold text-neutral-700">
              Last name
            </Label>
            <Input
              id="last_name"
              name="last_name"
              type="text"
              placeholder="Doe"
              value={formData.last_name}
              onChange={handleChange}
              className="h-11 rounded-xl border-neutral-200 bg-neutral-50/50 text-sm focus:border-neutral-900 focus:bg-white"
            />
          </div>
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-semibold text-neutral-700">
            Email address *
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
          <Label htmlFor="password" className="text-xs font-semibold text-neutral-700">
            Password (min 8 characters) *
          </Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
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

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <Label htmlFor="confirm_password" className="text-xs font-semibold text-neutral-700">
            Confirm password *
          </Label>
          <div className="relative">
            <Input
              id="confirm_password"
              name="confirm_password"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              placeholder="••••••••"
              value={formData.confirm_password}
              onChange={handleChange}
              className="h-11 rounded-xl border-neutral-200 bg-neutral-50/50 pr-10 text-sm focus:border-neutral-900 focus:bg-white"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-400 hover:text-neutral-600"
              aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
            >
              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
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
              <span>Creating account...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <UserPlus size={16} />
              <span>Create Account</span>
            </div>
          )}
        </Button>
      </form>

      {/* Switch to Login */}
      <div className="mt-8 border-t border-neutral-100 pt-6 text-center text-xs text-neutral-500">
        Already have an account?{' '}
        <Link
          to={ROUTE_PATHS.AUTH.LOGIN}
          className="font-bold text-neutral-900 underline-offset-4 hover:underline"
        >
          Sign In
        </Link>
      </div>
    </div>
  );
};

export default RegisterPage;

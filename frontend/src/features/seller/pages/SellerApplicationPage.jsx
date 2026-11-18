import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import {
  Store,
  Sparkles,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';
import { customerService } from '../../customer/services/customerService.js';
import { ROUTE_PATHS } from '../../../routes/routePaths.js';
import { Card } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Input } from '../../../components/ui/input.jsx';
import { Label } from '../../../components/ui/label.jsx';
import { Textarea } from '../../../components/ui/textarea.jsx';

export const SellerApplicationPage = () => {
  const navigate = useNavigate();
  const [formError, setFormError] = useState('');

  const [formData, setFormData] = useState({
    business_name: '',
    business_type: 'Individual Artisan',
    business_email: '',
    business_phone: '',
    business_address: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'India',
    website: '',
    description: '',
  });

  const applyMutation = useMutation({
    mutationFn: (data) => customerService.applyForSeller(data),
    onSuccess: () => {
      navigate(ROUTE_PATHS.CUSTOMER.SELLER_APPLICATION_STATUS);
    },
    onError: (err) => {
      const data = err?.response?.data;
      if (typeof data === 'object') {
        const firstKey = Object.keys(data)[0];
        const val = Array.isArray(data[firstKey]) ? data[firstKey][0] : data[firstKey];
        setFormError(`${firstKey}: ${val}`);
      } else {
        setFormError(err?.message || 'Failed to submit application.');
      }
    },
  });

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');
    applyMutation.mutate(formData);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 space-y-6">
      <Link
        to={ROUTE_PATHS.CUSTOMER.PROFILE}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors mb-1"
      >
        <ArrowLeft size={13} />
        <span>Back to Profile</span>
      </Link>

      <div className="text-center space-y-2">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
          <Store size={26} />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          Apply to Sell on GALLA.
        </h1>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Join our verified artisan community and start selling your handcrafted creations.
        </p>
      </div>

      {formError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
          <AlertCircle size={15} />
          <span>{formError}</span>
        </div>
      )}

      <Card className="p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-xs">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="app_b_name" className="text-xs font-semibold">Store / Brand Name *</Label>
              <Input
                id="app_b_name"
                value={formData.business_name}
                onChange={(e) => handleInputChange('business_name', e.target.value)}
                placeholder="e.g. Malabar Organics"
                className="h-9 text-xs rounded-xl"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="app_b_type" className="text-xs font-semibold">Business Structure *</Label>
              <Input
                id="app_b_type"
                value={formData.business_type}
                onChange={(e) => handleInputChange('business_type', e.target.value)}
                className="h-9 text-xs rounded-xl"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="app_email" className="text-xs font-semibold">Business Email *</Label>
              <Input
                id="app_email"
                type="email"
                value={formData.business_email}
                onChange={(e) => handleInputChange('business_email', e.target.value)}
                className="h-9 text-xs rounded-xl"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="app_phone" className="text-xs font-semibold">Business Phone *</Label>
              <Input
                id="app_phone"
                value={formData.business_phone}
                onChange={(e) => handleInputChange('business_phone', e.target.value)}
                className="h-9 text-xs rounded-xl"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="app_addr" className="text-xs font-semibold">Workshop / Studio Address *</Label>
            <Input
              id="app_addr"
              value={formData.business_address}
              onChange={(e) => handleInputChange('business_address', e.target.value)}
              className="h-9 text-xs rounded-xl"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div className="space-y-1.5">
              <Label htmlFor="app_city" className="text-xs font-semibold">City *</Label>
              <Input
                id="app_city"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                className="h-9 text-xs rounded-xl"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="app_state" className="text-xs font-semibold">State *</Label>
              <Input
                id="app_state"
                value={formData.state}
                onChange={(e) => handleInputChange('state', e.target.value)}
                className="h-9 text-xs rounded-xl"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="app_pin" className="text-xs font-semibold">PIN *</Label>
              <Input
                id="app_pin"
                value={formData.postal_code}
                onChange={(e) => handleInputChange('postal_code', e.target.value)}
                className="h-9 text-xs rounded-xl"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="app_desc" className="text-xs font-semibold">Artisan Craftsmanship & Products You Make *</Label>
            <Textarea
              id="app_desc"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Tell us what you make and how your products are formulated or crafted..."
              className="min-h-24 text-xs rounded-xl"
              required
            />
          </div>

          <div className="pt-3 border-t border-border flex justify-end">
            <Button
              type="submit"
              disabled={applyMutation.isPending}
              className="h-10 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 text-xs px-6 shadow-xs cursor-pointer gap-2"
            >
              {applyMutation.isPending ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <span>Submit Application</span>
                  <Sparkles size={13} />
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default SellerApplicationPage;

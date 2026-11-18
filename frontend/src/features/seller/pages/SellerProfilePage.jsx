import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Store,
  Mail,
  Phone,
  Globe,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { sellerService } from '../services/sellerService.js';
import { queryKeys } from '../../../lib/queryClient.js';
import { Card } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Input } from '../../../components/ui/input.jsx';
import { Label } from '../../../components/ui/label.jsx';
import { Textarea } from '../../../components/ui/textarea.jsx';
import { Badge } from '../../../components/ui/badge.jsx';

export const SellerProfilePage = () => {
  const queryClient = useQueryClient();

  const [formSuccess, setFormSuccess] = useState('');
  const [formError, setFormError] = useState('');

  const [formData, setFormData] = useState({
    business_name: '',
    business_type: '',
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

  // Fetch seller profile
  const { data: profile, isLoading } = useQuery({
    queryKey: queryKeys.seller.profile(),
    queryFn: sellerService.getProfile,
  });

  // Storing information from previous renders pattern (React docs compliant state sync)
  const [syncedId, setSyncedId] = useState('');
  if (profile && syncedId !== profile.id) {
    setSyncedId(profile.id);
    setFormData({
      business_name: profile.business_name || '',
      business_type: profile.business_type || '',
      business_email: profile.business_email || '',
      business_phone: profile.business_phone || '',
      business_address: profile.business_address || '',
      city: profile.city || '',
      state: profile.state || '',
      postal_code: profile.postal_code || '',
      country: profile.country || 'India',
      website: profile.website || '',
      description: profile.description || '',
    });
  }

  // Update profile mutation
  const updateMutation = useMutation({
    mutationFn: (data) => sellerService.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.seller.profile() });
      setFormSuccess('Studio profile updated successfully!');
      setFormError('');
      setTimeout(() => setFormSuccess(''), 3000);
    },
    onError: (err) => {
      const data = err?.response?.data;
      if (typeof data === 'object') {
        const firstKey = Object.keys(data)[0];
        setFormError(`${firstKey}: ${data[firstKey]}`);
      } else {
        setFormError(err?.message || 'Failed to update studio profile.');
      }
    },
  });

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="py-16 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
        <Loader2 size={16} className="animate-spin text-primary" />
        <span>Loading artisan store profile...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
            Artisan Studio Profile
          </h1>
          <p className="text-xs text-muted-foreground">
            Manage your public brand identity, studio address, and contact information.
          </p>
        </div>

        <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 font-bold text-xs gap-1 py-0.5">
          <CheckCircle2 size={12} />
          <span>Active Verified Seller</span>
        </Badge>
      </div>

      {formSuccess && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
          <CheckCircle2 size={15} />
          <span>{formSuccess}</span>
        </div>
      )}

      {formError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
          <AlertCircle size={15} />
          <span>{formError}</span>
        </div>
      )}

      {/* Form Card */}
      <Card className="p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-xs">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="b_name" className="text-xs font-semibold">
                Studio / Business Name *
              </Label>
              <Input
                id="b_name"
                value={formData.business_name}
                onChange={(e) => handleInputChange('business_name', e.target.value)}
                className="h-10 text-xs rounded-xl"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="b_type" className="text-xs font-semibold">
                Business Type / Entity *
              </Label>
              <Input
                id="b_type"
                value={formData.business_type}
                onChange={(e) => handleInputChange('business_type', e.target.value)}
                className="h-10 text-xs rounded-xl"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="b_email" className="text-xs font-semibold flex items-center gap-1.5">
                <Mail size={12} className="text-muted-foreground" />
                <span>Business Contact Email *</span>
              </Label>
              <Input
                id="b_email"
                type="email"
                value={formData.business_email}
                onChange={(e) => handleInputChange('business_email', e.target.value)}
                className="h-10 text-xs rounded-xl"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="b_phone" className="text-xs font-semibold flex items-center gap-1.5">
                <Phone size={12} className="text-muted-foreground" />
                <span>Business Phone / WhatsApp *</span>
              </Label>
              <Input
                id="b_phone"
                value={formData.business_phone}
                onChange={(e) => handleInputChange('business_phone', e.target.value)}
                className="h-10 text-xs rounded-xl"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="b_address" className="text-xs font-semibold">
              Workshop / Studio Address *
            </Label>
            <Input
              id="b_address"
              value={formData.business_address}
              onChange={(e) => handleInputChange('business_address', e.target.value)}
              className="h-10 text-xs rounded-xl"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="b_city" className="text-xs font-semibold">
                City *
              </Label>
              <Input
                id="b_city"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                className="h-10 text-xs rounded-xl"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="b_state" className="text-xs font-semibold">
                State *
              </Label>
              <Input
                id="b_state"
                value={formData.state}
                onChange={(e) => handleInputChange('state', e.target.value)}
                className="h-10 text-xs rounded-xl"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="b_postal" className="text-xs font-semibold">
                PIN Code *
              </Label>
              <Input
                id="b_postal"
                value={formData.postal_code}
                onChange={(e) => handleInputChange('postal_code', e.target.value)}
                className="h-10 text-xs rounded-xl"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="b_website" className="text-xs font-semibold flex items-center gap-1.5">
              <Globe size={12} className="text-muted-foreground" />
              <span>Studio Website or Portfolio (Optional)</span>
            </Label>
            <Input
              id="b_website"
              value={formData.website}
              onChange={(e) => handleInputChange('website', e.target.value)}
              placeholder="https://..."
              className="h-10 text-xs rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="b_description" className="text-xs font-semibold">
              Artisan Story & Craftsmanship Mission *
            </Label>
            <Textarea
              id="b_description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="min-h-24 text-xs rounded-xl"
              required
            />
          </div>

          <div className="flex justify-end pt-4 border-t border-border">
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              className="h-10 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 text-xs px-6 shadow-xs cursor-pointer gap-2"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Profile</span>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default SellerProfilePage;

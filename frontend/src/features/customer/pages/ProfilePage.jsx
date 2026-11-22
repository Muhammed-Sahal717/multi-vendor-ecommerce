import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Phone,
  Store,
  Sparkles,
  Camera,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { authService } from '../../auth/services/authService.js';
import { customerService } from '../services/customerService.js';
import { useAuth } from '../../../context/AuthProvider.jsx';
import { queryKeys } from '../../../lib/queryClient.js';
import { ROUTE_PATHS } from '../../../routes/routePaths.js';
import { ROLES } from '../../../lib/constants.js';
import { getUserAvatarUrl } from '../../../lib/utils.js';
import { Card } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Input } from '../../../components/ui/input.jsx';
import { Label } from '../../../components/ui/label.jsx';
import { Textarea } from '../../../components/ui/textarea.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../../components/ui/dialog.jsx';

export const ProfilePage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user, role, updateUser } = useAuth();

  const [formSuccess, setFormSuccess] = useState('');
  const [formError, setFormError] = useState('');
  const [previewUrl, setPreviewUrl] = useState(null);
  const [imgLoadError, setImgLoadError] = useState(false);

  // Seller application modal state
  const [isSellerModalOpen, setIsSellerModalOpen] = useState(false);
  const [sellerError, setSellerError] = useState('');

  // Profile Form State
  const [profileData, setProfileData] = useState({
    first_name: '',
    last_name: '',
    mobile: '',
  });

  // Seller Application Form State
  const [sellerFormData, setSellerFormData] = useState({
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

  // Fetch full profile from API
  const { data: profile, isLoading } = useQuery({
    queryKey: queryKeys.auth.profile(),
    queryFn: authService.getProfile,
    staleTime: 1000 * 60 * 5,
  });

  // Initialize and sync profile form when data loads (React docs compliant state sync)
  const [syncedKey, setSyncedKey] = useState('');
  const currentKey = `${profile?.id || user?.id || ''}_${profile?.first_name || user?.first_name || ''}_${profile?.last_name || user?.last_name || ''}_${profile?.mobile || user?.mobile || ''}`;

  if ((profile || user) && syncedKey !== currentKey) {
    setSyncedKey(currentKey);
    setProfileData({
      first_name: profile?.first_name || user?.first_name || '',
      last_name: profile?.last_name || user?.last_name || '',
      mobile: profile?.mobile || user?.mobile || '',
    });
    setSellerFormData((prev) => ({
      ...prev,
      business_email: profile?.email || user?.email || '',
      business_phone: profile?.mobile || user?.mobile || '',
    }));
  }

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data) => authService.updateProfile(data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.profile() });
      if (updateUser) {
        updateUser(updated);
      }
      setFormSuccess('Profile updated successfully!');
      setFormError('');
      setTimeout(() => setFormSuccess(''), 3000);
    },
    onError: (err) => {
      const data = err?.response?.data;
      if (typeof data === 'object') {
        const firstKey = Object.keys(data)[0];
        const val = Array.isArray(data[firstKey]) ? data[firstKey][0] : data[firstKey];
        setFormError(`${firstKey}: ${val}`);
      } else {
        setFormError(err?.message || 'Failed to update profile.');
      }
    },
  });

  // Upload profile image mutation
  const uploadImageMutation = useMutation({
    mutationFn: (file) => authService.uploadAvatar(file),
    onSuccess: (updatedData) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.profile() });
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me() });
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.all });
      if (updatedData && typeof updatedData === 'object' && updateUser) {
        updateUser(updatedData);
      }
      setFormSuccess('Profile picture updated successfully!');
      setFormError('');
      setImgLoadError(false);
      setTimeout(() => setFormSuccess(''), 3000);
    },
    onError: (err) => {
      setPreviewUrl(null);
      const data = err?.response?.data;
      let errMsg = 'Failed to upload profile picture.';
      if (typeof data === 'string') {
        errMsg = data;
      } else if (data?.detail) {
        errMsg = data.detail;
      } else if (data?.message) {
        errMsg = data.message;
      } else if (typeof data === 'object') {
        const firstKey = Object.keys(data)[0];
        const val = Array.isArray(data[firstKey]) ? data[firstKey][0] : data[firstKey];
        errMsg = `${firstKey}: ${val}`;
      } else if (err?.message) {
        errMsg = err.message;
      }
      setFormError(errMsg);
    },
  });

  // Submit seller application mutation
  const sellerApplicationMutation = useMutation({
    mutationFn: (data) => customerService.applyForSeller(data),
    onSuccess: () => {
      setIsSellerModalOpen(false);
      navigate(ROUTE_PATHS.CUSTOMER.SELLER_APPLICATION_STATUS);
    },
    onError: (err) => {
      const data = err?.response?.data;
      if (typeof data === 'object') {
        const firstKey = Object.keys(data)[0];
        const val = Array.isArray(data[firstKey]) ? data[firstKey][0] : data[firstKey];
        setSellerError(`${firstKey}: ${val}`);
      } else {
        setSellerError(err?.message || 'Failed to submit application. Please try again.');
      }
    },
  });

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    updateProfileMutation.mutate(profileData);
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg'];
    if (!validMimes.includes(file.type) && !file.type.startsWith('image/')) {
      setFormError('Please select a valid image file (JPG, PNG, or WEBP).');
      return;
    }

    // Validate size (5MB max)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setFormError('Image size exceeds 5MB limit. Please select a smaller photo.');
      return;
    }

    setFormError('');
    setFormSuccess('');
    setImgLoadError(false);

    // Optimistic instant preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // Upload
    uploadImageMutation.mutate(file);

    // Reset input so re-selecting same file triggers change
    e.target.value = '';
  };

  const handleSellerSubmit = (e) => {
    e.preventDefault();
    setSellerError('');
    if (
      !sellerFormData.business_name ||
      !sellerFormData.business_email ||
      !sellerFormData.business_phone ||
      !sellerFormData.business_address ||
      !sellerFormData.city ||
      !sellerFormData.state ||
      !sellerFormData.postal_code ||
      !sellerFormData.description
    ) {
      setSellerError('Please fill in all required fields.');
      return;
    }
    sellerApplicationMutation.mutate(sellerFormData);
  };

  const profileImageUrl =
    previewUrl ||
    (!imgLoadError ? getUserAvatarUrl(profile) || getUserAvatarUrl(user) : null);
  const isSeller = role === ROLES.SELLER;

  return (
    <div className="space-y-8">
      {/* 1. Header Banner: Become a Seller Promotion (Exclusive to Profile Page) */}
      {!isSeller ? (
        <Card className="relative overflow-hidden rounded-3xl border border-primary/20 bg-linear-to-r from-primary/10 via-card to-card p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-primary/40 bg-primary/15 text-primary text-xs font-bold gap-1 py-0.5">
                  <Sparkles size={12} className="text-primary" />
                  <span>Artisan Marketplace Opportunity</span>
                </Badge>
              </div>
              <h2 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
                Want to sell on GALLA.?
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Turn your craft into a thriving business. Reach thousands of verified conscious buyers across India with zero listing fees and prompt weekly payouts.
              </p>
            </div>

            <Button
              type="button"
              size="lg"
              onClick={() => setIsSellerModalOpen(true)}
              className="h-11 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 text-xs sm:text-sm px-6 shadow-sm gap-2 shrink-0 cursor-pointer"
            >
              <Store size={16} />
              <span>Become a Seller</span>
              <ArrowRight size={14} />
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Store size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">You are an active seller on GALLA.</h3>
              <p className="text-xs text-muted-foreground">Manage your catalog, inventory, and order fulfillment from your seller portal.</p>
            </div>
          </div>
          <Button asChild size="sm" className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 shrink-0">
            <Link to={ROUTE_PATHS.SELLER.DASHBOARD}>
              <span>Go to Seller Portal</span>
              <ArrowRight size={13} />
            </Link>
          </Button>
        </Card>
      )}

      {/* 2. Personal Information Card */}
      <Card className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Personal Information</h2>
            <p className="text-xs text-muted-foreground">Update your personal profile details and contact information.</p>
          </div>
          <Badge variant="outline" className="border-border text-xs capitalize text-muted-foreground">
            {role || 'Customer'}
          </Badge>
        </div>

        {/* Avatar Upload Header */}
        <div className="flex items-center gap-5">
          <div className="relative group">
            <label
              htmlFor="avatar-upload"
              className="flex h-20 w-20 overflow-hidden items-center justify-center rounded-2xl border-2 border-border/80 bg-muted/40 text-xl font-bold text-foreground shadow-2xs cursor-pointer hover:border-primary/60 transition-all relative block"
              title="Click to change profile picture"
            >
              {profileImageUrl ? (
                <img
                  src={profileImageUrl}
                  alt="Profile"
                  onError={() => setImgLoadError(true)}
                  className="h-full w-full object-cover object-center"
                />
              ) : (
                <span>
                  {user?.first_name
                    ? user.first_name[0].toUpperCase()
                    : user?.email
                      ? user.email[0].toUpperCase()
                      : 'U'}
                </span>
              )}

              {/* Uploading Spinner Overlay */}
              {uploadImageMutation.isPending && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-2xs flex items-center justify-center">
                  <Loader2 size={22} className="animate-spin text-primary" />
                </div>
              )}

              {/* Hover Overlay */}
              {!uploadImageMutation.isPending && (
                <div className="absolute inset-0 bg-black/40 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera size={18} />
                  <span className="text-[10px] font-bold mt-0.5">Change</span>
                </div>
              )}
            </label>

            <label
              htmlFor="avatar-upload"
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm cursor-pointer hover:bg-primary/90 transition-transform active:scale-95"
              title="Change profile picture"
            >
              <Camera size={14} />
              <input
                id="avatar-upload"
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handleImageChange}
                className="hidden"
                disabled={uploadImageMutation.isPending}
              />
            </label>
          </div>

          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground">Profile Picture</h3>
            <p className="text-xs text-muted-foreground">JPG, PNG or WEBP up to 5MB.</p>
            {uploadImageMutation.isPending ? (
              <span className="text-[11px] text-primary flex items-center gap-1 font-semibold">
                <Loader2 size={12} className="animate-spin" /> Uploading image...
              </span>
            ) : (
              <label
                htmlFor="avatar-upload"
                className="inline-block text-[11px] font-bold text-primary hover:underline cursor-pointer"
              >
                Upload New Photo
              </label>
            )}
          </div>
        </div>

        {/* Feedback Alerts */}
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

        {/* Form Fields */}
        <form onSubmit={handleProfileSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="first_name" className="text-xs font-semibold">
                First Name *
              </Label>
              <Input
                id="first_name"
                value={profileData.first_name}
                onChange={(e) =>
                  setProfileData((prev) => ({ ...prev, first_name: e.target.value }))
                }
                placeholder="Enter first name"
                className="h-10 text-xs rounded-xl"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="last_name" className="text-xs font-semibold">
                Last Name
              </Label>
              <Input
                id="last_name"
                value={profileData.last_name}
                onChange={(e) =>
                  setProfileData((prev) => ({ ...prev, last_name: e.target.value }))
                }
                placeholder="Enter last name"
                className="h-10 text-xs rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold flex items-center gap-1.5">
                <Mail size={12} className="text-muted-foreground" />
                <span>Email Address (Primary Login)</span>
              </Label>
              <Input
                id="email"
                value={profile?.email || user?.email || ''}
                disabled
                className="h-10 text-xs rounded-xl bg-muted/40 cursor-not-allowed opacity-80"
              />
              <span className="text-[10px] text-muted-foreground">
                Email cannot be modified for security reasons.
              </span>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mobile" className="text-xs font-semibold flex items-center gap-1.5">
                <Phone size={12} className="text-muted-foreground" />
                <span>Mobile Number</span>
              </Label>
              <Input
                id="mobile"
                type="tel"
                value={profileData.mobile}
                onChange={(e) =>
                  setProfileData((prev) => ({ ...prev, mobile: e.target.value }))
                }
                placeholder="10-digit mobile number"
                className="h-10 text-xs rounded-xl"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-border">
            <Button
              type="submit"
              disabled={updateProfileMutation.isPending || isLoading}
              className="h-10 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 text-xs px-6 shadow-xs cursor-pointer gap-2"
            >
              {updateProfileMutation.isPending ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </Button>
          </div>
        </form>
      </Card>

      {/* 3. Account Security Snapshot */}
      <Card className="rounded-3xl border border-border bg-card p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
          <ShieldCheck size={18} className="text-primary" />
          <span>Security & Account Status</span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs">
          <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-1">
            <span className="text-muted-foreground text-[11px]">Email Verification</span>
            <p className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 size={13} /> Verified
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-1">
            <span className="text-muted-foreground text-[11px]">Account Type</span>
            <p className="font-bold text-foreground capitalize">{role || 'Customer'}</p>
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-1">
            <span className="text-muted-foreground text-[11px]">Data Privacy</span>
            <p className="font-bold text-foreground">256-bit Encrypted</p>
          </div>
        </div>
      </Card>

      {/* Become a Seller Modal */}
      <Dialog open={isSellerModalOpen} onOpenChange={setIsSellerModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-card border border-border p-6 shadow-2xl space-y-4">
          <DialogHeader className="border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Store size={18} />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground">
                  Apply to Become a GALLA. Seller
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Join our verified artisan directory and start listing your creations.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {sellerError && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
              <AlertCircle size={15} />
              <span>{sellerError}</span>
            </div>
          )}

          <form onSubmit={handleSellerSubmit} className="space-y-4 pt-1">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="business_name" className="text-xs font-semibold">
                  Store / Business Name *
                </Label>
                <Input
                  id="business_name"
                  value={sellerFormData.business_name}
                  onChange={(e) =>
                    setSellerFormData((prev) => ({ ...prev, business_name: e.target.value }))
                  }
                  placeholder="e.g. Kerala Herbal Craft"
                  className="h-9 text-xs rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="business_type" className="text-xs font-semibold">
                  Business Structure *
                </Label>
                <Input
                  id="business_type"
                  value={sellerFormData.business_type}
                  onChange={(e) =>
                    setSellerFormData((prev) => ({ ...prev, business_type: e.target.value }))
                  }
                  placeholder="e.g. Individual Artisan / Enterprise"
                  className="h-9 text-xs rounded-xl"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="business_email" className="text-xs font-semibold">
                  Official Business Email *
                </Label>
                <Input
                  id="business_email"
                  type="email"
                  value={sellerFormData.business_email}
                  onChange={(e) =>
                    setSellerFormData((prev) => ({ ...prev, business_email: e.target.value }))
                  }
                  placeholder="seller@example.com"
                  className="h-9 text-xs rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="business_phone" className="text-xs font-semibold">
                  Business Phone / WhatsApp *
                </Label>
                <Input
                  id="business_phone"
                  value={sellerFormData.business_phone}
                  onChange={(e) =>
                    setSellerFormData((prev) => ({ ...prev, business_phone: e.target.value }))
                  }
                  placeholder="10-digit number"
                  className="h-9 text-xs rounded-xl"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="business_address" className="text-xs font-semibold">
                Studio / Workshop Address *
              </Label>
              <Input
                id="business_address"
                value={sellerFormData.business_address}
                onChange={(e) =>
                  setSellerFormData((prev) => ({ ...prev, business_address: e.target.value }))
                }
                placeholder="Complete street address"
                className="h-9 text-xs rounded-xl"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="space-y-1.5">
                <Label htmlFor="s_city" className="text-xs font-semibold">
                  City *
                </Label>
                <Input
                  id="s_city"
                  value={sellerFormData.city}
                  onChange={(e) =>
                    setSellerFormData((prev) => ({ ...prev, city: e.target.value }))
                  }
                  placeholder="City"
                  className="h-9 text-xs rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="s_state" className="text-xs font-semibold">
                  State *
                </Label>
                <Input
                  id="s_state"
                  value={sellerFormData.state}
                  onChange={(e) =>
                    setSellerFormData((prev) => ({ ...prev, state: e.target.value }))
                  }
                  placeholder="State"
                  className="h-9 text-xs rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="s_postal" className="text-xs font-semibold">
                  PIN Code *
                </Label>
                <Input
                  id="s_postal"
                  value={sellerFormData.postal_code}
                  onChange={(e) =>
                    setSellerFormData((prev) => ({ ...prev, postal_code: e.target.value }))
                  }
                  placeholder="6 digits"
                  className="h-9 text-xs rounded-xl"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="website" className="text-xs font-semibold">
                Website or Portfolio Link (Optional)
              </Label>
              <Input
                id="website"
                value={sellerFormData.website}
                onChange={(e) =>
                  setSellerFormData((prev) => ({ ...prev, website: e.target.value }))
                }
                placeholder="https://..."
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs font-semibold">
                Artisan Story & Products You Make *
              </Label>
              <Textarea
                id="description"
                value={sellerFormData.description}
                onChange={(e) =>
                  setSellerFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Tell us about your production techniques, ingredients, and craft philosophy..."
                className="text-xs rounded-xl min-h-20"
                required
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsSellerModalOpen(false)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={sellerApplicationMutation.isPending}
                className="rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 text-xs px-5 cursor-pointer gap-2"
              >
                {sellerApplicationMutation.isPending ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Submitting Application...</span>
                  </>
                ) : (
                  <span>Submit Application</span>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfilePage;

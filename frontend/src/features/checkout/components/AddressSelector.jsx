import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MapPin,
  Plus,
  CheckCircle2,
  Circle,
  Phone,
  Home,
  AlertCircle,
  Loader2,
  Check,
} from 'lucide-react';
import { authService } from '../../auth/services/authService.js';
import { queryKeys } from '../../../lib/queryClient.js';
import { Card } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Input } from '../../../components/ui/input.jsx';
import { Label } from '../../../components/ui/label.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../../components/ui/dialog.jsx';

export const AddressSelector = ({ selectedAddressId, onSelectAddress }) => {
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formError, setFormError] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    full_name: '',
    mobile: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'India',
    is_default: false,
  });

  // Fetch addresses
  const {
    data: addressesData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: queryKeys.auth.addresses(),
    queryFn: authService.getAddresses,
  });

  const addresses = useMemo(() => {
    return Array.isArray(addressesData)
      ? addressesData
      : addressesData?.results || [];
  }, [addressesData]);

  // Auto-select default or first address if none selected
  useEffect(() => {
    if (addresses.length > 0 && !selectedAddressId) {
      const defaultAddr = addresses.find((a) => a.is_default) || addresses[0];
      if (defaultAddr) {
        onSelectAddress(defaultAddr.id);
      }
    }
  }, [addresses, selectedAddressId, onSelectAddress]);

  // Create address mutation
  const createAddressMutation = useMutation({
    mutationFn: (newAddr) => authService.createAddress(newAddr),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.addresses() });
      onSelectAddress(created.id);
      setIsAddModalOpen(false);
      setFormError('');
      setFormData({
        full_name: '',
        mobile: '',
        address_line_1: '',
        address_line_2: '',
        city: '',
        state: '',
        postal_code: '',
        country: 'India',
        is_default: false,
      });
    },
    onError: (err) => {
      const data = err?.response?.data;
      if (typeof data === 'object') {
        const firstKey = Object.keys(data)[0];
        const val = Array.isArray(data[firstKey]) ? data[firstKey][0] : data[firstKey];
        setFormError(`${firstKey}: ${val}`);
      } else {
        setFormError(err?.message || 'Failed to save address.');
      }
    },
  });

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    if (
      !formData.full_name ||
      !formData.mobile ||
      !formData.address_line_1 ||
      !formData.city ||
      !formData.state ||
      !formData.postal_code
    ) {
      setFormError('Please fill in all required fields.');
      return;
    }

    createAddressMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <Card className="rounded-3xl border border-border/60 bg-card p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground font-black text-xs shadow-xs">
            1
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground font-heading">Shipping Address</h2>
            <p className="text-xs text-muted-foreground">Loading your saved delivery addresses...</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-8 text-xs text-muted-foreground gap-2">
          <Loader2 size={18} className="animate-spin text-primary" />
          <span>Loading delivery addresses...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="rounded-3xl border border-border/60 bg-card p-6 space-y-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground font-black text-xs shadow-xs">
            1
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground font-heading">Shipping Address</h2>
            <p className="text-xs text-muted-foreground">Select or add where you want your order delivered</p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsAddModalOpen(true)}
          className="gap-1.5 rounded-full text-xs font-bold border-border/80 hover:border-primary/50 hover:bg-primary/5 cursor-pointer w-fit"
        >
          <Plus size={14} className="text-primary" />
          <span>Add New Address</span>
        </Button>
      </div>

      {isError && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
          <AlertCircle size={15} />
          <span>Could not load addresses. Please try again.</span>
        </div>
      )}

      {/* Address Cards Grid */}
      {addresses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 p-8 text-center space-y-3 bg-muted/10">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Home size={22} />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-foreground font-heading">No saved addresses found</p>
            <p className="text-xs text-muted-foreground">Add your delivery address to proceed with checkout.</p>
          </div>
          <Button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="rounded-2xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 text-xs px-5 py-2 cursor-pointer gap-1.5 shadow-md shadow-primary/20"
          >
            <Plus size={14} />
            <span>Add Delivery Address</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {addresses.map((addr) => {
            const isSelected = selectedAddressId === addr.id;
            return (
              <div
                key={addr.id}
                onClick={() => onSelectAddress(addr.id)}
                className={`group relative flex flex-col justify-between rounded-2xl border-2 p-4 transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-xs'
                    : 'border-border/60 bg-card hover:border-border hover:bg-muted/20'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="shrink-0">
                        {isSelected ? (
                          <CheckCircle2 size={18} className="text-primary fill-primary/15" />
                        ) : (
                          <Circle size={18} className="text-muted-foreground/40 group-hover:text-muted-foreground/70" />
                        )}
                      </div>
                      <span className="text-sm font-bold text-foreground font-heading">
                        {addr.full_name}
                      </span>
                    </div>

                    {addr.is_default && (
                      <Badge variant="outline" className="text-[10px] font-bold border-primary/30 bg-primary/10 text-primary py-0 px-2 rounded-full">
                        Default
                      </Badge>
                    )}
                  </div>

                  <div className="pl-6.5 space-y-1 text-xs text-muted-foreground">
                    <p className="text-foreground/90 font-medium leading-relaxed">
                      {addr.address_line_1}
                      {addr.address_line_2 ? `, ${addr.address_line_2}` : ''}
                    </p>
                    <p>
                      {addr.city}, {addr.state} - <span className="font-bold text-foreground">{addr.postal_code}</span>
                    </p>
                    <div className="flex items-center gap-1.5 pt-1 text-xs text-muted-foreground">
                      <Phone size={11} className="text-primary/80" />
                      <span>{addr.mobile}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add New Address Dialog */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-md rounded-3xl bg-card border border-border/60 p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-foreground font-heading flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <MapPin size={15} />
              </div>
              <span>Add Shipping Address</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Provide complete delivery details for accurate shipping and tracking.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="full_name" className="text-xs font-semibold">
                  Full Name *
                </Label>
                <Input
                  id="full_name"
                  placeholder="e.g. Rahul Sharma"
                  value={formData.full_name}
                  onChange={(e) => handleInputChange('full_name', e.target.value)}
                  className="h-10 text-xs rounded-xl border-border/80"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mobile" className="text-xs font-semibold">
                  Mobile Number *
                </Label>
                <Input
                  id="mobile"
                  type="tel"
                  placeholder="10-digit number"
                  value={formData.mobile}
                  onChange={(e) => handleInputChange('mobile', e.target.value)}
                  className="h-10 text-xs rounded-xl border-border/80"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="address_line_1" className="text-xs font-semibold">
                Flat / House No. / Street *
              </Label>
              <Input
                id="address_line_1"
                placeholder="Building name, Street address"
                value={formData.address_line_1}
                onChange={(e) => handleInputChange('address_line_1', e.target.value)}
                className="h-10 text-xs rounded-xl border-border/80"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="address_line_2" className="text-xs font-semibold">
                Area / Landmark (Optional)
              </Label>
              <Input
                id="address_line_2"
                placeholder="Nearby landmark, apartment name"
                value={formData.address_line_2}
                onChange={(e) => handleInputChange('address_line_2', e.target.value)}
                className="h-10 text-xs rounded-xl border-border/80"
              />
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="space-y-1.5">
                <Label htmlFor="city" className="text-xs font-semibold">
                  City *
                </Label>
                <Input
                  id="city"
                  placeholder="City"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className="h-10 text-xs rounded-xl border-border/80"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="state" className="text-xs font-semibold">
                  State *
                </Label>
                <Input
                  id="state"
                  placeholder="State"
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  className="h-10 text-xs rounded-xl border-border/80"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="postal_code" className="text-xs font-semibold">
                  PIN Code *
                </Label>
                <Input
                  id="postal_code"
                  placeholder="6 digits"
                  value={formData.postal_code}
                  onChange={(e) => handleInputChange('postal_code', e.target.value)}
                  className="h-10 text-xs rounded-xl border-border/80"
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                id="is_default"
                type="checkbox"
                checked={formData.is_default}
                onChange={(e) => handleInputChange('is_default', e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer accent-primary"
              />
              <Label htmlFor="is_default" className="text-xs font-medium text-foreground cursor-pointer">
                Make this my default shipping address
              </Label>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-border/60">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-2xl text-xs font-semibold border-border/80"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createAddressMutation.isPending}
                className="rounded-2xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 text-xs px-5 shadow-md shadow-primary/20 cursor-pointer"
              >
                {createAddressMutation.isPending ? (
                  <>
                    <Loader2 size={13} className="animate-spin mr-1.5" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check size={13} className="mr-1.5" />
                    <span>Save & Select</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default AddressSelector;

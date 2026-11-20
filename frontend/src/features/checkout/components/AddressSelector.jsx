import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MapPin,
  Plus,
  CheckCircle2,
  Phone,
  Home,
  AlertCircle,
  Loader2,
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
      <Card className="p-6 rounded-2xl border border-border bg-card space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
          <MapPin size={18} className="text-primary" />
          <span>Delivery Address</span>
        </div>
        <div className="flex items-center justify-center py-8 text-xs text-muted-foreground gap-2">
          <Loader2 size={16} className="animate-spin text-primary" />
          <span>Loading delivery addresses...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 rounded-2xl border border-border bg-card space-y-5">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MapPin size={16} />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">1. Shipping Address</h2>
            <p className="text-xs text-muted-foreground">Select or add where you want your order delivered</p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsAddModalOpen(true)}
          className="gap-1.5 rounded-xl text-xs font-semibold hover:border-primary/40 hover:bg-primary/5 cursor-pointer"
        >
          <Plus size={14} className="text-primary" />
          <span>Add New</span>
        </Button>
      </div>

      {isError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
          <AlertCircle size={15} />
          <span>Could not load addresses. Please try again.</span>
        </div>
      )}

      {/* Address Cards Grid */}
      {addresses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Home size={22} />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">No saved addresses found</p>
            <p className="text-xs text-muted-foreground">Add your delivery address to proceed with checkout.</p>
          </div>
          <Button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 text-xs px-4 py-2 cursor-pointer gap-1.5"
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
                className={`relative flex flex-col justify-between rounded-xl border p-4 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-2xs ring-1 ring-primary'
                    : 'border-border bg-card hover:border-primary/30 hover:bg-muted/30'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-foreground">
                      {addr.full_name}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {addr.is_default && (
                        <Badge variant="outline" className="text-[10px] font-bold border-primary/30 text-primary py-0">
                          Default
                        </Badge>
                      )}
                      {isSelected && (
                        <CheckCircle2 size={16} className="text-primary fill-primary/20" />
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-foreground/80 leading-relaxed">
                    {addr.address_line_1}
                    {addr.address_line_2 ? `, ${addr.address_line_2}` : ''}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {addr.city}, {addr.state} - <span className="font-semibold text-foreground">{addr.postal_code}</span>
                  </p>

                  <div className="flex items-center gap-1.5 pt-1 text-xs text-muted-foreground">
                    <Phone size={12} className="text-primary/70" />
                    <span>{addr.mobile}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add New Address Dialog */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-card border border-border p-6 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <MapPin size={18} className="text-primary" />
              <span>Add Shipping Address</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Provide complete delivery details for accurate shipping and tracking.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
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
                  className="h-9 text-xs rounded-xl"
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
                  className="h-9 text-xs rounded-xl"
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
                className="h-9 text-xs rounded-xl"
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
                className="h-9 text-xs rounded-xl"
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
                  className="h-9 text-xs rounded-xl"
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
                  className="h-9 text-xs rounded-xl"
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
                  className="h-9 text-xs rounded-xl"
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
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
              />
              <Label htmlFor="is_default" className="text-xs font-medium text-foreground cursor-pointer">
                Make this my default shipping address
              </Label>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createAddressMutation.isPending}
                className="rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 text-xs px-5 cursor-pointer"
              >
                {createAddressMutation.isPending ? 'Saving...' : 'Save & Select'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default AddressSelector;

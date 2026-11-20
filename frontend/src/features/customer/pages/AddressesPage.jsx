import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MapPin,
  Plus,
  Edit2,
  Trash2,
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

export const AddressesPage = () => {
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [formError, setFormError] = useState('');

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

  const addresses = Array.isArray(addressesData)
    ? addressesData
    : addressesData?.results || [];

  // Create address mutation
  const createMutation = useMutation({
    mutationFn: (data) => authService.createAddress(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.addresses() });
      closeModal();
    },
    onError: (err) => {
      const data = err?.response?.data;
      if (typeof data === 'object') {
        const firstKey = Object.keys(data)[0];
        setFormError(`${firstKey}: ${data[firstKey]}`);
      } else {
        setFormError(err?.message || 'Failed to save address.');
      }
    },
  });

  // Update address mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => authService.updateAddress(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.addresses() });
      closeModal();
    },
    onError: (err) => {
      setFormError(err?.message || 'Failed to update address.');
    },
  });

  // Delete address mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => authService.deleteAddress(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.addresses() });
    },
  });

  // Set default mutation
  const setDefaultMutation = useMutation({
    mutationFn: (id) => authService.updateAddress(id, { is_default: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.addresses() });
    },
  });

  const openAddModal = () => {
    setEditingAddressId(null);
    setFormData({
      full_name: '',
      mobile: '',
      address_line_1: '',
      address_line_2: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'India',
      is_default: addresses.length === 0,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (addr) => {
    setEditingAddressId(addr.id);
    setFormData({
      full_name: addr.full_name,
      mobile: addr.mobile,
      address_line_1: addr.address_line_1,
      address_line_2: addr.address_line_2 || '',
      city: addr.city,
      state: addr.state,
      postal_code: addr.postal_code,
      country: addr.country || 'India',
      is_default: addr.is_default || false,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAddressId(null);
    setFormError('');
  };

  const handleSubmit = (e) => {
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

    if (editingAddressId) {
      updateMutation.mutate({ id: editingAddressId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
            Delivery Addresses
          </h1>
          <p className="text-xs text-muted-foreground">
            Manage your saved shipping and billing addresses for fast checkout.
          </p>
        </div>

        <Button
          type="button"
          onClick={openAddModal}
          className="h-10 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 text-xs px-4 shadow-xs gap-1.5 cursor-pointer shrink-0"
        >
          <Plus size={15} />
          <span>Add New Address</span>
        </Button>
      </div>

      {isLoading && (
        <div className="py-12 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 size={16} className="animate-spin text-primary" />
          <span>Loading delivery addresses...</span>
        </div>
      )}

      {isError && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive flex items-center gap-2">
          <AlertCircle size={16} />
          <span>Failed to load addresses. Please refresh and try again.</span>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && addresses.length === 0 && (
        <Card className="rounded-3xl border border-dashed border-border p-12 text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Home size={28} />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-foreground">No saved addresses</h2>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              You haven't saved any delivery addresses yet. Add one to speed up your future checkouts!
            </p>
          </div>
          <Button
            type="button"
            onClick={openAddModal}
            className="rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 text-xs px-5 shadow-xs cursor-pointer gap-1.5"
          >
            <Plus size={14} />
            <span>Add Delivery Address</span>
          </Button>
        </Card>
      )}

      {/* Address Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {addresses.map((addr) => (
          <Card
            key={addr.id}
            className={`flex flex-col justify-between rounded-2xl border p-5 transition-all ${
              addr.is_default
                ? 'border-primary/50 bg-primary/5 shadow-2xs'
                : 'border-border bg-card hover:border-primary/30'
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">
                    {addr.full_name}
                  </span>
                  {addr.is_default && (
                    <Badge variant="outline" className="text-[10px] font-bold border-primary/40 bg-primary/10 text-primary py-0">
                      Default
                    </Badge>
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
                <Phone size={12} className="text-primary" />
                <span>{addr.mobile}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between border-t border-border/80 pt-4 mt-4 text-xs">
              {!addr.is_default ? (
                <button
                  type="button"
                  onClick={() => setDefaultMutation.mutate(addr.id)}
                  disabled={setDefaultMutation.isPending}
                  className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                >
                  Set as default
                </button>
              ) : (
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Check size={12} className="text-primary" /> Default address
                </span>
              )}

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => openEditModal(addr)}
                  className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                >
                  <Edit2 size={13} />
                  <span>Edit</span>
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMutation.mutate(addr.id)}
                  disabled={deleteMutation.isPending}
                  className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1"
                >
                  <Trash2 size={13} />
                  <span>Delete</span>
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-card border border-border p-6 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <MapPin size={18} className="text-primary" />
              <span>{editingAddressId ? 'Edit Address' : 'Add New Address'}</span>
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

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="m_full_name" className="text-xs font-semibold">
                  Full Name *
                </Label>
                <Input
                  id="m_full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, full_name: e.target.value }))}
                  placeholder="Receiver name"
                  className="h-9 text-xs rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="m_mobile" className="text-xs font-semibold">
                  Mobile Number *
                </Label>
                <Input
                  id="m_mobile"
                  type="tel"
                  value={formData.mobile}
                  onChange={(e) => setFormData((prev) => ({ ...prev, mobile: e.target.value }))}
                  placeholder="10-digit number"
                  className="h-9 text-xs rounded-xl"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="m_address_1" className="text-xs font-semibold">
                House / Street Address *
              </Label>
              <Input
                id="m_address_1"
                value={formData.address_line_1}
                onChange={(e) => setFormData((prev) => ({ ...prev, address_line_1: e.target.value }))}
                placeholder="Building, street, flat"
                className="h-9 text-xs rounded-xl"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="m_address_2" className="text-xs font-semibold">
                Area / Landmark (Optional)
              </Label>
              <Input
                id="m_address_2"
                value={formData.address_line_2}
                onChange={(e) => setFormData((prev) => ({ ...prev, address_line_2: e.target.value }))}
                placeholder="Nearby landmark"
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="space-y-1.5">
                <Label htmlFor="m_city" className="text-xs font-semibold">
                  City *
                </Label>
                <Input
                  id="m_city"
                  value={formData.city}
                  onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                  placeholder="City"
                  className="h-9 text-xs rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="m_state" className="text-xs font-semibold">
                  State *
                </Label>
                <Input
                  id="m_state"
                  value={formData.state}
                  onChange={(e) => setFormData((prev) => ({ ...prev, state: e.target.value }))}
                  placeholder="State"
                  className="h-9 text-xs rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="m_postal" className="text-xs font-semibold">
                  PIN *
                </Label>
                <Input
                  id="m_postal"
                  value={formData.postal_code}
                  onChange={(e) => setFormData((prev) => ({ ...prev, postal_code: e.target.value }))}
                  placeholder="6 digits"
                  className="h-9 text-xs rounded-xl"
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                id="m_is_default"
                type="checkbox"
                checked={formData.is_default}
                onChange={(e) => setFormData((prev) => ({ ...prev, is_default: e.target.checked }))}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
              />
              <Label htmlFor="m_is_default" className="text-xs font-medium text-foreground cursor-pointer">
                Set as my default delivery address
              </Label>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={closeModal}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 text-xs px-5 cursor-pointer gap-1.5"
              >
                {(createMutation.isPending || updateMutation.isPending) ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Address</span>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AddressesPage;

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Eye,
  Mail,
  Phone,
  Calendar,
  AlertCircle,
  Loader2,
  Shield,
  UserCheck,
  UserX,
} from 'lucide-react';
import { adminService } from '../services/adminService.js';
import { queryKeys } from '../../../lib/queryClient.js';
import { ROUTE_PATHS } from '../../../routes/routePaths.js';
import { formatDate } from '../../../lib/utils.js';
import { Card } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Input } from '../../../components/ui/input.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../components/ui/alert-dialog.jsx';

const STATUS_FILTERS = [
  { label: 'All Users', value: '' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive / Banned', value: 'inactive' },
];

export const CustomersPage = () => {
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Status toggle confirmation
  const [customerToToggle, setCustomerToToggle] = useState(null);

  // Fetch customers
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.admin.customers({
      is_active: selectedStatus === 'active' ? true : selectedStatus === 'inactive' ? false : undefined,
      search: searchQuery || undefined,
    }),
    queryFn: () =>
      adminService.getCustomers({
        is_active: selectedStatus === 'active' ? true : selectedStatus === 'inactive' ? false : undefined,
        search: searchQuery || undefined,
      }),
  });

  // Toggle status mutation
  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }) => adminService.updateCustomerStatus(id, is_active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      setCustomerToToggle(null);
    },
  });

  const rawCustomers = Array.isArray(data) ? data : data?.results || [];
  const customers = rawCustomers.filter((user) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
    return (
      fullName.includes(q) ||
      user.email?.toLowerCase().includes(q) ||
      user.phone?.toLowerCase().includes(q)
    );
  });

  const handleConfirmToggle = () => {
    if (!customerToToggle) return;
    toggleMutation.mutate({
      id: customerToToggle.id,
      is_active: !customerToToggle.is_active,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
              Customer Accounts
            </h1>
            <Badge variant="secondary" className="font-bold text-xs">
              {customers.length}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage buyer profiles, inspect authentication status, and enforce account governance.
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <Card className="p-4 border-border/80 bg-card/60 backdrop-blur-xs space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-muted/60 p-1 rounded-xl">
            {STATUS_FILTERS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setSelectedStatus(tab.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  selectedStatus === tab.value
                    ? 'bg-card text-foreground shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by name, email, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs rounded-xl bg-card border-border"
            />
          </div>
        </div>
      </Card>

      {/* Customer List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-4 animate-pulse border-border bg-card">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-1/4 bg-muted rounded" />
                  <div className="h-3 w-1/3 bg-muted/60 rounded" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <Card className="p-8 text-center border-destructive/20 bg-destructive/5 space-y-3">
          <AlertCircle size={32} className="mx-auto text-destructive" />
          <h3 className="text-sm font-bold text-foreground">Failed to load customer accounts</h3>
          <p className="text-xs text-muted-foreground">Unable to fetch customer directory.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="cursor-pointer">
            Retry
          </Button>
        </Card>
      ) : customers.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-border bg-card/40 space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Users size={28} />
          </div>
          <h3 className="text-sm font-bold text-foreground">No accounts found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            No customer accounts matched your search criteria.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {customers.map((user) => {
            const fullName =
              [user.first_name, user.last_name].filter(Boolean).join(' ') ||
              user.name ||
              user.username ||
              'Anonymous User';
            const initial = fullName ? fullName[0].toUpperCase() : 'U';

            return (
              <Card
                key={user.id}
                className="p-4 border-border bg-card hover:border-primary/30 transition-all shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                {/* User Info */}
                <div className="flex items-center gap-3.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm ring-4 ring-primary/5">
                    {initial}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={ROUTE_PATHS.ADMIN.CUSTOMER_DETAILS(user.id)}
                        className="text-sm font-extrabold text-foreground hover:text-primary transition-colors"
                      >
                        {fullName}
                      </Link>
                      {user.is_active ? (
                        <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 font-bold text-[11px] py-0 gap-1">
                          <CheckCircle2 size={11} />
                          <span>Active</span>
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-rose-500/40 bg-rose-500/10 text-rose-600 font-bold text-[11px] py-0 gap-1">
                          <XCircle size={11} />
                          <span>Suspended</span>
                        </Badge>
                      )}
                      {user.role && (
                        <Badge variant="secondary" className="text-[10px] uppercase font-bold py-0">
                          {user.role}
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Mail size={12} className="text-primary/70" />
                        <span>{user.email || 'No email provided'}</span>
                      </span>

                      {user.phone && (
                        <span className="flex items-center gap-1">
                          <Phone size={12} className="text-primary/70" />
                          <span>{user.phone}</span>
                        </span>
                      )}

                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        <span>
                          Joined {formatDate(user.date_joined || user.created_at, { month: 'short', year: 'numeric' })}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="rounded-xl text-xs h-8 px-3 font-semibold text-muted-foreground hover:text-foreground cursor-pointer gap-1.5"
                  >
                    <Link to={ROUTE_PATHS.ADMIN.CUSTOMER_DETAILS(user.id)}>
                      <Eye size={13} />
                      <span>Details</span>
                    </Link>
                  </Button>

                  {user.is_active ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCustomerToToggle(user)}
                      className="rounded-xl border-rose-500/30 text-rose-600 hover:bg-rose-500/10 text-xs h-8 px-3 font-semibold gap-1.5 cursor-pointer"
                    >
                      <UserX size={13} />
                      <span>Deactivate</span>
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => setCustomerToToggle(user)}
                      className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-3 font-semibold gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <UserCheck size={13} />
                      <span>Activate</span>
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={!!customerToToggle} onOpenChange={(open) => !open && setCustomerToToggle(null)}>
        <AlertDialogContent className="rounded-2xl bg-card border-border sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
              <Shield size={18} className="text-primary" />
              <span>
                {customerToToggle?.is_active ? 'Deactivate Customer Account?' : 'Reactivate Customer Account?'}
              </span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              {customerToToggle?.is_active
                ? `Deactivating ${customerToToggle?.first_name || customerToToggle?.email} will revoke their login access and pause any ongoing checkout sessions.`
                : `Activating ${customerToToggle?.first_name || customerToToggle?.email} will restore their access to browse and purchase handcrafted goods.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl text-xs cursor-pointer">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmToggle}
              disabled={toggleMutation.isPending}
              className={`rounded-xl text-xs font-bold text-white cursor-pointer ${
                customerToToggle?.is_active
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {toggleMutation.isPending ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <span>Confirm {customerToToggle?.is_active ? 'Deactivation' : 'Activation'}</span>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CustomersPage;

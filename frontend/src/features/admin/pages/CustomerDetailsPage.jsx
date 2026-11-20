import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  Shield,
  CheckCircle2,
  XCircle,
  ShoppingBag,
  MapPin,
  Loader2,
  AlertCircle,
  UserCheck,
  UserX,
} from 'lucide-react';
import { adminService } from '../services/adminService.js';
import { queryKeys } from '../../../lib/queryClient.js';
import { ROUTE_PATHS } from '../../../routes/routePaths.js';
import { formatDate } from '../../../lib/utils.js';
import { Card } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Badge } from '../../../components/ui/badge.jsx';

export const CustomerDetailsPage = () => {
  const { id } = useParams();
  const queryClient = useQueryClient();

  const { data: customer, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.admin.customer(id),
    queryFn: () => adminService.getCustomer(id),
    enabled: !!id,
  });

  const toggleMutation = useMutation({
    mutationFn: (newStatus) => adminService.updateCustomerStatus(id, newStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 bg-muted rounded animate-pulse" />
        <Card className="p-8 border-border bg-card animate-pulse space-y-4">
          <div className="h-16 w-16 bg-muted rounded-full" />
          <div className="h-5 w-48 bg-muted rounded" />
          <div className="h-4 w-72 bg-muted/60 rounded" />
        </Card>
      </div>
    );
  }

  if (isError || !customer) {
    return (
      <Card className="p-10 text-center border-destructive/20 bg-destructive/5 space-y-4">
        <AlertCircle size={36} className="mx-auto text-destructive" />
        <h2 className="text-base font-extrabold text-foreground">Customer Not Found</h2>
        <p className="text-xs text-muted-foreground">
          Unable to locate the customer account matching ID #{id}.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <Button asChild variant="outline" size="sm" className="rounded-xl text-xs cursor-pointer">
            <Link to={ROUTE_PATHS.ADMIN.CUSTOMERS}>
              <ArrowLeft size={13} className="mr-1.5" />
              <span>Back to Directory</span>
            </Link>
          </Button>
          <Button size="sm" onClick={() => refetch()} className="rounded-xl text-xs cursor-pointer">
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  const fullName =
    [customer.first_name, customer.last_name].filter(Boolean).join(' ') ||
    customer.name ||
    customer.email ||
    'Anonymous User';
  const initial = fullName[0]?.toUpperCase() || 'U';

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link
          to={ROUTE_PATHS.ADMIN.CUSTOMERS}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={13} />
          <span>Back to Customer Directory</span>
        </Link>
      </div>

      {/* Customer Header Card */}
      <Card className="p-6 border-border bg-card shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-extrabold text-xl ring-8 ring-primary/5">
              {initial}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-extrabold text-foreground">{fullName}</h1>
                {customer.is_active ? (
                  <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 font-bold text-xs py-0.5 gap-1">
                    <CheckCircle2 size={12} />
                    <span>Active Account</span>
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-rose-500/40 bg-rose-500/10 text-rose-600 font-bold text-xs py-0.5 gap-1">
                    <XCircle size={12} />
                    <span>Suspended / Inactive</span>
                  </Badge>
                )}
                {customer.role && (
                  <Badge variant="secondary" className="font-bold text-[10px] uppercase">
                    {customer.role}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Customer ID: <code className="text-foreground font-mono text-[11px]">{customer.id}</code>
              </p>
            </div>
          </div>

          {/* Quick Action Toggle */}
          <div>
            {customer.is_active ? (
              <Button
                variant="outline"
                size="sm"
                disabled={toggleMutation.isPending}
                onClick={() => toggleMutation.mutate(false)}
                className="rounded-xl border-rose-500/30 text-rose-600 hover:bg-rose-500/10 text-xs font-bold gap-1.5 cursor-pointer"
              >
                {toggleMutation.isPending ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <UserX size={13} />
                )}
                <span>Deactivate Account</span>
              </Button>
            ) : (
              <Button
                size="sm"
                disabled={toggleMutation.isPending}
                onClick={() => toggleMutation.mutate(true)}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5 shadow-2xs cursor-pointer"
              >
                {toggleMutation.isPending ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <UserCheck size={13} />
                )}
                <span>Activate Account</span>
              </Button>
            )}
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-1">
            <span className="text-muted-foreground font-semibold flex items-center gap-1.5">
              <Mail size={13} className="text-primary" />
              <span>Email Address</span>
            </span>
            <p className="font-bold text-foreground truncate">{customer.email || 'Not provided'}</p>
          </div>

          <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-1">
            <span className="text-muted-foreground font-semibold flex items-center gap-1.5">
              <Phone size={13} className="text-primary" />
              <span>Contact Number</span>
            </span>
            <p className="font-bold text-foreground">{customer.phone || 'Not provided'}</p>
          </div>

          <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-1">
            <span className="text-muted-foreground font-semibold flex items-center gap-1.5">
              <Calendar size={13} className="text-primary" />
              <span>Registration Date</span>
            </span>
            <p className="font-bold text-foreground">
              {formatDate(customer.date_joined || customer.created_at, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>
      </Card>

      {/* Orders Overview / Activity */}
      <Card className="p-6 border-border bg-card shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <ShoppingBag size={16} className="text-primary" />
            <h2 className="text-sm font-extrabold text-foreground">Customer Activity & Orders</h2>
          </div>
          <Button asChild variant="outline" size="sm" className="rounded-xl text-xs h-8 cursor-pointer">
            <Link to={`${ROUTE_PATHS.ADMIN.ORDERS}?search=${encodeURIComponent(customer.email || '')}`}>
              <span>View All Orders</span>
            </Link>
          </Button>
        </div>

        {customer.orders && customer.orders.length > 0 ? (
          <div className="divide-y divide-border/60">
            {customer.orders.map((ord) => (
              <div key={ord.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-foreground">Order #{ord.order_number || ord.id}</span>
                  <span className="text-muted-foreground ml-2">
                    {new Date(ord.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-foreground">₹{ord.total_amount}</span>
                  <Badge variant="outline" className="text-[10px] font-bold">
                    {ord.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground py-2">
            No recent platform orders recorded for this customer profile yet.
          </p>
        )}
      </Card>
    </div>
  );
};

export default CustomerDetailsPage;

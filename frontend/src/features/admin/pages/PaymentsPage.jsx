import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  CreditCard,
  Search,
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
  Banknote,
  AlertCircle,
  Loader2,
  Calendar,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { adminService } from '../services/adminService.js';
import { queryKeys } from '../../../lib/queryClient.js';
import { ROUTE_PATHS } from '../../../routes/routePaths.js';
import { formatDate } from '../../../lib/utils.js';
import { Card } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Input } from '../../../components/ui/input.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { PriceDisplay } from '../../../components/common/PriceDisplay.jsx';
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

const METHOD_FILTERS = [
  { label: 'All Transactions', value: '' },
  { label: 'Cash on Delivery', value: 'cod' },
  { label: 'Online (Razorpay)', value: 'razorpay' },
];

export const PaymentsPage = () => {
  const queryClient = useQueryClient();
  const [selectedMethod, setSelectedMethod] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // COD confirmation alert dialog state
  const [paymentToConfirm, setPaymentToConfirm] = useState(null);

  // Fetch payments
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.payments.adminList({
      payment_method: selectedMethod || undefined,
      search: searchQuery || undefined,
    }),
    queryFn: () =>
      adminService.getPayments({
        payment_method: selectedMethod || undefined,
        search: searchQuery || undefined,
      }),
  });

  // Confirm COD mutation
  const confirmCodMutation = useMutation({
    mutationFn: (paymentId) => adminService.confirmCodCollection(paymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      setPaymentToConfirm(null);
    },
  });

  const rawPayments = Array.isArray(data) ? data : data?.results || [];
  const payments = rawPayments.filter((pmt) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const id = (pmt.id || '').toString().toLowerCase();
    const orderNum = (pmt.order_number || pmt.order || '').toString().toLowerCase();
    const ref = (pmt.transaction_reference || pmt.razorpay_payment_id || '').toLowerCase();
    const email = (pmt.customer_email || pmt.user?.email || '').toLowerCase();
    return id.includes(q) || orderNum.includes(q) || ref.includes(q) || email.includes(q);
  });

  const handleConfirmCod = () => {
    if (!paymentToConfirm) return;
    confirmCodMutation.mutate(paymentToConfirm.id);
  };

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'success':
      case 'paid':
        return (
          <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 font-bold text-xs py-0.5 gap-1">
            <CheckCircle2 size={11} />
            <span>Completed</span>
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="outline" className="border-rose-500/40 bg-rose-500/10 text-rose-600 font-bold text-xs py-0.5 gap-1">
            <XCircle size={11} />
            <span>Failed</span>
          </Badge>
        );
      case 'pending':
      default:
        return (
          <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-600 font-bold text-xs py-0.5 gap-1">
            <Clock size={11} />
            <span>Pending</span>
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
              Payments & COD Reconciliation
            </h1>
            <Badge variant="secondary" className="font-bold text-xs">
              {payments.length}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Audit platform payment transactions, inspect Razorpay mock gateways, and confirm physical COD cash collection.
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <Card className="p-4 border-border/80 bg-card/60 backdrop-blur-xs space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Method Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-muted/60 p-1 rounded-xl">
            {METHOD_FILTERS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setSelectedMethod(tab.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  selectedMethod === tab.value
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
              placeholder="Search ref #, order #, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs rounded-xl bg-card border-border"
            />
          </div>
        </div>
      </Card>

      {/* Payments List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-4 animate-pulse border-border bg-card">
              <div className="h-5 w-1/3 bg-muted rounded mb-2" />
              <div className="h-4 w-1/4 bg-muted/60 rounded" />
            </Card>
          ))}
        </div>
      ) : isError ? (
        <Card className="p-8 text-center border-destructive/20 bg-destructive/5 space-y-3">
          <AlertCircle size={32} className="mx-auto text-destructive" />
          <h3 className="text-sm font-bold text-foreground">Failed to load payments</h3>
          <p className="text-xs text-muted-foreground">Unable to fetch payment transactions.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="cursor-pointer">
            Retry
          </Button>
        </Card>
      ) : payments.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-border bg-card/40 space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <CreditCard size={28} />
          </div>
          <h3 className="text-sm font-bold text-foreground">No payments found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {selectedMethod
              ? `No transactions recorded for ${selectedMethod} method.`
              : 'No payment transactions matched your filters.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {payments.map((pmt) => {
            const isCod = pmt.payment_method?.toLowerCase() === 'cod';
            const isCompleted = ['completed', 'success', 'paid'].includes(pmt.status?.toLowerCase());
            const needsCodConfirm = isCod && !isCompleted;

            return (
              <Card
                key={pmt.id}
                className="p-4 border-border bg-card hover:border-primary/30 transition-all shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                      isCod ? 'bg-amber-500/10 text-amber-600' : 'bg-primary/10 text-primary'
                    }`}
                  >
                    {isCod ? <Banknote size={20} /> : <CreditCard size={20} />}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={ROUTE_PATHS.ADMIN.PAYMENT_DETAILS(pmt.id)}
                        className="text-sm font-extrabold text-foreground hover:text-primary transition-colors font-mono"
                      >
                        Payment #{pmt.id}
                      </Link>
                      {getStatusBadge(pmt.status)}

                      <Badge
                        variant="secondary"
                        className={`text-[10px] font-bold py-0 uppercase ${
                          isCod ? 'bg-amber-500/10 text-amber-600' : 'bg-primary/10 text-primary'
                        }`}
                      >
                        {isCod ? 'Cash on Delivery' : 'Razorpay Online'}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span>
                        Order:{' '}
                        <Link
                          to={ROUTE_PATHS.ADMIN.ORDER_DETAILS(pmt.order || pmt.order_id)}
                          className="font-bold text-foreground hover:underline"
                        >
                          #{pmt.order_number || pmt.order || 'N/A'}
                        </Link>
                      </span>
                      <span>•</span>
                      <span>{pmt.customer_email || pmt.user?.email || 'Customer'}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        <span>{formatDate(pmt.created_at)}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 self-stretch sm:self-center">
                  <div className="text-right">
                    <span className="text-[11px] text-muted-foreground block">Amount</span>
                    <PriceDisplay price={pmt.amount || '0'} size="md" />
                  </div>

                  <div className="flex items-center gap-2">
                    {needsCodConfirm && (
                      <Button
                        size="sm"
                        onClick={() => setPaymentToConfirm(pmt)}
                        className="rounded-xl font-bold bg-amber-600 hover:bg-amber-700 text-white text-xs h-8 px-3 gap-1 shadow-2xs cursor-pointer"
                      >
                        <Check size={13} />
                        <span>Confirm COD</span>
                      </Button>
                    )}

                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="rounded-xl text-xs h-8 px-3 font-semibold text-muted-foreground hover:text-foreground cursor-pointer gap-1.5"
                    >
                      <Link to={ROUTE_PATHS.ADMIN.PAYMENT_DETAILS(pmt.id)}>
                        <Eye size={13} />
                        <span>Audit</span>
                      </Link>
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Confirm COD Alert Dialog */}
      <AlertDialog open={!!paymentToConfirm} onOpenChange={(open) => !open && setPaymentToConfirm(null)}>
        <AlertDialogContent className="rounded-2xl bg-card border-border sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
              <Banknote size={18} className="text-amber-600" />
              <span>Confirm Physical COD Collection</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Confirm that cash of{' '}
              <strong className="text-foreground">₹{paymentToConfirm?.amount}</strong> for Order #
              {paymentToConfirm?.order_number || paymentToConfirm?.order} has been physically collected from the customer by courier and deposited into platform accounts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl text-xs cursor-pointer">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCod}
              disabled={confirmCodMutation.isPending}
              className="rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
            >
              {confirmCodMutation.isPending ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Confirming...</span>
                </>
              ) : (
                <span>Confirm Cash Received</span>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PaymentsPage;

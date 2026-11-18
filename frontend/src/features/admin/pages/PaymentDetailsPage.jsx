import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CreditCard,
  Banknote,
  CheckCircle2,
  Clock,
  XCircle,
  Calendar,
  ShoppingBag,
  ShieldCheck,
  AlertCircle,
  Loader2,
  User,
  Check,
} from 'lucide-react';
import { adminService } from '../services/adminService.js';
import { queryKeys } from '../../../lib/queryClient.js';
import { ROUTE_PATHS } from '../../../routes/routePaths.js';
import { formatDate } from '../../../lib/utils.js';
import { Card } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { PriceDisplay } from '../../../components/common/PriceDisplay.jsx';

export const PaymentDetailsPage = () => {
  const { id } = useParams();
  const queryClient = useQueryClient();

  const { data: payment, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.payments.adminDetail(id),
    queryFn: () => adminService.getPayment(id),
    enabled: !!id,
  });

  const confirmCodMutation = useMutation({
    mutationFn: () => adminService.confirmCodCollection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 bg-muted rounded animate-pulse" />
        <Card className="p-8 border-border bg-card animate-pulse space-y-4">
          <div className="h-6 w-48 bg-muted rounded" />
          <div className="h-4 w-72 bg-muted/60 rounded" />
        </Card>
      </div>
    );
  }

  if (isError || !payment) {
    return (
      <Card className="p-10 text-center border-destructive/20 bg-destructive/5 space-y-4">
        <AlertCircle size={36} className="mx-auto text-destructive" />
        <h2 className="text-base font-extrabold text-foreground">Transaction Record Not Found</h2>
        <p className="text-xs text-muted-foreground">
          Unable to locate payment transaction with ID #{id}.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <Button asChild variant="outline" size="sm" className="rounded-xl text-xs cursor-pointer">
            <Link to={ROUTE_PATHS.ADMIN.PAYMENTS}>
              <ArrowLeft size={13} className="mr-1.5" />
              <span>Back to Payments</span>
            </Link>
          </Button>
          <Button size="sm" onClick={() => refetch()} className="rounded-xl text-xs cursor-pointer">
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  const isCod = payment.payment_method?.toLowerCase() === 'cod';
  const isCompleted = ['completed', 'success', 'paid'].includes(payment.status?.toLowerCase());
  const needsCodConfirm = isCod && !isCompleted;
  const attempts = payment.attempts || [];

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link
          to={ROUTE_PATHS.ADMIN.PAYMENTS}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={13} />
          <span>Back to Payments Ledger</span>
        </Link>
      </div>

      {/* Transaction Header Banner */}
      <Card className="p-6 border-border bg-card shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-6">
          <div className="flex items-center gap-4">
            <div
              className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ring-8 ${
                isCod
                  ? 'bg-amber-500/10 text-amber-600 ring-amber-500/5'
                  : 'bg-primary/10 text-primary ring-primary/5'
              }`}
            >
              {isCod ? <Banknote size={32} /> : <CreditCard size={32} />}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-extrabold text-foreground font-mono">
                  Payment #{payment.id}
                </h1>
                {isCompleted ? (
                  <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 font-bold text-xs py-0.5 gap-1">
                    <CheckCircle2 size={12} />
                    <span>Completed</span>
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-600 font-bold text-xs py-0.5 gap-1">
                    <Clock size={12} />
                    <span>Pending</span>
                  </Badge>
                )}
                <Badge
                  variant="secondary"
                  className={`text-[10px] font-bold uppercase ${
                    isCod ? 'bg-amber-500/10 text-amber-600' : 'bg-primary/10 text-primary'
                  }`}
                >
                  {isCod ? 'Cash on Delivery' : 'Razorpay Simulated'}
                </Badge>
              </div>

              <p className="text-xs text-muted-foreground">
                Transaction Ref: <code className="font-mono text-foreground">{payment.transaction_reference || payment.razorpay_payment_id || 'N/A'}</code>
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-2">
            <div>
              <span className="text-xs text-muted-foreground block sm:text-right">Amount</span>
              <PriceDisplay price={payment.amount || '0'} size="lg" />
            </div>

            {needsCodConfirm && (
              <Button
                size="sm"
                disabled={confirmCodMutation.isPending}
                onClick={() => confirmCodMutation.mutate()}
                className="rounded-xl font-bold bg-amber-600 hover:bg-amber-700 text-white text-xs h-8 px-3 gap-1.5 shadow-2xs cursor-pointer"
              >
                {confirmCodMutation.isPending ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Check size={13} />
                )}
                <span>Confirm Cash Received</span>
              </Button>
            )}
          </div>
        </div>

        {/* Transaction Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-1">
            <span className="text-muted-foreground font-semibold flex items-center gap-1.5">
              <ShoppingBag size={13} className="text-primary" />
              <span>Associated Order</span>
            </span>
            <p className="font-bold text-foreground">
              <Link
                to={ROUTE_PATHS.ADMIN.ORDER_DETAILS(payment.order || payment.order_id)}
                className="hover:underline text-primary"
              >
                Order #{payment.order_number || payment.order || 'N/A'}
              </Link>
            </p>
          </div>

          <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-1">
            <span className="text-muted-foreground font-semibold flex items-center gap-1.5">
              <User size={13} className="text-primary" />
              <span>Customer</span>
            </span>
            <p className="font-bold text-foreground truncate">
              {payment.customer_name || payment.customer_email || 'Customer'}
            </p>
          </div>

          <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-1">
            <span className="text-muted-foreground font-semibold flex items-center gap-1.5">
              <Calendar size={13} className="text-primary" />
              <span>Created Timestamp</span>
            </span>
            <p className="font-bold text-foreground">
              {formatDate(payment.created_at)}
            </p>
          </div>
        </div>
      </Card>

      {/* Payment Attempts History */}
      <Card className="p-6 border-border bg-card shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <h2 className="text-sm font-extrabold text-foreground">Payment Gateway Attempts</h2>
        </div>

        {attempts.length === 0 ? (
          <p className="text-xs text-muted-foreground py-3 text-center">
            {isCod
              ? 'Cash on delivery transactions are logged directly without multi-attempt gateway handshakes.'
              : 'Single payment attempt recorded successfully.'}
          </p>
        ) : (
          <div className="divide-y divide-border/60">
            {attempts.map((att, idx) => (
              <div key={att.id || idx} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-foreground">Attempt #{idx + 1}</span>
                  <span className="text-muted-foreground ml-2">
                    {formatDate(att.created_at)}
                  </span>
                </div>
                <div>
                  <Badge variant="outline" className="text-[10px] font-bold">
                    {att.status || 'Processed'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default PaymentDetailsPage;

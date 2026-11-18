import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  CreditCard,
  Banknote,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { paymentService } from '../../checkout/services/paymentService.js';
import { queryKeys } from '../../../lib/queryClient.js';
import { ROUTE_PATHS } from '../../../routes/routePaths.js';
import { Card } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { PriceDisplay } from '../../../components/common/PriceDisplay.jsx';

export const PaymentsPage = () => {
  const { data: paymentsData, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.payments.list(),
    queryFn: () => paymentService.getPayments(),
  });

  const payments = Array.isArray(paymentsData) ? paymentsData : paymentsData?.results || [];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'successful':
        return (
          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 font-bold text-xs py-0.5 gap-1">
            <CheckCircle2 size={12} />
            <span>Successful</span>
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-600 font-bold text-xs py-0.5 gap-1">
            <Clock size={12} />
            <span>Pending</span>
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive" className="font-bold text-xs py-0.5 gap-1">
            <XCircle size={12} />
            <span>Failed</span>
          </Badge>
        );
      default:
        return <Badge variant="outline" className="capitalize text-xs py-0.5">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
            Payment History
          </h1>
          <p className="text-xs text-muted-foreground">
            Complete transaction ledger of your online and Cash on Delivery payments.
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground rounded-xl border border-border bg-card px-3 py-1.5 shadow-2xs">
          <ShieldCheck size={14} className="text-primary" />
          <span>PCI-DSS Compliant</span>
        </div>
      </div>

      {isLoading && (
        <div className="py-16 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 size={16} className="animate-spin text-primary" />
          <span>Loading transaction history...</span>
        </div>
      )}

      {isError && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5 text-center space-y-2">
          <p className="text-xs text-destructive font-semibold">Failed to load transactions.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs">
            Retry
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && payments.length === 0 && (
        <Card className="rounded-3xl border border-dashed border-border p-12 text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <CreditCard size={28} />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-foreground">No payments recorded</h2>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Your payment receipts and status updates will be listed here after you make purchases.
            </p>
          </div>
          <Button asChild className="rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 text-xs px-5 shadow-xs">
            <Link to={ROUTE_PATHS.STOREFRONT.PRODUCTS}>Shop Now</Link>
          </Button>
        </Card>
      )}

      {/* Payments List / Table */}
      <div className="space-y-3">
        {payments.map((payment) => {
          const isCOD = payment.method === 'cod';
          return (
            <Card
              key={payment.id}
              className="p-5 rounded-2xl border border-border bg-card hover:border-primary/30 transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-foreground">
                    {isCOD ? <Banknote size={15} className="text-emerald-600" /> : <CreditCard size={15} className="text-primary" />}
                  </div>
                  <div>
                    <span className="font-bold text-foreground capitalize">
                      {isCOD ? 'Cash on Delivery' : 'Online Payment (Razorpay)'}
                    </span>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      TXN #{payment.id.slice(0, 13)}...
                    </p>
                  </div>
                  {getStatusBadge(payment.status)}
                </div>

                <div className="flex items-center gap-2 text-muted-foreground text-[11px] pl-10.5">
                  <Calendar size={11} />
                  <span>
                    {payment.paid_at
                      ? new Date(payment.paid_at).toLocaleString('en-IN')
                      : 'Pending Fulfillment'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-5 border-t border-border/60 pt-3 sm:border-0 sm:pt-0">
                <div className="text-right">
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                    Amount
                  </span>
                  <PriceDisplay price={payment.amount} size="md" className="font-extrabold text-foreground" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default PaymentsPage;

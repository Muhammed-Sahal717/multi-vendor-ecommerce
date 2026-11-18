import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Receipt,
  Calendar,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { sellerService } from '../services/sellerService.js';
import { queryKeys } from '../../../lib/queryClient.js';
import { ROUTE_PATHS } from '../../../routes/routePaths.js';
import { Card } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { PriceDisplay } from '../../../components/common/PriceDisplay.jsx';

export const PayoutHistoryPage = () => {
  const { data: payoutsData, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.seller.payouts(),
    queryFn: () => sellerService.getPayoutHistory(),
  });

  const payouts = Array.isArray(payoutsData) ? payoutsData : payoutsData?.results || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div>
          <Link
            to={ROUTE_PATHS.SELLER.EARNINGS_DASHBOARD}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors mb-1"
          >
            <ArrowLeft size={13} />
            <span>Back to Earnings Dashboard</span>
          </Link>
          <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
            Bank Payout History
          </h1>
          <p className="text-xs text-muted-foreground">
            Complete transaction record of platform settlements transferred to your bank.
          </p>
        </div>

        <div className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground shadow-2xs">
          <ShieldCheck size={14} className="text-primary" />
          <span>Automated NEFT / IMPS Settlements</span>
        </div>
      </div>

      {isLoading && (
        <div className="py-16 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 size={16} className="animate-spin text-primary" />
          <span>Loading payout records...</span>
        </div>
      )}

      {isError && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5 text-center space-y-2">
          <p className="text-xs text-destructive font-semibold">Failed to load payouts.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs">
            Retry
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && payouts.length === 0 && (
        <Card className="rounded-3xl border border-dashed border-border p-12 text-center space-y-3">
          <Receipt size={28} className="mx-auto text-muted-foreground opacity-60" />
          <h2 className="text-base font-bold text-foreground">No payout records found</h2>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Once customer orders are delivered, your balance accumulates and will be settled weekly.
          </p>
        </Card>
      )}

      {/* Payouts List */}
      <div className="space-y-3">
        {payouts.map((payout) => (
          <Card
            key={payout.id}
            className="p-5 rounded-2xl border border-border bg-card hover:border-primary/30 transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <span className="font-mono font-bold text-sm text-foreground">
                  Ref: {payout.transaction_reference || payout.id.slice(0, 12)}
                </span>
                <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 font-bold text-[11px] gap-1 py-0">
                  <CheckCircle2 size={12} />
                  <span>Settled</span>
                </Badge>
              </div>

              <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <Calendar size={12} className="text-primary" />
                <span>
                  Disbursed on{' '}
                  {payout.payout_date
                    ? new Date(payout.payout_date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })
                    : new Date(payout.created_at).toLocaleDateString('en-IN')}
                </span>
              </p>

              {payout.notes && <p className="text-muted-foreground text-[11px]">{payout.notes}</p>}
            </div>

            <div className="sm:text-right border-t border-border/60 pt-3 sm:border-0 sm:pt-0">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                Disbursed Amount
              </span>
              <PriceDisplay price={payout.amount} size="lg" className="font-extrabold text-emerald-600 dark:text-emerald-400" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PayoutHistoryPage;

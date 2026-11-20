import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  Calendar,
  ArrowLeft,
  Loader2,
  DollarSign,
} from 'lucide-react';
import { sellerService } from '../services/sellerService.js';
import { queryKeys } from '../../../lib/queryClient.js';
import { ROUTE_PATHS } from '../../../routes/routePaths.js';
import { Card } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { PriceDisplay } from '../../../components/common/PriceDisplay.jsx';

export const EarningsHistoryPage = () => {
  const { data: earningsData, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.seller.earnings(),
    queryFn: () => sellerService.getEarningsHistory(),
  });

  const earnings = Array.isArray(earningsData) ? earningsData : earningsData?.results || [];

  return (
    <div className="space-y-6">
      <div className="space-y-1 border-b border-border pb-4">
        <Link
          to={ROUTE_PATHS.SELLER.EARNINGS_DASHBOARD}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors mb-1"
        >
          <ArrowLeft size={13} />
          <span>Back to Revenue Dashboard</span>
        </Link>
        <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
          Order Earnings Breakdown
        </h1>
        <p className="text-xs text-muted-foreground">
          Item-by-item commission deductions and net proceeds.
        </p>
      </div>

      {isLoading && (
        <div className="py-16 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 size={16} className="animate-spin text-primary" />
          <span>Loading earnings ledger...</span>
        </div>
      )}

      {isError && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5 text-center space-y-2">
          <p className="text-xs text-destructive font-semibold">Failed to load earnings records.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs">
            Retry
          </Button>
        </div>
      )}

      {!isLoading && earnings.length === 0 && (
        <Card className="rounded-3xl border border-dashed border-border p-12 text-center space-y-3">
          <DollarSign size={28} className="mx-auto text-muted-foreground opacity-60" />
          <h2 className="text-base font-bold text-foreground">No earnings recorded yet</h2>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Earnings records are created when customer orders are placed and processed.
          </p>
        </Card>
      )}

      <div className="space-y-3">
        {earnings.map((earning) => (
          <Card
            key={earning.id}
            className="p-5 rounded-2xl border border-border bg-card hover:border-primary/30 transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs"
          >
            <div className="space-y-1">
              <span className="font-mono font-bold text-sm text-foreground">
                Order Item #{earning.order_item?.slice(0, 8) || earning.id.slice(0, 8)}
              </span>
              <p className="text-muted-foreground flex items-center gap-1 text-[11px]">
                <Calendar size={11} />
                <span>{new Date(earning.created_at).toLocaleDateString('en-IN')}</span>
              </p>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-6 border-t border-border/60 pt-3 sm:border-0 sm:pt-0">
              <div className="text-right">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Gross</span>
                <PriceDisplay price={earning.gross_amount} size="sm" className="font-semibold text-foreground" />
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Commission</span>
                <PriceDisplay price={earning.commission_amount} size="sm" className="font-semibold text-destructive" />
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Net</span>
                <PriceDisplay price={earning.net_amount} size="md" className="font-extrabold text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default EarningsHistoryPage;

import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  DollarSign,
  Receipt,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Loader2,
} from 'lucide-react';
import { sellerService } from '../services/sellerService.js';
import { queryKeys } from '../../../lib/queryClient.js';
import { ROUTE_PATHS } from '../../../routes/routePaths.js';
import { Card } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { PriceDisplay } from '../../../components/common/PriceDisplay.jsx';

export const EarningsDashboardPage = () => {
  // Fetch earnings summary
  const { data: summary, isLoading } = useQuery({
    queryKey: queryKeys.seller.dashboard(),
    queryFn: sellerService.getEarningsDashboard,
  });

  // Fetch recent payouts
  const { data: payoutsData } = useQuery({
    queryKey: queryKeys.seller.payouts(),
    queryFn: () => sellerService.getPayoutHistory({ page_size: 5 }),
  });

  const payouts = Array.isArray(payoutsData) ? payoutsData : payoutsData?.results || [];

  if (isLoading) {
    return (
      <div className="py-16 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
        <Loader2 size={16} className="animate-spin text-primary" />
        <span>Loading earnings & financials...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
            Artisan Revenue & Financials
          </h1>
          <p className="text-xs text-muted-foreground">
            Transparent breakdown of your customer sales, platform commissions, and bank payouts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="rounded-xl text-xs font-semibold gap-1.5 border-border">
            <Link to={ROUTE_PATHS.SELLER.PAYOUT_HISTORY}>
              <Receipt size={14} />
              <span>Payout Ledger</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* 1. Main Earnings Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Gross Revenue */}
        <Card className="rounded-2xl border border-border bg-card p-6 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Gross Sales
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <TrendingUp size={16} />
            </div>
          </div>
          <PriceDisplay
            price={summary?.total_gross_earnings || 0}
            size="lg"
            className="text-2xl font-extrabold text-foreground"
          />
          <p className="text-[11px] text-muted-foreground">Total customer order payments</p>
        </Card>

        {/* Net Earnings */}
        <Card className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Net Earnings
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <DollarSign size={16} />
            </div>
          </div>
          <PriceDisplay
            price={summary?.total_net_earnings || 0}
            size="lg"
            className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400"
          />
          <p className="text-[11px] text-muted-foreground">
            Minus <PriceDisplay price={summary?.total_commission_deducted || 0} size="sm" /> platform fee
          </p>
        </Card>

        {/* Pending Payout */}
        <Card className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Available for Payout
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
              <Clock size={16} />
            </div>
          </div>
          <PriceDisplay
            price={summary?.pending_payout_balance || 0}
            size="lg"
            className="text-2xl font-extrabold text-amber-600 dark:text-amber-400"
          />
          <p className="text-[11px] text-muted-foreground">Disbursed on weekly settlement cycles</p>
        </Card>
      </div>

      {/* 2. Payout Summary Overview */}
      <Card className="p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Recent Bank Payouts</h2>
            <p className="text-xs text-muted-foreground">Disbursements directly transferred to your bank account.</p>
          </div>
          <Button asChild variant="ghost" size="sm" className="text-xs font-semibold text-primary gap-1">
            <Link to={ROUTE_PATHS.SELLER.PAYOUT_HISTORY}>
              <span>View All Payouts</span>
              <ArrowRight size={13} />
            </Link>
          </Button>
        </div>

        {payouts.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <Receipt size={24} className="mx-auto text-muted-foreground opacity-60" />
            <p className="text-xs font-semibold text-foreground">No payouts processed yet</p>
            <p className="text-[11px] text-muted-foreground">
              When orders are successfully delivered, your pending balance is cleared and disbursed weekly.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {payouts.map((payout) => (
              <div key={payout.id} className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-foreground">
                      Ref: {payout.transaction_reference || payout.id.slice(0, 10)}
                    </span>
                    <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 font-bold text-[10px] py-0">
                      Paid
                    </Badge>
                  </div>
                  <p className="text-muted-foreground flex items-center gap-1">
                    <Calendar size={11} />
                    <span>
                      {payout.payout_date
                        ? new Date(payout.payout_date).toLocaleDateString('en-IN')
                        : new Date(payout.created_at).toLocaleDateString('en-IN')}
                    </span>
                  </p>
                </div>

                <div className="sm:text-right">
                  <PriceDisplay price={payout.amount} size="md" className="font-extrabold text-foreground" />
                  {payout.notes && <p className="text-[10px] text-muted-foreground">{payout.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default EarningsDashboardPage;

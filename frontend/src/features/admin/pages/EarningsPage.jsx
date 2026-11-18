import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  Receipt,
  Search,
  Store,
  DollarSign,
  ArrowUpRight,
  AlertCircle,
  Loader2,
  Calendar,
  Eye,
  Plus,
} from 'lucide-react';
import { adminService } from '../services/adminService.js';
import { queryKeys } from '../../../lib/queryClient.js';
import { ROUTE_PATHS } from '../../../routes/routePaths.js';
import { Card } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Input } from '../../../components/ui/input.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { PriceDisplay } from '../../../components/common/PriceDisplay.jsx';

export const EarningsPage = () => {
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch admin earnings overview
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.admin.earnings(),
    queryFn: () => adminService.getSellerEarningsOverview(),
  });

  const rawOverview = Array.isArray(data) ? data : data?.results || data?.sellers || [];
  const sellersEarnings = rawOverview.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = (item.store_name || item.seller_name || item.business_name || '').toLowerCase();
    return name.includes(q);
  });

  // Calculate platform totals
  const totalGmv = sellersEarnings.reduce((acc, s) => acc + (Number(s.gross_sales || s.total_sales || s.gmv) || 0), 0);
  const totalCommission = sellersEarnings.reduce((acc, s) => acc + (Number(s.commission || s.total_commission) || 0), 0);
  const totalNet = sellersEarnings.reduce((acc, s) => acc + (Number(s.net_earnings || s.total_net) || 0), 0);
  const totalPending = sellersEarnings.reduce((acc, s) => acc + (Number(s.pending_balance || s.outstanding_balance) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
              Platform Revenue & Commissions
            </h1>
            <Badge variant="secondary" className="font-bold text-xs">
              Overview
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitor GMV across artisan categories, track platform retained fees, and manage seller payout obligations.
          </p>
        </div>

        <Button
          asChild
          size="sm"
          className="rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground text-xs shadow-2xs gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <Link to={ROUTE_PATHS.ADMIN.SELLER_PAYOUTS}>
            <Receipt size={14} />
            <span>Manage Payouts</span>
          </Link>
        </Button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border-border bg-card shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Platform GMV</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <TrendingUp size={16} />
            </div>
          </div>
          <PriceDisplay price={totalGmv} size="xl" />
          <p className="text-[11px] text-muted-foreground">Cumulative gross sales value</p>
        </Card>

        <Card className="p-5 border-border bg-card shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Commissions Retained</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <DollarSign size={16} />
            </div>
          </div>
          <PriceDisplay price={totalCommission} size="xl" />
          <p className="text-[11px] text-muted-foreground">Platform revenue from seller fees</p>
        </Card>

        <Card className="p-5 border-border bg-card shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Net Artisan Earnings</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
              <Store size={16} />
            </div>
          </div>
          <PriceDisplay price={totalNet} size="xl" />
          <p className="text-[11px] text-muted-foreground">Total payout share for artisans</p>
        </Card>

        <Card className="p-5 border-border bg-card shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Pending Payouts Balance</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
              <Receipt size={16} />
            </div>
          </div>
          <PriceDisplay price={totalPending} size="xl" />
          <p className="text-[11px] text-muted-foreground">Outstanding payable to sellers</p>
        </Card>
      </div>

      {/* Toolbar */}
      <Card className="p-4 border-border/80 bg-card/60 backdrop-blur-xs">
        <div className="relative w-full sm:w-80">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search seller or workshop name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs rounded-xl bg-card border-border"
          />
        </div>
      </Card>

      {/* Seller Revenue Breakdown Table */}
      <Card className="border-border bg-card shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-border/60">
          <h2 className="text-sm font-extrabold text-foreground">Seller-Wise Earnings Ledger</h2>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          <div className="p-8 text-center space-y-3">
            <AlertCircle size={32} className="mx-auto text-destructive" />
            <p className="text-xs text-muted-foreground">Failed to load seller earnings data.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="cursor-pointer">
              Retry
            </Button>
          </div>
        ) : sellersEarnings.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <Receipt size={28} className="mx-auto text-muted-foreground" />
            <p className="text-xs text-muted-foreground">No seller earnings data recorded yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border/60">
                <tr>
                  <th className="py-3 px-4">Artisan Seller</th>
                  <th className="py-3 px-4 text-right">Gross GMV</th>
                  <th className="py-3 px-4 text-right">Commission</th>
                  <th className="py-3 px-4 text-right">Net Share</th>
                  <th className="py-3 px-4 text-right">Pending Balance</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {sellersEarnings.map((seller, idx) => (
                  <tr key={seller.id || seller.seller_id || idx} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4">
                      <Link
                        to={ROUTE_PATHS.ADMIN.SELLER_DETAILS(seller.id || seller.seller_id)}
                        className="font-bold text-foreground hover:text-primary transition-colors block"
                      >
                        {seller.store_name || seller.seller_name || 'Artisan Workshop'}
                      </Link>
                      <span className="text-[11px] text-muted-foreground">
                        {seller.business_email || seller.email || ''}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-medium">
                      ₹{seller.gross_sales || seller.total_sales || '0.00'}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-emerald-600">
                      ₹{seller.commission || seller.total_commission || '0.00'}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-foreground">
                      ₹{seller.net_earnings || seller.total_net || '0.00'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-amber-600">
                      ₹{seller.pending_balance || seller.outstanding_balance || '0.00'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="rounded-xl text-xs h-7 px-2.5 font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <Link to={`${ROUTE_PATHS.ADMIN.SELLER_PAYOUTS}?seller=${seller.id || seller.seller_id}`}>
                          <span>Payouts</span>
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default EarningsPage;

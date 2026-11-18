import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Store,
  Mail,
  MapPin,
  Calendar,
  CheckCircle2,
  XCircle,
  Package,
  Receipt,
  TrendingUp,
  Loader2,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  Building,
  CreditCard,
  Plus,
} from 'lucide-react';
import { adminService } from '../services/adminService.js';
import { queryKeys } from '../../../lib/queryClient.js';
import { ROUTE_PATHS } from '../../../routes/routePaths.js';
import { formatDate } from '../../../lib/utils.js';
import { Card } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../components/ui/tabs.jsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../../components/ui/dialog.jsx';
import { Input } from '../../../components/ui/input.jsx';
import { Label } from '../../../components/ui/label.jsx';
import { Textarea } from '../../../components/ui/textarea.jsx';

export const SellerDetailsPage = () => {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutRef, setPayoutRef] = useState('');
  const [payoutNotes, setPayoutNotes] = useState('');
  const [payoutError, setPayoutError] = useState('');

  // 1. Fetch Seller Details
  const {
    data: seller,
    isLoading: isSellerLoading,
    isError: isSellerError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.admin.seller(id),
    queryFn: () => adminService.getSeller(id),
    enabled: !!id,
  });

  // 2. Fetch Seller Earnings
  const { data: earningsData } = useQuery({
    queryKey: queryKeys.admin.sellerEarnings(id),
    queryFn: () => adminService.getSellerEarnings(id),
    enabled: !!id,
  });

  // 3. Fetch Seller Payouts
  const { data: payoutsData } = useQuery({
    queryKey: queryKeys.admin.sellerPayouts(id),
    queryFn: () => adminService.getSellerPayouts(id),
    enabled: !!id,
  });

  // Toggle seller active/suspended status
  const toggleStatusMutation = useMutation({
    mutationFn: (newStatus) => adminService.updateSellerStatus(id, newStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
  });

  // Record payout mutation
  const payoutMutation = useMutation({
    mutationFn: (payload) => adminService.recordSellerPayout(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      setIsPayoutModalOpen(false);
      setPayoutAmount('');
      setPayoutRef('');
      setPayoutNotes('');
      setPayoutError('');
    },
    onError: (err) => {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.amount?.[0] ||
        err?.message ||
        'Failed to record payout.';
      setPayoutError(msg);
    },
  });

  const handleRecordPayout = () => {
    if (!payoutAmount || Number(payoutAmount) <= 0) {
      setPayoutError('Please provide a valid payout amount.');
      return;
    }
    if (!payoutRef.trim()) {
      setPayoutError('Please provide a transaction reference number (e.g. UTR / NEFT / IMPS).');
      return;
    }
    payoutMutation.mutate({
      amount: payoutAmount,
      transaction_reference: payoutRef.trim(),
      notes: payoutNotes.trim(),
    });
  };

  if (isSellerLoading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 bg-muted rounded animate-pulse" />
        <Card className="p-8 border-border bg-card animate-pulse space-y-4">
          <div className="h-16 w-16 bg-muted rounded-2xl" />
          <div className="h-5 w-48 bg-muted rounded" />
          <div className="h-4 w-72 bg-muted/60 rounded" />
        </Card>
      </div>
    );
  }

  if (isSellerError || !seller) {
    return (
      <Card className="p-10 text-center border-destructive/20 bg-destructive/5 space-y-4">
        <AlertCircle size={36} className="mx-auto text-destructive" />
        <h2 className="text-base font-extrabold text-foreground">Seller Not Found</h2>
        <p className="text-xs text-muted-foreground">
          Unable to find the artisan seller profile with ID #{id}.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <Button asChild variant="outline" size="sm" className="rounded-xl text-xs cursor-pointer">
            <Link to={ROUTE_PATHS.ADMIN.SELLERS}>
              <ArrowLeft size={13} className="mr-1.5" />
              <span>Back to Sellers</span>
            </Link>
          </Button>
          <Button size="sm" onClick={() => refetch()} className="rounded-xl text-xs cursor-pointer">
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  const storeName = seller.store_name || seller.business_name || 'Artisan Workshop';
  const isActive = seller.status === 'active';
  const earningsList = Array.isArray(earningsData) ? earningsData : earningsData?.results || [];
  const payoutsList = Array.isArray(payoutsData) ? payoutsData : payoutsData?.results || [];

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link
          to={ROUTE_PATHS.ADMIN.SELLERS}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={13} />
          <span>Back to Artisan Sellers</span>
        </Link>
      </div>

      {/* Seller Header Profile */}
      <Card className="p-6 border-border bg-card shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary font-extrabold ring-8 ring-primary/5">
              <Store size={32} />
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-extrabold text-foreground">{storeName}</h1>
                {isActive ? (
                  <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 font-bold text-xs py-0.5 gap-1">
                    <CheckCircle2 size={12} />
                    <span>Active Store</span>
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-rose-500/40 bg-rose-500/10 text-rose-600 font-bold text-xs py-0.5 gap-1">
                    <XCircle size={12} />
                    <span>Suspended</span>
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Artisan Seller ID: <code className="font-mono text-foreground">{seller.id}</code>
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={() => setIsPayoutModalOpen(true)}
              className="rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground text-xs shadow-2xs gap-1.5 cursor-pointer"
            >
              <Plus size={14} />
              <span>Record Payout</span>
            </Button>

            {isActive ? (
              <Button
                variant="outline"
                size="sm"
                disabled={toggleStatusMutation.isPending}
                onClick={() => toggleStatusMutation.mutate('suspended')}
                className="rounded-xl border-rose-500/30 text-rose-600 hover:bg-rose-500/10 text-xs font-semibold gap-1.5 cursor-pointer"
              >
                {toggleStatusMutation.isPending ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <ShieldAlert size={13} />
                )}
                <span>Suspend Store</span>
              </Button>
            ) : (
              <Button
                size="sm"
                disabled={toggleStatusMutation.isPending}
                onClick={() => toggleStatusMutation.mutate('active')}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5 shadow-2xs cursor-pointer"
              >
                {toggleStatusMutation.isPending ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <ShieldCheck size={13} />
                )}
                <span>Reactivate Store</span>
              </Button>
            )}
          </div>
        </div>

        {/* Contact & Bio Info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-1">
            <span className="text-muted-foreground font-semibold flex items-center gap-1.5">
              <Store size={13} className="text-primary" />
              <span>Artisan / Owner</span>
            </span>
            <p className="font-bold text-foreground">
              {seller.owner_name || seller.user?.name || seller.user?.email || 'N/A'}
            </p>
          </div>

          <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-1">
            <span className="text-muted-foreground font-semibold flex items-center gap-1.5">
              <Mail size={13} className="text-primary" />
              <span>Business Email</span>
            </span>
            <p className="font-bold text-foreground truncate">{seller.business_email || seller.email || 'N/A'}</p>
          </div>

          <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-1">
            <span className="text-muted-foreground font-semibold flex items-center gap-1.5">
              <MapPin size={13} className="text-primary" />
              <span>Workshop City</span>
            </span>
            <p className="font-bold text-foreground">
              {[seller.city, seller.state, seller.country].filter(Boolean).join(', ') || 'N/A'}
            </p>
          </div>
        </div>

        {seller.bio && (
          <div className="rounded-xl bg-muted/30 p-3.5 text-xs text-muted-foreground">
            <span className="font-bold text-foreground">Artisan Bio & Craft Story: </span>
            {seller.bio}
          </div>
        )}
      </Card>

      {/* Tabs for Earnings & Payouts */}
      <Tabs defaultValue="earnings" className="space-y-4">
        <TabsList className="bg-card border border-border p-1 rounded-xl">
          <TabsTrigger value="earnings" className="rounded-lg text-xs font-bold gap-1.5">
            <TrendingUp size={13} />
            <span>Earnings Ledger ({earningsList.length})</span>
          </TabsTrigger>
          <TabsTrigger value="payouts" className="rounded-lg text-xs font-bold gap-1.5">
            <Receipt size={13} />
            <span>Payout Records ({payoutsList.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Earnings Breakdown */}
        <TabsContent value="earnings">
          <Card className="p-6 border-border bg-card shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h2 className="text-sm font-extrabold text-foreground">Item-Wise Earnings Breakdown</h2>
            </div>

            {earningsList.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                No item-wise earnings records available for this seller yet.
              </p>
            ) : (
              <div className="divide-y divide-border/60">
                {earningsList.map((item, idx) => (
                  <div key={item.id || idx} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div>
                      <p className="font-bold text-foreground">{item.product_title || `Order #${item.order_id || 'N/A'}`}</p>
                      <p className="text-muted-foreground text-[11px]">
                        Sale Date: {formatDate(item.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Gross</span>
                        <span className="font-bold text-foreground">₹{item.gross_amount || item.amount || '0'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Platform Fee</span>
                        <span className="font-bold text-primary">₹{item.commission_amount || '0'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Net Payout</span>
                        <span className="font-bold text-emerald-600">₹{item.net_amount || '0'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Tab 2: Payout Records */}
        <TabsContent value="payouts">
          <Card className="p-6 border-border bg-card shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h2 className="text-sm font-extrabold text-foreground">Disbursed Bank Payouts</h2>
              <Button
                size="sm"
                onClick={() => setIsPayoutModalOpen(true)}
                className="rounded-xl text-xs font-bold bg-primary text-primary-foreground h-8 cursor-pointer"
              >
                + Disburse Payout
              </Button>
            </div>

            {payoutsList.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                No previous payouts recorded for this seller.
              </p>
            ) : (
              <div className="divide-y divide-border/60">
                {payoutsList.map((payout, idx) => (
                  <div key={payout.id || idx} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground text-sm">₹{payout.amount}</span>
                        <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 font-bold text-[10px]">
                          Completed
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-[11px] mt-0.5">
                        Ref: <code className="font-mono text-foreground">{payout.transaction_reference || 'N/A'}</code>
                      </p>
                      {payout.notes && <p className="text-muted-foreground text-[11px]">{payout.notes}</p>}
                    </div>

                    <span className="text-xs text-muted-foreground">
                      {formatDate(payout.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Record Payout Modal Dialog */}
      <Dialog open={isPayoutModalOpen} onOpenChange={setIsPayoutModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
              <Receipt size={18} className="text-primary" />
              <span>Record Bank Payout</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Record a manual bank disbursement to{' '}
              <strong className="text-foreground">{storeName}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="payoutAmt" className="text-xs font-bold text-foreground">
                Disbursement Amount (₹)
              </Label>
              <Input
                id="payoutAmt"
                type="number"
                step="0.01"
                placeholder="e.g. 15400"
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                className="text-xs rounded-xl bg-background border-border"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="payoutRef" className="text-xs font-bold text-foreground">
                Bank Reference / UTR Number
              </Label>
              <Input
                id="payoutRef"
                type="text"
                placeholder="e.g. UTR98234827103"
                value={payoutRef}
                onChange={(e) => setPayoutRef(e.target.value)}
                className="text-xs rounded-xl bg-background border-border"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="payoutNotes" className="text-xs font-bold text-foreground">
                Notes (Optional)
              </Label>
              <Textarea
                id="payoutNotes"
                placeholder="e.g. Monthly settlement for handloom textile orders..."
                value={payoutNotes}
                onChange={(e) => setPayoutNotes(e.target.value)}
                className="text-xs rounded-xl min-h-[70px] bg-background border-border"
              />
            </div>

            {payoutError && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/30 p-2.5 text-xs text-destructive font-medium flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{payoutError}</span>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsPayoutModalOpen(false)}
              className="rounded-xl text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={payoutMutation.isPending}
              onClick={handleRecordPayout}
              className="rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xs gap-1.5 cursor-pointer"
            >
              {payoutMutation.isPending ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Recording...</span>
                </>
              ) : (
                <span>Confirm Disbursement</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SellerDetailsPage;

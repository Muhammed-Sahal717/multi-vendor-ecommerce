import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Receipt,
  Plus,
  Search,
  Store,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Loader2,
  DollarSign,
  ArrowLeft,
  Building,
} from 'lucide-react';
import { adminService } from '../services/adminService.js';
import { queryKeys } from '../../../lib/queryClient.js';
import { ROUTE_PATHS } from '../../../routes/routePaths.js';
import { formatDate } from '../../../lib/utils.js';
import { Card } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Input } from '../../../components/ui/input.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { Label } from '../../../components/ui/label.jsx';
import { Textarea } from '../../../components/ui/textarea.jsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../../components/ui/dialog.jsx';

export const SellerPayoutsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const sellerIdParam = searchParams.get('seller') || '';
  const queryClient = useQueryClient();

  const todayStr = new Date().toISOString().split('T')[0];

  const [selectedSellerId, setSelectedSellerId] = useState(sellerIdParam);
  const [searchQuery, setSearchQuery] = useState('');

  // Record Payout Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSellerId, setModalSellerId] = useState('');
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutDate, setPayoutDate] = useState(todayStr);
  const [payoutRef, setPayoutRef] = useState('');
  const [payoutNotes, setPayoutNotes] = useState('');
  const [modalError, setModalError] = useState('');

  // 1. Fetch Sellers list for filter & modal selector
  const { data: sellersData } = useQuery({
    queryKey: queryKeys.admin.sellers(),
    queryFn: () => adminService.getSellers(),
  });

  // Fetch earnings overview for balance lookups
  const { data: earningsData } = useQuery({
    queryKey: queryKeys.admin.earnings(),
    queryFn: () => adminService.getSellerEarningsOverview(),
  });

  const sellers = Array.isArray(sellersData) ? sellersData : sellersData?.results || [];
  const earningsList = Array.isArray(earningsData) ? earningsData : earningsData?.results || [];

  // Map of seller_id -> pending balance
  const balanceMap = earningsList.reduce((acc, item) => {
    const id = item.seller_id || item.id;
    if (id) {
      acc[id] = item.pending_payout_balance || '0.00';
    }
    return acc;
  }, {});

  // Default to first seller if none selected
  const activeSellerId = selectedSellerId || (sellers.length > 0 ? sellers[0].id : '');

  // 2. Fetch Payouts for the active seller
  const {
    data: payoutsData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.admin.sellerPayouts(activeSellerId),
    queryFn: () => adminService.getSellerPayouts(activeSellerId),
    enabled: !!activeSellerId,
  });

  // 3. Record payout mutation
  const payoutMutation = useMutation({
    mutationFn: ({ sellerId, payload }) =>
      adminService.recordSellerPayout(sellerId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      setIsModalOpen(false);
      resetModal();
    },
    onError: (err) => {
      const data = err?.response?.data;
      let msg = 'Failed to record payout.';
      if (typeof data === 'object' && data !== null) {
        if (data.detail) {
          msg = data.detail;
        } else {
          const firstKey = Object.keys(data)[0];
          const val = Array.isArray(data[firstKey]) ? data[firstKey][0] : data[firstKey];
          msg = `${firstKey}: ${val}`;
        }
      } else if (err?.message) {
        msg = err.message;
      }
      setModalError(msg);
    },
  });

  const resetModal = () => {
    setModalSellerId('');
    setPayoutAmount('');
    setPayoutDate(new Date().toISOString().split('T')[0]);
    setPayoutRef('');
    setPayoutNotes('');
    setModalError('');
  };

  const handleOpenModal = () => {
    resetModal();
    setModalSellerId(activeSellerId || (sellers.length > 0 ? sellers[0].id : ''));
    setIsModalOpen(true);
  };

  const handleSubmitPayout = (e) => {
    e.preventDefault();
    if (!modalSellerId) {
      setModalError('Please select a seller.');
      return;
    }
    if (!payoutAmount || Number(payoutAmount) <= 0) {
      setModalError('Please enter a valid payout amount.');
      return;
    }
    if (!payoutDate) {
      setModalError('Payout settlement date is required.');
      return;
    }
    if (!payoutRef.trim()) {
      setModalError('Transaction reference / UTR is required.');
      return;
    }

    const availableBal = Number(balanceMap[modalSellerId] || 0);
    if (availableBal > 0 && Number(payoutAmount) > availableBal) {
      setModalError(`Payout amount (₹${payoutAmount}) exceeds available balance (₹${availableBal.toFixed(2)}).`);
      return;
    }

    payoutMutation.mutate({
      sellerId: modalSellerId,
      payload: {
        amount: payoutAmount,
        payout_date: payoutDate,
        transaction_reference: payoutRef.trim(),
        notes: payoutNotes.trim(),
      },
    });
  };

  const handleSellerChange = (id) => {
    setSelectedSellerId(id);
    setSearchParams(id ? { seller: id } : {});
  };

  const rawPayouts = Array.isArray(payoutsData) ? payoutsData : payoutsData?.results || [];
  const payouts = rawPayouts.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const ref = (p.transaction_reference || '').toLowerCase();
    const notes = (p.notes || '').toLowerCase();
    return ref.includes(q) || notes.includes(q);
  });

  const activeSeller = sellers.find((s) => s.id === activeSellerId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
              Seller Payouts Ledger
            </h1>
            <Badge variant="secondary" className="font-bold text-xs">
              Disbursements
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Audit manual NEFT/RTGS bank transfers to artisan creators and maintain platform disbursement compliance.
          </p>
        </div>

        <Button
          size="sm"
          onClick={handleOpenModal}
          className="rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground text-xs shadow-2xs gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <Plus size={15} />
          <span>Record New Payout</span>
        </Button>
      </div>

      {/* Seller Selector & Search Toolbar */}
      <Card className="p-4 border-border/80 bg-card/60 backdrop-blur-xs space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Seller Filter Selector */}
          <div className="flex items-center gap-2">
            <Store size={14} className="text-primary shrink-0" />
            <select
              value={activeSellerId}
              onChange={(e) => handleSellerChange(e.target.value)}
              className="text-xs font-semibold rounded-xl border border-border bg-card px-3 py-1.5 text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
            >
              {sellers.length === 0 && <option value="">No sellers registered</option>}
              {sellers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.store_name || s.business_name} ({s.owner_name || s.email})
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search reference UTR, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs rounded-xl bg-card border-border"
            />
          </div>
        </div>
      </Card>

      {/* Active Seller Summary Banner */}
      {activeSeller && (
        <Card className="p-4 border-border/70 bg-primary/5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Store size={18} />
            </div>
            <div>
              <p className="font-extrabold text-foreground text-sm">
                {activeSeller.store_name || activeSeller.business_name}
              </p>
              <p className="text-muted-foreground text-[11px]">
                Artisan: {activeSeller.owner_name || activeSeller.email} • ID: #{activeSeller.id}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right sm:border-r border-border/60 sm:pr-3">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                Pending Balance
              </span>
              <span className="text-sm font-extrabold text-amber-600 dark:text-amber-400">
                ₹{balanceMap[activeSeller.id] || '0.00'}
              </span>
            </div>

            <Button asChild variant="outline" size="sm" className="rounded-xl text-xs h-8 cursor-pointer">
              <Link to={ROUTE_PATHS.ADMIN.SELLER_DETAILS(activeSeller.id)}>
                <span>View Store Profile</span>
              </Link>
            </Button>
          </div>
        </Card>
      )}

      {/* Payouts Records List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4 animate-pulse border-border bg-card">
              <div className="h-5 w-1/4 bg-muted rounded mb-2" />
              <div className="h-3 w-1/3 bg-muted/60 rounded" />
            </Card>
          ))}
        </div>
      ) : isError ? (
        <Card className="p-8 text-center border-destructive/20 bg-destructive/5 space-y-3">
          <AlertCircle size={32} className="mx-auto text-destructive" />
          <h3 className="text-sm font-bold text-foreground">Failed to load payouts</h3>
          <p className="text-xs text-muted-foreground">Unable to fetch payout records for this seller.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="cursor-pointer">
            Retry
          </Button>
        </Card>
      ) : payouts.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-border bg-card/40 space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Receipt size={28} />
          </div>
          <h3 className="text-sm font-bold text-foreground">No payouts recorded</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            No bank transfers have been disbursed to this artisan seller yet.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {payouts.map((payout) => (
            <Card
              key={payout.id}
              className="p-4 border-border bg-card hover:border-primary/30 transition-all shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                  <Receipt size={20} />
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-foreground">
                      ₹{payout.amount}
                    </span>
                    <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 font-bold text-[10px] py-0">
                      Disbursed
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Bank Ref:{' '}
                    <code className="font-mono text-foreground font-semibold">
                      {payout.transaction_reference}
                    </code>
                  </p>

                  {payout.notes && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">{payout.notes}</p>
                  )}
                </div>
              </div>

              <div className="text-xs text-muted-foreground flex items-center gap-1.5 self-end sm:self-center">
                <Calendar size={13} />
                <span>
                  {payout.payout_date
                    ? `Disbursed: ${payout.payout_date}`
                    : formatDate(payout.created_at)}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Record Payout Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
              <Receipt size={18} className="text-primary" />
              <span>Record Bank Payout</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Manually register a bank transfer (NEFT/RTGS/UPI) to an artisan creator.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitPayout} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="sellerSelect" className="text-xs font-bold text-foreground">
                  Artisan Seller *
                </Label>
                {modalSellerId && (
                  <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                    Avail: ₹{balanceMap[modalSellerId] || '0.00'}
                  </span>
                )}
              </div>
              <select
                id="sellerSelect"
                value={modalSellerId}
                onChange={(e) => setModalSellerId(e.target.value)}
                className="w-full text-xs font-semibold rounded-xl border border-border bg-background px-3 py-2 text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
                required
              >
                <option value="">Select an artisan seller...</option>
                {sellers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.store_name || s.business_name} ({s.owner_name || s.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="payoutAmt" className="text-xs font-bold text-foreground">
                  Amount (₹) *
                </Label>
                <Input
                  id="payoutAmt"
                  type="number"
                  step="0.01"
                  placeholder="e.g. 24500"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  className="text-xs rounded-xl bg-background border-border"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="payoutDate" className="text-xs font-bold text-foreground">
                  Settlement Date *
                </Label>
                <Input
                  id="payoutDate"
                  type="date"
                  value={payoutDate}
                  onChange={(e) => setPayoutDate(e.target.value)}
                  className="text-xs rounded-xl bg-background border-border"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="payoutRef" className="text-xs font-bold text-foreground">
                Transaction Reference / UTR Number *
              </Label>
              <Input
                id="payoutRef"
                type="text"
                placeholder="e.g. UTR49281048201"
                value={payoutRef}
                onChange={(e) => setPayoutRef(e.target.value)}
                className="text-xs rounded-xl bg-background border-border"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="payoutNotes" className="text-xs font-bold text-foreground">
                Internal Notes (Optional)
              </Label>
              <Textarea
                id="payoutNotes"
                placeholder="e.g. Bi-weekly settlement for pottery line..."
                value={payoutNotes}
                onChange={(e) => setPayoutNotes(e.target.value)}
                className="text-xs rounded-xl min-h-[70px] bg-background border-border"
              />
            </div>

            {modalError && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/30 p-2.5 text-xs text-destructive font-medium flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={payoutMutation.isPending}
                className="rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xs gap-1.5 cursor-pointer"
              >
                {payoutMutation.isPending ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Recording...</span>
                  </>
                ) : (
                  <span>Record Disbursement</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SellerPayoutsPage;

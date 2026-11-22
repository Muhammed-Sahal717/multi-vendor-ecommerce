import { useState } from 'react';
import {
  CreditCard,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  Lock,
} from 'lucide-react';
import { paymentService } from '../services/paymentService.js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../../components/ui/dialog.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { PriceDisplay } from '../../../components/common/PriceDisplay.jsx';

export const RazorpaySimulatorModal = ({
  isOpen,
  order,
  onPaymentSuccess,
  onClose,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorStatus, setErrorStatus] = useState('');

  if (!order) return null;

  const paymentId =
    order.payment?.id ||
    (typeof order.payment === 'string' ? order.payment : null) ||
    order.payment_id;
  const totalAmount = order.total_amount;

  const handleSimulatePayment = async () => {
    if (!paymentId) {
      setErrorStatus('No payment reference found for this order.');
      return;
    }

    setIsProcessing(true);
    setErrorStatus('');

    try {
      await paymentService.mockProcessPayment(paymentId, {
        outcome: 'successful',
      });
      setIsProcessing(false);
      onPaymentSuccess(order);
    } catch (err) {
      setIsProcessing(false);
      setErrorStatus(
        err?.response?.data?.detail ||
        err?.response?.data?.failure_reason ||
        err?.message ||
        'Failed to process payment attempt.'
      );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md rounded-3xl bg-card border border-border/60 p-6 shadow-2xl space-y-4">
        {/* Header with Razorpay mockup branding */}
        <DialogHeader className="border-b border-border/60 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-xs">
                <CreditCard size={18} />
              </div>
              <div>
                <DialogTitle className="text-base font-black text-foreground font-heading flex items-center gap-2">
                  <span>Razorpay Checkout</span>
                  <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30 rounded-full font-bold">
                    Secure Gateway
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground font-mono">
                  Order #{order.order_number}
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Amount to pay */}
        <div className="rounded-2xl border border-border/60 bg-muted/30 p-5 text-center space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">Total Payable Amount</span>
          <div className="flex justify-center">
            <PriceDisplay price={totalAmount} size="lg" className="text-3xl font-black text-foreground font-heading" />
          </div>
          <p className="text-[11px] text-muted-foreground pt-1">
            Safe &amp; encrypted transaction via Razorpay gateway
          </p>
        </div>

        {errorStatus && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2">
            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
            <span>{errorStatus}</span>
          </div>
        )}

        {/* Payment Action */}
        <div className="space-y-2.5 pt-2">
          <Button
            type="button"
            onClick={handleSimulatePayment}
            disabled={isProcessing}
            className="w-full h-12 rounded-2xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 text-sm shadow-md shadow-primary/25 gap-2 cursor-pointer transition-all"
          >
            {isProcessing ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Authorizing Payment...</span>
              </>
            ) : (
              <>
                <Lock size={15} />
                <span>Pay ₹{Number(totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </>
            )}
          </Button>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            >
              Cancel and return to checkout
            </button>
          </div>
        </div>

        <div className="pt-2 border-t border-border/60 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          <ShieldCheck size={13} className="text-primary" />
          <span>Secured by 256-bit encryption &bull; PCI-DSS Compliant</span>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RazorpaySimulatorModal;

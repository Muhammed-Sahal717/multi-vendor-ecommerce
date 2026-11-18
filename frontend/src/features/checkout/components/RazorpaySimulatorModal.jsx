import { useState } from 'react';
import {
  CreditCard,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  CheckCircle,
  XCircle,
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
  onPaymentFailure,
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

  const handleSimulatePayment = async (outcome) => {
    if (!paymentId) {
      setErrorStatus('No payment reference found for this order.');
      return;
    }

    setIsProcessing(true);
    setErrorStatus('');

    try {
      if (outcome === 'successful') {
        await paymentService.mockProcessPayment(paymentId, {
          outcome: 'successful',
        });
        setIsProcessing(false);
        onPaymentSuccess(order);
      } else {
        await paymentService.mockProcessPayment(paymentId, {
          outcome: 'failed',
          failure_reason: 'User cancelled or transaction declined by issuer bank.',
        });
        setIsProcessing(false);
        setErrorStatus('Payment simulation failed (Simulated bank decline). You can retry or choose another method.');
        if (onPaymentFailure) {
          onPaymentFailure(order);
        }
      }
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
      <DialogContent className="max-w-md rounded-2xl bg-card border border-border p-6 shadow-2xl space-y-4">
        {/* Header with Razorpay mockup branding */}
        <DialogHeader className="border-b border-border pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <CreditCard size={18} />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <span>Razorpay Checkout</span>
                  <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                    Mock Sandbox
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Order #{order.order_number}
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Amount to pay */}
        <div className="rounded-xl border border-border bg-muted/40 p-4 text-center space-y-1">
          <span className="text-xs text-muted-foreground">Total Payable Amount</span>
          <div className="flex justify-center">
            <PriceDisplay price={totalAmount} size="lg" className="text-2xl font-extrabold text-foreground" />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Test gateway environment — no real currency will be charged
          </p>
        </div>

        {errorStatus && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2">
            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
            <span>{errorStatus}</span>
          </div>
        )}

        {/* Action Buttons for Developer / User Demo */}
        <div className="space-y-2.5 pt-2">
          <Button
            type="button"
            onClick={() => handleSimulatePayment('successful')}
            disabled={isProcessing}
            className="w-full h-11 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 text-xs shadow-sm gap-2 cursor-pointer"
          >
            {isProcessing ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Authorizing with Bank...</span>
              </>
            ) : (
              <>
                <CheckCircle size={15} />
                <span>Simulate Successful Payment (Pass)</span>
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => handleSimulatePayment('failed')}
            disabled={isProcessing}
            className="w-full h-10 rounded-xl font-semibold border-destructive/30 text-destructive hover:bg-destructive/10 text-xs gap-2 cursor-pointer"
          >
            <XCircle size={15} />
            <span>Simulate Payment Failure (Fail)</span>
          </Button>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Cancel and return to checkout
            </button>
          </div>
        </div>

        <div className="pt-2 border-t border-border flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          <ShieldCheck size={13} className="text-primary" />
          <span>Secured by 256-bit encryption</span>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RazorpaySimulatorModal;

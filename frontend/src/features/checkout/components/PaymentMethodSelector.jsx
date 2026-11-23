import {
  CreditCard,
  Banknote,
  CheckCircle2,
  Circle,
  ShieldCheck,
  Zap,
  Lock,
  AlertTriangle,
} from 'lucide-react';
import { Card } from '../../../components/ui/card.jsx';
import { Badge } from '../../../components/ui/badge.jsx';

const COD_MAX_LIMIT = 1500;

export const PaymentMethodSelector = ({ selectedMethod, onSelectMethod, orderTotal = 0 }) => {
  const isCodDisabled = Number(orderTotal) > COD_MAX_LIMIT;

  const paymentMethods = [
    {
      id: 'razorpay',
      title: 'Online Payment (Razorpay)',
      description: 'Instant payment via UPI (GPay, PhonePe, Paytm), Credit/Debit Cards & NetBanking',
      icon: CreditCard,
      badge: 'Fast & Instant',
      tagColor: 'border-primary/20 bg-primary/10 text-primary',
      disabled: false,
    },
    {
      id: 'cod',
      title: 'Cash on Delivery (COD)',
      description: isCodDisabled
        ? 'Orders over ₹1,500 must be paid online via Razorpay for courier security & transit insurance.'
        : 'Pay cash or scan UPI QR directly to the courier executive upon doorstep delivery (Orders ≤ ₹1,500)',
      icon: Banknote,
      badge: isCodDisabled ? 'Unavailable (> ₹1,500)' : 'Eligible (≤ ₹1,500)',
      tagColor: isCodDisabled
        ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400'
        : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      disabled: isCodDisabled,
    },
  ];

  return (
    <Card className="rounded-3xl border border-border/60 bg-card p-6 space-y-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground font-black text-xs shadow-xs">
            2
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground font-heading">Payment Method</h2>
            <p className="text-xs text-muted-foreground">Select how you would like to complete your payment</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 rounded-full border border-border/80 bg-muted/30 px-3 py-1 text-[11px] font-semibold text-muted-foreground w-fit">
          <Lock size={12} className="text-primary" />
          <span>256-Bit Encrypted</span>
        </div>
      </div>

      {isCodDisabled && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 flex items-start gap-3 text-xs text-amber-800 dark:text-amber-300">
          <AlertTriangle size={16} className="shrink-0 text-amber-600 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold">Cash on Delivery is unavailable for orders over ₹1,500</p>
            <p className="text-[11px] opacity-90">
              Your order total is <strong className="font-bold">₹{Number(orderTotal).toLocaleString('en-IN')}</strong>.
              Orders above ₹1,500 require Online Payment (UPI, Credit/Debit Cards, NetBanking).
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {paymentMethods.map((method) => {
          const isSelected = selectedMethod === method.id;
          const isDisabled = method.disabled;
          const Icon = method.icon;

          return (
            <div
              key={method.id}
              onClick={() => {
                if (!isDisabled) {
                  onSelectMethod(method.id);
                }
              }}
              className={`group relative flex flex-col justify-between rounded-2xl border-2 p-4 transition-all duration-200 ${
                isDisabled
                  ? 'border-dashed border-border/60 bg-muted/20 opacity-60 cursor-not-allowed select-none'
                  : isSelected
                  ? 'border-primary bg-primary/5 shadow-xs cursor-pointer'
                  : 'border-border/60 bg-card hover:border-border hover:bg-muted/20 cursor-pointer'
              }`}
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                        isDisabled
                          ? 'bg-muted text-muted-foreground'
                          : isSelected
                          ? 'bg-primary text-primary-foreground shadow-xs'
                          : 'bg-muted text-foreground'
                      }`}
                    >
                      <Icon size={17} />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-foreground font-heading block">
                        {method.title}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {isDisabled ? (
                      <span className="text-[10px] font-bold text-muted-foreground uppercase px-1.5 py-0.5 rounded bg-muted">
                        Locked
                      </span>
                    ) : isSelected ? (
                      <CheckCircle2 size={18} className="text-primary fill-primary/15" />
                    ) : (
                      <Circle size={18} className="text-muted-foreground/40 group-hover:text-muted-foreground/70" />
                    )}
                  </div>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed pl-11">
                  {method.description}
                </p>

                <div className="pt-1 pl-11 flex items-center gap-2">
                  <Badge variant="outline" className={`text-[10px] font-bold py-0.5 px-2.5 rounded-full ${method.tagColor}`}>
                    <Zap size={10} className="mr-1 inline" />
                    {method.badge}
                  </Badge>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default PaymentMethodSelector;

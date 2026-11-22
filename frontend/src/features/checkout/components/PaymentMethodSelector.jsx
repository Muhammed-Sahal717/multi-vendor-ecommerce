import {
  CreditCard,
  Banknote,
  CheckCircle2,
  Circle,
  ShieldCheck,
  Zap,
  Lock,
} from 'lucide-react';
import { Card } from '../../../components/ui/card.jsx';
import { Badge } from '../../../components/ui/badge.jsx';

const PAYMENT_METHODS = [
  {
    id: 'razorpay',
    title: 'Online Payment (Razorpay)',
    description: 'Instant payment via UPI (GPay, PhonePe, Paytm), Credit/Debit Cards & NetBanking',
    icon: CreditCard,
    badge: 'Fast & Instant',
    accentColor: 'text-primary',
    tagColor: 'border-primary/20 bg-primary/10 text-primary',
  },
  {
    id: 'cod',
    title: 'Cash on Delivery (COD)',
    description: 'Pay cash or scan UPI QR directly to the courier executive upon doorstep delivery',
    icon: Banknote,
    badge: 'Pay at Doorstep',
    accentColor: 'text-emerald-600 dark:text-emerald-400',
    tagColor: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
];

export const PaymentMethodSelector = ({ selectedMethod, onSelectMethod }) => {
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {PAYMENT_METHODS.map((method) => {
          const isSelected = selectedMethod === method.id;
          const Icon = method.icon;

          return (
            <div
              key={method.id}
              onClick={() => onSelectMethod(method.id)}
              className={`group relative flex flex-col justify-between rounded-2xl border-2 p-4 transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'border-primary bg-primary/5 shadow-xs'
                  : 'border-border/60 bg-card hover:border-border hover:bg-muted/20'
              }`}
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                        isSelected
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
                    {isSelected ? (
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

import {
  CreditCard,
  Banknote,
  CheckCircle2,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { Card } from '../../../components/ui/card.jsx';
import { Badge } from '../../../components/ui/badge.jsx';

const PAYMENT_METHODS = [
  {
    id: 'razorpay',
    title: 'Online Payment (Razorpay)',
    description: 'UPI (Google Pay, PhonePe, Paytm), Cards, NetBanking & Wallets',
    icon: CreditCard,
    badge: 'Fast & Secure',
    highlightColor: 'text-primary',
  },
  {
    id: 'cod',
    title: 'Cash on Delivery (COD)',
    description: 'Pay cash or scan QR when your package arrives at your door',
    icon: Banknote,
    badge: 'Pay on Delivery',
    highlightColor: 'text-emerald-600 dark:text-emerald-400',
  },
];

export const PaymentMethodSelector = ({ selectedMethod, onSelectMethod }) => {
  return (
    <Card className="p-6 rounded-2xl border border-border bg-card space-y-5">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CreditCard size={16} />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">2. Payment Method</h2>
            <p className="text-xs text-muted-foreground">Select how you want to pay for your order</p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
          <ShieldCheck size={14} className="text-primary" />
          <span>Encrypted</span>
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
              className={`relative flex flex-col justify-between rounded-xl border p-4 transition-all cursor-pointer ${
                isSelected
                  ? 'border-primary bg-primary/5 shadow-2xs ring-1 ring-primary'
                  : 'border-border bg-card hover:border-primary/30 hover:bg-muted/30'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                        isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                      }`}
                    >
                      <Icon size={16} />
                    </div>
                    <span className="text-sm font-bold text-foreground">
                      {method.title}
                    </span>
                  </div>

                  {isSelected && (
                    <CheckCircle2 size={16} className="text-primary fill-primary/20 shrink-0" />
                  )}
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed pl-10">
                  {method.description}
                </p>

                <div className="pt-1 pl-10 flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] font-bold border-border text-muted-foreground py-0 gap-1">
                    <Zap size={10} className="text-primary" />
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

import { Link } from 'react-router-dom';
import {
  Store,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  FileText,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthProvider.jsx';
import { ROUTE_PATHS } from '../../../routes/routePaths.js';
import { ROLES } from '../../../lib/constants.js';
import { Card } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Badge } from '../../../components/ui/badge.jsx';

export const SellerApplicationStatusPage = () => {
  const { role } = useAuth();

  const isApprovedSeller = role === ROLES.SELLER;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-border pb-4">
        <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
          Seller Onboarding Status
        </h1>
        <p className="text-xs text-muted-foreground">
          Track the review and verification progress of your artisan seller application.
        </p>
      </div>

      {isApprovedSeller ? (
        /* Approved Seller View */
        <Card className="rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center space-y-5">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-8 ring-emerald-500/5">
            <CheckCircle2 size={42} className="stroke-[2.2]" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 font-bold text-xs py-0.5">
              Verified Artisan Seller
            </Badge>
            <h2 className="text-2xl font-extrabold text-foreground">
              Your Application is Approved!
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Congratulations! Your seller account is active. You can now list handcrafted products, manage inventory, and fulfill customer orders.
            </p>
          </div>

          <div className="flex justify-center pt-2">
            <Button asChild size="lg" className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-6 shadow-sm gap-2 cursor-pointer">
              <Link to={ROUTE_PATHS.SELLER.DASHBOARD}>
                <span>Enter Seller Portal</span>
                <ArrowRight size={14} />
              </Link>
            </Button>
          </div>
        </Card>
      ) : (
        /* Pending Application Review View */
        <div className="space-y-6">
          <Card className="rounded-3xl border border-amber-500/30 bg-amber-500/5 p-6 sm:p-8 space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-amber-500/20 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  <Clock size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-foreground">Application Under Review</h2>
                    <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-600 text-[10px] font-bold">
                      Pending
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Our moderation team is validating your craft documentation.</p>
                </div>
              </div>
            </div>

            {/* Application Progress Timeline */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-2">
              <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={16} />
                  <span>1. Submitted</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Your store information, product description, and contact info have been received.
                </p>
              </div>

              <div className="rounded-2xl border border-primary/40 bg-primary/5 p-4 space-y-2 ring-1 ring-primary/30">
                <div className="flex items-center gap-2 text-xs font-bold text-primary">
                  <Clock size={16} />
                  <span>2. Artisan Review</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Our quality team reviews handmade authenticity, formulations, and compliance.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-4 space-y-2 opacity-60">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <Store size={16} />
                  <span>3. Activation</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Upon approval, your role upgrades to Seller with full access to the seller portal.
                </p>
              </div>
            </div>
          </Card>

          {/* Guidelines & FAQ */}
          <Card className="rounded-3xl border border-border bg-card p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-foreground">
              <FileText size={18} className="text-primary" />
              <span>What to Expect Next</span>
            </div>

            <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
              <div className="flex items-start gap-2.5">
                <ShieldCheck size={16} className="text-primary shrink-0 mt-0.5" />
                <p>
                  <strong className="text-foreground">Turnaround Time:</strong> Most applications are reviewed within 24 to 48 hours. You will receive an email notification when your application status changes.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <Sparkles size={16} className="text-primary shrink-0 mt-0.5" />
                <p>
                  <strong className="text-foreground">Product Guidelines:</strong> GALLA. exclusively features natural, authentic, and artisan goods. Reselling mass-produced commercial items is prohibited.
                </p>
              </div>
            </div>

            <div className="border-t border-border pt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="text-muted-foreground">Need to update your contact or address details?</span>
              <Button asChild variant="outline" size="sm" className="rounded-xl text-xs font-semibold">
                <Link to={ROUTE_PATHS.CUSTOMER.PROFILE}>Edit Profile</Link>
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SellerApplicationStatusPage;

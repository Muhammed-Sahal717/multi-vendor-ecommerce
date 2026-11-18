import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileCheck,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Building,
  Mail,
  MapPin,
  Globe,
  FileText,
  Loader2,
  AlertCircle,
  User,
  Shield,
  Phone,
} from 'lucide-react';
import { adminService } from '../services/adminService.js';
import { queryKeys } from '../../../lib/queryClient.js';
import { Card } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Input } from '../../../components/ui/input.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../../components/ui/dialog.jsx';
import { Textarea } from '../../../components/ui/textarea.jsx';
import { Label } from '../../../components/ui/label.jsx';
import { formatDate } from '../../../lib/utils.js';

const STATUS_FILTERS = [
  { label: 'All Applications', value: '' },
  { label: 'Pending Review', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
];

export const SellerApplicationsPage = () => {
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected application for review modal
  const [reviewModalApp, setReviewModalApp] = useState(null);
  const [reviewAction, setReviewAction] = useState('approve'); // 'approve' | 'reject'
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewError, setReviewError] = useState('');

  // Fetch applications
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.admin.applications({
      status: selectedStatus || undefined,
      search: searchQuery || undefined,
    }),
    queryFn: () =>
      adminService.getSellerApplications({
        status: selectedStatus || undefined,
        search: searchQuery || undefined,
      }),
  });

  // Mutation for review
  const reviewMutation = useMutation({
    mutationFn: ({ id, action, notes }) =>
      adminService.reviewSellerApplication(id, { action, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      setReviewModalApp(null);
      setReviewNotes('');
      setReviewError('');
    },
    onError: (err) => {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to review application';
      setReviewError(msg);
    },
  });

  const rawApplications = Array.isArray(data) ? data : data?.results || [];
  const applications = rawApplications.filter((app) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      app.business_name?.toLowerCase().includes(q) ||
      app.business_email?.toLowerCase().includes(q) ||
      app.applicant_name?.toLowerCase().includes(q) ||
      app.city?.toLowerCase().includes(q)
    );
  });

  const handleOpenReview = (app, defaultAction = 'approve') => {
    setReviewModalApp(app);
    setReviewAction(defaultAction);
    setReviewNotes('');
    setReviewError('');
  };

  const handleConfirmReview = () => {
    if (!reviewModalApp) return;
    if (reviewAction === 'reject' && !reviewNotes.trim()) {
      setReviewError('Please provide a reason or notes for rejecting this application.');
      return;
    }
    reviewMutation.mutate({
      id: reviewModalApp.id,
      action: reviewAction,
      notes: reviewNotes.trim(),
    });
  };

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return (
          <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 font-bold text-xs py-0.5 gap-1">
            <CheckCircle2 size={12} />
            <span>Approved</span>
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="outline" className="border-rose-500/40 bg-rose-500/10 text-rose-600 font-bold text-xs py-0.5 gap-1">
            <XCircle size={12} />
            <span>Rejected</span>
          </Badge>
        );
      case 'pending':
      default:
        return (
          <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-600 font-bold text-xs py-0.5 gap-1">
            <Clock size={12} />
            <span>Pending Review</span>
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
              Seller Applications
            </h1>
            <Badge variant="secondary" className="font-bold text-xs">
              {applications.length}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Review and onboard artisan creators, verify craft credentials, and approve store accounts.
          </p>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <Card className="p-4 border-border/80 bg-card/60 backdrop-blur-xs space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-muted/60 p-1 rounded-xl">
            {STATUS_FILTERS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setSelectedStatus(tab.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  selectedStatus === tab.value
                    ? 'bg-card text-foreground shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search business, applicant, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs rounded-xl bg-card border-border"
            />
          </div>
        </div>
      </Card>

      {/* Applications List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-6 animate-pulse border-border bg-card">
              <div className="h-5 w-1/3 bg-muted rounded mb-3" />
              <div className="h-3 w-1/2 bg-muted rounded mb-4" />
              <div className="h-10 w-full bg-muted/50 rounded" />
            </Card>
          ))}
        </div>
      ) : isError ? (
        <Card className="p-8 text-center border-destructive/20 bg-destructive/5 space-y-3">
          <AlertCircle size={32} className="mx-auto text-destructive" />
          <h3 className="text-sm font-bold text-foreground">Failed to load applications</h3>
          <p className="text-xs text-muted-foreground">Unable to fetch seller applications at this time.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="cursor-pointer">
            Retry
          </Button>
        </Card>
      ) : applications.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-border bg-card/40 space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <FileCheck size={28} />
          </div>
          <h3 className="text-sm font-bold text-foreground">No applications found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {selectedStatus
              ? `No seller applications currently marked as ${selectedStatus}.`
              : 'There are no artisan seller applications matching your search criteria.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => (
            <Card
              key={app.id}
              className="p-5 border-border bg-card hover:border-primary/30 transition-all shadow-2xs space-y-4"
            >
              {/* Card Top: Business Name & Status */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/60 pb-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Building size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-extrabold text-foreground">
                        {app.business_name || 'Unnamed Business'}
                      </h3>
                      {getStatusBadge(app.status)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Submitted on {formatDate(app.created_at)}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  {app.status === 'pending' ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleOpenReview(app, 'approve')}
                        className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-3 gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <CheckCircle2 size={13} />
                        <span>Approve</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenReview(app, 'reject')}
                        className="rounded-xl font-bold border-rose-500/40 text-rose-600 hover:bg-rose-500/10 text-xs h-8 px-3 gap-1.5 cursor-pointer"
                      >
                        <XCircle size={13} />
                        <span>Reject</span>
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenReview(app, app.status === 'approved' ? 'reject' : 'approve')}
                      className="rounded-xl text-xs h-8 px-3 font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <span>Update Decision</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* Applicant & Store Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User size={14} className="text-primary/70 shrink-0" />
                  <span className="truncate">
                    <strong className="text-foreground font-semibold">Applicant:</strong>{' '}
                    {app.applicant_name || app.user?.name || app.user?.email || 'N/A'}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail size={14} className="text-primary/70 shrink-0" />
                  <span className="truncate">
                    <strong className="text-foreground font-semibold">Email:</strong>{' '}
                    {app.business_email || app.user?.email || 'N/A'}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone size={14} className="text-primary/70 shrink-0" />
                  <span className="truncate">
                    <strong className="text-foreground font-semibold">Phone:</strong>{' '}
                    {app.business_phone || 'N/A'}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin size={14} className="text-primary/70 shrink-0" />
                  <span className="truncate">
                    <strong className="text-foreground font-semibold">Location:</strong>{' '}
                    {[app.city, app.state, app.country].filter(Boolean).join(', ') || 'N/A'}
                  </span>
                </div>
              </div>

              {/* Description & Notes */}
              {app.description && (
                <div className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Craft & Story: </span>
                  {app.description}
                </div>
              )}

              {app.website && (
                <div className="flex items-center gap-1.5 text-xs text-primary">
                  <Globe size={13} />
                  <a
                    href={app.website.startsWith('http') ? app.website : `https://${app.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline font-medium"
                  >
                    {app.website}
                  </a>
                </div>
              )}

              {/* Existing Review Notes (if any) */}
              {app.review_notes && (
                <div className="rounded-xl border border-border/80 bg-card p-3 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-foreground">
                    <Shield size={13} className="text-primary" />
                    <span>Reviewer Notes:</span>
                  </div>
                  <p className="text-muted-foreground pl-4">{app.review_notes}</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Review Confirmation Dialog */}
      <Dialog open={!!reviewModalApp} onOpenChange={(open) => !open && setReviewModalApp(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
              <FileCheck size={18} className="text-primary" />
              <span>Review Application</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Reviewing artisan application for{' '}
              <strong className="text-foreground">{reviewModalApp?.business_name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Action Toggle */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Decision</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setReviewAction('approve')}
                  className={`flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-bold border transition-all cursor-pointer ${
                    reviewAction === 'approve'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <CheckCircle2 size={15} />
                  <span>Approve Seller</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReviewAction('reject')}
                  className={`flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-bold border transition-all cursor-pointer ${
                    reviewAction === 'reject'
                      ? 'border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <XCircle size={15} />
                  <span>Reject</span>
                </button>
              </div>
            </div>

            {/* Review Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="reviewNotes" className="text-xs font-bold text-foreground">
                {reviewAction === 'reject' ? 'Rejection Reason (Required)' : 'Review Notes (Optional)'}
              </Label>
              <Textarea
                id="reviewNotes"
                placeholder={
                  reviewAction === 'reject'
                    ? 'State the reason for rejecting this application (e.g., missing craft verification, duplicate profile)...'
                    : 'Add any onboarding notes or instructions for the seller...'
                }
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                className="text-xs rounded-xl min-h-[90px] bg-background border-border"
              />
            </div>

            {reviewError && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/30 p-2.5 text-xs text-destructive font-medium flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{reviewError}</span>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setReviewModalApp(null)}
              className="rounded-xl text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={reviewMutation.isPending}
              onClick={handleConfirmReview}
              className={`rounded-xl text-xs font-bold text-white shadow-2xs gap-1.5 cursor-pointer ${
                reviewAction === 'approve'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {reviewMutation.isPending ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <span>Confirm {reviewAction === 'approve' ? 'Approval' : 'Rejection'}</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SellerApplicationsPage;

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ShieldCheck,
  Search,
  Filter,
  Calendar,
  User,
  Activity,
  Layers,
  Database,
  Globe,
  AlertCircle,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { auditService } from '../services/auditService.js';
import { queryKeys } from '../../../lib/queryClient.js';
import { Card } from '../../../components/ui/card.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Input } from '../../../components/ui/input.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { formatDate } from '../../../lib/utils.js';

const ACTION_OPTIONS = [
  { label: 'All Actions', value: '' },
  { label: 'Create', value: 'create' },
  { label: 'Update', value: 'update' },
  { label: 'Delete', value: 'delete' },
  { label: 'Review / Moderate', value: 'review' },
  { label: 'Status Change', value: 'status_change' },
];

const ENTITY_OPTIONS = [
  { label: 'All Entities', value: '' },
  { label: 'Product', value: 'product' },
  { label: 'Seller Application', value: 'seller_application' },
  { label: 'Seller', value: 'seller' },
  { label: 'Customer', value: 'customer' },
  { label: 'Order', value: 'order' },
  { label: 'Payment', value: 'payment' },
  { label: 'Category', value: 'category' },
];

export const AuditLogsPage = () => {
  const [selectedAction, setSelectedAction] = useState('');
  const [selectedEntity, setSelectedEntity] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch superadmin audit logs
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.audit.logs({
      action: selectedAction || undefined,
      entity_type: selectedEntity || undefined,
      search: searchQuery || undefined,
    }),
    queryFn: () =>
      auditService.getAuditLogs({
        action: selectedAction || undefined,
        entity_type: selectedEntity || undefined,
        search: searchQuery || undefined,
      }),
  });

  const rawLogs = Array.isArray(data) ? data : data?.results || [];
  const logs = rawLogs.filter((log) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const actor = (log.actor_name || log.actor || log.user?.email || '').toLowerCase();
    const entityId = (log.entity_id || '').toString().toLowerCase();
    const action = (log.action || '').toLowerCase();
    const ip = (log.ip_address || '').toLowerCase();
    return actor.includes(q) || entityId.includes(q) || action.includes(q) || ip.includes(q);
  });

  const getActionBadge = (action) => {
    const act = (action || '').toLowerCase();
    if (act.includes('delete') || act.includes('reject') || act.includes('suspend')) {
      return (
        <Badge variant="outline" className="border-rose-500/40 bg-rose-500/10 text-rose-600 font-bold text-[11px] py-0">
          {action}
        </Badge>
      );
    }
    if (act.includes('create') || act.includes('approve') || act.includes('confirm')) {
      return (
        <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 font-bold text-[11px] py-0">
          {action}
        </Badge>
      );
    }
    if (act.includes('update') || act.includes('edit')) {
      return (
        <Badge variant="outline" className="border-blue-500/40 bg-blue-500/10 text-blue-600 font-bold text-[11px] py-0">
          {action}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary font-bold text-[11px] py-0">
        {action || 'Event'}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
              Platform Audit Trail
            </h1>
            <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary font-bold text-xs py-0.5 gap-1">
              <ShieldCheck size={12} />
              <span>Superadmin Only</span>
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Immutable system activity log recording administrative decisions, data alterations, and security operations.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card className="p-4 border-border/80 bg-card/60 backdrop-blur-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Action selector */}
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="text-xs font-semibold rounded-xl border border-border bg-card px-3 py-1.5 text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
            >
              {ACTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Entity selector */}
            <select
              value={selectedEntity}
              onChange={(e) => setSelectedEntity(e.target.value)}
              className="text-xs font-semibold rounded-xl border border-border bg-card px-3 py-1.5 text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
            >
              {ENTITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search actor, entity ID, IP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs rounded-xl bg-card border-border"
            />
          </div>
        </div>
      </Card>

      {/* Audit Logs List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="p-4 animate-pulse border-border bg-card">
              <div className="h-4 w-1/4 bg-muted rounded mb-2" />
              <div className="h-3 w-1/2 bg-muted/60 rounded" />
            </Card>
          ))}
        </div>
      ) : isError ? (
        <Card className="p-8 text-center border-destructive/20 bg-destructive/5 space-y-3">
          <AlertCircle size={32} className="mx-auto text-destructive" />
          <h3 className="text-sm font-bold text-foreground">Failed to load audit events</h3>
          <p className="text-xs text-muted-foreground">Unable to fetch system audit logs.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="cursor-pointer">
            Retry
          </Button>
        </Card>
      ) : logs.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-border bg-card/40 space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Activity size={28} />
          </div>
          <h3 className="text-sm font-bold text-foreground">No audit events recorded</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            No events match the selected filters or search terms.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {logs.map((log, idx) => {
            const actorName = log.actor_name || log.actor || log.user?.email || 'Platform Admin';
            const initial = actorName[0]?.toUpperCase() || 'A';

            return (
              <Card
                key={log.id || idx}
                className="p-4 border-border bg-card hover:border-primary/30 transition-all shadow-2xs space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs ring-2 ring-primary/5">
                      {initial}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-foreground text-xs">{actorName}</span>
                      {getActionBadge(log.action)}
                      <span className="text-xs text-muted-foreground">on</span>
                      <Badge variant="secondary" className="font-mono text-[10px] py-0">
                        {log.entity_type || 'entity'}:{log.entity_id || 'N/A'}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground self-start sm:self-auto">
                    {log.ip_address && (
                      <span className="flex items-center gap-1 font-mono">
                        <Globe size={11} />
                        <span>{log.ip_address}</span>
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar size={11} />
                      <span>
                        {formatDate(log.created_at || log.timestamp)}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Details / Message / Metadata */}
                {(log.details || log.description || log.message) && (
                  <div className="rounded-xl bg-muted/30 p-2.5 text-xs text-muted-foreground font-mono">
                    {typeof log.details === 'object'
                      ? JSON.stringify(log.details)
                      : log.details || log.description || log.message}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AuditLogsPage;

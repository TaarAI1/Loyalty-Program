'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { notificationsApi, webhookLogsApi } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { formatDateTime, statusColor } from '@/lib/utils';
import { RefreshCw, RotateCcw, ChevronLeft, ChevronRight, MessageCircle, Mail, Phone, Webhook } from 'lucide-react';
import { toast } from 'sonner';

const CHANNELS = [
  { value: '', label: 'All Channels' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'sms', label: 'SMS' },
  { value: 'email', label: 'Email' },
];

const STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'sent', label: 'Sent' },
  { value: 'failed', label: 'Failed' },
  { value: 'pending', label: 'Pending' },
  { value: 'skipped', label: 'Skipped' },
];

const CHANNEL_ICONS: Record<string, React.ElementType> = {
  whatsapp: MessageCircle,
  sms: Phone,
  email: Mail,
};

// ─────────────────────────────────────────────────────────────────────────────
// Webhook Logs Tab
// ─────────────────────────────────────────────────────────────────────────────
function WebhookLogsTab() {
  const [page, setPage]               = useState(1);
  const [mobile, setMobile]           = useState('');
  const [mobileInput, setMobileInput] = useState('');
  const [expandedId, setExpandedId]   = useState<string | null>(null);
  const pageSize = 50;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['webhook-logs', page, mobile],
    queryFn: () => webhookLogsApi.getLogs({ page, limit: pageSize, mobile: mobile || undefined }),
    refetchInterval: 30000,
  });

  const logs       = data?.data  ?? [];
  const total      = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function handleSearch() {
    setMobile(mobileInput.trim());
    setPage(1);
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <input
              type="text"
              placeholder="Search by mobile..."
              value={mobileInput}
              onChange={(e) => setMobileInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-56"
            />
            <Button variant="outline" size="sm" onClick={handleSearch}>Search</Button>
            {mobile && (
              <Button variant="ghost" size="sm" onClick={() => { setMobile(''); setMobileInput(''); setPage(1); }}>
                Clear
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => refetch()} className="ml-auto">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Time</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Transaction ID</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Mobile</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Store</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Duration</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Payload</th>
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? [...Array(8)].map((_, i) => (
                      <tr key={i} className="border-b border-border/50">
                        {[...Array(7)].map((__, j) => (
                          <td key={j} className="py-3 px-4">
                            <Skeleton className="h-4 w-full" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : logs.map((log: {
                      id: string;
                      transactionId: string | null;
                      customerMobile: string | null;
                      store: string | null;
                      status: string;
                      durationMs: number | null;
                      errorMessage: string | null;
                      payload: unknown;
                      response: unknown;
                      createdAt: string;
                    }) => (
                      <>
                        <tr
                          key={log.id}
                          className="border-b border-border/50 hover:bg-muted/40 cursor-pointer"
                          onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                        >
                          <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">
                            {formatDateTime(log.createdAt)}
                          </td>
                          <td className="py-3 px-4 font-mono text-xs">{log.transactionId ?? '—'}</td>
                          <td className="py-3 px-4 font-mono text-xs">{log.customerMobile ?? '—'}</td>
                          <td className="py-3 px-4 text-xs">{log.store ?? '—'}</td>
                          <td className="py-3 px-4">
                            <div className="flex flex-col gap-1">
                              <Badge className={statusColor(log.status === 'success' ? 'sent' : 'failed')}>
                                {log.status}
                              </Badge>
                              {log.errorMessage && (
                                <span className="text-xs text-red-600 max-w-xs break-all whitespace-normal">
                                  {log.errorMessage}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-xs text-muted-foreground">
                            {log.durationMs != null ? `${log.durationMs}ms` : '—'}
                          </td>
                          <td className="py-3 px-4 text-xs text-indigo-600">
                            {expandedId === log.id ? 'Hide ▲' : 'View ▼'}
                          </td>
                        </tr>
                        {expandedId === log.id && (
                          <tr key={`${log.id}-detail`} className="bg-muted/20 border-b border-border/50">
                            <td colSpan={7} className="px-4 py-3">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-xs font-semibold text-muted-foreground mb-1">Payload (Request)</p>
                                  <pre className="text-xs bg-muted rounded p-3 overflow-x-auto max-h-64 whitespace-pre-wrap break-all">
                                    {JSON.stringify(log.payload, null, 2)}
                                  </pre>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-muted-foreground mb-1">Response</p>
                                  <pre className="text-xs bg-muted rounded p-3 overflow-x-auto max-h-64 whitespace-pre-wrap break-all">
                                    {JSON.stringify(log.response, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
              </tbody>
            </table>
          </div>

          {!isLoading && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-sm text-muted-foreground">{total} records</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm">{page} / {totalPages}</span>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export default function NotificationsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [channel, setChannel] = useState('');
  const [status, setStatus]   = useState('');
  const [page, setPage]       = useState(1);
  const pageSize = 50;

  useEffect(() => {
    if (user && user.role !== 'admin') router.replace('/dashboard');
  }, [user, router]);

  if (user?.role !== 'admin') return null;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['notifications', channel, status, page],
    queryFn: () =>
      notificationsApi.getAll({ channel: channel || undefined, status: status || undefined, page, pageSize }),
    refetchInterval: 30000,
  });

  const { data: stats } = useQuery({
    queryKey: ['notification-stats'],
    queryFn: notificationsApi.getStats,
    refetchInterval: 60000,
  });

  const [resendingIds, setResendingIds] = useState<Set<string>>(new Set());

  const resendMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.resend(id),
    onSuccess: (_, id) => {
      toast.success('Notification re-queued');
      qc.setQueryData(['notifications', channel, status, page], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map((r: any) =>
            String(r.id) === id ? { ...r, status: 'pending', errorMessage: null } : r
          ),
        };
      });
      setResendingIds((s) => { const n = new Set(s); n.delete(id); return n; });
    },
    onError: (err, id) => {
      toast.error(String(err));
      setResendingIds((s) => { const n = new Set(s); n.delete(id); return n; });
    },
  });

  const logs       = data?.data ?? [];
  const totalPages = data?.meta?.totalPages ?? 1;

  const statsByChannel = ((stats ?? []) as Array<{ channel: string; status: string; count: string }>).reduce(
    (acc: Record<string, Record<string, number>>, row) => {
      if (!acc[row.channel]) acc[row.channel] = {};
      acc[row.channel][row.status] = Number(row.count);
      return acc;
    },
    {} as Record<string, Record<string, number>>,
  );

  return (
    <div className="space-y-4">
      <Tabs defaultValue="notifications">
        <TabsList>
          <TabsTrigger value="notifications">
            <MessageCircle className="w-4 h-4 mr-1.5" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="webhook-logs">
            <Webhook className="w-4 h-4 mr-1.5" />
            Webhook Logs
          </TabsTrigger>
        </TabsList>

        {/* ── Notifications tab ─────────────────────────────────────────── */}
        <TabsContent value="notifications" className="space-y-4 mt-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4">
            {['whatsapp', 'sms', 'email'].map((ch) => {
              const Icon = CHANNEL_ICONS[ch] ?? MessageCircle;
              const chStats = statsByChannel[ch] ?? {};
              const total = Object.values(chStats).reduce((a, b) => a + b, 0);
              const failed = chStats.failed ?? 0;
              return (
                <Card key={ch}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                        <Icon className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div>
                        <p className="font-bold text-lg">{total}</p>
                        <p className="text-xs text-muted-foreground capitalize">{ch} (7 days)</p>
                      </div>
                      {failed > 0 && (
                        <Badge className="ml-auto bg-red-50 text-red-700 border-red-200">
                          {String(failed)} failed
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Filter + Refresh */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 flex-wrap">
                <Select
                  options={CHANNELS}
                  value={channel}
                  onChange={(e) => { setChannel(e.target.value); setPage(1); }}
                  className="w-40"
                />
                <Select
                  options={STATUSES}
                  value={status}
                  onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                  className="w-40"
                />
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </Button>
                {status !== 'failed' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setStatus('failed'); setPage(1); }}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    Show Failed Only
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Log Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Channel</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Recipient</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Type</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Content</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading
                      ? [...Array(8)].map((_, i) => (
                          <tr key={i} className="border-b border-border/50">
                            {[...Array(7)].map((__, j) => (
                              <td key={j} className="py-3 px-4">
                                <Skeleton className="h-4 w-full" />
                              </td>
                            ))}
                          </tr>
                        ))
                      : logs.map(
                          (log: {
                            id: string | number;
                            channel: string;
                            recipient: string;
                            type: string;
                            content: string;
                            status: string;
                            errorMessage: string;
                            sentAt: string;
                          }) => {
                            const Icon = CHANNEL_ICONS[log.channel] ?? MessageCircle;
                            return (
                              <tr key={String(log.id)} className="border-b border-border/50 hover:bg-muted/40">
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2">
                                    <Icon className="w-4 h-4 text-muted-foreground" />
                                    <span className="capitalize">{log.channel}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-4 font-mono text-xs">{log.recipient}</td>
                                <td className="py-3 px-4 text-muted-foreground text-xs">{log.type}</td>
                                <td className="py-3 px-4 max-w-48 truncate text-xs text-muted-foreground">
                                  {log.content}
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex flex-col gap-1">
                                    <Badge className={statusColor(log.status)}>{log.status}</Badge>
                                    {log.errorMessage && (
                                      <span className="text-xs text-red-600 max-w-xs break-all whitespace-normal">
                                        {log.errorMessage}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-muted-foreground text-xs">
                                  {formatDateTime(log.sentAt)}
                                </td>
                                <td className="py-3 px-4">
                                  {log.status === 'failed' && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        const id = String(log.id);
                                        setResendingIds((s) => new Set(s).add(id));
                                        resendMutation.mutate(id);
                                      }}
                                      loading={resendingIds.has(String(log.id))}
                                      className="text-indigo-600 hover:text-indigo-700"
                                    >
                                      <RotateCcw className="w-3 h-3" />
                                      Resend
                                    </Button>
                                  )}
                                </td>
                              </tr>
                            );
                          },
                        )}
                  </tbody>
                </table>
              </div>

              {!isLoading && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                  <p className="text-sm text-muted-foreground">{data?.meta?.total ?? 0} records</p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm">{page} / {totalPages}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Webhook Logs tab ──────────────────────────────────────────── */}
        <TabsContent value="webhook-logs" className="mt-4">
          <WebhookLogsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

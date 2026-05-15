'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { notificationsApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { formatDateTime, statusColor } from '@/lib/utils';
import { RefreshCw, RotateCcw, ChevronLeft, ChevronRight, MessageCircle, Mail, Phone } from 'lucide-react';
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

export default function NotificationsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [channel, setChannel] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
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

  const resendMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.resend(id),
    onSuccess: () => {
      toast.success('Notification re-queued');
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (err) => toast.error(String(err)),
  });

  const logs = data?.data ?? [];
  const totalPages = data?.meta?.totalPages ?? 1;

  // Build stats summary
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
                                  <span className="text-xs text-red-600 max-w-32 truncate">
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
                                  onClick={() => resendMutation.mutate(String(log.id))}
                                  loading={resendMutation.isPending}
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
    </div>
  );
}

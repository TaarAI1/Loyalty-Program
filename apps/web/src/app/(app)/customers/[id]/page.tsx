'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { customersApi, configApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { TierBadge } from '@/components/ui/tier-badge';
import { Dialog } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  formatCurrency,
  formatNumber,
  formatDate,
  formatDateTime,
  segmentColor,
  segmentLabel,
} from '@/lib/utils';
import { ArrowLeft, MessageCircle, Edit2, ChevronLeft, ChevronRight, Gift, Zap, ShoppingBag, Star, RotateCcw, BarChart2, Calendar, ChevronDown, ChevronUp, Package, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const [editOpen, setEditOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [expandedTx, setExpandedTx] = useState<string | null>(null);

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => customersApi.getOne(id),
  });

  const { data: tiers } = useQuery({
    queryKey: ['tiers'],
    queryFn: configApi.getTiers,
  });

  const { data: history, isFetching: historyFetching, refetch: refetchHistory } = useQuery({
    queryKey: ['customer-history', id, historyPage],
    queryFn: () => customersApi.getHistory(id, { page: historyPage, pageSize: 10 }),
    enabled: !!customer,
    staleTime: 0,
  });

  const { data: ledger, refetch: refetchLedger } = useQuery({
    queryKey: ['customer-ledger', id, ledgerPage],
    queryFn: () => customersApi.getLedger(id, { page: ledgerPage, pageSize: 10 }),
    enabled: !!customer,
    staleTime: 0,
  });

  function refreshAll() {
    qc.invalidateQueries({ queryKey: ['customer', id] });
    refetchHistory();
    refetchLedger();
  }

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    gender: '',
    region: '',
    store: '',
    dateOfBirth: '',
  });

  const updateMutation = useMutation({
    mutationFn: (data: typeof editForm) => customersApi.update(id, data),
    onSuccess: () => {
      toast.success('Customer updated successfully');
      qc.invalidateQueries({ queryKey: ['customer', id] });
      setEditOpen(false);
    },
    onError: (err) => toast.error(String(err)),
  });

  const [notifyForm, setNotifyForm] = useState({ template_name: '', message: '' });
  const notifyMutation = useMutation({
    mutationFn: () => customersApi.sendNotification(id, notifyForm),
    onSuccess: () => {
      toast.success('WhatsApp notification queued');
      setNotifyOpen(false);
    },
    onError: (err) => toast.error(String(err)),
  });

  const [awardOpen, setAwardOpen] = useState(false);
  const [awardForm, setAwardForm] = useState({ points: '', reason: '' });
  const awardMutation = useMutation({
    mutationFn: () => customersApi.awardPoints(id, { points: Number(awardForm.points), reason: awardForm.reason }),
    onSuccess: (data) => {
      toast.success(`${awardForm.points} points awarded. New balance: ${formatNumber(data.newBalance)}`);
      qc.invalidateQueries({ queryKey: ['customer', id] });
      qc.invalidateQueries({ queryKey: ['customer-ledger', id] });
      setAwardOpen(false);
      setAwardForm({ points: '', reason: '' });
    },
    onError: (err) => toast.error(String(err)),
  });

  const openEdit = () => {
    if (customer) {
      setEditForm({
        name: customer.name ?? '',
        email: customer.email ?? '',
        gender: customer.gender ?? '',
        region: customer.region ?? '',
        store: customer.store ?? '',
        dateOfBirth: customer.dateOfBirth ? customer.dateOfBirth.slice(0, 10) : '',
      });
    }
    setEditOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!customer) return <div>Customer not found</div>;

  const nextTier = customer.nextTier;
  const tierProgressPct = customer.tierProgress ?? 0;
  const stats = customer.stats ?? {};

  const statCards = [
    {
      label: 'Total Spent',
      value: formatCurrency(stats.totalSpent ?? 0),
      icon: ShoppingBag,
      accent: '#FFD000',
      bg: 'bg-[#fffde8]',
      iconColor: 'text-[#a07800]',
      sub: `${formatNumber(stats.totalTransactions ?? 0)} transactions`,
    },
    {
      label: 'Points Earned',
      value: formatNumber(stats.totalPointsEarned ?? 0),
      icon: Star,
      accent: '#22c55e',
      bg: 'bg-green-50',
      iconColor: 'text-green-600',
      sub: 'Lifetime total',
    },
    {
      label: 'Points Redeemed',
      value: formatNumber(stats.totalPointsRedeemed ?? 0),
      icon: RotateCcw,
      accent: '#f97316',
      bg: 'bg-orange-50',
      iconColor: 'text-orange-600',
      sub: `${stats.totalPointsEarned > 0 ? Math.round((stats.totalPointsRedeemed / stats.totalPointsEarned) * 100) : 0}% redemption rate`,
    },
    {
      label: 'Avg Order Value',
      value: formatCurrency(stats.avgOrderValue ?? 0),
      icon: BarChart2,
      accent: '#8b5cf6',
      bg: 'bg-purple-50',
      iconColor: 'text-purple-600',
      sub: 'Per transaction',
    },
    {
      label: 'Avg Visits / Month',
      value: String(stats.avgVisitsPerMonth ?? 0),
      icon: Calendar,
      accent: '#111111',
      bg: 'bg-[#f5f5f5]',
      iconColor: 'text-[#444]',
      sub: 'Visit frequency',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Back + Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshAll}
            title="Refresh customer data"
          >
            <RefreshCw className={`w-4 h-4 ${historyFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={openEdit}>
            <Edit2 className="w-4 h-4" />
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAwardOpen(true)}>
            <Gift className="w-4 h-4" />
            Award Points
          </Button>
          <Button size="sm" onClick={() => setNotifyOpen(true)}>
            <MessageCircle className="w-4 h-4" />
            Send WhatsApp
          </Button>
        </div>
      </div>


      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {statCards.map((card) => (
          <Card key={card.label} className="overflow-hidden hover:shadow-md transition-all">
            <div className="h-0.5 w-full" style={{ background: card.accent }} />
            <CardContent className="p-4 space-y-2.5">
              <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center`}>
                <card.icon className={`w-4 h-4 ${card.iconColor}`} />
              </div>
              <div>
                <p className="text-[19px] font-black text-[#111] tabular-nums leading-tight">{card.value}</p>
                <p className="text-[11px] font-semibold text-slate-500 mt-0.5">{card.label}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{card.sub}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Profile Card */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-1">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold">{customer.name}</h2>
                <p className="text-muted-foreground text-sm">{customer.mobileNumber}</p>
                {customer.email && <p className="text-muted-foreground text-sm">{customer.email}</p>}
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <TierBadge name={customer.tier?.name} />
                {customer.segment && (
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${segmentColor(customer.segment)}`}>
                    {segmentLabel(customer.segment)}
                  </span>
                )}
              </div>
            </div>

            {/* Engagement score bar */}
            {customer.engagementScore !== undefined && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1"><Zap className="w-3 h-3" /> Engagement</span>
                  <span className="font-bold">{customer.engagementScore}/100</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-700"
                    style={{
                      width: `${customer.engagementScore}%`,
                      background: customer.engagementScore >= 70 ? '#22c55e' : customer.engagementScore >= 40 ? '#FFD000' : '#ef4444',
                    }}
                  />
                </div>
              </div>
            )}

            {/* Points highlight */}
            <div className="bg-[#fffde8] border border-[#FFD000]/30 rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-[#a07800] font-medium">Available Points</p>
                <p className="text-2xl font-black text-[#111]">{formatNumber(customer.totalPoints)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Lifetime Earned</p>
                <p className="font-bold text-slate-700">{formatNumber(customer.lifetimePoints)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Lifetime Sale</p>
                <p className="font-bold">{formatCurrency(Number(customer.lifetimeSale))}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Last Visit</p>
                <p className="font-bold">{customer.lastVisitDate ? formatDate(customer.lastVisitDate) : '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Gender</p>
                <p className="font-medium">{customer.gender ?? '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Store</p>
                <p className="font-medium">{customer.store ?? '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Region</p>
                <p className="font-medium">{customer.region ?? '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">DOB</p>
                <p className="font-medium">{customer.dateOfBirth ? formatDate(customer.dateOfBirth) : '—'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tier Progress */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Tier Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{customer.tier?.name} Tier</span>
                {nextTier ? (
                  <span className="text-muted-foreground">
                    {formatCurrency(nextTier.spendFrom - Number(customer.lifetimeSale))} to {nextTier.name}
                  </span>
                ) : (
                  <span className="text-yellow-600 font-medium">Maximum tier reached</span>
                )}
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div
                  className="h-3 rounded-full transition-all duration-700"
                  style={{ width: `${tierProgressPct}%`, background: '#FFD000' }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{formatCurrency(Number(customer.tier?.spendFrom ?? 0))}</span>
                {nextTier && <span>{formatCurrency(Number(nextTier.spendFrom))}</span>}
              </div>
            </div>

            {/* Tier benefits */}
            {tiers && (
              <div className="grid grid-cols-2 gap-3">
                {(tiers as Array<{ id: number; name: string; rewardPercentage: number; redeemValue?: number; spendFrom: number; spendTo: number }>).map((t) => {
                  const isActive = customer.tier?.name === t.name;
                  return (
                    <div
                      key={t.id}
                      className={`p-3 rounded-lg border text-sm transition-all ${
                        isActive ? 'border-[#FFD000] bg-[#fffde8] shadow-sm' : 'border-border bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <TierBadge name={t.name} />
                        <span className={`font-black text-sm ${isActive ? 'text-[#a07800]' : 'text-slate-500'}`}>
                          {Number(t.rewardPercentage)}%
                        </span>
                      </div>
                      <p className="text-muted-foreground mt-1.5 text-xs">
                        {formatCurrency(t.spendFrom)} – {t.spendTo ? formatCurrency(t.spendTo) : '∞'}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        1 pt = PKR {Number(t.redeemValue ?? 1)}
                      </p>
                      {isActive && (
                        <p className="text-[10px] font-bold text-[#a07800] mt-1">◉ Current Tier</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transaction History + Points Ledger */}
      <Card>
        <CardContent className="p-4">
          <Tabs defaultValue="history">
            <TabsList>
              <TabsTrigger value="history">Transaction History</TabsTrigger>
              <TabsTrigger value="ledger">Points Ledger</TabsTrigger>
            </TabsList>

            <TabsContent value="history">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="w-8 py-3 px-2" />
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Date</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Receipt</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Store</th>
                      <th className="text-right py-3 px-2 font-medium text-muted-foreground">Amount</th>
                      <th className="text-right py-3 px-2 font-medium text-muted-foreground">Pts Earned</th>
                      <th className="text-right py-3 px-2 font-medium text-muted-foreground">Pts Redeemed</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(history?.data ?? []).map(
                      (tx: {
                        id: string;
                        transactionDate: string;
                        receiptNo: string;
                        store: string;
                        saleAmount: number;
                        pointsEarned: number;
                        pointsRedeemed: number;
                        status: string;
                        items?: { id: string; sku: string; description: string; qty: number; unitPrice: number; totalPrice: number }[];
                      }) => (
                        <>
                          <tr
                            key={tx.id}
                            className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                          >
                            <td className="py-2 px-2">
                              {tx.items && tx.items.length > 0 && (
                                <button
                                  onClick={() => setExpandedTx(expandedTx === tx.id ? null : tx.id)}
                                  className="w-6 h-6 rounded flex items-center justify-center hover:bg-muted transition-colors"
                                  title="View items"
                                >
                                  {expandedTx === tx.id
                                    ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                                    : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
                                </button>
                              )}
                            </td>
                            <td className="py-2 px-2 text-xs">{formatDateTime(tx.transactionDate)}</td>
                            <td className="py-2 px-2 text-muted-foreground text-xs">{tx.receiptNo ?? '—'}</td>
                            <td className="py-2 px-2 text-muted-foreground text-xs">{tx.store}</td>
                            <td className="py-2 px-2 text-right font-medium text-sm">
                              {formatCurrency(Number(tx.saleAmount))}
                            </td>
                            <td className="py-2 px-2 text-right text-green-600 text-sm font-semibold">
                              +{formatNumber(tx.pointsEarned)}
                            </td>
                            <td className="py-2 px-2 text-right text-orange-600 text-sm">
                              {tx.pointsRedeemed > 0 ? `-${formatNumber(tx.pointsRedeemed)}` : '—'}
                            </td>
                            <td className="py-2 px-2">
                              <Badge className="bg-green-50 text-green-700 border-green-200 text-[10px]">
                                {tx.status}
                              </Badge>
                            </td>
                          </tr>
                          {expandedTx === tx.id && tx.items && tx.items.length > 0 && (
                            <tr key={`${tx.id}-items`} className="bg-[#fffde8]/60 border-b border-[#FFD000]/20">
                              <td colSpan={8} className="px-4 py-3">
                                <div className="flex items-center gap-1.5 mb-2">
                                  <Package className="w-3.5 h-3.5 text-[#a07800]" />
                                  <span className="text-[11px] font-black text-[#a07800] uppercase tracking-wide">
                                    {tx.items.length} Item{tx.items.length !== 1 ? 's' : ''}
                                  </span>
                                </div>
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b border-[#FFD000]/30">
                                      <th className="text-left py-1.5 pr-3 font-semibold text-slate-500">SKU</th>
                                      <th className="text-left py-1.5 pr-3 font-semibold text-slate-500">Description</th>
                                      <th className="text-right py-1.5 pr-3 font-semibold text-slate-500">Qty</th>
                                      <th className="text-right py-1.5 pr-3 font-semibold text-slate-500">Unit Price</th>
                                      <th className="text-right py-1.5 font-semibold text-slate-500">Total</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {tx.items.map((item, idx) => (
                                      <tr key={idx} className="border-b border-[#FFD000]/10 last:border-0">
                                        <td className="py-1.5 pr-3 font-mono text-slate-500">{item.sku || '—'}</td>
                                        <td className="py-1.5 pr-3 text-slate-700">{item.description || '—'}</td>
                                        <td className="py-1.5 pr-3 text-right tabular-nums">{Number(item.qty)}</td>
                                        <td className="py-1.5 pr-3 text-right tabular-nums">{formatCurrency(Number(item.unitPrice))}</td>
                                        <td className="py-1.5 text-right font-semibold tabular-nums">{formatCurrency(Number(item.totalPrice))}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </td>
                            </tr>
                          )}
                        </>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between mt-3">
                <p className="text-sm text-muted-foreground">{history?.meta?.total ?? 0} transactions</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={historyPage <= 1}
                    onClick={() => setHistoryPage((p) => p - 1)}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={historyPage >= (history?.meta?.totalPages ?? 1)}
                    onClick={() => setHistoryPage((p) => p + 1)}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="ledger">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Date</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Reason</th>
                      <th className="text-right py-3 px-2 font-medium text-muted-foreground">Change</th>
                      <th className="text-right py-3 px-2 font-medium text-muted-foreground">Balance</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(ledger?.data ?? []).map(
                      (e: {
                        id: number;
                        createdAt: string;
                        reason: string;
                        pointsChange: number;
                        runningBalance: number;
                        referenceId: string;
                      }) => (
                        <tr key={String(e.id)} className="border-b border-border/50">
                          <td className="py-2 px-2 text-muted-foreground">
                            {formatDateTime(e.createdAt)}
                          </td>
                          <td className="py-2 px-2">
                            <Badge
                              className={
                                e.reason === 'EARNED'
                                  ? 'bg-green-50 text-green-700 border-green-200'
                                  : e.reason === 'REDEEMED'
                                  ? 'bg-orange-50 text-orange-700 border-orange-200'
                                  : 'bg-red-50 text-red-700 border-red-200'
                              }
                            >
                              {e.reason}
                            </Badge>
                          </td>
                          <td
                            className={`py-2 px-2 text-right font-bold ${
                              e.pointsChange >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {e.pointsChange >= 0 ? '+' : ''}
                            {formatNumber(e.pointsChange)}
                          </td>
                          <td className="py-2 px-2 text-right font-medium">
                            {formatNumber(e.runningBalance)}
                          </td>
                          <td className="py-2 px-2 text-muted-foreground text-xs">
                            {e.referenceId}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between mt-3">
                <p className="text-sm text-muted-foreground">{ledger?.meta?.total ?? 0} entries</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={ledgerPage <= 1}
                    onClick={() => setLedgerPage((p) => p - 1)}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={ledgerPage >= (ledger?.meta?.totalPages ?? 1)}
                    onClick={() => setLedgerPage((p) => p + 1)}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} title="Edit Customer">
        <div className="space-y-3">
          {(['name', 'email', 'gender', 'region', 'store'] as const).map((field) => (
            <div key={field} className="space-y-1">
              <Label className="capitalize">{field}</Label>
              <Input
                value={editForm[field]}
                onChange={(e) => setEditForm((f) => ({ ...f, [field]: e.target.value }))}
              />
            </div>
          ))}
          <div className="space-y-1">
            <Label>Date of Birth</Label>
            <Input
              type="date"
              value={editForm.dateOfBirth}
              onChange={(e) => setEditForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              className="flex-1"
              loading={updateMutation.isPending}
              onClick={() => updateMutation.mutate(editForm)}
            >
              Save Changes
            </Button>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Award Points Dialog */}
      <Dialog open={awardOpen} onClose={() => setAwardOpen(false)} title="Award Bonus Points">
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Points to Award</Label>
            <Input
              type="number"
              min="1"
              placeholder="e.g. 500"
              value={awardForm.points}
              onChange={(e) => setAwardForm((f) => ({ ...f, points: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Reason</Label>
            <Input
              placeholder="e.g. Birthday gift, Complaint resolution..."
              value={awardForm.reason}
              onChange={(e) => setAwardForm((f) => ({ ...f, reason: e.target.value }))}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              className="flex-1"
              loading={awardMutation.isPending}
              onClick={() => awardMutation.mutate()}
              disabled={!awardForm.points || !awardForm.reason || Number(awardForm.points) <= 0}
            >
              <Gift className="w-4 h-4" /> Award Points
            </Button>
            <Button variant="outline" onClick={() => setAwardOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Dialog>

      {/* Notify Dialog */}
      <Dialog open={notifyOpen} onClose={() => setNotifyOpen(false)} title="Send WhatsApp Message">
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Template Name</Label>
            <Input
              placeholder="e.g. points_earned_confirmation"
              value={notifyForm.template_name}
              onChange={(e) => setNotifyForm((f) => ({ ...f, template_name: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Message (optional)</Label>
            <textarea
              className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="Override body text..."
              value={notifyForm.message}
              onChange={(e) => setNotifyForm((f) => ({ ...f, message: e.target.value }))}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              className="flex-1"
              loading={notifyMutation.isPending}
              onClick={() => notifyMutation.mutate()}
              disabled={!notifyForm.template_name}
            >
              Send
            </Button>
            <Button variant="outline" onClick={() => setNotifyOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

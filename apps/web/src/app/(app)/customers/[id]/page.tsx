'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { ArrowLeft, MessageCircle, Edit2, ChevronLeft, ChevronRight, Gift, Zap, ShoppingBag, Star, RotateCcw, BarChart2, Calendar, ChevronDown, ChevronUp, Package, RefreshCw, TrendingUp, MapPin, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { isValidEmail } from '@loyalty/shared';

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const [editOpen, setEditOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [expandedTx, setExpandedTx] = useState<string | null>(null);
  const [txItems, setTxItems] = useState<Record<string, { id: string; sku: string; description: string; qty: number; unitPrice: number; totalPrice: number }[]>>({});

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
    region: '',
    store: '',
    dateOfBirth: '',
    status: 'active',
    isActive: true,
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
        region: customer.region ?? '',
        store: customer.store ?? '',
        dateOfBirth: customer.dateOfBirth ? customer.dateOfBirth.slice(0, 10) : '',
        status: (customer as any).status ?? 'active',
        isActive: (customer as any).isActive !== false,
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
    <div className="space-y-4">
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

      {/* Unified Customer Card */}
      {(() => {
        type TierRow = { id: number; name: string; rewardPercentage: number; redeemValue?: number; spendFrom: number; spendTo: number };
        const tierList = (tiers ?? []) as TierRow[];
        const currentIdx = tierList.findIndex((t) => t.name === customer.tier?.name);
        const overallPct = tierList.length > 1
          ? Math.min(100, ((currentIdx + (tierProgressPct / 100)) / (tierList.length - 1)) * 100)
          : tierProgressPct;

        function tierDotColor(name: string): string {
          switch (name?.toLowerCase()) {
            case 'silver':   return '#94a3b8';
            case 'gold':     return '#f59e0b';
            case 'platinum': return '#a855f7';
            case 'diamond':  return '#22d3ee';
            default:         return '#FFD000';
          }
        }

        return (
          <Card>
            <CardContent className="p-6 space-y-5">
              {/* Name + badges */}
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold">{customer.name}</h2>
                  <TierBadge name={customer.tier?.name} />
                  {customer.segment && (
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${segmentColor(customer.segment)}`}>
                      {segmentLabel(customer.segment)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">+{customer.countryCode} {customer.mobileNumber}</p>
                {customer.email && <p className="text-sm text-muted-foreground">{customer.email}</p>}
              </div>

              {/* Milestone tier progress bar */}
              {tierList.length > 0 && (
                <div className="space-y-1">
                  {/* Tier icons + badges + percentages */}
                  <div className="flex items-end">
                    {tierList.map((t, i) => {
                      const isActive = t.name === customer.tier?.name;
                      const isPast = i <= currentIdx;
                      return (
                        <div key={t.id} className="flex flex-col items-center gap-1" style={{ flex: 1 }}>
                          <TierBadge name={t.name} />
                          <span className={`text-[11px] font-bold ${isActive ? 'text-[#a07800]' : 'text-muted-foreground'}`}>
                            {Number(t.rewardPercentage)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Progress track with milestone dots + percentage */}
                  <div className="relative h-2 mx-[20px]">
                    <div className="absolute inset-0 bg-muted rounded-full" />
                    <div
                      className="absolute top-0 left-0 h-2 rounded-full transition-all duration-700"
                      style={{ width: `${overallPct}%`, background: '#FFD000' }}
                    />
                    {/* Percentage label above the fill end */}
                    {overallPct > 0 && overallPct < 100 && (
                      <div
                        className="absolute -top-5 -translate-x-1/2 text-[10px] font-bold text-[#a07800] whitespace-nowrap"
                        style={{ left: `${overallPct}%` }}
                      >
                        {Math.round(tierProgressPct)}%
                      </div>
                    )}
                    {tierList.map((_, i) => {
                      const pos = tierList.length > 1 ? (i / (tierList.length - 1)) * 100 : 0;
                      const isPast = i <= currentIdx;
                      return (
                        <div
                          key={i}
                          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full border-2 border-white"
                          style={{ left: `${pos}%`, background: isPast ? '#FFD000' : '#cbd5e1' }}
                        />
                      );
                    })}
                  </div>

                  {/* Amount labels */}
                  <div className="flex mx-[20px]">
                    {tierList.map((t, i) => (
                      <div
                        key={t.id}
                        className="flex-1 flex"
                        style={{ justifyContent: i === 0 ? 'flex-start' : i === tierList.length - 1 ? 'flex-end' : 'center' }}
                      >
                        <span className={`text-[10px] tabular-nums ${t.name === customer.tier?.name ? 'font-bold text-slate-700' : 'text-muted-foreground'}`}>
                          {i === tierList.length - 1 && !t.spendTo ? `${formatCurrency(t.spendFrom)}+` : formatCurrency(t.spendFrom)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Progress label */}
                  <p className="text-center text-xs text-muted-foreground pt-0.5">
                    {nextTier
                      ? <><span className="font-semibold text-slate-700">{formatCurrency(nextTier.spendFrom - Number(customer.lifetimeSale))}</span> to {nextTier.name}</>
                      : <span className="text-yellow-600 font-semibold">Maximum tier reached</span>
                    }
                  </p>
                </div>
              )}

              {/* Stats rows — enhanced */}
              <div className="border-t pt-4 space-y-3">
                {/* Row 1: key metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Engagement */}
                  <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="w-7 h-7 rounded-lg bg-yellow-50 flex items-center justify-center">
                        <Zap className="w-3.5 h-3.5 text-yellow-600" />
                      </div>
                      <span className="text-[10px] font-semibold text-yellow-700 bg-yellow-50 px-1.5 py-0.5 rounded-full border border-yellow-200">
                        {customer.engagementScore ?? 0}/100
                      </span>
                    </div>
                    <div>
                      <p className="text-base font-bold text-slate-800 tabular-nums leading-tight">{customer.engagementScore ?? 0}<span className="text-xs font-normal text-slate-400">/100</span></p>
                      <p className="text-[11px] text-muted-foreground">Engagement Score</p>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                      <div className="h-full rounded-full bg-[#FFD000] transition-all duration-700" style={{ width: `${customer.engagementScore ?? 0}%` }} />
                    </div>
                  </div>

                  {/* Available Points */}
                  <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 space-y-2">
                    <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center">
                      <Star className="w-3.5 h-3.5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-base font-bold text-slate-800 tabular-nums leading-tight">{formatNumber(customer.totalPoints)}</p>
                      <p className="text-[11px] text-muted-foreground">Available Points</p>
                    </div>
                  </div>

                  {/* Lifetime Sale */}
                  <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 space-y-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                      <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-base font-bold text-slate-800 tabular-nums leading-tight">{formatCurrency(Number(customer.lifetimeSale))}</p>
                      <p className="text-[11px] text-muted-foreground">Lifetime Sale</p>
                    </div>
                  </div>

                  {/* Last Visit */}
                  <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 space-y-2">
                    <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-base font-bold text-slate-800 tabular-nums leading-tight">
                        {customer.lastVisitDate ? formatDate(customer.lastVisitDate) : '—'}
                      </p>
                      <p className="text-[11px] text-muted-foreground">Last Visit</p>
                    </div>
                  </div>
                </div>

                {/* Row 2: profile details */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Store', value: customer.store ?? '—', icon: Building2, iconBg: 'bg-orange-50', iconColor: 'text-orange-500' },
                    { label: 'Region', value: customer.region ?? '—', icon: MapPin, iconBg: 'bg-pink-50', iconColor: 'text-pink-500' },
                    { label: 'Date of Birth', value: customer.dateOfBirth ? formatDate(customer.dateOfBirth) : '—', icon: Calendar, iconBg: 'bg-purple-50', iconColor: 'text-purple-500' },
                  ].map((item, i) => (
                    <div key={i} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg ${item.iconBg} flex items-center justify-center flex-shrink-0`}>
                        <item.icon className={`w-4 h-4 ${item.iconColor}`} />
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">{item.label}</p>
                        <p className="font-semibold text-sm text-slate-800 leading-tight">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}

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
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Transaction ID</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Store</th>
                      <th className="text-right py-3 px-2 font-medium text-muted-foreground">
                        Sale Amount
                        <span className="ml-1 text-[10px] font-normal text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">pts base</span>
                      </th>
                      <th className="text-right py-3 px-2 font-medium text-muted-foreground">Tax Amount</th>
                      <th className="text-right py-3 px-2 font-medium text-muted-foreground">Gross Amount</th>
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
                        retailproTransactionId: string;
                        store: string;
                        saleAmount: number;
                        taxAmount: number | null;
                        grossAmount: number | null;
                        pointsEarned: number;
                        pointsRedeemed: number;
                        status: string;
                      }) => {
                        const items = txItems[tx.id];
                        const isExpanded = expandedTx === tx.id;
                        return (
                          <React.Fragment key={tx.id}>
                            <tr className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                              <td className="py-2 px-2">
                                <button
                                  onClick={async () => {
                                    if (isExpanded) {
                                      setExpandedTx(null);
                                    } else {
                                      setExpandedTx(tx.id);
                                      if (!txItems[tx.id]) {
                                        try {
                                          const res = await customersApi.getTransactionItems(id, tx.id);
                                          setTxItems((prev) => ({ ...prev, [tx.id]: res.data ?? [] }));
                                        } catch {
                                          setTxItems((prev) => ({ ...prev, [tx.id]: [] }));
                                        }
                                      }
                                    }
                                  }}
                                  className="w-6 h-6 rounded flex items-center justify-center hover:bg-muted transition-colors"
                                  title="View items"
                                >
                                  {isExpanded
                                    ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                                    : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
                                </button>
                              </td>
                              <td className="py-2 px-2 text-xs">{formatDateTime(tx.transactionDate)}</td>
                              <td className="py-2 px-2 text-muted-foreground text-xs">{tx.retailproTransactionId ?? '—'}</td>
                              <td className="py-2 px-2 text-muted-foreground text-xs">{tx.store}</td>
                              <td className="py-2 px-2 text-right font-medium text-sm">
                                {formatCurrency(Number(tx.saleAmount))}
                              </td>
                              <td className="py-2 px-2 text-right text-slate-500 text-sm">
                                {tx.taxAmount != null ? formatCurrency(Number(tx.taxAmount)) : '—'}
                              </td>
                              <td className="py-2 px-2 text-right font-medium text-sm text-slate-700">
                                {tx.grossAmount != null ? formatCurrency(Number(tx.grossAmount)) : '—'}
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
                            {isExpanded && (
                              <tr className="bg-[#fffde8]/60 border-b border-[#FFD000]/20">
                                <td colSpan={10} className="px-4 py-3">
                                  {!items ? (
                                    <p className="text-xs text-slate-400">Loading items…</p>
                                  ) : items.length === 0 ? (
                                    <p className="text-xs text-slate-400">No item details recorded for this transaction.</p>
                                  ) : (
                                    <>
                                      <div className="flex items-center gap-1.5 mb-2">
                                        <Package className="w-3.5 h-3.5 text-[#a07800]" />
                                        <span className="text-[11px] font-black text-[#a07800] uppercase tracking-wide">
                                          {items.length} Item{items.length !== 1 ? 's' : ''}
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
                                          {items.map((item, idx) => (
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
                                    </>
                                  )}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      },
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
      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Customer"
        headerExtra={
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
            editForm.status === 'active'   ? 'bg-green-50 text-green-700 border-green-200'  :
            editForm.status === 'inactive' ? 'bg-red-50 text-red-700 border-red-200'        :
                                             'bg-gray-100 text-gray-700 border-gray-300'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              editForm.status === 'active' ? 'bg-green-500' :
              editForm.status === 'inactive' ? 'bg-red-400' : 'bg-gray-500'
            }`} />
            {editForm.status.charAt(0).toUpperCase() + editForm.status.slice(1)}
          </span>
        }
      >
        <div className="space-y-3">
          {(['name', 'region', 'store'] as const).map((field) => (
            <div key={field} className="space-y-1">
              <Label className="capitalize">{field}</Label>
              <Input
                value={editForm[field]}
                onChange={(e) => setEditForm((f) => ({ ...f, [field]: e.target.value }))}
              />
            </div>
          ))}
          <div className="space-y-1">
            <Label>Email</Label>
            <Input
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Date of Birth</Label>
            <Input
              type="date"
              value={editForm.dateOfBirth}
              onChange={(e) => setEditForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Status</Label>
            <select
              value={editForm.status}
              onChange={(e) => setEditForm((f) => ({
                ...f,
                status: e.target.value,
                isActive: e.target.value === 'active',
              }))}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              className="flex-1"
              loading={updateMutation.isPending}
              onClick={() => {
                if (editForm.email.trim() && !isValidEmail(editForm.email)) {
                  toast.error('Enter a valid email address');
                  return;
                }
                updateMutation.mutate({
                  ...editForm,
                  isActive: editForm.status === 'active',
                } as typeof editForm);
              }}
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

'use client';

import { useQuery } from '@tanstack/react-query';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { dashboardApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatNumber, formatDateTime, segmentColor, segmentLabel } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { TierBadge } from '@/components/ui/tier-badge';
import {
  Users,
  TrendingUp,
  Star,
  Layers,
  ShoppingBag,
  Zap,
  ArrowUpRight,
  Trophy,
  AlertTriangle,
  Coins,
  BarChart2,
} from 'lucide-react';
import Link from 'next/link';

function tierPieColor(tier: string): string {
  switch (tier?.toLowerCase()) {
    case 'classic':  return '#d6cfc7';
    case 'silver':   return '#cbd5e1';
    case 'gold':     return '#f59e0b';
    case 'platinum': return '#a855f7';
    case 'diamond':  return '#22d3ee';
    default:         return '#9ca3af';
  }
}
const SEGMENT_COLORS = ['#FFD000', '#22c55e', '#3b82f6', '#8b5cf6', '#f97316', '#ef4444'];

export default function DashboardPage() {
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: dashboardApi.getMetrics,
    refetchInterval: 60000,
  });

  const { data: trend } = useQuery({
    queryKey: ['dashboard-trend'],
    queryFn: () => dashboardApi.getPointsTrend(30),
  });

  const { data: distribution } = useQuery({
    queryKey: ['dashboard-distribution'],
    queryFn: dashboardApi.getTierDistribution,
  });

  const { data: recentTx } = useQuery({
    queryKey: ['dashboard-recent'],
    queryFn: () => dashboardApi.getRecentTransactions(10),
  });

  const { data: segments } = useQuery({
    queryKey: ['dashboard-segments'],
    queryFn: dashboardApi.getCustomerSegments,
    refetchInterval: 120000,
  });

  const { data: topCustomers } = useQuery({
    queryKey: ['dashboard-top-customers'],
    queryFn: () => dashboardApi.getTopCustomers(8),
  });

  const kpis = [
    {
      label: 'Total Customers',
      value: metrics ? formatNumber(metrics.totalCustomers) : '—',
      sub: `${metrics?.activeCustomers ?? '—'} active`,
      icon: Users,
      accent: '#FFD000',
      bg: 'bg-[#fffde8]',
      color: 'text-[#a07800]',
    },
    {
      label: 'Points Issued',
      value: metrics ? formatNumber(metrics.totalPointsIssued) : '—',
      sub: `${metrics?.redemptionRate ?? '—'}% redeemed`,
      icon: Star,
      accent: '#111111',
      bg: 'bg-[#f5f5f5]',
      color: 'text-[#111111]',
    },
    {
      label: 'Points Liability',
      value: metrics ? formatNumber(metrics.pointsLiability ?? 0) : '—',
      sub: 'Unredeemed balance',
      icon: Coins,
      accent: '#f97316',
      bg: 'bg-orange-50',
      color: 'text-orange-600',
    },
    {
      label: 'Avg Transaction',
      value: metrics ? formatCurrency(metrics.avgTransactionValue ?? 0) : '—',
      sub: 'Per sale',
      icon: BarChart2,
      accent: '#FFD000',
      bg: 'bg-[#fffde8]',
      color: 'text-[#a07800]',
    },
    {
      label: "Today's Revenue",
      value: metrics ? formatCurrency(metrics.revenueToday) : '—',
      sub: `${metrics?.transactionsToday ?? 0} transactions`,
      icon: ShoppingBag,
      accent: '#22c55e',
      bg: 'bg-green-50',
      color: 'text-green-700',
    },
    {
      label: 'Active Tiers',
      value: metrics ? formatNumber(metrics.activeTiers) : '—',
      sub: 'Configured tiers',
      icon: Layers,
      accent: '#111111',
      bg: 'bg-[#f5f5f5]',
      color: 'text-[#111111]',
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="hover:shadow-lg transition-all hover:-translate-y-0.5 overflow-hidden">
            <div className="h-0.5 w-full" style={{ background: kpi.accent }} />
            <CardContent className="p-5">
              {metricsLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-9 w-9 rounded-xl" />
                  <Skeleton className="h-7 w-20" />
                  <Skeleton className="h-3.5 w-24" />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className={`w-9 h-9 rounded-xl ${kpi.bg} flex items-center justify-center`}>
                    <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                  </div>
                  <div>
                    <p className="text-[22px] font-black text-[#111111] tabular-nums tracking-tight">{kpi.value}</p>
                    <p className="text-[11px] font-medium text-slate-500 mt-0.5">{kpi.label}</p>
                    {kpi.sub && <p className="text-[10px] text-slate-400 mt-0.5">{kpi.sub}</p>}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Points Trend */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Points Activity</CardTitle>
              <span className="text-[11px] font-black text-[#111111] bg-[#fffde8] px-2.5 py-1 rounded-full border border-[#FFD000]/40">Last 30 days</span>
            </div>
          </CardHeader>
          <CardContent>
            {!trend ? (
              <Skeleton className="h-56 w-full rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height={224}>
                <AreaChart data={trend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="earnGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FFD000" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#FFD000" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="redeemGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tickFormatter={(v: string) => v.slice(5)} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                    formatter={(value: number, name: string) => [formatNumber(value), name === 'pointsEarned' ? 'Points Earned' : 'Points Redeemed']}
                  />
                  <Area type="monotone" dataKey="pointsEarned" stroke="#FFD000" strokeWidth={2.5} fill="url(#earnGrad)" dot={false} />
                  <Area type="monotone" dataKey="pointsRedeemed" stroke="#f59e0b" strokeWidth={2} fill="url(#redeemGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
            <div className="flex items-center gap-4 mt-3">
              <span className="flex items-center gap-1.5 text-xs font-bold text-[#666]"><span className="w-2.5 h-2.5 rounded-full bg-[#FFD000] inline-block" /> Earned</span>
              <span className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> Redeemed</span>
            </div>
          </CardContent>
        </Card>

        {/* Customer Segments Pie */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Customer Segments</CardTitle>
              <TrendingUp className="w-4 h-4 text-slate-400" />
            </div>
          </CardHeader>
          <CardContent>
            {!segments ? (
              <Skeleton className="h-56 w-full rounded-xl" />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={segments} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={65} innerRadius={40} strokeWidth={0}>
                      {segments.map((entry: { segment: string; color: string }, i: number) => (
                        <Cell key={entry.segment} fill={entry.color ?? SEGMENT_COLORS[i % SEGMENT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                      formatter={(value: number, name: string) => [formatNumber(value), name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {segments.map((s: { segment: string; label: string; color: string; count: number; percentage: number }, i: number) => (
                    <div key={s.segment} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-slate-600">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ background: s.color ?? SEGMENT_COLORS[i % SEGMENT_COLORS.length] }} />
                        {s.label}
                      </span>
                      <span className="font-semibold text-slate-800">{formatNumber(s.count)} <span className="font-normal text-slate-400">({s.percentage}%)</span></span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Top Customers + Tier Distribution */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Top Customers Leaderboard */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[#FFD000]" />
                <CardTitle>Top Customers</CardTitle>
              </div>
              <Link href="/customers" className="text-[11px] text-slate-500 hover:text-[#111] flex items-center gap-1">
                View all <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {!topCustomers ? (
              <div className="space-y-2 px-6 pb-5">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left py-2.5 px-6 table-header text-[11px]">#</th>
                      <th className="text-left py-2.5 px-3 table-header text-[11px]">Customer</th>
                      <th className="text-left py-2.5 px-3 table-header text-[11px]">Segment</th>
                      <th className="text-left py-2.5 px-3 table-header text-[11px]">Tier</th>
                      <th className="text-right py-2.5 px-3 table-header text-[11px]">Lifetime Spend</th>
                      <th className="text-right py-2.5 pr-6 px-3 table-header text-[11px]">Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topCustomers.map(
                      (c: { id: string; name: string; segment: string; tier: { name: string }; lifetimeSale: number; totalPoints: number }, idx: number) => (
                        <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-6">
                            {idx < 3 ? (
                              <span className={`font-black text-sm ${idx === 0 ? 'text-[#FFD000]' : idx === 1 ? 'text-slate-400' : 'text-amber-600'}`}>
                                #{idx + 1}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">#{idx + 1}</span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <Link href={`/customers/${c.id}`} className="font-medium text-slate-800 hover:text-[#111] hover:underline">{c.name}</Link>
                          </td>
                          <td className="py-3 px-3">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${segmentColor(c.segment)}`}>
                              {segmentLabel(c.segment)}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <TierBadge name={c.tier?.name} />
                          </td>
                          <td className="py-3 px-3 text-right font-semibold text-slate-800 text-xs">{formatCurrency(c.lifetimeSale)}</td>
                          <td className="py-3 px-3 pr-6 text-right">
                            <span className="text-[#a07800] font-bold text-xs bg-[#fffde8] px-2 py-0.5 rounded-full">{formatNumber(c.totalPoints)}</span>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tier Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Tier Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {!distribution ? (
              <Skeleton className="h-56 w-full rounded-xl" />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={distribution} dataKey="count" nameKey="tier" cx="50%" cy="50%" outerRadius={65} innerRadius={40} strokeWidth={0}>
                      {distribution.map((entry: { tier: string }, i: number) => (
                        <Cell key={entry.tier} fill={tierPieColor(entry.tier)} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                      formatter={(value: number) => [formatNumber(value), 'Customers']}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">
                  {distribution.map((entry: { tier: string; count: number; percentage: number }, i: number) => (
                    <div key={entry.tier} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-slate-600">
                        <span className="w-2 h-2 rounded-full" style={{ background: tierPieColor(entry.tier) }} />
                        {entry.tier}
                      </span>
                      <span className="font-semibold text-slate-800">{formatNumber(entry.count)} <span className="font-normal text-slate-400">({entry.percentage}%)</span></span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Transactions</CardTitle>
            <ArrowUpRight className="w-4 h-4 text-slate-400" />
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {!recentTx ? (
            <div className="space-y-2 px-6 pb-5">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-3 px-6 table-header text-[11px]">Customer</th>
                    <th className="text-left py-3 px-3 table-header text-[11px]">Tier</th>
                    <th className="text-left py-3 px-3 table-header text-[11px]">Store</th>
                    <th className="text-right py-3 px-3 table-header text-[11px]">Amount</th>
                    <th className="text-right py-3 px-3 table-header text-[11px]">Points</th>
                    <th className="text-left py-3 px-3 pr-6 table-header text-[11px]">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTx.map(
                    (tx: { id: string; customer: { name: string; tier: { name: string } }; store: string; saleAmount: number; pointsEarned: number; transactionDate: string }) => (
                      <tr key={tx.id} className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-6 font-medium text-slate-800">{tx.customer?.name}</td>
                        <td className="py-3.5 px-3"><TierBadge name={tx.customer?.tier?.name} /></td>
                        <td className="py-3.5 px-3 text-slate-500 text-xs">{tx.store}</td>
                        <td className="py-3.5 px-3 text-right font-semibold text-slate-800">{formatCurrency(tx.saleAmount)}</td>
                        <td className="py-3.5 px-3 text-right">
                          <span className="text-emerald-600 font-semibold text-xs bg-emerald-50 px-2 py-0.5 rounded-full">+{formatNumber(tx.pointsEarned)}</span>
                        </td>
                        <td className="py-3.5 px-3 pr-6 text-slate-400 text-xs">{formatDateTime(tx.transactionDate)}</td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

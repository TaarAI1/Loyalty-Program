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
import { formatCurrency, formatNumber, formatDateTime, tierColor } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  TrendingUp,
  Star,
  Layers,
  ShoppingBag,
  Zap,
  ArrowUpRight,
} from 'lucide-react';

const TIER_COLORS: Record<string, string> = {
  Silver: '#94a3b8',
  Gold: '#f59e0b',
  Platinum: '#8b5cf6',
  Diamond: '#06b6d4',
};

const TIER_PIE_COLORS = ['#94a3b8', '#f59e0b', '#8b5cf6', '#06b6d4', '#6366f1'];

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

  const kpis = [
    {
      label: 'Total Customers',
      value: metrics ? formatNumber(metrics.totalCustomers) : '—',
      change: '+12%',
      icon: Users,
      accent: '#0052ff',
      bg: 'bg-[#eef3ff]',
      color: 'text-[#0052ff]',
    },
    {
      label: 'Points Issued',
      value: metrics ? formatNumber(metrics.totalPointsIssued) : '—',
      change: '+8%',
      icon: Star,
      accent: '#f59e0b',
      bg: 'bg-amber-50',
      color: 'text-amber-600',
    },
    {
      label: 'Redemption Rate',
      value: metrics ? `${metrics.redemptionRate}%` : '—',
      change: '+3%',
      icon: TrendingUp,
      accent: '#10b981',
      bg: 'bg-emerald-50',
      color: 'text-emerald-600',
    },
    {
      label: 'Active Tiers',
      value: metrics ? formatNumber(metrics.activeTiers) : '—',
      change: '',
      icon: Layers,
      accent: '#8b5cf6',
      bg: 'bg-violet-50',
      color: 'text-violet-600',
    },
    {
      label: "Today's Revenue",
      value: metrics ? formatCurrency(metrics.revenueToday) : '—',
      change: '+5%',
      icon: ShoppingBag,
      accent: '#06b6d4',
      bg: 'bg-cyan-50',
      color: 'text-cyan-600',
    },
    {
      label: "Today's Transactions",
      value: metrics ? formatNumber(metrics.transactionsToday) : '—',
      change: '+2%',
      icon: Zap,
      accent: '#f43f5e',
      bg: 'bg-rose-50',
      color: 'text-rose-500',
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="hover:shadow-lg transition-all hover:-translate-y-0.5 overflow-hidden">
            {/* Top accent line per card */}
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
                    <p className="text-[22px] font-black text-[#00112c] tabular-nums tracking-tight">{kpi.value}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <p className="text-[11px] font-medium text-slate-500">{kpi.label}</p>
                      {kpi.change && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                          {kpi.change}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Points Trend */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Points Activity</CardTitle>
              <span className="text-[11px] font-bold text-[#0052ff] bg-[#eef3ff] px-2.5 py-1 rounded-full border border-[#dce8ff]">Last 30 days</span>
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
                      <stop offset="5%" stopColor="#0052ff" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#0052ff" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="redeemGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v: string) => v.slice(5)}
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                    formatter={(value: number, name: string) => [
                      formatNumber(value),
                      name === 'pointsEarned' ? 'Points Earned' : 'Points Redeemed',
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="pointsEarned"
                    stroke="#0052ff"
                    strokeWidth={2.5}
                    fill="url(#earnGrad)"
                    dot={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="pointsRedeemed"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    fill="url(#redeemGrad)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
            <div className="flex items-center gap-4 mt-3">
              <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0052ff] inline-block" /> Earned
              </span>
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> Redeemed
              </span>
            </div>
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
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={distribution}
                      dataKey="count"
                      nameKey="tier"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      innerRadius={45}
                      strokeWidth={0}
                    >
                      {distribution.map((entry: { tier: string }, i: number) => (
                        <Cell
                          key={entry.tier}
                          fill={TIER_PIE_COLORS[i % TIER_PIE_COLORS.length]}
                        />
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
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ background: TIER_PIE_COLORS[i % TIER_PIE_COLORS.length] }}
                        />
                        {entry.tier}
                      </span>
                      <span className="font-semibold text-slate-800">
                        {formatNumber(entry.count)} <span className="font-normal text-slate-400">({entry.percentage}%)</span>
                      </span>
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
            <div className="space-y-2 px-6 pb-5">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
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
                    (tx: {
                      id: string;
                      customer: { name: string; tier: { name: string } };
                      store: string;
                      saleAmount: number;
                      pointsEarned: number;
                      transactionDate: string;
                    }) => (
                      <tr key={tx.id} className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-6 font-medium text-slate-800">{tx.customer?.name}</td>
                        <td className="py-3.5 px-3">
                          <Badge className={tierColor(tx.customer?.tier?.name)}>
                            {tx.customer?.tier?.name}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-3 text-slate-500 text-xs">{tx.store}</td>
                        <td className="py-3.5 px-3 text-right font-semibold text-slate-800">
                          {formatCurrency(tx.saleAmount)}
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          <span className="text-emerald-600 font-semibold text-xs bg-emerald-50 px-2 py-0.5 rounded-full">
                            +{formatNumber(tx.pointsEarned)}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 pr-6 text-slate-400 text-xs">
                          {formatDateTime(tx.transactionDate)}
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
    </div>
  );
}

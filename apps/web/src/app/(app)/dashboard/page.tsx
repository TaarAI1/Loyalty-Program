'use client';

import { useQuery } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
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
  RefreshCw,
  ShoppingBag,
  ArrowUpRight,
} from 'lucide-react';

const TIER_COLORS: Record<string, string> = {
  Classic: '#6b7280',
  Silver: '#64748b',
  Gold: '#ca8a04',
  Platinum: '#7c3aed',
};

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
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Points Issued',
      value: metrics ? formatNumber(metrics.totalPointsIssued) : '—',
      icon: Star,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
    },
    {
      label: 'Redemption Rate',
      value: metrics ? `${metrics.redemptionRate}%` : '—',
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Active Tiers',
      value: metrics ? formatNumber(metrics.activeTiers) : '—',
      icon: RefreshCw,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      label: "Today's Revenue",
      value: metrics ? formatCurrency(metrics.revenueToday) : '—',
      icon: ShoppingBag,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      label: "Today's Transactions",
      value: metrics ? formatNumber(metrics.transactionsToday) : '—',
      icon: ArrowUpRight,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              {metricsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className={`w-8 h-8 rounded-lg ${kpi.bg} flex items-center justify-center`}>
                    <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Points Trend */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Points Activity — Last 30 Days</CardTitle>
          </CardHeader>
          <CardContent>
            {!trend ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={trend} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => v.slice(5)}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      formatNumber(value),
                      name === 'pointsEarned' ? 'Points Earned' : 'Points Redeemed',
                    ]}
                  />
                  <Legend
                    formatter={(v) => (v === 'pointsEarned' ? 'Earned' : 'Redeemed')}
                  />
                  <Line
                    type="monotone"
                    dataKey="pointsEarned"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="pointsRedeemed"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
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
              <Skeleton className="h-64 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={distribution}
                    dataKey="count"
                    nameKey="tier"
                    cx="50%"
                    cy="45%"
                    outerRadius={80}
                    label={({ tier, percentage }) => `${tier} ${percentage}%`}
                    labelLine={false}
                  >
                    {distribution.map((entry: { tier: string }) => (
                      <Cell
                        key={entry.tier}
                        fill={TIER_COLORS[entry.tier] ?? '#6366f1'}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [formatNumber(value), 'Customers']} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {!recentTx ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Customer</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Tier</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Store</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Amount</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Points</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Date</th>
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
                      <tr key={tx.id} className="border-b border-border/50 hover:bg-muted/50">
                        <td className="py-3 px-2 font-medium">{tx.customer?.name}</td>
                        <td className="py-3 px-2">
                          <Badge className={tierColor(tx.customer?.tier?.name)}>
                            {tx.customer?.tier?.name}
                          </Badge>
                        </td>
                        <td className="py-3 px-2 text-muted-foreground">{tx.store}</td>
                        <td className="py-3 px-2 text-right font-medium">
                          {formatCurrency(tx.saleAmount)}
                        </td>
                        <td className="py-3 px-2 text-right text-green-600 font-medium">
                          +{formatNumber(tx.pointsEarned)}
                        </td>
                        <td className="py-3 px-2 text-muted-foreground">
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

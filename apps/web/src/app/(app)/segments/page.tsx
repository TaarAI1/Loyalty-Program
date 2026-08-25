'use client';

import { useQuery } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { segmentsApi, configApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { TierBadge } from '@/components/ui/tier-badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { exportToCsv, exportToExcel, exportToPdf } from '@/lib/export';
import {
  FileDown,
  FileSpreadsheet,
  FileText,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Users,
} from 'lucide-react';

const RECENCY_OPTIONS = [
  { value: '', label: 'Any recency' },
  { value: '<30', label: 'Active — last 30 days' },
  { value: '30-90', label: 'Lapsing — 30 to 90 days' },
  { value: '90-180', label: 'At Risk — 90 to 180 days' },
  { value: '180+', label: 'Lost — 180+ days' },
];

const ACTIVE_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];

interface Filters {
  minSpend: string;
  maxSpend: string;
  tierId: string;
  recency: string;
  minVisits: string;
  maxVisits: string;
  minPoints: string;
  maxPoints: string;
  store: string;
  region: string;
  enrolledAfter: string;
  enrolledBefore: string;
  isActive: string;
}

const defaultFilters: Filters = {
  minSpend: '',
  maxSpend: '',
  tierId: '',
  recency: '',
  minVisits: '',
  maxVisits: '',
  minPoints: '',
  maxPoints: '',
  store: '',
  region: '',
  enrolledAfter: '',
  enrolledBefore: '',
  isActive: '',
};

function buildParams(filters: Filters, page: number, pageSize: number) {
  return Object.fromEntries(
    Object.entries({
      minSpend: filters.minSpend || undefined,
      maxSpend: filters.maxSpend || undefined,
      tierId: filters.tierId || undefined,
      recency: filters.recency || undefined,
      minVisits: filters.minVisits || undefined,
      maxVisits: filters.maxVisits || undefined,
      minPoints: filters.minPoints || undefined,
      maxPoints: filters.maxPoints || undefined,
      store: filters.store || undefined,
      region: filters.region || undefined,
      enrolledAfter: filters.enrolledAfter || undefined,
      enrolledBefore: filters.enrolledBefore || undefined,
      isActive: filters.isActive || undefined,
      page,
      pageSize,
    }).filter(([, v]) => v !== undefined),
  );
}

interface SegmentCustomer {
  id: string;
  retailproId: string | null;
  name: string;
  email: string | null;
  mobileNumber: string;
  countryCode: string;
  isActive: boolean;
  tier: string | null;
  totalPoints: number;
  lastVisitDate: string | null;
  lifetimeSale: number;
  transactionCount: number;
  store: string | null;
  createdAt: string;
}

export default function SegmentsPage() {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(defaultFilters);
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const { data: tiers } = useQuery({
    queryKey: ['tiers'],
    queryFn: configApi.getTiers,
  });

  const params = buildParams(appliedFilters, page, pageSize);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['segments', appliedFilters, page],
    queryFn: () => segmentsApi.getCustomers(params),
  });

  const applyFilters = () => {
    setAppliedFilters({ ...filters });
    setPage(1);
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
    setPage(1);
  };

  const handleExport = useCallback(
    async (format: 'csv' | 'excel' | 'pdf') => {
      const allParams = buildParams(appliedFilters, 1, 5000);
      const allData = await segmentsApi.getCustomers(allParams);
      const rows = (allData?.data ?? []).map((c: SegmentCustomer) => ({
        'Retailpro ID': c.retailproId ?? '',
        'Name': c.name,
        'Email': c.email ?? '',
        'Phone': `+${c.countryCode}${c.mobileNumber}`,
        'Active': c.isActive ? 'Yes' : 'No',
        'Tier': c.tier ?? '',
        'Points Balance': c.totalPoints,
        'Last Purchase': c.lastVisitDate ? formatDate(c.lastVisitDate) : '',
        'Lifetime Spend': Number(c.lifetimeSale),
        'Total Visits': c.transactionCount,
        'Home Store': c.store ?? '',
        'Enrolled On': formatDate(c.createdAt),
      }));
      const filename = `segments-${new Date().toISOString().slice(0, 10)}`;
      if (format === 'csv') exportToCsv(rows, filename);
      else if (format === 'excel') await exportToExcel(rows, filename);
      else await exportToPdf(rows, filename, 'Customer Segments');
    },
    [appliedFilters],
  );

  const customers: SegmentCustomer[] = data?.data ?? [];
  const total: number = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize) || 1;

  const tierOptions = [
    { value: '', label: 'All Tiers' },
    ...(tiers ?? []).map((t: { id: number; name: string }) => ({
      value: String(t.id),
      label: t.name,
    })),
  ];

  return (
    <div className="flex gap-4 h-full">
      {/* Filter Sidebar */}
      {sidebarOpen && (
        <aside className="w-64 flex-shrink-0">
          <Card className="sticky top-0">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Filter className="w-4 h-4" />
                  Filters
                </CardTitle>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1 rounded hover:bg-muted lg:hidden"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0 text-sm">

              {/* Value-based */}
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pt-1">Spend</p>
              <div className="space-y-1">
                <Label>Min Lifetime Spend (Rs)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={filters.minSpend}
                  onChange={(e) => setFilters((f) => ({ ...f, minSpend: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Max Lifetime Spend (Rs)</Label>
                <Input
                  type="number"
                  placeholder="Any"
                  value={filters.maxSpend}
                  onChange={(e) => setFilters((f) => ({ ...f, maxSpend: e.target.value }))}
                />
              </div>

              {/* Tier */}
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pt-1">Loyalty</p>
              <div className="space-y-1">
                <Label>Tier</Label>
                <Select
                  options={tierOptions}
                  value={filters.tierId}
                  onChange={(e) => setFilters((f) => ({ ...f, tierId: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Recency</Label>
                <Select
                  options={RECENCY_OPTIONS}
                  value={filters.recency}
                  onChange={(e) => setFilters((f) => ({ ...f, recency: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Min Visits</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={filters.minVisits}
                  onChange={(e) => setFilters((f) => ({ ...f, minVisits: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Max Visits</Label>
                <Input
                  type="number"
                  placeholder="Any"
                  value={filters.maxVisits}
                  onChange={(e) => setFilters((f) => ({ ...f, maxVisits: e.target.value }))}
                />
              </div>

              {/* Points */}
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pt-1">Points</p>
              <div className="space-y-1">
                <Label>Min Points Balance</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={filters.minPoints}
                  onChange={(e) => setFilters((f) => ({ ...f, minPoints: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Max Points Balance</Label>
                <Input
                  type="number"
                  placeholder="Any"
                  value={filters.maxPoints}
                  onChange={(e) => setFilters((f) => ({ ...f, maxPoints: e.target.value }))}
                />
              </div>

              {/* Location */}
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pt-1">Location</p>
              <div className="space-y-1">
                <Label>Store</Label>
                <Input
                  placeholder="Any store"
                  value={filters.store}
                  onChange={(e) => setFilters((f) => ({ ...f, store: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Region</Label>
                <Input
                  placeholder="Any region"
                  value={filters.region}
                  onChange={(e) => setFilters((f) => ({ ...f, region: e.target.value }))}
                />
              </div>

              {/* Enrollment */}
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pt-1">Enrollment</p>
              <div className="space-y-1">
                <Label>Enrolled After</Label>
                <Input
                  type="date"
                  value={filters.enrolledAfter}
                  onChange={(e) => setFilters((f) => ({ ...f, enrolledAfter: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Enrolled Before</Label>
                <Input
                  type="date"
                  value={filters.enrolledBefore}
                  onChange={(e) => setFilters((f) => ({ ...f, enrolledBefore: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select
                  options={ACTIVE_OPTIONS}
                  value={filters.isActive}
                  onChange={(e) => setFilters((f) => ({ ...f, isActive: e.target.value }))}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button className="flex-1" size="sm" onClick={applyFilters}>
                  Apply
                </Button>
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        </aside>
      )}

      {/* Main Content */}
      <div className="flex-1 space-y-4 min-w-0">
        {/* Top bar */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              {!sidebarOpen && (
                <Button variant="outline" size="sm" onClick={() => setSidebarOpen(true)}>
                  <Filter className="w-4 h-4 mr-1" />
                  Filters
                </Button>
              )}
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-semibold">
                  {total} customer{total !== 1 ? 's' : ''} matched
                </span>
              </div>
              <div className="ml-auto flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
                  <FileDown className="w-4 h-4 mr-1" />
                  CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExport('excel')}>
                  <FileSpreadsheet className="w-4 h-4 mr-1" />
                  Excel
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExport('pdf')}>
                  <FileText className="w-4 h-4 mr-1" />
                  PDF
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              {isLoading || isFetching ? (
                <div className="p-4 space-y-2">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : customers.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  No customers match the selected filters.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground whitespace-nowrap">Retailpro ID</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground whitespace-nowrap">Name</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground whitespace-nowrap">Email</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground whitespace-nowrap">Phone</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground whitespace-nowrap">Active</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground whitespace-nowrap">Tier</th>
                      <th className="px-4 py-3 text-right font-semibold text-muted-foreground whitespace-nowrap">Points</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground whitespace-nowrap">Last Purchase</th>
                      <th className="px-4 py-3 text-right font-semibold text-muted-foreground whitespace-nowrap">Lifetime Spend</th>
                      <th className="px-4 py-3 text-right font-semibold text-muted-foreground whitespace-nowrap">Visits</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground whitespace-nowrap">Store</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground whitespace-nowrap">Enrolled On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((c, i) => (
                      <tr
                        key={c.id}
                        className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${
                          i % 2 === 0 ? '' : 'bg-muted/10'
                        }`}
                      >
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                          {c.retailproId ?? '—'}
                        </td>
                        <td className="px-4 py-3 font-medium whitespace-nowrap">{c.name}</td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {c.email ?? '—'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          +{c.countryCode} {c.mobileNumber}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              c.isActive
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            }`}
                          >
                            {c.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <TierBadge name={c.tier} />
                        </td>
                        <td className="px-4 py-3 text-right font-medium whitespace-nowrap">
                          {c.totalPoints.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                          {c.lastVisitDate ? formatDate(c.lastVisitDate) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {formatCurrency(Number(c.lifetimeSale))}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {c.transactionCount}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                          {c.store ?? '—'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                          {formatDate(c.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {!isLoading && customers.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages} — {total} total
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

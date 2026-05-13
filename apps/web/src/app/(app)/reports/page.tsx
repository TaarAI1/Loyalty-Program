'use client';

import { useQuery } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { reportsApi, configApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatNumber, formatDate, tierColor, statusColor } from '@/lib/utils';
import { exportToCsv, exportToExcel, exportToPdf } from '@/lib/export';
import {
  FileDown,
  FileSpreadsheet,
  FileText,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
} from 'lucide-react';

const REPORTS = [
  { value: 'PCG-9', label: 'PCG-9 — Customer Tier Wise' },
  { value: 'BRR7', label: 'BRR7 — Birthday Response' },
  { value: 'TCR18', label: 'TCR18 — Top Customers' },
  { value: 'LSD6', label: 'LSD6 — Loyalty Sales Detail' },
  { value: 'SSFR8', label: 'SSFR8 — Forensic Report' },
];

const AGE_BRACKETS = [
  { value: '', label: 'Any age' },
  { value: '18-24', label: '18–24' },
  { value: '25-34', label: '25–34' },
  { value: '35-44', label: '35–44' },
  { value: '45-54', label: '45–54' },
  { value: '55+', label: '55+' },
];

const MONTHS = [
  { value: '', label: 'All months' },
  ...['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(
    (m, i) => ({ value: String(i + 1), label: m }),
  ),
];

const YEARS = Array.from({ length: 5 }, (_, i) => {
  const y = new Date().getFullYear() - i;
  return { value: String(y), label: String(y) };
});

interface Filters {
  region: string;
  store: string;
  tierId: string;
  gender: string;
  ageBracket: string;
  dateFrom: string;
  dateTo: string;
  month: string;
  year: string;
  limit: string;
}

const defaultFilters: Filters = {
  region: '',
  store: '',
  tierId: '',
  gender: '',
  ageBracket: '',
  dateFrom: '',
  dateTo: '',
  month: '',
  year: '',
  limit: '100',
};

function buildParams(filters: Filters, page: number, pageSize: number) {
  const ageMap: Record<string, { ageFrom?: string; ageTo?: string }> = {
    '18-24': { ageFrom: '18', ageTo: '24' },
    '25-34': { ageFrom: '25', ageTo: '34' },
    '35-44': { ageFrom: '35', ageTo: '44' },
    '45-54': { ageFrom: '45', ageTo: '54' },
    '55+': { ageFrom: '55' },
  };
  const age = ageMap[filters.ageBracket] ?? {};

  return Object.fromEntries(
    Object.entries({
      region: filters.region || undefined,
      store: filters.store || undefined,
      tierId: filters.tierId || undefined,
      gender: filters.gender || undefined,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
      month: filters.month || undefined,
      year: filters.year || undefined,
      limit: filters.limit,
      page,
      pageSize,
      ...age,
    }).filter(([, v]) => v !== undefined),
  );
}

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState('PCG-9');
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(defaultFilters);
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const { data: filterOptions } = useQuery({
    queryKey: ['report-filters'],
    queryFn: reportsApi.getFilters,
  });

  const { data: tiers } = useQuery({
    queryKey: ['tiers'],
    queryFn: configApi.getTiers,
  });

  const params = buildParams(appliedFilters, page, pageSize);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['report', selectedReport, appliedFilters, page],
    queryFn: () => {
      switch (selectedReport) {
        case 'PCG-9': return reportsApi.customerTierWise(params);
        case 'BRR7': return reportsApi.birthdayResponse(params);
        case 'TCR18': return reportsApi.topCustomers(params);
        case 'LSD6': return reportsApi.loyaltySalesDetail(params);
        case 'SSFR8': return reportsApi.forensicReport(params);
        default: return reportsApi.customerTierWise(params);
      }
    },
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
      // Fetch all data for export
      let allData;
      const allParams = buildParams(appliedFilters, 1, 5000);
      switch (selectedReport) {
        case 'PCG-9': allData = await reportsApi.customerTierWise(allParams); break;
        case 'BRR7': allData = await reportsApi.birthdayResponse(allParams); break;
        case 'TCR18': allData = await reportsApi.topCustomers(allParams); break;
        case 'LSD6': allData = await reportsApi.loyaltySalesDetail(allParams); break;
        case 'SSFR8': allData = await reportsApi.forensicReport(allParams); break;
        default: allData = { data: [] };
      }
      const rows = allData?.data ?? [];
      const filename = `${selectedReport}-${new Date().toISOString().slice(0, 10)}`;
      const title = REPORTS.find((r) => r.value === selectedReport)?.label ?? selectedReport;

      if (format === 'csv') exportToCsv(rows, filename);
      else if (format === 'excel') await exportToExcel(rows, filename);
      else await exportToPdf(rows, filename, title);
    },
    [selectedReport, appliedFilters],
  );

  const reportData: Record<string, unknown>[] = data?.data ?? [];
  const totalPages = data?.meta?.totalPages ?? 1;

  const regionOptions = [
    { value: '', label: 'All Regions' },
    ...(filterOptions?.regions ?? []).map((r: string) => ({ value: r, label: r })),
  ];
  const storeOptions = [
    { value: '', label: 'All Stores' },
    ...(filterOptions?.stores ?? []).map((s: string) => ({ value: s, label: s })),
  ];
  const tierOptions = [
    { value: '', label: 'All Tiers' },
    ...(tiers ?? []).map((t: { id: number; name: string }) => ({
      value: String(t.id),
      label: t.name,
    })),
  ];
  const genderOptions = [
    { value: '', label: 'All Genders' },
    { value: 'Male', label: 'Male' },
    { value: 'Female', label: 'Female' },
    { value: 'Other', label: 'Other' },
  ];

  return (
    <div className="flex gap-4 h-full">
      {/* Filter Sidebar */}
      {sidebarOpen && (
        <aside className="w-64 flex-shrink-0">
          <Card className="sticky top-0">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
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
              <div className="space-y-1">
                <Label>Region</Label>
                <Select
                  options={regionOptions}
                  value={filters.region}
                  onChange={(e) => setFilters((f) => ({ ...f, region: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Store</Label>
                <Select
                  options={storeOptions}
                  value={filters.store}
                  onChange={(e) => setFilters((f) => ({ ...f, store: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Tier</Label>
                <Select
                  options={tierOptions}
                  value={filters.tierId}
                  onChange={(e) => setFilters((f) => ({ ...f, tierId: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Gender</Label>
                <Select
                  options={genderOptions}
                  value={filters.gender}
                  onChange={(e) => setFilters((f) => ({ ...f, gender: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Age Bracket</Label>
                <Select
                  options={AGE_BRACKETS}
                  value={filters.ageBracket}
                  onChange={(e) => setFilters((f) => ({ ...f, ageBracket: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Date From</Label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Date To</Label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Month</Label>
                <Select
                  options={MONTHS}
                  value={filters.month}
                  onChange={(e) => setFilters((f) => ({ ...f, month: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Year</Label>
                <Select
                  options={[{ value: '', label: 'Any year' }, ...YEARS]}
                  value={filters.year}
                  onChange={(e) => setFilters((f) => ({ ...f, year: e.target.value }))}
                />
              </div>
              {selectedReport === 'TCR18' && (
                <div className="space-y-1">
                  <Label>Limit (Top N)</Label>
                  <Input
                    type="number"
                    min="10"
                    max="500"
                    value={filters.limit}
                    onChange={(e) => setFilters((f) => ({ ...f, limit: e.target.value }))}
                  />
                </div>
              )}
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
        {/* Report Selector + Export */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              {!sidebarOpen && (
                <Button variant="outline" size="sm" onClick={() => setSidebarOpen(true)}>
                  <Filter className="w-4 h-4" />
                  Filters
                </Button>
              )}
              <Select
                options={REPORTS}
                value={selectedReport}
                onChange={(e) => { setSelectedReport(e.target.value); setPage(1); }}
                className="w-72"
              />
              <div className="ml-auto flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
                  <FileDown className="w-4 h-4" />
                  CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExport('excel')}>
                  <FileSpreadsheet className="w-4 h-4" />
                  Excel
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExport('pdf')}>
                  <FileText className="w-4 h-4" />
                  PDF
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              {isLoading || isFetching ? (
                <div className="p-4 space-y-2">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : reportData.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  No data found for the selected filters.
                </div>
              ) : (
                <ReportTable reportType={selectedReport} data={reportData} />
              )}
            </div>

            {!isLoading && reportData.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  {data?.meta?.total ?? reportData.length} records
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
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
    </div>
  );
}

function ReportTable({ reportType, data }: { reportType: string; data: Record<string, unknown>[] }) {
  switch (reportType) {
    case 'PCG-9':
      return (
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50">
            {['Store','Customer','Cell','Tier','Transactions','Last Visit (days)','Net Sale','Points','Used','Available'].map((h) => (
              <th key={h} className="text-left py-3 px-3 font-medium text-muted-foreground whitespace-nowrap">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                <td className="py-2 px-3">{String(row.store ?? '')}</td>
                <td className="py-2 px-3 font-medium">{String(row.customerName ?? '')}</td>
                <td className="py-2 px-3 text-muted-foreground">{String(row.customerCell ?? '')}</td>
                <td className="py-2 px-3"><Badge className={tierColor(String(row.tier ?? ''))}>{String(row.tier ?? '')}</Badge></td>
                <td className="py-2 px-3">{formatNumber(Number(row.totalTransactions))}</td>
                <td className="py-2 px-3">{row.lastVisitDays != null ? `${row.lastVisitDays}d` : '—'}</td>
                <td className="py-2 px-3 font-medium">{formatCurrency(Number(row.netSale))}</td>
                <td className="py-2 px-3 text-green-600">{formatNumber(Number(row.totalPoints))}</td>
                <td className="py-2 px-3 text-orange-600">{formatNumber(Number(row.rewardsUsed))}</td>
                <td className="py-2 px-3 font-bold text-indigo-600">{formatNumber(Number(row.availableRewards))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );

    case 'BRR7':
      return (
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50">
            {['Region','Store','Outlet','Date','Receipt','Customer','Net Sale'].map((h) => (
              <th key={h} className="text-left py-3 px-3 font-medium text-muted-foreground">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                <td className="py-2 px-3">{String(row.region ?? '')}</td>
                <td className="py-2 px-3">{String(row.store ?? '')}</td>
                <td className="py-2 px-3">{String(row.outlet ?? '—')}</td>
                <td className="py-2 px-3">{row.date ? formatDate(String(row.date)) : '—'}</td>
                <td className="py-2 px-3 text-muted-foreground">{String(row.receipt_no ?? '—')}</td>
                <td className="py-2 px-3 font-medium">{String(row.customer_name ?? '')}</td>
                <td className="py-2 px-3 font-medium">{formatCurrency(Number(row.net_sale))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );

    case 'TCR18':
      return (
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50">
            {['Rank','Customer Name','Phone','Tier','Net Sale'].map((h) => (
              <th key={h} className="text-left py-3 px-3 font-medium text-muted-foreground">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                <td className="py-2 px-3 text-muted-foreground font-medium">#{i + 1}</td>
                <td className="py-2 px-3 font-medium">{String(row.customerName ?? '')}</td>
                <td className="py-2 px-3 text-muted-foreground">{String(row.phoneNo ?? '')}</td>
                <td className="py-2 px-3"><Badge className={tierColor(String(row.tier ?? ''))}>{String(row.tier ?? '')}</Badge></td>
                <td className="py-2 px-3 font-bold">{formatCurrency(Number(row.netSale))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );

    case 'LSD6':
      return (
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50">
            {['Region','Store','Outlet','Transactions','Registrations','Redemptions','Loyalty Sale','Points Earned','Points Redeemed'].map((h) => (
              <th key={h} className="text-left py-3 px-3 font-medium text-muted-foreground whitespace-nowrap">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                <td className="py-2 px-3">{String(row.region ?? '')}</td>
                <td className="py-2 px-3">{String(row.store ?? '')}</td>
                <td className="py-2 px-3">{String(row.outlet ?? '—')}</td>
                <td className="py-2 px-3">{formatNumber(Number(row.transactions))}</td>
                <td className="py-2 px-3">{formatNumber(Number(row.registration))}</td>
                <td className="py-2 px-3">{formatNumber(Number(row.redemption))}</td>
                <td className="py-2 px-3 font-medium">{formatCurrency(Number(row.loyalty_sale))}</td>
                <td className="py-2 px-3 text-green-600">{formatNumber(Number(row.rewards_earned))}</td>
                <td className="py-2 px-3 text-orange-600">{formatNumber(Number(row.loyalty_redemption))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );

    case 'SSFR8':
      return (
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50">
            {['Store','Card No','Customer','Total Earning','Redemption','Available','Status','Alert Date'].map((h) => (
              <th key={h} className="text-left py-3 px-3 font-medium text-muted-foreground">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-b border-border/50 hover:bg-muted/30 bg-red-50/30">
                <td className="py-2 px-3">{String(row.store ?? '')}</td>
                <td className="py-2 px-3 font-mono text-xs">{String(row.card_no ?? '').slice(0, 8)}...</td>
                <td className="py-2 px-3 font-medium">{String(row.name ?? '')}</td>
                <td className="py-2 px-3 text-green-600">{formatNumber(Number(row.total_earning))}</td>
                <td className="py-2 px-3 text-orange-600">{formatNumber(Number(row.redemption))}</td>
                <td className="py-2 px-3 font-bold">{formatNumber(Number(row.available_reward))}</td>
                <td className="py-2 px-3">
                  <Badge className={statusColor('failed')}>{String(row.status ?? 'BLOCK')}</Badge>
                </td>
                <td className="py-2 px-3 text-muted-foreground">
                  {row.action_date ? formatDate(String(row.action_date)) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );

    default:
      return null;
  }
}

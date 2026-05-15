'use client';

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { customersApi, configApi } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatNumber, formatDate, tierColor, segmentColor, segmentLabel } from '@/lib/utils';
import { exportToCsv } from '@/lib/export';
import { Search, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';

export default function CustomersPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [tierId, setTierId] = useState('');
  const [region, setRegion] = useState('');
  const [store, setStore] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const debouncedSearch = useDebounce(search, 300);

  const { data: tiersData } = useQuery({
    queryKey: ['tiers'],
    queryFn: configApi.getTiers,
  });

  type CustomerRow = { id: string; name: string; mobileNumber: string; tier: { name: string }; segment?: string; totalPoints: number; lifetimeSale: number; store: string; lastVisitDate: string; };
  type CustomerListResult = { data: CustomerRow[]; meta: { total: number; page: number; pageSize: number; totalPages: number } };

  const { data, isLoading } = useQuery<CustomerListResult>({
    queryKey: ['customers', debouncedSearch, tierId, region, store, page],
    queryFn: () =>
      customersApi.getAll({
        search: debouncedSearch || undefined,
        tierId: tierId || undefined,
        region: region || undefined,
        store: store || undefined,
        page,
        pageSize,
      }),
    placeholderData: keepPreviousData,
  });

  const handleExportCsv = useCallback(async () => {
    const allData = await customersApi.getAll({
      search: debouncedSearch || undefined,
      tierId: tierId || undefined,
      region: region || undefined,
      store: store || undefined,
      page: 1,
      pageSize: 5000,
    });
    exportToCsv(
      allData.data.map((c: Record<string, unknown>) => ({
        Name: c.name,
        Mobile: c.mobileNumber,
        Email: c.email ?? '',
        Tier: (c.tier as Record<string, unknown>)?.name ?? '',
        'Total Points': c.totalPoints,
        'Lifetime Sale': c.lifetimeSale,
        'Last Visit': c.lastVisitDate ? formatDate(c.lastVisitDate as string) : '',
        Store: c.store ?? '',
        Region: c.region ?? '',
        Active: c.isActive ? 'Yes' : 'No',
      })),
      'customers-export',
    );
  }, [debouncedSearch, tierId, region, store]);

  const tierOptions = [
    { value: '', label: 'All Tiers' },
    ...(tiersData ?? []).map((t: { id: number; name: string }) => ({
      value: String(t.id),
      label: t.name,
    })),
  ];

  const totalPages = data?.meta?.totalPages ?? 1;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search name, mobile, email..."
                className="pl-9"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <Select
              options={tierOptions}
              value={tierId}
              onChange={(e) => { setTierId(e.target.value); setPage(1); }}
              className="w-36"
            />
            <Input
              placeholder="Region"
              className="w-28"
              value={region}
              onChange={(e) => { setRegion(e.target.value); setPage(1); }}
            />
            <Input
              placeholder="Store"
              className="w-28"
              value={store}
              onChange={(e) => { setStore(e.target.value); setPage(1); }}
            />
            <Button variant="outline" size="sm" onClick={handleExportCsv}>
              <Download className="w-4 h-4" />
              Export CSV
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
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Mobile</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Tier</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Segment</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Points</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Lifetime Sale</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Store</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Last Visit</th>
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? [...Array(8)].map((_, i) => (
                      <tr key={i} className="border-b border-border/50">
                        {[...Array(8)].map((__, j) => (
                          <td key={j} className="py-3 px-4">
                            <Skeleton className="h-4 w-full" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : (data?.data ?? []).map(
                      (c: CustomerRow) => (
                        <tr
                          key={c.id}
                          className="border-b border-border/50 hover:bg-muted/40 cursor-pointer transition-colors"
                          onClick={() => router.push(`/customers/${c.id}`)}
                        >
                          <td className="py-3 px-4 font-medium">{c.name}</td>
                          <td className="py-3 px-4 text-muted-foreground">{c.mobileNumber}</td>
                          <td className="py-3 px-4">
                            <Badge className={tierColor(c.tier?.name)}>
                              {c.tier?.name ?? '—'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            {c.segment && (
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${segmentColor(c.segment)}`}>
                                {segmentLabel(c.segment)}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-[#a07800]">
                            {formatNumber(c.totalPoints)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {formatCurrency(Number(c.lifetimeSale))}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">{c.store ?? '—'}</td>
                          <td className="py-3 px-4 text-muted-foreground">
                            {c.lastVisitDate ? formatDate(c.lastVisitDate) : '—'}
                          </td>
                        </tr>
                      ),
                    )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!isLoading && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-sm text-muted-foreground">
                {data?.meta?.total ?? 0} customers
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
                <span className="text-sm">
                  {page} / {totalPages}
                </span>
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

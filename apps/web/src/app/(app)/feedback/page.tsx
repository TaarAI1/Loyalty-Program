'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { MessageSquare, Eye, Loader2, Filter, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { api, configApi } from '@/lib/api';

interface FeedbackRow {
  id: number;
  customerName: string | null;
  customerPhone: string | null;
  formName: string;
  deviceName: string;
  store: string | null;
  submittedAt: string;
}

interface FilterState {
  dateFrom: string;
  dateTo: string;
  customer: string;
  tierId: string;
  device: string;
  store: string;
  form: string;
}

const defaultFilters: FilterState = {
  dateFrom: '', dateTo: '', customer: '', tierId: '', device: '', store: '', form: '',
};

export default function FeedbackPage() {
  const [rows, setRows]       = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  // pending (UI) filters vs applied (fetched) filters
  const [filters, setFilters]         = useState<FilterState>(defaultFilters);
  const [applied, setApplied]         = useState<FilterState>(defaultFilters);

  // tier options
  const [tiers, setTiers] = useState<{ id: number; name: string }[]>([]);
  useEffect(() => {
    configApi.getTiers().then(setTiers).catch(() => {});
  }, []);

  // fetch rows whenever applied changes
  const fetchRows = useCallback((f: FilterState) => {
    setLoading(true);
    setError(null);
    const params: Record<string, string> = {};
    if (f.customer) params.phone = f.customer;
    if (f.tierId)   params.tierId = f.tierId;
    api
      .get('/forms/kiosk/responses', { params })
      .then((r) => setRows(r.data))
      .catch((err) => setError(err?.message ?? 'Failed to load feedback.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchRows(applied); }, [applied, fetchRows]);

  // ── Derived options ─────────────────────────────────────────────────────────
  const deviceOptions = Array.from(new Set(rows.map((r) => r.deviceName))).filter(Boolean);
  const storeOptions  = Array.from(new Set(rows.map((r) => r.store ?? ''))).filter(Boolean);
  const formOptions   = Array.from(new Set(rows.map((r) => r.formName))).filter(Boolean);

  // ── Client-side filtering (date, device, store, form) ──────────────────────
  const filteredRows = rows.filter((r) => {
    if (applied.dateFrom && new Date(r.submittedAt) < new Date(applied.dateFrom)) return false;
    if (applied.dateTo   && new Date(r.submittedAt) > new Date(applied.dateTo + 'T23:59:59')) return false;
    if (applied.device   && r.deviceName !== applied.device) return false;
    if (applied.store    && r.store      !== applied.store)  return false;
    if (applied.form     && r.formName   !== applied.form)   return false;
    return true;
  });

  function applyFilters() { setApplied({ ...filters }); }
  function resetFilters()  { setFilters(defaultFilters); setApplied(defaultFilters); }

  function setF(key: keyof FilterState, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  // ── Export CSV ──────────────────────────────────────────────────────────────
  function exportCsv() {
    const headers = ['ID', 'Customer', 'Phone', 'Form', 'Device', 'Store', 'Submitted'];
    const csvRows = [
      headers.join(','),
      ...filteredRows.map((r) =>
        [r.id, r.customerName ?? '', r.customerPhone ?? '', r.formName,
         r.deviceName, r.store ?? '', new Date(r.submittedAt).toLocaleString()]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(',')
      ),
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'feedback.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  const tierSelectOptions = [
    { value: '', label: 'All Tiers' },
    ...tiers.map((t) => ({ value: String(t.id), label: t.name })),
  ];

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <MessageSquare className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customer Feedback</h1>
          <p className="text-sm text-muted-foreground">Form submissions received from kiosk devices</p>
        </div>
      </div>

      {/* Sidebar + Table */}
      <div className="flex gap-4 items-start">

        {/* ── Filter Sidebar ── */}
        <aside className="w-64 flex-shrink-0">
          <Card className="sticky top-4">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Filter className="w-4 h-4" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0 text-sm">

              <div className="space-y-1">
                <Label>Date From</Label>
                <Input type="date" value={filters.dateFrom}
                  onChange={(e) => setF('dateFrom', e.target.value)} />
              </div>

              <div className="space-y-1">
                <Label>Date To</Label>
                <Input type="date" value={filters.dateTo}
                  onChange={(e) => setF('dateTo', e.target.value)} />
              </div>

              <div className="space-y-1">
                <Label>Customer</Label>
                <Input type="text" placeholder="Name or phone…"
                  value={filters.customer}
                  onChange={(e) => setF('customer', e.target.value)} />
              </div>

              <div className="space-y-1">
                <Label>Tier</Label>
                <Select
                  options={tierSelectOptions}
                  value={filters.tierId}
                  onChange={(e) => setF('tierId', e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label>Device</Label>
                <Select
                  options={[{ value: '', label: 'All Devices' }, ...deviceOptions.map((d) => ({ value: d, label: d }))]}
                  value={filters.device}
                  onChange={(e) => setF('device', e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label>Store</Label>
                <Select
                  options={[{ value: '', label: 'All Stores' }, ...storeOptions.map((s) => ({ value: s, label: s }))]}
                  value={filters.store}
                  onChange={(e) => setF('store', e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label>Form</Label>
                <Select
                  options={[{ value: '', label: 'All Forms' }, ...formOptions.map((f) => ({ value: f, label: f }))]}
                  value={filters.form}
                  onChange={(e) => setF('form', e.target.value)}
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

        {/* ── Table ── */}
        <div className="flex-1 min-w-0">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-4">
                <CardTitle>All Submissions</CardTitle>
                <div className="flex items-center gap-3">
                  {!loading && !error && (
                    <span className="text-sm text-muted-foreground">
                      Showing{' '}
                      <span className="font-semibold text-foreground">{filteredRows.length}</span>
                      {' '}of{' '}
                      <span className="font-semibold text-foreground">{rows.length}</span>
                    </span>
                  )}
                  {filteredRows.length > 0 && (
                    <Button variant="outline" size="sm" onClick={exportCsv}>
                      <Download className="h-3.5 w-3.5 mr-1.5" /> CSV
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading && (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}

              {!loading && error && (
                <p className="py-8 text-center text-sm text-destructive">{error}</p>
              )}

              {!loading && !error && filteredRows.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {rows.length === 0
                    ? 'No feedback submissions yet. Once customers fill in forms from the kiosk, they will appear here.'
                    : 'No submissions match the current filters.'}
                </p>
              )}

              {!loading && !error && filteredRows.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Form</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead>Store</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">
                          {row.customerName ?? <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          {row.customerPhone ?? <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{row.formName}</Badge>
                        </TableCell>
                        <TableCell>{row.deviceName}</TableCell>
                        <TableCell>
                          {row.store ?? <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>{new Date(row.submittedAt).toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <Link
                            href={`/feedback/${row.id}`}
                            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold text-[#666] hover:bg-[#f5f5f5] hover:text-[#111111] transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

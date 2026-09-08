'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { MessageSquare, Eye, Loader2, Filter, Download, User, CalendarDays, ShieldCheck, Monitor, Building2, FileText, Search } from 'lucide-react';
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
          <Card className="sticky top-4 overflow-hidden">
            {/* Sidebar header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-primary" />
                <span className="font-bold text-sm">Filters</span>
              </div>
              {Object.values(applied).some(Boolean) && (
                <span className="inline-flex items-center justify-center h-5 min-w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1.5">
                  {Object.values(applied).filter(Boolean).length}
                </span>
              )}
            </div>

            <CardContent className="p-4 space-y-5 text-sm">

              {/* ── Search ─────────────────────────────────────────── */}
              <div className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Search</p>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-xs font-semibold">
                    <User className="h-3.5 w-3.5 text-muted-foreground" /> Customer
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                      type="text"
                      placeholder="Name or phone…"
                      value={filters.customer}
                      onChange={(e) => setF('customer', e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
              </div>

              <hr className="border-border/60" />

              {/* ── Date Range ─────────────────────────────────────── */}
              <div className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Date Range</p>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-xs font-semibold">
                    <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" /> From
                  </Label>
                  <Input type="date" value={filters.dateFrom}
                    onChange={(e) => setF('dateFrom', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-xs font-semibold">
                    <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" /> To
                  </Label>
                  <Input type="date" value={filters.dateTo}
                    onChange={(e) => setF('dateTo', e.target.value)} />
                </div>
              </div>

              <hr className="border-border/60" />

              {/* ── Narrow By ──────────────────────────────────────── */}
              <div className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Narrow By</p>

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-xs font-semibold">
                    <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" /> Tier
                  </Label>
                  <Select options={tierSelectOptions} value={filters.tierId}
                    onChange={(e) => setF('tierId', e.target.value)} />
                </div>

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-xs font-semibold">
                    <Monitor className="h-3.5 w-3.5 text-muted-foreground" /> Device
                  </Label>
                  <Select
                    options={[{ value: '', label: 'All Devices' }, ...deviceOptions.map((d) => ({ value: d, label: d }))]}
                    value={filters.device}
                    onChange={(e) => setF('device', e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-xs font-semibold">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" /> Store
                  </Label>
                  <Select
                    options={[{ value: '', label: 'All Stores' }, ...storeOptions.map((s) => ({ value: s, label: s }))]}
                    value={filters.store}
                    onChange={(e) => setF('store', e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-xs font-semibold">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" /> Form
                  </Label>
                  <Select
                    options={[{ value: '', label: 'All Forms' }, ...formOptions.map((f) => ({ value: f, label: f }))]}
                    value={filters.form}
                    onChange={(e) => setF('form', e.target.value)}
                  />
                </div>
              </div>

              {/* ── Actions ────────────────────────────────────────── */}
              <div className="space-y-2 pt-1">
                <Button className="w-full" size="sm" onClick={applyFilters}>
                  Apply Filters
                </Button>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="w-full text-xs text-muted-foreground hover:text-destructive transition-colors py-1"
                >
                  Reset all filters
                </button>
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

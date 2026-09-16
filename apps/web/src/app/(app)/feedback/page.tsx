'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { MessageSquare, Eye, Loader2, Search, Filter, Download, Phone, Tablet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { api } from '@/lib/api';

interface FeedbackRow {
  id: number;
  customerName: string | null;
  customerPhone: string | null;
  formName: string;
  deviceName: string;
  store: string | null;
  submittedAt: string;
}

/** Coloured avatar circle from a name string */
function Avatar({ name }: { name: string | null }) {
  const initials = name
    ? name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';
  const colours = [
    'bg-blue-100 text-blue-700',
    'bg-emerald-100 text-emerald-700',
    'bg-violet-100 text-violet-700',
    'bg-amber-100 text-amber-700',
    'bg-rose-100 text-rose-700',
    'bg-cyan-100 text-cyan-700',
  ];
  const idx = name ? name.charCodeAt(0) % colours.length : 0;
  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold flex-shrink-0 ${colours[idx]}`}>
      {initials}
    </span>
  );
}

const emptyFilters = { customerSearch: '', dateFrom: '', dateTo: '', deviceFilter: '', storeFilter: '' };

export default function FeedbackPage() {
  const [rows, setRows]       = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  // ── Live filter state (what the inputs show) ────────────────────────────────
  const [customerSearch, setCustomer] = useState('');
  const [dateFrom, setDateFrom]       = useState('');
  const [dateTo, setDateTo]           = useState('');
  const [deviceFilter, setDevice]     = useState('');
  const [storeFilter, setStore]       = useState('');

  // ── Applied filter state (used for actual filtering, updated on Apply click) ─
  const [applied, setApplied] = useState(emptyFilters);

  const fetchRows = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .get('/forms/kiosk/responses')
      .then((r) => setRows(r.data))
      .catch((err) => setError(err?.message ?? 'Failed to load feedback.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  // ── Derived options ─────────────────────────────────────────────────────────
  const deviceOptions = Array.from(new Set(rows.map((r) => r.deviceName))).filter(Boolean);
  const storeOptions  = Array.from(new Set(rows.map((r) => r.store ?? ''))).filter(Boolean);

  // ── Filtering uses applied state ────────────────────────────────────────────
  const filteredRows = rows.filter((r) => {
    if (applied.dateFrom && new Date(r.submittedAt) < new Date(applied.dateFrom)) return false;
    if (applied.dateTo   && new Date(r.submittedAt) > new Date(applied.dateTo + 'T23:59:59')) return false;
    if (applied.customerSearch) {
      const q = applied.customerSearch.toLowerCase();
      if (!(r.customerName?.toLowerCase().includes(q) || r.customerPhone?.includes(q))) return false;
    }
    if (applied.deviceFilter && r.deviceName !== applied.deviceFilter) return false;
    if (applied.storeFilter  && r.store      !== applied.storeFilter)  return false;
    return true;
  });

  function applyFilters() {
    setApplied({ customerSearch, dateFrom, dateTo, deviceFilter, storeFilter });
  }

  function resetFilters() {
    setCustomer('');
    setDateFrom('');
    setDateTo('');
    setDevice('');
    setStore('');
    setApplied(emptyFilters);
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

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <MessageSquare className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customer Feedback</h1>
          <p className="text-sm text-muted-foreground">
            Form submissions received from kiosk devices
          </p>
        </div>
      </div>

      {/* Sidebar + Table */}
      <div className="flex gap-4 h-full">

        {/* ── Filter Sidebar ── */}
        <aside className="w-64 flex-shrink-0">
          <Card className="sticky top-0">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Filter className="w-4 h-4" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0 text-sm">

              {/* Customer */}
              <div className="space-y-1">
                <Label>Customer</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    type="text"
                    placeholder="Name or phone…"
                    value={customerSearch}
                    onChange={(e) => setCustomer(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              {/* Date From */}
              <div className="space-y-1">
                <Label>From Date</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>

              {/* Date To */}
              <div className="space-y-1">
                <Label>To Date</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>

              {/* Device */}
              <div className="space-y-1">
                <Label>Device</Label>
                <Select
                  options={[{ value: '', label: 'All Devices' }, ...deviceOptions.map((d) => ({ value: d, label: d }))]}
                  value={deviceFilter}
                  onChange={(e) => setDevice(e.target.value)}
                />
              </div>

              {/* Store */}
              <div className="space-y-1">
                <Label>Store</Label>
                <Select
                  options={[{ value: '', label: 'All Stores' }, ...storeOptions.map((s) => ({ value: s, label: s }))]}
                  value={storeFilter}
                  onChange={(e) => setStore(e.target.value)}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button className="flex-1" size="sm" onClick={applyFilters}>
                  Apply
                </Button>
                <Button className="flex-1" size="sm" onClick={resetFilters} variant="outline">
                  Reset
                </Button>
              </div>

            </CardContent>
          </Card>
        </aside>

        {/* ── Table ── */}
        <div className="flex-1 min-w-0 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>All Submissions</CardTitle>
                <div className="flex items-center gap-3">
                  {!loading && !error && (
                    <span className="text-sm text-muted-foreground">
                      Showing <span className="font-semibold text-foreground">{filteredRows.length}</span> of{' '}
                      <span className="font-semibold text-foreground">{rows.length}</span> submissions
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
                      <TableRow key={row.id} className="hover:bg-muted/40 transition-colors">
                        {/* Customer with avatar */}
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <Avatar name={row.customerName} />
                            <span className="font-medium">
                              {row.customerName ?? <span className="text-muted-foreground italic text-xs">Unknown</span>}
                            </span>
                          </div>
                        </TableCell>
                        {/* Phone with icon */}
                        <TableCell>
                          {row.customerPhone
                            ? <span className="inline-flex items-center gap-1.5 text-sm">
                                <Phone className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                {row.customerPhone}
                              </span>
                            : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        {/* Form badge — yellow tinted */}
                        <TableCell>
                          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                            {row.formName}
                          </span>
                        </TableCell>
                        {/* Device with icon */}
                        <TableCell>
                          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Tablet className="h-3.5 w-3.5 flex-shrink-0" />
                            {row.deviceName}
                          </span>
                        </TableCell>
                        {/* Store */}
                        <TableCell>
                          {row.store
                            ? <span className="text-sm">{row.store}</span>
                            : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        {/* Submitted — date + time stacked */}
                        <TableCell>
                          <div className="flex flex-col leading-tight">
                            <span className="text-sm font-medium">
                              {new Date(row.submittedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(row.submittedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </TableCell>
                        {/* View button */}
                        <TableCell className="text-right">
                          <Link href={`/feedback/${row.id}`}>
                            <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7 px-2.5">
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </Button>
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

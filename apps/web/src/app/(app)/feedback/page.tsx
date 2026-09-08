'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { MessageSquare, Eye, Loader2, Search, Filter, Download } from 'lucide-react';
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

export default function FeedbackPage() {
  const [rows, setRows]       = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  // ── Filter state ────────────────────────────────────────────────────────────
  const [customerSearch, setCustomer] = useState('');
  const [dateFrom, setDateFrom]       = useState('');
  const [dateTo, setDateTo]           = useState('');
  const [deviceFilter, setDevice]     = useState('');
  const [storeFilter, setStore]       = useState('');

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

  // ── Client-side filtering ───────────────────────────────────────────────────
  const filteredRows = rows.filter((r) => {
    if (dateFrom && new Date(r.submittedAt) < new Date(dateFrom)) return false;
    if (dateTo   && new Date(r.submittedAt) > new Date(dateTo + 'T23:59:59')) return false;
    if (customerSearch) {
      const q = customerSearch.toLowerCase();
      if (!(r.customerName?.toLowerCase().includes(q) || r.customerPhone?.includes(q))) return false;
    }
    if (deviceFilter && r.deviceName !== deviceFilter) return false;
    if (storeFilter  && r.store      !== storeFilter)  return false;
    return true;
  });

  function resetFilters() {
    setCustomer('');
    setDateFrom('');
    setDateTo('');
    setDevice('');
    setStore('');
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

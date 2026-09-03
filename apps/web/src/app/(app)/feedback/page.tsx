'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageSquare, Eye, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
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
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get('/forms/kiosk/responses')
      .then((r) => setRows(r.data))
      .catch((err) => setError(err?.message ?? 'Failed to load feedback.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <MessageSquare className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customer Feedback</h1>
          <p className="text-sm text-muted-foreground">
            Form submissions received from kiosk devices
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Submissions</CardTitle>
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

          {!loading && !error && rows.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No feedback submissions yet. Once customers fill in forms from the kiosk, they will appear here.
            </p>
          )}

          {!loading && !error && rows.length > 0 && (
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
                {rows.map((row) => (
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
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/feedback/${row.id}`}>
                          <Eye className="mr-1 h-4 w-4" />
                          View
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

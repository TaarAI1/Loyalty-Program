'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, MessageSquare, User, Phone, FileText, Monitor } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { api } from '@/lib/api';

interface AnswerRow {
  question: string;
  questionType: string;
  answer: string;
}

interface FeedbackDetail {
  id: number;
  customerName: string | null;
  customerPhone: string | null;
  formName: string;
  deviceName: string;
  store: string | null;
  submittedAt: string;
  answers: AnswerRow[];
}

export default function FeedbackDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<FeedbackDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get(`/forms/kiosk/responses/${id}`)
      .then((r) => setDetail(r.data))
      .catch((err) => setError(err?.message ?? 'Failed to load feedback.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">Loading feedback…</p>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <p className="text-sm text-destructive">{error ?? 'Not found.'}</p>
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 rounded-xl border-2 border-[#e8e8e8] bg-white px-4 py-2 text-sm font-bold text-[#111111] hover:border-[#FFD000] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Go back
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-3xl mx-auto">
      {/* Back */}
      <button
        onClick={() => router.push('/feedback')}
        className="inline-flex items-center gap-2 -ml-2 w-fit rounded-lg px-3 py-1.5 text-sm font-bold text-[#666] hover:bg-[#f5f5f5] hover:text-[#111111] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Feedback
      </button>

      {/* Header */}
      <div className="flex items-center gap-3">
        <MessageSquare className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Feedback #{detail.id}</h1>
          <p className="text-sm text-muted-foreground">
            Submitted {new Date(detail.submittedAt).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Meta card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Submission Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <dt className="text-xs text-muted-foreground">Customer Name</dt>
                <dd className="font-medium">{detail.customerName ?? '—'}</dd>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <dt className="text-xs text-muted-foreground">Phone</dt>
                <dd className="font-medium">{detail.customerPhone ?? '—'}</dd>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <dt className="text-xs text-muted-foreground">Form</dt>
                <dd>
                  <Badge variant="outline">{detail.formName}</Badge>
                </dd>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Monitor className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <dt className="text-xs text-muted-foreground">Device · Store</dt>
                <dd className="font-medium">
                  {detail.deviceName}
                  {detail.store ? ` · ${detail.store}` : ''}
                </dd>
              </div>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Answers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Answers</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-0">
          {detail.answers.map((a, idx) => (
            <div key={idx}>
              {idx > 0 && <Separator className="my-4" />}
              <div className="flex flex-col gap-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Q{idx + 1} — {a.questionType}
                </p>
                <p className="text-sm font-medium">{a.question}</p>
                <p className="mt-1 rounded-md bg-muted px-3 py-2 text-sm">
                  {a.answer || (
                    <span className="italic text-muted-foreground">No answer</span>
                  )}
                </p>
              </div>
            </div>
          ))}
          {detail.answers.length === 0 && (
            <p className="text-sm text-muted-foreground">No answers recorded.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

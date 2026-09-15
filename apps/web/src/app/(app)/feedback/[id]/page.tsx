'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Loader2,
  MessageSquare,
  User,
  Phone,
  FileText,
  Monitor,
  Star,
} from 'lucide-react';
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

// ── Rating helpers ─────────────────────────────────────────────────────────────

const EMOJI_SCORE: Record<string, number> = {
  'Very Bad': 1,
  'Bad': 2,
  'Okay': 3,
  'Good': 4,
  'Excellent': 5,
};

function computeOverallRating(answers: AnswerRow[]): number | null {
  const scores: number[] = [];
  for (const a of answers) {
    if (!a.answer) continue;
    if (a.questionType === 'rating') {
      const n = parseInt(a.answer, 10);
      if (!isNaN(n)) scores.push(n);
    } else if (a.questionType === 'emoji') {
      const s = EMOJI_SCORE[a.answer];
      if (s !== undefined) scores.push(s);
    } else if (a.questionType === 'boolean') {
      scores.push(a.answer === 'Yes' ? 5 : 1);
    }
  }
  if (scores.length === 0) return null;
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
}

function StarRating({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={`h-5 w-5 ${i < Math.round(value) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`}
        />
      ))}
      <span className="ml-2 text-sm font-bold tabular-nums">{value.toFixed(1)}</span>
      <span className="text-xs text-muted-foreground ml-1">/ 5</span>
    </div>
  );
}

// ── Answer display per type ────────────────────────────────────────────────────

function AnswerDisplay({ answer, type }: { answer: string; type: string }) {
  if (!answer) {
    return <span className="italic text-muted-foreground text-sm">No answer</span>;
  }

  if (type === 'rating') {
    const n = parseInt(answer, 10);
    if (!isNaN(n)) {
      return (
        <div className="flex items-center gap-1 mt-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`h-4 w-4 ${i < n ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`}
            />
          ))}
          <span className="ml-1 text-sm font-semibold">{n} / 5</span>
        </div>
      );
    }
  }

  if (type === 'boolean') {
    return (
      <Badge
        variant={answer === 'Yes' ? 'default' : 'outline'}
        className={answer === 'Yes' ? 'bg-green-500 hover:bg-green-500 text-white' : 'border-red-400 text-red-500'}
      >
        {answer}
      </Badge>
    );
  }

  if (type === 'emoji') {
    const emojiMap: Record<string, string> = {
      'Very Bad': '😠',
      'Bad': '😟',
      'Okay': '😐',
      'Good': '😊',
      'Excellent': '😄',
    };
    const emoji = emojiMap[answer];
    return (
      <span className="text-sm font-medium">
        {emoji ? `${emoji} ` : ''}{answer}
      </span>
    );
  }

  // text / choice / default
  return (
    <p className="mt-1 rounded-md bg-muted px-3 py-2 text-sm">{answer}</p>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

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

  const overallRating = computeOverallRating(detail.answers);

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

      {/* Overall rating (only if computable) */}
      {overallRating !== null && (
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                  Overall Rating
                </p>
                <StarRating value={overallRating} />
              </div>
              <div className="h-14 w-14 rounded-full bg-yellow-100 border-2 border-yellow-300 flex items-center justify-center">
                <span className="text-xl font-black text-yellow-700">{overallRating.toFixed(1)}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Calculated from star ratings, emoji responses, and yes/no answers. Text answers are excluded.
            </p>
          </CardContent>
        </Card>
      )}

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
          {detail.answers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No answers recorded.</p>
          ) : (
            detail.answers.map((a, idx) => (
              <div key={idx}>
                {idx > 0 && <Separator className="my-4" />}
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Q{idx + 1} — {a.questionType}
                  </p>
                  <p className="text-sm font-medium">{a.question}</p>
                  <AnswerDisplay answer={a.answer} type={a.questionType} />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

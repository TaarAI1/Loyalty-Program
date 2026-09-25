'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Question {
  id: number;
  text: string;
  questionType: string;
  options: string[] | null;
  status: string;
}

interface FormQuestion {
  id: number;
  sortOrder: number;
  question: Question;
}

interface ActiveForm {
  id: number;
  name: string;
  formQuestions: FormQuestion[];
}

// ── Emoji options ─────────────────────────────────────────────────────────────

const EMOJIS = [
  { src: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f621.svg', label: 'Very Bad' },
  { src: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f61f.svg', label: 'Bad' },
  { src: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f611.svg', label: 'Okay' },
  { src: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f60a.svg', label: 'Good' },
  { src: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f604.svg', label: 'Excellent' },
];

// ── Question renderer ─────────────────────────────────────────────────────────

function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: Question;
  value: string;
  onChange: (v: string) => void;
}) {
  const { questionType, options } = question;

  if (questionType === 'text') {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type your answer here…"
        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white"
      />
    );
  }

  if (questionType === 'textarea') {
    return (
      <div className="flex justify-around gap-2">
        {EMOJIS.map((e, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(e.label)}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
              value === e.label ? 'bg-yellow-100 scale-110 shadow' : 'opacity-60 hover:opacity-100'
            }`}
          >
            <img src={e.src} alt={e.label} className="w-10 h-10" />
            <span className="text-[10px] font-medium text-gray-500">{e.label}</span>
          </button>
        ))}
      </div>
    );
  }

  if (questionType === 'rating') {
    return (
      <div className="flex justify-center gap-3">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(String(star))}
            className={`text-4xl transition-transform hover:scale-110 ${
              Number(value) >= star ? 'text-yellow-400' : 'text-gray-300'
            }`}
          >
            ★
          </button>
        ))}
      </div>
    );
  }

  if (questionType === 'boolean') {
    return (
      <div className="flex gap-4">
        {['Yes', 'No'].map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`flex-1 py-3 rounded-xl text-base font-semibold border-2 transition-colors ${
              value === opt
                ? 'bg-yellow-400 border-yellow-400 text-white'
                : 'border-gray-200 text-gray-600 hover:border-yellow-400'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    );
  }

  if (questionType === 'select' && options && options.length > 0) {
    return (
      <div className="flex flex-col gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`w-full py-3 px-4 rounded-xl text-left text-base border-2 transition-colors ${
              value === opt
                ? 'bg-yellow-400 border-yellow-400 text-white font-semibold'
                : 'border-gray-200 text-gray-700 hover:border-yellow-400'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    );
  }

  return null;
}

// ── Main survey component ─────────────────────────────────────────────────────

function SurveyContent() {
  const searchParams  = useSearchParams();
  const retailproId   = searchParams.get('retailpro_id')  ?? '';
  const transactionId = searchParams.get('transaction_id') ?? '';

  const [form, setForm]           = useState<ActiveForm | null>(null);
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [loading, setLoading]     = useState(true);
  const [answers, setAnswers]     = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [noForm, setNoForm]         = useState(false);
  const [blocked, setBlocked] = useState<'invalid_link' | 'transaction_not_found' | 'transaction_not_yours' | 'already_submitted' | null>(null);

  const loadData = useCallback(async () => {
    // Guard: both params required
    if (!retailproId || !transactionId) {
      setBlocked('invalid_link');
      setLoading(false);
      return;
    }

    try {
      // Validate transaction ownership + duplicate check first
      const validateRes = await axios.get(
        `${API_URL}/forms/web/validate?retailpro_id=${encodeURIComponent(retailproId)}&transaction_id=${encodeURIComponent(transactionId)}`
      );
      if (!validateRes.data.valid) {
        setBlocked(validateRes.data.reason as 'transaction_not_found' | 'transaction_not_yours' | 'already_submitted');
        setLoading(false);
        return;
      }

      // Fetch active form and customer name in parallel
      const [formRes, nameRes] = await Promise.allSettled([
        axios.get(`${API_URL}/forms/web/active`),
        axios.get(`${API_URL}/forms/web/customer?retailpro_id=${encodeURIComponent(retailproId)}`),
      ]);

      if (formRes.status === 'fulfilled' && formRes.value.data) {
        setForm(formRes.value.data);
      } else {
        setNoForm(true);
      }

      if (nameRes.status === 'fulfilled') {
        setCustomerName(nameRes.value.data?.name ?? null);
      }
    } catch {
      setNoForm(true);
    } finally {
      setLoading(false);
    }
  }, [retailproId, transactionId]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Poll for form changes every 30s ──────────────────────────────────────────
  useEffect(() => {
    if (submitted || blocked) return;   // stop polling after done / blocked

    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`${API_URL}/forms/web/active`);
        if (!res.data) return;
        const refreshed = res.data as ActiveForm;
        setForm((prev) => {
          if (!prev) return refreshed;
          // Only update state if something actually changed
          const changed =
            prev.id !== refreshed.id ||
            JSON.stringify(prev.formQuestions) !== JSON.stringify(refreshed.formQuestions);
          return changed ? refreshed : prev;
        });
      } catch {
        // silent — polling failures must not disrupt the user
      }
    }, 30_000);

    return () => clearInterval(interval);
  }, [submitted, blocked]);

  function setAnswer(questionId: number, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  const allAnswered = form
    ? form.formQuestions.every((fq) => (answers[fq.question.id] ?? '').trim() !== '')
    : false;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await axios.post(`${API_URL}/forms/web/submit`, {
        formId:        form.id,
        retailproId:   retailproId   || undefined,
        transactionId: transactionId || undefined,
        answers: form.formQuestions.map((fq) => ({
          questionId: fq.question.id,
          value: answers[fq.question.id] ?? '',
        })),
      });
      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const firstName = customerName ? customerName.split(' ')[0] : null;

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Blocked screens ───────────────────────────────────────────────────────────
  if (blocked === 'already_submitted') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center max-w-xs">
          <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-5">
            <span className="text-4xl">✅</span>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Already Submitted</h2>
          <p className="text-sm text-gray-500">You have already submitted feedback for this visit. Thank you!</p>
        </div>
      </div>
    );
  }

  if (blocked) {
    // invalid_link | transaction_not_found | transaction_not_yours
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center max-w-xs">
          <div className="text-5xl mb-4">🚫</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Invalid Feedback Link</h2>
          <p className="text-sm text-gray-500">This feedback link is not valid for your account.</p>
        </div>
      </div>
    );
  }

  // ── No active form ────────────────────────────────────────────────────────────
  if (noForm || !form) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center max-w-xs">
          <div className="text-5xl mb-4">📋</div>
          <h2 className="text-lg font-bold text-gray-800 mb-2">No Survey Available</h2>
          <p className="text-sm text-gray-500">There is no active survey at the moment. Thank you!</p>
        </div>
      </div>
    );
  }

  // ── Thank you ─────────────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center max-w-xs">
          <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-5">
            <span className="text-4xl">✅</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Thank You{firstName ? `, ${firstName}` : ''}!
          </h2>
          <p className="text-gray-500 text-sm">Your feedback has been submitted. We appreciate your time!</p>
        </div>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-yellow-400 mb-4 shadow-md">
            <span className="text-2xl">📝</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Your Feedback Matters to Us</h1>
          {firstName && (
            <p className="text-sm text-gray-500 mt-1">Hi {firstName}, we&apos;d love your feedback!</p>
          )}
        </div>

        {/* Questions */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {form.formQuestions.map((fq, idx) => (
            <div key={fq.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <p className="text-sm font-semibold text-gray-800 mb-4 leading-snug">
                <span className="inline-block w-6 h-6 rounded-full bg-yellow-400 text-white text-xs font-bold text-center leading-6 mr-2 shrink-0">{idx + 1}</span>
                {fq.question.text}
              </p>
              <QuestionInput
                question={fq.question}
                value={answers[fq.question.id] ?? ''}
                onChange={(v) => setAnswer(fq.question.id, v)}
              />
            </div>
          ))}

          {error && (
            <p className="text-center text-sm text-red-500">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting || !allAnswered}
            className="w-full py-4 rounded-2xl bg-yellow-400 text-white font-bold text-base shadow-md hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting…' : 'Submit Feedback'}
          </button>

          <p className="text-center text-xs text-gray-400 pb-4">
            Powered by LoyaltyPlus
          </p>
        </form>
      </div>
    </div>
  );
}

// ── Page export (wrapped in Suspense for useSearchParams) ─────────────────────

export default function SurveyPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SurveyContent />
    </Suspense>
  );
}

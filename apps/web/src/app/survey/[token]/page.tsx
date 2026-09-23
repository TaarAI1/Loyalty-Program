'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

// ── Types ─────────────────────────────────────────────────────────────────────

type SurveyQuestion = {
  id: number;
  text: string;
  questionType: 'rating' | 'emoji' | 'boolean' | 'select' | 'text' | 'textarea';
  options: string[] | null;
  required: boolean;
};

type SurveyForm = {
  id: number;
  name: string;
  status: string;
  questions: SurveyQuestion[];
};

// ── Question renderers ────────────────────────────────────────────────────────

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className="text-3xl transition-transform hover:scale-110 focus:outline-none"
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(star)}
          aria-label={`${star} star`}
        >
          <span className={(hovered || value) >= star ? 'text-yellow-400' : 'text-gray-300'}>★</span>
        </button>
      ))}
    </div>
  );
}

function EmojiRating({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const emojis = [
    { emoji: '😞', label: 'Very Unhappy', val: '1' },
    { emoji: '😕', label: 'Unhappy',      val: '2' },
    { emoji: '😐', label: 'Neutral',      val: '3' },
    { emoji: '😊', label: 'Happy',        val: '4' },
    { emoji: '😄', label: 'Very Happy',   val: '5' },
  ];
  return (
    <div className="flex gap-3">
      {emojis.map(({ emoji, label, val }) => (
        <button
          key={val}
          type="button"
          onClick={() => onChange(val)}
          className={`flex flex-col items-center gap-1 rounded-xl p-2 transition-all focus:outline-none ${
            value === val ? 'bg-yellow-100 ring-2 ring-yellow-400 scale-110' : 'hover:bg-gray-100'
          }`}
          aria-label={label}
        >
          <span className="text-3xl">{emoji}</span>
          <span className="text-xs text-gray-500">{label}</span>
        </button>
      ))}
    </div>
  );
}

function BooleanQuestion({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-3">
      {['Yes', 'No'].map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`px-6 py-2 rounded-lg font-medium border transition-colors focus:outline-none ${
            value === opt
              ? 'bg-yellow-400 border-yellow-400 text-black'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function SelectQuestion({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`text-left px-4 py-2.5 rounded-lg border transition-colors focus:outline-none ${
            value === opt
              ? 'bg-yellow-50 border-yellow-400 text-black font-medium'
              : 'border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SurveyPage({ params }: { params: { token: string } }) {
  const { token } = params;

  const [form, setForm] = useState<SurveyForm | null>(null);
  const [loadError, setLoadError] = useState('');
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [step, setStep] = useState<'loading' | 'form' | 'submitted' | 'error'>('loading');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    axios
      .get(`${API_URL}/forms/web/${token}`)
      .then((r) => {
        setForm(r.data);
        setStep('form');
      })
      .catch(() => {
        setLoadError('This survey link is invalid or no longer available.');
        setStep('error');
      });
  }, [token]);

  function setAnswer(questionId: number, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;

    // Validate required questions
    const missing = form.questions.filter((q) => q.required && !answers[q.id]);
    if (missing.length > 0) {
      setSubmitError('Please answer all questions before submitting.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      await axios.post(`${API_URL}/forms/web/submit`, {
        token,
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
        answers: Object.entries(answers).map(([qId, value]) => ({
          questionId: Number(qId),
          value,
        })),
      });
      setStep('submitted');
    } catch {
      setSubmitError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (step === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Loading survey…</p>
        </div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">🔗</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Survey Unavailable</h1>
          <p className="text-gray-500 text-sm">{loadError}</p>
        </div>
      </div>
    );
  }

  if (step === 'submitted') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Thank You!</h1>
          <p className="text-gray-500 text-sm">
            Your feedback has been submitted. We appreciate you taking the time to share your thoughts!
          </p>
          <div className="mt-6 inline-flex items-center gap-2 text-xs text-gray-400">
            <span className="font-bold text-yellow-500">LoyaltyPlus</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="text-2xl font-black text-yellow-500">LoyaltyPlus</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">{form!.name}</h1>
          <p className="text-gray-500 text-sm mt-1">Share your experience with us</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer info */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
            <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Your Info <span className="text-gray-400 font-normal normal-case">(optional)</span></h2>
            <input
              type="text"
              placeholder="Your name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
            />
            <input
              type="tel"
              placeholder="Phone number"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
            />
          </div>

          {/* Questions */}
          {form!.questions.map((q, idx) => (
            <div key={q.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <p className="font-medium text-gray-800 mb-4">
                <span className="text-yellow-500 font-bold mr-1">{idx + 1}.</span>
                {q.text}
                {q.required && <span className="text-red-400 ml-1">*</span>}
              </p>

              {q.questionType === 'rating' && (
                <StarRating value={Number(answers[q.id] ?? 0)} onChange={(v) => setAnswer(q.id, String(v))} />
              )}
              {q.questionType === 'emoji' && (
                <EmojiRating value={answers[q.id] ?? ''} onChange={(v) => setAnswer(q.id, v)} />
              )}
              {q.questionType === 'boolean' && (
                <BooleanQuestion value={answers[q.id] ?? ''} onChange={(v) => setAnswer(q.id, v)} />
              )}
              {q.questionType === 'select' && q.options && (
                <SelectQuestion options={q.options as string[]} value={answers[q.id] ?? ''} onChange={(v) => setAnswer(q.id, v)} />
              )}
              {(q.questionType === 'text' || q.questionType === 'textarea') && (
                <textarea
                  rows={3}
                  placeholder="Type your answer…"
                  value={answers[q.id] ?? ''}
                  onChange={(e) => setAnswer(q.id, e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-yellow-300"
                />
              )}
            </div>
          ))}

          {/* Error */}
          {submitError && (
            <p className="text-sm text-red-500 text-center">{submitError}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-yellow-400 hover:bg-yellow-500 disabled:opacity-60 text-black font-semibold py-3 rounded-xl transition-colors"
          >
            {submitting ? 'Submitting…' : 'Submit Feedback'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">Powered by LoyaltyPlus</p>
      </div>
    </div>
  );
}

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

// ── CSS keyframes (injected once) ─────────────────────────────────────────────

const SURVEY_STYLES = `
@keyframes slideInFromRight {
  from { opacity: 0; transform: translateX(60px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes slideInFromLeft {
  from { opacity: 0; transform: translateX(-60px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes bounceIn {
  0%   { opacity: 0; transform: scale(0.3); }
  50%  { opacity: 1; transform: scale(1.15); }
  70%  { transform: scale(0.92); }
  100% { transform: scale(1); }
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
`;

// ── Question renderer ─────────────────────────────────────────────────────────

function QuestionInput({
  question,
  value,
  onChange,
  onPick,
}: {
  question: Question;
  value: string;
  onChange: (v: string) => void;
  onPick: (v: string) => void; // fires for selection types → triggers auto-advance
}) {
  const { questionType, options } = question;

  if (questionType === 'rating') {
    return (
      <div className="flex justify-center gap-3 py-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onPick(String(star))}
            className={`text-5xl transition-all duration-200 hover:scale-110 drop-shadow-md ${
              Number(value) >= star ? 'text-yellow-300' : 'text-white/40'
            }`}
          >
            ★
          </button>
        ))}
      </div>
    );
  }

  if (questionType === 'textarea') {
    return (
      <div className="flex justify-around gap-1 py-2">
        {EMOJIS.map((e, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onPick(e.label)}
            className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all duration-200 ${
              value === e.label
                ? 'bg-white/30 scale-110 shadow-lg'
                : 'opacity-70 hover:opacity-100 hover:scale-105'
            }`}
          >
            <img src={e.src} alt={e.label} className="w-14 h-14 drop-shadow" />
            <span className="text-[10px] font-semibold text-white/90">{e.label}</span>
          </button>
        ))}
      </div>
    );
  }

  if (questionType === 'boolean') {
    return (
      <div className="flex gap-4 py-2">
        {['Yes', 'No'].map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onPick(opt)}
            className={`flex-1 py-3.5 rounded-2xl text-base font-bold transition-all duration-200 border-2 ${
              value === opt
                ? 'bg-yellow-400 border-yellow-400 text-white shadow-lg scale-[1.02]'
                : 'bg-white/15 border-white/30 text-white hover:bg-white/25'
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
      <div className="flex flex-col gap-2 py-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onPick(opt)}
            className={`w-full py-3 px-4 rounded-2xl text-left text-sm font-semibold border-2 transition-all duration-200 ${
              value === opt
                ? 'bg-yellow-400 border-yellow-400 text-white shadow-md'
                : 'bg-white/15 border-white/25 text-white hover:bg-white/25'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    );
  }

  if (questionType === 'text') {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type your answer here…"
        className="w-full rounded-2xl border-2 border-white/30 bg-white px-4 py-3 text-base text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-300"
      />
    );
  }

  return null;
}

// ── Spinner screen ────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-yellow-400 via-amber-300 to-orange-500">
      <div className="w-10 h-10 border-4 border-white/60 border-t-white rounded-full animate-spin" />
    </div>
  );
}

// ── Main survey component ─────────────────────────────────────────────────────

function SurveyContent() {
  const searchParams  = useSearchParams();
  const retailproId   = searchParams.get('retailpro_id')  ?? '';
  const transactionId = searchParams.get('transaction_id') ?? '';

  const [form, setForm]                 = useState<ActiveForm | null>(null);
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [loading, setLoading]           = useState(true);
  const [answers, setAnswers]           = useState<Record<number, string>>({});
  const [submitting, setSubmitting]     = useState(false);
  const [submitted, setSubmitted]       = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [noForm, setNoForm]             = useState(false);
  const [blocked, setBlocked]           = useState<'invalid_link' | 'transaction_not_found' | 'transaction_not_yours' | 'already_submitted' | null>(null);

  // ── One-at-a-time navigation state ───────────────────────────────────────────
  const [currentIdx, setCurrentIdx] = useState(0);
  const [slideDir, setSlideDir]     = useState<'right' | 'left'>('right');

  const loadData = useCallback(async () => {
    if (!retailproId || !transactionId) {
      setBlocked('invalid_link');
      setLoading(false);
      return;
    }
    try {
      const validateRes = await axios.get(
        `${API_URL}/forms/web/validate?retailpro_id=${encodeURIComponent(retailproId)}&transaction_id=${encodeURIComponent(transactionId)}`
      );
      if (!validateRes.data.valid) {
        setBlocked(validateRes.data.reason as 'transaction_not_found' | 'transaction_not_yours' | 'already_submitted');
        setLoading(false);
        return;
      }
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
    if (submitted || blocked) return;
    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`${API_URL}/forms/web/active`);
        if (!res.data) return;
        const refreshed = res.data as ActiveForm;
        setForm((prev) => {
          if (!prev) return refreshed;
          const changed =
            prev.id !== refreshed.id ||
            JSON.stringify(prev.formQuestions) !== JSON.stringify(refreshed.formQuestions);
          return changed ? refreshed : prev;
        });
      } catch { /* silent */ }
    }, 30_000);
    return () => clearInterval(interval);
  }, [submitted, blocked]);

  // ── Navigation helpers ────────────────────────────────────────────────────────

  const totalQuestions = form?.formQuestions.length ?? 0;
  const isLast = currentIdx === totalQuestions - 1;

  function goNext() {
    if (currentIdx < totalQuestions - 1) {
      setSlideDir('right');
      setCurrentIdx((i) => i + 1);
    }
  }

  function goBack() {
    if (currentIdx > 0) {
      setSlideDir('left');
      setCurrentIdx((i) => i - 1);
    }
  }

  function setAnswer(questionId: number, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  function pickAnswer(questionId: number, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    if (!isLast) {
      setTimeout(() => goNext(), 400);
    }
  }

  async function handleSubmit() {
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

  // ── Render: loading ───────────────────────────────────────────────────────────
  if (loading) return <Spinner />;

  // ── Render: already submitted ─────────────────────────────────────────────────
  if (blocked === 'already_submitted') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-400 via-amber-300 to-orange-500 flex items-center justify-center p-6">
        <style>{SURVEY_STYLES}</style>
        <div className="bg-white/25 backdrop-blur-xl border border-white/40 rounded-3xl shadow-2xl p-10 text-center max-w-sm w-full"
             style={{ animation: 'fadeIn 0.4s ease-out' }}>
          <div className="w-20 h-20 rounded-full bg-white/40 flex items-center justify-center mx-auto mb-6"
               style={{ animation: 'bounceIn 0.6s ease-out 0.2s both' }}>
            <span className="text-5xl">✅</span>
          </div>
          <h2 className="text-2xl font-bold text-white drop-shadow mb-2">Already Submitted</h2>
          <p className="text-white/80 text-sm">You have already submitted feedback for this visit. Thank you!</p>
        </div>
      </div>
    );
  }

  // ── Render: blocked ───────────────────────────────────────────────────────────
  if (blocked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-400 via-amber-300 to-orange-500 flex items-center justify-center p-6">
        <style>{SURVEY_STYLES}</style>
        <div className="bg-white/25 backdrop-blur-xl border border-white/40 rounded-3xl shadow-2xl p-10 text-center max-w-sm w-full"
             style={{ animation: 'fadeIn 0.4s ease-out' }}>
          <div className="text-6xl mb-5">🚫</div>
          <h2 className="text-2xl font-bold text-white drop-shadow mb-2">Invalid Feedback Link</h2>
          <p className="text-white/80 text-sm">This feedback link is not valid for your account.</p>
        </div>
      </div>
    );
  }

  // ── Render: no active form ────────────────────────────────────────────────────
  if (noForm || !form) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-400 via-amber-300 to-orange-500 flex items-center justify-center p-6">
        <style>{SURVEY_STYLES}</style>
        <div className="bg-white/25 backdrop-blur-xl border border-white/40 rounded-3xl shadow-2xl p-10 text-center max-w-sm w-full"
             style={{ animation: 'fadeIn 0.4s ease-out' }}>
          <div className="text-6xl mb-5">📋</div>
          <h2 className="text-xl font-bold text-white drop-shadow mb-2">No Survey Available</h2>
          <p className="text-white/80 text-sm">There is no active survey at the moment. Thank you!</p>
        </div>
      </div>
    );
  }

  // ── Render: thank you ─────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-400 via-amber-300 to-orange-500 flex items-center justify-center p-6">
        <style>{SURVEY_STYLES}</style>
        <div className="bg-white/25 backdrop-blur-xl border border-white/40 rounded-3xl shadow-2xl p-10 text-center max-w-sm w-full"
             style={{ animation: 'slideInFromRight 0.4s ease-out' }}>
          <div className="w-24 h-24 rounded-full bg-white/40 flex items-center justify-center mx-auto mb-6"
               style={{ animation: 'bounceIn 0.6s ease-out 0.2s both' }}>
            <span className="text-5xl text-white drop-shadow">✓</span>
          </div>
          <h2 className="text-3xl font-bold text-white drop-shadow mb-3">
            Thank You{firstName ? `, ${firstName}` : ''}!
          </h2>
          <p className="text-white/85 text-sm leading-relaxed">
            Your feedback has been submitted.<br />We appreciate your time!
          </p>
          <p className="text-white/50 text-xs mt-6">Powered by LoyaltyPlus</p>
        </div>
      </div>
    );
  }

  // ── Render: survey ────────────────────────────────────────────────────────────
  const fq = form.formQuestions[currentIdx];
  const currentAnswer = answers[fq.question.id] ?? '';
  const isText = fq.question.questionType === 'text';
  const canSubmitOrNext = currentAnswer.trim() !== '';
  const progress = ((currentIdx + 1) / totalQuestions) * 100;

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-yellow-400 via-amber-300 to-orange-500 flex flex-col items-center justify-center px-4 py-8 overflow-hidden">
      <style>{SURVEY_STYLES}</style>

      {/* Decorative blobs for depth */}
      <div className="absolute top-[-80px] right-[-80px] w-72 h-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-80px] left-[-80px] w-72 h-72 rounded-full bg-orange-600/20 blur-3xl pointer-events-none" />

      {/* Back button */}
      {currentIdx > 0 && (
        <button
          onClick={goBack}
          className="absolute top-5 left-5 text-white/75 hover:text-white text-sm font-semibold transition-colors flex items-center gap-1"
        >
          ← Back
        </button>
      )}

      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-6" style={{ animation: 'fadeIn 0.5s ease-out' }}>
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/30 backdrop-blur mb-3 shadow-lg">
            <span className="text-2xl">📝</span>
          </div>
          <h1 className="text-xl font-bold text-white drop-shadow">Your Feedback Matters to Us</h1>
          {firstName && (
            <p className="text-white/75 text-xs mt-1">Hi {firstName}, we&apos;d love your feedback!</p>
          )}
        </div>

        {/* Progress */}
        <p className="text-white/70 text-xs text-center mb-2">
          Question {currentIdx + 1} of {totalQuestions}
        </p>
        <div className="w-full bg-white/25 rounded-full h-1.5 mb-5">
          <div
            className="bg-white rounded-full h-1.5 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Question card — keyed on currentIdx for slide re-mount animation */}
        <div
          key={currentIdx}
          style={{ animation: `${slideDir === 'right' ? 'slideInFromRight' : 'slideInFromLeft'} 0.35s ease-out` }}
          className="bg-white/20 backdrop-blur-xl border border-white/30 rounded-3xl shadow-2xl p-6"
        >
          {/* Question text */}
          <p className="text-white font-semibold text-base leading-snug mb-5 drop-shadow-sm">
            {fq.question.text}
          </p>

          {/* Answer input */}
          <QuestionInput
            question={fq.question}
            value={currentAnswer}
            onChange={(v) => setAnswer(fq.question.id, v)}
            onPick={(v) => pickAnswer(fq.question.id, v)}
          />

          {/* Next / Submit button — only for text type or last question */}
          {(isText || isLast) && (
            <div className="mt-5">
              {error && <p className="text-center text-sm text-white font-semibold mb-3">{error}</p>}
              <button
                type="button"
                disabled={!canSubmitOrNext || submitting}
                onClick={isLast ? handleSubmit : goNext}
                className="w-full py-3.5 rounded-2xl bg-white text-amber-500 font-bold text-base shadow-lg hover:bg-white/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting…' : isLast ? 'Submit Feedback' : 'Next →'}
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-white/40 text-xs mt-6">Powered by LoyaltyPlus</p>
      </div>
    </div>
  );
}

// ── Page export (wrapped in Suspense for useSearchParams) ─────────────────────

export default function SurveyPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <SurveyContent />
    </Suspense>
  );
}

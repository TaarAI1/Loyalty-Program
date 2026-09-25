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

// ── SVG ring circumference (r=50 → 2π×50 ≈ 314) ──────────────────────────────
const RING_CIRC = 314;

// ── CSS keyframes ─────────────────────────────────────────────────────────────

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
@keyframes scaleUp {
  from { opacity: 0; transform: scale(0.92); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes pulseGold {
  0%, 100% { box-shadow: 0 0 0 0 rgba(234,179,8,0.45); }
  50%       { box-shadow: 0 0 0 10px rgba(234,179,8,0); }
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
  onPick: (v: string) => void;
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
            className={`text-5xl transition-all duration-200 hover:scale-110 drop-shadow-sm ${
              Number(value) >= star ? 'text-yellow-400' : 'text-gray-300'
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
                ? 'bg-yellow-50/80 ring-2 ring-yellow-400 scale-110 shadow-md'
                : 'opacity-70 hover:opacity-100 hover:scale-105'
            }`}
          >
            <img src={e.src} alt={e.label} className="w-14 h-14 drop-shadow" />
            <span className="text-[10px] font-semibold text-gray-600">{e.label}</span>
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
            style={value === opt ? { animation: 'pulseGold 0.6s ease-out' } : {}}
            className={`flex-1 py-3.5 rounded-2xl text-base font-bold transition-all duration-200 border-2 ${
              value === opt
                ? 'bg-yellow-400 border-yellow-400 text-white shadow-lg scale-[1.02]'
                : 'bg-white/50 border-white/70 text-gray-700 hover:bg-yellow-50/60 backdrop-blur-sm'
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
            style={value === opt ? { animation: 'pulseGold 0.6s ease-out' } : {}}
            className={`w-full py-3 px-4 rounded-2xl text-left text-sm font-semibold border-2 transition-all duration-200 ${
              value === opt
                ? 'bg-yellow-400 border-yellow-400 text-white shadow-md'
                : 'bg-white/50 border-white/70 text-gray-700 hover:bg-yellow-50/60 backdrop-blur-sm'
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
        className="w-full rounded-2xl border-2 border-white/60 bg-white/80 backdrop-blur-sm px-4 py-3 text-base text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
      />
    );
  }

  return null;
}

// ── Spinner screen ────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-white via-yellow-50 to-amber-50">
      <div className="w-10 h-10 border-4 border-yellow-200 border-t-yellow-500 rounded-full animate-spin" />
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
  const [blocked, setBlocked]           = useState<
    'invalid_link' | 'transaction_not_found' | 'transaction_not_yours' | 'already_submitted' | null
  >(null);

  // ── One-at-a-time navigation ──────────────────────────────────────────────────
  const [currentIdx, setCurrentIdx] = useState(0);
  const [slideDir, setSlideDir]     = useState<'right' | 'left'>('right');

  // ── Countdown (Thank You screen) ──────────────────────────────────────────────
  const [countdown, setCountdown] = useState(4);

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

  // ── Countdown timer fires once when submitted becomes true ────────────────────
  useEffect(() => {
    if (!submitted) return;
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(interval); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [submitted]);

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
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        setBlocked('already_submitted');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  const firstName = customerName ? customerName.split(' ')[0] : null;

  // Ring offset: 0 = full ring, RING_CIRC = empty. Drains 1/4 per second.
  const ringOffset = ((4 - countdown) / 4) * RING_CIRC;

  // ── Render: loading ───────────────────────────────────────────────────────────
  if (loading) return <Spinner />;

  // ── Render: already submitted ─────────────────────────────────────────────────
  if (blocked === 'already_submitted') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-yellow-50 to-amber-50 flex items-center justify-center p-6">
        <style>{SURVEY_STYLES}</style>
        <div
          className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-3xl shadow-2xl p-10 text-center max-w-sm w-full"
          style={{ animation: 'fadeIn 0.4s ease-out' }}
        >
          <div
            className="w-20 h-20 rounded-full bg-yellow-50 border-4 border-yellow-400 flex items-center justify-center mx-auto mb-6"
            style={{ animation: 'bounceIn 0.6s ease-out 0.2s both' }}
          >
            <span className="text-4xl text-yellow-500 font-bold">✓</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Already Submitted</h2>
          <p className="text-gray-500 text-sm">You have already submitted feedback for this visit. Thank you!</p>
        </div>
      </div>
    );
  }

  // ── Render: blocked ───────────────────────────────────────────────────────────
  if (blocked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-yellow-50 to-amber-50 flex items-center justify-center p-6">
        <style>{SURVEY_STYLES}</style>
        <div
          className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-3xl shadow-2xl p-10 text-center max-w-sm w-full"
          style={{ animation: 'fadeIn 0.4s ease-out' }}
        >
          <div className="text-6xl mb-5">🚫</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Invalid Feedback Link</h2>
          <p className="text-gray-500 text-sm">This feedback link is not valid for your account.</p>
        </div>
      </div>
    );
  }

  // ── Render: no active form ────────────────────────────────────────────────────
  if (noForm || !form) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-yellow-50 to-amber-50 flex items-center justify-center p-6">
        <style>{SURVEY_STYLES}</style>
        <div
          className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-3xl shadow-2xl p-10 text-center max-w-sm w-full"
          style={{ animation: 'fadeIn 0.4s ease-out' }}
        >
          <div className="text-6xl mb-5">📋</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">No Survey Available</h2>
          <p className="text-gray-500 text-sm">There is no active survey at the moment. Thank you!</p>
        </div>
      </div>
    );
  }

  // ── Render: thank you ─────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-yellow-50 to-amber-50 flex items-center justify-center p-6">
        <style>{SURVEY_STYLES}</style>
        <div
          className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-3xl shadow-2xl p-10 text-center max-w-sm w-full"
          style={{ animation: 'scaleUp 0.4s ease-out' }}
        >
          {/* Circular countdown ring around checkmark */}
          <div className="relative w-28 h-28 mx-auto mb-6">
            {/* SVG ring — rotated so it drains from top clockwise */}
            <svg
              className="absolute inset-0 w-full h-full -rotate-90"
              viewBox="0 0 112 112"
            >
              {/* Track */}
              <circle cx="56" cy="56" r="50" fill="none" stroke="#fef9c3" strokeWidth="5" />
              {/* Countdown arc */}
              <circle
                cx="56" cy="56" r="50"
                fill="none"
                stroke="#eab308"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={RING_CIRC}
                strokeDashoffset={ringOffset}
                style={{ transition: 'stroke-dashoffset 1s linear' }}
              />
            </svg>
            {/* Checkmark disc */}
            <div
              className="absolute inset-0 rounded-full bg-yellow-50 flex items-center justify-center m-2"
              style={{ animation: 'bounceIn 0.6s ease-out 0.2s both' }}
            >
              <span className="text-4xl text-yellow-500 font-bold leading-none">✓</span>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-gray-800 mb-3">
            Thank You{firstName ? `, ${firstName}` : ''}!
          </h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            Your feedback has been submitted.<br />We appreciate your time!
          </p>

          {/* Countdown text */}
          <p className="text-gray-400 text-xs mt-5">
            {countdown > 0 ? `Closing in ${countdown}s…` : 'You can close this tab.'}
          </p>

          <p className="text-gray-300 text-xs mt-4">Powered by LoyaltyPlus</p>
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
    <div className="relative min-h-screen bg-gradient-to-br from-white via-yellow-50 to-amber-50 flex flex-col items-center justify-center px-4 py-8 overflow-hidden">
      <style>{SURVEY_STYLES}</style>

      {/* Decorative blobs for glass depth */}
      <div className="absolute top-[-100px] right-[-80px] w-80 h-80 rounded-full bg-yellow-200/30 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-80px] left-[-80px] w-72 h-72 rounded-full bg-amber-100/40 blur-3xl pointer-events-none" />

      {/* Back button */}
      {currentIdx > 0 && (
        <button
          onClick={goBack}
          className="absolute top-5 left-5 text-gray-400 hover:text-gray-700 text-sm font-semibold transition-colors flex items-center gap-1 z-10"
        >
          ← Back
        </button>
      )}

      <div className="w-full max-w-sm relative z-10">
        {/* Header */}
        <div className="text-center mb-6" style={{ animation: 'fadeIn 0.5s ease-out' }}>
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-yellow-50 border border-yellow-200 mb-3 shadow-md">
            <span className="text-2xl">📝</span>
          </div>
          <h1 className="text-xl font-bold text-gray-800">Your Feedback Matters to Us</h1>
          {firstName && (
            <p className="text-gray-500 text-xs mt-1">Hi {firstName}, we&apos;d love your feedback!</p>
          )}
        </div>

        {/* Progress */}
        <p className="text-gray-400 text-xs text-center mb-2">
          Question {currentIdx + 1} of {totalQuestions}
        </p>
        <div className="w-full bg-gray-200 rounded-full h-1.5 mb-5">
          <div
            className="bg-yellow-400 rounded-full h-1.5 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Question card — keyed on currentIdx to trigger slide re-mount animation */}
        <div
          key={currentIdx}
          style={{ animation: `${slideDir === 'right' ? 'slideInFromRight' : 'slideInFromLeft'} 0.35s ease-out` }}
          className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-3xl shadow-2xl p-6"
        >
          {/* Question text */}
          <p className="text-gray-800 font-semibold text-base leading-snug mb-5">
            {fq.question.text}
          </p>

          {/* Answer input */}
          <QuestionInput
            question={fq.question}
            value={currentAnswer}
            onChange={(v) => setAnswer(fq.question.id, v)}
            onPick={(v) => pickAnswer(fq.question.id, v)}
          />

          {/* Next / Submit — only for text type or last question */}
          {(isText || isLast) && (
            <div className="mt-5">
              {error && <p className="text-center text-sm text-red-500 mb-3">{error}</p>}
              <button
                type="button"
                disabled={!canSubmitOrNext || submitting}
                onClick={isLast ? handleSubmit : goNext}
                className="w-full py-3.5 rounded-2xl bg-yellow-400 text-white font-bold text-base shadow-lg hover:bg-yellow-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting…' : isLast ? 'Submit Feedback' : 'Next →'}
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-gray-400/60 text-xs mt-6">Powered by LoyaltyPlus</p>
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

'use client';

import { useEffect, useState, useCallback } from 'react';
import { formsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog } from '@/components/ui/dialog';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Trash2, Plus, CheckCircle2, Star, ArrowLeft, Pencil,
  HelpCircle, LayoutTemplate, Tablet, Monitor, Smartphone,
  AlignLeft, Smile, ToggleLeft, List, MonitorSmartphone,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Question {
  id: number;
  text: string;
  questionType: string;
  options: string[] | null;
  status: string;
  createdAt: string;
}

interface Form {
  id: number;
  name: string;
  status: string;
  createdAt: string;
  formQuestions: { id: number; sortOrder: number; question: Question }[];
}

interface Device {
  id: number;
  name: string;
  deviceType: string;
  store: string | null;
  isActive: boolean;
}

interface Assignment {
  id: number;
  formId: number;
  deviceId: number;
  assignedAt: string;
  form: Form;
  device: Device;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const QUESTION_TYPE_OPTIONS = [
  { value: 'text',     label: 'Short Text' },
  { value: 'textarea', label: 'Emoji Feedback' },
  { value: 'rating',   label: 'Star Rating (1-5)' },
  { value: 'boolean',  label: 'Yes / No' },
  { value: 'select',   label: 'Multiple Choice' },
];

const STATUS_OPTIONS = [
  { value: 'active',   label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const DEVICE_TYPE_OPTIONS = [
  { value: 'workstation', label: 'Workstation' },
  { value: 'tablet',      label: 'Tablet' },
  { value: 'kiosk',       label: 'Kiosk' },
  { value: 'mobile',      label: 'Mobile' },
];

const TYPE_LABEL: Record<string, string> = {
  text:     'Short Text',
  textarea: 'Emoji Feedback',
  rating:   'Star Rating',
  boolean:  'Yes / No',
  select:   'Multiple Choice',
};

// icon + colour per question type
const TYPE_META: Record<string, { icon: React.ReactNode; bg: string; text: string }> = {
  text:     { icon: <AlignLeft   className="h-4 w-4" />, bg: 'bg-blue-100',   text: 'text-blue-600' },
  textarea: { icon: <Smile       className="h-4 w-4" />, bg: 'bg-yellow-100', text: 'text-yellow-600' },
  rating:   { icon: <Star        className="h-4 w-4" />, bg: 'bg-amber-100',  text: 'text-amber-600' },
  boolean:  { icon: <ToggleLeft  className="h-4 w-4" />, bg: 'bg-green-100',  text: 'text-green-600' },
  select:   { icon: <List        className="h-4 w-4" />, bg: 'bg-purple-100', text: 'text-purple-600' },
};

const DEVICE_ICON: Record<string, React.ReactNode> = {
  workstation: <Monitor      className="h-5 w-5" />,
  tablet:      <Tablet       className="h-5 w-5" />,
  kiosk:       <MonitorSmartphone className="h-5 w-5" />,
  mobile:      <Smartphone   className="h-5 w-5" />,
};

// ── Confirm Dialog ────────────────────────────────────────────────────────────

function ConfirmDialog({ open, title, message, onConfirm, onCancel }: {
  open: boolean;
  title?: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog open={open} onClose={onCancel} title={title ?? 'Confirm'} className="max-w-sm">
      <p className="text-sm text-muted-foreground mb-6">{message}</p>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button
          onClick={onConfirm}
          className="bg-destructive text-white hover:bg-destructive/90"
        >
          Confirm
        </Button>
      </div>
    </Dialog>
  );
}

// ── Question Preview ───────────────────────────────────────────────────────────

const EMOJI_OPTIONS = [
  { emoji: '😞', label: 'Very Bad' },
  { emoji: '😐', label: 'Neutral' },
  { emoji: '😊', label: 'Good' },
  { emoji: '😁', label: 'Great' },
  { emoji: '👍', label: 'Excellent' },
];

function QuestionPreview({ question }: { question: Question }) {
  const [rating, setRating]         = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [yesNo, setYesNo]           = useState<string | null>(null);
  const [emojiIdx, setEmojiIdx]     = useState<number | null>(null);
  const [selected, setSelected]     = useState<string | null>(null);
  const opts = question.options ?? [];

  return (
    <div>
      <p className="text-base font-semibold mb-3">{question.text}</p>

      {question.questionType === 'text' && (
        <input
          className="w-full rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-sm text-muted-foreground placeholder:text-muted-foreground/50 focus:outline-none cursor-default"
          placeholder="Type your answer here…"
          readOnly
        />
      )}

      {question.questionType === 'textarea' && (
        <div className="flex gap-2 mt-1 flex-wrap">
          {EMOJI_OPTIONS.map((e, i) => (
            <button key={i} type="button" onClick={() => setEmojiIdx(i)} title={e.label}
              className={`flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-2xl transition-all border ${emojiIdx === i ? 'border-primary bg-primary/10 scale-110' : 'border-transparent hover:bg-muted/60'}`}>
              {e.emoji}
              <span className="text-[10px] text-muted-foreground">{e.label}</span>
            </button>
          ))}
        </div>
      )}

      {question.questionType === 'rating' && (
        <div className="flex gap-1 mt-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => setRating(n)}
              onMouseEnter={() => setHoverRating(n)} onMouseLeave={() => setHoverRating(0)}
              className="transition-transform hover:scale-110">
              <Star className={`h-8 w-8 transition-colors ${n <= (hoverRating || rating) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`} />
            </button>
          ))}
        </div>
      )}

      {question.questionType === 'boolean' && (
        <div className="flex gap-3 mt-1">
          {['Yes', 'No'].map((opt) => (
            <button key={opt} type="button" onClick={() => setYesNo(opt)}
              className={`rounded-full px-6 py-1.5 text-sm font-medium border transition-colors ${yesNo === opt ? opt === 'Yes' ? 'bg-green-500 text-white border-green-500' : 'bg-red-500 text-white border-red-500' : 'border-border hover:bg-muted/60'}`}>
              {opt}
            </button>
          ))}
        </div>
      )}

      {question.questionType === 'select' && (
        <div className="space-y-1.5 mt-1">
          {opts.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No options defined.</p>
          ) : opts.map((opt, i) => (
            <label key={i} className="flex items-center gap-2 cursor-pointer group">
              <span className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${selected === opt ? 'border-primary' : 'border-muted-foreground/40 group-hover:border-primary/60'}`}
                onClick={() => setSelected(opt)}>
                {selected === opt && <span className="h-2 w-2 rounded-full bg-primary block" />}
              </span>
              <span className="text-sm" onClick={() => setSelected(opt)}>
                <span className="text-muted-foreground mr-1">{String.fromCharCode(97 + i)}.</span>{opt}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Inline Form Preview Page ───────────────────────────────────────────────────

function FormPreviewPage({ form, onBack, onEdit }: { form: Form; onBack: () => void; onEdit: () => void }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to forms
        </button>
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit Form
        </Button>
      </div>
      <div className="max-w-2xl mx-auto">
        <div className="rounded-t-2xl bg-primary px-8 py-6">
          <h2 className="text-xl font-bold text-primary-foreground">{form.name}</h2>
          <p className="text-sm text-primary-foreground/70 mt-1">Please take a moment to fill out this survey.</p>
        </div>
        <div className="rounded-b-2xl border border-t-0 bg-background divide-y">
          {form.formQuestions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-10 text-center">No questions added yet.</p>
          ) : form.formQuestions.map((fq, idx) => (
            <div key={fq.id} className="px-8 py-6">
              <p className="text-xs font-semibold text-primary/70 uppercase tracking-wider mb-1">Question {idx + 1}</p>
              <QuestionPreview question={fq.question} />
            </div>
          ))}
          <div className="px-8 py-5 flex justify-end bg-muted/20 rounded-b-2xl">
            <button type="button"
              className="rounded-full bg-primary px-8 py-2.5 text-sm font-semibold text-primary-foreground shadow hover:opacity-90 transition-opacity">
              Submit
            </button>
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-4">This is a preview. Responses are not saved.</p>
      </div>
    </div>
  );
}

// ── Questions Tab ─────────────────────────────────────────────────────────────

function QuestionsTab() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing]     = useState<Question | null>(null);
  const [formState, setFormState] = useState({ text: '', questionType: 'text', status: 'active', options: [] as string[] });
  const [newOption, setNewOption] = useState('');
  const [confirmState, setConfirmState] = useState<{ open: boolean; message: string; onConfirm: () => void }>({
    open: false, message: '', onConfirm: () => {},
  });

  function askConfirm(message: string, action: () => void) {
    setConfirmState({ open: true, message, onConfirm: action });
  }
  function closeConfirm() { setConfirmState((s) => ({ ...s, open: false })); }

  const load = useCallback(async () => {
    try { setLoading(true); setQuestions(await formsApi.getQuestions()); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setEditing(null);
    setFormState({ text: '', questionType: 'text', status: 'active', options: [] });
    setNewOption(''); setShowDialog(true);
  }

  function openEdit(q: Question) {
    setEditing(q);
    setFormState({ text: q.text, questionType: q.questionType, status: q.status, options: q.options ?? [] });
    setNewOption(''); setShowDialog(true);
  }

  function addOption() {
    const val = newOption.trim();
    if (!val || formState.options.includes(val)) return;
    setFormState((s) => ({ ...s, options: [...s.options, val] }));
    setNewOption('');
  }

  function removeOption(idx: number) {
    setFormState((s) => ({ ...s, options: s.options.filter((_, i) => i !== idx) }));
  }

  async function save() {
    if (!formState.text.trim()) return;
    const payload = {
      text: formState.text, questionType: formState.questionType, status: formState.status,
      options: formState.questionType === 'select' ? formState.options : undefined,
    };
    editing ? await formsApi.updateQuestion(editing.id, payload) : await formsApi.createQuestion(payload);
    setShowDialog(false); load();
  }

  function remove(id: number) {
    askConfirm('Are you sure you want to delete this question? This cannot be undone.', async () => {
      closeConfirm();
      await formsApi.deleteQuestion(id);
      load();
    });
  }

  return (
    <div className="space-y-5">
      {/* header row */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Reusable questions you can add to any form.</p>
        <Button size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4 mr-1" /> Add Question
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[1,2,3,4].map((n) => <div key={n} className="h-20 rounded-xl bg-muted/40 animate-pulse" />)}
        </div>
      ) : questions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <HelpCircle className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium">No questions yet</p>
          <p className="text-xs text-muted-foreground mt-1">Click "Add Question" to create your first one.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {questions.map((q) => {
            const meta = TYPE_META[q.questionType] ?? TYPE_META['text'];
            return (
              <div key={q.id}
                className="group relative rounded-xl border bg-background p-4 hover:shadow-md transition-shadow flex gap-3">
                {/* type icon chip */}
                <div className={`shrink-0 h-9 w-9 rounded-lg flex items-center justify-center ${meta.bg} ${meta.text}`}>
                  {meta.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-snug truncate pr-16">{q.text}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {TYPE_LABEL[q.questionType] ?? q.questionType}
                    {q.questionType === 'select' && q.options && q.options.length > 0
                      ? ` · ${q.options.length} options` : ''}
                  </p>
                </div>
                {/* badge + actions */}
                <div className="absolute top-3 right-3 flex items-center gap-1.5">
                  <Badge variant={q.status === 'active' ? 'default' : 'outline'} className="text-[10px]">
                    {q.status}
                  </Badge>
                </div>
                <div className="absolute bottom-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button type="button" onClick={() => openEdit(q)}
                    className="rounded-md px-2 py-0.5 text-xs font-medium border border-border hover:bg-muted/60 transition-colors">
                    Edit
                  </button>
                  <button type="button" onClick={() => remove(q.id)}
                    className="rounded-md p-1 text-destructive hover:bg-destructive/10 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={confirmState.open}
        message={confirmState.message}
        onConfirm={() => { confirmState.onConfirm(); }}
        onCancel={closeConfirm}
      />

      <Dialog open={showDialog} onClose={() => setShowDialog(false)}
        title={editing ? 'Edit Question' : 'Add Question'} className="max-w-md">
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Question Text</Label>
            <Input placeholder="e.g. How satisfied are you with our service?"
              value={formState.text} onChange={(e) => setFormState({ ...formState, text: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Type</Label>
            <Select options={QUESTION_TYPE_OPTIONS} value={formState.questionType}
              onChange={(e) => setFormState({ ...formState, questionType: e.target.value, options: [] })} />
          </div>
          {formState.questionType === 'select' && (
            <div className="space-y-2">
              <Label>Answer Options</Label>
              {formState.options.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formState.options.map((opt, i) => (
                    <span key={i} className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-0.5 text-sm">
                      <span className="text-muted-foreground mr-0.5">{String.fromCharCode(97 + i)}.</span>
                      {opt}
                      <button type="button" onClick={() => removeOption(i)}
                        className="ml-1 text-muted-foreground hover:text-destructive transition-colors">×</button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input placeholder="Type an option and press +" value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOption(); } }} />
                <Button type="button" variant="outline" size="icon" onClick={addOption}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {formState.options.length === 0 && (
                <p className="text-xs text-muted-foreground">Add at least one option.</p>
              )}
            </div>
          )}
          {formState.questionType === 'textarea' && (
            <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
              Respondents answer with emoji reactions: 😞 😐 😊 😁 👍
            </p>
          )}
          {formState.questionType === 'rating' && (
            <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
              Respondents rate from 1 to 5 stars.
            </p>
          )}
          {formState.questionType === 'boolean' && (
            <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
              Respondents tap Yes or No.
            </p>
          )}
          <div className="space-y-1">
            <Label>Status</Label>
            <Select options={STATUS_OPTIONS} value={formState.status}
              onChange={(e) => setFormState({ ...formState, status: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

// ── Form Build Tab ─────────────────────────────────────────────────────────────

function FormBuildTab() {
  const [forms, setForms]           = useState<Form[]>([]);
  const [questions, setQuestions]   = useState<Question[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing]       = useState<Form | null>(null);
  const [name, setName]             = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [status, setStatus]         = useState('active');
  const [previewForm, setPreviewForm] = useState<Form | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [f, q] = await Promise.all([formsApi.getForms(), formsApi.getQuestions()]);
      setForms(f);
      setQuestions(q.filter((x: Question) => x.status === 'active'));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openAdd() { setEditing(null); setName(''); setSelectedIds([]); setStatus('active'); setShowDialog(true); }
  function openEdit(f: Form) { setEditing(f); setName(f.name); setSelectedIds(f.formQuestions.map((fq) => fq.question.id)); setStatus(f.status); setShowDialog(true); }

  async function save() {
    if (!name.trim()) return;
    editing
      ? await formsApi.updateForm(editing.id, { name, status, questionIds: selectedIds })
      : await formsApi.createForm({ name, status, questionIds: selectedIds });
    setShowDialog(false); load();
  }

  function toggleQuestion(id: number) {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  if (previewForm) {
    return <FormPreviewPage form={previewForm} onBack={() => setPreviewForm(null)}
      onEdit={() => { setPreviewForm(null); openEdit(previewForm); }} />;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Combine questions into named survey forms.</p>
        <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" /> New Form</Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map((n) => <div key={n} className="h-16 rounded-xl bg-muted/40 animate-pulse" />)}
        </div>
      ) : forms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <LayoutTemplate className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium">No forms yet</p>
          <p className="text-xs text-muted-foreground mt-1">Click "New Form" to build your first survey.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {forms.map((f) => {
            const typeIcons = Array.from(new Set(f.formQuestions.map((fq) => fq.question.questionType))).slice(0, 4);
            return (
              <div key={f.id} className="rounded-xl border bg-background overflow-hidden hover:shadow-md transition-shadow group flex">
                <div className="w-1.5 bg-primary shrink-0" />
                <div className="p-4 flex-1 flex items-center gap-4">
                  {/* left: name + chips */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <p className="font-semibold text-sm leading-tight truncate">{f.name}</p>
                      <Badge variant={f.status === 'active' ? 'default' : 'outline'} className="shrink-0 text-[10px]">
                        {f.status}
                      </Badge>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {typeIcons.map((type) => {
                        const m = TYPE_META[type] ?? TYPE_META['text'];
                        return (
                          <span key={type} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${m.bg} ${m.text}`}>
                            {m.icon}{TYPE_LABEL[type] ?? type}
                          </span>
                        );
                      })}
                      {f.formQuestions.length > 4 && (
                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                          +{f.formQuestions.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                  {/* right: question count + actions */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-muted-foreground">
                      {f.formQuestions.length} Q
                    </span>
                    <button type="button" onClick={() => setPreviewForm(f)}
                      className="rounded-lg border border-primary text-primary text-xs font-semibold px-3 py-1.5 hover:bg-primary/5 transition-colors">
                      Preview
                    </button>
                    <button type="button" onClick={() => openEdit(f)}
                      className="rounded-lg border border-border text-xs font-semibold px-3 py-1.5 hover:bg-muted/50 transition-colors">
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showDialog} onClose={() => setShowDialog(false)}
        title={editing ? 'Edit Form' : 'New Form'} className="max-w-lg">
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          <div className="space-y-1">
            <Label>Form Name</Label>
            <Input placeholder="e.g. Post-Purchase Survey" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Status</Label>
            <Select options={STATUS_OPTIONS} value={status} onChange={(e) => setStatus(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Questions ({selectedIds.length} selected)</Label>
            {questions.length === 0 ? (
              <p className="text-xs text-muted-foreground">No active questions found.</p>
            ) : (
              <div className="border rounded-md divide-y max-h-56 overflow-y-auto">
                {questions.map((q) => {
                  const checked = selectedIds.includes(q.id);
                  const meta = TYPE_META[q.questionType] ?? TYPE_META['text'];
                  return (
                    <button key={q.id} type="button" onClick={() => toggleQuestion(q.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${checked ? 'bg-primary/5' : 'hover:bg-muted/50'}`}>
                      <CheckCircle2 className={`h-4 w-4 shrink-0 ${checked ? 'text-primary' : 'text-muted-foreground/30'}`} />
                      <div className={`h-6 w-6 rounded-md flex items-center justify-center shrink-0 ${meta.bg} ${meta.text}`}>
                        {meta.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm truncate">{q.text}</p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{TYPE_LABEL[q.questionType] ?? q.questionType}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

// ── Form Assign Tab ────────────────────────────────────────────────────────────

// Dummy devices shown when none are registered yet
const DUMMY_DEVICES: Device[] = [
  { id: -1, name: 'Register 1', deviceType: 'workstation', store: null, isActive: true },
  { id: -2, name: 'Register 2', deviceType: 'kiosk',       store: null, isActive: true },
];

function FormAssignTab() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [forms, setForms]             = useState<Form[]>([]);
  const [devices, setDevices]         = useState<Device[]>([]);
  const [loading, setLoading]         = useState(true);
  const [assigning, setAssigning]     = useState(false);

  // Filter / selection state
  const [filterStore, setFilterStore]           = useState('');
  const [filterDeviceType, setFilterDeviceType] = useState('');
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<number[]>([]);
  const [selectedFormId, setSelectedFormId]     = useState('');

  // Stores from DB
  const [storeOptions, setStoreOptions]   = useState<{ value: string; label: string }[]>([{ value: '', label: 'All Branches' }]);
  const [storesLoading, setStoresLoading] = useState(false);

  // Add / Edit device dialog
  const [showDeviceDialog, setShowDeviceDialog] = useState(false);
  const [editingDevice, setEditingDevice]       = useState<Device | null>(null);
  const [deviceForm, setDeviceForm] = useState({ name: '', deviceType: 'workstation', store: '' });

  const [confirmState, setConfirmState] = useState<{ open: boolean; message: string; onConfirm: () => void }>({
    open: false, message: '', onConfirm: () => {},
  });
  function askConfirm(message: string, action: () => void) {
    setConfirmState({ open: true, message, onConfirm: action });
  }
  function closeConfirm() { setConfirmState((s) => ({ ...s, open: false })); }

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [a, f, d] = await Promise.all([formsApi.getAssignments(), formsApi.getForms(), formsApi.getDevices()]);
      setAssignments(a);
      setForms(f.filter((x: Form) => x.status === 'active'));
      setDevices(d);
    } finally { setLoading(false); }
  }, []);

  const loadStores = useCallback(async () => {
    try {
      setStoresLoading(true);
      const stores: string[] = await formsApi.getStores();
      setStoreOptions([
        { value: '', label: 'All Branches' },
        ...stores.map((s) => ({ value: s, label: s })),
      ]);
    } catch {
      setStoreOptions([{ value: '', label: 'All Branches' }]);
    } finally { setStoresLoading(false); }
  }, []);

  useEffect(() => { load(); loadStores(); }, [load, loadStores]);

  // Devices to show: real ones or dummies if none registered
  const allDevices = devices.length > 0 ? devices : DUMMY_DEVICES;

  const deviceTypeFilterOptions = [
    { value: '',            label: 'All Device Types' },
    { value: 'workstation', label: 'Workstation' },
    { value: 'kiosk',       label: 'Kiosk' },
    { value: 'tablet',      label: 'Tablet' },
    { value: 'mobile',      label: 'Mobile' },
  ];

  const filteredDevices = allDevices.filter((d) => {
    if (filterStore && d.store !== filterStore) return false;
    if (filterDeviceType && d.deviceType !== filterDeviceType) return false;
    return true;
  });

  function toggleDevice(id: number) {
    setSelectedDeviceIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  async function handleAssign() {
    if (!selectedFormId || selectedDeviceIds.length === 0) return;
    const realSelected = selectedDeviceIds.filter((id) => id > 0);
    if (realSelected.length === 0) return;
    setAssigning(true);
    try {
      await formsApi.assignForm({ formId: Number(selectedFormId), deviceIds: realSelected });
      setSelectedDeviceIds([]);
      setSelectedFormId('');
      load();
    } finally { setAssigning(false); }
  }

  function removeAssignment(id: number) {
    askConfirm('Are you sure you want to remove this assignment? This cannot be undone.', async () => {
      closeConfirm();
      await formsApi.deleteAssignment(id);
      load();
    });
  }

  function openAddDevice() {
    setEditingDevice(null);
    setDeviceForm({ name: '', deviceType: 'workstation', store: '' });
    setShowDeviceDialog(true);
  }

  function openEditDevice(d: Device) {
    setEditingDevice(d);
    setDeviceForm({ name: d.name, deviceType: d.deviceType, store: d.store ?? '' });
    setShowDeviceDialog(true);
  }

  function removeDevice(id: number) {
    askConfirm('Are you sure you want to delete this device? This cannot be undone.', async () => {
      closeConfirm();
      await formsApi.deleteDevice(id);
      load();
    });
  }

  async function saveDevice() {
    if (!deviceForm.name.trim()) return;
    if (editingDevice) {
      await formsApi.updateDevice(editingDevice.id, {
        name: deviceForm.name,
        deviceType: deviceForm.deviceType,
        store: deviceForm.store || undefined,
      });
    } else {
      await formsApi.createDevice({ name: deviceForm.name, deviceType: deviceForm.deviceType, store: deviceForm.store || undefined });
    }
    setShowDeviceDialog(false);
    load();
  }

  const formOptions = [
    { value: '', label: 'Select a form…' },
    ...forms.map((f) => ({ value: f.id, label: f.name })),
  ];

  return (
    <div className="space-y-6">

      {/* ── Assignment Panel ─────────────────────────────────── */}
      <div className="rounded-2xl border bg-background shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b bg-muted/20 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Assign Form to Devices</p>
            <p className="text-xs text-muted-foreground mt-0.5">Select a branch, device type, devices and a form, then click Assign.</p>
          </div>
          <Button variant="outline" size="sm" onClick={openAddDevice}>
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Device
          </Button>
        </div>

        <div className="p-6 space-y-5">
          {/* Row 1: Branch + Device Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Branch / Store</Label>
              <Select
                options={storesLoading ? [{ value: '', label: 'Loading stores…' }] : storeOptions}
                value={filterStore}
                onChange={(e) => { setFilterStore(e.target.value); setSelectedDeviceIds([]); }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Device Type</Label>
              <Select
                options={deviceTypeFilterOptions}
                value={filterDeviceType}
                onChange={(e) => { setFilterDeviceType(e.target.value); setSelectedDeviceIds([]); }}
              />
            </div>
          </div>

          {/* Row 2: Device list (multi-select) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>
                Devices
                {selectedDeviceIds.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-primary">{selectedDeviceIds.length} selected</span>
                )}
              </Label>
              {filteredDevices.length > 1 && (
                <button type="button"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => {
                    const allIds = filteredDevices.map((d) => d.id);
                    const allSelected = allIds.every((id) => selectedDeviceIds.includes(id));
                    setSelectedDeviceIds(allSelected ? [] : allIds);
                  }}>
                  {filteredDevices.every((d) => selectedDeviceIds.includes(d.id)) ? 'Deselect all' : 'Select all'}
                </button>
              )}
            </div>

            {filteredDevices.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-muted/20 py-8 text-center">
                <Monitor className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No devices match the selected filters.</p>
              </div>
            ) : (
              <div className="rounded-xl border divide-y overflow-hidden">
                {filteredDevices.map((d) => {
                  const checked = selectedDeviceIds.includes(d.id);
                  const isDummy = d.id < 0;
                  return (
                    <div key={d.id} className={`flex items-center gap-3 px-4 py-3 transition-colors ${checked ? 'bg-primary/5' : 'hover:bg-muted/40'}`}>
                      {/* Checkbox area — clicking selects/deselects */}
                      <button type="button" onClick={() => toggleDevice(d.id)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                        <span className={`h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${checked ? 'bg-primary border-primary' : 'border-muted-foreground/30'}`}>
                          {checked && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                        </span>
                        <span className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${checked ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                          {DEVICE_ICON[d.deviceType] ?? <Monitor className="h-5 w-5" />}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-tight">
                            {d.name}
                            {isDummy && <span className="ml-1.5 text-[10px] text-muted-foreground font-normal">(demo)</span>}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {DEVICE_TYPE_OPTIONS.find((t) => t.value === d.deviceType)?.label ?? d.deviceType}
                            {d.store ? ` · ${d.store}` : ''}
                          </p>
                        </div>
                      </button>
                      {/* Edit + Delete (real devices only) */}
                      {!isDummy && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button type="button" onClick={() => openEditDevice(d)}
                            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={() => removeDevice(d.id)}
                            className="rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Row 3: Form + Assign button */}
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-1.5">
              <Label>Form to Assign</Label>
              <Select
                options={formOptions}
                value={selectedFormId}
                onChange={(e) => setSelectedFormId(e.target.value)}
              />
            </div>
            <Button
              onClick={handleAssign}
              disabled={!selectedFormId || selectedDeviceIds.filter((id) => id > 0).length === 0 || assigning}
              className="shrink-0"
            >
              {assigning ? 'Assigning…' : 'Assign'}
            </Button>
          </div>

          {selectedDeviceIds.some((id) => id < 0) && (
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
              Demo devices are for preview only. Register a real device with "Add Device" to create actual assignments.
            </p>
          )}
        </div>
      </div>

      {/* ── Current Assignments — data table ─────────────────── */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Current Assignments</p>

        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map((n) => <div key={n} className="h-12 rounded-lg bg-muted/40 animate-pulse" />)}
          </div>
        ) : assignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center rounded-2xl border border-dashed">
            <Tablet className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium">No assignments yet</p>
            <p className="text-xs text-muted-foreground mt-1">Select a form and devices above, then click Assign.</p>
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Device</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Store</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Form Assigned</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assigned At</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {assignments.map((a) => (
                    <tr key={a.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                            {DEVICE_ICON[a.device.deviceType] ?? <Monitor className="h-4 w-4" />}
                          </span>
                          <span className="font-medium">{a.device.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {DEVICE_TYPE_OPTIONS.find((t) => t.value === a.device.deviceType)?.label ?? a.device.deviceType}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {a.device.store ?? <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium">
                          <LayoutTemplate className="h-3 w-3 shrink-0" />
                          {a.form.name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                        {new Date(a.assignedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button type="button" onClick={() => removeAssignment(a.id)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmState.open}
        message={confirmState.message}
        onConfirm={() => { confirmState.onConfirm(); }}
        onCancel={closeConfirm}
      />

      {/* Add / Edit Device Dialog */}
      <Dialog
        open={showDeviceDialog}
        onClose={() => setShowDeviceDialog(false)}
        title={editingDevice ? 'Edit Device' : 'Register a Device'}
        className="max-w-sm"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Device Name</Label>
            <Input placeholder="e.g. Register 1" value={deviceForm.name}
              onChange={(e) => setDeviceForm({ ...deviceForm, name: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Type</Label>
            <Select options={DEVICE_TYPE_OPTIONS} value={deviceForm.deviceType}
              onChange={(e) => setDeviceForm({ ...deviceForm, deviceType: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Store <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Select
              options={storeOptions.length > 1 ? storeOptions : [{ value: '', label: 'No stores found in DB' }]}
              value={deviceForm.store}
              onChange={(e) => setDeviceForm({ ...deviceForm, store: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowDeviceDialog(false)}>Cancel</Button>
            <Button onClick={saveDevice}>{editingDevice ? 'Save Changes' : 'Add Device'}</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

type TabId = 'questions' | 'form-build' | 'form-assign';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'questions',   label: 'Questions',   icon: <HelpCircle     className="h-4 w-4" /> },
  { id: 'form-build',  label: 'Form Build',  icon: <LayoutTemplate className="h-4 w-4" /> },
  { id: 'form-assign', label: 'Form Assign', icon: <Tablet         className="h-4 w-4" /> },
];

export default function FormsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('questions');

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Form Management</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Create survey questions, build forms, and assign them to POS devices.
        </p>
      </div>

      {/* Custom tab bar — underline style, full width */}
      <div className="border-b">
        <div className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'questions'   && <QuestionsTab />}
        {activeTab === 'form-build'  && <FormBuildTab />}
        {activeTab === 'form-assign' && <FormAssignTab />}
      </div>
    </div>
  );
}

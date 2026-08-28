'use client';

import { useEffect, useState, useCallback } from 'react';
import { formsApi, configApi } from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog } from '@/components/ui/dialog';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, GripVertical, MonitorSmartphone, CheckCircle2, Star, ArrowLeft, Pencil } from 'lucide-react';

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

// ── Question Preview (live interactive preview) ───────────────────────────────

const EMOJI_OPTIONS = [
  { emoji: '😞', label: 'Very Bad' },
  { emoji: '😐', label: 'Neutral' },
  { emoji: '😊', label: 'Good' },
  { emoji: '😁', label: 'Great' },
  { emoji: '👍', label: 'Excellent' },
];

function QuestionPreview({ question }: { question: Question }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [yesNo, setYesNo] = useState<string | null>(null);
  const [emojiIdx, setEmojiIdx] = useState<number | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

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
        <div className="flex gap-3 mt-1">
          {EMOJI_OPTIONS.map((e, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setEmojiIdx(i)}
              title={e.label}
              className={`flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-2xl transition-all border ${
                emojiIdx === i
                  ? 'border-primary bg-primary/10 scale-110'
                  : 'border-transparent hover:bg-muted/60'
              }`}
            >
              {e.emoji}
              <span className="text-[10px] text-muted-foreground">{e.label}</span>
            </button>
          ))}
        </div>
      )}

      {question.questionType === 'rating' && (
        <div className="flex gap-1 mt-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              onMouseEnter={() => setHoverRating(n)}
              onMouseLeave={() => setHoverRating(0)}
              className="transition-transform hover:scale-110"
            >
              <Star
                className={`h-8 w-8 transition-colors ${
                  n <= (hoverRating || rating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-muted-foreground/30'
                }`}
              />
            </button>
          ))}
        </div>
      )}

      {question.questionType === 'boolean' && (
        <div className="flex gap-3 mt-1">
          {['Yes', 'No'].map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setYesNo(opt)}
              className={`rounded-full px-6 py-1.5 text-sm font-medium border transition-colors ${
                yesNo === opt
                  ? opt === 'Yes'
                    ? 'bg-green-500 text-white border-green-500'
                    : 'bg-red-500 text-white border-red-500'
                  : 'border-border hover:bg-muted/60'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {question.questionType === 'select' && (
        <div className="space-y-1.5 mt-1">
          {opts.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No options defined.</p>
          ) : (
            opts.map((opt, i) => (
              <label
                key={i}
                className="flex items-center gap-2 cursor-pointer group"
              >
                <span
                  className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    selected === opt ? 'border-primary' : 'border-muted-foreground/40 group-hover:border-primary/60'
                  }`}
                  onClick={() => setSelected(opt)}
                >
                  {selected === opt && (
                    <span className="h-2 w-2 rounded-full bg-primary block" />
                  )}
                </span>
                <span
                  className="text-sm"
                  onClick={() => setSelected(opt)}
                >
                  <span className="text-muted-foreground mr-1">
                    {String.fromCharCode(97 + i)}.
                  </span>
                  {opt}
                </span>
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Questions Tab ─────────────────────────────────────────────────────────────

function QuestionsTab() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Question | null>(null);
  const [formState, setFormState] = useState({
    text: '',
    questionType: 'text',
    status: 'active',
    options: [] as string[],
  });
  const [newOption, setNewOption] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setQuestions(await formsApi.getQuestions());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setEditing(null);
    setFormState({ text: '', questionType: 'text', status: 'active', options: [] });
    setNewOption('');
    setShowDialog(true);
  }

  function openEdit(q: Question) {
    setEditing(q);
    setFormState({
      text: q.text,
      questionType: q.questionType,
      status: q.status,
      options: q.options ?? [],
    });
    setNewOption('');
    setShowDialog(true);
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
      text: formState.text,
      questionType: formState.questionType,
      status: formState.status,
      options: formState.questionType === 'select' ? formState.options : undefined,
    };
    if (editing) {
      await formsApi.updateQuestion(editing.id, payload);
    } else {
      await formsApi.createQuestion(payload);
    }
    setShowDialog(false);
    load();
  }

  async function remove(id: number) {
    if (!confirm('Delete this question?')) return;
    await formsApi.deleteQuestion(id);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Manage reusable survey questions that can be added to any form.
        </p>
        <Button size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4 mr-1" /> Add Question
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
      ) : questions.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No questions yet. Add your first question.
        </p>
      ) : (
        <div className="border rounded-lg divide-y">
          {questions.map((q) => (
            <div key={q.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{q.text}</p>
                  <p className="text-xs text-muted-foreground">
                    {TYPE_LABEL[q.questionType] ?? q.questionType}
                    {q.questionType === 'select' && q.options && q.options.length > 0
                      ? ` · ${q.options.length} options`
                      : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={q.status === 'active' ? 'default' : 'outline'}>
                  {q.status}
                </Badge>
                <Button variant="ghost" size="sm" onClick={() => openEdit(q)}>Edit</Button>
                <Button variant="ghost" size="icon" onClick={() => remove(q.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        title={editing ? 'Edit Question' : 'Add Question'}
        className="max-w-md"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Question Text</Label>
            <Input
              placeholder="e.g. How satisfied are you with our service?"
              value={formState.text}
              onChange={(e) => setFormState({ ...formState, text: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label>Type</Label>
            <Select
              options={QUESTION_TYPE_OPTIONS}
              value={formState.questionType}
              onChange={(e) =>
                setFormState({ ...formState, questionType: e.target.value, options: [] })
              }
            />
          </div>

          {/* Multiple choice options editor */}
          {formState.questionType === 'select' && (
            <div className="space-y-2">
              <Label>Answer Options</Label>
              {formState.options.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formState.options.map((opt, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-0.5 text-sm"
                    >
                      <span className="text-muted-foreground mr-0.5">
                        {String.fromCharCode(97 + i)}.
                      </span>
                      {opt}
                      <button
                        type="button"
                        onClick={() => removeOption(i)}
                        className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  placeholder="Type an option and press +"
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOption(); } }}
                />
                <Button type="button" variant="outline" size="icon" onClick={addOption}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {formState.options.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Add at least one option (e.g. "Satisfied", "Neutral", "Unsatisfied").
                </p>
              )}
            </div>
          )}

          {/* Info text for other types */}
          {formState.questionType === 'textarea' && (
            <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
              Respondents will answer with emoji reactions: 😞 😐 😊 😁 👍
            </p>
          )}
          {formState.questionType === 'rating' && (
            <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
              Respondents will rate from 1 to 5 stars.
            </p>
          )}
          {formState.questionType === 'boolean' && (
            <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
              Respondents will tap Yes or No.
            </p>
          )}

          <div className="space-y-1">
            <Label>Status</Label>
            <Select
              options={STATUS_OPTIONS}
              value={formState.status}
              onChange={(e) => setFormState({ ...formState, status: e.target.value })}
            />
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

// ── Inline Form Preview ────────────────────────────────────────────────────────

function FormPreviewPage({ form, onBack, onEdit }: { form: Form; onBack: () => void; onEdit: () => void }) {
  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to forms
        </button>
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit Form
        </Button>
      </div>

      {/* Form card — looks like a real survey */}
      <div className="max-w-2xl mx-auto">
        {/* Header band */}
        <div className="rounded-t-2xl bg-primary px-8 py-6">
          <h2 className="text-xl font-bold text-primary-foreground">{form.name}</h2>
          <p className="text-sm text-primary-foreground/70 mt-1">
            Please take a moment to fill out this survey.
          </p>
        </div>

        {/* Questions */}
        <div className="rounded-b-2xl border border-t-0 bg-background divide-y">
          {form.formQuestions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-10 text-center">
              No questions added to this form yet.
            </p>
          ) : (
            form.formQuestions.map((fq, idx) => (
              <div key={fq.id} className="px-8 py-6">
                <p className="text-xs font-semibold text-primary/70 uppercase tracking-wider mb-1">
                  Question {idx + 1}
                </p>
                <QuestionPreview question={fq.question} />
              </div>
            ))
          )}

          {/* Submit strip */}
          <div className="px-8 py-5 flex justify-end bg-muted/20 rounded-b-2xl">
            <button
              type="button"
              className="rounded-full bg-primary px-8 py-2.5 text-sm font-semibold text-primary-foreground shadow hover:opacity-90 transition-opacity"
            >
              Submit
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          This is a preview. Responses are not saved.
        </p>
      </div>
    </div>
  );
}

// ── Form Build Tab ─────────────────────────────────────────────────────────────

function FormBuildTab() {
  const [forms, setForms] = useState<Form[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Form | null>(null);
  const [name, setName] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [status, setStatus] = useState('active');
  const [previewForm, setPreviewForm] = useState<Form | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [f, q] = await Promise.all([formsApi.getForms(), formsApi.getQuestions()]);
      setForms(f);
      setQuestions(q.filter((x: Question) => x.status === 'active'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setEditing(null);
    setName('');
    setSelectedIds([]);
    setStatus('active');
    setShowDialog(true);
  }

  function openEdit(f: Form) {
    setEditing(f);
    setName(f.name);
    setSelectedIds(f.formQuestions.map((fq) => fq.question.id));
    setStatus(f.status);
    setShowDialog(true);
  }

  async function save() {
    if (!name.trim()) return;
    if (editing) {
      await formsApi.updateForm(editing.id, { name, status, questionIds: selectedIds });
    } else {
      await formsApi.createForm({ name, status, questionIds: selectedIds });
    }
    setShowDialog(false);
    load();
  }

  function toggleQuestion(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  // Show inline preview instead of cards list
  if (previewForm) {
    return (
      <FormPreviewPage
        form={previewForm}
        onBack={() => setPreviewForm(null)}
        onEdit={() => { setPreviewForm(null); openEdit(previewForm); }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Build forms by combining questions into named survey sets.
        </p>
        <Button size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4 mr-1" /> New Form
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
      ) : forms.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No forms yet. Create your first form.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {forms.map((f) => (
            <div
              key={f.id}
              className="rounded-xl border bg-background overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Colour top strip */}
              <div className="h-2 bg-primary" />
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="font-semibold text-sm leading-tight">{f.name}</p>
                  <Badge variant={f.status === 'active' ? 'default' : 'outline'} className="shrink-0 text-[10px]">
                    {f.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  {f.formQuestions.length} question{f.formQuestions.length !== 1 ? 's' : ''}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewForm(f)}
                    className="flex-1 rounded-lg border border-primary text-primary text-xs font-semibold py-1.5 hover:bg-primary/5 transition-colors"
                  >
                    Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(f)}
                    className="flex-1 rounded-lg border border-border text-xs font-semibold py-1.5 hover:bg-muted/50 transition-colors"
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Form Dialog */}
      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        title={editing ? 'Edit Form' : 'New Form'}
        className="max-w-lg"
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          <div className="space-y-1">
            <Label>Form Name</Label>
            <Input
              placeholder="e.g. Post-Purchase Survey"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Status</Label>
            <Select
              options={STATUS_OPTIONS}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Questions ({selectedIds.length} selected)</Label>
            {questions.length === 0 ? (
              <p className="text-xs text-muted-foreground">No active questions found.</p>
            ) : (
              <div className="border rounded-md divide-y max-h-56 overflow-y-auto">
                {questions.map((q) => {
                  const checked = selectedIds.includes(q.id);
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => toggleQuestion(q.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                        checked ? 'bg-primary/5' : 'hover:bg-muted/50'
                      }`}
                    >
                      <CheckCircle2
                        className={`h-4 w-4 shrink-0 ${checked ? 'text-primary' : 'text-muted-foreground/30'}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm truncate">{q.text}</p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {TYPE_LABEL[q.questionType] ?? q.questionType}
                      </span>
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

function FormAssignTab() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [forms, setForms] = useState<Form[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeviceDialog, setShowDeviceDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [retailProStores, setRetailProStores] = useState<{ value: string | number; label: string }[]>([]);
  const [storesLoading, setStoresLoading] = useState(false);

  const [deviceForm, setDeviceForm] = useState({ name: '', deviceType: 'workstation', store: '' });
  const [assignFormId, setAssignFormId] = useState('');
  const [assignDeviceIds, setAssignDeviceIds] = useState<number[]>([]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [a, f, d] = await Promise.all([
        formsApi.getAssignments(),
        formsApi.getForms(),
        formsApi.getDevices(),
      ]);
      setAssignments(a);
      setForms(f.filter((x: Form) => x.status === 'active'));
      setDevices(d);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStores = useCallback(async () => {
    try {
      setStoresLoading(true);
      const stores = await configApi.getRetailProStores();
      setRetailProStores([
        { value: '', label: 'No store selected' },
        ...stores.map((s) => ({
          value: s.store_name,
          label: `${s.store_code ? s.store_code + ' — ' : ''}${s.store_name}`,
        })),
      ]);
    } catch {
      setRetailProStores([{ value: '', label: 'Could not load stores' }]);
    } finally {
      setStoresLoading(false);
    }
  }, []);

  useEffect(() => { load(); loadStores(); }, [load, loadStores]);

  async function saveDevice() {
    if (!deviceForm.name.trim()) return;
    await formsApi.createDevice({
      name: deviceForm.name,
      deviceType: deviceForm.deviceType,
      store: deviceForm.store || undefined,
    });
    setShowDeviceDialog(false);
    setDeviceForm({ name: '', deviceType: 'workstation', store: '' });
    load();
  }

  async function saveAssignment() {
    if (!assignFormId || assignDeviceIds.length === 0) return;
    await formsApi.assignForm({ formId: Number(assignFormId), deviceIds: assignDeviceIds });
    setShowAssignDialog(false);
    setAssignFormId('');
    setAssignDeviceIds([]);
    load();
  }

  async function removeAssignment(id: number) {
    if (!confirm('Remove this assignment?')) return;
    await formsApi.deleteAssignment(id);
    load();
  }

  function toggleDevice(id: number) {
    setAssignDeviceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  const formOptions = forms.map((f) => ({ value: f.id, label: f.name }));

  const grouped = assignments.reduce<Record<string, Assignment[]>>((acc, a) => {
    const key = a.form.name;
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Assign forms to devices so customers can fill surveys at point of sale.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowDeviceDialog(true)}>
            <MonitorSmartphone className="h-4 w-4 mr-1" /> Add Device
          </Button>
          <Button size="sm" onClick={() => { setAssignFormId(''); setAssignDeviceIds([]); setShowAssignDialog(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Assign Form
          </Button>
        </div>
      </div>

      {devices.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Registered Devices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {devices.map((d) => (
                <div
                  key={d.id}
                  className="border rounded-md px-3 py-2 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{d.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {DEVICE_TYPE_OPTIONS.find((t) => t.value === d.deviceType)?.label ?? d.deviceType}
                      {d.store ? ` · ${d.store}` : ''}
                    </p>
                  </div>
                  <Badge variant={d.isActive ? 'default' : 'outline'} className="shrink-0">
                    {d.isActive ? 'Active' : 'Off'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
      ) : assignments.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No assignments yet. Assign a form to a device.
        </p>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([formName, rows]) => (
            <Card key={formName}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{formName}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md divide-y">
                  {rows.map((a) => (
                    <div key={a.id} className="flex items-center justify-between px-3 py-2">
                      <div>
                        <p className="text-sm">{a.device.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {DEVICE_TYPE_OPTIONS.find((t) => t.value === a.device.deviceType)?.label ?? a.device.deviceType}
                          {a.device.store ? ` · ${a.device.store}` : ''}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeAssignment(a.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Device Dialog */}
      <Dialog
        open={showDeviceDialog}
        onClose={() => setShowDeviceDialog(false)}
        title="Add Device"
        className="max-w-sm"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Device Name</Label>
            <Input
              placeholder="e.g. Cashier 1"
              value={deviceForm.name}
              onChange={(e) => setDeviceForm({ ...deviceForm, name: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label>Type</Label>
            <Select
              options={DEVICE_TYPE_OPTIONS}
              value={deviceForm.deviceType}
              onChange={(e) => setDeviceForm({ ...deviceForm, deviceType: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label>
              Store{' '}
              <span className="text-muted-foreground text-xs">(from RetailPro)</span>
            </Label>
            {storesLoading ? (
              <p className="text-xs text-muted-foreground py-1">Loading stores…</p>
            ) : (
              <Select
                options={retailProStores.length > 1 ? retailProStores : [{ value: '', label: 'No stores found — check RETAILPRO_BASE_URL' }]}
                value={deviceForm.store}
                onChange={(e) => setDeviceForm({ ...deviceForm, store: e.target.value })}
              />
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowDeviceDialog(false)}>Cancel</Button>
            <Button onClick={saveDevice}>Add Device</Button>
          </div>
        </div>
      </Dialog>

      {/* Assign Form Dialog */}
      <Dialog
        open={showAssignDialog}
        onClose={() => setShowAssignDialog(false)}
        title="Assign Form to Devices"
        className="max-w-md"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Form</Label>
            <Select
              options={formOptions}
              placeholder="Select a form"
              value={assignFormId}
              onChange={(e) => setAssignFormId(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Devices ({assignDeviceIds.length} selected)</Label>
            {devices.length === 0 ? (
              <p className="text-xs text-muted-foreground">No devices registered yet.</p>
            ) : (
              <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
                {devices.map((d) => {
                  const checked = assignDeviceIds.includes(d.id);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => toggleDevice(d.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                        checked ? 'bg-primary/5' : 'hover:bg-muted/50'
                      }`}
                    >
                      <CheckCircle2
                        className={`h-4 w-4 shrink-0 ${checked ? 'text-primary' : 'text-muted-foreground/30'}`}
                      />
                      <div>
                        <p className="text-sm">{d.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {DEVICE_TYPE_OPTIONS.find((t) => t.value === d.deviceType)?.label ?? d.deviceType}
                          {d.store ? ` · ${d.store}` : ''}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>Cancel</Button>
            <Button onClick={saveAssignment} disabled={!assignFormId || assignDeviceIds.length === 0}>
              Assign
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function FormsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Form Management</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Create survey questions, build forms, and assign them to POS devices.
        </p>
      </div>

      <Tabs defaultValue="questions">
        <TabsList>
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="form-build">Form Build</TabsTrigger>
          <TabsTrigger value="form-assign">Form Assign</TabsTrigger>
        </TabsList>

        <TabsContent value="questions" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <QuestionsTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="form-build" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Form Build</CardTitle>
            </CardHeader>
            <CardContent>
              <FormBuildTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="form-assign" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Form Assign</CardTitle>
            </CardHeader>
            <CardContent>
              <FormAssignTab />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

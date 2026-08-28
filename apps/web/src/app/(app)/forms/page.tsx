'use client';

import { useEffect, useState, useCallback } from 'react';
import { formsApi } from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog } from '@/components/ui/dialog';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, GripVertical, MonitorSmartphone, CheckCircle2 } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Question {
  id: number;
  text: string;
  questionType: string;
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
  { value: 'textarea', label: 'Long Text' },
  { value: 'rating',   label: 'Rating (1-5)' },
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

// ── Questions Tab ─────────────────────────────────────────────────────────────

function QuestionsTab() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Question | null>(null);
  const [formState, setFormState] = useState({ text: '', questionType: 'text', status: 'active' });

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
    setFormState({ text: '', questionType: 'text', status: 'active' });
    setShowDialog(true);
  }

  function openEdit(q: Question) {
    setEditing(q);
    setFormState({ text: q.text, questionType: q.questionType, status: q.status });
    setShowDialog(true);
  }

  async function save() {
    if (!formState.text.trim()) return;
    if (editing) {
      await formsApi.updateQuestion(editing.id, formState);
    } else {
      await formsApi.createQuestion(formState);
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
                    {QUESTION_TYPE_OPTIONS.find((t) => t.value === q.questionType)?.label ?? q.questionType}
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
              onChange={(e) => setFormState({ ...formState, questionType: e.target.value })}
            />
          </div>
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
        <div className="grid gap-4 sm:grid-cols-2">
          {forms.map((f) => (
            <Card key={f.id} className="relative">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm">{f.name}</CardTitle>
                  <Badge variant={f.status === 'active' ? 'default' : 'outline'} className="shrink-0">
                    {f.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">
                  {f.formQuestions.length} question{f.formQuestions.length !== 1 ? 's' : ''}
                </p>
                <ol className="space-y-1 mb-4">
                  {f.formQuestions.map((fq) => (
                    <li key={fq.id} className="text-xs text-muted-foreground flex gap-2">
                      <span className="text-foreground/40">{fq.sortOrder + 1}.</span>
                      <span className="truncate">{fq.question.text}</span>
                    </li>
                  ))}
                </ol>
                <Button variant="outline" size="sm" className="w-full" onClick={() => openEdit(f)}>
                  Edit Form
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
                      <div className="min-w-0">
                        <p className="text-sm truncate">{q.text}</p>
                        <p className="text-xs text-muted-foreground">
                          {QUESTION_TYPE_OPTIONS.find((t) => t.value === q.questionType)?.label ?? q.questionType}
                        </p>
                      </div>
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

  useEffect(() => { load(); }, [load]);

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
            <Label>Store / Location <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input
              placeholder="e.g. Main Branch"
              value={deviceForm.store}
              onChange={(e) => setDeviceForm({ ...deviceForm, store: e.target.value })}
            />
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

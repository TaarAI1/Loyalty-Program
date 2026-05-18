'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { configApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import { TierBadge } from '@/components/ui/tier-badge';
import { Plus, Pencil, Trash2, Send, Save, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

// ── Tier Management ───────────────────────────────────────────────────────────

type TierForm = {
  id?: number;
  name: string;
  pointsFrom: string;
  pointsTo: string;
  spendFrom: string;
  spendTo: string;
  rewardPercentage: string;
  redeemValue: string;
};

const emptyTierForm: TierForm = {
  name: '',
  pointsFrom: '0',
  pointsTo: '',
  spendFrom: '0',
  spendTo: '',
  rewardPercentage: '4',
  redeemValue: '1',
};

function TiersTab() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<TierForm>(emptyTierForm);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: tiers, isLoading } = useQuery({
    queryKey: ['tiers'],
    queryFn: configApi.getTiers,
  });

  const upsertMutation = useMutation({
    mutationFn: () =>
      configApi.upsertTier({
        id: form.id,
        name: form.name,
        pointsFrom: Number(form.pointsFrom),
        pointsTo: form.pointsTo ? Number(form.pointsTo) : null,
        spendFrom: Number(form.spendFrom),
        spendTo: form.spendTo ? Number(form.spendTo) : null,
        rewardPercentage: Number(form.rewardPercentage),
        redeemValue: Number(form.redeemValue) || 1,
      }),
    onSuccess: () => {
      toast.success(form.id ? 'Tier updated' : 'Tier created');
      qc.invalidateQueries({ queryKey: ['tiers'] });
      setDialogOpen(false);
    },
    onError: (err) => toast.error(String(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => configApi.deleteTier(id),
    onSuccess: () => {
      toast.success('Tier deleted');
      qc.invalidateQueries({ queryKey: ['tiers'] });
      setDeleteId(null);
    },
    onError: (err) => toast.error(String(err)),
  });

  const openEdit = (tier: Record<string, unknown>) => {
    setForm({
      id: tier.id as number,
      name: String(tier.name),
      pointsFrom: String(tier.pointsFrom),
      pointsTo: tier.pointsTo != null ? String(tier.pointsTo) : '',
      spendFrom: String(tier.spendFrom),
      spendTo: tier.spendTo != null ? String(tier.spendTo) : '',
      rewardPercentage: String(tier.rewardPercentage),
      redeemValue: tier.redeemValue != null ? String(tier.redeemValue) : '1',
    });
    setDialogOpen(true);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">Manage loyalty tiers and reward percentages.</p>
        <Button
          size="sm"
          onClick={() => { setForm(emptyTierForm); setDialogOpen(true); }}
        >
          <Plus className="w-4 h-4" />
          Add Tier
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {(tiers ?? []).map(
            (tier: Record<string, unknown>) => (
              <Card key={tier.id as number} className="border-l-4" style={{ borderLeftColor: tierBorderColor(String(tier.name)) }}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-wrap">
                      <TierBadge name={String(tier.name)} />
                      <div className="text-sm flex items-center flex-wrap gap-x-1">
                        <span className="font-bold text-[#a07800]">{Number(tier.rewardPercentage)}% reward</span>
                        <span className="text-muted-foreground mx-1">·</span>
                        <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-xs border border-emerald-200">
                          1 pt = PKR {Number(tier.redeemValue ?? 1)}
                        </span>
                        <span className="text-muted-foreground mx-1">·</span>
                        <span className="text-muted-foreground">
                          {formatCurrency(Number(tier.spendFrom))} – {tier.spendTo ? formatCurrency(Number(tier.spendTo)) : '∞'}
                        </span>
                        <span className="text-muted-foreground mx-1">·</span>
                        <span className="text-muted-foreground">
                          {Number(tier.pointsFrom).toLocaleString()} – {tier.pointsTo ? Number(tier.pointsTo).toLocaleString() : '∞'} pts
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(tier)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(tier.id as number)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Reward percentage visual */}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Reward rate</span>
                      <span>{Number(tier.rewardPercentage)}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-indigo-500 h-2 rounded-full"
                        style={{ width: `${Math.min(100, (Number(tier.rewardPercentage) / 20) * 100)}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ),
          )}
        </div>
      )}

      {/* Upsert Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={form.id ? 'Edit Tier' : 'Add Tier'}
        className="max-w-md"
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label>Tier Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Classic"
              />
            </div>
            <div className="space-y-1">
              <Label>Points From</Label>
              <Input
                type="number"
                value={form.pointsFrom}
                onChange={(e) => setForm((f) => ({ ...f, pointsFrom: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Points To (blank = unlimited)</Label>
              <Input
                type="number"
                value={form.pointsTo}
                onChange={(e) => setForm((f) => ({ ...f, pointsTo: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Spend From (PKR)</Label>
              <Input
                type="number"
                value={form.spendFrom}
                onChange={(e) => setForm((f) => ({ ...f, spendFrom: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Spend To (blank = unlimited)</Label>
              <Input
                type="number"
                value={form.spendTo}
                onChange={(e) => setForm((f) => ({ ...f, spendTo: e.target.value }))}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Reward Percentage: {form.rewardPercentage}%</Label>
              <input
                type="range"
                min="1"
                max="20"
                step="0.5"
                value={form.rewardPercentage}
                onChange={(e) => setForm((f) => ({ ...f, rewardPercentage: e.target.value }))}
                className="w-full accent-[#FFD000]"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1%</span>
                <span>20%</span>
              </div>
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Point Redemption Value</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">1 point  =</span>
                <Input
                  type="number"
                  min="0.01"
                  step="0.5"
                  placeholder="e.g. 2"
                  value={form.redeemValue}
                  onChange={(e) => setForm((f) => ({ ...f, redeemValue: e.target.value }))}
                  className="w-28"
                />
                <span className="text-sm font-semibold text-muted-foreground whitespace-nowrap">PKR</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                How much cash value 1 point is worth when redeeming.
              </p>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              className="flex-1"
              loading={upsertMutation.isPending}
              onClick={() => upsertMutation.mutate()}
              disabled={!form.name}
            >
              <Save className="w-4 h-4" />
              {form.id ? 'Update Tier' : 'Create Tier'}
            </Button>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Delete Tier"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
            <p className="text-sm">Are you sure you want to delete this tier? This cannot be undone.</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              className="flex-1"
              loading={deleteMutation.isPending}
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Delete
            </Button>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

function tierBorderColor(name: string): string {
  switch (name.toLowerCase()) {
    case 'classic': return '#9ca3af';
    case 'silver': return '#94a3b8';
    case 'gold': return '#d97706';
    case 'platinum': return '#7c3aed';
    default: return '#6366f1';
  }
}

// ── WhatsApp Tab ──────────────────────────────────────────────────────────────

function WhatsAppTab() {
  const qc = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ['whatsapp-config'],
    queryFn: configApi.getWhatsApp,
  });

  const [form, setForm] = useState({
    accessToken: '',
    phoneNumberId: '',
    businessAccountId: '',
    templateExpiry: '',
    templateBirthday: '',
    templatePointsEarned: '',
    templateTierUpgrade: '',
    isActive: true,
  });

  const [testForm, setTestForm] = useState({ to: '', template_name: '' });

  const updateMutation = useMutation({
    mutationFn: () => {
      const updateData: Record<string, unknown> = Object.fromEntries(
        Object.entries(form as Record<string, unknown>).filter(([, v]) => v !== '')
      );
      return configApi.updateWhatsApp(updateData);
    },
    onSuccess: () => {
      toast.success('WhatsApp config saved');
      qc.invalidateQueries({ queryKey: ['whatsapp-config'] });
    },
    onError: (err) => toast.error(String(err)),
  });

  const testMutation = useMutation({
    mutationFn: () => configApi.testWhatsApp(testForm),
    onSuccess: () => toast.success('Test message queued successfully'),
    onError: (err) => toast.error(String(err)),
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  const displayConfig = config ?? {};

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Meta WhatsApp Cloud API Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Access Token</Label>
              <Input
                type="password"
                placeholder={displayConfig.accessToken ?? 'Enter access token...'}
                value={form.accessToken}
                onChange={(e) => setForm((f) => ({ ...f, accessToken: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Phone Number ID</Label>
              <Input
                placeholder={displayConfig.phoneNumberId ?? ''}
                value={form.phoneNumberId}
                onChange={(e) => setForm((f) => ({ ...f, phoneNumberId: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Business Account ID</Label>
              <Input
                placeholder={displayConfig.businessAccountId ?? ''}
                value={form.businessAccountId}
                onChange={(e) => setForm((f) => ({ ...f, businessAccountId: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-3">Message Templates</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { key: 'templatePointsEarned', label: 'Points Earned', current: displayConfig.templatePointsEarned },
                { key: 'templateTierUpgrade', label: 'Tier Upgrade', current: displayConfig.templateTierUpgrade },
                { key: 'templateExpiry', label: 'Points Expiry', current: displayConfig.templateExpiry },
                { key: 'templateBirthday', label: 'Birthday', current: displayConfig.templateBirthday },
              ].map(({ key, label, current }) => (
                <div key={key} className="space-y-1">
                  <Label>{label} Template</Label>
                  <Input
                    placeholder={current ?? `template_name`}
                    value={(form as unknown as Record<string, string>)[key] ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                className="w-4 h-4 accent-indigo-600"
              />
              Enable WhatsApp notifications
            </label>
          </div>

          <Button loading={updateMutation.isPending} onClick={() => updateMutation.mutate()}>
            <Save className="w-4 h-4" />
            Save Configuration
          </Button>
        </CardContent>
      </Card>

      {/* Test Send */}
      <Card>
        <CardHeader>
          <CardTitle>Send Test Message</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-1">
              <Label>Phone Number</Label>
              <Input
                placeholder="923319179220"
                value={testForm.to}
                onChange={(e) => setTestForm((f) => ({ ...f, to: e.target.value }))}
              />
            </div>
            <div className="flex-1 space-y-1">
              <Label>Template Name</Label>
              <Input
                placeholder="template_name"
                value={testForm.template_name}
                onChange={(e) => setTestForm((f) => ({ ...f, template_name: e.target.value }))}
              />
            </div>
            <Button
              loading={testMutation.isPending}
              disabled={!testForm.to || !testForm.template_name}
              onClick={() => testMutation.mutate()}
            >
              <Send className="w-4 h-4" />
              Send Test
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── SMS Tab ───────────────────────────────────────────────────────────────────

function SmsTab() {
  const qc = useQueryClient();
  const { data: config, isLoading } = useQuery({
    queryKey: ['sms-config'],
    queryFn: configApi.getSms,
  });

  const [form, setForm] = useState({
    accountSid: '',
    authToken: '',
    fromNumber: '',
    isActive: true,
  });

  const updateMutation = useMutation({
    mutationFn: () => configApi.updateSms(Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ''))),
    onSuccess: () => {
      toast.success('SMS config saved');
      qc.invalidateQueries({ queryKey: ['sms-config'] });
    },
    onError: (err) => toast.error(String(err)),
  });

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Twilio SMS Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Account SID</Label>
            <Input
              placeholder={config?.accountSid ?? 'ACxxxxxxxxxxxxxxx'}
              value={form.accountSid}
              onChange={(e) => setForm((f) => ({ ...f, accountSid: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Auth Token</Label>
            <Input
              type="password"
              placeholder={config?.authToken ?? 'Enter auth token...'}
              value={form.authToken}
              onChange={(e) => setForm((f) => ({ ...f, authToken: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>From Number</Label>
            <Input
              placeholder={config?.fromNumber ?? '+1234567890'}
              value={form.fromNumber}
              onChange={(e) => setForm((f) => ({ ...f, fromNumber: e.target.value }))}
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
            className="w-4 h-4 accent-indigo-600"
          />
          Enable SMS notifications
        </label>
        <Button loading={updateMutation.isPending} onClick={() => updateMutation.mutate()}>
          <Save className="w-4 h-4" />
          Save Configuration
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Email Tab ─────────────────────────────────────────────────────────────────

function EmailTab() {
  const qc = useQueryClient();
  const { data: config, isLoading } = useQuery({
    queryKey: ['email-config'],
    queryFn: configApi.getEmail,
  });

  const [form, setForm] = useState({
    apiKey: '',
    fromEmail: '',
    fromName: '',
    alertEmail: '',
    isActive: true,
  });

  const updateMutation = useMutation({
    mutationFn: () => configApi.updateEmail(Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ''))),
    onSuccess: () => {
      toast.success('Email config saved');
      qc.invalidateQueries({ queryKey: ['email-config'] });
    },
    onError: (err) => toast.error(String(err)),
  });

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>SendGrid Email Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>SendGrid API Key</Label>
            <Input
              type="password"
              placeholder={config?.apiKey ?? 'SG.xxxx'}
              value={form.apiKey}
              onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>From Email</Label>
            <Input
              type="email"
              placeholder={config?.fromEmail ?? 'loyalty@yourbrand.com'}
              value={form.fromEmail}
              onChange={(e) => setForm((f) => ({ ...f, fromEmail: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>From Name</Label>
            <Input
              placeholder={config?.fromName ?? 'Loyalty Program'}
              value={form.fromName}
              onChange={(e) => setForm((f) => ({ ...f, fromName: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Forensic Alert Email</Label>
            <Input
              type="email"
              placeholder={config?.alertEmail ?? 'security@yourbrand.com'}
              value={form.alertEmail}
              onChange={(e) => setForm((f) => ({ ...f, alertEmail: e.target.value }))}
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
            className="w-4 h-4 accent-indigo-600"
          />
          Enable email notifications
        </label>
        <Button loading={updateMutation.isPending} onClick={() => updateMutation.mutate()}>
          <Save className="w-4 h-4" />
          Save Configuration
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Points Rules Tab ──────────────────────────────────────────────────────────

type RuleForm = {
  id?: number;
  type: string;
  name: string;
  value: string;
  isActive: boolean;
  startDate: string;
  endDate: string;
};

const emptyRuleForm: RuleForm = {
  type: 'welcome_bonus',
  name: '',
  value: '',
  isActive: true,
  startDate: '',
  endDate: '',
};

const RULE_TYPES = [
  { value: 'welcome_bonus', label: 'Welcome Bonus (pts)' },
  { value: 'birthday_multiplier', label: 'Birthday Multiplier (×)' },
  { value: 'first_purchase_bonus', label: 'First Purchase Bonus (pts)' },
  { value: 'global_multiplier', label: 'Global Multiplier (×)' },
];

function PointsRulesTab() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<RuleForm>(emptyRuleForm);

  const { data: rules, isLoading } = useQuery({
    queryKey: ['points-rules'],
    queryFn: configApi.getPointsRules,
  });

  const upsertMutation = useMutation({
    mutationFn: () =>
      configApi.upsertPointsRule({
        id: form.id,
        type: form.type,
        name: form.name,
        value: Number(form.value),
        isActive: form.isActive,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
      }),
    onSuccess: () => {
      toast.success(form.id ? 'Rule updated' : 'Rule created');
      qc.invalidateQueries({ queryKey: ['points-rules'] });
      setDialogOpen(false);
    },
    onError: (err) => toast.error(String(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => configApi.deletePointsRule(id),
    onSuccess: () => {
      toast.success('Rule deleted');
      qc.invalidateQueries({ queryKey: ['points-rules'] });
    },
    onError: (err) => toast.error(String(err)),
  });

  const typeLabel = (type: string) => RULE_TYPES.find((t) => t.value === type)?.label ?? type;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Points Rules</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Configure bonus points awarded for welcome, birthdays, and first purchases.
              </p>
            </div>
            <Button size="sm" onClick={() => { setForm(emptyRuleForm); setDialogOpen(true); }}>
              <Plus className="w-4 h-4" /> Add Rule
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {isLoading ? (
            <div className="px-6 pb-5 space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-6 table-header text-[11px]">Name</th>
                  <th className="text-left py-3 px-3 table-header text-[11px]">Type</th>
                  <th className="text-right py-3 px-3 table-header text-[11px]">Value</th>
                  <th className="text-left py-3 px-3 table-header text-[11px]">Active From</th>
                  <th className="text-left py-3 px-3 table-header text-[11px]">Status</th>
                  <th className="py-3 px-6" />
                </tr>
              </thead>
              <tbody>
                {(rules ?? []).map((r: { id: number; type: string; name: string; value: number; isActive: boolean; startDate: string; endDate: string }) => (
                  <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/70">
                    <td className="py-3 px-6 font-medium">{r.name}</td>
                    <td className="py-3 px-3 text-slate-500 text-xs">{typeLabel(r.type)}</td>
                    <td className="py-3 px-3 text-right font-bold text-[#a07800]">
                      {r.type.includes('multiplier') ? `×${Number(r.value)}` : `+${Number(r.value)} pts`}
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-500">
                      {r.startDate ? r.startDate.slice(0, 10) : '—'}{r.endDate ? ` → ${r.endDate.slice(0, 10)}` : ''}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${r.isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                        {r.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-6">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" onClick={() => {
                          setForm({ id: r.id, type: r.type, name: r.name, value: String(r.value), isActive: r.isActive, startDate: r.startDate?.slice(0,10) ?? '', endDate: r.endDate?.slice(0,10) ?? '' });
                          setDialogOpen(true);
                        }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(r.id)}>
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title={form.id ? 'Edit Rule' : 'New Points Rule'}>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Rule Name</Label>
            <Input placeholder="e.g. Welcome Bonus" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Type</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            >
              {RULE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label>{form.type.includes('multiplier') ? 'Multiplier (e.g. 2 = double points)' : 'Bonus Points'}</Label>
            <Input type="number" min="0" step="0.5" placeholder="e.g. 500" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Start Date (optional)</Label>
              <Input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>End Date (optional)</Label>
              <Input type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4 accent-[#FFD000]" />
            Active
          </label>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" loading={upsertMutation.isPending} onClick={() => upsertMutation.mutate()} disabled={!form.name || !form.value}>
              {form.id ? 'Save Changes' : 'Create Rule'}
            </Button>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ConfigurationPage() {
  return (
    <Tabs defaultValue="tiers">
      <TabsList>
        <TabsTrigger value="tiers">Loyalty Tiers</TabsTrigger>
        <TabsTrigger value="rules">Points Rules</TabsTrigger>
        <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
        <TabsTrigger value="sms">SMS</TabsTrigger>
        <TabsTrigger value="email">Email</TabsTrigger>
      </TabsList>

      <TabsContent value="tiers">
        <TiersTab />
      </TabsContent>
      <TabsContent value="rules">
        <PointsRulesTab />
      </TabsContent>
      <TabsContent value="whatsapp">
        <WhatsAppTab />
      </TabsContent>
      <TabsContent value="sms">
        <SmsTab />
      </TabsContent>
      <TabsContent value="email">
        <EmailTab />
      </TabsContent>
    </Tabs>
  );
}

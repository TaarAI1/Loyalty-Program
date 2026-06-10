'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { configApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import { TierBadge } from '@/components/ui/tier-badge';
import { Plus, Pencil, Trash2, Send, Save, AlertCircle, Eye, EyeOff } from 'lucide-react';
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

  const PASS_SENTINEL = '••••••••';

  const [showPass, setShowPass] = useState(false);

  const [form, setForm] = useState({
    smtpHost: '',
    smtpPort: '',
    smtpUser: '',
    smtpPass: '',
    smtpSecure: 'tls',
    fromEmail: '',
    fromName: '',
    alertEmail: '',
    isActive: true,
  });

  useEffect(() => {
    if (config) {
      setForm((f) => ({
        ...f,
        smtpHost:   config.smtpHost   ?? '',
        smtpPort:   config.smtpPort   ? String(config.smtpPort) : '',
        smtpUser:   config.smtpUser   ?? '',
        smtpSecure: config.smtpSecure ?? 'tls',
        fromEmail:  config.fromEmail  ?? '',
        fromName:   config.fromName   ?? '',
        alertEmail: config.alertEmail ?? '',
        isActive:   config.isActive   ?? true,
        smtpPass:   config.smtpPass   ? PASS_SENTINEL : '',
      }));
    }
  }, [config]);

  const updateMutation = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {};
      if (form.smtpHost)   payload.smtpHost   = form.smtpHost;
      if (form.smtpPort)   payload.smtpPort   = Number(form.smtpPort);
      if (form.smtpUser)   payload.smtpUser   = form.smtpUser;
      if (form.smtpPass && form.smtpPass !== PASS_SENTINEL) payload.smtpPass = form.smtpPass;
      if (form.smtpSecure) payload.smtpSecure = form.smtpSecure;
      if (form.fromEmail)  payload.fromEmail  = form.fromEmail;
      if (form.fromName)   payload.fromName   = form.fromName;
      if (form.alertEmail) payload.alertEmail = form.alertEmail;
      payload.isActive = form.isActive;
      return configApi.updateEmail(payload);
    },
    onSuccess: () => {
      toast.success('Email config saved');
      qc.invalidateQueries({ queryKey: ['email-config'] });
    },
    onError: (err) => toast.error(String(err)),
  });

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  const c = config as Record<string, unknown> | null | undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle>SMTP Email Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* SMTP Server */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">SMTP Server</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-1">
              <Label>SMTP Host</Label>
              <Input
                placeholder={String(c?.smtpHost ?? 'smtp.gmail.com')}
                value={form.smtpHost}
                onChange={(e) => setForm((f) => ({ ...f, smtpHost: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Port</Label>
              <Input
                type="number"
                placeholder={String(c?.smtpPort ?? '587')}
                value={form.smtpPort}
                onChange={(e) => setForm((f) => ({ ...f, smtpPort: e.target.value }))}
              />
            </div>
          </div>
          <div className="mt-3 space-y-1">
            <Label>Encryption</Label>
            <select
              className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-brand"
              value={form.smtpSecure}
              onChange={(e) => setForm((f) => ({ ...f, smtpSecure: e.target.value }))}
            >
              <option value="tls">STARTTLS (port 587)</option>
              <option value="ssl">SSL / TLS (port 465)</option>
              <option value="none">None (port 25)</option>
            </select>
          </div>
        </div>

        {/* SMTP Credentials */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Credentials</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>SMTP Username</Label>
              <Input
                autoComplete="off"
                placeholder={String(c?.smtpUser ?? 'you@gmail.com')}
                value={form.smtpUser}
                onChange={(e) => setForm((f) => ({ ...f, smtpUser: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>SMTP Password</Label>
              <div className="relative">
                <Input
                  type={showPass ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Enter new SMTP password"
                  value={form.smtpPass}
                  onChange={(e) => {
                    const v = e.target.value;
                    const stripped = v.replace(/•/g, '');
                    setForm((f) => ({ ...f, smtpPass: stripped }));
                  }}
                  className="pr-10"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-slate-700"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {config?.smtpPass && (
                <p className="text-xs text-muted-foreground mt-1">
                  Password saved. Click the field to replace it.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Sender Identity */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Sender Identity</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>From Email</Label>
              <Input
                type="email"
                placeholder={String(c?.fromEmail ?? 'loyalty@yourbrand.com')}
                value={form.fromEmail}
                onChange={(e) => setForm((f) => ({ ...f, fromEmail: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>From Name</Label>
              <Input
                placeholder={String(c?.fromName ?? 'LoyaltyPlus')}
                value={form.fromName}
                onChange={(e) => setForm((f) => ({ ...f, fromName: e.target.value }))}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Forensic Alert Email</Label>
              <Input
                type="email"
                placeholder={String(c?.alertEmail ?? 'security@yourbrand.com')}
                value={form.alertEmail}
                onChange={(e) => setForm((f) => ({ ...f, alertEmail: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">Receives automated fraud / forensic alert emails.</p>
            </div>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
            className="w-4 h-4 accent-brand"
          />
          Enable email notifications
        </label>

        {/* Forensic Alert Email Preview */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Forensic Alert Email Preview
          </p>
          <div className="border rounded-lg overflow-hidden text-sm font-sans bg-[#f4f4f5]">
            {/* Banner */}
            <div className="bg-red-600 px-6 py-5 text-center">
              <p className="text-red-200 text-[11px] tracking-widest uppercase mb-1">LoyaltyPlus Forensic Monitor</p>
              <p className="text-white font-bold text-lg">🚨 Forensic Alert</p>
              <p className="text-red-200 text-xs mt-1">Suspicious Activity Detected</p>
            </div>
            {/* Body */}
            <div className="bg-white px-6 py-5 space-y-4">
              <p className="text-gray-800 text-sm">Dear Admin,</p>
              <p className="text-gray-600 text-sm leading-relaxed">
                Our automated forensic monitoring system has flagged a customer account for{' '}
                <strong>suspicious transaction activity</strong>. Please review the details below and take appropriate action immediately.
              </p>
              {/* Highlight Box */}
              <div className="bg-red-50 border-l-4 border-red-600 rounded px-4 py-3 text-red-900 text-sm leading-relaxed">
                Customer <strong>[Customer Name]</strong> (Mobile: <strong>[Mobile Number]</strong>) has recorded{' '}
                <strong>[Count] transactions</strong> within the last 3 days, which exceeds the allowed activity threshold.
              </div>
              {/* Details Table */}
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Activity Details</p>
              <table style={{ borderCollapse: 'collapse', width: '100%' }} className="text-xs">
                <tbody>
                  {[
                    ['Customer Name', '[Customer Name]'],
                    ['Mobile Number', '[Mobile Number]'],
                    ['Transaction Count (3 days)', '[Count]'],
                    ['Total Amount', '[Amount]'],
                    ['First Transaction', '[Date]'],
                    ['Last Transaction', '[Date]'],
                    ['Stores Visited', '[Store Names]'],
                  ].map(([label, value], i) => (
                    <tr key={label} style={{ background: i % 2 === 0 ? '#f9fafb' : '#ffffff' }}>
                      <td style={{ border: '1px solid #e5e7eb', padding: '8px 12px', fontWeight: 600, color: '#374151', width: '45%' }}>{label}</td>
                      <td style={{ border: '1px solid #e5e7eb', padding: '8px 12px', color: '#6b7280' }}>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Recommended Action */}
              <div className="bg-yellow-50 border border-yellow-300 rounded-md px-4 py-3 text-xs text-yellow-900 leading-relaxed">
                <p className="font-bold mb-1">⚠️ Recommended Action</p>
                <p>
                  We strongly recommend reviewing this account immediately. Consider{' '}
                  <strong>blocking the customer</strong> ([Customer Name]) until a full investigation is complete.
                  Customer status can be managed directly from the <strong>LoyaltyPlus admin panel</strong> under the Customers section.
                </p>
              </div>
              <p className="text-sm text-gray-700">
                Regards,<br />
                <strong>LoyaltyPlus Forensic Monitor</strong>
              </p>
            </div>
            {/* Footer */}
            <div className="bg-gray-50 border-t border-gray-200 px-6 py-3 text-center">
              <p className="text-[11px] text-gray-400">
                This is an automated alert. Do not reply to this email.
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Sent automatically when a customer exceeds 5 transactions in 3 days. Customer name and mobile number are filled dynamically from the database.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button loading={updateMutation.isPending} onClick={() => updateMutation.mutate()}>
            <Save className="w-4 h-4" />
            Save Configuration
          </Button>
          <TestEmailButton />
          <ForensicTriggerButton />
        </div>
      </CardContent>
    </Card>
  );
}

function TestEmailButton() {
  const mutation = useMutation({
    mutationFn: configApi.testEmail,
    onSuccess: (data: { sentTo: string }) =>
      toast.success(`Test email sent to ${data.sentTo}`),
    onError: (err) => toast.error(String(err)),
  });
  return (
    <Button variant="outline" loading={mutation.isPending} onClick={() => mutation.mutate()}>
      <Send className="w-4 h-4" />
      Send Test Email
    </Button>
  );
}

function ForensicTriggerButton() {
  const mutation = useMutation({
    mutationFn: configApi.triggerForensicAlert,
    onSuccess: (data: { suspects: number; alertsSent: number; skipped?: number; reason?: string }) => {
      if (data.suspects === 0) {
        toast.success('No suspicious activity found in the last 3 days.');
      } else if (data.alertsSent === 0) {
        toast.success(
          data.reason
            ? `${data.suspects} suspect(s) found — ${data.reason}`
            : `${data.suspects} suspect(s) found — all already alerted in last 24h.`,
        );
      } else {
        toast.success(`${data.suspects} suspect(s) found — ${data.alertsSent} alert email(s) queued.`);
      }
    },
    onError: (err) => toast.error(String(err)),
  });
  return (
    <Button variant="outline" loading={mutation.isPending} onClick={() => mutation.mutate()}>
      <AlertCircle className="w-4 h-4" />
      Run Forensic Check Now
    </Button>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ConfigurationPage() {
  return (
    <Tabs defaultValue="tiers">
      <TabsList>
        <TabsTrigger value="tiers">Loyalty Tiers</TabsTrigger>
        <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
        <TabsTrigger value="sms">SMS</TabsTrigger>
        <TabsTrigger value="email">Email</TabsTrigger>
      </TabsList>

      <TabsContent value="tiers">
        <TiersTab />
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

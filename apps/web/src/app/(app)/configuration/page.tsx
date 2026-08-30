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
import { Plus, Pencil, Trash2, Send, Save, AlertCircle, Wifi } from 'lucide-react';
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

  const { data: emailConfig } = useQuery({
    queryKey: ['email-config'],
    queryFn: configApi.getEmail,
  });

  const [earningBase, setEarningBase] = useState('net_amount');
  const [enrollDiscountPct, setEnrollDiscountPct] = useState(0);

  useEffect(() => {
    if (emailConfig) {
      const c = emailConfig as Record<string, unknown>;
      setEarningBase(c.pointsEarningBase as string ?? 'net_amount');
      setEnrollDiscountPct(Number(c.enrollmentDiscountPct ?? 0));
    }
  }, [emailConfig]);

  const loyaltySettingsMutation = useMutation({
    mutationFn: () => configApi.updateEmail({
      pointsEarningBase:    earningBase,
      enrollmentDiscountPct: enrollDiscountPct,
    }),
    onSuccess: () => {
      toast.success('Loyalty settings saved');
      qc.invalidateQueries({ queryKey: ['email-config'] });
    },
    onError: (err) => toast.error(String(err)),
  });

  return (
    <>
      <Card className="mb-4">
        <CardContent className="p-4 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <Label className="text-sm font-medium">Points Earning Base</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Choose which transaction amount is used to calculate loyalty points.</p>
            </div>
            <select
              className="border rounded-md px-3 py-1.5 text-sm bg-background"
              value={earningBase}
              onChange={(e) => setEarningBase(e.target.value)}
            >
              <option value="sale_amount">Sale Amount (base price)</option>
              <option value="gross_amount">With Tax (total incl. tax)</option>
              <option value="net_amount">Without Tax (excl. tax)</option>
            </select>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <Label className="text-sm font-medium">Enrollment Discount</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Give new customers bonus points on their first purchase. Set to 0 to disable.</p>
            </div>
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                min={0}
                max={100}
                className="w-20 h-8 text-sm"
                value={enrollDiscountPct}
                onChange={(e) => setEnrollDiscountPct(Math.min(100, Math.max(0, Number(e.target.value))))}
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => loyaltySettingsMutation.mutate()}
              disabled={loyaltySettingsMutation.isPending}
            >
              <Save className="w-4 h-4 mr-1" />
              Save
            </Button>
          </div>
        </CardContent>
      </Card>

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
    apiUrl: '',
    apiKey: '',
    csrfToken: '',
    templateExpiry: '',
    templateBirthday: '',
    templatePointsEarned: '',
    templateTierUpgrade: '',
    templateOtp: '',
    templateOtpRedemption: '',
    isActive: true,
  });

  useEffect(() => {
    if (!config) return;
    const c = config as Record<string, unknown>;
    setForm({
      apiUrl:               (c.apiUrl               as string)  ?? '',
      apiKey:               (c.apiKey               as string)  ?? '',
      csrfToken:            (c.csrfToken            as string)  ?? '',
      templateExpiry:       (c.templateExpiry        as string)  ?? '',
      templateBirthday:     (c.templateBirthday      as string)  ?? '',
      templatePointsEarned: (c.templatePointsEarned  as string)  ?? '',
      templateTierUpgrade:  (c.templateTierUpgrade   as string)  ?? '',
      templateOtp:          (c.templateOtp           as string)  ?? '',
      templateOtpRedemption: (c.templateOtpRedemption as string)  ?? '',
      isActive:             (c.isActive              as boolean) ?? true,
    });
  }, [config]);

  const [varsModalOpen, setVarsModalOpen] = useState(false);
  const [activeVarsTab, setActiveVarsTab] = useState<'birthday' | 'registration' | 'transaction'>('birthday');
  const [birthdayVars, setBirthdayVars] = useState({ order_number: '', dispatched_order: '' });
  const [regVars, setRegVars] = useState({ order_no_1: '', dispatched_order1: '' });
  const [testForm, setTestForm] = useState({ to: '', template_name: '' });

  const updateMutation = useMutation({
    mutationFn: () => {
      const updateData: Record<string, unknown> = {
        apiUrl: form.apiUrl || undefined,
        templateExpiry: form.templateExpiry || undefined,
        templateBirthday: form.templateBirthday || undefined,
        templatePointsEarned: form.templatePointsEarned || undefined,
        templateTierUpgrade: form.templateTierUpgrade || undefined,
        templateOtp: form.templateOtp || undefined,
        templateOtpRedemption: form.templateOtpRedemption || undefined,
        isActive: form.isActive,
      };
      // Only send secrets if the user typed a new value
      if (form.apiKey) updateData['apiKey'] = form.apiKey;
      if (form.csrfToken) updateData['csrfToken'] = form.csrfToken;
      return configApi.updateWhatsApp(updateData);
    },
    onSuccess: () => {
      toast.success('WhatsApp config saved');
      qc.invalidateQueries({ queryKey: ['whatsapp-config'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const testMutation = useMutation({
    mutationFn: () => configApi.testWhatsApp(testForm),
    onSuccess: () => toast.success('Test message queued successfully'),
    onError: (err) => toast.error(String(err)),
  });

  const saveVarsMutation = useMutation({
    mutationFn: () => {
      if (activeVarsTab === 'birthday') {
        return configApi.updateWhatsApp({
          birthdayVarOrder:     birthdayVars.order_number    || undefined,
          birthdayVarDispatched: birthdayVars.dispatched_order || undefined,
        });
      } else {
        return configApi.updateWhatsApp({
          regVarOrderNo1:    regVars.order_no_1        || undefined,
          regVarDispatched1: regVars.dispatched_order1 || undefined,
        });
      }
    },
    onSuccess: () => {
      toast.success(`${activeVarsTab === 'birthday' ? 'Birthday' : 'Registration'} variables saved`);
      qc.invalidateQueries({ queryKey: ['whatsapp-config'] });
      setVarsModalOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  const displayConfig = config ?? {};

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>WhatsApp API Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* API URL */}
          <div className="space-y-1">
            <Label>WhatsApp API URL</Label>
            <Input
              placeholder={(displayConfig as Record<string, string>).apiUrl ?? 'https://...'}
              value={form.apiUrl}
              onChange={(e) => setForm((f) => ({ ...f, apiUrl: e.target.value }))}
            />
          </div>

          {/* Accept header — hardcoded, read-only */}
          <div className="space-y-1">
            <Label>Header</Label>
            <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md border border-border">
              <AlertCircle className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <code className="text-xs text-muted-foreground">accept: application/json</code>
              <span className="ml-auto text-[11px] text-muted-foreground">(hardcoded)</span>
            </div>
          </div>

          {/* X-Api-Key + X-CSRFTOKEN */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>X-Api-Key</Label>
              <Input
                placeholder="Enter API key..."
                value={form.apiKey}
                onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>X-CSRFTOKEN</Label>
              <Input
                placeholder="Enter CSRF token..."
                value={form.csrfToken}
                onChange={(e) => setForm((f) => ({ ...f, csrfToken: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-3">Message Templates</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { key: 'templatePointsEarned', label: 'Registration', current: displayConfig.templatePointsEarned },
                { key: 'templateTierUpgrade', label: 'Transaction', current: displayConfig.templateTierUpgrade },
                { key: 'templateOtp', label: 'OTP Verification', current: displayConfig.templateOtp },
                { key: 'templateBirthday', label: 'Birthday', current: displayConfig.templateBirthday },
                { key: 'templateOtpRedemption', label: 'Points Redemption OTP', current: displayConfig.templateOtpRedemption },
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

          <div className="flex flex-wrap gap-3 items-center">
            <Button loading={updateMutation.isPending} onClick={() => updateMutation.mutate()}>
              <Save className="w-4 h-4" />
              Save Configuration
            </Button>
            <button
              type="button"
              onClick={() => {
                const dc = displayConfig as Record<string, string>;
                setBirthdayVars({
                  order_number:     dc.birthdayVarOrder      ?? '',
                  dispatched_order: dc.birthdayVarDispatched ?? '',
                });
                setRegVars({
                  order_no_1:       dc.regVarOrderNo1    ?? '',
                  dispatched_order1: dc.regVarDispatched1 ?? '',
                });
                setActiveVarsTab('birthday');
                setVarsModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-md transition-colors"
            >
              Select Template Variables
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Template Variables Modal */}
      <Dialog open={varsModalOpen} onClose={() => setVarsModalOpen(false)} title="Template Variables">
        <div className="space-y-4">
          {/* Tab headers */}
          <div className="flex gap-0 border-b">
            {(['birthday', 'registration', 'transaction'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveVarsTab(tab)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px
                  ${activeVarsTab === tab
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                {tab === 'birthday' ? 'Birthday' : tab === 'registration' ? 'Registration Message' : 'Transaction'}
              </button>
            ))}
          </div>

          {/* Birthday fields */}
          {activeVarsTab === 'birthday' && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="var-order-number">order_number</Label>
                <Input
                  id="var-order-number"
                  placeholder="e.g. Birthday! Celebrate your special day with LOGO with Flat 40% off!"
                  value={birthdayVars.order_number}
                  onChange={(e) => setBirthdayVars((v) => ({ ...v, order_number: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="var-dispatched-order">dispatched_order</Label>
                <Input
                  id="var-dispatched-order"
                  placeholder="e.g. wish you a great year ahead"
                  value={birthdayVars.dispatched_order}
                  onChange={(e) => setBirthdayVars((v) => ({ ...v, dispatched_order: e.target.value }))}
                />
              </div>
            </div>
          )}

          {/* Registration fields */}
          {activeVarsTab === 'registration' && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="var-order-no-1">order_no_1</Label>
                <Input
                  id="var-order-no-1"
                  placeholder="e.g. enrolling in"
                  value={regVars.order_no_1}
                  onChange={(e) => setRegVars((v) => ({ ...v, order_no_1: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="var-dispatched-order1">dispatched_order1</Label>
                <Input
                  id="var-dispatched-order1"
                  placeholder="e.g. value loyalty and will reward"
                  value={regVars.dispatched_order1}
                  onChange={(e) => setRegVars((v) => ({ ...v, dispatched_order1: e.target.value }))}
                />
              </div>
            </div>
          )}

          {/* Transaction fields — read-only, values are dynamic per transaction */}
          {activeVarsTab === 'transaction' && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                These variables are filled automatically from each transaction.
              </p>
              {[
                { key: 'sms_invoice',       desc: 'Receipt / invoice number' },
                { key: 'sms_no',            desc: 'Transaction ID' },
                { key: 'remaining_balance', desc: 'Customer remaining points' },
              ].map(({ key, desc }) => (
                <div key={key} className="flex items-center gap-3 rounded-md border bg-muted/40 px-3 py-2">
                  <code className="text-xs text-indigo-600 w-40 shrink-0">{key}</code>
                  <span className="text-sm text-muted-foreground">{desc}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            {activeVarsTab !== 'transaction' && (
              <Button
                className="flex-1"
                loading={saveVarsMutation.isPending}
                onClick={() => saveVarsMutation.mutate()}
              >
                Save
              </Button>
            )}
            <Button variant="outline" className="flex-1" onClick={() => setVarsModalOpen(false)}>
              {activeVarsTab === 'transaction' ? 'Close' : 'Cancel'}
            </Button>
          </div>
        </div>
      </Dialog>

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

const PASS_SAVED = '__SAVED__';

function EmailTab() {
  const qc = useQueryClient();
  const { data: config, isLoading } = useQuery({
    queryKey: ['email-config'],
    queryFn: configApi.getEmail,
  });

  const [form, setForm] = useState({
    smtpHost: '',
    smtpPort: '',
    smtpUser: '',
    smtpPass: '',
    smtpSecure: 'tls',
    fromEmail: '',
    fromName: '',
    alertEmail: '',
    emailBody: '',
    expiryEmailBody: '',
    expiryWindowValue: '365',
    expiryWindowUnit: 'days',
    isActive: true,
  });

  useEffect(() => {
    if (config) {
      setForm((f) => ({
        ...f,
        smtpHost:          config.smtpHost          ?? '',
        smtpPort:          config.smtpPort          ? String(config.smtpPort) : '',
        smtpUser:          config.smtpUser          ?? '',
        smtpSecure:        config.smtpSecure        ?? 'tls',
        fromEmail:         config.fromEmail         ?? '',
        fromName:          config.fromName          ?? '',
        alertEmail:        config.alertEmail        ?? '',
        emailBody:         config.emailBody         ?? '',
        expiryEmailBody:   config.expiryEmailBody   ?? '',
        expiryWindowValue: config.expiryWindowValue ? String(config.expiryWindowValue) : '365',
        expiryWindowUnit:  config.expiryWindowUnit  ?? 'days',
        isActive:          config.isActive          ?? true,
        smtpPass:          config.smtpPass          ? PASS_SAVED : '',
      }));
    }
  }, [config]);

  const updateMutation = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {};
      if (form.smtpHost)   payload.smtpHost   = form.smtpHost;
      if (form.smtpPort)   payload.smtpPort   = Number(form.smtpPort);
      if (form.smtpUser)   payload.smtpUser   = form.smtpUser;
      if (form.smtpPass && form.smtpPass !== PASS_SAVED) payload.smtpPass = form.smtpPass;
      if (form.smtpSecure) payload.smtpSecure = form.smtpSecure;
      if (form.fromEmail)  payload.fromEmail  = form.fromEmail;
      if (form.fromName)   payload.fromName   = form.fromName;
      if (form.alertEmail)  payload.alertEmail  = form.alertEmail;
      payload.emailBody         = form.emailBody;
      payload.expiryEmailBody   = form.expiryEmailBody;
      payload.expiryWindowValue = form.expiryWindowValue ? Number(form.expiryWindowValue) : 365;
      payload.expiryWindowUnit  = form.expiryWindowUnit;
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
              <Input
                type="text"
                autoComplete="off"
                placeholder="Enter SMTP password"
                value={form.smtpPass === PASS_SAVED ? '●●●●●●●●●●●●' : form.smtpPass}
                onFocus={() => {
                  if (form.smtpPass === PASS_SAVED) setForm((f) => ({ ...f, smtpPass: '' }));
                }}
                onChange={(e) => setForm((f) => ({ ...f, smtpPass: e.target.value }))}
              />
              {form.smtpPass === PASS_SAVED && (
                <p className="text-xs text-green-600">Password saved. Click the field to enter a new one.</p>
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
          </div>
        </div>

        {/* Forensic Alert Email — recipient + body together */}
        <div className="rounded-lg border border-border p-4 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Forensic Alert Email</p>
          <div className="space-y-1">
            <Label>Recipient Address</Label>
            <Input
              type="email"
              placeholder={String(c?.alertEmail ?? 'security@yourbrand.com')}
              value={form.alertEmail}
              onChange={(e) => setForm((f) => ({ ...f, alertEmail: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">Receives automated fraud / forensic alert emails.</p>
          </div>
          <div className="space-y-1">
            <Label>Email Body</Label>
            <textarea
              className="w-full min-h-[100px] resize-y rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Enter the body text for forensic alert emails. Leave blank to use the default message."
              value={form.emailBody}
              onChange={(e) => setForm((f) => ({ ...f, emailBody: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              Supports plain text. Available variables: <code className="text-indigo-600">{'{customername}'}</code>,{' '}
              <code className="text-indigo-600">{'{phoneno}'}</code>,{' '}
              <code className="text-indigo-600">{'{date}'}</code>.
            </p>
          </div>
        </div>

        {/* Points Expiry Email — body template only; recipient is the customer's own email */}
        <div className="rounded-lg border border-border p-4 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Points Expiry Email</p>
            <p className="text-xs text-muted-foreground mt-1">Sent automatically to each customer when their points expire. Recipient is the customer&apos;s own email address.</p>
          </div>
          <div className="space-y-1">
            <Label>Email Body</Label>
            <textarea
              className="w-full min-h-[100px] resize-y rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Dear {customername}, your {points} loyalty points expired on {expiry_date}. Keep shopping with us to earn new points."
              value={form.expiryEmailBody}
              onChange={(e) => setForm((f) => ({ ...f, expiryEmailBody: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to use the default message. Available variables:{' '}
              <code className="text-indigo-600">{'{customername}'}</code>,{' '}
              <code className="text-indigo-600">{'{points}'}</code>,{' '}
              <code className="text-indigo-600">{'{expiry_date}'}</code>.
            </p>
          </div>
        </div>

        {/* Points Expiry Window — configurable duration */}
        <div className="rounded-lg border border-border p-4 space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Points Expiry Window</p>
            <p className="text-xs text-muted-foreground mt-1">
              Points earned on a transaction will expire after this duration. The worker checks every 5 minutes and deducts expired points automatically.
            </p>
          </div>
          <div className="flex items-end gap-3">
            <div className="space-y-1 w-36">
              <Label>Duration</Label>
              <Input
                type="number"
                min="1"
                step="1"
                placeholder="365"
                value={form.expiryWindowValue}
                onChange={(e) => setForm((f) => ({ ...f, expiryWindowValue: e.target.value }))}
              />
            </div>
            <div className="space-y-1 flex-1">
              <Label>Unit</Label>
              <select
                className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                value={form.expiryWindowUnit}
                onChange={(e) => setForm((f) => ({ ...f, expiryWindowUnit: e.target.value }))}
              >
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
              </select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Example: set <strong>5 Minutes</strong> for testing, then change to <strong>365 Days</strong> for production.
          </p>
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

        <div className="flex flex-wrap gap-3">
          <Button loading={updateMutation.isPending} onClick={() => updateMutation.mutate()}>
            <Save className="w-4 h-4" />
            Save Configuration
          </Button>
          <TestSmtpButton />
          <TestEmailButton alertEmail={form.alertEmail} fromEmail={form.fromEmail} />
        </div>
      </CardContent>
    </Card>
  );
}

function TestEmailButton({ alertEmail, fromEmail }: { alertEmail: string; fromEmail: string }) {
  const mutation = useMutation({
    mutationFn: () => configApi.testEmail(alertEmail || fromEmail || undefined),
    onSuccess: (data: { sentTo: string }) =>
      toast.success(`Test email sent to ${data.sentTo}`),
    onError: (err: Error) => toast.error(err.message),
  });
  return (
    <Button variant="outline" loading={mutation.isPending} onClick={() => mutation.mutate()}>
      <Send className="w-4 h-4" />
      Send Test Email
    </Button>
  );
}

function TestSmtpButton() {
  const mutation = useMutation({
    mutationFn: () => configApi.verifySmtp(),
    onSuccess: (data: { message: string }) =>
      toast.success(data.message),
    onError: (err: Error) => toast.error(err.message),
  });
  return (
    <Button variant="outline" loading={mutation.isPending} onClick={() => mutation.mutate()}>
      <Wifi className="w-4 h-4" />
      Test SMTP Connection
    </Button>
  );
}

// ── Oracle DB Tab ─────────────────────────────────────────────────────────────

function OracleTab() {
  const [form, setForm] = useState({ host: '', port: 1521, dbUser: '', password: '', service: '', subsidiarySid: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    configApi.getOracleConfig().then((data) => {
      setForm({
        host:          data.host          ?? '',
        port:          data.port          ?? 1521,
        dbUser:        data.dbUser        ?? '',
        password:      '',
        service:       data.service       ?? '',
        subsidiarySid: data.subsidiarySid ?? '',
      });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await configApi.saveOracleConfig({
        host:          form.host,
        port:          form.port,
        dbUser:        form.dbUser,
        password:      form.password || undefined,
        service:       form.service,
        subsidiarySid: form.subsidiarySid || undefined,
      });
      toast.success('Oracle configuration saved and connection pool updated.');
      setForm((f) => ({ ...f, password: '' }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save Oracle configuration.');
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    if (!form.password) {
      toast.error('Enter the password to test the connection.');
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const result = await configApi.testOracleConnection({
        host:    form.host,
        port:    form.port,
        dbUser:  form.dbUser,
        password: form.password,
        service: form.service,
      });
      setTestResult(result);
    } catch (err) {
      setTestResult({ success: false, message: err instanceof Error ? err.message : 'Test failed.' });
    } finally {
      setTesting(false);
    }
  }

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6 mt-4">
      <Card>
        <CardHeader>
          <CardTitle>Oracle Database Connection</CardTitle>
          <p className="text-sm text-muted-foreground">Configure the Oracle DB connection used to fetch store data. Leave password blank to keep the existing saved password.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Host</Label>
              <Input placeholder="e.g. 192.168.1.100" value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Port</Label>
              <Input type="number" placeholder="1521" value={form.port} onChange={(e) => setForm({ ...form, port: parseInt(e.target.value) || 1521 })} />
            </div>
            <div className="space-y-1.5">
              <Label>Username</Label>
              <Input placeholder="e.g. reportuser" value={form.dbUser} onChange={(e) => setForm({ ...form, dbUser: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input type="password" placeholder="Enter password (leave blank to keep saved)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Service Name</Label>
              <Input placeholder="e.g. ORCL or RPROODS" value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Subsidiary SID</Label>
              <Input placeholder="e.g. 745052947000102257" value={form.subsidiarySid} onChange={(e) => setForm({ ...form, subsidiarySid: e.target.value })} />
              <p className="text-xs text-muted-foreground">Used to filter stores: WHERE SBS_SID = this value</p>
            </div>
          </div>

          {testResult && (
            <div className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${testResult.success ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{testResult.message}</span>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <Button variant="outline" onClick={handleTest} disabled={testing || !form.host || !form.dbUser || !form.service}>
              <Wifi className="w-4 h-4" />
              {testing ? 'Testing…' : 'Test Connection'}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4" />
              {saving ? 'Saving…' : 'Save Configuration'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
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
        <TabsTrigger value="oracle">Oracle DB</TabsTrigger>
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
      <TabsContent value="oracle">
        <OracleTab />
      </TabsContent>
    </Tabs>
  );
}

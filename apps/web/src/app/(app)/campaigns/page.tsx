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
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/utils';
import { Plus, Pencil, Trash2, Zap, Calendar, Target } from 'lucide-react';
import { toast } from 'sonner';

type CampaignForm = {
  id?: number;
  name: string;
  description: string;
  multiplier: string;
  startDate: string;
  endDate: string;
  targetTierId: string;
  isActive: boolean;
};

const emptyCampaignForm: CampaignForm = {
  name: '',
  description: '',
  multiplier: '2',
  startDate: '',
  endDate: '',
  targetTierId: '',
  isActive: true,
};

export default function CampaignsPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<CampaignForm>(emptyCampaignForm);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: configApi.getCampaigns,
    refetchInterval: 60000,
  });

  const { data: tiers } = useQuery({
    queryKey: ['tiers'],
    queryFn: configApi.getTiers,
  });

  const upsertMutation = useMutation({
    mutationFn: () => {
      const data = {
        name: form.name,
        description: form.description || undefined,
        multiplier: Number(form.multiplier),
        startDate: form.startDate,
        endDate: form.endDate,
        targetTierId: form.targetTierId ? Number(form.targetTierId) : null,
        isActive: form.isActive,
      };
      if (form.id) return configApi.updateCampaign(form.id, data);
      return configApi.createCampaign(data);
    },
    onSuccess: () => {
      toast.success(form.id ? 'Campaign updated' : 'Campaign created');
      qc.invalidateQueries({ queryKey: ['campaigns'] });
      setDialogOpen(false);
    },
    onError: (err) => toast.error(String(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => configApi.deleteCampaign(id),
    onSuccess: () => {
      toast.success('Campaign deleted');
      qc.invalidateQueries({ queryKey: ['campaigns'] });
      setDeleteId(null);
    },
    onError: (err) => toast.error(String(err)),
  });

  const now = new Date();
  const isActive = (c: { isActive: boolean; startDate: string; endDate: string }) => {
    if (!c.isActive) return false;
    const start = new Date(c.startDate);
    const end = new Date(c.endDate);
    return start <= now && now <= end;
  };

  const statusLabel = (c: { isActive: boolean; startDate: string; endDate: string }) => {
    if (!c.isActive) return 'Disabled';
    const start = new Date(c.startDate);
    const end = new Date(c.endDate);
    if (now < start) return 'Upcoming';
    if (now > end) return 'Ended';
    return 'Live';
  };

  const statusStyle = (s: string) => {
    if (s === 'Live') return 'bg-green-50 text-green-700 border-green-200';
    if (s === 'Upcoming') return 'bg-blue-50 text-blue-700 border-blue-200';
    if (s === 'Ended') return 'bg-slate-50 text-slate-500 border-slate-200';
    return 'bg-red-50 text-red-600 border-red-200';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#111]">Bonus Campaigns</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create time-limited multiplier campaigns to boost customer engagement.
          </p>
        </div>
        <Button onClick={() => { setForm(emptyCampaignForm); setDialogOpen(true); }}>
          <Plus className="w-4 h-4" /> New Campaign
        </Button>
      </div>

      {/* Stats bar */}
      {campaigns && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Live Campaigns', value: campaigns.filter((c: { isActive: boolean; startDate: string; endDate: string }) => isActive(c)).length, color: 'bg-[#fffde8] text-[#a07800] border-[#FFD000]/30', icon: Zap },
            { label: 'Upcoming', value: campaigns.filter((c: { isActive: boolean; startDate: string; endDate: string }) => c.isActive && new Date(c.startDate) > now).length, color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Calendar },
            { label: 'Total Campaigns', value: campaigns.length, color: 'bg-white text-slate-700 border-slate-200', icon: Target },
          ].map((stat) => (
            <Card key={stat.label} className={`border ${stat.color}`}>
              <CardContent className="p-4 flex items-center gap-3">
                <stat.icon className="w-5 h-5 opacity-70" />
                <div>
                  <p className="text-2xl font-black">{stat.value}</p>
                  <p className="text-xs font-medium opacity-70">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Campaign cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
        </div>
      ) : campaigns?.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Zap className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="font-semibold">No campaigns yet</p>
            <p className="text-sm mt-1">Create your first bonus campaign to drive customer engagement.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {campaigns.map((c: {
            id: number;
            name: string;
            description: string;
            multiplier: number;
            startDate: string;
            endDate: string;
            isActive: boolean;
            targetTier: { id: number; name: string } | null;
          }) => {
            const status = statusLabel(c);
            return (
              <Card key={c.id} className={`overflow-hidden transition-all hover:shadow-md ${isActive(c) ? 'border-[#FFD000]/60' : ''}`}>
                {isActive(c) && <div className="h-1 w-full bg-[#FFD000]" />}
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-black text-[#111] text-base leading-tight">{c.name}</h3>
                      {c.description && <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>}
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ml-2 shrink-0 ${statusStyle(status)}`}>{status}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="bg-[#fffde8] border border-[#FFD000]/30 rounded-lg px-3 py-2 text-center">
                      <p className="text-2xl font-black text-[#a07800]">×{Number(c.multiplier)}</p>
                      <p className="text-[10px] text-[#a07800] font-medium">Multiplier</p>
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground flex-1">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(c.startDate)} – {formatDate(c.endDate)}</span>
                      </div>
                      {c.targetTier && (
                        <div className="flex items-center gap-1.5">
                          <Target className="w-3 h-3" />
                          <span>{c.targetTier.name} tier only</span>
                        </div>
                      )}
                      {!c.targetTier && (
                        <div className="flex items-center gap-1.5">
                          <Target className="w-3 h-3" />
                          <span>All tiers</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setForm({
                          id: c.id,
                          name: c.name,
                          description: c.description ?? '',
                          multiplier: String(c.multiplier),
                          startDate: c.startDate.slice(0, 10),
                          endDate: c.endDate.slice(0, 10),
                          targetTierId: c.targetTier ? String(c.targetTier.id) : '',
                          isActive: c.isActive,
                        });
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteId(c.id)}>
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title={form.id ? 'Edit Campaign' : 'New Bonus Campaign'}>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Campaign Name</Label>
            <Input placeholder="e.g. Eid Double Points" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Description (optional)</Label>
            <Input placeholder="Brief description for internal use" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Points Multiplier</Label>
            <Input type="number" min="1.1" max="10" step="0.5" placeholder="e.g. 2 = double points" value={form.multiplier} onChange={(e) => setForm((f) => ({ ...f, multiplier: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Start Date</Label>
              <Input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>End Date</Label>
              <Input type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Target Tier (optional – leave blank for all tiers)</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              value={form.targetTierId}
              onChange={(e) => setForm((f) => ({ ...f, targetTierId: e.target.value }))}
            >
              <option value="">All Tiers</option>
              {(tiers ?? []).map((t: { id: number; name: string }) => (
                <option key={t.id} value={String(t.id)}>{t.name}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4 accent-[#FFD000]" />
            Active
          </label>
          <div className="flex gap-2 pt-2">
            <Button
              className="flex-1"
              loading={upsertMutation.isPending}
              onClick={() => upsertMutation.mutate()}
              disabled={!form.name || !form.multiplier || !form.startDate || !form.endDate}
            >
              {form.id ? 'Save Changes' : 'Launch Campaign'}
            </Button>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteId !== null} onClose={() => setDeleteId(null)} title="Delete Campaign">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Are you sure you want to delete this campaign? This cannot be undone.</p>
          <div className="flex gap-2">
            <Button variant="destructive" className="flex-1" loading={deleteMutation.isPending} onClick={() => deleteId && deleteMutation.mutate(deleteId)}>
              Delete
            </Button>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

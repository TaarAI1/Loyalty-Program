'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  UserPlus,
  Shield,
  User,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  Pencil,
  AlertCircle,
} from 'lucide-react';
import { usersApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface AppUser {
  id: number;
  username: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

const inputClass =
  'w-full h-9 px-3 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent';

export default function UsersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (user && user.role !== 'admin') router.replace('/dashboard');
  }, [user, router]);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', role: 'user' });
  const [showPassword, setShowPassword] = useState(false);

  const [deleteUser, setDeleteUser] = useState<AppUser | null>(null);
  const [editUser, setEditUser] = useState<AppUser | null>(null);
  const [editForm, setEditForm] = useState({ username: '', password: '', role: 'user' });
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  const { data: users, isLoading } = useQuery<AppUser[]>({
    queryKey: ['users'],
    queryFn: usersApi.getAll,
    enabled: user?.role === 'admin',
  });

  const createMutation = useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User created successfully');
      setForm({ username: '', password: '', role: 'user' });
      setShowForm(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      usersApi.update(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { username?: string; password?: string; role?: string } }) =>
      usersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User updated successfully');
      setEditUser(null);
      setEditForm({ username: '', password: '', role: 'user' });
      setShowEditPassword(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: usersApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User removed');
      setDeleteUser(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.username.trim() || !form.password.trim()) return;
    createMutation.mutate(form);
  }

  async function openEdit(u: AppUser) {
    setEditUser(u);
    setShowEditPassword(false);
    setEditLoading(true);
    setEditForm({ username: u.username, password: '', role: u.role });
    try {
      const detail = await usersApi.getOne(u.id);
      setEditForm({
        username: detail.username,
        password: detail.password ?? '',
        role: detail.role,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load user details.');
      setEditUser(null);
    } finally {
      setEditLoading(false);
    }
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editUser) return;
    if (!editForm.username.trim()) {
      toast.error('Name is required');
      return;
    }
    if (editForm.password && editForm.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    const payload: { username?: string; password?: string; role?: string } = {
      username: editForm.username.trim(),
      role: editForm.role,
    };
    if (editForm.password.trim()) payload.password = editForm.password;
    updateMutation.mutate({ id: editUser.id, data: payload });
  }

  if (user?.role !== 'admin') return null;

  return (
    <div className="w-full min-w-0 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage portal users and access rights</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New User</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Username</label>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="e.g. john.doe"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Min. 6 characters"
                    className={`${inputClass} pr-9`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className={inputClass}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="sm:col-span-3 flex items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={createMutation.isPending || !form.username || form.password.length < 6}
                  className="h-9 px-5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-2"
                >
                  {createMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Create User
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="h-9 px-4 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="w-full">
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {isLoading ? (
            <div className="space-y-2 px-6 pb-5">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-3 px-6 table-header text-[11px]">User</th>
                    <th className="text-left py-3 px-3 table-header text-[11px]">Role</th>
                    <th className="text-left py-3 px-3 table-header text-[11px]">Status</th>
                    <th className="text-left py-3 px-3 table-header text-[11px]">Created</th>
                    <th className="text-right py-3 px-6 table-header text-[11px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users?.map((u) => (
                    <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                            {u.username[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{u.username}</p>
                            {u.username === 'admin' && (
                              <p className="text-[10px] text-slate-400">Default system admin</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                            u.role === 'admin'
                              ? 'bg-violet-50 text-violet-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {u.role === 'admin' ? (
                            <Shield className="w-3 h-3" />
                          ) : (
                            <User className="w-3 h-3" />
                          )}
                          {u.role === 'admin' ? 'Admin' : 'User'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
                            u.isActive
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-red-50 text-red-600'
                          }`}
                        >
                          {u.isActive ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <XCircle className="w-3 h-3" />
                          )}
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-slate-400 text-xs">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {u.username !== 'admin' && (
                            <>
                              <button
                                onClick={() => toggleMutation.mutate({ id: u.id, isActive: !u.isActive })}
                                disabled={toggleMutation.isPending}
                                className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-colors ${
                                  u.isActive
                                    ? 'text-amber-600 hover:bg-amber-50'
                                    : 'text-emerald-600 hover:bg-emerald-50'
                                }`}
                              >
                                {u.isActive ? 'Deactivate' : 'Activate'}
                              </button>
                              <button
                                type="button"
                                onClick={() => openEdit(u)}
                                className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteUser(u)}
                                disabled={deleteMutation.isPending}
                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete user"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          {u.username === 'admin' && (
                            <span className="text-xs text-slate-300 italic">Protected</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={editUser !== null}
        onClose={() => {
          setEditUser(null);
          setShowEditPassword(false);
          setEditLoading(false);
        }}
        title="Edit User"
      >
        {editLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Name</label>
            <input
              type="text"
              value={editForm.username}
              onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
              className={inputClass}
              autoComplete="off"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showEditPassword ? 'text' : 'password'}
                value={editForm.password ?? ''}
                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                placeholder="Enter password"
                className={`${inputClass} pr-9`}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowEditPassword((prev) => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              >
                {showEditPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Role</label>
            <select
              value={editForm.role}
              onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
              className={inputClass}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" className="flex-1" loading={updateMutation.isPending}>
              Save
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditUser(null);
                setShowEditPassword(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
        )}
      </Dialog>

      <Dialog
        open={deleteUser !== null}
        onClose={() => setDeleteUser(null)}
        title="Delete User"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
            <p className="text-sm">
              Are you sure you want to delete user{' '}
              <span className="font-semibold">&quot;{deleteUser?.username}&quot;</span>? This cannot be undone.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              className="flex-1"
              loading={deleteMutation.isPending}
              onClick={() => deleteUser && deleteMutation.mutate(deleteUser.id)}
            >
              Delete
            </Button>
            <Button variant="outline" onClick={() => setDeleteUser(null)}>
              Cancel
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

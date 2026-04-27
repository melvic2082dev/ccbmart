'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UserCog, UserPlus, Lock, Unlock } from 'lucide-react';
import { ADMIN_ROLES, ROLE_LABELS, SUPER_ADMIN } from '@/lib/permissions';
import { getUser } from '@/lib/api';

interface AdminUser {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
}

const ROLE_COLOR: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-700',
  ops_admin: 'bg-blue-100 text-blue-700',
  partner_admin: 'bg-green-100 text-green-700',
  member_admin: 'bg-amber-100 text-amber-700',
  training_admin: 'bg-cyan-100 text-cyan-700',
  finance_admin: 'bg-rose-100 text-rose-700',
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ email: '', name: '', phone: '', role: 'ops_admin', password: '' });

  // Client-side guard: only super_admin sees this page (server enforces too).
  useEffect(() => {
    const u = getUser();
    if (!u || u.role !== SUPER_ADMIN) {
      router.push('/admin/dashboard');
    }
  }, [router]);

  const load = () => {
    setLoading(true);
    setError(null);
    api.adminUsers()
      .then((res) => setUsers(res.users || []))
      .catch((e) => setError(e?.message || 'Không tải được danh sách'))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(load, []);

  const submitCreate = async () => {
    setSubmitting(true);
    try {
      await api.adminCreateUser(form);
      setCreateOpen(false);
      setForm({ email: '', name: '', phone: '', role: 'ops_admin', password: '' });
      load();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const changeRole = async (u: AdminUser, role: string) => {
    if (role === u.role) return;
    if (!confirm(`Đổi role của ${u.name} từ "${ROLE_LABELS[u.role]}" sang "${ROLE_LABELS[role]}"?`)) return;
    try {
      await api.adminUpdateUserRole(u.id, role);
      load();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const toggleActive = async (u: AdminUser) => {
    if (!confirm(`${u.isActive ? 'Khoá' : 'Kích hoạt'} tài khoản ${u.name}?`)) return;
    try {
      await api.adminToggleUserActive(u.id);
      load();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  return (
    <>
      <h2 className="text-2xl font-bold mb-3 flex items-center gap-2">
        <UserCog size={24} /> Quản trị tài khoản admin
      </h2>

      <div className="mb-6 rounded-md border border-blue-200 bg-blue-50/60 px-3 py-2 text-sm text-blue-900">
        Chỉ <span className="font-medium">Super Admin</span> mới truy cập trang này. Tạo và phân quyền các tài khoản admin sub-role (ops/partner/member/training/finance).
      </div>

      <div className="mb-4 flex justify-between items-center">
        <p className="text-sm text-gray-600">{users.length} tài khoản admin</p>
        <Button onClick={() => setCreateOpen(true)} className="bg-blue-600 hover:bg-blue-700">
          <UserPlus className="w-4 h-4 mr-1.5" /> Tạo tài khoản admin
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="h-48 bg-gray-200 animate-pulse rounded-xl" />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Danh sách</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Đổi role</TableHead>
                    <TableHead className="text-right">Tác vụ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell className="text-xs">{u.email}</TableCell>
                      <TableCell><Badge className={`${ROLE_COLOR[u.role] || 'bg-gray-100'} text-xs`}>{ROLE_LABELS[u.role] ?? u.role}</Badge></TableCell>
                      <TableCell><Badge className={u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} variant="outline">{u.isActive ? 'Active' : 'Locked'}</Badge></TableCell>
                      <TableCell>
                        <select value={u.role} onChange={(e) => changeRole(u, e.target.value)} disabled={u.role === SUPER_ADMIN && users.filter((x) => x.role === SUPER_ADMIN).length === 1} className="rounded-md border border-input bg-background px-2 py-1 text-xs h-8" title={u.role === SUPER_ADMIN ? 'Không thể hạ quyền super_admin cuối cùng' : undefined}>
                          {ADMIN_ROLES.map((r) => (<option key={r} value={r}>{ROLE_LABELS[r]}</option>))}
                        </select>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => toggleActive(u)}>
                          {u.isActive ? <><Lock className="w-3.5 h-3.5 mr-1" /> Khoá</> : <><Unlock className="w-3.5 h-3.5 mr-1" /> Kích hoạt</>}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {users.length === 0 && !loading && (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500">Chưa có tài khoản admin nào.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile compact card */}
            <div className="md:hidden p-3 space-y-2">
              {users.length === 0 && !loading ? (
                <p className="text-center py-8 text-gray-500">Chưa có tài khoản admin nào.</p>
              ) : users.map((u) => (
                <div key={u.id} className="rounded-lg border border-gray-200 bg-white p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge className={`${ROLE_COLOR[u.role] || 'bg-gray-100'} text-xs shrink-0`}>{ROLE_LABELS[u.role] ?? u.role}</Badge>
                      <p className="font-medium text-gray-800 truncate">{u.name}</p>
                    </div>
                    <Badge className={u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} variant="outline">
                      {u.isActive ? 'Active' : 'Locked'}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{u.email}</p>
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <select
                      value={u.role}
                      onChange={(e) => changeRole(u, e.target.value)}
                      disabled={u.role === SUPER_ADMIN && users.filter((x) => x.role === SUPER_ADMIN).length === 1}
                      className="rounded-md border border-input bg-background px-2 py-1 text-xs h-9 flex-1"
                      title={u.role === SUPER_ADMIN ? 'Không thể hạ quyền super_admin cuối cùng' : undefined}
                    >
                      {ADMIN_ROLES.map((r) => (<option key={r} value={r}>{ROLE_LABELS[r]}</option>))}
                    </select>
                    <Button size="sm" variant="outline" onClick={() => toggleActive(u)}>
                      {u.isActive ? <><Lock className="w-3.5 h-3.5 mr-1" /> Khoá</> : <><Unlock className="w-3.5 h-3.5 mr-1" /> Kích hoạt</>}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo tài khoản admin mới</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Họ tên</Label>
              <Input value={form.name} onChange={(e) => setForm(s => ({ ...s, name: e.target.value }))} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm(s => ({ ...s, email: e.target.value }))} />
            </div>
            <div>
              <Label>SĐT</Label>
              <Input value={form.phone} onChange={(e) => setForm(s => ({ ...s, phone: e.target.value }))} />
            </div>
            <div>
              <Label>Role</Label>
              <select
                value={form.role}
                onChange={(e) => setForm(s => ({ ...s, role: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-9"
              >
                {ADMIN_ROLES.map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Mật khẩu (≥ 6 ký tự)</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm(s => ({ ...s, password: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={submitting}>Huỷ</Button>
            <Button onClick={submitCreate} disabled={submitting || !form.email || !form.name || !form.password}>
              {submitting ? 'Đang tạo...' : 'Tạo tài khoản'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

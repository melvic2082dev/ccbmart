'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShieldCheck, Search, Eye, Inbox } from 'lucide-react';

const PAGE_SIZE_KYC = 10;

interface PendingKyc {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  rank: string | null;
  idNumber: string | null;
  idFrontImage: string | null;
  idBackImage: string | null;
  kycSubmittedAt: string | null;
}

export default function AdminKycPage() {
  const [list, setList] = useState<PendingKyc[]>([]);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [viewUser, setViewUser] = useState<PendingKyc | null>(null);

  const fetchData = () => {
    setLoading(true);
    api.adminKycPending()
      .then(setList)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchData(); }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setPage(1); }, [search]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return list.filter((u) => !q
      || u.name.toLowerCase().includes(q)
      || u.email.toLowerCase().includes(q)
      || (u.idNumber || '').toLowerCase().includes(q));
  }, [list, search]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE_KYC));
  const paged = filtered.slice((page - 1) * PAGE_SIZE_KYC, page * PAGE_SIZE_KYC);

  const handleVerify = async (userId: number, approved: boolean) => {
    try {
      await api.adminKycVerify(userId, approved, approved ? undefined : reason);
      setReason('');
      setSelectedId(null);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <ShieldCheck size={24} /> eKYC — Xác minh danh tính
      </h2>

      <div className="mb-4">
        <div className="relative max-w-md">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên / email / CCCD…"
            className="pl-8"
          />
        </div>
      </div>

      {loading ? (
        <div className="h-64 bg-slate-200 animate-pulse rounded-xl" />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Chờ xác minh ({filtered.length}/{list.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Desktop table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Họ tên</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rank</TableHead>
                    <TableHead>Số CCCD</TableHead>
                    <TableHead>Ngày nộp</TableHead>
                    <TableHead className="text-center">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell className="text-sm">{u.email}</TableCell>
                      <TableCell><Badge variant="outline">{u.rank || '—'}</Badge></TableCell>
                      <TableCell className="font-mono text-sm">{u.idNumber || '—'}</TableCell>
                      <TableCell className="text-sm">{u.kycSubmittedAt ? new Date(u.kycSubmittedAt).toLocaleDateString('vi-VN') : '—'}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon-sm" title="Xem ảnh" onClick={() => setViewUser(u)}><Eye className="w-4 h-4 text-blue-600" /></Button>
                          <Button variant="outline" size="sm" className="text-xs text-emerald-700" onClick={() => handleVerify(u.id, true)}>Xác minh</Button>
                          <Button variant="outline" size="sm" className="text-xs text-red-700" onClick={() => setSelectedId(selectedId === u.id ? null : u.id)}>Từ chối</Button>
                        </div>
                        {selectedId === u.id && (
                          <div className="flex gap-1 mt-2">
                            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Lý do từ chối…" className="text-xs" />
                            <Button variant="destructive" size="sm" onClick={() => handleVerify(u.id, false)}>OK</Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {paged.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-500">Không có hồ sơ KYC phù hợp</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile compact card */}
            <div className="md:hidden p-3 space-y-2">
              {paged.length === 0 ? (
                <div className="py-10 text-center text-slate-500">
                  <Inbox className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="font-medium text-sm">Không có hồ sơ KYC phù hợp</p>
                  <p className="text-xs text-gray-400">Thử thay đổi bộ lọc</p>
                </div>
              ) : paged.map((u) => (
                <div key={u.id} className="rounded-lg border border-gray-200 bg-white p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="outline" className="text-xs shrink-0">{u.rank || '—'}</Badge>
                      <p className="font-medium text-gray-800 truncate">{u.name}</p>
                    </div>
                    <span className="text-xs text-gray-500 shrink-0">{u.kycSubmittedAt ? new Date(u.kycSubmittedAt).toLocaleDateString('vi-VN') : '—'}</span>
                  </div>
                  <div className="text-xs text-gray-500 truncate">{u.email}</div>
                  <div className="text-xs">
                    <span className="text-gray-500">CCCD:</span>{' '}
                    <span className="font-mono text-gray-800">{u.idNumber || '—'}</span>
                  </div>
                  <div className="flex gap-2 pt-2 border-t">
                    <Button variant="outline" size="sm" onClick={() => setViewUser(u)}>
                      <Eye className="w-4 h-4 mr-1 text-blue-600" />
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 text-emerald-700" onClick={() => handleVerify(u.id, true)}>Xác minh</Button>
                    <Button variant="outline" size="sm" className="flex-1 text-red-700" onClick={() => setSelectedId(selectedId === u.id ? null : u.id)}>Từ chối</Button>
                  </div>
                  {selectedId === u.id && (
                    <div className="flex gap-1 pt-1">
                      <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Lý do từ chối…" className="text-xs" />
                      <Button variant="destructive" size="sm" onClick={() => handleVerify(u.id, false)}>OK</Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {filtered.length > PAGE_SIZE_KYC && (
              <div className="flex items-center justify-between px-4 py-3 border-t text-sm">
                <p className="text-gray-500">Trang {page}/{totalPages}</p>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Trước</Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Sau →</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* KYC image viewer modal */}
      {viewUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setViewUser(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold">Hồ sơ eKYC · {viewUser.name}</h3>
              <Button variant="outline" size="sm" onClick={() => setViewUser(null)}>Đóng</Button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              <div><span className="text-gray-500">Email:</span> <b>{viewUser.email}</b></div>
              <div><span className="text-gray-500">SĐT:</span> <b>{viewUser.phone || '—'}</b></div>
              <div><span className="text-gray-500">Rank:</span> <b>{viewUser.rank || '—'}</b></div>
              <div><span className="text-gray-500">Số CCCD:</span> <b className="font-mono">{viewUser.idNumber || '—'}</b></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <KycImageCard title="CCCD mặt trước" src={viewUser.idFrontImage} />
              <KycImageCard title="CCCD mặt sau" src={viewUser.idBackImage} />
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button variant="destructive"
                onClick={() => { setSelectedId(viewUser.id); setViewUser(null); }}>
                Từ chối
              </Button>
              <Button onClick={() => { handleVerify(viewUser.id, true); setViewUser(null); }}>
                ✓ Xác minh
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function KycImageCard({ title, src }: { title: string; src: string | null }) {
  return (
    <div className="rounded-md border overflow-hidden">
      <p className="px-3 py-2 text-xs font-semibold bg-gray-50 border-b">{title}</p>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={title} className="w-full h-56 object-cover bg-gray-100" />
      ) : (
        <div className="h-56 bg-gray-100 flex items-center justify-center text-xs text-gray-400">
          (Chưa upload ảnh)
        </div>
      )}
    </div>
  );
}

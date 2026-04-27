'use client';
import { useEffect, useMemo, useState } from 'react';
import { api, formatVND } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Wallet, Search, X, User } from 'lucide-react';

interface Tier { id: number; name: string; color?: string }
interface WalletRow {
  id: number;
  balance: number;
  totalDeposit: number;
  user: { name: string; email: string; phone: string; isActive: boolean };
  tier: { name: string; color: string };
  _count: { referrals: number; deposits: number };
}
interface WalletResponse { wallets: WalletRow[]; total: number; totalPages: number; page: number }

const TIER_COLOR: Record<string, string> = {
  gray: 'bg-gray-100 text-gray-700',
  blue: 'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
  amber: 'bg-amber-100 text-amber-700',
  green: 'bg-green-100 text-green-700',
};

type StatusFilter = 'all' | 'active' | 'locked';

export default function AdminMemberWallets() {
  const [data, setData] = useState<WalletResponse | null>(null);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [tierId, setTierId] = useState<number | 'all'>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);

  // Debounce search → avoid request per keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to page 1 when filters change
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setPage(1); }, [debouncedSearch, tierId, status]);

  // Load tiers once for dropdown
  useEffect(() => {
    api.adminMembershipTiers().then((res: { tiers?: Tier[] } | Tier[]) => {
      const list = Array.isArray(res) ? res : (res?.tiers ?? []);
      setTiers(list);
    }).catch(() => {});
  }, []);

  // Load wallets when filters or page change
  const load = () => {
    setLoading(true);
    setError(null);
    api.adminMemberWallets({
      page,
      tierId: tierId === 'all' ? undefined : tierId,
      search: debouncedSearch || undefined,
      status: status === 'all' ? undefined : status,
    })
      .then((res) => setData(res as WalletResponse))
      .catch((e: Error) => setError(e?.message || 'Không tải được danh sách thành viên'))
      .finally(() => setLoading(false));
  };
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(load, [page, tierId, debouncedSearch, status]);

  const filtersActive = useMemo(
    () => debouncedSearch !== '' || tierId !== 'all' || status !== 'all',
    [debouncedSearch, tierId, status]
  );

  const clearFilters = () => {
    setSearch('');
    setTierId('all');
    setStatus('all');
  };

  return (
    <>
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Wallet size={24} /> Quản lý thành viên ({data?.total ?? 0})
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 mb-4">
        <div className="md:col-span-5 relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên, email, SĐT…"
            className="pl-8"
          />
        </div>
        <div className="md:col-span-3">
          <select
            value={tierId === 'all' ? 'all' : String(tierId)}
            onChange={(e) => setTierId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-9"
          >
            <option value="all">Mọi hạng</option>
            {tiers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-9"
          >
            <option value="all">Mọi trạng thái</option>
            <option value="active">Active</option>
            <option value="locked">Locked</option>
          </select>
        </div>
        <div className="md:col-span-2">
          {filtersActive && (
            <Button variant="outline" size="sm" onClick={clearFilters} className="h-9 w-full">
              <X className="w-3.5 h-3.5 mr-1" /> Xoá lọc
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-xl border border-red-300 bg-red-50 text-red-700 text-sm">
          <p className="font-semibold mb-1">Không tải được dữ liệu</p>
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="h-48 bg-gray-200 animate-pulse rounded-xl" />
      ) : !error && (data?.wallets?.length ?? 0) === 0 ? (
        <div className="p-8 text-center text-gray-500 border border-dashed rounded-xl">
          {filtersActive ? 'Không có thành viên khớp bộ lọc.' : 'Chưa có thành viên nào.'}
        </div>
      ) : !error ? (
        <>
          {/* Desktop table */}
          <Card className="hidden md:block">
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Tên</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>SĐT</TableHead>
                  <TableHead>Hạng</TableHead>
                  <TableHead className="text-right">Số dư</TableHead>
                  <TableHead className="text-right">Tổng nạp</TableHead>
                  <TableHead className="text-right">Giới thiệu</TableHead>
                  <TableHead>Trạng thái</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {(data?.wallets || []).map((w) => (
                    <TableRow key={w.id}>
                      <TableCell className="font-medium">{w.user?.name}</TableCell>
                      <TableCell className="text-xs">{w.user?.email}</TableCell>
                      <TableCell className="text-xs">{w.user?.phone}</TableCell>
                      <TableCell>
                        <Badge className={TIER_COLOR[w.tier?.color] || 'bg-gray-100 text-gray-700'} variant="outline">
                          {w.tier?.name}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">{formatVND(Number(w.balance ?? 0))}</TableCell>
                      <TableCell className="text-right">{formatVND(Number(w.totalDeposit ?? 0))}</TableCell>
                      <TableCell className="text-right">{w._count?.referrals || 0}</TableCell>
                      <TableCell>
                        <Badge className={w.user?.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} variant="outline">
                          {w.user?.isActive ? 'Active' : 'Locked'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Mobile compact card list */}
          <div className="md:hidden space-y-2">
            {(data?.wallets || []).map((w) => (
              <div key={w.id} className="rounded-lg border border-gray-200 bg-white p-3 space-y-2">
                {/* Row 1: tier + status */}
                <div className="flex items-center justify-between gap-2">
                  <Badge className={TIER_COLOR[w.tier?.color] || 'bg-gray-100 text-gray-700'} variant="outline">
                    {w.tier?.name}
                  </Badge>
                  <Badge className={w.user?.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} variant="outline">
                    {w.user?.isActive ? 'Active' : 'Locked'}
                  </Badge>
                </div>
                {/* Row 2: icon + name · email · phone (no labels) */}
                <div className="flex items-start gap-2 text-sm">
                  <User className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-800 truncate">{w.user?.name}</p>
                    <p className="text-xs text-gray-500 truncate">{w.user?.email} · {w.user?.phone}</p>
                  </div>
                </div>
                {/* Row 3: stats compact */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t text-center">
                  <div>
                    <p className="text-[10px] uppercase text-gray-500 tracking-wide">Số dư</p>
                    <p className="text-sm font-semibold text-emerald-700">{formatVND(Number(w.balance ?? 0))}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-gray-500 tracking-wide">Tổng nạp</p>
                    <p className="text-sm font-semibold text-gray-800">{formatVND(Number(w.totalDeposit ?? 0))}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-gray-500 tracking-wide">Giới thiệu</p>
                    <p className="text-sm font-semibold text-gray-800">{w._count?.referrals || 0}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {(data?.totalPages || 1) > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Trước</Button>
          <span className="flex items-center text-sm text-gray-500">Trang {page}/{data?.totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= (data?.totalPages || 1)} onClick={() => setPage(p => p + 1)}>Sau</Button>
        </div>
      )}
    </>
  );
}

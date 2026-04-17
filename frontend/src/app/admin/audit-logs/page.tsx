'use client';
import { Fragment, useEffect, useState, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollText, Filter, ChevronLeft, ChevronRight, X } from 'lucide-react';

type AuditUser = { id: number; name: string; email: string; role: string; rank: string | null };
type AuditLogRow = {
  id: number;
  userId: number | null;
  action: string;
  targetType: string | null;
  targetId: number | null;
  oldValue: string | null;
  newValue: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  status: 'SUCCESS' | 'FAILURE';
  metadata: string | null;
  createdAt: string;
  user: AuditUser | null;
};

const ACTION_LABELS: Record<string, string> = {
  LOGIN: 'Đăng nhập',
  LOGOUT: 'Đăng xuất',
  LOGIN_FAILED: 'Đăng nhập thất bại',
  RANK_CHANGE: 'Thay đổi cấp bậc',
  REASSIGN: 'Chuyển tuyến',
  DEPOSIT_CONFIRM: 'Duyệt nạp tiền',
  DEPOSIT_REJECT: 'Từ chối nạp tiền',
  CONFIG_CHANGE: 'Thay đổi cấu hình',
  DATA_EXPORT: 'Xuất dữ liệu',
  CRON_JOB: 'Tác vụ tự động',
  CTV_ACTIVATE: 'Kích hoạt CTV',
  CTV_DEACTIVATE: 'Tạm ngưng CTV',
  CTV_CREATE: 'Tạo CTV',
  CTV_TOGGLE_ACTIVE: 'Bật/tắt CTV',
};

function truncate(s: string | null | undefined, n: number) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n) + '…' : s;
}

function formatValue(raw: string | null) {
  if (!raw) return '';
  try {
    const obj = JSON.parse(raw);
    return JSON.stringify(obj, null, 2);
  } catch {
    return raw;
  }
}

export default function AuditLogsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ logs: AuditLogRow[]; total: number; page: number; totalPages: number } | null>(null);
  const [actions, setActions] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);

  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [userId, setUserId] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.adminAuditLogs({
        page, action, status, dateFrom, dateTo, search,
        userId: userId ? parseInt(userId, 10) : undefined,
      });
      setData(res);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); /* eslint-disable-next-line */ }, [page]);

  useEffect(() => {
    api.adminAuditLogActions().then(r => {
      setActions((r.actions || []).map((x: { action: string }) => x.action));
    }).catch(() => {});
  }, []);

  const applyFilters = () => { setPage(1); fetchData(); };
  const resetFilters = () => {
    setAction(''); setStatus(''); setDateFrom(''); setDateTo(''); setSearch(''); setUserId('');
    setPage(1);
    setTimeout(fetchData, 0);
  };

  const rows = data?.logs || [];

  const totalPages = data?.totalPages || 1;
  const pageNumbers = useMemo(() => {
    const range: number[] = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    for (let i = start; i <= end; i++) range.push(i);
    return range;
  }, [page, totalPages]);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <ScrollText size={24} /> Nhật ký hệ thống
        </h2>
        <Badge variant="outline" className="text-xs">Tổng: {data?.total ?? 0}</Badge>
      </div>

      <Card className="mb-4">
        <CardContent className="p-4 flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground flex items-center gap-1"><Filter size={12}/> Hành động</label>
            <select
              className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
              value={action}
              onChange={e => setAction(e.target.value)}
            >
              <option value="">Tất cả</option>
              {actions.map(a => (
                <option key={a} value={a}>{ACTION_LABELS[a] || a}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Trạng thái</label>
            <select
              className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
              value={status}
              onChange={e => setStatus(e.target.value)}
            >
              <option value="">Tất cả</option>
              <option value="SUCCESS">Thành công</option>
              <option value="FAILURE">Thất bại</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Từ ngày</label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-44" />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Đến ngày</label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-44" />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">User ID</label>
            <Input type="number" placeholder="ID…" value={userId} onChange={e => setUserId(e.target.value)} className="w-28" />
          </div>

          <div className="flex flex-col gap-1 flex-1 min-w-[220px]">
            <label className="text-xs text-muted-foreground">Tìm kiếm</label>
            <Input placeholder="hành động, IP, metadata…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <div className="flex gap-2">
            <Button onClick={applyFilters}>Lọc</Button>
            <Button variant="outline" onClick={resetFilters}>Xoá lọc</Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="h-64 bg-gray-200 dark:bg-gray-800 animate-pulse rounded-xl" />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Thời gian</TableHead>
                  <TableHead>Người thực hiện</TableHead>
                  <TableHead>Hành động</TableHead>
                  <TableHead>Đối tượng</TableHead>
                  <TableHead>Giá trị</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Không có log nào</TableCell></TableRow>
                )}
                {rows.map(log => (
                  <Fragment key={log.id}>
                    <TableRow className="cursor-pointer" onClick={() => setExpanded(expanded === log.id ? null : log.id)}>
                      <TableCell className="text-xs whitespace-nowrap">{new Date(log.createdAt).toLocaleString('vi-VN')}</TableCell>
                      <TableCell>
                        {log.user
                          ? <span className="text-sm">{log.user.name} <span className="text-muted-foreground">(#{log.user.id})</span></span>
                          : <span className="text-muted-foreground italic text-sm">Hệ thống</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{ACTION_LABELS[log.action] || log.action}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {log.targetType ? `${log.targetType}${log.targetId ? ` #${log.targetId}` : ''}` : '-'}
                      </TableCell>
                      <TableCell className="text-xs max-w-xs truncate">
                        {log.newValue ? truncate(log.newValue, 80) : '-'}
                      </TableCell>
                      <TableCell className="text-xs">{log.ipAddress || '-'}</TableCell>
                      <TableCell>
                        <Badge className={log.status === 'SUCCESS' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} variant="outline">
                          {log.status === 'SUCCESS' ? 'OK' : 'Lỗi'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                    {expanded === log.id && (
                      <TableRow>
                        <TableCell colSpan={7} className="bg-muted/40">
                          <div className="p-3 space-y-2 text-xs">
                            {log.oldValue && (
                              <div>
                                <div className="font-semibold mb-1">Giá trị cũ:</div>
                                <pre className="bg-background p-2 rounded border overflow-x-auto whitespace-pre-wrap">{formatValue(log.oldValue)}</pre>
                              </div>
                            )}
                            {log.newValue && (
                              <div>
                                <div className="font-semibold mb-1">Giá trị mới / Payload:</div>
                                <pre className="bg-background p-2 rounded border overflow-x-auto whitespace-pre-wrap">{formatValue(log.newValue)}</pre>
                              </div>
                            )}
                            {log.metadata && (
                              <div>
                                <div className="font-semibold mb-1">Metadata:</div>
                                <pre className="bg-background p-2 rounded border overflow-x-auto whitespace-pre-wrap">{formatValue(log.metadata)}</pre>
                              </div>
                            )}
                            {log.userAgent && (
                              <div className="text-muted-foreground"><span className="font-semibold">UA:</span> {log.userAgent}</div>
                            )}
                            <div className="flex justify-end">
                              <Button size="sm" variant="ghost" onClick={() => setExpanded(null)}><X size={14}/> Đóng</Button>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {data && totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 mt-4">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
            <ChevronLeft size={14}/>
          </Button>
          {pageNumbers.map(p => (
            <Button
              key={p}
              size="sm"
              variant={p === page ? 'default' : 'outline'}
              onClick={() => setPage(p)}
            >
              {p}
            </Button>
          ))}
          <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
            <ChevronRight size={14}/>
          </Button>
        </div>
      )}
    </>
  );
}

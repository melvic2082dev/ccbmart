'use client';

import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ClipboardCheck, GraduationCap } from 'lucide-react';

const REQUIRED_HOURS_PER_MONTH = 20;

function currentMonthLabel(): string {
  const d = new Date();
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

interface TrainingLog {
  id: number;
  trainerId: number;
  traineeId: number;
  sessionDate: string;
  durationMinutes: number;
  content: string;
  menteeConfirmed: boolean;
  mentorConfirmed: boolean;
  status: string;
  verifiedAt: string | null;
  trainer: { id: number; name: string; rank: string };
  trainee: { id: number; name: string; rank: string };
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  VERIFIED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
};

export default function TrainingLogsPage() {
  const [logs, setLogs] = useState<TrainingLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');

  const fetchData = () => {
    setLoading(true);
    api.adminTrainingLogs(1, filter || undefined)
      .then((data) => setLogs(data.logs || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchData(); }, [filter]);

  // Current-month mentor summary (aggregated from VERIFIED logs this month)
  const mentorSummary = useMemo(() => {
    const thisMonth = currentMonthKey();
    const map = new Map<number, { id: number; name: string; rank: string; minutes: number }>();
    for (const l of logs) {
      const m = l.sessionDate.slice(0, 7);
      if (m !== thisMonth) continue;
      if (l.status !== 'VERIFIED') continue;
      const existing = map.get(l.trainerId) ?? {
        id: l.trainerId, name: l.trainer.name, rank: l.trainer.rank, minutes: 0,
      };
      existing.minutes += l.durationMinutes;
      map.set(l.trainerId, existing);
    }
    return Array.from(map.values())
      .map(m => ({ ...m, hours: Math.round((m.minutes / 60) * 10) / 10 }))
      .sort((a, b) => b.hours - a.hours);
  }, [logs]);

  const handleVerify = async (id: number, action: string) => {
    try {
      await api.adminVerifyTrainingLog(id, action);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <ClipboardCheck size={24} /> Nhật ký đào tạo
      </h2>

      {/* Mentor hour summary for current month */}
      <Card className="mb-6 border-emerald-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-emerald-600" />
            Tổng giờ đào tạo tháng {currentMonthLabel()} · yêu cầu 20h/mentor
          </CardTitle>
          <p className="text-sm text-slate-500">
            Chỉ tính log VERIFIED. Mentor không đủ 20h sẽ không được nhận Thù lao DV duy trì tháng sau.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {mentorSummary.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">Tháng này chưa có log đào tạo nào được xác nhận</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mentor</TableHead>
                  <TableHead>Rank</TableHead>
                  <TableHead className="text-right">Tổng giờ</TableHead>
                  <TableHead className="text-right">Yêu cầu</TableHead>
                  <TableHead>Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mentorSummary.map(m => {
                  const ok = m.hours >= REQUIRED_HOURS_PER_MONTH;
                  const warn = !ok && m.hours >= REQUIRED_HOURS_PER_MONTH * 0.75;
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{m.rank}</Badge></TableCell>
                      <TableCell className={`text-right font-semibold ${ok ? 'text-emerald-700' : warn ? 'text-amber-700' : 'text-red-600'}`}>
                        {m.hours}h
                      </TableCell>
                      <TableCell className="text-right text-gray-500">{REQUIRED_HOURS_PER_MONTH}h</TableCell>
                      <TableCell>
                        {ok
                          ? <Badge className="bg-emerald-100 text-emerald-700 text-xs">✅ Đạt</Badge>
                          : warn
                            ? <Badge className="bg-amber-100 text-amber-700 text-xs">⚠️ Thiếu</Badge>
                            : <Badge className="bg-red-100 text-red-700 text-xs">🔴 Thiếu nghiêm trọng</Badge>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2 mb-4">
        {['', 'PENDING', 'VERIFIED', 'REJECTED'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === s
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {s === '' ? 'Tất cả' : s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="h-64 bg-slate-200 animate-pulse rounded-xl" />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Nhật ký ({logs.length} bản ghi)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ngày</TableHead>
                  <TableHead>Mentor</TableHead>
                  <TableHead>Mentee</TableHead>
                  <TableHead>Thời lượng</TableHead>
                  <TableHead>Nội dung</TableHead>
                  <TableHead>Xác nhận</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      {new Date(log.sessionDate).toLocaleDateString('vi-VN')}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{log.trainer.name}</div>
                      <Badge variant="outline" className="text-xs">{log.trainer.rank}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{log.trainee.name}</div>
                      <Badge variant="outline" className="text-xs">{log.trainee.rank}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{log.durationMinutes} phút</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{log.content}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Badge className={log.mentorConfirmed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'} >
                          Mentor {log.mentorConfirmed ? '✓' : '✗'}
                        </Badge>
                        <Badge className={log.menteeConfirmed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}>
                          Mentee {log.menteeConfirmed ? '✓' : '✗'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_STYLES[log.status] || 'bg-gray-100 text-gray-700'}>
                        {log.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {log.status === 'PENDING' && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleVerify(log.id, 'verify')}
                            className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                          >
                            Xác nhận
                          </button>
                          <button
                            onClick={() => handleVerify(log.id, 'reject')}
                            className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                          >
                            Từ chối
                          </button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {logs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                      Không có nhật ký đào tạo
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  );
}

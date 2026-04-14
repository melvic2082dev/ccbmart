'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShieldCheck } from 'lucide-react';

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

  const fetchData = () => {
    setLoading(true);
    api.adminKycPending()
      .then(setList)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

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
    <DashboardLayout role="admin">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <ShieldCheck size={24} /> eKYC - Xác minh danh tính (V12.2)
      </h2>

      {loading ? (
        <div className="h-64 bg-slate-200 animate-pulse rounded-xl" />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Chờ xác minh ({list.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Họ tên</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Chức danh</TableHead>
                  <TableHead>Số CCCD</TableHead>
                  <TableHead>Ngày nộp</TableHead>
                  <TableHead>Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell className="text-sm">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{u.rank || '-'}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{u.idNumber || '-'}</TableCell>
                    <TableCell className="text-sm">
                      {u.kycSubmittedAt ? new Date(u.kycSubmittedAt).toLocaleDateString('vi-VN') : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleVerify(u.id, true)}
                            className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                          >
                            Xác minh
                          </button>
                          <button
                            onClick={() => setSelectedId(selectedId === u.id ? null : u.id)}
                            className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                          >
                            Từ chối
                          </button>
                        </div>
                        {selectedId === u.id && (
                          <div className="flex gap-1">
                            <input
                              type="text"
                              value={reason}
                              onChange={(e) => setReason(e.target.value)}
                              placeholder="Lý do từ chối..."
                              className="flex-1 px-2 py-1 text-xs border rounded"
                            />
                            <button
                              onClick={() => handleVerify(u.id, false)}
                              className="px-2 py-1 text-xs bg-red-600 text-white rounded"
                            >
                              OK
                            </button>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {list.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                      Không có hồ sơ KYC cần xác minh
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
}

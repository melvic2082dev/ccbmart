'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building2 } from 'lucide-react';

interface Household {
  id: number;
  userId: number;
  businessName: string;
  taxCode: string | null;
  businessLicense: string | null;
  registeredAt: string;
  status: string;
  user: {
    id: number;
    name: string;
    email: string;
    phone: string;
    rank: string;
    isActive: boolean;
  };
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  suspended: 'bg-yellow-100 text-yellow-700',
  terminated: 'bg-red-100 text-red-700',
};

export default function BusinessHouseholdPage() {
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = () => {
    api.adminBusinessHouseholds()
      .then(setHouseholds)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleAction = async (userId: number, action: string) => {
    try {
      await api.adminBusinessHouseholdAction({ userId, action });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <DashboardLayout role="admin">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Building2 size={24} /> Hộ kinh doanh (HKD)
      </h2>

      {loading ? (
        <div className="h-64 bg-slate-200 animate-pulse rounded-xl" />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Danh sách HKD ({households.length})</CardTitle>
            <p className="text-sm text-slate-500">
              CTV đạt cấp PP trở lên đăng ký HKD để ký hợp đồng B2B đào tạo
            </p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên HKD</TableHead>
                  <TableHead>CTV</TableHead>
                  <TableHead>Cấp bậc</TableHead>
                  <TableHead>MST</TableHead>
                  <TableHead>GPKD</TableHead>
                  <TableHead>Ngày ĐK</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {households.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="font-medium">{h.businessName}</TableCell>
                    <TableCell>{h.user.name}</TableCell>
                    <TableCell><Badge variant="outline">{h.user.rank}</Badge></TableCell>
                    <TableCell className="font-mono text-sm">{h.taxCode || '-'}</TableCell>
                    <TableCell className="text-sm">{h.businessLicense || '-'}</TableCell>
                    <TableCell className="text-sm">{new Date(h.registeredAt).toLocaleDateString('vi-VN')}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[h.status] || 'bg-gray-100 text-gray-700'}>
                        {h.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {h.status === 'active' && (
                          <button
                            onClick={() => handleAction(h.userId, 'suspend')}
                            className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                          >
                            Tạm ngưng
                          </button>
                        )}
                        {h.status === 'suspended' && (
                          <button
                            onClick={() => handleAction(h.userId, 'activate')}
                            className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                          >
                            Kích hoạt
                          </button>
                        )}
                        {h.status !== 'terminated' && (
                          <button
                            onClick={() => handleAction(h.userId, 'terminate')}
                            className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                          >
                            Chấm dứt
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {households.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                      Chưa có HKD nào
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

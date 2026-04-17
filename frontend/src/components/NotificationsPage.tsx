'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, Check, CheckCheck } from 'lucide-react';

interface Notification {
  id: number;
  type: string;
  title: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  metadata: Record<string, unknown>;
}

const typeColors: Record<string, string> = {
  RANK_CHANGE: 'bg-purple-100 text-purple-700',
  TRANSACTION_CONFIRMED: 'bg-emerald-100 text-emerald-700',
  SALARY_WARNING: 'bg-yellow-100 text-yellow-700',
  INVENTORY_WARNING: 'bg-red-100 text-red-700',
  RANK_UPDATE_REPORT: 'bg-blue-100 text-blue-700',
};

const typeLabels: Record<string, string> = {
  RANK_CHANGE: 'Thay đổi hạng',
  TRANSACTION_CONFIRMED: 'Giao dịch',
  SALARY_WARNING: 'Quỹ lương',
  INVENTORY_WARNING: 'Tồn kho',
  RANK_UPDATE_REPORT: 'Báo cáo hạng',
  ADMIN_BROADCAST: 'Thông báo',
  TRANSACTION_REJECTED: 'Giao dịch bị từ chối',
  CASH_DEPOSIT_CONFIRMED: 'Nộp tiền đã xác nhận',
  NEW_TRANSACTION: 'Giao dịch mới',
  CASH_DEPOSIT: 'Nộp tiền mặt',
};

export default function NotificationsPage({ role }: { role: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchData = async (p = 1) => {
    try {
      const data = await api.notifications(p);
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
      setTotalPages(data.totalPages || 1);
      setPage(p);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleMarkRead = async (id: number) => {
    await api.markNotificationRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleMarkAllRead = async () => {
    await api.markAllNotificationsRead();
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  return (
    <DashboardLayout role={role}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Bell size={24} /> Thông báo
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-2">{unreadCount} chưa đọc</Badge>
          )}
        </h2>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
            <CheckCheck size={16} className="mr-1" /> Đọc tất cả
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-200 animate-pulse rounded-xl" />)}
        </div>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            Không có thông báo nào
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map(n => (
            <Card
              key={n.id}
              className={`transition-colors ${!n.isRead ? 'border-l-4 border-l-emerald-500 bg-emerald-50/30' : ''}`}
            >
              <CardContent className="py-4 flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={typeColors[n.type] || 'bg-slate-100 text-slate-700'} variant="outline">
                      {typeLabels[n.type] || n.type}
                    </Badge>
                    <span className="text-xs text-slate-400">
                      {new Date(n.createdAt).toLocaleString('vi-VN')}
                    </span>
                  </div>
                  <p className="font-semibold text-sm">{n.title}</p>
                  <p className="text-sm text-slate-600">{n.content}</p>
                </div>
                {!n.isRead && (
                  <Button variant="ghost" size="sm" onClick={() => handleMarkRead(n.id)}>
                    <Check size={16} />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-4">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => fetchData(page - 1)}>
                Trước
              </Button>
              <span className="flex items-center text-sm text-slate-500">
                Trang {page}/{totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => fetchData(page + 1)}>
                Sau
              </Button>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}

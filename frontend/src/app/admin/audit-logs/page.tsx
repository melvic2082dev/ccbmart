'use client';

import { useAdminAuditLogs } from '@/lib/hooks/useApi';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminAuditLogsPage() {
  const { data, isLoading } = useAdminAuditLogs();
  const logs = data?.logs ?? [];

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Nhật ký kiểm toán</h2>
      {isLoading ? (
        <Skeleton className="h-32" />
      ) : (
        <p className="text-sm text-slate-500">{logs.length} bản ghi</p>
      )}
    </div>
  );
}

'use client';

import { useAdminAuditLogs } from '@/lib/hooks/useApi';

export default function AdminAuditLogsPage() {
  const { data, isLoading } = useAdminAuditLogs();
  const logs = data?.logs ?? [];

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Nhật ký kiểm toán</h2>
      {isLoading ? (
        <div className="h-32 bg-slate-200 animate-pulse rounded-xl" />
      ) : (
        <p className="text-sm text-slate-500">{logs.length} bản ghi</p>
      )}
    </div>
  );
}

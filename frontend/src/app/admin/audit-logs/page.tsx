'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.adminAuditLogs()
      .then((d: { logs: unknown[] }) => setLogs(d.logs || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Nhật ký kiểm toán</h2>
      {loading ? (
        <div className="h-32 bg-slate-200 animate-pulse rounded-xl" />
      ) : (
        <p className="text-sm text-slate-500">{logs.length} bản ghi</p>
      )}
    </div>
  );
}

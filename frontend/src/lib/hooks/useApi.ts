'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export const queryKeys = {
  adminAuditLogs: ['admin', 'audit-logs'] as const,
  adminDashboard: ['admin', 'dashboard'] as const,
  adminCtvs: ['admin', 'ctvs'] as const,
  adminReconciliationPending: (filter?: string) =>
    ['admin', 'reconciliation', 'pending', filter ?? 'all'] as const,
  adminReconciliationStats: ['admin', 'reconciliation', 'stats'] as const,
  adminCashDepositsPending: ['admin', 'cash-deposits', 'pending'] as const,
};

export function useAdminAuditLogs() {
  return useQuery({
    queryKey: queryKeys.adminAuditLogs,
    queryFn: () => api.adminAuditLogs() as Promise<{ logs: unknown[] }>,
  });
}

export function useAdminDashboard() {
  return useQuery({
    queryKey: queryKeys.adminDashboard,
    queryFn: () => api.adminDashboard(),
  });
}

export function useReconciliationData(filter?: string) {
  const pending = useQuery({
    queryKey: queryKeys.adminReconciliationPending(filter),
    queryFn: () => api.adminReconciliationPending(1, filter || undefined),
  });
  const stats = useQuery({
    queryKey: queryKeys.adminReconciliationStats,
    queryFn: () => api.adminReconciliationStats(),
  });
  const cash = useQuery({
    queryKey: queryKeys.adminCashDepositsPending,
    queryFn: () => api.adminCashDepositsPending(),
  });
  return { pending, stats, cash };
}

export function useReconciliationActions() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'reconciliation'] });
    qc.invalidateQueries({ queryKey: queryKeys.adminCashDepositsPending });
  };

  const confirm = useMutation({
    mutationFn: (id: number) => api.adminReconciliationConfirm(id),
    onSuccess: invalidate,
  });

  const reject = useMutation({
    mutationFn: (vars: { id: number; reason: string }) =>
      api.adminReconciliationReject(vars.id, vars.reason),
    onSuccess: invalidate,
  });

  const confirmDeposit = useMutation({
    mutationFn: (id: number) => api.adminCashDepositConfirm(id),
    onSuccess: invalidate,
  });

  return { confirm, reject, confirmDeposit };
}

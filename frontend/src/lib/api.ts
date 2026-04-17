const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

async function fetchAPI(path: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function fetchBlob(path: string) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res;
}

async function fetchMultipart(path: string, formData: FormData) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: formData,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  login: (email: string, password: string) =>
    fetchAPI('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => fetchAPI('/auth/me'),

  // CTV
  ctvDashboard: () => fetchAPI('/ctv/dashboard'),
  ctvTree: () => fetchAPI('/ctv/tree'),
  ctvCustomers: () => fetchAPI('/ctv/customers'),
  ctvTransactions: (page = 1) => fetchAPI(`/ctv/transactions?page=${page}`),
  ctvProducts: () => fetchAPI('/ctv/products'),

  // CTV Transactions (new)
  ctvCreateTransaction: (data: { customerId?: number; customerName?: string; customerPhone?: string; paymentMethod: string; bankCode?: string }) =>
    fetchAPI('/ctv/transactions/create', { method: 'POST', body: JSON.stringify(data) }),
  ctvPendingTransactions: (page = 1) => fetchAPI(`/ctv/transactions/pending?page=${page}`),
  ctvTransactionHistory: (page = 1, status?: string) =>
    fetchAPI(`/ctv/transactions/history?page=${page}${status ? `&status=${status}` : ''}`),
  ctvUploadProof: (txId: number, formData: FormData) =>
    fetchMultipart(`/ctv/transactions/${txId}/upload-proof`, formData),
  ctvPendingCash: () => fetchAPI('/ctv/transactions/pending-cash'),
  ctvCreateCashDeposit: (transactionIds: number[], notes?: string) =>
    fetchAPI('/ctv/transactions/cash-deposit', { method: 'POST', body: JSON.stringify({ transactionIds, notes }) }),
  ctvPendingCount: () => fetchAPI('/ctv/transactions/pending-count'),

  // Agency
  agencyDashboard: () => fetchAPI('/agency/dashboard'),
  agencyInventory: () => fetchAPI('/agency/inventory'),
  agencyTransactions: (page = 1) => fetchAPI(`/agency/transactions?page=${page}`),

  // Admin
  adminDashboard: () => fetchAPI('/admin/dashboard'),
  adminCtvs: () => fetchAPI('/admin/ctvs'),
  adminCtvTree: () => fetchAPI('/admin/ctv-tree'),
  adminCtvDetails: (id: number) => fetchAPI(`/admin/ctv/${id}/details`),
  adminCtvReassign: (id: number, newParentId: number | null, reason?: string) =>
    fetchAPI(`/admin/ctv/${id}/reassign`, { method: 'POST', body: JSON.stringify({ newParentId, reason }) }),
  adminBulkNotify: (data: { userIds: number[]; title: string; content: string; type?: string }) =>
    fetchAPI('/admin/notifications/bulk', { method: 'POST', body: JSON.stringify(data) }),
  adminCtvChangeRank: (id: number, newRank: string, reason?: string) =>
    fetchAPI(`/admin/ctv/${id}/rank`, { method: 'POST', body: JSON.stringify({ newRank, reason }) }),
  adminCtvToggleActive: (id: number, isActive: boolean, reason?: string) =>
    fetchAPI(`/admin/ctv/${id}/toggle-active`, { method: 'POST', body: JSON.stringify({ isActive, reason }) }),
  adminCtvCreate: (data: Record<string, unknown>) =>
    fetchAPI('/admin/ctv', { method: 'POST', body: JSON.stringify(data) }),
  adminCtvExportUrl: () => `${API_BASE}/admin/ctv/export`,
  adminAgencies: () => fetchAPI('/admin/agencies'),
  adminAgencyDetails: (id: number) => fetchAPI(`/admin/agencies/${id}/details`),
  adminAgencyTransactions: (id: number, days = 30) =>
    fetchAPI(`/admin/agencies/${id}/transactions?days=${days}`),
  adminAgencyRestockSuggestions: (id: number) =>
    fetchAPI(`/admin/agencies/${id}/restock-suggestions`),
  adminAgencyExportUrl: (id: number, days = 30) =>
    `${API_BASE}/admin/agencies/${id}/transactions/export?days=${days}`,
  adminCommissionConfig: () => fetchAPI('/admin/config/commission'),
  adminUpdateCommission: (tier: string, data: Record<string, number>) =>
    fetchAPI(`/admin/config/commission/${tier}`, { method: 'PUT', body: JSON.stringify(data) }),
  adminCreateCommission: (data: Record<string, unknown>) =>
    fetchAPI('/admin/config/commission', { method: 'POST', body: JSON.stringify(data) }),
  adminDeleteCommission: (tier: string) =>
    fetchAPI(`/admin/config/commission/${tier}`, { method: 'DELETE' }),

  // V12.1: Fee Config
  adminFeeConfig: () => fetchAPI('/admin/fee-config'),
  adminUpdateFeeConfig: (tier: string, data: Record<string, unknown>) =>
    fetchAPI(`/admin/fee-config/${tier}`, { method: 'PUT', body: JSON.stringify(data) }),

  // V12.1: Business Household
  adminBusinessHouseholds: () => fetchAPI('/admin/business-household'),
  adminBusinessHouseholdAction: (data: Record<string, unknown>) =>
    fetchAPI('/admin/business-household', { method: 'POST', body: JSON.stringify(data) }),
  adminBusinessHouseholdDetails: (id: number) =>
    fetchAPI(`/admin/business-household/${id}/details`),
  adminBusinessHouseholdRenew: (id: number, kind: 'dealer' | 'training', termMonths: number) =>
    fetchAPI(`/admin/business-household/${id}/renew`, { method: 'POST', body: JSON.stringify({ kind, termMonths }) }),
  adminBusinessHouseholdUpdateBank: (id: number, bankName: string, bankAccountNo: string, bankAccountHolder: string) =>
    fetchAPI(`/admin/business-household/${id}/update-bank`, { method: 'POST', body: JSON.stringify({ bankName, bankAccountNo, bankAccountHolder }) }),

  // V12.1: Training Logs (admin)
  adminTrainingLogs: (page = 1, status?: string) =>
    fetchAPI(`/training-logs/admin?page=${page}${status ? `&status=${status}` : ''}`),
  adminVerifyTrainingLog: (id: number, action: string) =>
    fetchAPI(`/training-logs/admin/verify/${id}`, { method: 'POST', body: JSON.stringify({ action }) }),

  // V12.1: Training Logs (CTV)
  ctvTrainingLogs: () => fetchAPI('/training-logs/my'),
  ctvCreateTrainingLog: (data: Record<string, unknown>) =>
    fetchAPI('/training-logs', { method: 'POST', body: JSON.stringify(data) }),
  ctvConfirmTrainingLog: (id: number) =>
    fetchAPI(`/training-logs/${id}/confirm`, { method: 'POST' }),
  adminKpiConfig: () => fetchAPI('/admin/config/kpi'),
  adminUpdateKpi: (rank: string, data: Record<string, unknown>) =>
    fetchAPI(`/admin/config/kpi/${rank}`, { method: 'PUT', body: JSON.stringify(data) }),
  adminAgencyConfig: () => fetchAPI('/admin/config/agency'),
  adminUpdateAgency: (group: string, data: Record<string, number>) =>
    fetchAPI(`/admin/config/agency/${group}`, { method: 'PUT', body: JSON.stringify(data) }),
  adminCogsConfig: () => fetchAPI('/admin/config/cogs'),
  adminUpdateCogs: (phase: string, data: Record<string, unknown>) =>
    fetchAPI(`/admin/config/cogs/${phase}`, { method: 'PUT', body: JSON.stringify(data) }),
  adminResetConfig: () => fetchAPI('/admin/config/reset-default', { method: 'POST' }),
  adminReports: (months = 6) => fetchAPI(`/admin/reports/financial?months=${months}`),
  adminKpiLogs: () => fetchAPI('/admin/kpi-logs'),
  adminReassignCtv: (id: number, newParentId: number | null) =>
    fetchAPI(`/admin/ctv/${id}/reassign`, { method: 'POST', body: JSON.stringify({ newParentId }) }),
  adminChangeRank: (id: number, newRank: string, reason: string) =>
    fetchAPI(`/admin/ctv/${id}/rank`, { method: 'POST', body: JSON.stringify({ newRank, reason }) }),
  adminSync: () => fetchAPI('/admin/sync', { method: 'POST' }),
  adminRunRankEvaluation: () => fetchAPI('/admin/rank-evaluation', { method: 'POST' }),

  // Admin Reconciliation (new)
  adminReconciliationPending: (page = 1, paymentMethod?: string) =>
    fetchAPI(`/admin/reconciliation/pending?page=${page}${paymentMethod ? `&paymentMethod=${paymentMethod}` : ''}`),
  adminReconciliationConfirm: (id: number, notes?: string) =>
    fetchAPI(`/admin/reconciliation/${id}/confirm`, { method: 'POST', body: JSON.stringify({ notes }) }),
  adminReconciliationReject: (id: number, reason: string) =>
    fetchAPI(`/admin/reconciliation/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
  adminReconciliationStats: () => fetchAPI('/admin/reconciliation/stats'),
  adminCashDepositsPending: () => fetchAPI('/admin/reconciliation/cash-deposits/pending'),
  adminCashDepositConfirm: (id: number, notes?: string) =>
    fetchAPI(`/admin/reconciliation/cash-deposits/${id}/confirm`, { method: 'POST', body: JSON.stringify({ notes }) }),
  adminCashDepositReject: (id: number, reason: string) =>
    fetchAPI(`/admin/reconciliation/cash-deposits/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),

  // Export
  adminExportExcel: async (months = 6) => {
    const res = await fetchBlob(`/admin/reports/export/excel?months=${months}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ccbmart-report-${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  },
  adminExportPdf: async (months = 6) => {
    const res = await fetchBlob(`/admin/reports/export/pdf?months=${months}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  },

  // Member
  memberRegister: (data: { email: string; password: string; name: string; phone: string; depositAmount?: number; referralCode?: string }) =>
    fetchAPI('/members/register', { method: 'POST', body: JSON.stringify(data) }),
  memberWallet: () => fetchAPI('/members/wallet'),
  memberDeposit: (data: { amount: number; method: string }) =>
    fetchAPI('/members/deposit', { method: 'POST', body: JSON.stringify(data) }),
  memberTransactions: (page = 1) => fetchAPI(`/members/transactions?page=${page}`),
  memberReferralStats: () => fetchAPI('/members/referral-stats'),
  memberRedeemCode: (code: string) =>
    fetchAPI('/members/redeem-code', { method: 'POST', body: JSON.stringify({ code }) }),

  // Admin Membership
  adminMembershipTiers: () => fetchAPI('/admin/membership/tiers'),
  adminUpdateTier: (id: number, data: Record<string, unknown>) =>
    fetchAPI(`/admin/membership/tiers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  adminMemberDeposits: (page = 1, status?: string) =>
    fetchAPI(`/admin/membership/deposits?page=${page}${status ? `&status=${status}` : ''}`),
  adminConfirmMemberDeposit: (id: number) =>
    fetchAPI(`/admin/membership/deposits/${id}/confirm`, { method: 'POST' }),
  adminRejectMemberDeposit: (id: number, reason: string) =>
    fetchAPI(`/admin/membership/deposits/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
  adminReferralReport: (month?: string) =>
    fetchAPI(`/admin/membership/referral-report${month ? `?month=${month}` : ''}`),
  adminMemberWallets: (page = 1) => fetchAPI(`/admin/membership/wallets?page=${page}`),

  // Push notifications
  subscribePush: (subscription: any) =>
    fetchAPI('/notifications/subscribe', { method: 'POST', body: JSON.stringify({ subscription }) }),
  unsubscribePush: (endpoint: string) =>
    fetchAPI('/notifications/unsubscribe', { method: 'POST', body: JSON.stringify({ endpoint }) }),

  // Payment
  createMomoPayment: (amount: number, depositId: number) =>
    fetchAPI('/payment/momo/create', { method: 'POST', body: JSON.stringify({ amount, depositId }) }),
  createZaloPayPayment: (amount: number, depositId: number) =>
    fetchAPI('/payment/zalopay/create', { method: 'POST', body: JSON.stringify({ amount, depositId }) }),

  // Import
  adminImportCtv: (formData: FormData) => fetchMultipart('/admin/import/ctv', formData),
  adminImportProducts: (formData: FormData) => fetchMultipart('/admin/import/products', formData),
  adminImportMembers: (formData: FormData) => fetchMultipart('/admin/import/members', formData),
  adminImportLogs: () => fetchAPI('/admin/import/logs'),
  adminDownloadTemplate: async (type: string) => {
    const res = await fetchBlob(`/admin/import/templates/${type}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `template_${type}.xlsx`; a.click();
    URL.revokeObjectURL(url);
  },

  // Notifications
  notifications: (page = 1, unreadOnly = false) =>
    fetchAPI(`/notifications?page=${page}&unreadOnly=${unreadOnly}`),
  markNotificationRead: (id: number) =>
    fetchAPI(`/notifications/${id}/read`, { method: 'POST' }),
  markAllNotificationsRead: () =>
    fetchAPI('/notifications/read-all', { method: 'POST' }),

  // V12.2: eKYC
  ctvKycStatus: () => fetchAPI('/kyc/status'),
  ctvKycSubmit: (data: { idNumber: string; idFrontImage: string; idBackImage: string }) =>
    fetchAPI('/kyc/submit', { method: 'POST', body: JSON.stringify(data) }),
  adminKycPending: () => fetchAPI('/admin/kyc/pending'),
  adminKycVerify: (userId: number, approved: boolean, reason?: string) =>
    fetchAPI(`/admin/kyc/verify/${userId}`, { method: 'POST', body: JSON.stringify({ approved, reason }) }),

  // V12.2: Invoices & Auto-Transfer
  adminInvoices: (page = 1, status?: string) =>
    fetchAPI(`/admin/invoices?page=${page}${status ? `&status=${status}` : ''}`),
  adminProcessMonthlyTransfer: (month: number, year: number) =>
    fetchAPI('/admin/invoices/process-monthly', { method: 'POST', body: JSON.stringify({ month, year }) }),
  adminTransfers: (page = 1, status?: string) =>
    fetchAPI(`/admin/transfers?page=${page}${status ? `&status=${status}` : ''}`),
  adminInvoicePdf: (id: number) => fetchAPI(`/admin/invoices/${id}/pdf`),
  adminTerminateContract: (id: number, reason: string) =>
    fetchAPI(`/admin/contracts/${id}/terminate`, { method: 'POST', body: JSON.stringify({ reason }) }),
  ctvInvoices: () => fetchAPI('/ctv/invoices/my'),

  // V12.2: Tax
  adminTax: (month?: string, status?: string) => {
    const params = new URLSearchParams();
    if (month) params.set('month', month);
    if (status) params.set('status', status);
    const qs = params.toString();
    return fetchAPI(`/admin/tax${qs ? `?${qs}` : ''}`);
  },
  adminTaxProcess: (month: string) =>
    fetchAPI('/admin/tax/process', { method: 'POST', body: JSON.stringify({ month }) }),
  adminTaxMarkPaid: (id: number) =>
    fetchAPI(`/admin/tax/mark-paid/${id}`, { method: 'POST' }),
  adminTaxReport: (hkdId: number, month: string) =>
    fetchAPI(`/admin/tax/report/${hkdId}?month=${month}`),
  ctvTaxPreview: (month: string) => fetchAPI(`/ctv/tax/preview?month=${month}`),

  // V12.2: Monthly Report
  ctvMonthlyReport: (month: string) => fetchAPI(`/ctv/monthly-report?month=${month}`),

  // C12.4: Management fees (F1/F2/F3) & breakaway fees
  ctvManagementFees: (month: string) => fetchAPI(`/ctv/management-fees?month=${month}`),
  ctvBreakawayFees: (month: string) => fetchAPI(`/ctv/breakaway-fees?month=${month}`),
  adminManagementFees: (params: { month?: string; level?: number; status?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.month) qs.set('month', params.month);
    if (params.level) qs.set('level', String(params.level));
    if (params.status) qs.set('status', params.status);
    const s = qs.toString();
    return fetchAPI(`/admin/management-fees${s ? `?${s}` : ''}`);
  },
  adminProcessManagementFees: (month: string) =>
    fetchAPI('/admin/management-fees/process-monthly', {
      method: 'POST',
      body: JSON.stringify({ month }),
    }),
  adminMarkManagementFeePaid: (id: number) =>
    fetchAPI(`/admin/management-fees/${id}/mark-paid`, { method: 'POST' }),
  adminBreakawayLogs: (status?: string) =>
    fetchAPI(`/admin/breakaway-logs${status ? `?status=${status}` : ''}`),
  adminBreakawayFees: (params: { month?: string; level?: number; status?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.month) qs.set('month', params.month);
    if (params.level) qs.set('level', String(params.level));
    if (params.status) qs.set('status', params.status);
    const s = qs.toString();
    return fetchAPI(`/admin/breakaway-fees${s ? `?${s}` : ''}`);
  },
  adminProcessBreakawayFees: (month: string) =>
    fetchAPI('/admin/breakaway/process-monthly', {
      method: 'POST',
      body: JSON.stringify({ month }),
    }),
  adminMarkBreakawayFeePaid: (id: number) =>
    fetchAPI(`/admin/breakaway-fees/${id}/mark-paid`, { method: 'POST' }),

  // C12.3: Failover & manual override
  adminFailoverSummary: () => fetchAPI('/admin/failover/summary'),
  adminRetryTransfer: (id: number) =>
    fetchAPI(`/admin/failover/transfers/${id}/retry`, { method: 'POST' }),
  adminMarkTransferSuccess: (id: number, adminNote?: string) =>
    fetchAPI(`/admin/failover/transfers/${id}/mark-success`, {
      method: 'POST',
      body: JSON.stringify({ adminNote }),
    }),
  adminMarkTransferFailed: (id: number, reason?: string) =>
    fetchAPI(`/admin/failover/transfers/${id}/mark-failed`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  adminResendOtp: (trainingLogId: number, method: string = 'SMS') =>
    fetchAPI(`/admin/failover/training/${trainingLogId}/resend-otp`, {
      method: 'POST',
      body: JSON.stringify({ method }),
    }),
  adminVerifyTrainingManual: (trainingLogId: number, reason?: string) =>
    fetchAPI(`/admin/failover/training/${trainingLogId}/verify-manual`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  adminVerifyKycManual: (userId: number, approved: boolean, reason?: string) =>
    fetchAPI(`/admin/failover/kyc/${userId}/verify-manual`, {
      method: 'POST',
      body: JSON.stringify({ approved, reason }),
    }),
  adminMarkInvoiceIssued: (id: number, data: { externalId?: string; pdfUrl?: string; reason?: string }) =>
    fetchAPI(`/admin/failover/invoices/${id}/mark-issued`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // C13.3.1: Audit log viewer
  adminAuditLogs: (params: {
    page?: number;
    limit?: number;
    userId?: number;
    action?: string;
    targetType?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  } = {}) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.userId) qs.set('userId', String(params.userId));
    if (params.action) qs.set('action', params.action);
    if (params.targetType) qs.set('targetType', params.targetType);
    if (params.status) qs.set('status', params.status);
    if (params.dateFrom) qs.set('dateFrom', params.dateFrom);
    if (params.dateTo) qs.set('dateTo', params.dateTo);
    if (params.search) qs.set('search', params.search);
    const s = qs.toString();
    return fetchAPI(`/admin/audit-logs${s ? `?${s}` : ''}`);
  },
  adminAuditLogActions: () => fetchAPI('/admin/audit-logs/actions'),
  logout: () => fetchAPI('/auth/logout', { method: 'POST' }),
};

export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('vi-VN').format(n);
}

export function getUser() {
  if (typeof window === 'undefined') return null;
  const u = localStorage.getItem('user');
  return u ? JSON.parse(u) : null;
}

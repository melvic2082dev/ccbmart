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

  appConfig: (): Promise<{ comboPrice: number }> => fetchAPI('/config'),

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
  ctvTransactionHistory: (
    page = 1,
    opts: { status?: string; search?: string; paymentMethod?: string; sortBy?: string; sortDir?: string } = {},
  ) => {
    const p = new URLSearchParams({ page: String(page) });
    if (opts.status) p.set('status', opts.status);
    if (opts.search) p.set('search', opts.search);
    if (opts.paymentMethod) p.set('paymentMethod', opts.paymentMethod);
    if (opts.sortBy) p.set('sortBy', opts.sortBy);
    if (opts.sortDir) p.set('sortDir', opts.sortDir);
    return fetchAPI(`/ctv/transactions/history?${p.toString()}`);
  },
  ctvUploadProof: (txId: number, formData: FormData) =>
    fetchMultipart(`/ctv/transactions/${txId}/upload-proof`, formData),
  ctvPendingCash: () => fetchAPI('/ctv/transactions/pending-cash'),
  ctvCreateCashDeposit: (transactionIds: number[], notes?: string) =>
    fetchAPI('/ctv/transactions/cash-deposit', { method: 'POST', body: JSON.stringify({ transactionIds, notes }) }),
  ctvPendingCount: () => fetchAPI('/ctv/transactions/pending-count'),

  // CTV V10
  ctvLoyaltyPoints: () => fetchAPI('/ctv/loyalty-points'),
  ctvPromotionStatus: () => fetchAPI('/ctv/promotion-status'),
  ctvTeamBonus: () => fetchAPI('/ctv/team-bonus'),

  // Agency
  agencyDashboard: () => fetchAPI('/agency/dashboard'),
  agencyInventory: () => fetchAPI('/agency/inventory'),
  agencyTransactions: (page = 1) => fetchAPI(`/agency/transactions?page=${page}`),

  // Admin: user management (super_admin only)
  adminUsers: () => fetchAPI('/admin/users'),
  adminCreateUser: (data: { email: string; name: string; phone?: string; role: string; password: string }) =>
    fetchAPI('/admin/users', { method: 'POST', body: JSON.stringify(data) }),
  adminUpdateUserRole: (id: number, role: string) =>
    fetchAPI(`/admin/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  adminToggleUserActive: (id: number) =>
    fetchAPI(`/admin/users/${id}/toggle-active`, { method: 'PATCH' }),

  // Admin
  adminDashboard: () => fetchAPI('/admin/dashboard'),
  adminCtvs: () => fetchAPI('/admin/ctvs'),
  adminCtvTree: () => fetchAPI('/admin/ctv-tree'),
  adminCtvDetails: (id: number) => fetchAPI(`/admin/ctv/${id}/details`),
  adminCtvReassign: (id: number, newParentId: number | null, reason?: string) =>
    fetchAPI(`/admin/ctv/${id}/reassign`, { method: 'POST', body: JSON.stringify({ newParentId, reason }) }),
  adminBulkNotify: (data: { userIds: number[]; title: string; content: string; type?: string }) =>
    fetchAPI('/admin/notifications/bulk', { method: 'POST', body: JSON.stringify(data) }),
  adminCtvChangeRank: (
    id: number,
    newRank: string,
    reason?: string,
    salary?: { fixedSalaryEnabled?: boolean; fixedSalaryStartDate?: string | null },
  ) =>
    fetchAPI(`/admin/ctv/${id}/rank`, {
      method: 'POST',
      body: JSON.stringify({ newRank, reason, ...(salary || {}) }),
    }),
  adminCtvSalaryConfig: (
    id: number,
    payload: { fixedSalaryEnabled: boolean; fixedSalaryStartDate?: string | null; reason?: string },
  ) =>
    fetchAPI(`/admin/ctv/${id}/salary-config`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  adminCtvToggleActive: (id: number, isActive: boolean, reason?: string) =>
    fetchAPI(`/admin/ctv/${id}/toggle-active`, { method: 'POST', body: JSON.stringify({ isActive, reason }) }),
  adminCtvCreate: (data: Record<string, unknown>) =>
    fetchAPI('/admin/ctv', { method: 'POST', body: JSON.stringify(data) }),
  adminCtvUpdateProfile: (id: number, data: { name?: string; phone?: string; bio?: string | null; birthYear?: number | null }) =>
    fetchAPI(`/admin/ctv/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  adminCtvUploadAvatar: (id: number, file: File) => {
    const fd = new FormData();
    fd.append('avatar', file);
    return fetchMultipart(`/admin/ctv/${id}/avatar`, fd);
  },
  adminCtvDeleteAvatar: (id: number) =>
    fetchAPI(`/admin/ctv/${id}/avatar`, { method: 'DELETE' }),
  // Resolve a /uploads/... relative URL to absolute (so <img> can fetch
  // it directly from the backend).
  resolveUploadUrl: (url: string | null | undefined): string | null => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api').replace(/\/api\/?$/, '');
    return base + url;
  },
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
  adminDashboardTargets: () => fetchAPI('/admin/dashboard-targets'),
  adminTaxExportXmlUrl: (month: string) => `${API_BASE}/admin/tax/export-xml?month=${month}`,
  ctvUploadKycFile: (formData: FormData) => fetchMultipart('/uploads/kyc', formData),
  adminSync: () => fetchAPI('/admin/sync', { method: 'POST' }),
  adminRunRankEvaluation: () => fetchAPI('/admin/rank-evaluation', { method: 'POST' }),

  // Admin V10: Promotions
  adminPromotionsPending: () => fetchAPI('/admin/promotions/pending'),
  adminApprovePromotion: (id: number) =>
    fetchAPI(`/admin/promotions/${id}/approve`, { method: 'POST' }),
  adminActivatePromotions: () =>
    fetchAPI('/admin/promotions/activate', { method: 'POST' }),

  // Admin V10: Soft Salary
  adminSoftSalary: (month?: string) =>
    fetchAPI(`/admin/salary/soft-adjustment${month ? `?month=${month}` : ''}`),

  // Admin V10: Team Bonus
  adminTeamBonus: (month: string) => fetchAPI(`/admin/team-bonus/${month}`),
  adminCalculateTeamBonus: (month: string) =>
    fetchAPI(`/admin/team-bonus/${month}/calculate`, { method: 'POST' }),

  // Admin V10: Professional Titles
  adminTitles: () => fetchAPI('/admin/titles'),
  adminAwardTitle: (userId: number, title: string) =>
    fetchAPI('/admin/titles/award', { method: 'POST', body: JSON.stringify({ userId, title }) }),

  // Admin Reconciliation
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
  adminMemberWallets: (params: { page?: number; tierId?: number; search?: string; status?: 'active' | 'locked' } = {}) => {
    const qs = new URLSearchParams();
    qs.set('page', String(params.page ?? 1));
    if (params.tierId) qs.set('tierId', String(params.tierId));
    if (params.search) qs.set('search', params.search);
    if (params.status) qs.set('status', params.status);
    return fetchAPI(`/admin/membership/wallets?${qs.toString()}`);
  },

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

  // V13.4: Invoices (CCB Mart → partner) + Partner Payout Engine
  adminInvoices: (page = 1, status?: string) =>
    fetchAPI(`/admin/invoices?page=${page}${status ? `&status=${status}` : ''}`),
  adminProcessMonthlyPayout: (month: number, year: number) =>
    fetchAPI('/admin/invoices/process-monthly', { method: 'POST', body: JSON.stringify({ month, year }) }),
  adminPaymentLogs: (params: { month?: string; status?: string; page?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.month) qs.set('month', params.month);
    if (params.status) qs.set('status', params.status);
    if (params.page) qs.set('page', String(params.page));
    const s = qs.toString();
    return fetchAPI(`/admin/payment-logs${s ? `?${s}` : ''}`);
  },
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

  // Landing CMS — public read
  landingContent: () => fetchAPI('/landing/content'),

  // Landing CMS — admin (super_admin + ops_admin)
  adminLandingCms: () => fetchAPI('/admin/landing-cms'),
  adminLandingUploadImage: (formData: FormData) =>
    fetchMultipart('/admin/landing-cms/upload', formData),
  adminLandingUpdateHero: (data: Record<string, unknown>) =>
    fetchAPI('/admin/landing-cms/hero', { method: 'PUT', body: JSON.stringify(data) }),
  adminLandingUpdatePromo: (data: Record<string, unknown>) =>
    fetchAPI('/admin/landing-cms/promo', { method: 'PUT', body: JSON.stringify(data) }),
  adminLandingCreateTrustItem: (data: Record<string, unknown>) =>
    fetchAPI('/admin/landing-cms/trust-items', { method: 'POST', body: JSON.stringify(data) }),
  adminLandingUpdateTrustItem: (id: number, data: Record<string, unknown>) =>
    fetchAPI(`/admin/landing-cms/trust-items/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  adminLandingDeleteTrustItem: (id: number) =>
    fetchAPI(`/admin/landing-cms/trust-items/${id}`, { method: 'DELETE' }),
  adminLandingCreateFeatured: (data: Record<string, unknown>) =>
    fetchAPI('/admin/landing-cms/featured-products', { method: 'POST', body: JSON.stringify(data) }),
  adminLandingUpdateFeatured: (id: number, data: Record<string, unknown>) =>
    fetchAPI(`/admin/landing-cms/featured-products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  adminLandingDeleteFeatured: (id: number) =>
    fetchAPI(`/admin/landing-cms/featured-products/${id}`, { method: 'DELETE' }),

  // Catalog products CRUD
  adminLandingProducts: (params: { search?: string; category?: string; page?: number; limit?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.search) qs.set('search', params.search);
    if (params.category) qs.set('category', params.category);
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    const s = qs.toString();
    return fetchAPI(`/admin/landing-cms/products${s ? `?${s}` : ''}`);
  },
  adminLandingCreateProduct: (data: Record<string, unknown>) =>
    fetchAPI('/admin/landing-cms/products', { method: 'POST', body: JSON.stringify(data) }),
  adminLandingUpdateProduct: (id: number, data: Record<string, unknown>) =>
    fetchAPI(`/admin/landing-cms/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  adminLandingDeleteProduct: (id: number) =>
    fetchAPI(`/admin/landing-cms/products/${id}`, { method: 'DELETE' }),

  // Catalog categories CRUD
  adminLandingCategories: () => fetchAPI('/admin/landing-cms/categories'),
  adminLandingCreateCategory: (data: Record<string, unknown>) =>
    fetchAPI('/admin/landing-cms/categories', { method: 'POST', body: JSON.stringify(data) }),
  adminLandingUpdateCategory: (id: number, data: Record<string, unknown>) =>
    fetchAPI(`/admin/landing-cms/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  adminLandingDeleteCategory: (id: number) =>
    fetchAPI(`/admin/landing-cms/categories/${id}`, { method: 'DELETE' }),

  // Why-Us
  adminLandingUpdateWhyUs: (data: Record<string, unknown>) =>
    fetchAPI('/admin/landing-cms/why-us', { method: 'PUT', body: JSON.stringify(data) }),

  // Header / Footer chrome
  adminLandingUpdateHeader: (data: Record<string, unknown>) =>
    fetchAPI('/admin/landing-cms/header', { method: 'PUT', body: JSON.stringify(data) }),
  adminLandingUpdateFooter: (data: Record<string, unknown>) =>
    fetchAPI('/admin/landing-cms/footer', { method: 'PUT', body: JSON.stringify(data) }),

  // Community photos
  adminLandingCommunityPhotos: () => fetchAPI('/admin/landing-cms/community-photos'),
  adminLandingCreateCommunityPhoto: (data: Record<string, unknown>) =>
    fetchAPI('/admin/landing-cms/community-photos', { method: 'POST', body: JSON.stringify(data) }),
  adminLandingUpdateCommunityPhoto: (id: number, data: Record<string, unknown>) =>
    fetchAPI(`/admin/landing-cms/community-photos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  adminLandingDeleteCommunityPhoto: (id: number) =>
    fetchAPI(`/admin/landing-cms/community-photos/${id}`, { method: 'DELETE' }),

  // Fund entries
  adminLandingFundEntries: () => fetchAPI('/admin/landing-cms/fund-entries'),
  adminLandingCreateFundEntry: (data: Record<string, unknown>) =>
    fetchAPI('/admin/landing-cms/fund-entries', { method: 'POST', body: JSON.stringify(data) }),
  adminLandingUpdateFundEntry: (id: number, data: Record<string, unknown>) =>
    fetchAPI(`/admin/landing-cms/fund-entries/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  adminLandingDeleteFundEntry: (id: number) =>
    fetchAPI(`/admin/landing-cms/fund-entries/${id}`, { method: 'DELETE' }),

  // Testimonials
  adminLandingTestimonials: () => fetchAPI('/admin/landing-cms/testimonials'),
  adminLandingCreateTestimonial: (data: Record<string, unknown>) =>
    fetchAPI('/admin/landing-cms/testimonials', { method: 'POST', body: JSON.stringify(data) }),
  adminLandingUpdateTestimonial: (id: number, data: Record<string, unknown>) =>
    fetchAPI(`/admin/landing-cms/testimonials/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  adminLandingDeleteTestimonial: (id: number) =>
    fetchAPI(`/admin/landing-cms/testimonials/${id}`, { method: 'DELETE' }),

  // ============================================================
  // v3.1: Product M0 — Products / Variants / Suppliers / Inventory
  // ============================================================
  adminProductsList: (params: Record<string, string | number> = {}) => {
    const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
    return fetchAPI(`/admin/products${qs ? '?' + qs : ''}`);
  },
  adminProductGet: (id: number) => fetchAPI(`/admin/products/${id}`),
  adminProductCreate: (data: Record<string, unknown>) =>
    fetchAPI('/admin/products', { method: 'POST', body: JSON.stringify(data) }),
  adminProductUpdate: (id: number, data: Record<string, unknown>) =>
    fetchAPI(`/admin/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  adminVariantCreate: (productId: number, data: Record<string, unknown>) =>
    fetchAPI(`/admin/products/${productId}/variants`, { method: 'POST', body: JSON.stringify(data) }),
  adminVariantUpdate: (id: number, data: Record<string, unknown>) =>
    fetchAPI(`/admin/variants/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  adminBatchReceive: (variantId: number, data: Record<string, unknown>) =>
    fetchAPI(`/admin/variants/${variantId}/batches`, { method: 'POST', body: JSON.stringify(data) }),
  adminInventoryList: (params: Record<string, string | number> = {}) => {
    const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
    return fetchAPI(`/admin/inventory${qs ? '?' + qs : ''}`);
  },
  adminSuppliersList: (params: Record<string, string | number> = {}) => {
    const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
    return fetchAPI(`/admin/suppliers${qs ? '?' + qs : ''}`);
  },
  adminSupplierCreate: (data: Record<string, unknown>) =>
    fetchAPI('/admin/suppliers', { method: 'POST', body: JSON.stringify(data) }),
  adminSupplierUpdate: (id: number, data: Record<string, unknown>) =>
    fetchAPI(`/admin/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  adminSupplierDeactivate: (id: number) => fetchAPI(`/admin/suppliers/${id}`, { method: 'DELETE' }),

  // ============================================================
  // v3.1: CRM Lightweight — Leads + Activities
  // ============================================================
  ctvLeadsList: (params: Record<string, string | number> = {}) => {
    const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
    return fetchAPI(`/ctv/leads${qs ? '?' + qs : ''}`);
  },
  ctvLeadsToday: () => fetchAPI('/ctv/leads/today'),
  ctvLeadGet: (id: number) => fetchAPI(`/ctv/leads/${id}`),
  ctvLeadCreate: (data: Record<string, unknown>) =>
    fetchAPI('/ctv/leads', { method: 'POST', body: JSON.stringify(data) }),
  ctvLeadUpdate: (id: number, data: Record<string, unknown>) =>
    fetchAPI(`/ctv/leads/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  ctvLeadAddActivity: (id: number, data: Record<string, unknown>) =>
    fetchAPI(`/ctv/leads/${id}/activities`, { method: 'POST', body: JSON.stringify(data) }),
  ctvLeadChangeStage: (id: number, stage: string, lostReason?: string) =>
    fetchAPI(`/ctv/leads/${id}/stage`, { method: 'POST', body: JSON.stringify({ stage, lostReason }) }),
  ctvLeadConvert: (id: number) =>
    fetchAPI(`/ctv/leads/${id}/convert`, { method: 'POST', body: '{}' }),
  adminLeadsList: (params: Record<string, string | number> = {}) => {
    const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
    return fetchAPI(`/admin/leads${qs ? '?' + qs : ''}`);
  },
  adminLeadsConversionReport: (params: Record<string, string | number> = {}) => {
    const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
    return fetchAPI(`/admin/reports/conversion${qs ? '?' + qs : ''}`);
  },
  // v3.3 CRUD additions
  adminLeadCreate: (data: Record<string, unknown>) =>
    fetchAPI('/admin/leads', { method: 'POST', body: JSON.stringify(data) }),
  adminLeadUpdate: (id: number, data: Record<string, unknown>) =>
    fetchAPI(`/admin/leads/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  adminLeadDelete: (id: number) =>
    fetchAPI(`/admin/leads/${id}`, { method: 'DELETE' }),
  adminWarehousesList: () => fetchAPI('/admin/warehouses'),
  adminCtvsList: () => fetchAPI('/admin/ctvs'),

  // ============================================================
  // v3.3: Order flow — Warehouse + CTV orders
  // ============================================================
  warehouseDashboard: () => fetchAPI('/warehouse/dashboard'),
  warehousePendingInventory: () => fetchAPI('/warehouse/orders/pending-inventory'),
  warehouseAwaitingPacking:  () => fetchAPI('/warehouse/orders/awaiting-packing'),
  warehousePacking:          () => fetchAPI('/warehouse/orders/packing'),
  warehouseAwaitingPickup:   () => fetchAPI('/warehouse/orders/awaiting-pickup'),
  warehouseConfirmInventory: (id: number, note?: string) =>
    fetchAPI(`/warehouse/orders/${id}/confirm-inventory`, { method: 'POST', body: JSON.stringify({ note }) }),
  warehouseRejectInventory: (id: number, reason: string) =>
    fetchAPI(`/warehouse/orders/${id}/reject-inventory`, { method: 'POST', body: JSON.stringify({ reason }) }),
  warehouseStartPacking: (id: number) =>
    fetchAPI(`/warehouse/orders/${id}/start-packing`, { method: 'POST' }),
  warehouseFinishPacking: (id: number) =>
    fetchAPI(`/warehouse/orders/${id}/finish-packing`, { method: 'POST' }),

  ctvOrderGet: (id: number) => fetchAPI(`/ctv/orders/${id}`),
  ctvOrdersList: (status?: string) => fetchAPI(`/ctv/orders${status ? `?status=${status}` : ''}`),
  ctvOrderDraft: (data: Record<string, unknown>) =>
    fetchAPI('/ctv/orders/draft', { method: 'POST', body: JSON.stringify(data) }),
  ctvOrderPickup: (id: number, pickupCode: string) =>
    fetchAPI(`/ctv/orders/${id}/pickup`, { method: 'POST', body: JSON.stringify({ pickupCode }) }),
  ctvOrderStartDelivery: (id: number) =>
    fetchAPI(`/ctv/orders/${id}/start-delivery`, { method: 'POST' }),
  ctvOrderRequestOtp: (id: number) =>
    fetchAPI(`/ctv/orders/${id}/request-otp`, { method: 'POST' }),
  ctvOrderVerifyOtp: (id: number, code: string) =>
    fetchAPI(`/ctv/orders/${id}/verify-otp`, { method: 'POST', body: JSON.stringify({ code }) }),
  ctvOrderUploadSignature: (id: number, file: File) => {
    const fd = new FormData();
    fd.append('signature', file);
    return fetchMultipart(`/ctv/orders/${id}/upload-signature`, fd);
  },
  ctvOrderCancel: (id: number, reason?: string) =>
    fetchAPI(`/ctv/orders/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),

  // Mock payment webhook trigger (admin/dev only)
  paymentWebhookDev: (transactionId: number) =>
    fetchAPI(`/payments/webhook?dev=1`, { method: 'POST', body: JSON.stringify({ transactionId, amount: 0 }) }),
};

export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

// Compact VND format for tight mobile cards: 1.234.567.890 → "1.2tỷ", 450.000.000 → "450tr"
export function formatVNDCompact(amount: number): string {
  const n = Number(amount) || 0;
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(abs >= 10_000_000_000 ? 0 : 1).replace(/\.0$/, '')} tỷ`;
  if (abs >= 1_000_000)     return `${sign}${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1).replace(/\.0$/, '')} tr`;
  if (abs >= 1_000)         return `${sign}${(abs / 1_000).toFixed(0)}k`;
  return `${sign}${abs} đ`;
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('vi-VN').format(n);
}

export function getUser() {
  if (typeof window === 'undefined') return null;
  const u = localStorage.getItem('user');
  return u ? JSON.parse(u) : null;
}

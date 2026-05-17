// Mirror of backend/src/lib/permissions.js — keep in sync.
// Code-driven RBAC: 6 admin sub-roles + 3 special roles. Granularity = menu item.

export const SUPER_ADMIN = 'super_admin';
export const OPS_ADMIN = 'ops_admin';
export const PARTNER_ADMIN = 'partner_admin';
export const MEMBER_ADMIN = 'member_admin';
export const TRAINING_ADMIN = 'training_admin';
export const FINANCE_ADMIN = 'finance_admin';

export const ADMIN_ROLES = [
  SUPER_ADMIN,
  OPS_ADMIN,
  PARTNER_ADMIN,
  MEMBER_ADMIN,
  TRAINING_ADMIN,
  FINANCE_ADMIN,
] as const;

export const SPECIAL_ROLES = ['ctv', 'agency', 'member', 'warehouse_staff'] as const;

export type AdminRole = typeof ADMIN_ROLES[number];
export type SpecialRole = typeof SPECIAL_ROLES[number];
export type Role = AdminRole | SpecialRole;
export type RoleGroup = 'admin' | SpecialRole;

export const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  ops_admin: 'Quản lý vận hành',
  partner_admin: 'Quản lý đối tác',
  member_admin: 'Quản lý thành viên',
  training_admin: 'Quản lý đào tạo',
  finance_admin: 'Quản lý tài chính',
  ctv: 'CTV',
  agency: 'Đại lý',
  member: 'Thành viên',
  warehouse_staff: 'Thủ kho',
};

export function isAdminRole(role: string): role is AdminRole {
  return (ADMIN_ROLES as readonly string[]).includes(role);
}

export function getRoleGroup(role: string): RoleGroup | null {
  if (isAdminRole(role)) return 'admin';
  if ((SPECIAL_ROLES as readonly string[]).includes(role)) return role as SpecialRole;
  return null;
}

// Map menu item href → admin sub-roles allowed (excluding super_admin which sees everything).
export const MENU_ROLE_ACCESS: Record<string, AdminRole[]> = {
  '/admin/dashboard':            [OPS_ADMIN],
  '/admin/reconciliation':       [OPS_ADMIN],
  '/admin/products':             [PARTNER_ADMIN, OPS_ADMIN],
  '/admin/inventory':            [PARTNER_ADMIN, OPS_ADMIN],
  '/admin/warehouses':           [OPS_ADMIN],
  '/admin/suppliers':            [PARTNER_ADMIN, OPS_ADMIN],
  '/admin/leads':                [PARTNER_ADMIN, OPS_ADMIN],
  '/admin/reports/conversion':   [OPS_ADMIN, FINANCE_ADMIN],
  // v3.3 Warehouse pages (admin overview — warehouse_staff sees them via navByRole)
  '/warehouse/dashboard':         [OPS_ADMIN],
  '/warehouse/pending-inventory': [OPS_ADMIN],
  '/warehouse/packing':           [OPS_ADMIN],
  '/warehouse/awaiting-pickup':   [OPS_ADMIN],
  '/admin/ctv':                  [PARTNER_ADMIN],
  '/admin/agencies':             [PARTNER_ADMIN],
  '/admin/business-household':   [PARTNER_ADMIN],
  '/admin/breakaway-logs':       [PARTNER_ADMIN],
  '/admin/membership/wallets':   [MEMBER_ADMIN],
  '/admin/membership/deposits':  [MEMBER_ADMIN],
  '/admin/membership/tiers':     [MEMBER_ADMIN],
  '/admin/fee-config':           [TRAINING_ADMIN],
  '/admin/training-logs':        [TRAINING_ADMIN],
  '/admin/management-fees':      [TRAINING_ADMIN, FINANCE_ADMIN],
  '/admin/salary-report':        [TRAINING_ADMIN, FINANCE_ADMIN],
  '/admin/invoices':             [FINANCE_ADMIN, OPS_ADMIN],
  '/admin/payment-logs':         [FINANCE_ADMIN, OPS_ADMIN],
  '/admin/tax':                  [FINANCE_ADMIN],
  '/admin/kyc':                  [TRAINING_ADMIN, OPS_ADMIN],
  '/admin/import':               [OPS_ADMIN],
  '/admin/config':               [OPS_ADMIN],
  '/admin/reports':              [OPS_ADMIN, FINANCE_ADMIN],
  '/admin/notifications':        [OPS_ADMIN],
  '/admin/users':                [], // super_admin only
  '/admin/landing-cms':          [OPS_ADMIN],
  // Settings — every admin sub-role can access their own preferences
  '/admin/settings':             [OPS_ADMIN, PARTNER_ADMIN, MEMBER_ADMIN, TRAINING_ADMIN, FINANCE_ADMIN],
};

export function canAccessMenu(role: string, href: string): boolean {
  if (role === SUPER_ADMIN) return true;
  const allowed = MENU_ROLE_ACCESS[href];
  if (!allowed) return false;
  return allowed.includes(role as AdminRole);
}

// Where each role lands after login.
export function getDashboardHref(role: string): string {
  const group = getRoleGroup(role);
  if (group === 'admin') {
    if (role === SUPER_ADMIN) return '/admin/users';
    if (role === OPS_ADMIN) return '/admin/dashboard';
    if (role === PARTNER_ADMIN) return '/admin/ctv';
    if (role === MEMBER_ADMIN) return '/admin/membership/wallets';
    if (role === TRAINING_ADMIN) return '/admin/training-logs';
    if (role === FINANCE_ADMIN) return '/admin/invoices';
    return '/admin/dashboard';
  }
  if (group) return `/${group}/dashboard`;
  return '/login';
}

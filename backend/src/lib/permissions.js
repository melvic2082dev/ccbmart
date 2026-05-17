// =======================================================================
// V13.4+ Role-based permissions (DesignMax pattern: code-driven, role-centric)
// -----------------------------------------------------------------------
// Admin role được chia thành 6 sub-roles, mỗi sub-role có set menu cố định.
// 3 special roles giữ nguyên: ctv, agency, member.
// Granularity ở mức MENU ITEM. KHÔNG có entity Permission riêng.
// =======================================================================

const SUPER_ADMIN = 'super_admin';
const OPS_ADMIN = 'ops_admin';
const PARTNER_ADMIN = 'partner_admin';
const MEMBER_ADMIN = 'member_admin';
const TRAINING_ADMIN = 'training_admin';
const FINANCE_ADMIN = 'finance_admin';

const ADMIN_ROLES = [
  SUPER_ADMIN,
  OPS_ADMIN,
  PARTNER_ADMIN,
  MEMBER_ADMIN,
  TRAINING_ADMIN,
  FINANCE_ADMIN,
];

const SPECIAL_ROLES = ['ctv', 'agency', 'member', 'warehouse_staff'];

const ALL_ROLES = [...ADMIN_ROLES, ...SPECIAL_ROLES];

const ROLE_LABELS = {
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

// Menu access matrix — mỗi menu ID liệt kê admin role nào được thấy.
// super_admin luôn có toàn quyền (xử lý riêng trong canAccessMenu).
// IDs này khớp 1-1 với menu items trong frontend Sidebar.
const MENU_ROLE_ACCESS = {
  // Vận hành
  'admin/dashboard':            [OPS_ADMIN],
  'admin/reconciliation':       [OPS_ADMIN],
  // Nhân sự & đối tác
  'admin/ctv':                  [PARTNER_ADMIN],
  'admin/agencies':             [PARTNER_ADMIN],
  'admin/business-household':   [PARTNER_ADMIN],
  'admin/breakaway-logs':       [PARTNER_ADMIN],
  // Thành viên
  'admin/membership/wallets':   [MEMBER_ADMIN],
  'admin/membership/deposits':  [MEMBER_ADMIN],
  'admin/membership/tiers':     [MEMBER_ADMIN],
  // Đào tạo & phí
  'admin/fee-config':           [TRAINING_ADMIN],
  'admin/training-logs':        [TRAINING_ADMIN],
  'admin/management-fees':      [TRAINING_ADMIN, FINANCE_ADMIN],
  'admin/salary-report':        [TRAINING_ADMIN, FINANCE_ADMIN],
  // Tài chính & thuế
  'admin/invoices':             [FINANCE_ADMIN, OPS_ADMIN],
  'admin/payment-logs':         [FINANCE_ADMIN, OPS_ADMIN],
  'admin/tax':                  [FINANCE_ADMIN],
  // Cấu hình & báo cáo
  'admin/kyc':                  [TRAINING_ADMIN, OPS_ADMIN],
  'admin/import':               [OPS_ADMIN],
  'admin/config':               [OPS_ADMIN],
  'admin/reports':              [OPS_ADMIN, FINANCE_ADMIN],
  'admin/notifications':        [OPS_ADMIN],
  // Landing CMS — super_admin và ops_admin
  'admin/landing-cms':          [OPS_ADMIN],
  // Quản trị (super_admin only)
  'admin/users':                [],
};

function isAdminRole(role) {
  return ADMIN_ROLES.includes(role);
}

function getRoleGroup(role) {
  if (isAdminRole(role)) return 'admin';
  if (SPECIAL_ROLES.includes(role)) return role;
  return null;
}

function canAccessMenu(role, menuId) {
  if (role === SUPER_ADMIN) return true;
  const allowed = MENU_ROLE_ACCESS[menuId];
  if (!allowed) return false;
  return allowed.includes(role);
}

// Chỉ super_admin được tạo/sửa/xoá user có role admin.
function canManageRole(actorRole, targetRole) {
  if (actorRole === SUPER_ADMIN) return true;
  return false;
}

module.exports = {
  SUPER_ADMIN,
  OPS_ADMIN,
  PARTNER_ADMIN,
  MEMBER_ADMIN,
  TRAINING_ADMIN,
  FINANCE_ADMIN,
  ADMIN_ROLES,
  SPECIAL_ROLES,
  ALL_ROLES,
  ROLE_LABELS,
  MENU_ROLE_ACCESS,
  isAdminRole,
  getRoleGroup,
  canAccessMenu,
  canManageRole,
};

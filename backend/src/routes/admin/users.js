const express = require('express');
const bcrypt = require('bcryptjs');
const { asyncHandler, AppError } = require('../../middleware/errorHandler');
const { authorize } = require('../../middleware/auth');
const {
  ADMIN_ROLES,
  ROLE_LABELS,
  SUPER_ADMIN,
} = require('../../lib/permissions');

const router = express.Router();
const prisma = require('../../lib/prisma');

const SUPER_ONLY = authorize(SUPER_ADMIN);

// GET /admin/users — list all admin-tier users (super_admin only)
router.get('/users', SUPER_ONLY, asyncHandler(async (_req, res) => {
  const users = await prisma.user.findMany({
    where: { role: { in: ADMIN_ROLES } },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: [{ role: 'asc' }, { createdAt: 'desc' }],
  });
  res.json({ users, roles: ADMIN_ROLES, labels: ROLE_LABELS });
}));

// POST /admin/users — create new admin user (super_admin only)
router.post('/users', SUPER_ONLY, asyncHandler(async (req, res) => {
  const { email, name, phone, role, password } = req.body;
  if (!email || !name || !role || !password) {
    throw new AppError('email, name, role, password are required', 400, 'MISSING_FIELDS');
  }
  if (!ADMIN_ROLES.includes(role)) {
    throw new AppError(`role must be one of: ${ADMIN_ROLES.join(', ')}`, 400, 'INVALID_ROLE');
  }
  if (String(password).length < 6) {
    throw new AppError('password must be at least 6 chars', 400, 'WEAK_PASSWORD');
  }
  const exists = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (exists) throw new AppError('Email already in use', 409, 'EMAIL_TAKEN');

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, name, phone: phone || '', role, passwordHash, isActive: true },
    select: { id: true, email: true, name: true, phone: true, role: true, isActive: true, createdAt: true },
  });
  res.status(201).json(user);
}));

// PATCH /admin/users/:id/role — change role of an existing admin user (super_admin only)
router.patch('/users/:id/role', SUPER_ONLY, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { role } = req.body;
  if (!ADMIN_ROLES.includes(role)) {
    throw new AppError(`role must be one of: ${ADMIN_ROLES.join(', ')}`, 400, 'INVALID_ROLE');
  }
  const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!target) throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  if (!ADMIN_ROLES.includes(target.role)) {
    throw new AppError('Cannot change role of non-admin user', 400, 'NOT_ADMIN_USER');
  }
  if (id === req.user.id && role !== SUPER_ADMIN) {
    throw new AppError('Cannot demote yourself', 400, 'CANNOT_DEMOTE_SELF');
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { role },
    select: { id: true, email: true, name: true, role: true, isActive: true },
  });
  res.json(updated);
}));

// PATCH /admin/users/:id/toggle-active — activate or deactivate (super_admin only)
router.patch('/users/:id/toggle-active', SUPER_ONLY, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true, isActive: true } });
  if (!target) throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  if (!ADMIN_ROLES.includes(target.role)) {
    throw new AppError('This endpoint is for admin users only', 400, 'NOT_ADMIN_USER');
  }
  if (id === req.user.id) {
    throw new AppError('Cannot deactivate yourself', 400, 'CANNOT_DEACTIVATE_SELF');
  }
  const updated = await prisma.user.update({
    where: { id },
    data: { isActive: !target.isActive },
    select: { id: true, email: true, name: true, role: true, isActive: true },
  });
  res.json(updated);
}));

module.exports = router;

-- V13.4+ RBAC: rename legacy 'admin' role to 'super_admin'.
-- Idempotent: WHERE clause limits the update to legacy rows only.
UPDATE users SET role = 'super_admin' WHERE role = 'admin';

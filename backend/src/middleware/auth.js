const jwt = require('jsonwebtoken');
const config = require('../config');
const prisma = require('../lib/prisma');
const { ADMIN_ROLES } = require('../lib/permissions');

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  let decoded;
  try {
    const token = authHeader.split(' ')[1];
    decoded = jwt.verify(token, config.jwt.secret);
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
  try {
    const dbUser = await prisma.user.findUnique({ where: { id: decoded.id }, select: { isActive: true } });
    if (!dbUser || dbUser.isActive === false) return res.status(401).json({ error: 'Account deactivated' });
    req.user = { ...decoded, isActive: dbUser.isActive };
    next();
  } catch {
    return res.status(503).json({ error: 'Service temporarily unavailable' });
  }
}

// Backwards-compat alias: passing 'admin' expands to all admin sub-roles
// so that existing `authorize('admin')` calls accept any admin sub-role.
function expandRoles(roles) {
  return roles.flatMap(r => r === 'admin' ? ADMIN_ROLES : [r]);
}

function authorize(...roles) {
  const allowed = expandRoles(roles);
  return (req, res, next) => {
    if (req.user.isActive === false) {
      return res.status(403).json({ error: 'Account is inactive' });
    }
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

module.exports = { authenticate, authorize };

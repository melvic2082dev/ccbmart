const jwt = require('jsonwebtoken');
const config = require('../config');
const prisma = require('../lib/prisma');

async function authenticate(req, res, next) {
  const cookieToken = req.cookies?.token;
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  const token = cookieToken || bearerToken;

  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  let decoded;
  try {
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

function authorize(...roles) {
  return (req, res, next) => {
    if (req.user.isActive === false) {
      return res.status(403).json({ error: 'Account is inactive' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

module.exports = { authenticate, authorize };

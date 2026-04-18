const jwt = require('jsonwebtoken');

// Set JWT secret before config loads
process.env.JWT_SECRET = 'test-secret-key-for-jest';

const { authenticate, authorize } = require('../../../src/middleware/auth');

const SECRET = 'test-secret-key-for-jest';

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('authenticate middleware', () => {
  test('calls next() with valid Bearer token', () => {
    const token = jwt.sign({ id: 1, role: 'admin' }, SECRET);
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = jest.fn();

    authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toMatchObject({ id: 1, role: 'admin' });
  });

  test('returns 401 when no Authorization header', () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 when token is not Bearer format', () => {
    const req = { headers: { authorization: 'Basic abc123' } };
    const res = mockRes();
    const next = jest.fn();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 when token is expired', () => {
    const token = jwt.sign({ id: 1 }, SECRET, { expiresIn: -1 });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = jest.fn();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
  });

  test('returns 401 when token is signed with wrong secret', () => {
    const token = jwt.sign({ id: 1 }, 'wrong-secret');
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = jest.fn();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe('authorize middleware', () => {
  test('calls next() when user role is allowed', () => {
    const req = { user: { role: 'admin' } };
    const res = mockRes();
    const next = jest.fn();

    authorize('admin', 'manager')(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  test('returns 403 when user role is not in allowed list', () => {
    const req = { user: { role: 'ctv' } };
    const res = mockRes();
    const next = jest.fn();

    authorize('admin')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden' });
    expect(next).not.toHaveBeenCalled();
  });

  test('accepts multiple allowed roles', () => {
    const req = { user: { role: 'ctv' } };
    const res = mockRes();
    const next = jest.fn();

    authorize('admin', 'ctv', 'member')(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});

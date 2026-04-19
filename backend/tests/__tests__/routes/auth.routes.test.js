// Mock before any imports
jest.mock('@prisma/client', () => {
  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };
  return { PrismaClient: jest.fn(() => mockPrisma) };
});

// Bypass rate limiting in tests
jest.mock('../../../src/middleware/rateLimiter', () => ({
  loginLimiter: (req, res, next) => next(),
  globalLimiter: (req, res, next) => next(),
  apiLimiter: (req, res, next) => next(),
}));

// Mock audit log to avoid DB writes
jest.mock('../../../src/middleware/auditLog', () => ({
  logAudit: jest.fn(),
  auditLog: jest.fn(() => (req, res, next) => next()),
  sanitize: jest.fn(x => x),
}));

const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const authRouter = require('../../../src/routes/auth');

const SECRET = 'test-secret-key-for-jest';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  return app;
}

let app;
beforeAll(() => {
  app = createApp();
});

beforeEach(() => {
  jest.clearAllMocks();
  prisma.auditLog.create.mockResolvedValue({});
});

// ---------- POST /api/auth/login ----------
describe('POST /api/auth/login', () => {
  test('returns 200 with token on valid credentials', async () => {
    const hash = await bcrypt.hash('correctpass', 10);
    prisma.user.findUnique.mockResolvedValue({
      id: 1,
      email: 'user@test.com',
      passwordHash: hash,
      role: 'ctv',
      rank: 'CTV',
      name: 'Test User',
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@test.com', password: 'correctpass' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe('user@test.com');
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  test('returns 401 when user not found', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'noone@test.com', password: 'password99' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  test('returns 401 when password is wrong', async () => {
    const hash = await bcrypt.hash('correctpass', 10);
    prisma.user.findUnique.mockResolvedValue({
      id: 1,
      email: 'user@test.com',
      passwordHash: hash,
      role: 'ctv',
      rank: 'CTV',
      name: 'Test',
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@test.com', password: 'wrongpass' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  test('returns 400 when email format is invalid', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'not-an-email', password: 'password99' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  test('returns 400 when body is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({});

    expect(res.status).toBe(400);
  });

  test('token contains user id, role, and rank', async () => {
    const hash = await bcrypt.hash('password99', 10);
    prisma.user.findUnique.mockResolvedValue({
      id: 42,
      email: 'admin@test.com',
      passwordHash: hash,
      role: 'admin',
      rank: 'GDKD',
      name: 'Admin',
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'password99' });

    expect(res.status).toBe(200);
    const decoded = jwt.verify(res.body.token, SECRET);
    expect(decoded.id).toBe(42);
    expect(decoded.role).toBe('admin');
    expect(decoded.rank).toBe('GDKD');
  });
});

// ---------- POST /api/auth/logout ----------
describe('POST /api/auth/logout', () => {
  test('returns 200 with success:true', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('logs out with valid token', async () => {
    const token = jwt.sign({ id: 1, role: 'ctv' }, SECRET);
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });
});

// ---------- GET /api/auth/me ----------
describe('GET /api/auth/me', () => {
  test('returns user profile with valid token', async () => {
    const token = jwt.sign({ id: 5 }, SECRET);
    prisma.user.findUnique.mockResolvedValue({
      id: 5,
      email: 'me@test.com',
      role: 'ctv',
      rank: 'PP',
      name: 'Me User',
      phone: '0900000001',
    });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe('me@test.com');
    expect(res.body.rank).toBe('PP');
  });

  test('returns 401 when no Authorization header', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('returns 401 with invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid-token-xyz');

    expect(res.status).toBe(401);
  });
});

const { validate, schemas } = require('../../../src/middleware/validate');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('validate middleware', () => {
  describe('login schema', () => {
    const loginMiddleware = validate(schemas.login);

    test('passes valid email + password', () => {
      const req = { body: { email: 'user@test.com', password: 'Password123' } };
      const res = mockRes();
      const next = jest.fn();

      loginMiddleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('rejects invalid email format', () => {
      const req = { body: { email: 'not-an-email', password: 'pass123' } };
      const res = mockRes();
      const next = jest.fn();

      loginMiddleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Validation failed' })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('rejects missing password', () => {
      const req = { body: { email: 'user@test.com' } };
      const res = mockRes();
      const next = jest.fn();

      loginMiddleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('strips unknown fields from body', () => {
      const req = { body: { email: 'user@test.com', password: 'Password1', extra: 'removed' } };
      const res = mockRes();
      const next = jest.fn();

      loginMiddleware(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.body.extra).toBeUndefined();
    });
  });

  describe('changeRank schema', () => {
    const rankMiddleware = validate(schemas.changeRank);

    test('accepts valid rank values', () => {
      const req = { body: { newRank: 'GDKD' } };
      const res = mockRes();
      const next = jest.fn();

      rankMiddleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('rejects invalid rank', () => {
      const req = { body: { newRank: 'INVALID_RANK' } };
      const res = mockRes();
      const next = jest.fn();

      rankMiddleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('memberRegister schema', () => {
    const memberMiddleware = validate(schemas.memberRegister);

    test('accepts valid referral code format CCB_XXXXXX', () => {
      const req = {
        body: {
          email: 'member@test.com',
          password: 'Password123',
          name: 'Test Member',
          phone: '0900000001',
          referralCode: 'CCB_ABC123',
        },
      };
      const res = mockRes();
      const next = jest.fn();

      memberMiddleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('rejects invalid referral code format', () => {
      const req = {
        body: {
          email: 'member@test.com',
          password: 'Password123',
          name: 'Test Member',
          phone: '0900000001',
          referralCode: 'INVALID',
        },
      };
      const res = mockRes();
      const next = jest.fn();

      memberMiddleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('validate source param', () => {
    test('validates query params when source=query', () => {
      const schema = require('joi').object({
        page: require('joi').number().min(1).required(),
      });
      const middleware = validate(schema, 'query');

      const req = { query: { page: '2' }, body: {} };
      const res = mockRes();
      const next = jest.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });
});

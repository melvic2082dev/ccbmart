import { loginSchema, registerSchema } from '@/lib/schemas/auth';

describe('loginSchema', () => {
  it('accepts valid credentials', () => {
    const r = loginSchema.safeParse({ email: 'a@b.com', password: 'x' });
    expect(r.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const r = loginSchema.safeParse({ email: 'not-an-email', password: 'x' });
    expect(r.success).toBe(false);
  });

  it('rejects empty password', () => {
    const r = loginSchema.safeParse({ email: 'a@b.com', password: '' });
    expect(r.success).toBe(false);
  });
});

describe('registerSchema', () => {
  const valid = {
    name: 'Nguyen Van A',
    email: 'a@b.com',
    phone: '0901234567',
    password: '123456',
    depositAmount: 0,
  };

  it('accepts valid minimal data', () => {
    const r = registerSchema.safeParse(valid);
    expect(r.success).toBe(true);
  });

  it('rejects short name', () => {
    const r = registerSchema.safeParse({ ...valid, name: 'A' });
    expect(r.success).toBe(false);
  });

  it('rejects phone with letters', () => {
    const r = registerSchema.safeParse({ ...valid, phone: 'abc1234567' });
    expect(r.success).toBe(false);
  });

  it('rejects password shorter than 6', () => {
    const r = registerSchema.safeParse({ ...valid, password: '12345' });
    expect(r.success).toBe(false);
  });

  it('rejects negative deposit', () => {
    const r = registerSchema.safeParse({ ...valid, depositAmount: -1 });
    expect(r.success).toBe(false);
  });

  it('accepts empty referralCode', () => {
    const r = registerSchema.safeParse({ ...valid, referralCode: '' });
    expect(r.success).toBe(true);
  });

  it('rejects lowercase referralCode', () => {
    const r = registerSchema.safeParse({ ...valid, referralCode: 'ccb_abc' });
    expect(r.success).toBe(false);
  });
});

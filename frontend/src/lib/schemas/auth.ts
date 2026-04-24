import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: z.string().min(2, 'Họ tên phải có ít nhất 2 ký tự'),
  email: z.string().email('Email không hợp lệ'),
  phone: z
    .string()
    .min(9, 'Số điện thoại không hợp lệ')
    .regex(/^[0-9+\s-]+$/, 'Số điện thoại chỉ chứa số'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  depositAmount: z
    .number({ error: 'Số tiền phải là số' })
    .int()
    .min(0, 'Số tiền không âm'),
  referralCode: z
    .string()
    .regex(/^[A-Z0-9_]*$/, 'Mã giới thiệu không hợp lệ')
    .optional()
    .or(z.literal('')),
});
export type RegisterInput = z.infer<typeof registerSchema>;

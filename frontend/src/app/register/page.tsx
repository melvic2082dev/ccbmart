'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api, formatVND } from '@/lib/api';
import { registerSchema, type RegisterInput } from '@/lib/schemas/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', phone: '', password: '', depositAmount: 0, referralCode: '' },
  });

  const depositAmount = watch('depositAmount') ?? 0;

  const onSubmit = handleSubmit(async (values) => {
    setError('');
    try {
      await api.memberRegister({
        ...values,
        depositAmount: values.depositAmount || 0,
        referralCode: values.referralCode || undefined,
      });
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Đăng ký thất bại.');
    }
  });

  const tiers = [
    { name: 'Green', min: 0, discount: '0%' },
    { name: 'Basic', min: 2_000_000, discount: '2%' },
    { name: 'Standard', min: 10_000_000, discount: '5%' },
    { name: 'VIP Gold', min: 30_000_000, discount: '8%' },
  ];

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">&#10003;</span>
            </div>
            <h2 className="text-xl font-bold mb-2">Đăng ký thành công!</h2>
            <p className="text-gray-500 mb-6">Tài khoản của bạn đã được tạo. Hãy đăng nhập để bắt đầu.</p>
            <Button onClick={() => router.push('/login')} className="w-full">Đăng nhập</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-extrabold text-blue-700">CCB Mart</h1>
          <p className="text-sm text-blue-500 mt-1">Đăng ký thành viên</p>
        </div>
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>Tạo tài khoản</CardTitle>
            <CardDescription>Nhập thông tin để đăng ký thành viên</CardDescription>
          </CardHeader>
          <CardContent>
            {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <div>
                <Label>Họ tên *</Label>
                <Input aria-invalid={!!errors.name} {...register('name')} />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <Label>Email *</Label>
                <Input type="email" aria-invalid={!!errors.email} {...register('email')} />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
              </div>
              <div>
                <Label>Số điện thoại *</Label>
                <Input aria-invalid={!!errors.phone} {...register('phone')} />
                {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>}
              </div>
              <div>
                <Label>Mật khẩu *</Label>
                <Input type="password" aria-invalid={!!errors.password} {...register('password')} />
                {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
              </div>
              <div>
                <Label>Số tiền nạp ban đầu (VND)</Label>
                <Input
                  type="number"
                  min={0}
                  step={100000}
                  aria-invalid={!!errors.depositAmount}
                  {...register('depositAmount', { valueAsNumber: true })}
                />
                {errors.depositAmount && <p className="text-xs text-red-500 mt-1">{errors.depositAmount.message}</p>}
                <div className="flex gap-1 mt-1 flex-wrap">
                  {tiers.map(t => (
                    <span key={t.name} className={`text-xs px-2 py-0.5 rounded ${depositAmount >= t.min ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
                      {t.name}: {formatVND(t.min)}+ = {t.discount} giảm
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <Label>Mã giới thiệu (tuỳ chọn)</Label>
                <Input
                  placeholder="CCB_XXXXXX"
                  aria-invalid={!!errors.referralCode}
                  {...register('referralCode', {
                    setValueAs: (v: string) => v.toUpperCase(),
                  })}
                />
                {errors.referralCode && <p className="text-xs text-red-500 mt-1">{errors.referralCode.message}</p>}
              </div>
              <Button type="submit" disabled={isSubmitting} className="w-full">{isSubmitting ? 'Đang xử lý…' : 'Đăng ký'}</Button>
            </form>
            <p className="text-sm text-center text-gray-500 mt-4">
              Đã có tài khoản? <Link href="/login" className="text-blue-600 hover:underline">Đăng nhập</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { api, formatVND } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, QrCode, Upload, CheckCircle, Banknote, CreditCard } from 'lucide-react';

const VN_PHONE_RE = /^0\d{9}$/;

export default function CtvCreateSale() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'bank_transfer' | 'cash'>('bank_transfer');
  const [bankCode, setBankCode] = useState('');

  // Result state
  const [result, setResult] = useState<any>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const [comboPrice, setComboPrice] = useState<number | null>(null);
  useEffect(() => {
    api.appConfig().then(c => setComboPrice(c.comboPrice)).catch(() => setComboPrice(2000000));
  }, []);

  const handleCreateTransaction = async () => {
    if (!customerName || !customerPhone) {
      setError('Vui lòng nhập tên và SĐT khách hàng');
      return;
    }
    if (!VN_PHONE_RE.test(customerPhone)) {
      setError('Số điện thoại phải có 10 chữ số và bắt đầu bằng số 0');
      return;
    }
    if (paymentMethod === 'bank_transfer' && bankCode && bankCode.length !== 4) {
      setError('Mã ngân hàng phải có 4 số');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await api.ctvCreateTransaction({
        customerName,
        customerPhone,
        paymentMethod,
        bankCode: bankCode || undefined,
      });
      setResult(res);
      setStep(3);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadProof = async () => {
    if (!proofFile || !result?.transactionId) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('image', proofFile);
      await api.ctvUploadProof(result.transactionId, formData);
      setUploadSuccess(true);
      setStep(4);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <ShoppingCart size={24} /> Tạo đơn bán hàng
      </h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Step indicators */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3, 4].map(s => (
          <div key={s} className={`flex items-center gap-1 ${s <= step ? 'text-emerald-600' : 'text-slate-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              s < step ? 'bg-emerald-600 text-white' : s === step ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-600' : 'bg-slate-200'
            }`}>{s}</div>
            <span className="text-sm hidden sm:inline">
              {s === 1 ? 'Khách hàng' : s === 2 ? 'Thanh toán' : s === 3 ? 'Xác nhận' : 'Hoàn tất'}
            </span>
            {s < 4 && <div className="w-8 h-px bg-slate-300 mx-1" />}
          </div>
        ))}
      </div>

      {/* Step 1: Customer info */}
      {step === 1 && (
        <Card>
          <CardHeader><CardTitle>Thông tin khách hàng</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Tên khách hàng *</Label>
              <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Nguyễn Văn A" />
            </div>
            <div>
              <Label>Số điện thoại *</Label>
              <Input
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="0912345678"
                inputMode="numeric"
                maxLength={10}
              />
              {customerPhone.length > 0 && !VN_PHONE_RE.test(customerPhone) && (
                <p className="text-xs text-red-600 mt-1">Số điện thoại phải có 10 chữ số và bắt đầu bằng số 0</p>
              )}
            </div>
            <div className="pt-2">
              <p className="text-sm text-slate-500 mb-2">Sản phẩm: <strong>Combo CCB Mart</strong></p>
              <p className="text-2xl font-bold text-emerald-600">
                {comboPrice == null ? <span className="inline-block h-7 w-32 bg-slate-200 animate-pulse rounded" /> : formatVND(comboPrice)}
              </p>
            </div>
            <Button onClick={() => setStep(2)} disabled={!customerName || !VN_PHONE_RE.test(customerPhone)} className="w-full">
              Tiếp tục
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Payment method */}
      {step === 2 && (
        <Card>
          <CardHeader><CardTitle>Phương thức thanh toán</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setPaymentMethod('bank_transfer')}
                className={`p-4 rounded-xl border-2 text-center transition-all ${
                  paymentMethod === 'bank_transfer' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <CreditCard size={32} className="mx-auto mb-2 text-emerald-600" />
                <p className="font-semibold">Chuyển khoản</p>
                <p className="text-xs text-slate-500">Khách CK vào TK công ty</p>
              </button>
              <button
                onClick={() => setPaymentMethod('cash')}
                className={`p-4 rounded-xl border-2 text-center transition-all ${
                  paymentMethod === 'cash' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <Banknote size={32} className="mx-auto mb-2 text-yellow-600" />
                <p className="font-semibold">Tiền mặt</p>
                <p className="text-xs text-slate-500">CTV thu tiền và nộp sau</p>
              </button>
            </div>

            {paymentMethod === 'bank_transfer' && (
              <div>
                <Label>4 số cuối tài khoản chuyển (tuỳ chọn)</Label>
                <Input value={bankCode} onChange={e => setBankCode(e.target.value)} placeholder="1234" maxLength={4} />
              </div>
            )}

            {paymentMethod === 'cash' && (
              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg text-sm">
                <strong>Lưu ý:</strong> Bạn cần nộp tiền mặt về công ty trong vòng 24h. Quá 48h tài khoản sẽ bị khoá.
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Quay lại</Button>
              <Button onClick={handleCreateTransaction} disabled={loading} className="flex-1">
                {loading ? 'Đang tạo…' : 'Tạo đơn hàng'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Result + Upload proof */}
      {step === 3 && result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="text-emerald-500" /> Đơn hàng đã tạo!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-emerald-50 p-4 rounded-lg">
              <p>Mã giao dịch: <strong>#{result.transactionId}</strong></p>
              <p>Trạng thái: <Badge variant="secondary">Chờ xác nhận</Badge></p>
              <p>Số tiền: <strong>{formatVND(result.totalAmount)}</strong></p>
            </div>

            {result.paymentMethod === 'bank_transfer' && (
              <>
                <div className="bg-blue-50 p-4 rounded-lg text-sm">
                  <p className="font-semibold mb-2">Thông tin chuyển khoản:</p>
                  <p>Ngân hàng: {result.bankAccount?.bankName}</p>
                  <p>STK: <strong>{result.bankAccount?.accountNo}</strong></p>
                  <p>Chủ TK: {result.bankAccount?.accountName}</p>
                  <p>Nội dung CK: <strong>{result.transferContent}</strong></p>
                </div>

                {result.qrCodeData && (
                  <div className="text-center">
                    <p className="text-sm text-slate-500 mb-2">QR Code chuyển khoản:</p>
                    <img src={result.qrCodeData} alt="QR Code" className="mx-auto w-48 h-48 border rounded" />
                  </div>
                )}

                <div className="border-t pt-4">
                  <Label>Upload ảnh chụp chuyển khoản</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={e => setProofFile(e.target.files?.[0] || null)}
                    className="mt-1"
                  />
                  <Button
                    onClick={handleUploadProof}
                    disabled={!proofFile || loading}
                    className="mt-2 w-full"
                  >
                    <Upload size={16} className="mr-1" />
                    {loading ? 'Đang upload…' : 'Upload bằng chứng'}
                  </Button>
                </div>
              </>
            )}

            {result.paymentMethod === 'cash' && (
              <div className="bg-yellow-50 p-4 rounded-lg text-sm">
                <p className="font-semibold">Bước tiếp theo:</p>
                <p>Vui lòng nộp tiền mặt về công ty và báo cáo tại trang &quot;Nộp tiền mặt&quot;.</p>
              </div>
            )}

            <Button variant="outline" onClick={() => { setStep(1); setResult(null); setCustomerName(''); setCustomerPhone(''); setBankCode(''); setProofFile(null); setUploadSuccess(false); }} className="w-full">
              Tạo đơn mới
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Complete */}
      {step === 4 && (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle size={48} className="mx-auto text-emerald-500 mb-4" />
            <h3 className="text-xl font-bold mb-2">Hoàn tất!</h3>
            <p className="text-slate-500">Đơn hàng #{result?.transactionId} đã được tạo và upload bằng chứng thành công.</p>
            <p className="text-slate-500">Admin sẽ xác nhận trong thời gian sớm nhất.</p>
            <Button onClick={() => { setStep(1); setResult(null); setCustomerName(''); setCustomerPhone(''); setBankCode(''); setProofFile(null); setUploadSuccess(false); }} className="mt-6">
              Tạo đơn mới
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  );
}

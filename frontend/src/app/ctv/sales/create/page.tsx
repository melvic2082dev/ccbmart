'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { api, formatVND } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, QrCode, Upload, CheckCircle, Banknote, CreditCard } from 'lucide-react';

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

  const handleCreateTransaction = async () => {
    if (!customerName || !customerPhone) {
      setError('Vui long nhap ten va SDT khach hang');
      return;
    }
    if (paymentMethod === 'bank_transfer' && bankCode && bankCode.length !== 4) {
      setError('Ma ngan hang phai co 4 so');
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
    <DashboardLayout role="ctv">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <ShoppingCart size={24} /> Tao don ban hang
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
              {s === 1 ? 'Khach hang' : s === 2 ? 'Thanh toan' : s === 3 ? 'Xac nhan' : 'Hoan tat'}
            </span>
            {s < 4 && <div className="w-8 h-px bg-slate-300 mx-1" />}
          </div>
        ))}
      </div>

      {/* Step 1: Customer info */}
      {step === 1 && (
        <Card>
          <CardHeader><CardTitle>Thong tin khach hang</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Ten khach hang *</Label>
              <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Nguyen Van A" />
            </div>
            <div>
              <Label>So dien thoai *</Label>
              <Input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="0912345678" />
            </div>
            <div className="pt-2">
              <p className="text-sm text-slate-500 mb-2">San pham: <strong>Combo CCB Mart</strong></p>
              <p className="text-2xl font-bold text-emerald-600">{formatVND(2000000)}</p>
            </div>
            <Button onClick={() => setStep(2)} disabled={!customerName || !customerPhone} className="w-full">
              Tiep tuc
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Payment method */}
      {step === 2 && (
        <Card>
          <CardHeader><CardTitle>Phuong thuc thanh toan</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setPaymentMethod('bank_transfer')}
                className={`p-4 rounded-xl border-2 text-center transition-all ${
                  paymentMethod === 'bank_transfer' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <CreditCard size={32} className="mx-auto mb-2 text-emerald-600" />
                <p className="font-semibold">Chuyen khoan</p>
                <p className="text-xs text-slate-500">Khach CK vao TK cong ty</p>
              </button>
              <button
                onClick={() => setPaymentMethod('cash')}
                className={`p-4 rounded-xl border-2 text-center transition-all ${
                  paymentMethod === 'cash' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <Banknote size={32} className="mx-auto mb-2 text-yellow-600" />
                <p className="font-semibold">Tien mat</p>
                <p className="text-xs text-slate-500">CTV thu tien va nop sau</p>
              </button>
            </div>

            {paymentMethod === 'bank_transfer' && (
              <div>
                <Label>4 so cuoi tai khoan chuyen (tuy chon)</Label>
                <Input value={bankCode} onChange={e => setBankCode(e.target.value)} placeholder="1234" maxLength={4} />
              </div>
            )}

            {paymentMethod === 'cash' && (
              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg text-sm">
                <strong>Luu y:</strong> Ban can nop tien mat ve cong ty trong vong 24h. Qua 48h tai khoan se bi khoa.
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Quay lai</Button>
              <Button onClick={handleCreateTransaction} disabled={loading} className="flex-1">
                {loading ? 'Dang tao...' : 'Tao don hang'}
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
              <CheckCircle className="text-emerald-500" /> Don hang da tao!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-emerald-50 p-4 rounded-lg">
              <p>Ma giao dich: <strong>#{result.transactionId}</strong></p>
              <p>Trang thai: <Badge variant="secondary">Cho xac nhan</Badge></p>
              <p>So tien: <strong>{formatVND(result.totalAmount)}</strong></p>
            </div>

            {result.paymentMethod === 'bank_transfer' && (
              <>
                <div className="bg-blue-50 p-4 rounded-lg text-sm">
                  <p className="font-semibold mb-2">Thong tin chuyen khoan:</p>
                  <p>Ngan hang: {result.bankAccount?.bankName}</p>
                  <p>STK: <strong>{result.bankAccount?.accountNo}</strong></p>
                  <p>Chu TK: {result.bankAccount?.accountName}</p>
                  <p>Noi dung CK: <strong>{result.transferContent}</strong></p>
                </div>

                {result.qrCodeData && (
                  <div className="text-center">
                    <p className="text-sm text-slate-500 mb-2">QR Code chuyen khoan:</p>
                    <img src={result.qrCodeData} alt="QR Code" className="mx-auto w-48 h-48 border rounded" />
                  </div>
                )}

                <div className="border-t pt-4">
                  <Label>Upload anh chup chuyen khoan</Label>
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
                    {loading ? 'Dang upload...' : 'Upload bang chung'}
                  </Button>
                </div>
              </>
            )}

            {result.paymentMethod === 'cash' && (
              <div className="bg-yellow-50 p-4 rounded-lg text-sm">
                <p className="font-semibold">Buoc tiep theo:</p>
                <p>Vui long nop tien mat ve cong ty va bao cao tai trang &quot;Nop tien mat&quot;.</p>
              </div>
            )}

            <Button variant="outline" onClick={() => { setStep(1); setResult(null); setCustomerName(''); setCustomerPhone(''); setBankCode(''); setProofFile(null); setUploadSuccess(false); }} className="w-full">
              Tao don moi
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Complete */}
      {step === 4 && (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle size={48} className="mx-auto text-emerald-500 mb-4" />
            <h3 className="text-xl font-bold mb-2">Hoan tat!</h3>
            <p className="text-slate-500">Don hang #{result?.transactionId} da duoc tao va upload bang chung thanh cong.</p>
            <p className="text-slate-500">Admin se xac nhan trong thoi gian som nhat.</p>
            <Button onClick={() => { setStep(1); setResult(null); setCustomerName(''); setCustomerPhone(''); setBankCode(''); setProofFile(null); setUploadSuccess(false); }} className="mt-6">
              Tao don moi
            </Button>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
}

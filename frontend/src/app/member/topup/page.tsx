'use client';
import { useState } from 'react';
import { api, formatVND } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Banknote, CheckCircle } from 'lucide-react';

const QUICK_AMOUNTS = [200000, 500000, 1000000, 2000000, 5000000];

export default function MemberTopup() {
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState('bank_transfer');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (amount < 10000) { setError('Số tiền tối thiểu 10,000 VND'); return; }
    setLoading(true); setError('');
    try {
      const res = await api.memberDeposit({ amount, method });
      setResult(res);
    } catch (err: any) { setError(err.message); }
    setLoading(false);
  };

  if (result) {
    return (
      <>
        <Card className="max-w-md mx-auto">
          <CardContent className="py-12 text-center">
            <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
            <h3 className="text-xl font-bold mb-2">Yêu cầu nạp tiền đã gửi!</h3>
            <p className="text-gray-500 mb-4">Số tiền: {formatVND(result.amount)}</p>
            {result.bankAccount && (
              <div className="bg-blue-50 p-4 rounded-lg text-left text-sm mb-4">
                <p className="font-semibold mb-1">Thông tin chuyển khoản:</p>
                <p>Ngân hàng: {result.bankAccount.bankName}</p>
                <p>STK: <strong>{result.bankAccount.accountNo}</strong></p>
                <p>Chủ TK: {result.bankAccount.accountName}</p>
                <p>Nội dung: <strong>{result.bankAccount.transferContent}</strong></p>
              </div>
            )}
            <p className="text-xs text-gray-400">Admin sẽ xác nhận khi nhận được tiền.</p>
            <Button onClick={() => { setResult(null); setAmount(0); }} variant="outline" className="mt-4">Nạp thêm</Button>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Banknote size={24} /> Nạp tiền vào ví</h2>
      {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}
      <Card className="max-w-md mx-auto">
        <CardContent className="pt-6 space-y-4">
          <div>
            <Label>Số tiền nạp (VND)</Label>
            <Input type="number" value={amount || ''} onChange={e => setAmount(parseInt(e.target.value) || 0)} min={10000} step={10000} />
            <div className="flex gap-2 mt-2 flex-wrap">
              {QUICK_AMOUNTS.map(a => (
                <button key={a} onClick={() => setAmount(a)} className={`text-xs px-3 py-1 rounded-full border transition-colors ${amount === a ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 hover:border-blue-400'}`}>
                  {formatVND(a)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Phương thức</Label>
            <select value={method} onChange={e => setMethod(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="bank_transfer">Chuyển khoản</option>
              <option value="cash">Tiền mặt</option>
            </select>
          </div>
          <Button onClick={handleSubmit} disabled={loading || amount < 10000} className="w-full">
            {loading ? 'Đang xử lý…' : `Nạp ${formatVND(amount)}`}
          </Button>
        </CardContent>
      </Card>
    </>
  );
}

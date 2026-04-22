'use client';

import { useEffect, useState } from 'react';
import { api, formatVND } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Banknote, CheckCircle } from 'lucide-react';

interface CashTx {
  id: number;
  totalAmount: number;
  createdAt: string;
  customer: { name: string; phone: string } | null;
}

export default function CtvCashDeposit() {
  const [transactions, setTransactions] = useState<CashTx[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<any>(null);
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      const data = await api.ctvPendingCash();
      setTransactions(data.transactions || []);
      setTotalAmount(data.totalAmount || 0);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const toggleSelect = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const selectAll = () => {
    if (selected.size === transactions.length) setSelected(new Set());
    else setSelected(new Set(transactions.map(t => t.id)));
  };

  const selectedAmount = transactions.filter(t => selected.has(t.id)).reduce((s, t) => s + t.totalAmount, 0);

  const handleSubmit = async () => {
    if (selected.size === 0) return;
    setSubmitting(true);
    setError('');
    try {
      const result = await api.ctvCreateCashDeposit(Array.from(selected));
      setSuccess(result);
    } catch (err: any) {
      setError(err.message);
    }
    setSubmitting(false);
  };

  return (
    <>
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Banknote size={24} /> Nộp tiền mặt
      </h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">{error}</div>
      )}

      {success ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle size={48} className="mx-auto text-emerald-500 mb-4" />
            <h3 className="text-xl font-bold mb-2">Phiếu nộp tiền đã tạo!</h3>
            <p className="text-slate-500">Mã phiếu: #{success.depositId}</p>
            <p className="text-slate-500">Tổng: {formatVND(success.totalAmount)} ({success.transactionCount} giao dịch)</p>
            <p className="text-slate-500 mt-2">Admin sẽ xác nhận khi nhận được tiền.</p>
            <Button onClick={() => { setSuccess(null); setSelected(new Set()); fetchData(); }} className="mt-6">
              Quay lại
            </Button>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-200 animate-pulse rounded-xl" />)}
        </div>
      ) : transactions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            Không có giao dịch tiền mặt cần nộp
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary */}
          <Card className="mb-4">
            <CardContent className="pt-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Tổng tiền mặt chưa nộp</p>
                <p className="text-2xl font-bold text-yellow-600">{formatVND(totalAmount)}</p>
                <p className="text-sm text-slate-400">{transactions.length} giao dịch</p>
              </div>
              <Button variant="outline" onClick={selectAll}>
                {selected.size === transactions.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
              </Button>
            </CardContent>
          </Card>

          {/* Transaction list */}
          <div className="space-y-2 mb-4">
            {transactions.map(tx => (
              <Card
                key={tx.id}
                className={`cursor-pointer transition-all ${selected.has(tx.id) ? 'border-emerald-500 bg-emerald-50/50' : 'hover:border-slate-300'}`}
                onClick={() => toggleSelect(tx.id)}
              >
                <CardContent className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selected.has(tx.id)}
                      onChange={() => toggleSelect(tx.id)}
                      className="w-5 h-5 rounded"
                    />
                    <div>
                      <p className="font-semibold">#{tx.id} - {tx.customer?.name || 'Khách hàng'}</p>
                      <p className="text-xs text-slate-400">{new Date(tx.createdAt).toLocaleString('vi-VN')}</p>
                    </div>
                  </div>
                  <p className="font-bold">{formatVND(tx.totalAmount)}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Submit */}
          {selected.size > 0 && (
            <Card className="sticky bottom-4">
              <CardContent className="py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Đã chọn: {selected.size} giao dịch</p>
                  <p className="text-xl font-bold text-emerald-600">{formatVND(selectedAmount)}</p>
                </div>
                <Button onClick={handleSubmit} disabled={submitting} size="lg">
                  {submitting ? 'Đang gửi…' : 'Xác nhận nộp tiền'}
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </>
  );
}

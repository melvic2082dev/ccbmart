'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Upload } from 'lucide-react';

interface KycStatus {
  id: number;
  name: string;
  kycStatus: string;
  kycSubmittedAt: string | null;
  kycVerifiedAt: string | null;
  kycRejectReason: string | null;
  idNumber: string | null;
  idFrontImage: string | null;
  idBackImage: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-700',
  SUBMITTED: 'bg-yellow-100 text-yellow-700',
  VERIFIED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Chưa nộp',
  SUBMITTED: 'Đang chờ xét duyệt',
  VERIFIED: 'Đã xác minh',
  REJECTED: 'Bị từ chối',
};

export default function CtvKycPage() {
  const [status, setStatus] = useState<KycStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [idNumber, setIdNumber] = useState('');
  const [idFrontImage, setIdFrontImage] = useState('');
  const [idBackImage, setIdBackImage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const fetchStatus = () => {
    setLoading(true);
    api.ctvKycStatus()
      .then((s) => {
        setStatus(s);
        setIdNumber(s.idNumber || '');
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchStatus(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');
    try {
      await api.ctvKycSubmit({ idNumber, idFrontImage, idBackImage });
      setMessage('Đã nộp hồ sơ KYC thành công. Vui lòng chờ xét duyệt.');
      fetchStatus();
    } catch (err) {
      setMessage(`Lỗi: ${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const canResubmit = !status || status.kycStatus === 'PENDING' || status.kycStatus === 'REJECTED';

  return (
    <DashboardLayout role="ctv">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <ShieldCheck size={24} /> Xác minh danh tính (eKYC)
      </h2>

      {loading ? (
        <div className="h-64 bg-slate-200 animate-pulse rounded-xl" />
      ) : (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Trạng thái hiện tại</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge className={STATUS_STYLES[status?.kycStatus || 'PENDING']}>
                  {STATUS_LABEL[status?.kycStatus || 'PENDING']}
                </Badge>
              </div>
              {status?.kycSubmittedAt && (
                <p className="text-sm text-slate-500">
                  Ngày nộp: {new Date(status.kycSubmittedAt).toLocaleDateString('vi-VN')}
                </p>
              )}
              {status?.kycVerifiedAt && (
                <p className="text-sm text-slate-500">
                  Ngày xác minh: {new Date(status.kycVerifiedAt).toLocaleDateString('vi-VN')}
                </p>
              )}
              {status?.kycRejectReason && (
                <p className="text-sm text-red-600">Lý do từ chối: {status.kycRejectReason}</p>
              )}
              {status?.idNumber && (
                <p className="text-sm">Số CCCD: <span className="font-mono">{status.idNumber}</span></p>
              )}
            </CardContent>
          </Card>

          {canResubmit && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload size={20} /> Nộp hồ sơ KYC
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Số CCCD</label>
                    <input
                      type="text"
                      value={idNumber}
                      onChange={(e) => setIdNumber(e.target.value)}
                      required
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="079..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">URL ảnh CCCD mặt trước</label>
                    <input
                      type="text"
                      value={idFrontImage}
                      onChange={(e) => setIdFrontImage(e.target.value)}
                      required
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="/uploads/kyc/front.jpg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">URL ảnh CCCD mặt sau</label>
                    <input
                      type="text"
                      value={idBackImage}
                      onChange={(e) => setIdBackImage(e.target.value)}
                      required
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="/uploads/kyc/back.jpg"
                    />
                  </div>
                  {message && (
                    <div className="p-3 rounded bg-amber-50 text-amber-800 text-sm">{message}</div>
                  )}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50"
                  >
                    {submitting ? 'Đang gửi...' : 'Gửi hồ sơ'}
                  </button>
                </form>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </DashboardLayout>
  );
}

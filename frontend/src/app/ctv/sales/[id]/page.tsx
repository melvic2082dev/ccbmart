'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, formatVND } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Package, ScanLine, Truck, KeyRound, FileSignature, CheckCircle2,
  XCircle, Clock,
} from 'lucide-react';

type Tx = {
  id: number;
  status: string;
  totalAmount: number;
  pickupCode: string | null;
  draftedAt: string | null;
  inventoryConfirmedAt: string | null;
  paidAt: string | null;
  packingStartedAt: string | null;
  packedAt: string | null;
  pickedUpAt: string | null;
  deliveryOtpSentAt: string | null;
  deliveryOtpVerifiedAt: string | null;
  deliverySignatureUrl: string | null;
  deliveredAt: string | null;
  inventoryRejectedReason: string | null;
  cancelledReason: string | null;
  customer: { id: number; name: string; phone: string } | null;
  warehouse: { id: number; code: string; name: string; address: string } | null;
  items: { id: number; quantity: number; unitPrice: number; product: { name: string; region: string | null } | null }[];
  statusLogs: { id: number; fromStatus: string | null; toStatus: string; actorRole: string | null; note: string | null; at: string }[];
};

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  DRAFT:               { label: 'Đơn nháp',            color: 'bg-gray-200 text-gray-800' },
  INVENTORY_PENDING:   { label: 'Chờ xác nhận tồn',    color: 'bg-orange-100 text-orange-800' },
  INVENTORY_REJECTED:  { label: 'Hết hàng — từ chối',   color: 'bg-red-100 text-red-800' },
  AWAITING_PAYMENT:    { label: 'Chờ khách thanh toán', color: 'bg-amber-100 text-amber-800' },
  PAID:                { label: 'Đã thanh toán',       color: 'bg-blue-100 text-blue-800' },
  PACKING:             { label: 'Đang soạn',           color: 'bg-indigo-100 text-indigo-800' },
  AWAITING_PICKUP:     { label: 'Chờ CTV lấy',          color: 'bg-green-100 text-green-800' },
  PICKED_UP:           { label: 'Đã nhận tại kho',     color: 'bg-cyan-100 text-cyan-800' },
  DELIVERING:          { label: 'Đang giao',           color: 'bg-violet-100 text-violet-800' },
  DELIVERED:           { label: 'Đã giao',             color: 'bg-emerald-100 text-emerald-800' },
  CANCELLED:           { label: 'Đã huỷ',              color: 'bg-zinc-200 text-zinc-700' },
  CONFIRMED:           { label: 'Xác nhận (legacy)',   color: 'bg-emerald-100 text-emerald-800' },
};

function fmt(d: string | null) { return d ? new Date(d).toLocaleString('vi-VN') : '—'; }

export default function CtvOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params?.id);
  const [tx, setTx] = useState<Tx | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pickupInput, setPickupInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [otpDevHint, setOtpDevHint] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => {
    api.ctvOrderGet(id)
      .then((res) => setTx(res))
      .catch((e) => setError(e?.message || 'Lỗi tải'));
  };
  useEffect(() => { if (id) load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  if (!tx) {
    return <Card><CardContent className="p-8 text-center">{error || 'Đang tải đơn…'}</CardContent></Card>;
  }

  const meta = STATUS_LABEL[tx.status] || { label: tx.status, color: 'bg-zinc-100' };

  const doAction = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try { await fn(); load(); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  // ----- Action panel by status -----
  const actions = () => {
    if (tx.status === 'AWAITING_PAYMENT') {
      return (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Kho đã xác nhận có hàng. Gửi link/QR thanh toán cho khách. Khi nhận được tiền, payment gateway sẽ tự bắn webhook.
          </p>
          <p className="text-xs text-muted-foreground italic">Dev: nhấn nút bên dưới để giả lập webhook thanh toán thành công.</p>
          <Button disabled={busy} onClick={() => doAction(() => api.paymentWebhookDev(tx.id))}>
            Mô phỏng thanh toán thành công
          </Button>
        </div>
      );
    }
    if (tx.status === 'AWAITING_PICKUP') {
      return (
        <div className="space-y-3">
          <p className="text-sm">Đến kho, đọc mã từ phiếu/QR và nhập:</p>
          <div className="flex gap-2">
            <Input
              placeholder="Mã pickup (vd: ABC123XYZ456)"
              value={pickupInput}
              onChange={(e) => setPickupInput(e.target.value.toUpperCase())}
              className="font-mono"
            />
            <Button
              disabled={busy || !pickupInput.trim()}
              onClick={() => doAction(() => api.ctvOrderPickup(tx.id, pickupInput.trim()))}
            >
              <ScanLine className="w-4 h-4 mr-1" /> Xác nhận đã lấy hàng
            </Button>
          </div>
        </div>
      );
    }
    if (tx.status === 'PICKED_UP') {
      return (
        <Button disabled={busy} onClick={() => doAction(() => api.ctvOrderStartDelivery(tx.id))}>
          <Truck className="w-4 h-4 mr-1" /> Bắt đầu giao hàng
        </Button>
      );
    }
    if (tx.status === 'DELIVERING') {
      return (
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><KeyRound size={16} /> Kênh chính: OTP từ khách</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Button
                size="sm"
                disabled={busy}
                onClick={() => doAction(async () => {
                  const res = await api.ctvOrderRequestOtp(tx.id);
                  if (res?.devCode) setOtpDevHint(`(dev) Mã: ${res.devCode}`);
                })}
              >
                Gửi OTP đến số khách
              </Button>
              {otpDevHint && <p className="text-xs text-amber-600">{otpDevHint}</p>}
              <div className="flex gap-2">
                <Input
                  placeholder="6 chữ số khách đọc cho bạn"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  inputMode="numeric"
                  maxLength={6}
                />
                <Button
                  disabled={busy || otpInput.length !== 6}
                  onClick={() => doAction(() => api.ctvOrderVerifyOtp(tx.id, otpInput))}
                >
                  Xác nhận OTP
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileSignature size={16} /> Kênh dự phòng: chữ ký khách</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground">Khách lớn tuổi / không có sóng: chụp ảnh chữ ký trên phiếu giao.</p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  doAction(() => api.ctvOrderUploadSignature(tx.id, f));
                }}
                className="text-sm"
              />
            </CardContent>
          </Card>
        </div>
      );
    }
    if (['DRAFT', 'INVENTORY_PENDING'].includes(tx.status)) {
      return (
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => {
            const reason = window.prompt('Lý do huỷ?') || '';
            if (reason) doAction(() => api.ctvOrderCancel(tx.id, reason));
          }}
        >
          <XCircle className="w-4 h-4 mr-1" /> Huỷ đơn
        </Button>
      );
    }
    return null;
  };

  // ----- Timeline -----
  const timeline = [
    { label: 'Tạo đơn',            at: tx.draftedAt },
    { label: 'Xác nhận tồn',       at: tx.inventoryConfirmedAt },
    { label: 'Khách thanh toán',   at: tx.paidAt },
    { label: 'Bắt đầu soạn',       at: tx.packingStartedAt },
    { label: 'Soạn xong (pickup)', at: tx.packedAt },
    { label: 'CTV lấy hàng',       at: tx.pickedUpAt },
    { label: 'Gửi OTP',            at: tx.deliveryOtpSentAt },
    { label: 'OTP đã verify',      at: tx.deliveryOtpVerifiedAt },
    { label: 'Đã giao',            at: tx.deliveredAt },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Package /> Đơn #{tx.id}</h1>
          <Badge className={`mt-1 ${meta.color}`}>{meta.label}</Badge>
        </div>
        <Button variant="outline" onClick={() => router.push('/ctv/transactions')}>← Danh sách</Button>
      </div>

      {error && <Card><CardContent className="p-4 text-red-600">{error}</CardContent></Card>}

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Khách hàng</CardTitle></CardHeader>
          <CardContent className="text-sm">
            <div className="font-medium">{tx.customer?.name || '—'}</div>
            <div className="text-muted-foreground">{tx.customer?.phone}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Kho xuất</CardTitle></CardHeader>
          <CardContent className="text-sm">
            <div className="font-medium">{tx.warehouse?.code || '—'}</div>
            <div className="text-xs text-muted-foreground">{tx.warehouse?.address}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Tổng</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatVND(Number(tx.totalAmount))}</div>
            <div className="text-xs text-muted-foreground">{tx.items.length} sản phẩm</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Hành động</CardTitle></CardHeader>
        <CardContent>{actions() || <span className="text-muted-foreground text-sm">Không có hành động cho trạng thái hiện tại.</span>}</CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Sản phẩm</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <tbody>
              {tx.items.map((li) => (
                <tr key={li.id} className="border-b last:border-0">
                  <td className="py-2">×{li.quantity}</td>
                  <td>{li.product?.name}</td>
                  <td className="text-right text-muted-foreground">{formatVND(Number(li.unitPrice) * li.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Clock size={16} /> Mốc thời gian</CardTitle></CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm">
              {timeline.map((t, i) => (
                <li key={i} className={`flex justify-between ${t.at ? '' : 'text-muted-foreground'}`}>
                  <span className="flex items-center gap-2">
                    {t.at ? <CheckCircle2 size={14} className="text-emerald-600" /> : <Clock size={14} />}
                    {t.label}
                  </span>
                  <span className="text-xs">{fmt(t.at)}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Audit log</CardTitle></CardHeader>
          <CardContent>
            <ol className="space-y-1 text-xs">
              {tx.statusLogs.map((l) => (
                <li key={l.id}>
                  <span className="text-muted-foreground">{new Date(l.at).toLocaleString('vi-VN')}</span>{' · '}
                  <code>{l.fromStatus || '∅'}</code> → <code>{l.toStatus}</code>{' '}
                  <span className="text-muted-foreground">({l.actorRole})</span>
                  {l.note && <span className="text-muted-foreground"> — {l.note}</span>}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>

      {tx.inventoryRejectedReason && (
        <Card className="border-red-200">
          <CardHeader><CardTitle className="text-base text-red-700">Lý do từ chối tồn kho</CardTitle></CardHeader>
          <CardContent>{tx.inventoryRejectedReason}</CardContent>
        </Card>
      )}
      {tx.cancelledReason && (
        <Card>
          <CardHeader><CardTitle className="text-base">Lý do huỷ</CardTitle></CardHeader>
          <CardContent>{tx.cancelledReason}</CardContent>
        </Card>
      )}
    </div>
  );
}

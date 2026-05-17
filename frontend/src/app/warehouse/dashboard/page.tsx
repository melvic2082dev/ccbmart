'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Boxes, ClipboardList, PackageCheck, QrCode, Wallet } from 'lucide-react';

type Counts = {
  pendingInv: number;
  awaitingPay: number;
  paid: number;
  packing: number;
  awaitingPickup: number;
};

export default function WarehouseDashboardPage() {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.warehouseDashboard()
      .then((res) => setCounts(res.counts))
      .catch((e) => setError(e?.message || 'Lỗi tải'));
  }, []);

  const card = (
    title: string,
    count: number | undefined,
    href: string,
    Icon: typeof Boxes,
    accent: string,
  ) => (
    <Link href={href} className="block">
      <Card className={`hover:shadow-lg transition-shadow border-l-4 ${accent}`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{count ?? '—'}</div>
        </CardContent>
      </Card>
    </Link>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Boxes /> Bảng điều khiển kho</h1>
        <p className="text-sm text-muted-foreground">Luồng v3.3: từ "Chờ xác nhận tồn" → "Soạn hàng" → "Chờ CTV lấy" → CTV giao khách.</p>
      </div>

      {error && <Card><CardContent className="p-4 text-red-600">{error}</CardContent></Card>}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {card('Chờ xác nhận tồn',  counts?.pendingInv,     '/warehouse/pending-inventory', ClipboardList, 'border-l-orange-500')}
        {card('Chờ thanh toán',    counts?.awaitingPay,    '/warehouse/pending-inventory', Wallet,        'border-l-amber-500')}
        {card('Đã thanh toán',     counts?.paid,           '/warehouse/packing',           PackageCheck,  'border-l-blue-500')}
        {card('Đang soạn',         counts?.packing,        '/warehouse/packing',           PackageCheck,  'border-l-indigo-500')}
        {card('Chờ CTV lấy',       counts?.awaitingPickup, '/warehouse/awaiting-pickup',   QrCode,        'border-l-green-500')}
      </div>

      <Card>
        <CardHeader><CardTitle>Quy trình</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <ol className="list-decimal pl-6 space-y-1">
            <li>CTV tạo đơn nháp → đơn rơi vào <strong>Chờ xác nhận tồn</strong> (5 phút SLA).</li>
            <li>Thủ kho ấn <em>"Có hàng"</em> → khách được yêu cầu thanh toán.</li>
            <li>Khi có thanh toán, đơn tự chuyển sang <strong>Đang soạn</strong>.</li>
            <li>Soạn xong → sinh mã pickup (6 chữ/số), đơn vào <strong>Chờ CTV lấy</strong>.</li>
            <li>CTV đến kho, quét mã → nhận hàng.</li>
            <li>CTV giao khách, xác nhận bằng <strong>OTP</strong> hoặc <strong>chữ ký</strong>.</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

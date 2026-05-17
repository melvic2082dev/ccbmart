'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function WarehouseSettingsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Cài đặt thủ kho</h1>
      <Card>
        <CardHeader><CardTitle>Trang đang được xây dựng</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Sắp tới: cấu hình mã màu (sáng / chiều / tối), quy tắc auto-promote PAID → PACKING,
          danh sách thủ kho cùng kho.
        </CardContent>
      </Card>
    </div>
  );
}

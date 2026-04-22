'use client'

import { useEffect, useState, useCallback } from 'react'
import { api, formatVND } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function AgencyTransactionsPage() {
  const [data, setData] = useState<any>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback((p: number) => {
    setLoading(true)
    api.agencyTransactions(p)
      .then((res: any) => setData(res))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchData(page)
  }, [page, fetchData])

  const totalPages = data?.totalPages ?? 1

  return (
    <>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Lịch sử giao dịch</h1>

        <Card>
          <CardHeader>
            <CardTitle>Danh sách đơn hàng</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <p className="text-muted-foreground">Đang tải...</p>
              </div>
            ) : !data?.transactions?.length ? (
              <p className="text-muted-foreground text-sm">Không có giao dịch nào.</p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mã đơn</TableHead>
                      <TableHead>Khách hàng</TableHead>
                      <TableHead>Sản phẩm</TableHead>
                      <TableHead className="text-right">Tổng tiền</TableHead>
                      <TableHead>Ngày</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.transactions.map((tx: any) => (
                      <TableRow key={tx.id}>
                        <TableCell className="font-mono text-sm">{tx.id}</TableCell>
                        <TableCell>{tx.customerName ?? '—'}</TableCell>
                        <TableCell>
                          {Array.isArray(tx.items) && tx.items.length > 0 ? (
                            <ul className="space-y-0.5">
                              {tx.items.map((item: any, idx: number) => (
                                <li key={idx} className="text-sm">
                                  {item.productName}
                                  {item.quantity !== undefined && (
                                    <span className="text-muted-foreground"> x{item.quantity}</span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatVND(tx.total)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {tx.date
                            ? new Date(tx.date).toLocaleDateString('vi-VN')
                            : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Trang {page} / {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Trước
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Sau
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}

'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { api, formatVND } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface Customer {
  id: string | number
  name: string
  phone: string
  totalSpent: number
  firstPurchaseDate: string
}

export default function CtvCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await api.ctvCustomers()
        const sorted = [...(data || [])].sort(
          (a: Customer, b: Customer) => b.totalSpent - a.totalSpent
        )
        setCustomers(sorted)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  return (
    <>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Khách hàng của tôi</h1>
        <Card>
          <CardHeader>
            <CardTitle>Danh sách khách hàng</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-sm">Đang tải...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên</TableHead>
                    <TableHead>SĐT</TableHead>
                    <TableHead>Tổng chi tiêu</TableHead>
                    <TableHead>Mua lần đầu</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell>{customer.phone}</TableCell>
                      <TableCell>{formatVND(customer.totalSpent)}</TableCell>
                      <TableCell>
                        {customer.firstPurchaseDate
                          ? new Date(customer.firstPurchaseDate).toLocaleDateString('vi-VN')
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {customers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        Chưa có khách hàng nào
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}

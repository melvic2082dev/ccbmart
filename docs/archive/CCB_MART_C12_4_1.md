# CCB Mart - C12.4.1 Release Notes

## Phiên bản: C12.4.1
## Ngày: 2026-04-14

### Sửa lỗi
- Bổ sung logic kiểm tra điều kiện quỹ 1% cho GĐKD sau thoát ly
- Chỉ tạo BreakawayFee level=3 khi GĐKD không phải F1 cũ và không phải F2 cũ

### File thay đổi
| File | Thay đổi |
|------|----------|
| `backend/prisma/schema.prisma` | Thêm index cho BreakawayLog (oldParentId, newParentId, status) |
| `backend/src/services/breakaway.js` | Thêm `findTopGdkdUser()` và logic kiểm tra trong `processMonthlyBreakawayFees()` |

### Commit
- Hash: [sẽ insert]
- Message: fix(breakaway): add condition for GDKD 1% fund - only when GDKD is not F1 or F2

### Trạng thái
✅ Đã sửa code
✅ Đã push lên GitHub

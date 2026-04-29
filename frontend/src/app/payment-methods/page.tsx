import { InfoPage } from '@/components/landing/InfoPage';

export const metadata = { title: 'Phương thức thanh toán · CCB Mart' };

export default function PaymentMethodsPage() {
  return (
    <InfoPage
      eyebrow="Hướng dẫn"
      title="Phương thức thanh toán"
      breadcrumbLabel="Phương thức thanh toán"
      intro="CCB Mart hỗ trợ đầy đủ các hình thức thanh toán phổ biến tại Việt Nam, ưu tiên sự tiện lợi và an toàn cho khách hàng."
      sections={[
        { kind: 'heading', text: '1. Thanh toán khi nhận hàng (COD)' },
        { kind: 'paragraph', body: 'Phù hợp với khách hàng lần đầu mua sắm trên CCB Mart. Bạn chỉ thanh toán bằng tiền mặt cho shipper khi đã kiểm tra hàng. Áp dụng cho mọi đơn hàng dưới 5.000.000 ₫.' },

        { kind: 'heading', text: '2. Chuyển khoản ngân hàng' },
        { kind: 'callout', tone: 'olive', title: 'Tài khoản nhận', body: (
          <>
            <div><strong>Tên tài khoản:</strong> CÔNG TY TNHH CCB MART VIỆT NAM</div>
            <div><strong>Số tài khoản:</strong> 1234 5678 9012</div>
            <div><strong>Ngân hàng:</strong> Vietcombank — Chi nhánh Hà Nội</div>
            <div style={{ marginTop: 8 }}><strong>Nội dung:</strong> [Mã đơn hàng] — [Tên người đặt]</div>
          </>
        )},
        { kind: 'paragraph', body: 'Đơn hàng sẽ được xử lý sau khi CCB Mart xác nhận giao dịch (thường trong vòng 30 phút giờ hành chính).' },

        { kind: 'heading', text: '3. Ví điện tử' },
        { kind: 'bullet', items: [
          'MoMo — quét mã QR hoặc nhập số điện thoại 0xxxx xxx xxx.',
          'ZaloPay — đăng nhập và xác nhận trực tiếp trong ứng dụng.',
          'VNPay — chuyển hướng qua cổng VNPay (hỗ trợ 30+ ngân hàng).',
        ]},

        { kind: 'heading', text: '4. Thẻ ATM / Visa / Mastercard' },
        { kind: 'paragraph', body: 'Hỗ trợ đầy đủ thẻ nội địa (qua cổng NAPAS) và thẻ quốc tế Visa, Mastercard, JCB. Mọi giao dịch đều được mã hoá theo chuẩn PCI-DSS.' },

        { kind: 'heading', text: '5. Trả sau (cho Hội viên)' },
        { kind: 'paragraph', body: 'Hội viên CCB có lịch sử mua hàng từ 6 tháng trở lên có thể đăng ký Trả sau với hạn mức 5.000.000 ₫. Đơn được giao ngay, thanh toán trong vòng 30 ngày không phụ phí.' },

        { kind: 'callout', tone: 'red', title: 'An toàn thanh toán',
          body: 'CCB Mart không bao giờ yêu cầu khách hàng cung cấp mật khẩu Internet Banking, OTP qua điện thoại hay tin nhắn. Mọi yêu cầu như vậy đều là lừa đảo — vui lòng báo ngay hotline 1900 6868.' },
      ]}
      cta={{ label: 'Quay lại giỏ hàng', href: '/cart' }}
    />
  );
}

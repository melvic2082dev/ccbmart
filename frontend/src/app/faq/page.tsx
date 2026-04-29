import { InfoPage } from '@/components/landing/InfoPage';

export const metadata = { title: 'Câu hỏi thường gặp · CCB Mart' };

export default function FaqPage() {
  return (
    <InfoPage
      eyebrow="Hỗ trợ khách hàng"
      title="Câu hỏi thường gặp"
      breadcrumbLabel="Câu hỏi thường gặp"
      intro="Mọi thắc mắc phổ biến về đặt hàng, giao nhận, đổi trả và quỹ Vì đồng đội. Nếu không tìm thấy câu trả lời, hãy gọi hotline 1900 6868."
      sections={[
        { kind: 'heading', text: 'Đặt hàng & thanh toán' },
        { kind: 'qa', question: 'Tôi có cần đăng ký tài khoản để mua hàng không?',
          answer: 'Không bắt buộc. Bạn có thể mua hàng với tư cách khách. Tuy nhiên nếu đăng ký Hội viên, bạn sẽ được hưởng giá ưu đãi và tích điểm cho mỗi đơn.' },
        { kind: 'qa', question: 'CCB Mart hỗ trợ những phương thức thanh toán nào?',
          answer: 'Tiền mặt khi nhận hàng (COD), chuyển khoản ngân hàng, ví điện tử (Momo, ZaloPay, VNPay) và thẻ ATM/Visa/Mastercard.' },
        { kind: 'qa', question: 'Tôi có thể xuất hoá đơn VAT không?',
          answer: 'Có. Khi đặt hàng, vui lòng điền thông tin doanh nghiệp tại bước thanh toán. Hoá đơn điện tử sẽ được gửi qua email trong vòng 24 giờ.' },

        { kind: 'heading', text: 'Giao nhận' },
        { kind: 'qa', question: 'Mất bao lâu để nhận được hàng?',
          answer: 'Nội thành Hà Nội & TP. HCM: 2-4 giờ với đơn trước 16h. Các tỉnh thành khác: 1-3 ngày làm việc.' },
        { kind: 'qa', question: 'Có miễn phí giao hàng không?',
          answer: 'Miễn phí giao hàng cho mọi đơn từ 300.000 ₫. Đơn dưới 300.000 ₫: phí 25.000 ₫ (nội thành) hoặc 35.000 ₫ (liên tỉnh).' },
        { kind: 'qa', question: 'Tôi có thể đổi địa chỉ giao hàng sau khi đặt không?',
          answer: 'Có thể đổi trước khi đơn được giao tới shipper. Vui lòng gọi hotline 1900 6868 để hỗ trợ nhanh nhất.' },

        { kind: 'heading', text: 'Đổi trả & bảo hành' },
        { kind: 'qa', question: 'Chính sách đổi trả của CCB Mart như thế nào?',
          answer: 'Trong vòng 7 ngày kể từ khi nhận hàng, bạn có thể đổi/trả nếu sản phẩm bị lỗi, sai mô tả hoặc hết hạn. Xem chi tiết tại trang Chính sách đổi trả.' },
        { kind: 'qa', question: 'Tôi nhận được hàng bị hỏng, phải làm sao?',
          answer: 'Vui lòng chụp ảnh sản phẩm và gọi hotline trong vòng 24 giờ. Chúng tôi sẽ đổi mới hoặc hoàn tiền 100%.' },

        { kind: 'heading', text: 'Quỹ Vì đồng đội' },
        { kind: 'qa', question: 'Quỹ Vì đồng đội là gì?',
          answer: 'Là quỹ trích 1% từ mỗi đơn hàng để hỗ trợ Cựu Chiến Binh có hoàn cảnh khó khăn (neo đơn, bệnh tật, mất sức lao động). Mọi khoản chi đều có biên lai và xác nhận của Hội CCB địa phương.' },
        { kind: 'qa', question: 'Tôi có thể đóng góp thêm vào quỹ không?',
          answer: 'Có. Tại bước thanh toán, bạn có thể chọn đóng góp thêm 5.000 / 10.000 / 20.000 ₫ (hoặc số tiền tự nhập). Toàn bộ số tiền được công khai trên trang Minh bạch quỹ mỗi tháng.' },
        { kind: 'qa', question: 'Làm sao biết tiền quỹ được dùng đúng mục đích?',
          answer: 'Sao kê chi tiết được công khai mỗi tháng tại trang chủ — mục Quỹ Vì đồng đội. Mọi khoản chi đều kèm biên lai, ảnh và xác nhận của Hội CCB cấp xã/phường.' },

        { kind: 'heading', text: 'Trở thành đối tác / nhà cung cấp' },
        { kind: 'qa', question: 'Tôi là Cựu Chiến Binh, làm sao đưa sản phẩm lên CCB Mart?',
          answer: 'Đăng ký tại trang Trở thành đối tác. Hội CCB địa phương sẽ xác nhận và hướng dẫn quy trình kiểm định, đóng gói, niêm yết.' },
        { kind: 'qa', question: 'Phí đưa sản phẩm lên CCB Mart là bao nhiêu?',
          answer: 'Hội viên CCB không phải trả phí niêm yết. CCB Mart chỉ trích 7-12% trên giá bán (tuỳ ngành hàng) để vận hành.' },
      ]}
      cta={{ label: 'Liên hệ trực tiếp với CCB Mart', href: '/about' }}
    />
  );
}

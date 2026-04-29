import { InfoPage } from '@/components/landing/InfoPage';

export const metadata = { title: 'Chính sách giao hàng · CCB Mart' };

export default function ShippingPolicyPage() {
  return (
    <InfoPage
      eyebrow="Chính sách"
      title="Chính sách giao hàng"
      breadcrumbLabel="Chính sách giao hàng"
      intro="CCB Mart cam kết giao hàng đúng hẹn, đóng gói cẩn thận và miễn phí giao hàng cho mọi đơn từ 300.000 ₫."
      sections={[
        { kind: 'heading', text: 'Phạm vi & thời gian giao hàng' },
        { kind: 'bullet', items: [
          <span key="a"><strong>Nội thành Hà Nội và TP. HCM:</strong> giao trong 2-4 giờ với đơn đặt trước 16:00.</span>,
          <span key="b"><strong>Các thành phố lớn khác (Đà Nẵng, Hải Phòng, Cần Thơ…):</strong> 1-2 ngày làm việc.</span>,
          <span key="c"><strong>Tỉnh, huyện vùng sâu vùng xa:</strong> 2-5 ngày làm việc tuỳ tuyến vận chuyển.</span>,
        ]},

        { kind: 'heading', text: 'Phí giao hàng' },
        { kind: 'callout', tone: 'olive', title: 'Miễn phí giao hàng', body: 'Đơn hàng từ 300.000 ₫ trở lên được miễn phí giao hàng toàn quốc.' },
        { kind: 'bullet', items: [
          'Đơn dưới 300.000 ₫ trong nội thành: 25.000 ₫.',
          'Đơn dưới 300.000 ₫ liên tỉnh: 35.000 ₫.',
          'Hàng cồng kềnh (>5 kg) hoặc dễ vỡ: phụ phí 15.000 ₫.',
        ]},

        { kind: 'heading', text: 'Đối tác vận chuyển' },
        { kind: 'paragraph', body: 'CCB Mart kết hợp đội shipper nội bộ tại Hà Nội & TP. HCM với các đối tác Giao Hàng Nhanh, Viettel Post và J&T Express cho các tuyến tỉnh. Mọi shipper đều được Hội CCB địa phương giám sát.' },

        { kind: 'heading', text: 'Theo dõi đơn hàng' },
        { kind: 'paragraph', body: 'Sau khi đặt hàng thành công, bạn sẽ nhận được mã đơn qua SMS và email. Vào trang Tra cứu đơn hàng để xem trạng thái và vị trí shipper theo thời gian thực.' },

        { kind: 'heading', text: 'Trường hợp đặc biệt' },
        { kind: 'qa', question: 'Khi nào shipper sẽ giao lại nếu tôi không có nhà?',
          answer: 'Shipper sẽ thử giao tối đa 2 lần. Lần thứ 2 sẽ được hẹn trước qua điện thoại. Sau 2 lần thất bại, đơn sẽ được trả về kho và CCB Mart sẽ liên hệ để sắp xếp lại.' },
        { kind: 'qa', question: 'Hàng tươi sống có giao xa không?',
          answer: 'Hàng tươi sống chỉ giao trong bán kính 20 km kể từ cửa hàng gần nhất, đảm bảo bảo quản lạnh suốt quá trình vận chuyển.' },
      ]}
      cta={{ label: 'Tra cứu đơn hàng của tôi', href: '/order-tracking' }}
    />
  );
}

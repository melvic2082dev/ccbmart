import { InfoPage } from '@/components/landing/InfoPage';

export const metadata = { title: 'Chính sách bảo mật · CCB Mart' };

export default function PrivacyPage() {
  return (
    <InfoPage
      eyebrow="Pháp lý"
      title="Chính sách bảo mật"
      breadcrumbLabel="Chính sách bảo mật"
      intro="CCB Mart cam kết bảo vệ thông tin cá nhân của khách hàng theo Luật An ninh mạng 2018 và Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân."
      sections={[
        { kind: 'heading', text: 'Thông tin chúng tôi thu thập' },
        { kind: 'bullet', items: [
          'Họ tên, số điện thoại, email, địa chỉ giao hàng.',
          'Lịch sử đặt hàng và sản phẩm yêu thích.',
          'Thông tin thanh toán (chỉ lưu các 4 số cuối thẻ; số đầy đủ do cổng thanh toán xử lý).',
          'Cookies và dữ liệu phiên duyệt web phục vụ trải nghiệm cá nhân hoá.',
        ]},

        { kind: 'heading', text: 'Mục đích sử dụng' },
        { kind: 'bullet', items: [
          'Xử lý đơn hàng, giao hàng và chăm sóc khách hàng.',
          'Cải thiện sản phẩm, dịch vụ thông qua phân tích dữ liệu phi định danh.',
          'Gửi thông báo khuyến mãi (chỉ khi khách hàng đồng ý).',
          'Tuân thủ yêu cầu pháp luật và phòng chống gian lận.',
        ]},

        { kind: 'heading', text: 'Chia sẻ thông tin với bên thứ ba' },
        { kind: 'paragraph', body: 'CCB Mart chỉ chia sẻ thông tin với các bên cung cấp dịch vụ vận chuyển, thanh toán và viễn thông trong phạm vi tối thiểu cần thiết để hoàn tất đơn hàng. Chúng tôi KHÔNG bán dữ liệu khách hàng cho bất kỳ bên thứ ba nào vì mục đích quảng cáo.' },

        { kind: 'heading', text: 'Bảo mật dữ liệu' },
        { kind: 'bullet', items: [
          'Toàn bộ kết nối website sử dụng mã hoá HTTPS.',
          'Mật khẩu được mã hoá một chiều (bcrypt); nhân viên CCB Mart không thể đọc mật khẩu của khách hàng.',
          'Dữ liệu được sao lưu định kỳ và lưu trữ tại các trung tâm dữ liệu đặt tại Việt Nam.',
        ]},

        { kind: 'heading', text: 'Quyền của khách hàng' },
        { kind: 'paragraph', body: 'Khách hàng có quyền truy cập, sửa đổi hoặc yêu cầu xoá thông tin cá nhân bằng cách đăng nhập tài khoản hoặc gửi yêu cầu qua email hotro@ccbmart.vn. CCB Mart sẽ phản hồi trong vòng 7 ngày làm việc.' },

        { kind: 'heading', text: 'Cookies' },
        { kind: 'paragraph', body: 'Website sử dụng cookies để ghi nhớ giỏ hàng, tuỳ chọn ngôn ngữ và phân tích lưu lượng truy cập. Bạn có thể tắt cookies trong trình duyệt; tuy nhiên một số tính năng có thể không hoạt động bình thường.' },

        { kind: 'callout', tone: 'olive', title: 'Liên hệ về bảo mật',
          body: 'Mọi câu hỏi liên quan đến bảo mật dữ liệu, vui lòng gửi tới hotro@ccbmart.vn hoặc gọi 1900 6868 (8:00 — 22:00 hằng ngày).' },
      ]}
    />
  );
}

import { InfoPage } from '@/components/landing/InfoPage';

export const metadata = { title: 'Điều khoản sử dụng · CCB Mart' };

export default function TermsPage() {
  return (
    <InfoPage
      eyebrow="Pháp lý"
      title="Điều khoản sử dụng"
      breadcrumbLabel="Điều khoản sử dụng"
      intro="Bằng việc truy cập và sử dụng CCB Mart, bạn đồng ý tuân thủ các điều khoản dưới đây. Vui lòng đọc kỹ trước khi đặt hàng."
      sections={[
        { kind: 'heading', text: '1. Phạm vi điều chỉnh' },
        { kind: 'paragraph', body: 'Điều khoản này áp dụng cho mọi giao dịch giữa khách hàng và Công ty TNHH CCB Mart Việt Nam ("CCB Mart") trên website ccbmart.vn, ứng dụng di động và hệ thống cửa hàng vật lý.' },

        { kind: 'heading', text: '2. Tài khoản người dùng' },
        { kind: 'bullet', items: [
          'Khách hàng chịu trách nhiệm về tính chính xác của thông tin đăng ký.',
          'Mỗi khách hàng chỉ được tạo một tài khoản. Tài khoản gian lận sẽ bị huỷ.',
          'Mật khẩu là thông tin bảo mật cá nhân; CCB Mart không chịu trách nhiệm thiệt hại do khách hàng làm lộ mật khẩu.',
        ]},

        { kind: 'heading', text: '3. Đặt hàng và thanh toán' },
        { kind: 'paragraph', body: 'Đơn hàng được coi là xác nhận khi khách hàng nhận được mã đơn qua SMS/email. CCB Mart có quyền từ chối đơn trong trường hợp hết hàng, nghi ngờ gian lận hoặc khách hàng vi phạm điều khoản trước đó.' },

        { kind: 'heading', text: '4. Quyền sở hữu trí tuệ' },
        { kind: 'paragraph', body: 'Toàn bộ nội dung trên CCB Mart (logo, hình ảnh, bài viết, giao diện) thuộc bản quyền của CCB Mart hoặc đối tác. Mọi hành vi sao chép, phân phối phải được CCB Mart đồng ý bằng văn bản.' },

        { kind: 'heading', text: '5. Hành vi bị cấm' },
        { kind: 'bullet', items: [
          'Đăng tải nội dung sai sự thật, vu khống, xâm phạm uy tín của CCB Mart hoặc đối tác.',
          'Sử dụng công cụ tự động (bot, scraper) để truy cập hệ thống.',
          'Cố ý phá hoại, xâm nhập trái phép vào hệ thống.',
          'Lợi dụng quỹ Vì đồng đội cho mục đích trục lợi cá nhân.',
        ]},

        { kind: 'heading', text: '6. Giải quyết tranh chấp' },
        { kind: 'paragraph', body: 'Mọi tranh chấp phát sinh sẽ được giải quyết trên tinh thần hoà giải. Nếu không đạt thoả thuận, các bên đưa ra Toà án nhân dân có thẩm quyền tại Hà Nội theo quy định pháp luật Việt Nam.' },

        { kind: 'heading', text: '7. Thay đổi điều khoản' },
        { kind: 'paragraph', body: 'CCB Mart có quyền cập nhật điều khoản này theo thời gian. Phiên bản mới sẽ được công bố trên trang này, có hiệu lực ngay khi đăng tải.' },

        { kind: 'callout', tone: 'olive', title: 'Cập nhật mới nhất',
          body: 'Phiên bản hiện tại có hiệu lực từ ngày 01/01/2026.' },
      ]}
    />
  );
}

import { InfoPage } from '@/components/landing/InfoPage';

export const metadata = { title: 'Tuyển dụng · CCB Mart' };

export default function CareersPage() {
  return (
    <InfoPage
      eyebrow="Tham gia đội ngũ"
      title="Tuyển dụng tại CCB Mart"
      breadcrumbLabel="Tuyển dụng"
      intro="CCB Mart ưu tiên tuyển dụng con em Cựu Chiến Binh và lao động có hoàn cảnh đặc biệt. Mọi vị trí đều được đào tạo bài bản và hưởng chế độ ngang chuẩn doanh nghiệp tư nhân."
      sections={[
        { kind: 'heading', text: 'Chính sách tuyển dụng' },
        { kind: 'bullet', items: [
          'Ưu tiên 1: Cựu Chiến Binh, thân nhân liệt sĩ, thương binh.',
          'Ưu tiên 2: Con em Cựu Chiến Binh và lao động có hoàn cảnh khó khăn.',
          'Lương cơ bản từ 8 triệu (nhân viên cửa hàng) đến 35 triệu (quản lý vùng).',
          'Đóng đầy đủ BHXH, BHYT, BHTN ngay từ ngày làm việc đầu tiên.',
          'Phụ cấp ăn trưa, công tác phí, thưởng năng suất hằng tháng.',
        ]},

        { kind: 'heading', text: 'Vị trí đang tuyển' },
        { kind: 'callout', tone: 'olive', title: 'Nhân viên cửa hàng (toàn quốc · 60 vị trí)', body: 'Bán hàng, tư vấn, hỗ trợ khách. Lương 8-12 triệu + thưởng KPI. Yêu cầu: tốt nghiệp THPT, giao tiếp tốt.' },
        { kind: 'callout', tone: 'olive', title: 'Quản lý cửa hàng (15 vị trí)', body: 'Quản lý doanh thu, nhân sự, tồn kho cửa hàng. Lương 15-22 triệu. Yêu cầu: 2+ năm quản lý bán lẻ.' },
        { kind: 'callout', tone: 'olive', title: 'Cộng tác viên thu mua nông sản (toàn quốc)', body: 'Kết nối với hội viên CCB tại các địa phương để thu mua nông sản. Lương cơ bản + hoa hồng theo sản lượng.' },
        { kind: 'callout', tone: 'olive', title: 'Chuyên viên Marketing (Hà Nội · 3 vị trí)', body: 'Thiết kế chiến dịch truyền thông, quản lý kênh social. Lương 15-25 triệu. Yêu cầu: 3+ năm kinh nghiệm.' },
        { kind: 'callout', tone: 'olive', title: 'Lập trình viên Web (Hà Nội · 2 vị trí)', body: 'Phát triển và vận hành website CCB Mart (Next.js + Node.js). Lương 20-35 triệu. Có thể làm việc kết hợp.' },

        { kind: 'heading', text: 'Quy trình ứng tuyển' },
        { kind: 'numbered', items: [
          'Gửi CV và thư giới thiệu tới tuyendung@ccbmart.vn — tiêu đề “[Vị trí] — [Họ tên]”.',
          'Phòng Nhân sự phản hồi trong 5 ngày làm việc. Vòng phỏng vấn gồm 1-2 buổi.',
          'Ứng viên phù hợp được mời thử việc 30 ngày, sau đó ký hợp đồng chính thức.',
        ]},

        { kind: 'callout', tone: 'gold', title: 'Liên hệ trực tiếp',
          body: <>Phòng Nhân sự CCB Mart — Hotline <a href="tel:19006868" style={{ color: 'var(--ccb-gold-dark)', fontWeight: 700 }}>1900 6868</a> · Email <a href="mailto:tuyendung@ccbmart.vn" style={{ color: 'var(--ccb-gold-dark)', fontWeight: 700 }}>tuyendung@ccbmart.vn</a></> },
      ]}
      cta={{ label: 'Gửi CV ngay', href: 'mailto:tuyendung@ccbmart.vn' }}
    />
  );
}

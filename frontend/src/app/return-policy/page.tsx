import { InfoPage } from '@/components/landing/InfoPage';

export const metadata = { title: 'Chính sách đổi trả · CCB Mart' };

export default function ReturnPolicyPage() {
  return (
    <InfoPage
      eyebrow="Chính sách"
      title="Chính sách đổi trả"
      breadcrumbLabel="Chính sách đổi trả"
      intro="CCB Mart cam kết hoàn tiền 100% nếu sản phẩm bị lỗi, sai mô tả hoặc hết hạn. Mọi sản phẩm đều được Hội CCB địa phương xác nhận trước khi giao tới khách hàng."
      sections={[
        { kind: 'heading', text: 'Thời gian áp dụng' },
        { kind: 'paragraph', body: 'Trong vòng 7 ngày kể từ ngày nhận hàng, bạn có quyền yêu cầu đổi/trả nếu thuộc một trong các trường hợp dưới đây.' },

        { kind: 'heading', text: 'Các trường hợp được đổi/trả' },
        { kind: 'bullet', items: [
          'Sản phẩm bị hỏng, vỡ, móp méo trong quá trình vận chuyển.',
          'Sản phẩm sai mô tả, sai loại, sai số lượng so với đơn đặt hàng.',
          'Sản phẩm còn nguyên niêm phong nhưng đã hết hạn sử dụng hoặc gần hết hạn (<30 ngày).',
          'Sản phẩm có dấu hiệu mốc, hư hỏng do điều kiện bảo quản trong khâu phân phối.',
        ]},

        { kind: 'heading', text: 'Các trường hợp KHÔNG đổi/trả' },
        { kind: 'callout', tone: 'red', title: 'Lưu ý', body: 'CCB Mart từ chối đổi trả với các trường hợp sau:' },
        { kind: 'bullet', items: [
          'Sản phẩm đã được mở niêm phong, sử dụng (đặc biệt thực phẩm tươi, đồ uống).',
          'Hư hỏng do lỗi bảo quản của khách hàng (để dưới nắng, ẩm mốc do người dùng).',
          'Yêu cầu đổi/trả sau 7 ngày kể từ ngày nhận hàng.',
          'Sản phẩm không có hoá đơn hoặc mã đơn hàng kèm theo.',
        ]},

        { kind: 'heading', text: 'Quy trình đổi/trả' },
        { kind: 'numbered', items: [
          'Gọi hotline 1900 6868 hoặc gửi email hotro@ccbmart.vn kèm mã đơn + ảnh sản phẩm.',
          'CCB Mart phản hồi trong 24 giờ làm việc và xác nhận hình thức xử lý (đổi mới hoặc hoàn tiền).',
          'Shipper đến nhận lại hàng (miễn phí) hoặc bạn mang đến cửa hàng CCB Mart gần nhất.',
          'Tiền hoàn về tài khoản gốc trong 3-5 ngày làm việc, hoặc đổi sản phẩm mới được giao trong 1-2 ngày.',
        ]},

        { kind: 'heading', text: 'Bảo hành' },
        { kind: 'paragraph', body: 'Đối với hàng thủ công mỹ nghệ và đồ gia dụng (gốm sứ, nồi đất, dao thớt…), CCB Mart cam kết bảo hành 30 ngày kể từ ngày mua đối với các lỗi sản xuất.' },
      ]}
      cta={{ label: 'Liên hệ hotline 1900 6868', href: 'tel:19006868' }}
    />
  );
}

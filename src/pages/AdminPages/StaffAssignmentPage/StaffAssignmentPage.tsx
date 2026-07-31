import { Card, Notice, PageHeader, SectionHeading } from "../../../components/ui";

export function StaffAssignmentPage() {
  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          title="Phân công nhân viên thủ công"
          description="Quy trình tranh chấp ưu tiên phân công tự động và không để quản trị viên gán nhân viên trong luồng chính."
        />
      </div>

      <Notice tone="warning" title="Tạm thời để trống chờ máy chủ">
        Màn này không gọi dịch vụ để tránh sai quyền nghiệp vụ. Nếu vẫn cần phân công
        thủ công, máy chủ cần cung cấp điểm truy cập rõ ràng cho nhân viên vận hành và quy định
        người được phép thao tác.
      </Notice>

      <Card className="p-6">
        <SectionHeading
          title="Điểm truy cập máy chủ cần bổ sung nếu muốn dùng màn này"
          description="Các dịch vụ dưới đây chưa nên gọi từ giao diện hiện tại."
        />
        <ul className="mt-5 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600">
          <li>
            Danh sách toàn bộ tranh chấp cho vận hành:
            <code className="ml-1 rounded bg-slate-100 px-1.5 py-0.5">
              GET /api/v1/admin/disputes
            </code>
          </li>
          <li>
            Phân công thủ công có người thao tác rõ ràng:
            <code className="ml-1 rounded bg-slate-100 px-1.5 py-0.5">
              POST /api/v1/disputes/:case/routing
            </code>
          </li>
          <li>
            Phản hồi phải trả tên hiển thị, khối lượng công việc, khả năng tiếp nhận và trạng thái
            xung đột lợi ích, không yêu cầu giao diện hiển thị mã định danh nội bộ.
          </li>
        </ul>
      </Card>
    </div>
  );
}

import { Card, Notice, PageHeader, SectionHeading } from "../../../components/ui";

export function StaffAssignmentPage() {
  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          title="Routing Staff thủ công"
          description="Flow tranh chấp v2.3 ưu tiên auto-route và không để Admin gán Staff trong luồng chính."
        />
      </div>

      <Notice tone="warning" title="Tạm thời để trống chờ backend">
        Màn này không gọi API để tránh sai quyền nghiệp vụ. Nếu vẫn cần routing
        thủ công, backend cần cung cấp endpoint rõ ràng cho Staff/Ops và quy định
        actor được phép thao tác.
      </Notice>

      <Card className="p-6">
        <SectionHeading
          title="Endpoint cần backend bổ sung nếu muốn dùng màn này"
          description="Các API dưới đây chưa nên gọi từ UI hiện tại."
        />
        <ul className="mt-5 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600">
          <li>
            Danh sách toàn bộ tranh chấp cho vận hành:
            <code className="ml-1 rounded bg-slate-100 px-1.5 py-0.5">
              GET /api/v1/admin/disputes
            </code>
          </li>
          <li>
            Routing thủ công có actor rõ ràng:
            <code className="ml-1 rounded bg-slate-100 px-1.5 py-0.5">
              POST /api/v1/disputes/:case/routing
            </code>
          </li>
          <li>
            Response phải trả tên hiển thị, workload, availability và trạng thái
            conflict-of-interest, không yêu cầu UI hiển thị raw ID.
          </li>
        </ul>
      </Card>
    </div>
  );
}

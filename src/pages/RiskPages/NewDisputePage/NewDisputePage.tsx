import { Gavel } from "lucide-react";
import { Card, LinkButton, Notice, PageHeader } from "../../../components/ui";
import { useSession } from "../../../lib/session";

export function NewDisputePage() {
  const session = useSession();

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          title="Tạo tranh chấp milestone"
          description="Flow 5 chỉ tạo dispute từ workspace của contract/milestone thật để tránh nhập nhầm dữ liệu kỹ thuật."
        />
      </div>

      <Card className="p-6">
        <Notice tone="info" title="Không tạo dispute bằng form nhập ID">
          Backend hiện tạo dispute qua action từ milestone: Business từ chối
          deliverable hoặc Expert khiếu nại trong workspace. Trang này không
          gửi API riêng để tránh tạo dispute sai contract/milestone.
        </Notice>
        <div className="mt-5 flex flex-wrap gap-3">
          <LinkButton to="/app/contracts" variant="secondary">
            <Gavel className="h-4 w-4" />
            Mở danh sách contract
          </LinkButton>
          {(session?.role === "ADMIN" || session?.role === "STAFF") && (
            <LinkButton to="/app/tickets" variant="secondary">
              Xem dispute cần xử lý
            </LinkButton>
          )}
        </div>
      </Card>
    </div>
  );
}

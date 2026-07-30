import {
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  FileArchive,
  FileText,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { FirebaseFileLink } from "../../../components/FirebaseFileLink";
import { JobSowContent } from "../../../components/JobSowContent";
import {
  Badge,
  Card,
  EmptyState,
  LinkButton,
  MetricCard,
  PageHeader,
  SectionHeading,
} from "../../../components/ui";
import { contractApi, getApiErrorMessage } from "../../../lib/api";
import { formatCurrency, formatDateTime } from "../../../lib/utils";
import type { ProjectSummary } from "../../../types";

function durationLabel(value?: number, unit?: string) {
  if (!value) return "Chưa cập nhật";
  const normalized = (unit || "DAY").toUpperCase();
  if (normalized.includes("MONTH")) return `${value} tháng`;
  if (normalized.includes("WEEK")) return `${value} tuần`;
  return `${value} ngày`;
}

function externalUrl(value?: string) {
  const url = String(value || "").trim();
  if (!url) return "";
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export function ProjectSummaryPage() {
  const { contractId } = useParams();
  const id = Number(contractId);
  const invalidContractId = !Number.isFinite(id) || id <= 0;
  const [summary, setSummary] = useState<ProjectSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (invalidContractId) return;
    contractApi
      .getProjectSummary(id)
      .then(setSummary)
      .catch((requestError) => setError(getApiErrorMessage(requestError)))
      .finally(() => setLoading(false));
  }, [id, invalidContractId]);

  if (invalidContractId) {
    return (
      <EmptyState
        title="Chưa thể mở trang tổng kết"
        description="Mã hợp đồng không hợp lệ."
        action={<LinkButton to="/app/contracts">Quay lại danh sách hợp đồng</LinkButton>}
      />
    );
  }

  if (loading) {
    return <Card className="p-10 text-center font-semibold text-slate-500">Đang tải tổng kết dự án...</Card>;
  }

  if (!summary) {
    return (
      <EmptyState
        title="Chưa thể mở trang tổng kết"
        description={error || "Trang tổng kết chỉ có sau khi toàn bộ cột mốc được hoàn thành theo luồng nghiệm thu thành công."}
        action={<LinkButton to={`/app/contracts/${id}`}>Quay lại hợp đồng</LinkButton>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#ecfdf5,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          eyebrow="TỔNG KẾT DỰ ÁN"
          title={summary.projectTitle}
          description="Toàn bộ thông tin, kết quả nghiệm thu và sản phẩm cuối cùng của dự án đã được tập hợp tại đây."
          actions={
            <>
              <LinkButton to={`/app/contracts/${summary.contractId}`} variant="secondary">Xem hợp đồng</LinkButton>
              <LinkButton to={`/app/reviews?contractId=${summary.contractId}`}>Đánh giá đối tác</LinkButton>
            </>
          }
        />
      </div>

      <Card className="border-emerald-200 bg-emerald-50/70 p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-emerald-600 shadow-sm"><CheckCircle2 className="h-5 w-5" /></span>
          <div>
            <h2 className="font-display text-lg font-extrabold text-emerald-950">Dự án đã hoàn thành thành công</h2>
            <p className="mt-1 text-sm leading-6 text-emerald-800">Tất cả {summary.milestones.length} cột mốc đã được nghiệm thu và kết quả bàn giao đã được lưu lại.</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Tổng ngân sách" value={formatCurrency(summary.totalBudget)} icon={<CircleDollarSign className="h-5 w-5" />} tone="mint" />
        <MetricCard label="Thời gian hợp đồng" value={`${summary.timelineDays} ngày`} icon={<CalendarDays className="h-5 w-5" />} />
        <MetricCard label="Lĩnh vực" value={summary.domainName || "Chưa cập nhật"} icon={<BriefcaseBusiness className="h-5 w-5" />} tone="amber" />
        <MetricCard label="Số cột mốc" value={summary.milestones.length} helper="Đã hoàn thành toàn bộ" icon={<CheckCircle2 className="h-5 w-5" />} tone="coral" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="p-6">
          <SectionHeading title="Thông tin và phạm vi dự án" description="Nội dung đã được hai bên thống nhất trong hợp đồng." />
          {summary.projectDescription && <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-700">{summary.projectDescription}</p>}
          {summary.contractScope && <div className="mt-4 rounded-2xl bg-slate-50 p-4"><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-400">Phạm vi hợp đồng</p><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">{summary.contractScope}</p></div>}
          <div className="mt-5 border-t border-slate-100 pt-5">
            <JobSowContent job={{ sow: summary.sow, structuredSow: summary.structuredSow, rawRequirements: summary.projectDescription }} />
          </div>
        </Card>

        <Card className="p-6">
          <SectionHeading title="Các bên tham gia" description="Đối tác thực hiện dự án." />
          <div className="mt-5 space-y-3">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><div className="flex items-center gap-3"><Users className="h-5 w-5 text-brand-600" /><div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Doanh nghiệp</p><p className="mt-1 font-extrabold text-ink">{summary.businessName}</p></div></div></div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><div className="flex items-center gap-3"><Users className="h-5 w-5 text-violet-600" /><div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Chuyên gia</p><p className="mt-1 font-extrabold text-ink">{summary.expertName}</p></div></div></div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="font-semibold text-slate-400">Bắt đầu</p><p className="mt-1 font-bold text-slate-700">{summary.startedAt ? formatDateTime(summary.startedAt) : "Chưa cập nhật"}</p></div>
              <div><p className="font-semibold text-slate-400">Hoàn thành</p><p className="mt-1 font-bold text-slate-700">{summary.completedAt ? formatDateTime(summary.completedAt) : "Chưa cập nhật"}</p></div>
            </div>
          </div>
        </Card>
      </div>

      <section className="space-y-4">
        <SectionHeading title="Kết quả bàn giao theo cột mốc" description="Mỗi mục hiển thị sản phẩm cuối đã được nghiệm thu; cột mốc cuối cùng kèm tệp hướng dẫn sử dụng." />
        {summary.milestones.map((milestone) => {
          const deliverable = milestone.finalDeliverable;
          return (
            <Card key={milestone.contractMilestoneId} className="p-5 md:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Badge tone="brand">Cột mốc {milestone.orderIndex}</Badge><Badge tone="mint">Đã nghiệm thu</Badge></div><h3 className="mt-3 font-display text-xl font-extrabold text-ink">{milestone.milestoneName}</h3>{milestone.description && <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{milestone.description}</p>}</div>
                <div className="shrink-0 text-left lg:text-right"><p className="font-display text-xl font-extrabold text-ink">{formatCurrency(milestone.budget)}</p><p className="mt-1 text-xs font-bold text-slate-400">{durationLabel(milestone.duration, milestone.durationUnit)}</p></div>
              </div>

              {milestone.acceptanceCriteria.length > 0 && <div className="mt-5 rounded-2xl bg-slate-50 p-4"><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-400">Tiêu chí đã nghiệm thu</p><ul className="mt-3 grid gap-2 text-sm text-slate-700 md:grid-cols-2">{milestone.acceptanceCriteria.map((criterion, index) => <li key={`${milestone.milestoneId}-${index}`} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /><span>{criterion}</span></li>)}</ul></div>}

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {deliverable?.sourceCodeUrl && <a href={externalUrl(deliverable.sourceCodeUrl)} target="_blank" rel="noreferrer" className="rounded-2xl border border-slate-100 bg-white p-4 transition hover:border-brand-200 hover:shadow-sm"><FileArchive className="h-5 w-5 text-brand-600" /><p className="mt-3 font-bold text-ink">Kho mã nguồn</p><p className="mt-1 line-clamp-2 break-all text-xs text-slate-500">{deliverable.sourceCodeUrl}</p></a>}
                {deliverable?.sourceCodeFileUrl && <FirebaseFileLink path={deliverable.sourceCodeFileUrl} buttonText="Tải tệp mã nguồn" showPath={false} />}
                {deliverable?.demoLink && <a href={externalUrl(deliverable.demoLink)} target="_blank" rel="noreferrer" className="rounded-2xl border border-slate-100 bg-white p-4 transition hover:border-brand-200 hover:shadow-sm"><BriefcaseBusiness className="h-5 w-5 text-violet-600" /><p className="mt-3 font-bold text-ink">Sản phẩm chạy thử</p><p className="mt-1 line-clamp-2 break-all text-xs text-slate-500">{deliverable.demoLink}</p></a>}
                {deliverable?.userGuideFileUrl && <div><p className="mb-2 flex items-center gap-2 text-sm font-extrabold text-ink"><FileText className="h-4 w-4 text-emerald-600" />Hướng dẫn sử dụng</p><FirebaseFileLink path={deliverable.userGuideFileUrl} buttonText="Mở tệp hướng dẫn" showPath={false} /></div>}
              </div>
              {deliverable?.submissionNotes && <div className="mt-5 border-t border-slate-100 pt-4"><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-400">Ghi chú bàn giao</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{deliverable.submissionNotes}</p></div>}
            </Card>
          );
        })}
      </section>
    </div>
  );
}

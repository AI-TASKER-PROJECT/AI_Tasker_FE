import {
  BriefcaseBusiness,
  CheckCircle2,
  Cpu,
  RefreshCw,
  Search,
  UserCheck,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  contractApi,
  disputeApi,
  getApiErrorMessage,
  marketplaceApi,
} from "../../../lib/api";
import type { Contract, Dispute, Job, StaffAssignmentCandidate } from "../../../types";
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  Notice,
  PageHeader,
  SectionHeading,
  StatusBadge,
} from "../../../components/ui";

function splitTechText(value?: string) {
  return (value || "")
    .split(/[,\n;/|]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function technologyFromJob(job?: Job | null) {
  if (!job) return [];
  const dynamicJob = job as Job & {
    technologies?: Array<string | { name?: string; technologyName?: string }>;
    technologyNames?: string[];
    specialization?: string;
  };
  const technologies = Array.isArray(dynamicJob.technologies)
    ? dynamicJob.technologies
        .map((item) => (typeof item === "string" ? item : item.name || item.technologyName || ""))
        .filter(Boolean)
    : [];
  return [
    ...technologies,
    ...(dynamicJob.technologyNames || []),
    ...(job.skills || []),
    ...splitTechText(dynamicJob.specialization),
    ...((job.technologyIds || []).map((id) => `Technology #${id}`)),
  ];
}

function projectTechnologies(contract?: Contract | null, job?: Job | null) {
  const values = [
    ...splitTechText(contract?.technologyUsed),
    ...technologyFromJob(job),
  ];
  return Array.from(new Set(values));
}

function availabilityLabel(value?: string) {
  const normalized = (value || "").toLowerCase();
  if (normalized === "idle") return "Đang rảnh";
  if (normalized === "busy") return "Đang bận";
  return value || "Chưa rõ";
}

export function StaffAssignmentPage() {
  const [searchParams] = useSearchParams();
  const [disputeId, setDisputeId] = useState(searchParams.get("disputeId") || "");
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [items, setItems] = useState<StaffAssignmentCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState<number | null>(null);
  const [notice, setNotice] = useState<{
    tone: "success" | "danger" | "info" | "warning";
    title: string;
    message?: string;
  } | null>(null);

  const technologies = useMemo(() => projectTechnologies(contract, job), [contract, job]);
  const projectTitle = job?.title || contract?.contractTitle || contract?.title || dispute?.jobTitle || "Chưa có tên project";
  const assignedStaff = items.find((staff) => staff.staffId === dispute?.assignedStaffId);

  const load = async () => {
    const id = Number(disputeId);
    if (!Number.isFinite(id) || id <= 0) {
      setNotice({
        tone: "warning",
        title: "Nhập mã tranh chấp để xem danh sách staff phù hợp.",
      });
      return;
    }
    setLoading(true);
    try {
      const [disputeData, candidates] = await Promise.all([
        disputeApi.get(id),
        disputeApi.staffCandidates(id),
      ]);
      setDispute(disputeData);
      setItems(candidates);

      const contractData = await contractApi.getContract(disputeData.contractId).catch(() => null);
      setContract(contractData);
      const jobData = contractData?.jobId
        ? await marketplaceApi.getJob(contractData.jobId).catch(() => null)
        : null;
      setJob(jobData);
      setNotice(null);
    } catch (error) {
      setNotice({ tone: "danger", title: getApiErrorMessage(error) });
      setContract(null);
      setJob(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (disputeId) void load();
  }, []);

  const assign = async (staff: StaffAssignmentCandidate) => {
    if (!dispute) return;
    setAssigning(staff.staffId);
    try {
      const saved = await disputeApi.assign(dispute.disputeId, staff.staffId);
      setDispute(saved);
      await load();
      setNotice({
        tone: "success",
        title: `Đã gán ${staff.fullName || `staff #${staff.staffId}`} xử lý tranh chấp.`,
        message:
          "Staff sẽ nhận thông báo, được cấp quyền đọc/kiểm tra tạm thời và gửi báo cáo kỹ thuật cho admin.",
      });
    } catch (error) {
      setNotice({ tone: "danger", title: getApiErrorMessage(error) });
    } finally {
      setAssigning(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          title="Gán staff xử lý tranh chấp"
          description="Admin xem kỹ thuật dự án, chuyên môn staff, workload và gán người xử lý phù hợp cho Flow 5."
          actions={
            <Button onClick={load} loading={loading}>
              <RefreshCw className="h-4 w-4" />
              Làm mới
            </Button>
          }
        />
      </div>

      <Card className="p-5">
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <Field label="Mã tranh chấp">
            <Input
              value={disputeId}
              onChange={(event) => setDisputeId(event.target.value)}
              placeholder="Ví dụ: 12"
            />
          </Field>
          <Button variant="secondary" onClick={load} loading={loading}>
            <Search className="h-4 w-4" />
            Tìm staff phù hợp
          </Button>
        </div>
      </Card>

      {notice && (
        <Notice tone={notice.tone} title={notice.title}>
          {notice.message}
        </Notice>
      )}

      {dispute && (
        <Card className="p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="brand">Tranh chấp #{dispute.disputeId}</Badge>
            <StatusBadge status={dispute.status} />
            {assignedStaff && (
              <Badge tone="mint">Đang gán: {assignedStaff.fullName || `Staff #${assignedStaff.staffId}`}</Badge>
            )}
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-slate-500">
                <BriefcaseBusiness className="h-4 w-4" />
                <p className="text-xs font-black uppercase tracking-[0.12em]">Project / Contract</p>
              </div>
              <p className="mt-2 font-display text-xl font-black text-ink">{projectTitle}</p>
              <p className="mt-2 text-sm font-semibold text-slate-500">
                Contract #{dispute.contractId}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-slate-500">
                <Cpu className="h-4 w-4" />
                <p className="text-xs font-black uppercase tracking-[0.12em]">Kỹ thuật dự án cần match</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {technologies.length > 0 ? (
                  technologies.map((item) => (
                    <Badge key={item} tone="brand">
                      {item}
                    </Badge>
                  ))
                ) : (
                  <Badge tone="amber">BE chưa trả dữ liệu kỹ thuật</Badge>
                )}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-slate-500">
                <UserCheck className="h-4 w-4" />
                <p className="text-xs font-black uppercase tracking-[0.12em]">Người đang xử lý</p>
              </div>
              <p className="mt-2 font-display text-xl font-black text-ink">
                {assignedStaff?.fullName || dispute.staffName || "Chưa gán staff"}
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-500">
                {assignedStaff?.specialization || "Chưa có chuyên môn staff"}
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-6">
        <SectionHeading
          title="Danh sách staff phù hợp"
          description="Staff match kỹ thuật dự án được đưa lên trước. Admin vẫn có thể override nếu workload phù hợp hơn."
        />
        <div className="mt-5 grid gap-3">
          {items.map((staff) => (
            <div
              key={staff.staffId}
              className={
                staff.matchedSpecialization
                  ? "rounded-2xl border border-brand-200 bg-brand-50/60 p-5"
                  : "rounded-2xl border border-slate-100 bg-white p-5"
              }
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-brand-600 shadow-sm">
                      <Users className="h-4 w-4" />
                    </span>
                    <p className="font-extrabold text-ink">
                      {staff.fullName || `Staff #${staff.staffId}`}
                    </p>
                    <Badge tone={staff.availabilityStatus === "Idle" ? "mint" : "amber"}>
                      {availabilityLabel(staff.availabilityStatus)}
                    </Badge>
                    {staff.matchedSpecialization && (
                      <Badge tone="brand">Phù hợp kỹ thuật dự án</Badge>
                    )}
                  </div>
                  <div className="mt-3 grid gap-2 text-sm font-semibold text-slate-600 md:grid-cols-2">
                    <p>Email: {staff.email || `Account #${staff.accountId}`}</p>
                    <p>Đang xử lý: {staff.activeDisputeWorkload} tranh chấp</p>
                    <p className="md:col-span-2">
                      Kỹ thuật staff: {staff.specialization || "Chưa cập nhật chuyên môn"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    size="sm"
                    onClick={() => assign(staff)}
                    loading={assigning === staff.staffId}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Gán staff này
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {items.length === 0 && !loading && (
            <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-400">
              Chưa có danh sách staff. Hãy nhập mã tranh chấp và bấm tìm staff phù hợp.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}

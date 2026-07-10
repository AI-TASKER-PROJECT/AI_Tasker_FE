import {
  CheckCircle2,
  FileText,
  Gavel,
  Send,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { contractApi, disputeApi, getApiErrorMessage } from "../../../lib/api";
import { useSession } from "../../../lib/session";
import { formatCurrency, formatDateTime } from "../../../lib/utils";
import type {
  AcceptanceCriteria,
  CaseAttachment,
  Contract,
  Deliverable,
  Dispute,
  Milestone,
  MilestoneProgressReport,
} from "../../../types";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  LinkButton,
  Modal,
  Notice,
  PageHeader,
  SectionHeading,
  StatusBadge,
  Textarea,
} from "../../../components/ui";

function flow5StatusText(status?: string) {
  const normalized = (status || "").toUpperCase();
  const map: Record<string, { title: string; message: string; tone: "info" | "warning" | "success" | "danger" }> = {
    PENDING_SELF_RESOLVE: {
      tone: "warning",
      title: "Đang chờ hai bên tự xử lý",
      message:
        "Business và Expert đang tự trao đổi. Chỉ gửi yêu cầu staff can thiệp nếu hai bên không thống nhất.",
    },
    ESCALATION_REQUESTED: {
      tone: "warning",
      title: "Đã yêu cầu staff tiếp nhận",
      message:
        "Yêu cầu can thiệp đã được tạo. Hệ thống đang chờ gán staff phù hợp hoặc admin phân công thủ công.",
    },
    STAFF_REVIEWING: {
      tone: "info",
      title: "Staff đang kiểm tra tranh chấp",
      message:
        "Staff được gán sẽ xem nguồn/demo, kiểm tra theo Definition of Done và viết báo cáo kỹ thuật cho admin.",
    },
    STAFF_DECIDED: {
      tone: "warning",
      title: "Staff đã gửi báo cáo cho admin",
      message:
        "Admin cần đọc báo cáo và thực thi quyết toán theo tỷ lệ staff đề xuất.",
    },
    RESOLVED: {
      tone: "success",
      title: "Tranh chấp đã được xử lý xong",
      message:
        "Kết quả cuối cùng và giao dịch quyết toán đã được gửi cho các bên liên quan.",
    },
    CANCELLED: {
      tone: "danger",
      title: "Tranh chấp đã bị hủy",
      message: "Case này không còn được xử lý trong Flow 5.",
    },
  };
  return map[normalized] || {
    tone: "info",
    title: "Trạng thái tranh chấp",
    message: "Theo dõi trạng thái xử lý và các ghi nhận mới nhất tại đây.",
  };
}

function shouldHideLegacyNotice(title?: string) {
  const normalized = (title || "").toUpperCase();
  return normalized.includes("CHUA HET 48 GIO") || normalized.includes("STAFF CHUA DUOC GUI REPORT");
}

function normalizeStatus(status?: string) {
  return (status || "").trim().toUpperCase();
}

function getJobMilestoneId(milestone: Milestone) {
  return Number(
    (milestone as Milestone & { jobMilestoneId?: number }).jobMilestoneId ??
      milestone.milestoneId,
  );
}

export function DisputeDetailPage({
  staffMode = false,
}: {
  staffMode?: boolean;
}) {
  const { disputeId } = useParams();
  const session = useSession();
  const [contract, setContract] = useState<Contract | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [criteria, setCriteria] = useState<AcceptanceCriteria[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [progressReports, setProgressReports] = useState<MilestoneProgressReport[]>([]);
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [finalOpen, setFinalOpen] = useState(false);
  const [staffId, setStaffId] = useState("");
  const [notice, setNotice] = useState<{
    tone: "success" | "danger" | "info" | "warning";
    title: string;
    message?: string;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [report, setReport] = useState({
    staffReport: "",
    note: "",
    expertPercent: "50",
  });
  const [evidenceItems, setEvidenceItems] = useState<CaseAttachment[]>([]);
  const [evidenceForm, setEvidenceForm] = useState({
    fileUrl: "",
    fileName: "",
    fileType: "TEXT_LOG",
    note: "",
  });

  useEffect(() => {
    const id = Number(disputeId);
    if (!Number.isFinite(id) || id <= 0) return;
    (async () => {
      try {
        const [disputeData, evidenceData] = await Promise.all([
          disputeApi.get(id),
          disputeApi.listEvidence(id).catch(() => []),
        ]);
        setDispute(disputeData);
        setEvidenceItems(evidenceData);
        setStaffId(String(disputeData.assignedStaffId || ""));
        setReport({
          staffReport: disputeData.staffReport || "",
          note: disputeData.staffDecisionNote || "",
          expertPercent:
            typeof disputeData.staffDecisionPercentage === "number"
              ? String(disputeData.staffDecisionPercentage)
              : "50",
        });

        const milestoneId = disputeData.milestoneId;
        const [contractData, milestoneData] = await Promise.all([
          contractApi.getContract(disputeData.contractId).catch(() => null),
          contractApi.listMilestones(disputeData.contractId).catch(() => []),
        ]);
        setContract(contractData);
        setMilestones(milestoneData);

        if (milestoneId) {
          const [criteriaData, deliverableData, progressReportData] = await Promise.all([
            contractApi.listCriteria(milestoneId).catch(() => []),
            contractApi.listDeliverables(milestoneId).catch(() => []),
            contractApi.listProgressReports(disputeData.contractId, milestoneId).catch(() => []),
          ]);
          setCriteria(criteriaData);
          setDeliverables(deliverableData);
          setProgressReports(progressReportData);
        } else {
          setCriteria([]);
          setDeliverables([]);
          setProgressReports([]);
        }
      } catch {
        setDispute(null);
        setContract(null);
        setMilestones([]);
        setCriteria([]);
        setDeliverables([]);
        setProgressReports([]);
        setEvidenceItems([]);
      }
    })();
  }, [disputeId]);

  const statusInfo = useMemo(
    () => flow5StatusText(dispute?.status),
    [dispute?.status],
  );

  if (!dispute)
    return (
      <EmptyState
        title="Không tìm thấy dispute"
        description="Không lấy được dữ liệu tranh chấp từ hệ thống."
      />
    );

  const isAdmin = session?.role === "ADMIN";
  const isStaff = session?.role === "STAFF" || (staffMode && !isAdmin);
  const isParticipantView = !isAdmin && !isStaff;
  const canAssign = isAdmin && ["ESCALATION_REQUESTED", "PENDING_SELF_RESOLVE"].includes(dispute.status);
  const canStaffReport = isStaff && dispute.status === "STAFF_REVIEWING";
  const canAdminExecute = isAdmin && dispute.status === "STAFF_DECIDED";
  const canRejectIntervention = isStaff && dispute.status === "STAFF_REVIEWING";
  const canCancelDispute =
    (isAdmin ||
      dispute.initiatedByAccountId === session?.accountId ||
      dispute.initiatedBy === session?.role) &&
    ["PENDING_SELF_RESOLVE", "ESCALATION_REQUESTED"].includes(dispute.status);
  const contractTitle =
    contract?.contractTitle ||
    contract?.title ||
    dispute.jobTitle ||
    "Hop dong dang tranh chap";
  const pageTitle = dispute.jobTitle
    ? `Tranh chấp - ${dispute.jobTitle}`
    : dispute.title || `Dispute #${dispute.disputeId}`;
  const disputedMilestone = milestones.find(
    (item) => getJobMilestoneId(item) === Number(dispute.milestoneId),
  );
  const finalExpertPercent = dispute.staffDecisionPercentage;
  const finalBusinessPercent =
    typeof finalExpertPercent === "number" ? 100 - finalExpertPercent : undefined;
  const sortedProgressReports = [...progressReports].sort((a, b) =>
    (a.createdAt || "").localeCompare(b.createdAt || ""),
  );
  const sortedDeliverables = [...deliverables].sort((a, b) =>
    (a.createdAt || "").localeCompare(b.createdAt || ""),
  );
  const hintLine = isStaff
    ? canStaffReport
      ? "Hint: chờ hết 48 giờ evidence window, kiểm tra source/demo bằng quyền Read & Execute, rồi gửi Technical Report kèm fund split ratio."
      : "Hint: theo dõi evidence window và SLA. Staff có thể từ chối can thiệp nếu case chưa đủ điều kiện."
    : canAdminExecute
      ? "Hint: đọc Technical Report, sau đó thực thi settlement đúng tỷ lệ Staff đã quyết định. Admin không chỉnh tỷ lệ."
      : "Hint: admin có thể dùng Staff Assignment Dashboard để xem workload và override staff khi cần.";

  const assign = async () => {
    if (!staffId.trim()) {
      setNotice({ tone: "warning", title: "Vui lòng nhập Staff ID." });
      return;
    }
    setActionLoading("assign");
    try {
      const saved = await disputeApi.assign(dispute.disputeId, Number(staffId));
      setDispute(saved);
      setAssignOpen(false);
      setNotice({
        tone: "success",
        title: "Đã gán staff tiếp nhận tranh chấp.",
        message: "Staff sẽ nhận thông báo và bắt đầu kiểm tra theo chuyên môn.",
      });
    } catch (error) {
      setNotice({ tone: "danger", title: getApiErrorMessage(error) });
    } finally {
      setActionLoading(null);
    }
  };

  const submitStaffDecision = async () => {
    const expertPercent = Number(report.expertPercent);
    if (!Number.isFinite(expertPercent) || expertPercent < 0 || expertPercent > 100) {
      setNotice({
        tone: "warning",
        title: "Tỷ lệ cho Expert phải nằm trong khoảng 0-100%.",
      });
      return;
    }
    if (!report.staffReport.trim()) {
      setNotice({ tone: "warning", title: "Vui lòng nhập báo cáo kỹ thuật." });
      return;
    }
    setActionLoading("staff-report");
    try {
      const saved = await disputeApi.staffDecision(
        dispute.disputeId,
        expertPercent,
        report.note.trim() || undefined,
        report.staffReport.trim(),
      );
      setDispute(saved);
      setReportOpen(false);
      setNotice({
        tone: "success",
        title: "Đã gửi quyết định tranh chấp.",
        message:
          "Tỷ lệ Staff quyết định đã được lưu. Settlement sẽ dùng đúng tỷ lệ này khi Admin/System execute.",
      });
    } catch (error) {
      setNotice({ tone: "danger", title: getApiErrorMessage(error) });
    } finally {
      setActionLoading(null);
    }
  };

  const executeSettlement = async () => {
    setActionLoading("execute-settlement");
    try {
      const saved = await disputeApi.executeSettlement(dispute.disputeId);
      setDispute(saved);
      setFinalOpen(false);
      setNotice({
        tone: "success",
        title: "Đã thực thi settlement theo quyết định Staff.",
        message: "Kết quả giao dịch đã được gửi cho Business và Expert theo Flow 5.",
      });
    } catch (error) {
      setNotice({ tone: "danger", title: getApiErrorMessage(error) });
    } finally {
      setActionLoading(null);
    }
  };

  const rejectIntervention = async () => {
    const reason = window.prompt(
      "Lý do Staff từ chối can thiệp và trả dispute về self-resolve:",
      "Chưa đủ bằng chứng để Staff can thiệp.",
    );
    if (reason === null) return;
    setActionLoading("reject-intervention");
    try {
      const saved = await disputeApi.rejectIntervention(
        dispute.disputeId,
        reason.trim() || undefined,
      );
      setDispute(saved);
      setNotice({
        tone: "success",
        title: "Đã từ chối can thiệp.",
        message: "Dispute được trả về bước hai bên tự giải quyết.",
      });
    } catch (error) {
      setNotice({ tone: "danger", title: getApiErrorMessage(error) });
    } finally {
      setActionLoading(null);
    }
  };

  const cancelDispute = async () => {
    const reason = window.prompt("Lý do hủy dispute:", "Hủy dispute trước khi Staff review.");
    if (reason === null) return;
    setActionLoading("cancel-dispute");
    try {
      const saved = await disputeApi.cancel(dispute.disputeId, reason.trim() || undefined);
      setDispute(saved);
      setNotice({
        tone: "success",
        title: "Đã hủy dispute.",
        message: "Milestone sẽ quay về trạng thái trước đó nếu BE cho phép.",
      });
    } catch (error) {
      setNotice({ tone: "danger", title: getApiErrorMessage(error) });
    } finally {
      setActionLoading(null);
    }
  };

  const submitEvidence = async () => {
    if (!evidenceForm.fileUrl.trim()) {
      setNotice({ tone: "warning", title: "Vui long nhap URL evidence." });
      return;
    }
    setActionLoading("evidence");
    try {
      const saved = await disputeApi.createEvidence(dispute.disputeId, {
        fileUrl: evidenceForm.fileUrl.trim(),
        fileName: evidenceForm.fileName.trim() || undefined,
        fileType: evidenceForm.fileType.trim() || undefined,
        note: evidenceForm.note.trim() || undefined,
      });
      setEvidenceItems((current) => [...current, saved]);
      setEvidenceForm({
        fileUrl: "",
        fileName: "",
        fileType: "TEXT_LOG",
        note: "",
      });
      setNotice({
        tone: "success",
        title: "Da them evidence vao shared dispute folder.",
        message: "Staff va admin co the xem evidence nay trong qua trinh Flow 5.",
      });
    } catch (error) {
      setNotice({ tone: "danger", title: getApiErrorMessage(error) });
    } finally {
      setActionLoading(null);
    }
  };

  const scrollToStaffReport = () => {
    document.getElementById("staff-report-section")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  if (isParticipantView) {
    return (
      <div className="space-y-6">
        <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
          <PageHeader
            title={pageTitle}
            description="Trang nay chi hien ket qua tranh chap, bao cao staff va ket luan admin cho Business/Expert."
            actions={
              <LinkButton to={`/app/disputes/${dispute.disputeId}/project`} variant="secondary">
                <FileText className="h-4 w-4" />
                Xem thong tin project
              </LinkButton>
            }
          />
        </div>

        {notice && !shouldHideLegacyNotice(notice.title) && (
          <Notice tone={notice.tone} title={notice.title}>
            {notice.message}
          </Notice>
        )}

        <Notice tone={statusInfo.tone} title={statusInfo.title}>
          {statusInfo.message}
        </Notice>

        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <Card className="p-6">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={dispute.status} />
              <Badge tone="brand">{contractTitle}</Badge>
              {disputedMilestone && (
                <Badge tone="amber">{disputedMilestone.milestoneName}</Badge>
              )}
              {dispute.staffName && <Badge tone="mint">Staff: {dispute.staffName}</Badge>}
            </div>

            <SectionHeading
              title="Cot moc dang tranh chap"
              description="Thong tin ngan gon ve pham vi tranh chap."
            />
            <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-display text-lg font-extrabold text-ink">
                  {disputedMilestone?.milestoneName || "Cot moc dang tranh chap"}
                </p>
                {disputedMilestone && (
                  <Badge tone="slate">
                    {formatCurrency(disputedMilestone.finalBudget || disputedMilestone.fundsAllocated || 0)}
                  </Badge>
                )}
              </div>
              {disputedMilestone?.description && (
                <p className="mt-3 whitespace-pre-wrap leading-6">
                  {disputedMilestone.description}
                </p>
              )}
              {dispute.escalationReason && (
                <div className="mt-4 rounded-xl bg-amber-50 p-3">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-amber-700">
                    Ly do tranh chap
                  </p>
                  <p className="mt-1 whitespace-pre-wrap leading-6">
                    {dispute.escalationReason}
                  </p>
                </div>
              )}
            </div>

            <SectionHeading
              title="Bao cao xu ly tranh chap"
              description="Noi dung staff va admin cong bo cho cac ben lien quan."
            />
            <div className="mt-5 grid gap-4">
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-brand-600" />
                  <p className="font-extrabold text-ink">Bao cao cua staff</p>
                </div>
                <p className="mt-3 whitespace-pre-wrap leading-7">
                  {dispute.staffReport || "Staff chua gui bao cao cho admin."}
                </p>
              </div>

              {dispute.staffDecisionNote && (
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                  <p className="font-extrabold text-ink">Ghi chu danh gia cua staff</p>
                  <p className="mt-2 whitespace-pre-wrap leading-7">
                    {dispute.staffDecisionNote}
                  </p>
                </div>
              )}
              {!dispute.staffReport && normalizeStatus(dispute.status) !== "RESOLVED" && (
                <Notice tone="info" title="Dang cho bao cao staff">
                  Khi staff gui report va admin xu ly, ket qua se hien thi tai day.
                </Notice>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <SectionHeading title="Ket qua tien ky quy" />
            <div className="mt-5 grid gap-3">
              <div className="rounded-2xl bg-mint-50 p-4">
                <p className="text-sm font-bold text-mint-700">Expert nhan</p>
                <p className="mt-1 font-display text-2xl font-black text-ink">
                  {typeof finalExpertPercent === "number" ? `${finalExpertPercent}%` : "Chua co"}
                </p>
                {typeof dispute.staffProposedExpertAmount === "number" && (
                  <p className="mt-1 text-sm font-bold text-slate-500">
                    {formatCurrency(dispute.staffProposedExpertAmount)}
                  </p>
                )}
              </div>
              <div className="rounded-2xl bg-rose-50 p-4">
                <p className="text-sm font-bold text-rose-700">Business hoan lai</p>
                <p className="mt-1 font-display text-2xl font-black text-ink">
                  {typeof finalBusinessPercent === "number" ? `${finalBusinessPercent}%` : "Chua co"}
                </p>
                {typeof dispute.businessRefundAmount === "number" && (
                  <p className="mt-1 text-sm font-bold text-slate-500">
                    {formatCurrency(dispute.businessRefundAmount)}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-5 grid gap-2">
              {dispute.staffDecidedAt && (
                <Badge tone="amber">Staff gui bao cao: {formatDateTime(dispute.staffDecidedAt)}</Badge>
              )}
              {dispute.settlementExecutedAt && (
                <Badge tone="mint">Da quyet toan: {formatDateTime(dispute.settlementExecutedAt)}</Badge>
              )}
              {dispute.resolvedAt && (
                <Badge tone="slate">Da xu ly: {formatDateTime(dispute.resolvedAt)}</Badge>
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          title={pageTitle}
          description={
            staffMode
              ? "Flow 5: staff tiếp nhận tranh chấp, kiểm tra chứng cứ và gửi báo cáo cho admin."
              : "Flow 5: admin đọc báo cáo staff và thực thi quyết toán tranh chấp."
          }
          actions={
            <>
              {isStaff && (
                <LinkButton to={`/app/tickets/${dispute.disputeId}/project`} variant="secondary">
                  <FileText className="h-4 w-4" />
                  Xem thong tin project
                </LinkButton>
              )}
              {canAssign && (
                <Button variant="secondary" onClick={() => setAssignOpen(true)}>
                  <Users className="h-4 w-4" />
                  Gán staff
                </Button>
              )}
              {canStaffReport && (
                <Button onClick={() => setReportOpen(true)}>
                  <Send className="h-4 w-4" />
                  Gửi báo cáo cho admin
                </Button>
              )}
              {canRejectIntervention && (
                <Button
                  variant="secondary"
                  onClick={rejectIntervention}
                  loading={actionLoading === "reject-intervention"}
                >
                  <XCircle className="h-4 w-4" />
                  Từ chối can thiệp
                </Button>
              )}
              {canCancelDispute && (
                <Button
                  variant="secondary"
                  onClick={cancelDispute}
                  loading={actionLoading === "cancel-dispute"}
                >
                  <XCircle className="h-4 w-4" />
                  Hủy dispute
                </Button>
              )}
              {canAdminExecute && (
                <>
                  <Button variant="secondary" onClick={scrollToStaffReport}>
                    <FileText className="h-4 w-4" />
                    Báo cáo staff
                  </Button>
                  <Button onClick={() => setFinalOpen(true)}>
                    <ShieldCheck className="h-4 w-4" />
                    Duyệt báo cáo staff
                  </Button>
                </>
              )}
            </>
          }
        />
      </div>

      {notice && !shouldHideLegacyNotice(notice.title) && (
        <Notice tone={notice.tone} title={notice.title}>
          {notice.message}
        </Notice>
      )}

      <Notice tone={statusInfo.tone} title={statusInfo.title}>
        {statusInfo.message}
      </Notice>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <Card className="p-6">
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={dispute.status} />
            <Badge tone="brand">{contractTitle}</Badge>
            {dispute.milestoneId && (
              <Badge tone="amber">
                {disputedMilestone?.milestoneName || "Cot moc dang tranh chap"}
              </Badge>
            )}
            {dispute.initiatedBy && (
              <Badge tone="slate">Bên tạo: {dispute.initiatedBy}</Badge>
            )}
            <div className="w-full">
              <SectionHeading
                title="Ho so project / contract"
                description="Thong tin tong quan de staff xem noi dung hop dong va project."
              />
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                    Project / contract
                  </p>
                  <p className="mt-2 text-lg font-extrabold text-ink">{contractTitle}</p>
                  <div className="mt-3 grid gap-2 text-sm font-semibold text-slate-500">
                    <p>Tong ngan sach: {contract ? formatCurrency(contract.totalBudget) : "Chua co"}</p>
                    <p>Timeline: {contract?.timelineDays ? `${contract.timelineDays} ngay` : "Chua co"}</p>
                    <p>Cong nghe: {contract?.technologyUsed || "Chua co"}</p>
                    <p>Business: {contract?.businessName || "Chua co ten Business"}</p>
                    <p>Expert: {contract?.expertName || "Chua co ten Expert"}</p>
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                    Moc dang tranh chap
                  </p>
                  <p className="mt-2 text-lg font-extrabold text-ink">
                    {disputedMilestone?.milestoneName || "Cot moc dang tranh chap"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {disputedMilestone?.status && <StatusBadge status={disputedMilestone.status} />}
                    {disputedMilestone && (
                      <Badge tone="slate">
                        Ngan sach: {formatCurrency(disputedMilestone.finalBudget || disputedMilestone.fundsAllocated || 0)}
                      </Badge>
                    )}
                    {disputedMilestone?.dueAt && (
                      <Badge tone="amber">
                        Han nop: {formatDateTime(disputedMilestone.dueAt)}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap leading-6">
                    {disputedMilestone?.description || "Backend chua tra mo ta chi tiet cho milestone nay."}
                  </p>
                  {disputedMilestone?.deliverableExpectation && (
                    <div className="mt-3 rounded-xl bg-white p-3">
                      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                        Deliverable expectation
                      </p>
                      <p className="mt-1 whitespace-pre-wrap leading-6">
                        {disputedMilestone.deliverableExpectation}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="w-full rounded-2xl border border-slate-100 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-extrabold text-ink">Shared evidence folder</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    48h window: Business va Expert nop text logs, files, chat history de staff audit.
                  </p>
                </div>
                <Badge tone="slate">{evidenceItems.length} evidence</Badge>
              </div>
              <div className="mt-4 grid gap-2">
                {evidenceItems.map((item) => (
                  <div
                    key={item.attachmentId || `${item.fileUrl}-${item.createdAt}`}
                    className="rounded-xl bg-slate-50 p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <a
                        href={item.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="break-all font-bold text-brand-600 hover:text-brand-700"
                      >
                        {item.fileName || item.fileUrl}
                      </a>
                      <div className="flex flex-wrap items-center gap-2">
                        {item.fileType && <Badge tone="brand">{item.fileType}</Badge>}
                        {item.createdAt && (
                          <span className="text-xs font-bold text-slate-400">
                            {formatDateTime(item.createdAt)}
                          </span>
                        )}
                      </div>
                    </div>
                    {item.note && (
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                        {item.note}
                      </p>
                    )}
                  </div>
                ))}
                {evidenceItems.length === 0 && (
                  <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-400">
                    Chua co evidence nao trong shared folder.
                  </p>
                )}
              </div>
              {!isAdmin ? (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <Field label="Evidence URL">
                    <Input
                      value={evidenceForm.fileUrl}
                      onChange={(event) =>
                        setEvidenceForm((value) => ({
                          ...value,
                          fileUrl: event.target.value,
                        }))
                      }
                      placeholder="https://..."
                    />
                  </Field>
                  <Field label="Evidence type">
                    <Input
                      value={evidenceForm.fileType}
                      onChange={(event) =>
                        setEvidenceForm((value) => ({
                          ...value,
                          fileType: event.target.value,
                        }))
                      }
                      placeholder="TEXT_LOG / FILE / CHAT_HISTORY"
                    />
                  </Field>
                  <Field label="Display name">
                    <Input
                      value={evidenceForm.fileName}
                      onChange={(event) =>
                        setEvidenceForm((value) => ({
                          ...value,
                          fileName: event.target.value,
                        }))
                      }
                    />
                  </Field>
                  <div className="flex items-end">
                    <Button
                      onClick={submitEvidence}
                      loading={actionLoading === "evidence"}
                      className="w-full"
                    >
                      <Send className="h-4 w-4" />
                      Them evidence
                    </Button>
                  </div>
                  <div className="md:col-span-2">
                    <Field label="Evidence note / chat log">
                      <Textarea
                        value={evidenceForm.note}
                        onChange={(event) =>
                          setEvidenceForm((value) => ({
                            ...value,
                            note: event.target.value,
                          }))
                        }
                        placeholder="Tom tat log, chat history hoac noi dung lien quan den dispute..."
                      />
                    </Field>
                  </div>
                </div>
              ) : (
                <Notice tone="info" title="Admin chỉ xem evidence" className="mt-4">
                  Business, Expert hoặc Staff bổ sung evidence. Admin dùng phần này để đọc trước khi final review.
                </Notice>
              )}
            </div>
          </div>

          <SectionHeading
            title="DoD / Acceptance criteria"
            description="Tieu chi danh gia cua milestone dang tranh chap."
          />
          <div className="mt-5 grid gap-2">
            {criteria.map((item) => (
              <div
                key={item.criteriaId}
                className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-mint-600" />
                <span>{item.description}</span>
              </div>
            ))}
            {criteria.length === 0 && (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-400">
                Chua tai duoc acceptance criteria cho milestone nay.
              </p>
            )}
          </div>

          <SectionHeading
            title="Bai nop cua expert"
            description="Tat ca progress report va final product staff can doc de doi chieu voi DoD."
          />
          <div className="mt-5 grid gap-4">
            {sortedProgressReports.map((item) => (
              <div
                key={`report-${item.progressReportId}`}
                className="rounded-2xl border border-slate-100 bg-white p-4 text-sm text-slate-700"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-extrabold text-ink">
                    Progress report #{item.progressReportId}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {item.checkpointType && <Badge tone="brand">{item.checkpointType}</Badge>}
                    {item.createdAt && (
                      <span className="text-xs font-bold text-slate-400">
                        {formatDateTime(item.createdAt)}
                      </span>
                    )}
                  </div>
                </div>
                {typeof item.percentComplete === "number" && (
                  <p className="mt-3 text-xs font-bold text-slate-500">
                    Tien do: {item.percentComplete}%
                  </p>
                )}
                <p className="mt-3 whitespace-pre-wrap leading-6">
                  {item.submissionNotes || item.content}
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {item.sourceCodeUrl && (
                    <a
                      href={item.sourceCodeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold text-brand-600 hover:text-brand-700"
                    >
                      Source code URL
                    </a>
                  )}
                  {item.demoLink && (
                    <a
                      href={item.demoLink}
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold text-brand-600 hover:text-brand-700"
                    >
                      Demo URL
                    </a>
                  )}
                  {item.attachmentUrl && (
                    <a
                      href={item.attachmentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold text-brand-600 hover:text-brand-700"
                    >
                      Attachment URL
                    </a>
                  )}
                </div>
                {item.businessFeedback && (
                  <div className="mt-3 rounded-xl bg-amber-50 p-3">
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-amber-700">
                      Business feedback
                    </p>
                    <p className="mt-1 whitespace-pre-wrap leading-6">
                      {item.businessFeedback}
                    </p>
                  </div>
                )}
              </div>
            ))}
            {sortedDeliverables.map((item) => (
              <div
                key={`deliverable-${item.deliverableId}`}
                className="rounded-2xl border border-slate-100 bg-white p-4 text-sm text-slate-700"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-extrabold text-ink">
                    Final product #{item.deliverableId}
                  </p>
                  {item.createdAt && (
                    <span className="text-xs font-bold text-slate-400">
                      {formatDateTime(item.createdAt)}
                    </span>
                  )}
                </div>
                {item.submissionNotes && (
                  <p className="mt-3 whitespace-pre-wrap leading-6">
                    {item.submissionNotes}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-3">
                  {item.sourceCodeUrl && (
                    <a
                      href={item.sourceCodeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold text-brand-600 hover:text-brand-700"
                    >
                      Source code URL
                    </a>
                  )}
                  {item.demoLink && (
                    <a
                      href={item.demoLink}
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold text-brand-600 hover:text-brand-700"
                    >
                      Demo URL
                    </a>
                  )}
                </div>
              </div>
            ))}
            {sortedProgressReports.length === 0 && sortedDeliverables.length === 0 && (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-400">
                Chua co bai nop nao cua expert cho milestone dang tranh chap.
              </p>
            )}
          </div>

          <SectionHeading
            title="Chứng cứ tranh chấp"
            description="Thông tin dùng để staff kiểm tra nguồn, demo và Definition of Done."
          />
          <div className="mt-5 grid gap-4 text-sm text-slate-700">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                Báo cáo / mô tả chứng cứ
              </p>
              <p className="mt-2 whitespace-pre-wrap leading-7">
                {dispute.evidenceReport || "Chưa có báo cáo chứng cứ."}
              </p>
            </div>
            {dispute.escalationReason && (
              <div className="rounded-2xl bg-amber-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-amber-700">
                  Lý do yêu cầu staff can thiệp
                </p>
                <p className="mt-2 whitespace-pre-wrap leading-7">
                  {dispute.escalationReason}
                </p>
              </div>
            )}
            {dispute.escalationEvidenceFile && (
              <a
                href={dispute.escalationEvidenceFile}
                target="_blank"
                rel="noreferrer"
                className="inline-flex font-bold text-brand-600 hover:text-brand-700"
              >
                File chứng cứ bổ sung
              </a>
            )}
          </div>

          <div id="staff-report-section" className="scroll-mt-6">
            <SectionHeading
              title="Báo cáo của staff"
              description="Admin đọc báo cáo kỹ thuật, tỷ lệ đề xuất và ghi chú trước khi duyệt quyết toán."
            />
          </div>
          <div className="mt-5 grid gap-4">
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-brand-600" />
                <p className="font-extrabold text-ink">Technical report</p>
              </div>
              <p className="mt-3 whitespace-pre-wrap leading-7">
                {dispute.staffReport || "Staff chưa gửi báo cáo kỹ thuật."}
              </p>
            </div>
            {dispute.staffDecisionNote && (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                <p className="font-extrabold text-ink">Ghi chú quyết định</p>
                <p className="mt-2 whitespace-pre-wrap leading-7">
                  {dispute.staffDecisionNote}
                </p>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <SectionHeading title="Tỷ lệ xử lý tiền ký quỹ" />
          <div className="mt-5 grid gap-3">
            <div className="rounded-2xl bg-mint-50 p-4">
              <p className="text-sm font-bold text-mint-700">Expert nhận</p>
              <p className="mt-1 font-display text-2xl font-black text-ink">
                {typeof dispute.staffDecisionPercentage === "number"
                  ? `${dispute.staffDecisionPercentage}%`
                  : "Chưa có"}
              </p>
              {typeof dispute.staffProposedExpertAmount === "number" && (
                <p className="mt-1 text-sm font-bold text-slate-500">
                  {formatCurrency(dispute.staffProposedExpertAmount)}
                </p>
              )}
            </div>
            <div className="rounded-2xl bg-rose-50 p-4">
              <p className="text-sm font-bold text-rose-700">Business hoàn lại</p>
              <p className="mt-1 font-display text-2xl font-black text-ink">
                {typeof dispute.staffDecisionPercentage === "number"
                  ? `${100 - dispute.staffDecisionPercentage}%`
                  : "Chưa có"}
              </p>
              {typeof dispute.businessRefundAmount === "number" && (
                <p className="mt-1 text-sm font-bold text-slate-500">
                  {formatCurrency(dispute.businessRefundAmount)}
                </p>
              )}
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            <Badge tone="slate">
              Staff: {dispute.staffName || "Chua gan staff"}
            </Badge>
            {dispute.staffReviewStartedAt && (
              <Badge tone="brand">
                Nhận xử lý: {formatDateTime(dispute.staffReviewStartedAt)}
              </Badge>
            )}
            {dispute.staffDecidedAt && (
              <Badge tone="amber">
                Gửi báo cáo: {formatDateTime(dispute.staffDecidedAt)}
              </Badge>
            )}
            {dispute.evidenceCollectionDueAt && (
              <Badge tone="slate">
                Evidence đến: {formatDateTime(dispute.evidenceCollectionDueAt)}
              </Badge>
            )}
            {dispute.staffAccessExpiresAt && (
              <Badge tone="violet">
                Access hết hạn: {formatDateTime(dispute.staffAccessExpiresAt)}
              </Badge>
            )}
            {dispute.staffSlaDueAt && (
              <Badge tone={dispute.staffSlaEscalatedAt ? "rose" : "amber"}>
                SLA report: {formatDateTime(dispute.staffSlaDueAt)}
              </Badge>
            )}
            {dispute.settlementExecutedAt && (
              <Badge tone="mint">
                Đã quyết toán: {formatDateTime(dispute.settlementExecutedAt)}
              </Badge>
            )}
          </div>

          {!canStaffReport && isStaff && dispute.status !== "RESOLVED" && (
            <Notice tone="info" title="Chưa đến bước staff gửi báo cáo" className="mt-5">
              Staff chỉ gửi báo cáo khi tranh chấp đang ở trạng thái STAFF_REVIEWING.
            </Notice>
          )}
          {!canAdminExecute && isAdmin && dispute.status !== "RESOLVED" && (
            <Notice tone="info" title="Admin chờ báo cáo staff" className="mt-5">
              Admin chỉ thực thi quyết toán sau khi staff gửi báo cáo và trạng thái chuyển sang STAFF_DECIDED.
            </Notice>
          )}
        </Card>
      </div>

      <Notice tone="info" title="Hint Line">
        {hintLine}
      </Notice>

      <Modal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        title="Gán staff tiếp nhận tranh chấp"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAssignOpen(false)}>
              Hủy
            </Button>
            <Button onClick={assign} loading={actionLoading === "assign"}>
              Gán staff
            </Button>
          </>
        }
      >
        <Field label="Staff ID">
          <Input
            value={staffId}
            onChange={(event) => setStaffId(event.target.value)}
          />
        </Field>
      </Modal>

      <Modal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        title="Gửi báo cáo tranh chấp cho admin"
        description="Staff kiểm tra source/demo theo DoD và đề xuất tỷ lệ chia tiền ký quỹ."
        footer={
          <>
            <Button variant="secondary" onClick={() => setReportOpen(false)}>
              Hủy
            </Button>
            <Button
              onClick={submitStaffDecision}
              loading={actionLoading === "staff-report"}
            >
              <Gavel className="h-4 w-4" />
              Gửi báo cáo
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Field label="Báo cáo kỹ thuật">
            <Textarea
              value={report.staffReport}
              onChange={(event) =>
                setReport((value) => ({
                  ...value,
                  staffReport: event.target.value,
                }))
              }
              placeholder="Nêu môi trường kiểm tra, tiêu chí đạt/không đạt, bằng chứng và kết luận kỹ thuật..."
            />
          </Field>
          <Field label="Tỷ lệ tiền ký quỹ trả cho Expert (%)">
            <Input
              type="number"
              min="0"
              max="100"
              value={report.expertPercent}
              onChange={(event) =>
                setReport((value) => ({
                  ...value,
                  expertPercent: event.target.value,
                }))
              }
            />
          </Field>
          <Field label="Ghi chú quyết định">
            <Textarea
              value={report.note}
              onChange={(event) =>
                setReport((value) => ({
                  ...value,
                  note: event.target.value,
                }))
              }
              placeholder="Ví dụ: Expert hoàn thành 70% DoD, Business được hoàn 30% phần ký quỹ milestone."
            />
          </Field>
        </div>
      </Modal>

      <Modal
        open={finalOpen}
        onClose={() => setFinalOpen(false)}
        title="Execute dispute settlement"
        description="Admin chỉ thực thi settlement theo đúng tỷ lệ Staff đã quyết định. Không chỉnh tỷ lệ và không yêu cầu revision."
        footer={
          <>
            <Button variant="secondary" onClick={() => setFinalOpen(false)}>
              Hủy
            </Button>
            <Button
              onClick={executeSettlement}
              loading={actionLoading === "execute-settlement"}
            >
              <ShieldCheck className="h-4 w-4" />
              Execute settlement
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Notice tone="warning" title="Staff decision là final">
            Settlement sẽ dùng tỷ lệ Expert nhận {typeof dispute.staffDecisionPercentage === "number" ? `${dispute.staffDecisionPercentage}%` : "chưa có"} và hoàn phần còn lại cho Business.
          </Notice>
          {dispute.staffDecisionNote && (
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-extrabold text-ink">Ghi chú Staff</p>
              <p className="mt-2 whitespace-pre-wrap leading-6">
                {dispute.staffDecisionNote}
              </p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}


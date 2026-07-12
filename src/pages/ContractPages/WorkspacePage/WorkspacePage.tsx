import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Gavel,
  PlayCircle,
  RefreshCw,
  Send,
  UploadCloud,
  WalletCards,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { contractApi, disputeApi, getApiErrorMessage } from "../../../lib/api";
import { useSession } from "../../../lib/session";
import { formatCurrency, formatDateTime } from "../../../lib/utils";
import type {
  AcceptanceCriteria,
  Contract,
  Deliverable,
  Dispute,
  Milestone,
  MilestoneProgressReport,
  TerminationRequest,
} from "../../../types";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  Notice,
  PageHeader,
  StatusBadge,
  Textarea,
} from "../../../components/ui";
import {
  getContractMilestoneId,
  getMilestoneBudget,
  getSourceMilestoneId,
} from "../ContractPages.shared";

type NoticeTone = "success" | "danger" | "info" | "warning";

const REVIEWABLE_STATUSES = new Set(["UNDER_REVIEW"]);
const SUBMITTABLE_STATUSES = new Set(["IN_PROGRESS", "OVERDUE"]);
const PROGRESS_REPORT_STATUSES = new Set(["IN_PROGRESS", "OVERDUE"]);
const DEPOSITABLE_STATUSES = new Set(["PENDING"]);
const DISPUTABLE_STATUSES = new Set([
  "IN_PROGRESS",
  "OVERDUE",
  "UNDER_REVIEW",
  "DISPUTED",
]);

function normalizeStatus(status?: string) {
  return (status || "")
    .trim()
    .replace(/[\s-]+/g, "_")
    .toUpperCase();
}

function milestoneStatusLabel(status?: string) {
  const normalized = normalizeStatus(status);
  const labels: Record<string, string> = {
    PENDING: "Chờ mở mốc",
    DEPOSITED: "Sẵn sàng làm việc",
    IN_PROGRESS: "Đang thực hiện",
    OVERDUE: "Quá hạn",
    UNDER_REVIEW: "Chờ nghiệm thu",
    DISPUTED: "Đang tranh chấp",
    COMPLETED: "Hoàn thành",
  };
  return labels[normalized] || status || "Chưa có trạng thái";
}

function contractStatusLabel(status?: string) {
  const normalized = normalizeStatus(status);
  const labels: Record<string, string> = {
    ACTIVE: "Đang thực hiện",
    AWAITING_CONTINUATION_DECISION: "Chờ Business quyết định",
    TERMINATION_PENDING: "Chờ xử lý hủy",
    TERMINATED: "Đã hủy",
    CANCELLED: "Đã hủy",
    COMPLETED: "Hoàn thành",
  };
  return labels[normalized] || status || "Chua co trang thai";
}

function milestoneDurationLabel(milestone: Milestone) {
  const duration = Number(milestone.duration || milestone.durationValue || 0);
  if (!Number.isFinite(duration) || duration <= 0) return "Chưa có thời gian";
  const unit = (milestone.durationUnit || "WEEK").toUpperCase();
  if (unit.includes("DAY")) return `${duration} ngày`;
  if (unit.includes("MONTH")) return `${duration} tháng`;
  return `${duration} tuần`;
}

function checkpointLabel(checkpointType?: string) {
  if (!checkpointType) return "Báo cáo tiến độ";
  return "Báo cáo giữa kỳ";
}

function latestProgressStatusLabel(report: MilestoneProgressReport) {
  if (report.businessFeedback) {
    return report.requiresAdjustment
      ? "Đã feedback, cần chỉnh sửa"
      : "Đã feedback";
  }
  return "Đã nộp, chờ business xem";
}

function latestDeliverableStatusLabel(milestoneStatus?: string) {
  const normalized = normalizeStatus(milestoneStatus);
  if (normalized === "COMPLETED") return "Đã nghiệm thu";
  if (normalized === "UNDER_REVIEW") return "Đã nộp, chờ nghiệm thu";
  if (normalized === "DISPUTED") return "Đang tranh chấp";
  if (normalized === "OVERDUE") return "Quá hạn";
  return "Đã nộp";
}

function isActiveMilestoneStatus(status?: string) {
  return [
    "DEPOSITED",
    "IN_PROGRESS",
    "OVERDUE",
    "UNDER_REVIEW",
    "DISPUTED",
  ].includes(normalizeStatus(status));
}

function workspaceHintLine(role?: string, status?: string, dispute?: Dispute) {
  const normalized = normalizeStatus(status);
  const disputeStatus = normalizeStatus(dispute?.status);
  if (disputeStatus === "ESCALATION_REQUESTED") {
    return "Gợi ý: Tranh chấp đã được gửi đến hàng đợi staff/admin. Hai bên nên bổ sung bằng chứng và chờ staff tiếp nhận.";
  }
  if (disputeStatus === "STAFF_REVIEWING") {
    return "Gợi ý: Staff đang kiểm tra source/demo. Doanh nghiệp và Chuyên gia theo dõi kết quả trên màn hình tranh chấp.";
  }
  if (role === "BUSINESS" && normalized === "PENDING") {
    return "Gợi ý: Ký quỹ milestone này để Chuyên gia có thể bắt đầu công việc.";
  }
  if (role === "EXPERT" && normalized === "DEPOSITED") {
    return "Gợi ý: Bấm Bắt đầu mốc để mở bước nộp báo cáo giữa kỳ và sản phẩm cuối cùng.";
  }
  if (role === "EXPERT" && normalized === "IN_PROGRESS") {
    return "Gợi ý: Nộp báo cáo giữa kỳ để Doanh nghiệp theo dõi, sau đó nộp sản phẩm cuối cùng khi sản phẩm sẵn sàng.";
  }
  if (role === "BUSINESS" && normalized === "UNDER_REVIEW") {
    return "Gợi ý: Kiểm tra source/demo theo Định nghĩa hoàn thành, nghiệm thu nếu đạt hoặc từ chối kèm phản hồi có cấu trúc.";
  }
  if (normalized === "COMPLETED") {
    return "Gợi ý: Cột mốc đã hoàn tất. Doanh nghiệp có thể mở cột mốc tiếp theo nếu còn.";
  }
  return "Gợi ý: Theo dõi trạng thái cột mốc và chỉ thao tác trên cột mốc đang hoạt động.";
}

function disputeWorkspaceNotice(dispute?: Dispute) {
  const status = normalizeStatus(dispute?.status);
  const fallback = {
    title: "Tranh chấp",
    message:
      "Cột mốc đang có tranh chấp. Vui lòng theo dõi trong màn chi tiết.",
  };
  const messages: Record<string, { title: string; message: string }> = {
    PENDING_SELF_RESOLVE: {
      title: `Tranh chấp - Hai bên đang tự xử lý`,
      message:
        "Doanh nghiệp và Chuyên gia đang tự trao đổi. Nếu không thống nhất, hãy gửi yêu cầu staff can thiệp.",
    },
    ESCALATION_REQUESTED: {
      title: `Tranh chấp - Đã gửi yêu cầu staff`,
      message:
        "Yêu cầu can thiệp đã được gửi. Hệ thống đang chờ staff phù hợp tiếp nhận hoặc admin phân công.",
    },
    STAFF_REVIEWING: {
      title: `Tranh chấp - Staff đang kiểm tra`,
      message:
        "Staff đã tiếp nhận tranh chấp, đang kiểm tra source/demo theo Định nghĩa hoàn thành và sẽ ra quyết định xử lý.",
    },
    STAFF_DECIDED: {
      title: `Tranh chấp - Chờ admin quyết toán`,
      message:
        "Staff đã gửi báo cáo kỹ thuật và tỷ lệ chia tiền ký quỹ. Admin sẽ đọc báo cáo và thực thi quyết toán.",
    },
    RESOLVED: {
      title: `Tranh chấp - Đã xử lý xong`,
      message:
        "Tranh chấp đã được quyết toán. Doanh nghiệp và Chuyên gia có thể xem kết quả giao dịch cuối cùng.",
    },
  };
  return messages[status] || fallback;
}

function FlowStep({
  icon,
  title,
  description,
  active,
  done,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  active?: boolean;
  done?: boolean;
}) {
  return (
    <div
      className={
        active
          ? "rounded-2xl border border-brand-100 bg-brand-50 p-4"
          : done
            ? "rounded-2xl border border-mint-100 bg-mint-50 p-4"
            : "rounded-2xl border border-slate-100 bg-white p-4"
      }
    >
      <div className="flex items-start gap-3">
        <span
          className={
            active || done
              ? "grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-brand-600"
              : "grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-50 text-slate-400"
          }
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-ink">{title}</p>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

function criteriaSnapshotLines(milestone: Milestone) {
  const snapshot = (milestone as Milestone & { criteriaSnapshot?: string })
    .criteriaSnapshot;
  if (!snapshot) return [];
  return snapshot
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function WorkspacePage() {
  const { contractId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const session = useSession();
  const resolvedDisputeNotice = useMemo(() => {
    const state = location.state as
      | { disputeResolvedNotice?: { milestoneNumber?: number | string } }
      | null;
    const milestoneNumber = state?.disputeResolvedNotice?.milestoneNumber;
    if (!state?.disputeResolvedNotice) return null;

    return {
      tone: "success" as NoticeTone,
      title: "Tranh chấp đã được giải quyết",
      message: `Tranh chấp của mốc ${milestoneNumber || ""} đã được giải quyết. Hãy tiếp tục tiến hành các mốc tiếp theo của dự án.`,
    };
  }, [location.state]);
  const [contract, setContract] = useState<Contract | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [criteriaByMilestone, setCriteriaByMilestone] = useState<
    Record<number, AcceptanceCriteria[]>
  >({});
  const [deliverablesByMilestone, setDeliverablesByMilestone] = useState<
    Record<number, Deliverable[]>
  >({});
  const [progressReportsByMilestone, setProgressReportsByMilestone] = useState<
    Record<number, MilestoneProgressReport[]>
  >({});
  const [disputesByMilestone, setDisputesByMilestone] = useState<
    Record<number, Dispute>
  >({});
  const [terminationRequests, setTerminationRequests] = useState<
    TerminationRequest[]
  >([]);
  const [deliverableOpen, setDeliverableOpen] = useState<Milestone | null>(
    null,
  );
  const [feedbackOpen, setFeedbackOpen] = useState<Milestone | null>(null);
  const [progressFeedbackOpen, setProgressFeedbackOpen] = useState<{
    milestone: Milestone;
    report: MilestoneProgressReport;
  } | null>(null);
  const [progressFeedbackDetail, setProgressFeedbackDetail] =
    useState<MilestoneProgressReport | null>(null);
  const [deliverableFeedbackDetail, setDeliverableFeedbackDetail] = useState<{
    deliverable: Deliverable;
    milestoneName: string;
    attemptNumber: number;
  } | null>(null);
  const [initiateDisputeOpen, setInitiateDisputeOpen] = useState<Milestone | null>(null);
  const [initiateDisputeType, setInitiateDisputeType] = useState<string>("OTHER");
  const [escalateDisputeOpen, setEscalateDisputeOpen] = useState<Milestone | null>(null);
  const [abruptTerminationOpen, setAbruptTerminationOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deliverableForm, setDeliverableForm] = useState({
    type: "PROCESS",
    sourceCodeUrl: "",
    demoLink: "",
    submissionNotes: "",
    percentComplete: "50",
  });
  const [feedbackReason, setFeedbackReason] = useState("");
  const [feedbackRequired, setFeedbackRequired] = useState(false);
  const [progressFeedbackForm, setProgressFeedbackForm] = useState({
    feedback: "",
    category: "Core Logic",
    severity: "Medium",
    dodChecklist: [] as string[],
    requiresAdjustment: false,
  });
  const [expandedMilestones, setExpandedMilestones] = useState<
    Record<number, boolean>
  >({});
  const [initiateDisputeOtherReason, setInitiateDisputeOtherReason] = useState("");
  const [initiateDisputeModalWarning, setInitiateDisputeModalWarning] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [evidenceFileUrl, setEvidenceFileUrl] = useState("");
  const [escalateDisputeNote, setEscalateDisputeNote] = useState("");
  const [abruptTerminationReason, setAbruptTerminationReason] = useState("");
  const [workspaceNotice, setWorkspaceNotice] = useState<{
    tone: NoticeTone;
    title: string;
    message?: string;
  } | null>(resolvedDisputeNotice);
  const [milestoneNotices, setMilestoneNotices] = useState<
    Record<number, { tone: NoticeTone; title: string; message?: string }>
  >({});

  const id = Number(contractId);

  const loadWorkspace = useCallback(async () => {
    if (!Number.isFinite(id) || id <= 0) return;
    try {
      const [contractData, milestoneData, disputeData, terminationData] =
        await Promise.all([
          contractApi.getContract(id),
          contractApi.listMilestones(id),
          disputeApi.listByContract(id).catch(() => []),
          contractApi.listTerminationRequests(id).catch(() => []),
        ]);
      setContract(contractData);
      setMilestones(milestoneData);
      setTerminationRequests(terminationData);
      setDisputesByMilestone(
        disputeData.reduce<Record<number, Dispute>>((result, dispute) => {
          if (dispute.milestoneId && !result[dispute.milestoneId]) {
            result[dispute.milestoneId] = dispute;
          }
          return result;
        }, {}),
      );
    } catch {
      setContract(null);
      setMilestones([]);
      setDisputesByMilestone({});
      setTerminationRequests([]);
    }
  }, [id]);

  useEffect(() => {
    if (sessionStorage.getItem("justActivatedContract") === "true") {
      sessionStorage.removeItem("justActivatedContract");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWorkspaceNotice({
        tone: "info",
        title: "Triển khai dự án",
        message: "Hãy kí quỹ cột mốc để chuyên gia tiến hành làm việc.",
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    if (!resolvedDisputeNotice) return;

    window.scrollTo({ top: 0, behavior: "smooth" });
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, navigate, resolvedDisputeNotice]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadWorkspace();
  }, [loadWorkspace]);

  useEffect(() => {
    milestones.forEach((milestone) => {
      const sourceMilestoneId = getSourceMilestoneId(milestone);
      if (!sourceMilestoneId) return;
      contractApi
        .listCriteria(sourceMilestoneId)
        .then((items) => {
          setCriteriaByMilestone((current) => ({
            ...current,
            [sourceMilestoneId]: items,
          }));
        })
        .catch(() => undefined);
      contractApi
        .listDeliverables(sourceMilestoneId)
        .then((items) => {
          setDeliverablesByMilestone((current) => ({
            ...current,
            [sourceMilestoneId]: items,
          }));
        })
        .catch(() => undefined);
      if (Number.isFinite(id) && id > 0) {
        contractApi
          .listProgressReports(id, sourceMilestoneId)
          .then((items) => {
            setProgressReportsByMilestone((current) => ({
              ...current,
              [sourceMilestoneId]: items,
            }));
          })
          .catch(() => undefined);
      }
    });
  }, [id, milestones]);

  const counts = useMemo(() => {
    return milestones.reduce(
      (summary, milestone) => {
        const status = normalizeStatus(milestone.status);
        if (status === "COMPLETED") summary.done += 1;
        if (status === "UNDER_REVIEW") summary.review += 1;
        if (status === "DISPUTED") summary.disputed += 1;
        if (status === "PENDING") summary.pending += 1;
        if (status === "DEPOSITED") summary.ready += 1;
        if (status === "IN_PROGRESS") summary.working += 1;
        if (status === "OVERDUE") summary.overdue += 1;
        return summary;
      },
      {
        done: 0,
        review: 0,
        disputed: 0,
        pending: 0,
        ready: 0,
        working: 0,
        overdue: 0,
      },
    );
  }, [milestones]);

  const refreshAfterAction = async () => {
    await loadWorkspace();
  };

  const setMilestoneNotice = (
    milestoneId: number | undefined,
    notice: { tone: NoticeTone; title: string; message?: string },
  ) => {
    if (!milestoneId) {
      setWorkspaceNotice(notice);
      return;
    }
    setMilestoneNotices((current) => ({
      ...current,
      [milestoneId]: notice,
    }));
  };

  const runMilestoneAction = async (
    milestone: Milestone,
    actionKey: string,
    action: (sourceMilestoneId: number) => Promise<unknown>,
    successTitle: string,
  ) => {
    const sourceMilestoneId = getSourceMilestoneId(milestone);
    if (!sourceMilestoneId) {
      setWorkspaceNotice({
        tone: "danger",
        title: "Không xác định được cột mốc cần xử lý.",
      });
      return;
    }

    setActionLoading(`${actionKey}:${sourceMilestoneId}`);
    try {
      await action(sourceMilestoneId);
      await refreshAfterAction();
      setMilestoneNotice(sourceMilestoneId, {
        tone: "success",
        title: successTitle,
      });
    } catch (error) {
      setMilestoneNotice(sourceMilestoneId, {
        tone: "danger",
        title: getApiErrorMessage(error),
      });
    } finally {
      setActionLoading(null);
    }
  };

  const submitDeliverable = async () => {
    if (!deliverableOpen) return;
    const sourceMilestoneId = getSourceMilestoneId(deliverableOpen);
    if (!sourceMilestoneId) {
      setWorkspaceNotice({
        tone: "danger",
        title: "Không xác định được milestone gốc để nộp deliverable.",
      });
      return;
    }

    setActionLoading(`submit:${sourceMilestoneId}`);
    try {
      const notes = deliverableForm.submissionNotes.trim();
      if (!notes) {
        setMilestoneNotice(sourceMilestoneId, {
          tone: "warning",
          title: "Vui lòng nhập nội dung báo cáo hoặc ghi chú bàn giao.",
        });
        return;
      }
      if (deliverableForm.type === "PROCESS") {
        const percentComplete = Number(deliverableForm.percentComplete || 0);
        await contractApi.submitProgressReport(id, sourceMilestoneId, {
          content: notes,
          percentComplete: Number.isFinite(percentComplete)
            ? percentComplete
            : undefined,
          sourceCodeUrl: deliverableForm.sourceCodeUrl || undefined,
          demoLink: deliverableForm.demoLink || undefined,
          submissionNotes: notes,
        });
      } else {
        await contractApi.submitDeliverable(sourceMilestoneId, {
          milestoneId: sourceMilestoneId,
          sourceCodeUrl: deliverableForm.sourceCodeUrl || undefined,
          demoLink: deliverableForm.demoLink || undefined,
          submissionNotes: notes,
        });
      }
      const [updatedDeliverables, updatedReports, updatedMilestones] =
        await Promise.all([
          contractApi.listDeliverables(sourceMilestoneId),
          contractApi.listProgressReports(id, sourceMilestoneId),
          contractApi.listMilestones(id),
        ]);
      setDeliverablesByMilestone((current) => ({
        ...current,
        [sourceMilestoneId]: updatedDeliverables,
      }));
      setProgressReportsByMilestone((current) => ({
        ...current,
        [sourceMilestoneId]: updatedReports,
      }));
      setMilestones(updatedMilestones);
      setDeliverableForm({
        type: "PROCESS",
        sourceCodeUrl: "",
        demoLink: "",
        submissionNotes: "",
        percentComplete: "50",
      });
      setDeliverableOpen(null);
      setMilestoneNotice(sourceMilestoneId, {
        tone: "success",
        title:
          deliverableForm.type === "FINAL"
            ? "Đã nộp final product cho Business nghiệm thu."
            : "Đã nộp progress report cho Business theo dõi.",
        message:
          deliverableForm.type === "FINAL"
            ? "Cột mốc đang chờ Business kiểm tra và nghiệm thu."
            : "Báo cáo tiến độ đã được ghi nhận trong lịch sử cột mốc.",
      });
    } catch (error) {
      setMilestoneNotice(sourceMilestoneId, {
        tone: "danger",
        title: getApiErrorMessage(error),
      });
    } finally {
      setActionLoading(null);
    }
  };

  const rejectWithFeedback = async () => {
    if (!feedbackOpen) return;
    const reason = feedbackReason.trim();
    if (!reason) {
      setFeedbackRequired(true);
      return;
    }
    const milestone = feedbackOpen;
    await runMilestoneAction(
      milestone,
      "feedback",
      (sourceMilestoneId) =>
        contractApi.rejectMilestone(sourceMilestoneId, reason),
      "Đã gửi feedback. Expert có thể chỉnh sửa và nộp lại final product.",
    );
    setFeedbackReason("");
    setFeedbackRequired(false);
    setFeedbackOpen(null);
  };

  const submitProgressFeedback = async () => {
    if (!progressFeedbackOpen || !contract) return;
    const sourceMilestoneId = getSourceMilestoneId(
      progressFeedbackOpen.milestone,
    );
    const feedback = progressFeedbackForm.feedback.trim();
    if (!sourceMilestoneId) {
      setWorkspaceNotice({
        tone: "danger",
        title: "Không xác định được cột mốc cần phản hồi.",
      });
      return;
    }
    if (!feedback) {
      setWorkspaceNotice({
        tone: "warning",
        title: "Vui lòng nhập nội dung phản hồi.",
      });
      return;
    }
    setActionLoading(
      `progress-feedback:${progressFeedbackOpen.report.progressReportId}`,
    );
    try {
      const saved = await contractApi.feedbackProgressReport(
        contract.contractId,
        sourceMilestoneId,
        progressFeedbackOpen.report.progressReportId,
        {
          feedback,
          category: progressFeedbackForm.category,
          severity: progressFeedbackForm.severity,
          dodItems: progressFeedbackForm.dodChecklist,
          requiresAdjustment: progressFeedbackForm.requiresAdjustment,
        },
      );
      setProgressReportsByMilestone((current) => ({
        ...current,
        [sourceMilestoneId]: (current[sourceMilestoneId] || []).map((item) =>
          item.progressReportId === saved.progressReportId ? saved : item,
        ),
      }));
      setMilestoneNotice(sourceMilestoneId, {
        tone: "success",
        title: "Đã gửi phản hồi cho báo cáo tiến độ.",
        message: progressFeedbackForm.requiresAdjustment
          ? "Expert sẽ thấy yêu cầu điều chỉnh trong thông báo."
          : "Phản hồi đã được lưu trong lịch sử báo cáo.",
      });
      setProgressFeedbackForm({
        feedback: "",
        category: "Core Logic",
        severity: "Medium",
        dodChecklist: [],
        requiresAdjustment: false,
      });
      setProgressFeedbackOpen(null);
    } catch (error) {
      setMilestoneNotice(sourceMilestoneId, {
        tone: "danger",
        title: getApiErrorMessage(error),
      });
    } finally {
      setActionLoading(null);
    }
  };

  const submitInitiateDispute = async () => {
    if (!initiateDisputeOpen || !contract) return;
    const sourceMilestoneId = getSourceMilestoneId(initiateDisputeOpen);
    if (!sourceMilestoneId) return;
    if (initiateDisputeType === "OTHER" && !initiateDisputeOtherReason.trim()) {
      const roleName = session?.role === "EXPERT" ? "Chuyên gia" : "Doanh nghiệp";
      setInitiateDisputeModalWarning(
        `Khi chọn Lý do khác, ${roleName} cần mô tả rõ lý do mở hồ sơ tranh chấp.`,
      );
      return;
    }

    setInitiateDisputeModalWarning("");
    setActionLoading(`initiate-dispute:${sourceMilestoneId}`);
    try {
      await disputeApi.create({
        contractId: contract.contractId,
        milestoneId: sourceMilestoneId,
        initiatedBy: session?.role === "BUSINESS" ? "BUSINESS" : "EXPERT",
        initiationType: initiateDisputeType,
        evidenceReport: initiateDisputeOtherReason.trim() || undefined,
      });
      await refreshAfterAction();
      setMilestoneNotice(sourceMilestoneId, {
        tone: "success",
        title: "Đã mở hồ sơ tranh chấp.",
        message: "Hai bên đang trong giai đoạn tự thương lượng.",
      });
      setInitiateDisputeOpen(null);
      setInitiateDisputeType("OTHER");
      setInitiateDisputeOtherReason("");
      setInitiateDisputeModalWarning("");
    } catch (error) {
      setMilestoneNotice(sourceMilestoneId, {
        tone: "danger",
        title: getApiErrorMessage(error),
      });
    } finally {
      setActionLoading(null);
    }
  };

  const submitEscalateDispute = async () => {
    if (!escalateDisputeOpen || !contract) return;
    const sourceMilestoneId = getSourceMilestoneId(escalateDisputeOpen);
    if (!sourceMilestoneId) return;
    const reason = disputeReason.trim();
    if (!reason) {
      setWorkspaceNotice({
        tone: "warning",
        title: "Không tìm thấy lý do tranh chấp để gửi Staff.",
      });
      return;
    }
    setActionLoading(`escalate-dispute:${sourceMilestoneId}`);
    try {
      const existing = disputesByMilestone[sourceMilestoneId];
      if (!existing || existing.status !== "PENDING_SELF_RESOLVE") return;
      const escalationReason = escalateDisputeNote.trim()
        ? `${reason}\n\nGhi chú bổ sung: ${escalateDisputeNote.trim()}`
        : reason;
      await disputeApi.escalate(
        existing.disputeId,
        escalationReason,
        evidenceFileUrl.trim() || undefined,
      );
      await refreshAfterAction();
      setMilestoneNotice(sourceMilestoneId, {
        tone: "success",
        title: "Đã gửi yêu cầu Staff can thiệp.",
        message: "Hệ thống sẽ tự động gán Staff phù hợp để xử lý.",
      });
      setEscalateDisputeOpen(null);
      setDisputeReason("");
      setEvidenceFileUrl("");
      setEscalateDisputeNote("");
    } catch (error) {
      setMilestoneNotice(sourceMilestoneId, {
        tone: "danger",
        title: getApiErrorMessage(error),
      });
    } finally {
      setActionLoading(null);
    }
  };
  const disputeBusinessTermination = async (request: TerminationRequest) => {
    if (!request.terminationRequestId) return;
    const reason = window.prompt(
      "Lý do Expert không đồng ý với yêu cầu hủy contract của Business:",
      "Business hủy contract khi Expert vẫn có khả năng tiếp tục thực hiện.",
    );
    if (reason === null) return;
    setActionLoading(`termination-dispute:${request.terminationRequestId}`);
    try {
      await contractApi.disputeTerminationRequest(
        request.terminationRequestId,
        reason.trim() ||
        "Expert yêu cầu staff hỗ trợ vì không đồng ý hủy contract.",
      );
      await refreshAfterAction();
      setWorkspaceNotice({
        tone: "success",
        title: "Đã gửi yêu cầu staff hỗ trợ.",
        message:
          "Tiền tiếp tục được tạm giữ. Admin sẽ phân công staff xem xét yêu cầu hủy contract này.",
      });
    } catch (error) {
      setWorkspaceNotice({
        tone: "danger",
        title: getApiErrorMessage(error),
      });
    } finally {
      setActionLoading(null);
    }
  };

  const acceptBusinessTermination = async (request: TerminationRequest) => {
    if (!request.terminationRequestId) return;
    if (
      !window.confirm(
        "Dong y huy contract? He thong se huy contract va refund cac milestone chua hoan thanh cho Business.",
      )
    ) {
      return;
    }
    setActionLoading(`termination-accept:${request.terminationRequestId}`);
    try {
      await contractApi.acceptTerminationRequest(request.terminationRequestId);
      await refreshAfterAction();
      setWorkspaceNotice({
        tone: "success",
        title: "Da dong y huy contract.",
        message:
          "Contract da duoc huy. Cac milestone chua hoan thanh se duoc refund cho Business neu milestone do dang giu escrow.",
      });
    } catch (error) {
      setWorkspaceNotice({
        tone: "danger",
        title: getApiErrorMessage(error),
      });
    } finally {
      setActionLoading(null);
    }
  };

  const decideAfterDispute = async (decision: "continue" | "cancel") => {
    if (!contract) return;
    if (
      decision === "cancel" &&
      !window.confirm(
        "Hủy hợp đồng ngay và hoàn tiền các các cột mốc chưa hoàn thành? Hành động này sẽ khóa hợp đồng.",
      )
    ) {
      return;
    }
    setActionLoading(`post-dispute:${decision}`);
    try {
      await refreshAfterAction();
      setWorkspaceNotice({
        tone: "warning",
        title: "Hệ thống hiện chưa hỗ trợ chức năng tiếp tục/hủy hợp đồng sau khi có tranh chấp.",
        message:
          "Vui lòng sử dụng chức năng staff decision và execute settlement của tranh chấp để cập nhật trạng thái.",
      });
    } catch (error) {
      setWorkspaceNotice({
        tone: "danger",
        title: getApiErrorMessage(error),
      });
    } finally {
      setActionLoading(null);
    }
  };

  const submitAbruptTermination = async () => {
    if (!contract) return;
    setActionLoading("abrupt-termination");
    try {
      const updated = await contractApi.immediateTermination(contract.contractId, {
        reason:
          abruptTerminationReason.trim() ||
          (session?.role === "EXPERT"
            ? "Chuyên gia bồi thường 10% giá trị hợp đồng để hủy ngang hợp đồng."
            : "Doanh nghiệp chấp nhận mất 10% giá trị hợp đồng để hủy ngang hợp đồng."),
        confirmedPenalty: true,
      });
      setContract(updated);
      await refreshAfterAction();
      setWorkspaceNotice({
        tone: "success",
        title: "Đã hủy ngang hợp đồng.",
        message:
          session?.role === "EXPERT"
            ? "Hệ thống đã chuyển 10% giá trị hợp đồng từ khoản ký quỹ Expert sang Doanh nghiệp."
            : "Hệ thống đã chuyển 10% giá trị hợp đồng từ tiền ký quỹ sang ví Chuyên gia và hoàn phần còn lại cho Doanh nghiệp.",
      });
      setAbruptTerminationOpen(false);
      setAbruptTerminationReason("");
    } catch (error) {
      setWorkspaceNotice({
        tone: "danger",
        title: getApiErrorMessage(error),
      });
    } finally {
      setActionLoading(null);
    }
  };

  const autoApproveReviewSla = async () => {
    if (!contract) return;
    setActionLoading("review-sla");
    try {
      const updated = await contractApi.autoApproveReviewSla(
        contract.contractId,
      );
      await refreshAfterAction();
      setWorkspaceNotice({
        tone: "success",
        title:
          updated.length > 0
            ? `Đã tự động nghiệm thu ${updated.length} cột mốc quá thời gian phản hồi.`
            : "Chưa có cột mốc nào đủ điều kiện tự động nghiệm thu.",
      });
    } catch (error) {
      setWorkspaceNotice({
        tone: "danger",
        title: getApiErrorMessage(error),
      });
    } finally {
      setActionLoading(null);
    }
  };

  if (!contract) {
    return (
      <EmptyState
        title="Không tìm thấy workspace"
        description="Không thể tải dữ liệu làm việc của hợp đồng này."
      />
    );
  }

  const allDone = milestones.length > 0 && counts.done === milestones.length;
  const contractStatus = normalizeStatus(contract.status);
  const awaitingBusinessDecision =
    contractStatus === "AWAITING_CONTINUATION_DECISION";
  const contractActionsFrozen = [
    "AWAITING_CONTINUATION_DECISION",
    "TERMINATION_PENDING",
    "TERMINATED",
    "CANCELLED",
    "CLOSED",
    "COMPLETED",
  ].includes(contractStatus);
  const canBusinessDecideAfterDispute =
    session?.role === "BUSINESS" && awaitingBusinessDecision;
  const hasActiveTermination = terminationRequests.some(
    (request) =>
      !["COMPLETED", "CANCELLED", "STAFF_REJECTED"].includes(
        normalizeStatus(request.status),
      ),
  );
  const activeTerminationRequest = terminationRequests.find(
    (request) =>
      !["COMPLETED", "CANCELLED", "STAFF_REJECTED"].includes(
        normalizeStatus(request.status),
      ),
  );
  const awaitingExpertTerminationResponse =
    normalizeStatus(activeTerminationRequest?.status) ===
    "AWAITING_EXPERT_RESPONSE" ||
    (normalizeStatus(activeTerminationRequest?.status) === "REQUESTED" &&
      activeTerminationRequest?.requestedByRole?.toUpperCase() === "BUSINESS" &&
      !activeTerminationRequest?.assignedStaffId &&
      !activeTerminationRequest?.staffReviewStartedAt &&
      !activeTerminationRequest?.partialEvidenceNote);
  const canExpertEscalateTermination =
    session?.role === "EXPERT" &&
    Boolean(activeTerminationRequest) &&
    awaitingExpertTerminationResponse;
  const hasAbruptTerminationBlockedMilestone = milestones.some((milestone) =>
    ["UNDER_REVIEW", "DISPUTED"].includes(normalizeStatus(milestone.status)),
  );
  const canShowAbruptTermination =
    (session?.role === "BUSINESS" || session?.role === "EXPERT") &&
    contractStatus === "ACTIVE" &&
    !contractActionsFrozen &&
    !hasActiveTermination;
  const canUseAbruptTermination =
    canShowAbruptTermination &&
    !hasAbruptTerminationBlockedMilestone;
  const abruptTerminationPenalty = Number(contract.totalBudget || 0) * 0.1;
  const deliverableOpenStatus = normalizeStatus(deliverableOpen?.status);
  const canOpenProgressReport =
    !contractActionsFrozen &&
    deliverableOpen !== null &&
    PROGRESS_REPORT_STATUSES.has(deliverableOpenStatus);
  const canOpenFinalProduct =
    !contractActionsFrozen &&
    deliverableOpen !== null &&
    SUBMITTABLE_STATUSES.has(deliverableOpenStatus);

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          title={`Workspace: ${contract.contractTitle ||
            contract.title ||
            `Hợp đồng`
          }`}
          description="Business ký quỹ từng cột mốc, Expert nộp báo cáo tiến độ hoặc final product, Business nghiệm thu hoặc yêu cầu chỉnh sửa final product."
          actions={
            <div className="flex flex-wrap gap-2">
              {session?.role === "ADMIN" && (
                <Button
                  variant="secondary"
                  onClick={autoApproveReviewSla}
                  loading={actionLoading === "review-sla"}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Xử lý nghiệm thu quá hạn
                </Button>
              )}
              {canShowAbruptTermination && (
                <Button
                  variant="danger"
                  disabled={!canUseAbruptTermination}
                  title={
                    hasAbruptTerminationBlockedMilestone
                      ? "Khong the huy ngang khi co milestone dang nghiem thu hoac tranh chap."
                      : undefined
                  }
                  onClick={() => setAbruptTerminationOpen(true)}
                >
                  <AlertTriangle className="h-4 w-4" />
                  {session?.role === "EXPERT"
                    ? "Bồi thường hợp đồng"
                    : "Hủy hợp đồng đột ngột"}
                </Button>
              )}
              <Button variant="secondary" onClick={loadWorkspace}>
                <RefreshCw className="h-4 w-4" />
                Làm mới
              </Button>
            </div>
          }
        />
      </div>

      {workspaceNotice && (
        <Notice
          tone={workspaceNotice.tone}
          title={workspaceNotice.title}
          className="mt-2"
        >
          {workspaceNotice.message}
        </Notice>
      )}

      {activeTerminationRequest && awaitingExpertTerminationResponse && (
        <Card className="border-amber-200 bg-amber-50/80 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="amber">Đang cho Chuyên gia phản hồi</Badge>
                <Badge tone="slate">Tiền chưa được hoàn</Badge>
              </div>
              <h2 className="mt-3 font-display text-lg font-extrabold text-ink">
                Doanh nghiệp đã yêu cầu hủy hợp đồng
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Chuyên gia có 3 ngày để phản hồi. Nếu Chuyên gia không phản hồi,
                hệ thống sẽ tự động hủy hợp đồng và hoàn tiền các cột mốc chưa
                hoàn thành cho Doanh nghiệp. Nếu Chuyên gia không đồng ý,
                Chuyên gia có thể yêu cầu staff hỗ trợ xử lý.
              </p>
            </div>
            {canExpertEscalateTermination && (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  loading={
                    actionLoading ===
                    `termination-accept:${activeTerminationRequest.terminationRequestId}`
                  }
                  onClick={() =>
                    acceptBusinessTermination(activeTerminationRequest)
                  }
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Đồng ý hủy
                </Button>
                <Button
                  variant="danger"
                  loading={
                    actionLoading ===
                    `termination-dispute:${activeTerminationRequest.terminationRequestId}`
                  }
                  onClick={() =>
                    disputeBusinessTermination(activeTerminationRequest)
                  }
                >
                  <Gavel className="h-4 w-4" />
                  Yêu cầu staff hỗ trợ
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {activeTerminationRequest && !awaitingExpertTerminationResponse && (
        <Notice tone="warning" title="Yêu cầu hủy hợp đồng đang được xử lý">
          Tiền đang được tạm giữ và hợp đồng tạm khóa thao tác. Staff/admin
          sẽ xem xét yêu cầu hủy này trước khi quyết định hoàn tiền hoặc cho hợp
          đồng tiếp tục.
        </Notice>
      )}

      {awaitingBusinessDecision && (
        <Card className="border-amber-200 bg-amber-50/70 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="amber">
                  {contractStatusLabel(contract.status)}
                </Badge>
                <Badge tone="slate">Contract tam khoa thao tac</Badge>
              </div>
              <h2 className="mt-3 font-display text-lg font-extrabold text-ink">
                Tranh chấp đã được xử lý. Doanh nghiệp cần quyết định bước tiếp theo.
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Nếu tiếp tục, contract được mở lại để làm các cột mốc còn lại.
                Nếu hủy, hệ thống sẽ hủy toàn bộ cột mốc chưa hoàn thành và
                hoàn tiền cột mốc nào đang giữ tiền ký quỹ về ví Doanh nghiệp.
              </p>
            </div>
            {canBusinessDecideAfterDispute && (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  loading={actionLoading === "post-dispute:continue"}
                  onClick={() => decideAfterDispute("continue")}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Tiếp tục dự án
                </Button>
                <Button
                  variant="danger"
                  loading={actionLoading === "post-dispute:cancel"}
                  onClick={() => decideAfterDispute("cancel")}
                >
                  <XCircle className="h-4 w-4" />
                  Hủy hợp đồng và hoàn tiền
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {allDone && (
        <Notice
          tone="success"
          title="Tất cả cột mốc đã hoàn tất nghiệm thu."
        >
          Doanh nghiệp có thể thực hiện chuyển giao sản phẩm/review ở các màn
          hợp đồng và đánh giá liên quan.
        </Notice>
      )}

      <div className="grid gap-3 md:grid-cols-4">
        <FlowStep
          icon={<WalletCards className="h-4 w-4" />}
          title="Ký quỹ mốc"
          description={`${counts.pending} cột mốc đang chờ Doanh nghiệp ký quỹ.`}
          active={counts.pending > 0}
          done={counts.pending === 0 && milestones.length > 0}
        />
        <FlowStep
          icon={<UploadCloud className="h-4 w-4" />}
          title="Expert nộp sản phẩm"
          description={`${counts.ready} mốc chờ bắt đầu, ${counts.working} đang làm, ${counts.overdue} quá hạn.`}
          active={counts.ready > 0 || counts.working > 0 || counts.overdue > 0}
        />
        <FlowStep
          icon={<CheckCircle2 className="h-4 w-4" />}
          title="Doanh nghiệp nghiệm thu"
          description={`${counts.review} cột mốc đang chờ nghiệm thu.`}
          active={counts.review > 0}
        />
        <FlowStep
          icon={<Gavel className="h-4 w-4" />}
          title="Tranh chấp"
          description={`${counts.disputed} cột mốc đang ở trạng thái tranh chấp.`}
          active={counts.disputed > 0}
        />
      </div>

      <div className="grid gap-4">
        {milestones.map((milestone) => {
          const sourceMilestoneId = getSourceMilestoneId(milestone);
          const status = normalizeStatus(milestone.status);
          const milestoneDeliverables = (sourceMilestoneId
            ? deliverablesByMilestone[sourceMilestoneId] || []
            : []
          ).slice().sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
          const milestoneReports = (sourceMilestoneId
            ? progressReportsByMilestone[sourceMilestoneId] || []
            : []
          ).slice().sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
          const criteriaItems = sourceMilestoneId
            ? criteriaByMilestone[sourceMilestoneId] || []
            : [];
          const snapshotItems = criteriaSnapshotLines(milestone);
          const visibleCriteria =
            criteriaItems.length > 0
              ? criteriaItems.map((item) => item.description)
              : snapshotItems;
          const milestoneNotice = sourceMilestoneId
            ? milestoneNotices[sourceMilestoneId]
            : null;
          const visibleMilestoneNotice =
            milestoneNotice &&
              !(
                status === "UNDER_REVIEW" &&
                milestoneNotice.title.toLowerCase().includes("feedback")
              )
              ? milestoneNotice
              : null;
          const nextMilestone = milestones.find(
            (item) =>
              Number(item.orderIndex) === Number(milestone.orderIndex) + 1,
          );
          const nextMilestoneId = nextMilestone
            ? getSourceMilestoneId(nextMilestone)
            : undefined;
          const currentDispute = sourceMilestoneId
            ? disputesByMilestone[sourceMilestoneId]
            : undefined;
          const latestProgressReport =
            milestoneReports.length > 0
              ? milestoneReports[milestoneReports.length - 1]
              : undefined;
          const latestDeliverable =
            milestoneDeliverables.length > 0
              ? milestoneDeliverables[milestoneDeliverables.length - 1]
              : undefined;
          const latestSubmissionMeta = [
            ...milestoneReports.map((item) => ({
              kind: "REPORT" as const,
              id: item.progressReportId,
              createdAt: item.createdAt || "",
            })),
            ...milestoneDeliverables.map((item) => ({
              kind: "DELIVERABLE" as const,
              id: item.deliverableId,
              createdAt: item.createdAt || "",
            })),
          ]
            .filter((item) => item.createdAt)
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
            .at(-1);
          const isLoading = (action: string) =>
            actionLoading === `${action}:${sourceMilestoneId}`;
          const canDeposit =
            !contractActionsFrozen &&
            session?.role === "BUSINESS" &&
            DEPOSITABLE_STATUSES.has(status) &&
            milestones
              .filter(
                (item) =>
                  Number(item.orderIndex) < Number(milestone.orderIndex),
              )
              .every((item) => normalizeStatus(item.status) === "COMPLETED");
          const canStart =
            !contractActionsFrozen &&
            (session?.role === "BUSINESS" || session?.role === "EXPERT") &&
            status === "DEPOSITED";
          const canDepositNext =
            !contractActionsFrozen &&
            session?.role === "BUSINESS" &&
            status === "COMPLETED" &&
            nextMilestoneId &&
            DEPOSITABLE_STATUSES.has(normalizeStatus(nextMilestone?.status));
          const canSubmit =
            !contractActionsFrozen &&
            session?.role === "EXPERT" &&
            SUBMITTABLE_STATUSES.has(status);
          const canSubmitProgress =
            !contractActionsFrozen &&
            session?.role === "EXPERT" &&
            PROGRESS_REPORT_STATUSES.has(status);
          const canRequestProgressReport =
            !contractActionsFrozen &&
            session?.role === "BUSINESS" &&
            PROGRESS_REPORT_STATUSES.has(status) &&
            !milestone.progressReportRequestPending;
          const canReview =
            !contractActionsFrozen &&
            session?.role === "BUSINESS" &&
            REVIEWABLE_STATUSES.has(status);
          const canDispute =
            !contractActionsFrozen &&
            (session?.role === "BUSINESS" || session?.role === "EXPERT") &&
            DISPUTABLE_STATUSES.has(status) &&
            (!currentDispute ||
              normalizeStatus(currentDispute.status) === "PENDING_SELF_RESOLVE");
          const isExpanded = sourceMilestoneId
            ? (expandedMilestones[sourceMilestoneId] ??
              isActiveMilestoneStatus(status))
            : true;
          const hintLine = workspaceHintLine(
            session?.role,
            status,
            currentDispute,
          );

          return (
            <Card
              key={
                sourceMilestoneId ||
                getContractMilestoneId(milestone) ||
                milestone.orderIndex
              }
              className="p-5"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="brand">Mốc {milestone.orderIndex}</Badge>
                    <StatusBadge
                      status={milestoneStatusLabel(milestone.status)}
                    />
                  </div>
                  {milestone.description && (
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                      {milestone.description}
                    </p>
                  )}
                  <div className="mt-3 flex flex-col gap-1 text-sm font-bold text-slate-500">
                    <span>
                      Ngân sách mốc:{" "}
                      {formatCurrency(getMilestoneBudget(milestone))}
                    </span>
                    <span>Thời gian: {milestoneDurationLabel(milestone)}</span>
                    {milestone.updatedAt && (
                      <span>
                        Cập nhật: {formatDateTime(milestone.updatedAt)}
                      </span>
                    )}
                    {milestone.dueAt && (
                      <span>Hạn nộp: {formatDateTime(milestone.dueAt)}</span>
                    )}
                    {milestone.reviewDueAt && (
                      <span>
                        Hạn nghiệm thu: {formatDateTime(milestone.reviewDueAt)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap justify-end gap-2">

                  {canDeposit && (
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={isLoading("deposit")}
                      onClick={() =>
                        runMilestoneAction(
                          milestone,
                          "deposit",
                          (sourceMilestoneId) =>
                            contractApi.depositMilestoneEscrow(
                              contract.contractId,
                              sourceMilestoneId,
                            ),
                          "Đã ký quỹ cột mốc. Chuyên gia cần bấm bắt đầu mốc trước khi nộp tiến độ hoặc sản phẩm cuối cùng.",
                        )
                      }
                    >
                      <WalletCards className="h-4 w-4" />
                      Ký quỹ cột mốc này
                    </Button>
                  )}
                  {canStart && (
                    <Button
                      size="sm"
                      loading={isLoading("start")}
                      onClick={() =>
                        runMilestoneAction(
                          milestone,
                          "start",
                          (sourceMilestoneId) =>
                            contractApi.startMilestone(sourceMilestoneId),
                          "Đã bắt đầu cột mốc. Bạn có thể nộp tiến độ hoặc sản phẩm cuối cùng.",
                        )
                      }
                    >
                      <PlayCircle className="h-4 w-4" />
                      Bắt đầu cột mốc
                    </Button>
                  )}
                  {canRequestProgressReport && (
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={isLoading("progress-request")}
                      onClick={() =>
                        runMilestoneAction(
                          milestone,
                          "progress-request",
                          (sourceMilestoneId) =>
                            contractApi.requestProgressReport(
                              contract.contractId,
                              sourceMilestoneId,
                            ),
                          Number(milestone.progressReportRequestCount || 0) === 0
                            ? "Đã yêu cầu Chuyên gia nộp báo cáo tiến độ trong 24h."
                            : "Đã yêu cầu Chuyên gia nộp lại báo cáo tiến độ trong 12h.",
                        )
                      }
                    >
                      <Send className="h-4 w-4" />
                      Yêu cầu báo cáo tiến độ
                    </Button>
                  )}
                  {canSubmit && (
                    <>
                      {canSubmitProgress && (
                        <Button
                          size="sm"
                          variant="secondary"
                          loading={isLoading("submit")}
                          onClick={() => {
                            setDeliverableForm((value) => ({
                              ...value,
                              type: "PROCESS",
                            }));
                            setDeliverableOpen(milestone);
                          }}
                        >
                          <Send className="h-4 w-4" />
                          Nộp báo cáo tiến độ
                        </Button>
                      )}
                      <Button
                        size="sm"
                        loading={isLoading("submit")}
                        onClick={() => {
                          setDeliverableForm((value) => ({
                            ...value,
                            type: "FINAL",
                          }));
                          setDeliverableOpen(milestone);
                        }}
                      >
                        <UploadCloud className="h-4 w-4" />
                        Nộp sản phẩm cuối cùng
                      </Button>
                    </>
                  )}
                  {canDepositNext && (
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={actionLoading === `deposit:${nextMilestoneId}`}
                      onClick={() => {
                        if (!nextMilestone || !nextMilestoneId) return;
                        runMilestoneAction(
                          nextMilestone,
                          "deposit",
                          () =>
                            contractApi.depositMilestoneEscrow(
                              contract.contractId,
                              nextMilestoneId,
                            ),
                          `Đã mở cột mốc ${nextMilestone?.orderIndex}. Chuyên gia có thể tiếp tục công việc.`,
                        );
                      }}
                    >
                      <ArrowRight className="h-4 w-4" />
                      Mở cột mốc tiếp theo
                    </Button>
                  )}
                  {canDispute && !currentDispute && (
                    <Button
                      size="sm"
                      variant="danger"
                      loading={isLoading("initiate-dispute")}
                      onClick={() => setInitiateDisputeOpen(milestone)}
                    >
                      <Gavel className="h-4 w-4" />
                      Mở tranh chấp
                    </Button>
                  )}
                  {currentDispute && normalizeStatus(currentDispute.status) === "PENDING_SELF_RESOLVE" && (
                    <Button
                      size="sm"
                      variant="danger"
                      loading={isLoading("escalate-dispute")}
                      onClick={() => {
                        setDisputeReason(
                          currentDispute.evidenceReport?.trim() ||
                            currentDispute.escalationReason?.trim() ||
                            currentDispute.initiationType ||
                            "Lý do tranh chấp chưa được cung cấp.",
                        );
                        setEvidenceFileUrl(
                          currentDispute.escalationEvidenceFile || "",
                        );
                        setEscalateDisputeNote("");
                        setEscalateDisputeOpen(milestone);
                      }}
                    >
                      <Gavel className="h-4 w-4" />
                      Yêu cầu Staff can thiệp
                    </Button>
                  )}
                  {sourceMilestoneId && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        setExpandedMilestones((current) => ({
                          ...current,
                          [sourceMilestoneId]: !isExpanded,
                        }))
                      }
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      {isExpanded ? "Thu gọn" : "Mở chi tiết"}
                    </Button>
                  )}
                </div>
              </div>

              {isExpanded ? (
                <>
                  {visibleMilestoneNotice && (
                    <div className="mt-4">
                      <Notice
                        tone={visibleMilestoneNotice.tone}
                        title={visibleMilestoneNotice.title}
                      >
                        {visibleMilestoneNotice.message}
                      </Notice>
                    </div>
                  )}

                  {milestone.progressReportRequestPending && (
                    <div className="mt-4">
                      <Notice
                        tone={
                          milestone.progressReportRequestOverdue ? "danger" : "warning"
                        }
                        title={
                          milestone.progressReportRequestOverdue
                            ? "Quá hạn nộp báo cáo tiến độ"
                            : "Doanh nghiệp đã yêu cầu báo cáo tiến độ"
                        }
                      >
                        {milestone.progressReportRequestOverdue
                          ? "Chuyên gia chưa nộp báo cáo tiến độ đúng hạn. Doanh nghiệp có quyền hủy ngang hợp đồng."
                          : `Chuyên gia cần nộp báo cáo tiến độ trước ${formatDateTime(milestone.progressReportDueAt)}.`}
                      </Notice>
                    </div>
                  )}

                  {status === "PENDING" && session?.role === "EXPERT" && (
                    <div className="mt-4">
                      <Notice
                        tone="warning"
                        title="Cột mốc chưa sẵn sàng để Chuyên gia nộp sản phẩm."
                      >
                        Doanh nghiệp cần ký quỹ cột mốc này trước, sau đó Chuyên gia mới có
                        thể bắt đầu công việc.
                      </Notice>
                    </div>
                  )}
                  {status === "OVERDUE" && (
                    <div className="mt-4">
                      <Notice
                        tone="warning"
                        title="Cột mốc đã quá hạn nộp sản phẩm cuối cùng."
                      >
                        Chuyên gia vẫn có thể nộp sản phẩm cuối cùng muộn để Doanh nghiệp kiểm
                        tra, hoặc hai bên có thể gửi yêu cầu hủy nếu không thể tiếp
                        tục.
                      </Notice>
                    </div>
                  )}
                  {currentDispute && (
                    <div className="mt-4">
                      <Notice
                        tone="warning"
                        title={disputeWorkspaceNotice(currentDispute).title}
                      >
                        {disputeWorkspaceNotice(currentDispute).message}
                      </Notice>
                    </div>
                  )}
                  <div className="mt-5 grid gap-4">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm font-extrabold text-ink">
                        Definition of Done / Acceptance Criteria
                      </p>
                      <div className="mt-3 grid gap-2">
                        {visibleCriteria.map((description, index) => (
                          <div
                            key={`${description}-${index}`}
                            className="flex items-start gap-2 rounded-xl bg-white p-3 text-sm text-slate-600"
                          >
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-mint-600" />
                            <span>{description}</span>
                          </div>
                        ))}
                        {visibleCriteria.length === 0 && (
                          <p className="rounded-xl border border-dashed border-slate-200 bg-white p-3 text-sm font-semibold text-slate-400">
                            Chưa có tiêu chí nghiệm thu cho cột mốc này.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-extrabold text-ink">
                          Báo cáo tiến độ / Sản phẩm bàn giao
                        </p>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500">
                          {milestoneReports.length + milestoneDeliverables.length} lần nộp
                        </span>
                      </div>
                      <div className="mt-3 grid gap-2">
                        {milestoneReports.map((item, reportIndex) => (
                          <div
                            key={`report-${item.progressReportId}`}
                            className="rounded-xl bg-white p-4 text-sm text-slate-600 shadow-sm"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="font-bold text-ink">
                                Báo cáo tiến độ lần {reportIndex + 1}
                              </p>
                              <div className="flex flex-wrap items-center gap-2">
                                {item.checkpointType && (
                                  <Badge tone="brand">{checkpointLabel(item.checkpointType)}</Badge>
                                )}
                                <Badge
                                  tone={
                                    item.businessFeedback
                                      ? item.requiresAdjustment
                                        ? "amber"
                                        : "mint"
                                      : "slate"
                                  }
                                >
                                  {latestProgressStatusLabel(item)}
                                </Badge>
                                {latestSubmissionMeta?.kind === "REPORT" &&
                                  latestSubmissionMeta.id === item.progressReportId && (
                                    <Badge tone="violet">Lần nộp mới nhất</Badge>
                                  )}
                                {item.isLate && <Badge tone="amber">Nộp trễ</Badge>}
                                {item.createdAt && (
                                  <span className="text-xs font-bold text-slate-400">
                                    {formatDateTime(item.createdAt)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="mt-3 grid gap-2 rounded-xl bg-slate-50 p-3">
                              {typeof item.percentComplete === "number" && (
                                <p className="text-xs font-bold text-slate-500">
                                  Tiến độ: khoảng {item.percentComplete}%
                                </p>
                              )}
                              <div className="flex flex-wrap gap-3">
                                {item.sourceCodeUrl && (
                                  <div className="rounded-lg bg-white px-3 py-2">
                                    <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
                                      Source code URL
                                    </p>
                                    <a
                                      href={item.sourceCodeUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="mt-1 block break-all font-bold text-brand-600 hover:text-brand-700"
                                    >
                                      {item.sourceCodeUrl}
                                    </a>
                                  </div>
                                )}
                                {item.demoLink && (
                                  <div className="rounded-lg bg-white px-3 py-2">
                                    <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
                                      Demo URL
                                    </p>
                                    <a
                                      href={item.demoLink}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="mt-1 block break-all font-bold text-brand-600 hover:text-brand-700"
                                    >
                                      {item.demoLink}
                                    </a>
                                  </div>
                                )}
                                {item.attachmentUrl && (
                                  <div className="rounded-lg bg-white px-3 py-2">
                                    <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
                                      File đính kèm
                                    </p>
                                    <a
                                      href={item.attachmentUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="mt-1 block break-all font-bold text-brand-600 hover:text-brand-700"
                                    >
                                      {item.attachmentUrl}
                                    </a>
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                                  Nội dung nộp
                                </p>
                                <p className="mt-1 whitespace-pre-wrap leading-6">
                                  {item.submissionNotes || item.content}
                                </p>
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {item.businessFeedback && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => setProgressFeedbackDetail(item)}
                                >
                                  Mở phản hồi của Business
                                </Button>
                              )}
                              {session?.role === "BUSINESS" && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  disabled={
                                    latestProgressReport?.progressReportId !==
                                    item.progressReportId
                                  }
                                  onClick={() => {
                                    setProgressFeedbackForm({
                                      feedback: item.businessFeedback || "",
                                      category: "Core Logic",
                                      severity: "Medium",
                                      dodChecklist: [],
                                      requiresAdjustment: Boolean(item.requiresAdjustment),
                                    });
                                    setProgressFeedbackOpen({ milestone, report: item });
                                  }}
                                >
                                  {latestProgressReport?.progressReportId ===
                                    item.progressReportId
                                    ? "Phản hồi báo cáo này"
                                    : "Chỉ phản hồi lần nộp mới nhất"}
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                        {milestoneDeliverables.map((item, deliverableIndex) => (
                          <div
                            key={item.deliverableId}
                            className="rounded-xl bg-white p-4 text-sm text-slate-600 shadow-sm"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="font-bold text-ink">
                                Bản nộp sản phẩm cuối cùng lần {deliverableIndex + 1}
                              </p>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge
                                  tone={
                                    normalizeStatus(milestone.status) === "COMPLETED"
                                      ? "mint"
                                      : normalizeStatus(milestone.status) === "DISPUTED"
                                        ? "amber"
                                        : "slate"
                                  }
                                >
                                  {latestDeliverable?.deliverableId === item.deliverableId
                                    ? latestDeliverableStatusLabel(milestone.status)
                                    : "Bản nộp trước"}
                                </Badge>
                                {latestSubmissionMeta?.kind === "DELIVERABLE" &&
                                  latestSubmissionMeta.id === item.deliverableId && (
                                    <Badge tone="violet">Lần nộp mới nhất</Badge>
                                  )}
                                {item.createdAt && (
                                  <span className="text-xs font-bold text-slate-400">
                                    {formatDateTime(item.createdAt)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-3">
                              {item.sourceCodeUrl && (
                                <div className="rounded-lg bg-slate-50 px-3 py-2">
                                  <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
                                    Source code URL
                                  </p>
                                  <a
                                    href={item.sourceCodeUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-1 block break-all font-bold text-brand-600 hover:text-brand-700"
                                  >
                                    {item.sourceCodeUrl}
                                  </a>
                                </div>
                              )}
                              {item.demoLink && (
                                <div className="rounded-lg bg-slate-50 px-3 py-2">
                                  <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
                                    Demo URL
                                  </p>
                                  <a
                                    href={item.demoLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-1 block break-all font-bold text-brand-600 hover:text-brand-700"
                                  >
                                    {item.demoLink}
                                  </a>
                                </div>
                              )}
                            </div>
                            {item.submissionNotes && (
                              <div className="mt-3 rounded-xl bg-slate-50 p-3">
                                <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                                  Nội dung nộp
                                </p>
                                <p className="mt-1 whitespace-pre-wrap leading-6">
                                  {item.submissionNotes}
                                </p>
                              </div>
                            )}
                            {(item.rejectionFeedback ||
                              (session?.role === "BUSINESS" &&
                                latestDeliverable?.deliverableId === item.deliverableId &&
                                canReview)) && (
                                <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                                  {item.rejectionFeedback && (
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={() =>
                                        setDeliverableFeedbackDetail({
                                          deliverable: item,
                                          milestoneName: milestone.milestoneName,
                                          attemptNumber: deliverableIndex + 1,
                                        })
                                      }
                                    >
                                      Xem chi tiết feedback
                                    </Button>
                                  )}
                                  {session?.role === "BUSINESS" &&
                                    latestDeliverable?.deliverableId === item.deliverableId &&
                                    canReview && (
                                      <>
                                        <Button
                                          size="sm"
                                          onClick={() =>
                                            runMilestoneAction(
                                              milestone,
                                              "approve",
                                              () => contractApi.approveMilestone(sourceMilestoneId!),
                                              "Đã nghiệm thu sản phẩm và giải ngân milestone.",
                                            )
                                          }
                                          loading={isLoading("approve")}
                                        >
                                          <CheckCircle2 className="h-4 w-4" />
                                          Nghiệm thu bản nộp này
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="danger"
                                          onClick={() => {
                                            setFeedbackReason("");
                                            setFeedbackRequired(false);
                                            setFeedbackOpen(milestone);
                                          }}
                                        >
                                          <XCircle className="h-4 w-4" />
                                          Từ chối bản nộp này
                                        </Button>
                                      </>
                                    )}
                                </div>
                              )}
                          </div>
                        ))}
                        {milestoneReports.length === 0 &&
                          milestoneDeliverables.length === 0 && (
                            <p className="rounded-xl border border-dashed border-slate-200 bg-white p-3 text-sm font-semibold text-slate-400">
                              Chưa có báo cáo tiến độ hoặc sản phẩm cuối cùng cho cột mốc
                              này.
                            </p>
                          )}
                      </div>
                    </div>
                  </div>
                  <Notice tone="info" title="Hint Line" className="mt-4">
                    {hintLine}
                  </Notice>
                </>
              ) : (
                <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
                  Cột mốc đang được thu gọn. Mở chi tiết để xem tiêu chí nghiệm thu, báo cáo tiến độ, sản phẩm cuối cùng và các hành động hiện có.
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <Modal
        open={Boolean(deliverableOpen)}
        onClose={() => setDeliverableOpen(null)}
        title={
          deliverableForm.type === "FINAL"
            ? "Nộp sản phẩm cuối cùng"
            : "Nộp báo cáo tiến độ"
        }
        description={
          deliverableForm.type === "FINAL"
            ? "Sản phẩm cuối cùng sẽ được gửi cho Doanh nghiệp kiểm tra và nghiệm thu."
            : "Báo cáo tiến độ chỉ dùng để cập nhật tiến độ, không mở bước nghiệm thu hay từ chối."
        }
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setDeliverableOpen(null)}
            >
              Hủy
            </Button>
            <Button
              onClick={submitDeliverable}
              loading={
                deliverableOpen
                  ? actionLoading ===
                  `submit:${getSourceMilestoneId(deliverableOpen)}`
                  : false
              }
            >
              <Send className="h-4 w-4" />
              Nộp
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Field label="Loại nội dung">
            <div className="flex flex-wrap gap-2">
              {canOpenProgressReport && (
                <Button
                  type="button"
                  size="sm"
                  variant={
                    deliverableForm.type === "PROCESS" ? "primary" : "secondary"
                  }
                  onClick={() =>
                    setDeliverableForm((value) => ({
                      ...value,
                      type: "PROCESS",
                    }))
                  }
                >
                  Progress report
                </Button>
              )}
              {canOpenFinalProduct && (
                <Button
                  type="button"
                  size="sm"
                  variant={
                    deliverableForm.type === "FINAL" ? "primary" : "secondary"
                  }
                  onClick={() =>
                    setDeliverableForm((value) => ({
                      ...value,
                      type: "FINAL",
                    }))
                  }
                >
                  Final product
                </Button>
              )}
            </div>
          </Field>
          {deliverableForm.type === "PROCESS" && (
            <Field label="Phần trăm hoàn thành">
              <Input
                type="number"
                min="0"
                max="100"
                value={deliverableForm.percentComplete}
                onChange={(event) =>
                  setDeliverableForm((value) => ({
                    ...value,
                    percentComplete: event.target.value,
                  }))
                }
              />
            </Field>
          )}
          <Field label="Source code URL">
            <Input
              value={deliverableForm.sourceCodeUrl}
              onChange={(event) =>
                setDeliverableForm((value) => ({
                  ...value,
                  sourceCodeUrl: event.target.value,
                }))
              }
            />
          </Field>
          <Field label="Demo link">
            <Input
              value={deliverableForm.demoLink}
              onChange={(event) =>
                setDeliverableForm((value) => ({
                  ...value,
                  demoLink: event.target.value,
                }))
              }
            />
          </Field>
          <Field
            label={
              deliverableForm.type === "FINAL"
                ? "Ghi chú bàn giao final product"
                : "Nội dung progress report"
            }
          >
            <Textarea
              value={deliverableForm.submissionNotes}
              onChange={(event) =>
                setDeliverableForm((value) => ({
                  ...value,
                  submissionNotes: event.target.value,
                }))
              }
            />
          </Field>
        </div>
      </Modal>

      <Modal
        open={Boolean(progressFeedbackOpen)}
        onClose={() => setProgressFeedbackOpen(null)}
        title="Phản hồi báo cáo tiến độ"
        description="Phản hồi này chỉ dùng để trao đổi về tiến độ, không chuyển cột mốc sang tranh chấp."
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setProgressFeedbackOpen(null)}
            >
              Hủy
            </Button>
            <Button
              onClick={submitProgressFeedback}
              loading={
                progressFeedbackOpen
                  ? actionLoading ===
                  `progress-feedback:${progressFeedbackOpen.report.progressReportId}`
                  : false
              }
            >
              <Send className="h-4 w-4" />
              Gửi phản hồi
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <div className="rounded-2xl border border-brand-100 bg-brand-50 p-4">
            <p className="text-sm font-extrabold text-ink">
              Structured feedback panel
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <Field label="Category">
                <div className="flex flex-wrap gap-2">
                  {["Core Logic", "UI/UX", "Security", "Performance"].map(
                    (category) => (
                      <Button
                        key={category}
                        type="button"
                        size="sm"
                        variant={
                          progressFeedbackForm.category === category
                            ? "primary"
                            : "secondary"
                        }
                        onClick={() =>
                          setProgressFeedbackForm((value) => ({
                            ...value,
                            category,
                          }))
                        }
                      >
                        {category}
                      </Button>
                    ),
                  )}
                </div>
              </Field>
              <Field label="Severity">
                <div className="flex flex-wrap gap-2">
                  {["Low", "Medium", "High", "Critical"].map((severity) => (
                    <Button
                      key={severity}
                      type="button"
                      size="sm"
                      variant={
                        progressFeedbackForm.severity === severity
                          ? "primary"
                          : "secondary"
                      }
                      onClick={() =>
                        setProgressFeedbackForm((value) => ({
                          ...value,
                          severity,
                        }))
                      }
                    >
                      {severity}
                    </Button>
                  ))}
                </div>
              </Field>
            </div>
          </div>
          {progressFeedbackOpen && (
            <Field label="DoD checklist liên quan">
              <div className="grid gap-2">
                {(
                  criteriaByMilestone[
                    getSourceMilestoneId(progressFeedbackOpen.milestone) || -1
                  ] || []
                ).map((item) => (
                  <label
                    key={item.criteriaId}
                    className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3 text-sm font-semibold text-slate-600"
                  >
                    <input
                      type="checkbox"
                      checked={progressFeedbackForm.dodChecklist.includes(
                        item.description,
                      )}
                      onChange={(event) =>
                        setProgressFeedbackForm((value) => ({
                          ...value,
                          dodChecklist: event.target.checked
                            ? [...value.dodChecklist, item.description]
                            : value.dodChecklist.filter(
                                (entry) => entry !== item.description,
                              ),
                        }))
                      }
                    />
                    <span>{item.description}</span>
                  </label>
                ))}
                {(
                  criteriaByMilestone[
                    getSourceMilestoneId(progressFeedbackOpen.milestone) || -1
                  ] || []
                ).length === 0 && (
                  <p className="rounded-2xl bg-slate-50 p-3 text-sm font-semibold text-slate-400">
                    Cột mốc này chưa có tiêu chí nghiệm thu riêng.
                  </p>
                )}
              </div>
            </Field>
          )}
          <Field label="Nội dung phản hồi">
            <Textarea
              value={progressFeedbackForm.feedback}
              onChange={(event) =>
                setProgressFeedbackForm((value) => ({
                  ...value,
                  feedback: event.target.value,
                }))
              }
              placeholder="Ví dụ: cần bổ sung demo cho phần tích hợp, cập nhật tiến độ rõ hơn..."
            />
          </Field>
          <label className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 text-sm font-bold text-slate-600">
            <input
              type="checkbox"
              checked={progressFeedbackForm.requiresAdjustment}
              onChange={(event) =>
                setProgressFeedbackForm((value) => ({
                  ...value,
                  requiresAdjustment: event.target.checked,
                }))
              }
            />
            Yêu cầu Chuyên gia điều chỉnh ở báo cáo tiếp theo
          </label>
        </div>
      </Modal>

      <Modal
        open={Boolean(progressFeedbackDetail)}
        onClose={() => setProgressFeedbackDetail(null)}
        title="Phản hồi của Doanh nghiệp"
        footer={
          <Button
            variant="secondary"
            onClick={() => setProgressFeedbackDetail(null)}
          >
            Đóng
          </Button>
        }
      >
        {progressFeedbackDetail && (
          <div className="grid gap-3 text-sm text-slate-600">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                tone={
                  progressFeedbackDetail.requiresAdjustment ? "amber" : "mint"
                }
              >
                {progressFeedbackDetail.requiresAdjustment
                  ? "Cần điều chỉnh"
                  : "Đã ghi nhận"}
              </Badge>
              {progressFeedbackDetail.feedbackAt && (
                <span className="text-xs font-bold text-slate-400">
                  {formatDateTime(progressFeedbackDetail.feedbackAt)}
                </span>
              )}
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                Nội dung phản hồi
              </p>
              <p className="mt-2 whitespace-pre-wrap leading-6">
                {progressFeedbackDetail.businessFeedback}
              </p>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(deliverableFeedbackDetail)}
        onClose={() => setDeliverableFeedbackDetail(null)}
        title="Chi tiết phản hồi"
        footer={
          <Button
            variant="secondary"
            onClick={() => setDeliverableFeedbackDetail(null)}
          >
            Đóng
          </Button>
        }
      >
        {deliverableFeedbackDetail && (
          <div className="grid gap-3 text-sm text-slate-600">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="amber">Đã phản hồi</Badge>
              <Badge tone="slate">
                {deliverableFeedbackDetail.milestoneName}
              </Badge>
              <Badge tone="brand">
                Lần nộp {deliverableFeedbackDetail.attemptNumber}
              </Badge>
              {deliverableFeedbackDetail.deliverable.rejectedAt && (
                <span className="text-xs font-bold text-slate-400">
                  {formatDateTime(deliverableFeedbackDetail.deliverable.rejectedAt)}
                </span>
              )}
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                Nội dung phản hồi
              </p>
              <p className="mt-2 whitespace-pre-wrap break-words leading-6">
                {deliverableFeedbackDetail.deliverable.rejectionFeedback}
              </p>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(feedbackOpen)}
        onClose={() => {
          setFeedbackOpen(null);
          setFeedbackRequired(false);
        }}
        title="Từ chối sản phẩm cuối cùng"
        description="Phản hồi này sẽ được gửi cho Chuyên gia để chỉnh sửa và nộp lại sản phẩm cuối cùng."
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setFeedbackOpen(null);
                setFeedbackRequired(false);
              }}
            >
              Hủy
            </Button>
            <Button
              variant="danger"
              onClick={rejectWithFeedback}
              loading={
                feedbackOpen
                  ? actionLoading ===
                  `feedback:${getSourceMilestoneId(feedbackOpen)}`
                  : false
              }
            >
              <XCircle className="h-4 w-4" />
              Từ chối & gửi phản hồi
            </Button>
          </>
        }
      >
        <Field label="Phản hồi cho sản phẩm cuối cùng">
          <Textarea
            value={feedbackReason}
            onChange={(event) => {
              setFeedbackReason(event.target.value);
              if (event.target.value.trim()) setFeedbackRequired(false);
            }}
            placeholder="Vui lòng nhập phản hồi để Chuyên gia biết cần chỉnh sửa gì..."
            className={feedbackRequired ? "border-amber-300 bg-amber-50/40" : undefined}
          />
          {feedbackRequired && (
            <p className="mt-2 text-sm font-bold text-amber-700">
              Vui lòng nhập phản hồi để Chuyên gia biết cần chỉnh sửa gì.
            </p>
          )}
        </Field>
      </Modal>

      <Modal
        open={Boolean(initiateDisputeOpen)}
        onClose={() => {
          setInitiateDisputeOpen(null);
          setInitiateDisputeOtherReason("");
          setInitiateDisputeModalWarning("");
        }}
        title="Mở hồ sơ tranh chấp"
        description="Đây là hồ sơ tranh chấp chính thức. Lưu ý: Reject deliverable không tự tạo tranh chấp."
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setInitiateDisputeOpen(null);
                setInitiateDisputeOtherReason("");
                setInitiateDisputeModalWarning("");
              }}
            >
              Hủy
            </Button>
            <Button
              variant="danger"
              onClick={submitInitiateDispute}
              loading={
                initiateDisputeOpen
                  ? actionLoading ===
                  `initiate-dispute:${getSourceMilestoneId(initiateDisputeOpen)}`
                  : false
              }
            >
              <Gavel className="h-4 w-4" />
              Mở tranh chấp
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Field label="Tên cột mốc">
            <Input disabled value={initiateDisputeOpen?.milestoneName || ""} />
          </Field>
          <Field label="Trạng thái">
            <Input disabled value={milestoneStatusLabel(initiateDisputeOpen?.status)} />
          </Field>
          <Field label="Loại tranh chấp">
            <div className="flex flex-wrap gap-2">
              {(session?.role === "BUSINESS"
                ? [
                    { value: "BUSINESS_REJECTED_DELIVERABLE", label: "Phản đối kết quả bàn giao" },
                    { value: "OTHER", label: "Lý do khác" },
                  ]
                : [
                    { value: "EXPERT_SCOPE_CONCERN", label: "Yêu cầu ngoài phạm vi" },
                    { value: "EXPERT_NO_REVIEW_RESPONSE", label: "Business chưa phản hồi nghiệm thu" },
                    { value: "EXPERT_BAD_FAITH_REJECTION", label: "Từ chối không phù hợp tiêu chí" },
                    { value: "OTHER", label: "Lý do khác" },
                  ]
              ).map((opt) => (
                <Button
                  key={opt.value}
                  type="button"
                  size="sm"
                  variant={initiateDisputeType === opt.value ? "primary" : "secondary"}
                  onClick={() => {
                    setInitiateDisputeType(opt.value);
                    setInitiateDisputeModalWarning("");
                    if (opt.value !== "OTHER") {
                      setInitiateDisputeOtherReason("");
                    }
                  }}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </Field>
          {initiateDisputeType === "OTHER" && (
            <>
              {initiateDisputeModalWarning && (
                <Notice tone="warning" title="Vui lòng nhập lý do tranh chấp.">
                  {initiateDisputeModalWarning}
                </Notice>
              )}
              <Field label="Lý do tranh chấp *">
                <Textarea
                  value={initiateDisputeOtherReason}
                  onChange={(event) => {
                    setInitiateDisputeOtherReason(event.target.value);
                    if (event.target.value.trim()) {
                      setInitiateDisputeModalWarning("");
                    }
                  }}
                  placeholder={
                    session?.role === "EXPERT"
                      ? "Vui lòng mô tả lý do khác khiến Chuyên gia cần mở hồ sơ tranh chấp..."
                      : "Vui lòng mô tả lý do khác khiến Doanh nghiệp cần mở hồ sơ tranh chấp..."
                  }
                  className={!initiateDisputeOtherReason.trim() ? "border-amber-300 bg-amber-50/40" : undefined}
                />
                {!initiateDisputeOtherReason.trim() && (
                  <p className="mt-2 text-sm font-bold text-amber-700">
                    Bắt buộc nhập lý do khi chọn Lý do khác.
                  </p>
                )}
              </Field>
            </>
          )}
        </div>
      </Modal>

      <Modal
        open={Boolean(escalateDisputeOpen)}
        onClose={() => {
          setEscalateDisputeOpen(null);
          setDisputeReason("");
          setEvidenceFileUrl("");
          setEscalateDisputeNote("");
        }}
        title="Yêu cầu Staff can thiệp"
        description="Hệ thống sẽ tự gán Staff phù hợp để xử lý. Hồ sơ sẽ dùng lại thông tin tranh chấp đã mở."
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setEscalateDisputeOpen(null);
                setDisputeReason("");
                setEvidenceFileUrl("");
                setEscalateDisputeNote("");
              }}
            >
              Hủy
            </Button>
            <Button
              variant="danger"
              onClick={submitEscalateDispute}
              disabled={!disputeReason.trim()}
              loading={
                escalateDisputeOpen
                  ? actionLoading ===
                  `escalate-dispute:${getSourceMilestoneId(escalateDisputeOpen)}`
                  : false
              }
            >
              <Gavel className="h-4 w-4" />
              Gửi yêu cầu
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Field label="Lý do tranh chấp">
            <Textarea
              value={disputeReason}
              readOnly
              className="bg-slate-50 text-slate-700"
            />
          </Field>
          {evidenceFileUrl && (
            <Field label="Bằng chứng đã gửi Staff">
              <Input
                value={evidenceFileUrl}
                readOnly
                className="bg-slate-50 text-slate-700"
              />
            </Field>
          )}
          <Field label="Ghi chú bổ sung">
            <Textarea
              value={escalateDisputeNote}
              onChange={(event) => setEscalateDisputeNote(event.target.value)}
              placeholder="Có thể bỏ trống. Nhập thêm nội dung muốn Staff lưu ý nếu cần..."
            />
          </Field>
        </div>
      </Modal>

      <Modal
        open={abruptTerminationOpen}
        onClose={() => setAbruptTerminationOpen(false)}
        title={
          session?.role === "EXPERT"
            ? "Bồi thường hợp đồng"
            : "Hủy hợp đồng đột ngột"
        }
        description={
          session?.role === "EXPERT"
            ? `Hệ thống sẽ chuyển ${formatCurrency(abruptTerminationPenalty)} từ khoản ký quỹ Expert sang Doanh nghiệp.`
            : `Hành động này sẽ chuyển ${formatCurrency(abruptTerminationPenalty)} từ tiền cọc sang ví Chuyên gia để đền bù ngày công.`
        }
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setAbruptTerminationOpen(false)}
            >
              Hủy
            </Button>
            <Button
              variant="danger"
              onClick={submitAbruptTermination}
              loading={actionLoading === "abrupt-termination"}
            >
              <AlertTriangle className="h-4 w-4" />
              Xác nhận
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Notice
            tone="warning"
            title={
              session?.role === "EXPERT"
                ? "Bạn sẽ bị trừ 10% giá trị hợp đồng."
                : "Bạn sẽ mất 10% giá trị hợp đồng."
            }
          >
            {session?.role === "EXPERT"
              ? "Khoản bồi thường được lấy từ ký quỹ Expert đã giữ, không trừ từ số dư khả dụng."
              : "Khoản bồi thường được lấy từ ký quỹ Business đã giữ; phần còn lại được hoàn theo quy định."}
          </Notice>
          <Field label="Ly do">
            <Textarea
              value={abruptTerminationReason}
              onChange={(event) => setAbruptTerminationReason(event.target.value)}
              placeholder="Nhập lý do hủy ngang hợp đồng..."
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}

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
import { useParams } from "react-router-dom";
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
const DISPUTABLE_STATUSES = new Set(["IN_PROGRESS", "OVERDUE", "UNDER_REVIEW", "DISPUTED"]);

function normalizeStatus(status?: string) {
  return (status || "").trim().replace(/[\s-]+/g, "_").toUpperCase();
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
    ACTIVE: "Dang thuc hien",
    AWAITING_CONTINUATION_DECISION: "Cho Business quyet dinh",
    TERMINATION_PENDING: "Cho xu ly huy",
    TERMINATED: "Da huy",
    CANCELLED: "Da huy",
    COMPLETED: "Hoan thanh",
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

function roleLabel(role?: string) {
  if (role === "BUSINESS") return "BUSINESS";
  if (role === "EXPERT") return "EXPERT";
  return "OTHER";
}

function checkpointLabel(checkpointType?: string) {
  if (!checkpointType) return "Báo cáo tiến độ";
  return "Báo cáo giữa kỳ";
}

function latestProgressStatusLabel(report: MilestoneProgressReport) {
  if (report.businessFeedback) {
    return report.requiresAdjustment ? "Đã feedback, cần chỉnh sửa" : "Đã feedback";
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
  return ["DEPOSITED", "IN_PROGRESS", "OVERDUE", "UNDER_REVIEW", "DISPUTED"].includes(
    normalizeStatus(status),
  );
}

function workspaceHintLine(role?: string, status?: string, dispute?: Dispute) {
  const normalized = normalizeStatus(status);
  const disputeStatus = normalizeStatus(dispute?.status);
  if (disputeStatus === "ESCALATION_REQUESTED") {
    return "Hint: Dispute da duoc gui den hang doi staff/admin. Hai ben nen bo sung bang chung va cho staff tiep nhan.";
  }
  if (disputeStatus === "STAFF_REVIEWING") {
    return "Hint: Staff dang audit source/demo. Business va Expert theo doi ket qua tren man dispute.";
  }
  if (role === "BUSINESS" && normalized === "PENDING") {
    return "Hint: Ky quy milestone nay de Expert co the bat dau cong viec.";
  }
  if (role === "EXPERT" && normalized === "DEPOSITED") {
    return "Hint: Bam Bat dau moc de mo buoc nop progress report va final product.";
  }
  if (role === "EXPERT" && normalized === "IN_PROGRESS") {
    return "Hint: Nop bao cao giua ky de Business theo doi, sau do nop final product khi san pham san sang.";
  }
  if (role === "BUSINESS" && normalized === "UNDER_REVIEW") {
    return "Hint: Kiem tra source/demo theo DoD, nghiem thu neu dat hoac reject kem feedback co cau truc.";
  }
  if (normalized === "COMPLETED") {
    return "Hint: Milestone da hoan tat. Business co the mo milestone tiep theo neu con.";
  }
  return "Hint: Theo doi trang thai milestone va chi thao tac tren moc dang active.";
}

function disputeWorkspaceNotice(dispute?: Dispute) {
  const status = normalizeStatus(dispute?.status);
  const fallback = {
    title: dispute ? `Dispute #${dispute.disputeId}` : "Tranh chấp",
    message: "Cột mốc đang có tranh chấp. Vui lòng theo dõi trong màn chi tiết.",
  };
  const messages: Record<string, { title: string; message: string }> = {
    PENDING_SELF_RESOLVE: {
      title: `Dispute #${dispute?.disputeId} - Hai bên đang tự xử lý`,
      message:
        "Business và Expert đang tự trao đổi. Nếu không thống nhất, hãy gửi yêu cầu staff can thiệp.",
    },
    ESCALATION_REQUESTED: {
      title: `Dispute #${dispute?.disputeId} - Đã gửi yêu cầu staff`,
      message:
        "Yêu cầu can thiệp đã được gửi. Hệ thống đang chờ staff phù hợp tiếp nhận hoặc admin phân công.",
    },
    STAFF_REVIEWING: {
      title: `Dispute #${dispute?.disputeId} - Staff đang kiểm tra`,
      message:
        "Staff đã tiếp nhận tranh chấp, đang kiểm tra source/demo theo Definition of Done và sẽ gửi báo cáo cho admin.",
    },
    STAFF_DECIDED: {
      title: `Dispute #${dispute?.disputeId} - Chờ admin quyết toán`,
      message:
        "Staff đã gửi báo cáo kỹ thuật và tỷ lệ chia tiền ký quỹ. Admin sẽ đọc báo cáo và thực thi quyết toán.",
    },
    RESOLVED: {
      title: `Dispute #${dispute?.disputeId} - Đã xử lý xong`,
      message:
        "Tranh chấp đã được quyết toán. Business và Expert có thể xem kết quả giao dịch cuối cùng.",
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
  const session = useSession();
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
  const [disputeOpen, setDisputeOpen] = useState<Milestone | null>(null);
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
  const [expandedMilestones, setExpandedMilestones] = useState<Record<number, boolean>>({});
  const [disputeReason, setDisputeReason] = useState("");
  const [abruptTerminationReason, setAbruptTerminationReason] = useState("");
  const [workspaceNotice, setWorkspaceNotice] = useState<{
    tone: NoticeTone;
    title: string;
    message?: string;
  } | null>(null);
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
      { done: 0, review: 0, disputed: 0, pending: 0, ready: 0, working: 0, overdue: 0 },
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
      (sourceMilestoneId) => contractApi.rejectMilestone(sourceMilestoneId, reason),
      "Đã gửi feedback. Expert có thể chỉnh sửa và nộp lại final product.",
    );
    setFeedbackReason("");
    setFeedbackRequired(false);
    setFeedbackOpen(null);
  };

  const submitProgressFeedback = async () => {
    if (!progressFeedbackOpen || !contract) return;
    const sourceMilestoneId = getSourceMilestoneId(progressFeedbackOpen.milestone);
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
    const checklist =
      progressFeedbackForm.dodChecklist.length > 0
        ? progressFeedbackForm.dodChecklist.map((item) => `- ${item}`).join("\n")
        : "- Không chọn tiêu chí DoD cụ thể";
    const structuredFeedback = [
      `Category: ${progressFeedbackForm.category}`,
      `Severity: ${progressFeedbackForm.severity}`,
      `Requires adjustment: ${progressFeedbackForm.requiresAdjustment ? "Yes" : "No"}`,
      "DoD checklist:",
      checklist,
      "Feedback:",
      feedback,
    ].join("\n");
    setActionLoading(`progress-feedback:${progressFeedbackOpen.report.progressReportId}`);
    try {
      const saved = await contractApi.feedbackProgressReport(
        contract.contractId,
        sourceMilestoneId,
        progressFeedbackOpen.report.progressReportId,
        {
          feedback: structuredFeedback,
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

  const escalateDispute = async () => {
    if (!disputeOpen || !contract) return;
    const sourceMilestoneId = getSourceMilestoneId(disputeOpen);
    if (!sourceMilestoneId) {
      setWorkspaceNotice({
        tone: "danger",
        title: "Không xác định được milestone gốc để tạo tranh chấp.",
      });
      return;
    }
    const reason = disputeReason.trim() || "Hai bên không thống nhất về kết quả milestone.";
    setActionLoading(`dispute:${sourceMilestoneId}`);
    try {
      const existing = disputesByMilestone[sourceMilestoneId];
      if (existing && normalizeStatus(existing.status) !== "PENDING_SELF_RESOLVE") {
        setMilestoneNotice(sourceMilestoneId, {
          tone: "info",
          title: "Yêu cầu can thiệp đã được gửi trước đó.",
          message:
            disputeWorkspaceNotice(existing).message,
        });
        setDisputeOpen(null);
        return;
      }
      const dispute =
        existing ||
        (await disputeApi.initiate(
          contract.contractId,
          sourceMilestoneId,
          roleLabel(session?.role),
        ));
      if (dispute.disputeId) {
        await disputeApi.escalate(dispute.disputeId, reason);
      }
      await refreshAfterAction();
      setMilestoneNotice(sourceMilestoneId, {
        tone: "success",
        title: "Đã gửi tranh chấp cho staff tiếp nhận.",
        message:
          "Nếu có staff phù hợp chuyên ngành, hệ thống sẽ gán trực tiếp cho staff đó. Nếu chưa tìm thấy, admin sẽ phân công thủ công.",
      });
      setDisputeReason("");
      setDisputeOpen(null);
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
        "Huy contract ngay va refund cac milestone chua hoan thanh? Hanh dong nay se khoa contract.",
      )
    ) {
      return;
    }
    setActionLoading(`post-dispute:${decision}`);
    try {
      const updated =
        decision === "continue"
          ? await contractApi.continueAfterDispute(contract.contractId)
          : await contractApi.cancelAfterDispute(
              contract.contractId,
              "Business huy contract sau khi tranh chap duoc admin xu ly.",
            );
      setContract(updated);
      await refreshAfterAction();
      setWorkspaceNotice({
        tone: decision === "continue" ? "success" : "warning",
        title:
          decision === "continue"
            ? "Da mo lai contract de tiep tuc du an."
            : "Da huy contract va refund cac milestone chua lam.",
        message:
          decision === "continue"
            ? "Expert co the tiep tuc lam viec theo milestone tiep theo."
            : "Cac milestone chua hoan thanh da bi huy. Milestone nao dang giu escrow se duoc hoan ve vi Business.",
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
      const updated = await contractApi.abruptTermination(contract.contractId, {
        reason:
          abruptTerminationReason.trim() ||
          (session?.role === "EXPERT"
            ? "Expert boi thuong 10% gia tri du an de huy ngang hop dong."
            : "Business chap nhan mat 10% gia tri du an de huy ngang hop dong."),
        confirmedPenalty: true,
      });
      setContract(updated);
      await refreshAfterAction();
      setWorkspaceNotice({
        tone: "success",
        title: "Da huy ngang hop dong.",
        message:
          session?.role === "EXPERT"
            ? "He thong da khau tru 10% gia tri du an tu vi Expert va boi thuong cho Business."
            : "He thong da chuyen 10% gia tri du an tu tien coc sang vi Expert va hoan phan con lai cho Business.",
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
      const updated = await contractApi.autoApproveReviewSla(contract.contractId);
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

  const allDone =
    milestones.length > 0 && counts.done === milestones.length;
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
  const hasActiveTermination = terminationRequests.some((request) =>
    !["COMPLETED", "CANCELLED", "STAFF_REJECTED"].includes(
      normalizeStatus(request.status),
    ),
  );
  const activeTerminationRequest = terminationRequests.find((request) =>
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
  const hasRejectedDeliverableHistory = milestones.some(
    (milestone) => Number(milestone.rejectCount || 0) > 0,
  );
  const hasExpiredProgressReportRequest = milestones.some(
    (milestone) => Boolean(milestone.progressReportRequestOverdue),
  );
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
    !hasAbruptTerminationBlockedMilestone &&
    (session?.role !== "BUSINESS" ||
      !hasRejectedDeliverableHistory ||
      hasExpiredProgressReportRequest);
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
          title={`Workspace: ${
            contract.contractTitle ||
            contract.title ||
            `Contract #${contract.contractId}`
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
                    hasRejectedDeliverableHistory &&
                    !hasExpiredProgressReportRequest &&
                    session?.role === "BUSINESS"
                      ? "Hop dong da co lich su reject san pham, vui long dung luong yeu cau cham dut de staff/admin phan xu."
                      : hasAbruptTerminationBlockedMilestone
                        ? "Khong the huy ngang khi co milestone dang nghiem thu hoac tranh chap."
                        : undefined
                  }
                  onClick={() => setAbruptTerminationOpen(true)}
                >
                  <AlertTriangle className="h-4 w-4" />
                  {session?.role === "EXPERT"
                    ? "Boi thuong hop dong"
                    : "Huy hop dong dot ngot"}
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
                <Badge tone="amber">Dang cho Expert phan hoi</Badge>
                <Badge tone="slate">Tien chua duoc hoan</Badge>
              </div>
              <h2 className="mt-3 font-display text-lg font-extrabold text-ink">
                Business da yeu cau huy contract
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Expert co 3 ngay de phan hoi. Neu Expert khong phan hoi, he
                thong se tu dong huy contract va refund cac milestone chua hoan
                thanh cho Business. Neu Expert khong dong y, Expert co the yeu
                cau staff ho tro xu ly.
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
                  Dong y huy
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
                  Yeu cau staff ho tro
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {activeTerminationRequest && !awaitingExpertTerminationResponse && (
        <Notice tone="warning" title="Yeu cau huy contract dang duoc xu ly">
          Tien dang duoc tam giu va contract tam khoa thao tac. Staff/admin se
          xem xet yeu cau huy nay truoc khi quyet dinh refund hoac cho contract
          tiep tuc.
        </Notice>
      )}

      {awaitingBusinessDecision && (
        <Card className="border-amber-200 bg-amber-50/70 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="amber">{contractStatusLabel(contract.status)}</Badge>
                <Badge tone="slate">Contract tam khoa thao tac</Badge>
              </div>
              <h2 className="mt-3 font-display text-lg font-extrabold text-ink">
                Tranh chap da duoc xu ly. Business can quyet dinh buoc tiep theo.
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Neu tiep tuc, contract duoc mo lai de lam cac milestone con lai.
                Neu huy, he thong se huy toan bo milestone chua hoan thanh va
                refund milestone nao dang giu escrow ve vi Business.
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
                  Tiep tuc du an
                </Button>
                <Button
                  variant="danger"
                  loading={actionLoading === "post-dispute:cancel"}
                  onClick={() => decideAfterDispute("cancel")}
                >
                  <XCircle className="h-4 w-4" />
                  Huy contract va refund
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {allDone && (
        <Notice
          tone="success"
          title="Tất cả milestone đã hoàn tất nghiệm thu."
        >
          Business có thể thực hiện final product handover/review ở các màn
          contract và review liên quan.
        </Notice>
      )}

      <div className="grid gap-3 md:grid-cols-4">
        <FlowStep
          icon={<WalletCards className="h-4 w-4" />}
          title="Ký quỹ mốc"
          description={`${counts.pending} milestone đang chờ Business ký quỹ escrow.`}
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
          title="Business nghiệm thu"
          description={`${counts.review} milestone đang chờ nghiệm thu.`}
          active={counts.review > 0}
        />
        <FlowStep
          icon={<Gavel className="h-4 w-4" />}
          title="Dispute"
          description={`${counts.disputed} milestone đang ở trạng thái tranh chấp.`}
          active={counts.disputed > 0}
        />
      </div>

      <div className="grid gap-4">
        {milestones.map((milestone) => {
          const sourceMilestoneId = getSourceMilestoneId(milestone);
          const status = normalizeStatus(milestone.status);
          const milestoneDeliverables = sourceMilestoneId
            ? deliverablesByMilestone[sourceMilestoneId] || []
            : [];
          const milestoneReports = sourceMilestoneId
            ? progressReportsByMilestone[sourceMilestoneId] || []
            : [];
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
            (item) => Number(item.orderIndex) === Number(milestone.orderIndex) + 1,
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
            session?.role === "EXPERT" &&
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
            session?.role === "EXPERT" &&
            DISPUTABLE_STATUSES.has(status) &&
            (!currentDispute ||
              normalizeStatus(currentDispute.status) === "PENDING_SELF_RESOLVE");
          const isExpanded = sourceMilestoneId
            ? expandedMilestones[sourceMilestoneId] ?? isActiveMilestoneStatus(status)
            : true;
          const hintLine = workspaceHintLine(session?.role, status, currentDispute);

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
                    <Badge tone="slate">{milestone.milestoneName}</Badge>
                  </div>
                  <h3 className="mt-3 font-display text-xl font-extrabold text-ink">
                    {milestone.milestoneName}
                  </h3>
                  {milestone.description && (
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                      {milestone.description}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2 text-sm font-bold text-slate-500">
                    <span>Ngân sách mốc: {formatCurrency(getMilestoneBudget(milestone))}</span>
                    <span>Thời gian: {milestoneDurationLabel(milestone)}</span>
                    {milestone.updatedAt && (
                      <span>Cập nhật: {formatDateTime(milestone.updatedAt)}</span>
                    )}
                    {milestone.dueAt && (
                      <span>Hạn nộp: {formatDateTime(milestone.dueAt)}</span>
                    )}
                    {milestone.reviewDueAt && (
                      <span>Hạn nghiệm thu: {formatDateTime(milestone.reviewDueAt)}</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
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
                      {isExpanded ? "Thu gon" : "Mo chi tiet"}
                    </Button>
                  )}
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
                          "Đã ký quỹ milestone. Expert cần bấm bắt đầu mốc trước khi nộp progress report hoặc final product.",
                        )
                      }
                    >
                      <WalletCards className="h-4 w-4" />
                      Ký quỹ mốc này
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
                          "Đã bắt đầu milestone. Bạn có thể nộp progress report hoặc final product.",
                        )
                      }
                    >
                      <PlayCircle className="h-4 w-4" />
                      Bắt đầu mốc
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
                            ? "Da yeu cau Expert nop bao cao tien do trong 24h."
                            : "Da yeu cau Expert nop lai bao cao tien do trong 12h.",
                        )
                      }
                    >
                      <Send className="h-4 w-4" />
                      Yeu cau bao cao tien do
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
                          Nộp progress report
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
                        Nộp final product
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
                          `Đã mở mốc ${nextMilestone?.orderIndex}. Expert có thể tiếp tục công việc.`,
                        );
                      }}
                    >
                      <ArrowRight className="h-4 w-4" />
                      Mở mốc tiếp theo
                    </Button>
                  )}
                  {canDispute && (
                    <Button
                      size="sm"
                      variant="danger"
                      loading={isLoading("dispute")}
                      onClick={() => setDisputeOpen(milestone)}
                    >
                      <Gavel className="h-4 w-4" />
                      Yêu cầu staff can thiệp
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
                        ? "Qua han nop bao cao tien do"
                        : "Business da yeu cau bao cao tien do"
                    }
                  >
                    {milestone.progressReportRequestOverdue
                      ? "Expert chua nop bao cao tien do dung han. Business co quyen huy ngang hop dong."
                      : `Expert can nop bao cao tien do truoc ${formatDateTime(milestone.progressReportDueAt)}.`}
                  </Notice>
                </div>
              )}

              {status === "PENDING" && session?.role === "EXPERT" && (
                <div className="mt-4">
                  <Notice
                    tone="warning"
                    title="Cột mốc chưa sẵn sàng để Expert nộp sản phẩm."
                  >
                    Business cần ký quỹ cột mốc này trước, sau đó Expert mới có
                    thể bắt đầu công việc.
                  </Notice>
                </div>
              )}
              {status === "OVERDUE" && (
                <div className="mt-4">
                  <Notice
                    tone="warning"
                    title="Cột mốc đã quá hạn nộp final product."
                  >
                    Expert vẫn có thể nộp final product muộn để Business kiểm
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
                      Progress report / Deliverables
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
                            Bao cao tien do lan {reportIndex + 1}
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
                            Ban nop final product lan {deliverableIndex + 1}
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
                        {item.rejectionFeedback && (
                          <div className="mt-3">
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
                              Xem chi tiet feedback
                            </Button>
                          </div>
                        )}
                        {session?.role === "BUSINESS" &&
                          latestDeliverable?.deliverableId === item.deliverableId &&
                          canReview && (
                            <div className="mt-3 flex flex-wrap gap-2">
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
                                Reject bản nộp này
                              </Button>
                            </div>
                          )}
                      </div>
                    ))}
                    {milestoneReports.length === 0 &&
                      milestoneDeliverables.length === 0 && (
                      <p className="rounded-xl border border-dashed border-slate-200 bg-white p-3 text-sm font-semibold text-slate-400">
                        Chưa có progress report hoặc deliverable cho milestone
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
                  Milestone dang duoc thu gon. Mo chi tiet de xem DoD, progress report, final product va cac action hien co.
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
            ? "Nộp final product"
            : "Nộp progress report"
        }
        description={
          deliverableForm.type === "FINAL"
            ? "Final product sẽ được gửi cho Business kiểm tra và nghiệm thu."
            : "Progress report chỉ dùng để cập nhật tiến độ, không mở bước nghiệm thu hay reject."
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
            <p className="text-sm font-extrabold text-ink">Structured feedback panel</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <Field label="Category">
                <div className="flex flex-wrap gap-2">
                  {["Core Logic", "UI/UX", "Security", "Performance"].map((category) => (
                    <Button
                      key={category}
                      type="button"
                      size="sm"
                      variant={progressFeedbackForm.category === category ? "primary" : "secondary"}
                      onClick={() =>
                        setProgressFeedbackForm((value) => ({
                          ...value,
                          category,
                        }))
                      }
                    >
                      {category}
                    </Button>
                  ))}
                </div>
              </Field>
              <Field label="Severity">
                <div className="flex flex-wrap gap-2">
                  {["Low", "Medium", "High", "Critical"].map((severity) => (
                    <Button
                      key={severity}
                      type="button"
                      size="sm"
                      variant={progressFeedbackForm.severity === severity ? "primary" : "secondary"}
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
                  criteriaByMilestone[getSourceMilestoneId(progressFeedbackOpen.milestone) || -1] || []
                ).map((item) => (
                  <label
                    key={item.criteriaId}
                    className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3 text-sm font-semibold text-slate-600"
                  >
                    <input
                      type="checkbox"
                      checked={progressFeedbackForm.dodChecklist.includes(item.description)}
                      onChange={(event) =>
                        setProgressFeedbackForm((value) => ({
                          ...value,
                          dodChecklist: event.target.checked
                            ? [...value.dodChecklist, item.description]
                            : value.dodChecklist.filter((entry) => entry !== item.description),
                        }))
                      }
                    />
                    <span>{item.description}</span>
                  </label>
                ))}
                {(criteriaByMilestone[getSourceMilestoneId(progressFeedbackOpen.milestone) || -1] || []).length === 0 && (
                  <p className="rounded-2xl bg-slate-50 p-3 text-sm font-semibold text-slate-400">
                    Milestone này chưa có DoD checklist riêng.
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
            Yêu cầu Expert điều chỉnh ở báo cáo tiếp theo
          </label>
        </div>
      </Modal>

      <Modal
        open={Boolean(progressFeedbackDetail)}
        onClose={() => setProgressFeedbackDetail(null)}
        title="Phản hồi của Business"
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
              <Badge tone={progressFeedbackDetail.requiresAdjustment ? "amber" : "mint"}>
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
        title="Chi tiet feedback"
        footer={
          <Button
            variant="secondary"
            onClick={() => setDeliverableFeedbackDetail(null)}
          >
            Dong
          </Button>
        }
      >
        {deliverableFeedbackDetail && (
          <div className="grid gap-3 text-sm text-slate-600">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="amber">Da feedback</Badge>
              <Badge tone="slate">
                {deliverableFeedbackDetail.milestoneName}
              </Badge>
              <Badge tone="brand">
                Lan nop {deliverableFeedbackDetail.attemptNumber}
              </Badge>
              {deliverableFeedbackDetail.deliverable.rejectedAt && (
                <span className="text-xs font-bold text-slate-400">
                  {formatDateTime(deliverableFeedbackDetail.deliverable.rejectedAt)}
                </span>
              )}
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                Noi dung feedback
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
        title="Reject final product"
        description="Feedback này sẽ được gửi cho Expert để chỉnh sửa và nộp lại final product."
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
              Reject & gửi feedback
            </Button>
          </>
        }
      >
        <Field label="Feedback cho final product">
          <Textarea
            value={feedbackReason}
            onChange={(event) => {
              setFeedbackReason(event.target.value);
              if (event.target.value.trim()) setFeedbackRequired(false);
            }}
            placeholder="Vui long nhap feedback de Expert biet can chinh gi..."
            className={feedbackRequired ? "border-amber-300 bg-amber-50/40" : undefined}
          />
          {feedbackRequired && (
            <p className="mt-2 text-sm font-bold text-amber-700">
              Vui long nhap feedback de Expert biet can chinh gi.
            </p>
          )}
        </Field>
      </Modal>

      <Modal
        open={Boolean(disputeOpen)}
        onClose={() => setDisputeOpen(null)}
        title="Yêu cầu hỗ trợ xử lý tranh chấp"
        description="Gửi yêu cầu để bộ phận phụ trách xem xét khi hai bên không thống nhất."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDisputeOpen(null)}>
              Hủy
            </Button>
            <Button
              variant="danger"
              onClick={escalateDispute}
              loading={
                disputeOpen
                  ? actionLoading ===
                    `dispute:${getSourceMilestoneId(disputeOpen)}`
                  : false
              }
            >
              <Gavel className="h-4 w-4" />
              Gửi yêu cầu
            </Button>
          </>
        }
      >
        <Field label="Lý do cần hỗ trợ">
          <Textarea
            value={disputeReason}
            onChange={(event) => setDisputeReason(event.target.value)}
            placeholder="Tóm tắt điểm hai bên không thống nhất..."
          />
        </Field>
      </Modal>

      <Modal
        open={abruptTerminationOpen}
        onClose={() => setAbruptTerminationOpen(false)}
        title={
          session?.role === "EXPERT"
            ? "Boi thuong hop dong"
            : "Huy hop dong dot ngot"
        }
        description={
          session?.role === "EXPERT"
            ? `He thong se khau tru ${formatCurrency(abruptTerminationPenalty)} tu vi cua ban de boi thuong cho Business.`
            : `Hanh dong nay se chuyen ${formatCurrency(abruptTerminationPenalty)} tu tien coc sang vi Expert de den bu ngay cong.`
        }
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setAbruptTerminationOpen(false)}
            >
              Huy
            </Button>
            <Button
              variant="danger"
              onClick={submitAbruptTermination}
              loading={actionLoading === "abrupt-termination"}
            >
              <AlertTriangle className="h-4 w-4" />
              Xac nhan
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Notice
            tone="warning"
            title={
              session?.role === "EXPERT"
                ? "Ban se bi tru 10% gia tri du an."
                : "Ban se mat 10% gia tri du an."
            }
          >
            {session?.role === "EXPERT"
              ? "Neu vi khong du so du kha dung, he thong se tu choi thao tac nay."
              : "Neu hop dong da tung co san pham bi reject, Business phai dung luong yeu cau cham dut de staff/admin phan xu."}
          </Notice>
          <Field label="Ly do">
            <Textarea
              value={abruptTerminationReason}
              onChange={(event) => setAbruptTerminationReason(event.target.value)}
              placeholder="Nhap ly do huy ngang hop dong..."
            />
          </Field>
        </div>
      </Modal>

    </div>
  );
}

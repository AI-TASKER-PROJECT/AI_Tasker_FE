import {
  AlertTriangle,
  CheckCircle2,
  Gavel,
  Send,
  UploadCloud,
  ArrowRight,
  CheckCircle2,
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
import {
  canBusinessRequestStaffIntervention,
  canExpertInitiateDispute,
  canExpertResubmitDeliverable,
  canInitiatorCancelDispute,
  isActiveDisputeStatus,
  translateDisputeInitiationType,
  translateDisputeStatus,
} from "../../../lib/dispute";
import { useSession } from "../../../lib/session";
import { formatCurrency, formatDateTime } from "../../../lib/utils";
import type {
  AcceptanceCriteria,
  Contract,
  Deliverable,
  Dispute,
  DisputeInitiationType,
  Milestone,
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
  Select,
  StatusBadge,
  Textarea,
} from "../../../components/ui";
import {
  canBackendReviewMilestone,
  getContractMilestoneId,
  getMilestoneBudget,
  getMilestoneDurationLabel,
  getSourceMilestoneId,
  translateContractStatus,
} from "../ContractPages.shared";

type NoticeState = {
  tone: "success" | "danger" | "info" | "warning";
  title: string;
};

type SubmitAction =
  | "submit-deliverable"
  | "approve-milestone"
  | "reject-milestone"
  | "initiate-dispute"
  | "request-intervention"
  | "cancel-dispute";

const expertInitiationTypes: Array<{
  value: DisputeInitiationType;
  label: string;
}> = [
  {
    value: "EXPERT_SCOPE_CONCERN",
    label: translateDisputeInitiationType("EXPERT_SCOPE_CONCERN") || "",
  },
  {
    value: "EXPERT_NO_REVIEW_RESPONSE",
    label: translateDisputeInitiationType("EXPERT_NO_REVIEW_RESPONSE") || "",
  },
  {
    value: "EXPERT_BAD_FAITH_REJECTION",
    label: translateDisputeInitiationType("EXPERT_BAD_FAITH_REJECTION") || "",
  },
  { value: "OTHER", label: translateDisputeInitiationType("OTHER") || "" },
];
  getContractMilestoneId,
  getMilestoneBudget,
  getSourceMilestoneId,
} from "../ContractPages.shared";

type NoticeTone = "success" | "danger" | "info" | "warning";

const REVIEWABLE_STATUSES = new Set(["UNDER_REVIEW"]);
const SUBMITTABLE_STATUSES = new Set(["IN_PROGRESS", "DISPUTED"]);
const PROGRESS_REPORT_STATUSES = new Set(["IN_PROGRESS"]);
const DEPOSITABLE_STATUSES = new Set(["PENDING"]);
const DISPUTABLE_STATUSES = new Set(["IN_PROGRESS", "UNDER_REVIEW", "DISPUTED"]);

function normalizeStatus(status?: string) {
  return (status || "").trim().replace(/[\s-]+/g, "_").toUpperCase();
}

function milestoneStatusLabel(status?: string) {
  const normalized = normalizeStatus(status);
  const labels: Record<string, string> = {
    PENDING: "Chờ mở mốc",
    DEPOSITED: "Sẵn sàng làm việc",
    IN_PROGRESS: "Đang thực hiện",
    UNDER_REVIEW: "Chờ nghiệm thu",
    DISPUTED: "Đang tranh chấp",
    COMPLETED: "Hoàn thành",
  };
  return labels[normalized] || status || "Chưa có trạng thái";
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
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [criteriaByMilestone, setCriteriaByMilestone] = useState<
    Record<number, AcceptanceCriteria[]>
  >({});
  const [deliverablesByMilestone, setDeliverablesByMilestone] = useState<
    Record<number, Deliverable[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [deliverableOpen, setDeliverableOpen] = useState<Milestone | null>(
    null,
  );
  const [rejectOpen, setRejectOpen] = useState<Milestone | null>(null);
  const [expertDisputeOpen, setExpertDisputeOpen] =
    useState<Milestone | null>(null);
  const [interventionOpen, setInterventionOpen] = useState<Dispute | null>(
    null,
  );
  const [cancelOpen, setCancelOpen] = useState<Dispute | null>(null);
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
  const [disputeOpen, setDisputeOpen] = useState<Milestone | null>(null);
  const [terminationOpen, setTerminationOpen] = useState<Milestone | null>(
    null,
  );
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deliverableForm, setDeliverableForm] = useState({
    type: "PROCESS",
    sourceCodeUrl: "",
    demoLink: "",
    submissionNotes: "",
    percentComplete: "50",
  });
  const [rejectReason, setRejectReason] = useState("");
  const [expertDisputeForm, setExpertDisputeForm] = useState<{
    initiationType: DisputeInitiationType;
  }>({
    initiationType: "EXPERT_SCOPE_CONCERN",
  });
  const [interventionForm, setInterventionForm] = useState({
    reason: "",
    evidenceFile: "",
  });
  const [cancelReason, setCancelReason] = useState("");
  const [submitting, setSubmitting] = useState<SubmitAction | null>(null);
  const [workspaceNotice, setWorkspaceNotice] = useState<NoticeState | null>(
    null,
  );
  const [milestoneNotices, setMilestoneNotices] = useState<
    Record<number, NoticeState>
  >({});

  const contractNumber = Number(contractId);

  const loadWorkspace = useCallback(async () => {
    if (!Number.isFinite(contractNumber) || contractNumber <= 0) {
      setContract(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError("");
    try {
      const [contractDetail, milestoneItems, disputeItems] = await Promise.all([
        contractApi.getContract(contractNumber),
        contractApi.listMilestones(contractNumber),
        disputeApi.listByContract(contractNumber),
      ]);
      setContract(contractDetail);
      setMilestones(milestoneItems);
      setDisputes(disputeItems);
    } catch (error) {
      setLoadError(getApiErrorMessage(error));
      setContract(null);
      setMilestones([]);
      setDisputes([]);
    } finally {
      setLoading(false);
    }
  }, [contractNumber]);

  useEffect(() => {
    const run = async () => {
      await loadWorkspace();
    };
    void run();
  const [feedbackReason, setFeedbackReason] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [terminationReason, setTerminationReason] = useState(
    "Milestone đã quá thời hạn nhưng chưa có sản phẩm đạt yêu cầu.",
  );
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

  const disputesByMilestone = useMemo(() => {
    return disputes.reduce<Record<number, Dispute[]>>((groups, dispute) => {
      if (!dispute.milestoneId) return groups;
      groups[dispute.milestoneId] = [
        ...(groups[dispute.milestoneId] || []),
        dispute,
      ];
      return groups;
    }, {});
  }, [disputes]);

  const refreshAfterAction = async (milestoneId?: number) => {
    await loadWorkspace();
    if (milestoneId) {
      const deliverables = await contractApi.listDeliverables(milestoneId);
      setDeliverablesByMilestone((current) => ({
        ...current,
        [milestoneId]: deliverables,
      }));
    }
  };

  const setMilestoneNotice = (
    milestoneId: number,
    notice: NoticeState,
  ) => {
    setMilestoneNotices((current) => ({ ...current, [milestoneId]: notice }));
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
        return summary;
      },
      { done: 0, review: 0, disputed: 0, pending: 0, ready: 0, working: 0 },
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
        title: "Không xác định được milestone để nộp sản phẩm bàn giao.",
      });
      return;
    }
    setSubmitting("submit-deliverable");
    setWorkspaceNotice(null);
    try {
      await contractApi.submitDeliverable({
        milestoneId: sourceMilestoneId,
        ...deliverableForm,
      });

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
          attachmentUrl:
            deliverableForm.demoLink || deliverableForm.sourceCodeUrl || undefined,
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
      await refreshAfterAction(sourceMilestoneId);
      setMilestoneNotice(sourceMilestoneId, {
        tone: "success",
        title: "Đã nộp sản phẩm bàn giao. Trạng thái mới lấy từ backend.",
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
      await refreshAfterAction(sourceMilestoneId);
    } finally {
      setSubmitting(null);
    }
  };

  const approveMilestone = async (milestone: Milestone) => {
    const sourceMilestoneId = getSourceMilestoneId(milestone);
    if (!sourceMilestoneId) return;
    setSubmitting("approve-milestone");
    try {
      await contractApi.approveMilestone(sourceMilestoneId);
      await refreshAfterAction(sourceMilestoneId);
      setMilestoneNotice(sourceMilestoneId, {
        tone: "success",
        title: `Đã nghiệm thu ${milestone.milestoneName}.`,
      });
    } catch (error) {
      setMilestoneNotice(sourceMilestoneId, {
        tone: "danger",
        title: getApiErrorMessage(error),
    } finally {
      setActionLoading(null);
    }
  };

  const rejectWithFeedback = async () => {
    if (!feedbackOpen) return;
    const reason = feedbackReason.trim();
    if (!reason) {
      setWorkspaceNotice({
        tone: "warning",
        title: "Vui lòng nhập feedback để Expert biết cần chỉnh gì.",
      });
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
    setFeedbackOpen(null);
  };

  const escalateDispute = async () => {
    if (!disputeOpen || !contract) return;
    const sourceMilestoneId = getSourceMilestoneId(disputeOpen);
    if (!sourceMilestoneId) {
      setWorkspaceNotice({
        tone: "danger",
        title: "Không xác định được milestone gốc để tạo tranh chấp.",
      });
      await refreshAfterAction(sourceMilestoneId);
    } finally {
      setSubmitting(null);
    }
  };

  const rejectMilestone = async () => {
    if (!rejectOpen) return;
    const sourceMilestoneId = getSourceMilestoneId(rejectOpen);
    if (!sourceMilestoneId) return;
    setSubmitting("reject-milestone");
    try {
      await contractApi.rejectMilestone(sourceMilestoneId, rejectReason);
      setRejectOpen(null);
      setRejectReason("");
      await refreshAfterAction(sourceMilestoneId);
      setMilestoneNotice(sourceMilestoneId, {
        tone: "success",
        title:
          "Đã từ chối sản phẩm bàn giao. Dispute được backend tạo hoặc cập nhật.",
      });
    const reason = disputeReason.trim() || "Hai bên không thống nhất về kết quả milestone.";
    setActionLoading(`dispute:${sourceMilestoneId}`);
    try {
      const existing = disputesByMilestone[sourceMilestoneId];
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
        title: "Đã gửi yêu cầu hỗ trợ xử lý tranh chấp.",
        message:
          "Yêu cầu đã được chuyển đến bộ phận phụ trách để xem xét.",
      });
      setDisputeReason("");
      setDisputeOpen(null);
    } catch (error) {
      setMilestoneNotice(sourceMilestoneId, {
        tone: "danger",
        title: getApiErrorMessage(error),
      });
      await refreshAfterAction(sourceMilestoneId);
    } finally {
      setSubmitting(null);
    }
  };

  const initiateExpertDispute = async () => {
    if (!expertDisputeOpen || !contract) return;
    const sourceMilestoneId = getSourceMilestoneId(expertDisputeOpen);
    if (!sourceMilestoneId) return;
    setSubmitting("initiate-dispute");
    try {
      await disputeApi.initiateExpertDispute({
        contractId: contract.contractId,
        milestoneId: sourceMilestoneId,
        initiatedBy: "EXPERT",
        initiationType: expertDisputeForm.initiationType,
      });
      setExpertDisputeOpen(null);
      setExpertDisputeForm({
        initiationType: "EXPERT_SCOPE_CONCERN",
      });
      await refreshAfterAction(sourceMilestoneId);
      setMilestoneNotice(sourceMilestoneId, {
        tone: "success",
        title: "Đã tạo dispute theo phản hồi từ backend.",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const requestOverdueTermination = async () => {
    if (!terminationOpen || !contract) return;
    const sourceMilestoneId = getSourceMilestoneId(terminationOpen);
    if (!sourceMilestoneId) {
      setWorkspaceNotice({
        tone: "danger",
        title: "Không xác định được milestone hiện tại để yêu cầu hủy.",
      });
      return;
    }
    setActionLoading(`terminate:${sourceMilestoneId}`);
    try {
      await contractApi.requestTermination(contract.contractId, {
        currentMilestoneId: sourceMilestoneId,
        requestReason: terminationReason.trim() || "Milestone quá thời hạn.",
      });
      await refreshAfterAction();
      setMilestoneNotice(sourceMilestoneId, {
        tone: "success",
        title: "Đã gửi yêu cầu hủy hợp đồng.",
        message: "Yêu cầu đang chờ bộ phận phụ trách xem xét.",
      });
      setTerminationOpen(null);
    } catch (error) {
      setMilestoneNotice(sourceMilestoneId, {
        tone: "danger",
        title: getApiErrorMessage(error),
      });
      await refreshAfterAction(sourceMilestoneId);
    } finally {
      setSubmitting(null);
    }
  };

  const requestStaffIntervention = async () => {
    if (!interventionOpen) return;
    setSubmitting("request-intervention");
    try {
      await disputeApi.requestStaffIntervention(interventionOpen.disputeId, {
        reason: interventionForm.reason,
        evidenceFile: interventionForm.evidenceFile,
      });
      setInterventionOpen(null);
      setInterventionForm({ reason: "", evidenceFile: "" });
      await refreshAfterAction(interventionOpen.milestoneId);
    } catch (error) {
      setWorkspaceNotice({ tone: "danger", title: getApiErrorMessage(error) });
      await refreshAfterAction(interventionOpen.milestoneId);
    } finally {
      setSubmitting(null);
    }
  };

  const cancelDispute = async () => {
    if (!cancelOpen) return;
    setSubmitting("cancel-dispute");
    try {
      await disputeApi.cancel(cancelOpen.disputeId, { reason: cancelReason });
      setCancelOpen(null);
      setCancelReason("");
      await refreshAfterAction(cancelOpen.milestoneId);
    } catch (error) {
      setWorkspaceNotice({ tone: "danger", title: getApiErrorMessage(error) });
      await refreshAfterAction(cancelOpen.milestoneId);
    } finally {
      setSubmitting(null);
    }
  };

  if (loading) {
    return (
      <EmptyState
        title="Đang tải workspace"
        description="Đang lấy contract, milestone và dispute từ backend."
      />
    );
  }

    } finally {
      setActionLoading(null);
    }
  };

  if (!contract) {
    return (
      <EmptyState
        title="Không tìm thấy workspace"
        description={loadError || "Dữ liệu workspace được lấy trực tiếp từ backend."}
      />
    );
  }

        description="Không thể tải dữ liệu làm việc của hợp đồng này."
      />
    );
  }

  const allDone =
    milestones.length > 0 && counts.done === milestones.length;
  const hasActiveTermination = terminationRequests.some((request) =>
    !["COMPLETED", "CANCELLED", "STAFF_REJECTED"].includes(
      normalizeStatus(request.status),
    ),
  );
  const deliverableOpenStatus = normalizeStatus(deliverableOpen?.status);
  const canOpenProgressReport =
    deliverableOpen !== null && PROGRESS_REPORT_STATUSES.has(deliverableOpenStatus);
  const canOpenFinalProduct =
    deliverableOpen !== null && SUBMITTABLE_STATUSES.has(deliverableOpenStatus);

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          title={`Workspace: ${
            contract.contractTitle ||
            contract.title ||
            "Hợp đồng đang thực hiện"
          }`}
          description="Theo dõi milestone, sản phẩm bàn giao và tranh chấp từ backend."
          description="Business ký quỹ từng cột mốc, Expert nộp báo cáo tiến độ hoặc final product, Business nghiệm thu hoặc yêu cầu chỉnh sửa final product."
          actions={
            <div className="flex flex-wrap gap-2">
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
          description={`${counts.ready} milestone chờ Expert bắt đầu, ${counts.working} milestone đang làm.`}
          active={counts.ready > 0 || counts.working > 0}
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
          const milestoneDisputes = sourceMilestoneId
            ? disputesByMilestone[sourceMilestoneId] || []
            : [];
          const activeDispute = milestoneDisputes.find((dispute) =>
            isActiveDisputeStatus(dispute.status),
          );
          const latestDispute = activeDispute || milestoneDisputes[0];
          const milestoneNotice = sourceMilestoneId
            ? milestoneNotices[sourceMilestoneId]
            : null;
          const role = session?.role;
          const reviewableByBackend = canBackendReviewMilestone(
            milestone.status,
          );
          const canApprove =
            role === "BUSINESS" &&
            milestoneDeliverables.length > 0 &&
            reviewableByBackend;
          const canReject =
            role === "BUSINESS" &&
            milestoneDeliverables.length > 0 &&
            reviewableByBackend;
          const canSubmitNormal =
            role === "EXPERT" && milestone.status === "IN_PROGRESS";
          const canResubmit =
            activeDispute &&
            canExpertResubmitDeliverable(
              role,
              activeDispute.status,
              milestone.status,
            );
          const canInitiate =
            !activeDispute &&
            canExpertInitiateDispute(role, milestone.status) &&
            Boolean(sourceMilestoneId);
          const canRequestIntervention =
            activeDispute &&
            activeDispute.status === "PENDING_SELF_RESOLVE" &&
            (canBusinessRequestStaffIntervention(role, activeDispute.status) ||
              role === "EXPERT");
          const canCancel =
            activeDispute &&
            canInitiatorCancelDispute(
              role,
              activeDispute,
              session?.accountId,
            );
          const snapshotItems = criteriaSnapshotLines(milestone);
          const visibleCriteria =
            criteriaItems.length > 0
              ? criteriaItems.map((item) => item.description)
              : snapshotItems;
          const milestoneNotice = sourceMilestoneId
            ? milestoneNotices[sourceMilestoneId]
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
          const isLoading = (action: string) =>
            actionLoading === `${action}:${sourceMilestoneId}`;
          const canDeposit =
            session?.role === "BUSINESS" && DEPOSITABLE_STATUSES.has(status);
          const canStart =
            session?.role === "EXPERT" && status === "DEPOSITED";
          const canDepositNext =
            session?.role === "BUSINESS" &&
            status === "COMPLETED" &&
            nextMilestoneId &&
            DEPOSITABLE_STATUSES.has(normalizeStatus(nextMilestone?.status));
          const canSubmit =
            session?.role === "EXPERT" && SUBMITTABLE_STATUSES.has(status);
          const canSubmitProgress =
            session?.role === "EXPERT" && PROGRESS_REPORT_STATUSES.has(status);
          const canReview =
            session?.role === "BUSINESS" && REVIEWABLE_STATUSES.has(status);
          const canDispute =
            (session?.role === "BUSINESS" || session?.role === "EXPERT") &&
            DISPUTABLE_STATUSES.has(status);
          const canRequestTermination =
            (session?.role === "BUSINESS" || session?.role === "EXPERT") &&
            ["DEPOSITED", "IN_PROGRESS", "UNDER_REVIEW", "DISPUTED"].includes(
              status,
            ) &&
            !hasActiveTermination;

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
                    {sourceMilestoneId && (
                      <Badge tone="slate">Milestone #{sourceMilestoneId}</Badge>
                    )}
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
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(canSubmitNormal || canResubmit) && (
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
                        {status === "DISPUTED"
                          ? "Nộp lại final product"
                          : "Nộp final product"}
                      </Button>
                    </>
                  )}
                  {canReview && (
                    <>
                      <Button
                        size="sm"
                        variant="success"
                        loading={isLoading("approve")}
                        onClick={() =>
                          runMilestoneAction(
                            milestone,
                            "approve",
                            (sourceMilestoneId) =>
                              contractApi.approveMilestone(sourceMilestoneId),
                            "Đã nghiệm thu final product và giải ngân escrow cho Expert.",
                          )
                        }
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Nghiệm thu & giải ngân
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => setFeedbackOpen(milestone)}
                      >
                        <XCircle className="h-4 w-4" />
                        Reject final product
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
                      <UploadCloud className="h-4 w-4" />
                      {canResubmit ? "Nộp lại" : "Nộp sản phẩm"}
                    </Button>
                  )}
                  {role === "BUSINESS" && (
                    <>
                      <Button
                        size="sm"
                        variant="success"
                        disabled={!canApprove}
                        loading={submitting === "approve-milestone"}
                        onClick={() => approveMilestone(milestone)}
                      >
                        <CheckCircle2 className="h-4 w-4" /> Nghiệm thu
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={!canReject}
                        onClick={() => setRejectOpen(milestone)}
                      >
                        <XCircle className="h-4 w-4" /> Từ chối
                      </Button>
                    </>
                  )}
                  {canInitiate && (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => setExpertDisputeOpen(milestone)}
                    >
                      <Gavel className="h-4 w-4" /> Khiếu nại
                    </Button>
                  )}
                  {canRequestIntervention && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setInterventionOpen(activeDispute)}
                    >
                      <Send className="h-4 w-4" /> Yêu cầu Staff
                    </Button>
                  )}
                  {canCancel && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setCancelOpen(activeDispute)}
                    >
                      Rút dispute
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
                  {canRequestTermination && (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => setTerminationOpen(milestone)}
                    >
                      <AlertTriangle className="h-4 w-4" />
                      Yêu cầu hủy quá hạn
                    </Button>
                  )}
                </div>
              </div>

              {milestoneNotice && (
                <div className="mt-4">
                  <Notice
                    tone={milestoneNotice.tone}
                    title={milestoneNotice.title}
                  >
                    {milestoneNotice.message}
                  </Notice>
                </div>
              )}

              <DisputeSection dispute={latestDispute} />

              {role === "BUSINESS" && milestoneDeliverables.length === 0 && (
                <div className="mt-4">
                  <Notice
                    tone="info"
                    title="Chưa có sản phẩm bàn giao từ backend nên chưa thể nghiệm thu milestone này."
                  />
                </div>
              )}
              {role === "BUSINESS" &&
                milestoneDeliverables.length > 0 &&
                !reviewableByBackend && (
                  <div className="mt-4">
                    <Notice
                      tone="warning"
                      title={`Backend đang trả milestone ở trạng thái ${milestone.status}; cần trạng thái UNDER_REVIEW trước khi nghiệm thu hoặc từ chối.`}
                    />
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
              {currentDispute && (
                <div className="mt-4">
                  <Notice
                    tone="warning"
                    title={`Dispute #${currentDispute.disputeId} - ${currentDispute.status}`}
                  >
                    {currentDispute.evidenceReport ||
                      "Cột mốc đang có tranh chấp hoặc đang chờ hai bên tự xử lý."}
                  </Notice>
                </div>
              )}
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
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
                      Sản phẩm bàn giao
                    </p>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500">
                      {milestoneDeliverables.length} mục
                      Progress report / Deliverables
                    </p>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500">
                      {milestoneReports.length + milestoneDeliverables.length} lần nộp
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2">
                    {milestoneReports.map((item) => (
                      <div
                        key={`report-${item.progressReportId}`}
                        className="rounded-xl bg-white p-3 text-sm text-slate-600 shadow-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-bold text-ink">
                            Progress report #{item.progressReportId}
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            {item.checkpointType && (
                              <Badge tone="brand">{item.checkpointType}</Badge>
                            )}
                            {item.isLate && <Badge tone="amber">Nộp trễ</Badge>}
                            {item.createdAt && (
                              <span className="text-xs font-bold text-slate-400">
                                {formatDateTime(item.createdAt)}
                              </span>
                            )}
                          </div>
                        </div>
                        {typeof item.percentComplete === "number" && (
                          <p className="mt-2 text-xs font-bold text-slate-400">
                            Hoàn thành khoảng {item.percentComplete}%
                          </p>
                        )}
                        <p className="mt-2 whitespace-pre-wrap leading-6">
                          {item.content}
                        </p>
                        {item.attachmentUrl && (
                          <a
                            href={item.attachmentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-flex font-bold text-brand-600 hover:text-brand-700"
                          >
                            File đính kèm
                          </a>
                        )}
                      </div>
                    ))}
                    {milestoneDeliverables.map((item) => (
                      <div
                        key={item.deliverableId}
                        className="rounded-xl bg-white p-3 text-sm text-slate-600 shadow-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-bold text-ink">
                            Sản phẩm bàn giao
                            Final product #{item.deliverableId}
                          </p>
                          {item.createdAt && (
                            <span className="text-xs font-bold text-slate-400">
                              {formatDateTime(item.createdAt)}
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {item.sourceCodeUrl && (
                            <a
                              href={item.sourceCodeUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="font-bold text-brand-600 hover:text-brand-700"
                            >
                              Source code
                            </a>
                          )}
                          {item.demoLink && (
                            <a
                              href={item.demoLink}
                              target="_blank"
                              rel="noreferrer"
                              className="font-bold text-brand-600 hover:text-brand-700"
                            >
                              Demo
                            </a>
                          )}
                        </div>
                        {item.submissionNotes && (
                          <p className="mt-2 whitespace-pre-wrap leading-6">
                            {item.submissionNotes}
                          </p>
                        )}
                      </div>
                    ))}
                    {milestoneReports.length === 0 &&
                      milestoneDeliverables.length === 0 && (
                      <p className="rounded-xl border border-dashed border-slate-200 bg-white p-3 text-sm font-semibold text-slate-400">
                        Backend chưa có sản phẩm bàn giao cho milestone này.
                        Chưa có progress report hoặc deliverable cho milestone
                        này.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Modal
        open={Boolean(deliverableOpen)}
        onClose={() => setDeliverableOpen(null)}
        title="Nộp sản phẩm bàn giao"
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
              disabled={Boolean(submitting)}
            >
              Hủy
            </Button>
            <Button
              onClick={submitDeliverable}
              loading={submitting === "submit-deliverable"}
              disabled={Boolean(submitting)}
            >
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
          {deliverableForm.type === "FINAL" && (
            <>
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
            </>
          )}
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
        open={Boolean(rejectOpen)}
        onClose={() => setRejectOpen(null)}
        title="Từ chối sản phẩm bàn giao"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setRejectOpen(null)}
              disabled={Boolean(submitting)}
            >
        open={Boolean(feedbackOpen)}
        onClose={() => setFeedbackOpen(null)}
        title="Reject final product"
        description="Feedback này sẽ được gửi cho Expert để chỉnh sửa và nộp lại final product."
        footer={
          <>
            <Button variant="secondary" onClick={() => setFeedbackOpen(null)}>
              Hủy
            </Button>
            <Button
              variant="danger"
              onClick={rejectMilestone}
              loading={submitting === "reject-milestone"}
              disabled={Boolean(submitting)}
            >
              Từ chối
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
        <Field label="Lý do từ chối">
          <Textarea
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
        <Field label="Feedback cho final product">
          <Textarea
            value={feedbackReason}
            onChange={(event) => setFeedbackReason(event.target.value)}
            placeholder="Ví dụ: final product chưa đáp ứng tiêu chí DoD, demo thiếu case..."
          />
        </Field>
      </Modal>

      <Modal
        open={Boolean(expertDisputeOpen)}
        onClose={() => setExpertDisputeOpen(null)}
        title="Expert tạo dispute"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setExpertDisputeOpen(null)}
              disabled={Boolean(submitting)}
            >
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
              onClick={initiateExpertDispute}
              loading={submitting === "initiate-dispute"}
              disabled={Boolean(submitting)}
            >
              Tạo dispute
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Field label="Loại tranh chấp">
            <Select
              value={expertDisputeForm.initiationType}
              onChange={(event) =>
                setExpertDisputeForm((value) => ({
                  ...value,
                  initiationType: event.target.value as DisputeInitiationType,
                }))
              }
            >
              {expertInitiationTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Modal>

      <Modal
        open={Boolean(interventionOpen)}
        onClose={() => setInterventionOpen(null)}
        title="Yêu cầu Staff can thiệp"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setInterventionOpen(null)}
              disabled={Boolean(submitting)}
            >
              Hủy
            </Button>
            <Button
              onClick={requestStaffIntervention}
              loading={submitting === "request-intervention"}
              disabled={Boolean(submitting)}
            >
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
        <div className="grid gap-4">
          <Field label="Lý do cần Staff can thiệp">
            <Textarea
              value={interventionForm.reason}
              onChange={(event) =>
                setInterventionForm((value) => ({
                  ...value,
                  reason: event.target.value,
                }))
              }
            />
          </Field>
          <Field label="Evidence/file URL">
            <Input
              value={interventionForm.evidenceFile}
              onChange={(event) =>
                setInterventionForm((value) => ({
                  ...value,
                  evidenceFile: event.target.value,
                }))
              }
            />
          </Field>
        </div>
      </Modal>

      <Modal
        open={Boolean(cancelOpen)}
        onClose={() => setCancelOpen(null)}
        title="Rút dispute"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setCancelOpen(null)}
              disabled={Boolean(submitting)}
            >
              Không
            </Button>
            <Button
              variant="danger"
              onClick={cancelDispute}
              loading={submitting === "cancel-dispute"}
              disabled={Boolean(submitting)}
            >
              Xác nhận rút
        <Field label="Lý do cần hỗ trợ">
          <Textarea
            value={disputeReason}
            onChange={(event) => setDisputeReason(event.target.value)}
            placeholder="Tóm tắt điểm hai bên không thống nhất..."
          />
        </Field>
      </Modal>

      <Modal
        open={Boolean(terminationOpen)}
        onClose={() => setTerminationOpen(null)}
        title="Yêu cầu hủy hợp đồng do quá hạn"
        description="Yêu cầu sẽ được chuyển đến bộ phận phụ trách để xem xét và quyết định hướng xử lý."
        footer={
          <>
            <Button variant="secondary" onClick={() => setTerminationOpen(null)}>
              Hủy
            </Button>
            <Button
              variant="danger"
              onClick={requestOverdueTermination}
              loading={
                terminationOpen
                  ? actionLoading ===
                    `terminate:${getSourceMilestoneId(terminationOpen)}`
                  : false
              }
            >
              <AlertTriangle className="h-4 w-4" />
              Gửi yêu cầu
            </Button>
          </>
        }
      >
        <Notice tone="warning" title="Xác nhận rút dispute">
          Dispute chỉ có thể rút trước khi Staff bắt đầu xem xét.
        </Notice>
        <Field label="Lý do rút" className="mt-4">
          <Textarea
            value={cancelReason}
            onChange={(event) => setCancelReason(event.target.value)}
          />
        </Field>
      </Modal>
    </div>
  );
}

function DisputeSection({ dispute }: { dispute?: Dispute }) {
  if (!dispute) {
    return (
      <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-extrabold text-ink">Tranh chấp</p>
        <p className="mt-1 text-sm text-slate-500">
          Chưa có dispute nào cho milestone này.
        </p>
      </div>
    );
  }

  const reason =
    dispute.evidenceReport ||
    dispute.escalationReason ||
    dispute.staffDecisionNote ||
    dispute.cancellationReason;
  const evidenceFile = dispute.escalationEvidenceFile;
  const isResolved = dispute.status === "RESOLVED";
  const isStaffDecided = dispute.status === "STAFF_DECIDED";

  return (
    <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-2xl bg-white text-amber-700 shadow-sm">
          <AlertTriangle className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-ink">Tranh chấp</p>
          <p className="text-xs font-bold text-amber-800">
            {translateDisputeStatus(dispute.status)}
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 text-sm text-slate-700 md:grid-cols-2">
        <InfoLine
          label="Người khởi tạo"
          value={friendlyInitiator(dispute.initiatedBy)}
        />
        <InfoLine
          label="Loại tranh chấp"
          value={translateDisputeInitiationType(dispute.initiationType)}
        />
        <InfoLine label="Lý do" value={reason} wide />
        {evidenceFile && (
          <div className="md:col-span-2">
            <p className="text-xs font-bold text-slate-400">Evidence/file</p>
            <a
              href={evidenceFile}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex break-all text-sm font-bold text-brand-600 hover:text-brand-700"
            >
              Mở file bằng chứng
            </a>
          </div>
        )}
      </div>
      {isResolved && (
        <div className="mt-4 rounded-2xl bg-white p-4">
          <p className="text-sm font-extrabold text-ink">Kết quả settlement</p>
          <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
            <InfoLine
              label="Tỷ lệ Expert"
              value={
                dispute.staffDecisionPercentage !== undefined
                  ? `${dispute.staffDecisionPercentage}%`
                  : undefined
              }
            />
            <InfoLine
              label="Expert nhận"
              value={
                dispute.staffProposedExpertAmount !== undefined
                  ? formatCurrency(dispute.staffProposedExpertAmount)
                  : undefined
              }
            />
            <InfoLine
              label="Business hoàn"
              value={
                dispute.businessRefundAmount !== undefined
                  ? formatCurrency(dispute.businessRefundAmount)
                  : undefined
              }
            />
          </div>
          {dispute.staffReport && (
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {dispute.staffReport}
            </p>
          )}
        </div>
      )}
      {isStaffDecided && (
        <Notice
          tone="info"
          title="Staff đã ra quyết định. Settlement đang chờ backend xử lý."
          className="mt-4"
        />
      )}
        <Field label="Lý do hủy">
          <Textarea
            value={terminationReason}
            onChange={(event) => setTerminationReason(event.target.value)}
          />
        </Field>
      </Modal>

    </div>
  );
}

function InfoLine({
  label,
  value,
  wide = false,
}: {
  label: string;
  value?: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "md:col-span-2" : undefined}>
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 break-words font-semibold text-slate-700">
        {value || "Chưa có dữ liệu từ backend"}
      </p>
    </div>
  );
}

function friendlyInitiator(initiator?: string) {
  if (initiator === "BUSINESS") return "Business";
  if (initiator === "EXPERT") return "Expert";
  return "Chưa xác định";
}

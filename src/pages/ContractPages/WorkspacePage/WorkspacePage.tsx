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
import { FirebaseFileLink } from "../../../components/FirebaseFileLink";
import {
  getContractMilestoneId,
  getMilestoneBudget,
  getSourceMilestoneId,
} from "../ContractPages.shared";

type NoticeTone = "success" | "danger" | "info" | "warning";
// Milestone status sets for action availability
const REVIEWABLE_STATUSES = new Set(["UNDER_REVIEW"]);
const SUBMITTABLE_STATUSES = new Set(["IN_PROGRESS"]);
const PROGRESS_REPORT_STATUSES = new Set(["IN_PROGRESS", "OVERDUE"]);
const DEPOSITABLE_STATUSES = new Set(["PENDING"]);
const DISPUTABLE_STATUSES = new Set(["IN_PROGRESS", "OVERDUE", "UNDER_REVIEW", "DISPUTED"]);

function normalizeStatus(status?: string) {
  return (status || "").trim().replace(/[\s-]+/g, "_").toUpperCase();
}

function formatDisputeType(type?: string) {
  switch (normalizeStatus(type)) {
    case "BUSINESS_REJECTED_DELIVERABLE":
      return "Phản đối kết quả bàn giao";
    case "EXPERT_SCOPE_CONCERN":
      return "Phản ánh yêu cầu ngoài phạm vi";
    case "EXPERT_NO_REVIEW_RESPONSE":
      return "Chưa nhận được phản hồi nghiệm thu";
    case "EXPERT_BAD_FAITH_REJECTION":
      return "Từ chối không phù hợp tiêu chí";
    case "OTHER":
      return "Lý do khác";
    default:
      return "";
  }
}

function normalizeExternalUrl(value?: string) {
  const url = String(value || "").trim();
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("//")) return `http:${url}`;
  return `http://${url}`;
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
    AWAITING_CONTINUATION_DECISION: "Chờ doanh nghiệp quyết định",
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

function milestoneDeliverableDeadline(milestone?: Milestone | null) {
  if (!milestone) return null;
  if (milestone.dueAt) {
    const dueAt = new Date(milestone.dueAt);
    return Number.isNaN(dueAt.getTime()) ? null : dueAt;
  }
  if (!milestone.inProgressStartedAt) return null;
  const startedAt = new Date(milestone.inProgressStartedAt);
  const duration = Number(milestone.duration || milestone.durationValue || 0);
  if (Number.isNaN(startedAt.getTime()) || !Number.isFinite(duration) || duration <= 0) {
    return null;
  }
  const unit = (milestone.durationUnit || "DAY").toUpperCase();
  const days = unit.includes("MONTH") ? duration * 30 : unit.includes("WEEK") ? duration * 7 : duration;
  const dueAt = new Date(startedAt);
  dueAt.setDate(dueAt.getDate() + days);
  return dueAt;
}

function isDeliverableDeadlineExceeded(milestone?: Milestone | null) {
  if (!milestone) return false;
  if (normalizeStatus(milestone.status) === "OVERDUE" || milestone.overdue) return true;
  const dueAt = milestoneDeliverableDeadline(milestone);
  return Boolean(dueAt && Date.now() > dueAt.getTime());
}

function isProgressReportAcknowledged(report?: MilestoneProgressReport) {
  if (!report) return false;
  return (
    normalizeStatus(report.acknowledgementState) === "ACKNOWLEDGED" ||
    Boolean(report.acknowledgedAt || report.businessFeedback || report.feedbackAt)
  );
}

function cleanPartyName(value: string | undefined, fallback: string, roleName: string) {
  let name = String(value || "").trim();
  if (!name) return fallback;
  const prefix = new RegExp(`^${roleName}\\s*[:\\-]?\\s+`, "i");
  while (prefix.test(name)) name = name.replace(prefix, "").trim();
  if (name.toLowerCase() === roleName.toLowerCase()) return fallback;
  return name || fallback;
}

function progressReportSubmissionNotice(
  report: MilestoneProgressReport,
  role: string | undefined,
  businessName: string,
  expertName: string,
): { tone: NoticeTone; title: string; message?: string } {
  if (report.requiresAdjustment) {
    return role === "BUSINESS"
      ? {
          tone: "warning",
          title: `Bạn đã yêu cầu Chuyên gia ${expertName} điều chỉnh báo cáo tiến độ.`,
        }
      : {
          tone: "danger",
          title: `Doanh nghiệp ${businessName} yêu cầu bạn điều chỉnh và nộp lại báo cáo tiến độ.`,
        };
  }

  if (isProgressReportAcknowledged(report)) {
    return role === "BUSINESS"
      ? {
          tone: "success",
          title: `Bạn đã xác nhận đã xem báo cáo tiến độ của Chuyên gia ${expertName}.`,
        }
      : {
          tone: "success",
          title: `Doanh nghiệp ${businessName} đã xác nhận đã xem báo cáo tiến độ này.`,
        };
  }

  return role === "BUSINESS"
    ? {
        tone: "warning",
        title: `Chuyên gia ${expertName} đã gửi báo cáo tiến độ này.`,
        message: "Vui lòng kiểm tra nội dung và bấm “Xác nhận đã xem báo cáo”.",
      }
    : {
        tone: "info",
        title: "Bạn đã gửi báo cáo tiến độ này.",
        message: `Đang chờ Doanh nghiệp ${businessName} xác nhận đã xem.`,
      };
}

function deliverableSubmissionNotice(
  deliverable: Deliverable,
  role: string | undefined,
  businessName: string,
  expertName: string,
  milestoneStatus?: string,
  isLatest = false,
): { tone: NoticeTone; title: string; message?: string } {
  const status = normalizeStatus(deliverable.status);

  if (status === "REJECTED" || deliverable.rejectionFeedback) {
    return role === "BUSINESS"
      ? {
          tone: "danger",
          title: `Bạn đã từ chối sản phẩm cuối cùng của Chuyên gia ${expertName}.`,
        }
      : {
          tone: "danger",
          title: `Doanh nghiệp ${businessName} đã từ chối sản phẩm cuối cùng này và yêu cầu nộp lại.`,
        };
  }

  if (status === "APPROVED" || (isLatest && normalizeStatus(milestoneStatus) === "COMPLETED")) {
    return role === "BUSINESS"
      ? {
          tone: "success",
          title: `Bạn đã nghiệm thu sản phẩm cuối cùng của Chuyên gia ${expertName}.`,
        }
      : {
          tone: "success",
          title: `Doanh nghiệp ${businessName} đã nghiệm thu sản phẩm cuối cùng này.`,
        };
  }

  return role === "BUSINESS"
    ? {
        tone: "warning",
        title: `Chuyên gia ${expertName} đã nộp sản phẩm cuối cùng này.`,
        message: "Vui lòng kiểm tra source/demo và nghiệm thu hoặc từ chối bản nộp.",
      }
    : {
        tone: "info",
        title: "Bạn đã nộp sản phẩm cuối cùng này.",
        message: `Đang chờ Doanh nghiệp ${businessName} nghiệm thu.`,
      };
}

function milestoneRoleNotice({
  role,
  businessName,
  expertName,
  latestProgressReport,
  latestDeliverable,
  milestoneStatus,
}: {
  role?: string;
  businessName: string;
  expertName: string;
  latestProgressReport?: MilestoneProgressReport;
  latestDeliverable?: Deliverable;
  milestoneStatus?: string;
}): { tone: NoticeTone; title: string; message?: string } | null {
  const status = normalizeStatus(milestoneStatus);
  const deliverableRejected =
    latestDeliverable &&
    (normalizeStatus(latestDeliverable.status) === "REJECTED" ||
      Boolean(latestDeliverable.rejectionFeedback));

  if (deliverableRejected) {
    return role === "BUSINESS"
      ? {
          tone: "danger",
          title: `Bạn đã từ chối sản phẩm cuối cùng của Chuyên gia ${expertName}.`,
        }
      : {
          tone: "danger",
          title: `Doanh nghiệp ${businessName} đã từ chối sản phẩm cuối cùng và yêu cầu bạn nộp lại.`,
        };
  }

  if (status === "COMPLETED") {
    return role === "BUSINESS"
      ? {
          tone: "success",
          title: `Bạn đã nghiệm thu sản phẩm cuối cùng của Chuyên gia ${expertName}.`,
        }
      : {
          tone: "success",
          title: `Doanh nghiệp ${businessName} đã nghiệm thu sản phẩm cuối cùng của bạn.`,
        };
  }

  if (latestProgressReport?.requiresAdjustment) {
    return role === "BUSINESS"
      ? {
          tone: "warning",
          title: `Bạn đã yêu cầu Chuyên gia ${expertName} điều chỉnh báo cáo tiến độ.`,
        }
      : {
          tone: "danger",
          title: `Doanh nghiệp ${businessName} yêu cầu bạn điều chỉnh và nộp lại báo cáo tiến độ.`,
        };
  }

  if (latestDeliverable && status === "UNDER_REVIEW") {
    return role === "BUSINESS"
      ? {
          tone: "warning",
          title: `Chuyên gia ${expertName} đã nộp sản phẩm cuối cùng.`,
          message: "Vui lòng kiểm tra source/demo theo tiêu chí nghiệm thu, sau đó nghiệm thu hoặc từ chối bản nộp này.",
        }
      : {
          tone: "info",
          title: "Bạn đã nộp sản phẩm cuối cùng.",
          message: `Đang chờ Doanh nghiệp ${businessName} kiểm tra và nghiệm thu.`,
        };
  }

  if (latestProgressReport && isProgressReportAcknowledged(latestProgressReport)) {
    return role === "BUSINESS"
      ? {
          tone: "success",
          title: `Bạn đã xác nhận đã xem báo cáo tiến độ của Chuyên gia ${expertName}.`,
        }
      : {
          tone: "success",
          title: `Doanh nghiệp ${businessName} đã xác nhận đã xem báo cáo tiến độ của bạn.`,
        };
  }

  if (latestProgressReport) {
    return role === "BUSINESS"
      ? {
          tone: "warning",
          title: `Chuyên gia ${expertName} đã gửi báo cáo tiến độ.`,
          message: "Bạn có thể xác nhận đã xem để Chuyên gia biết báo cáo đã được ghi nhận.",
        }
      : {
          tone: "info",
          title: "Bạn đã gửi báo cáo tiến độ.",
          message: `Đang chờ Doanh nghiệp ${businessName} xác nhận đã xem báo cáo.`,
        };
  }

  return null;
}

function checkpointLabel(checkpointType?: string) {
  if (!checkpointType) return "Báo cáo tiến độ";
  return "Báo cáo giữa kỳ";
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

function disputeWorkspaceNotice(dispute?: Dispute) {
  const status = normalizeStatus(dispute?.status);
  const fallback = {
    title: dispute ? "Tranh chấp đang xử lý" : "Tranh chấp",
    message: "Cột mốc đang có tranh chấp. Vui lòng theo dõi trong màn chi tiết.",
  };
  const messages: Record<string, { title: string; message: string }> = {
    PENDING_SELF_RESOLVE: {
      title: "Hồ sơ tranh chấp đã được tạo",
      message:
        "Hồ sơ chưa được gửi đến Staff. Vui lòng gửi yêu cầu Staff can thiệp để nhân viên tiếp nhận xử lý.",
    },
    ESCALATION_REQUESTED: {
      title: "Tranh chấp - Đã gửi yêu cầu staff",
      message:
        "Yêu cầu can thiệp đã được gửi. Hệ thống đang tự động định tuyến Staff phù hợp để tiếp nhận.",
    },
    STAFF_REVIEWING: {
      title: "Tranh chấp - Staff đang kiểm tra",
      message:
        "Staff đã tiếp nhận tranh chấp, đang kiểm tra source/demo theo Định nghĩa hoàn thành và sẽ ra quyết định xử lý.",
    },
    STAFF_DECIDED: {
      title: "Tranh chấp - Staff đã ra quyết định",
      message:
        "Staff đã gửi báo cáo kỹ thuật và tỷ lệ phân bổ ký quỹ. Hệ thống đang chờ bước quyết toán.",
    },
    RESOLVED: {
      title: "Tranh chấp - Đã xử lý xong",
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
  accent = "sky",
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  active?: boolean;
  done?: boolean;
  accent?: "sky" | "mint" | "amber";
  onClick?: () => void;
}) {
  const activeStyles = {
    sky: "border-sky-200 bg-sky-50",
    mint: "border-emerald-200 bg-emerald-50",
    amber: "border-amber-200 bg-amber-50",
  }[accent];
  const iconStyles = {
    sky: "text-sky-700",
    mint: "text-emerald-700",
    amber: "text-amber-700",
  }[accent];
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(event) => {
        if (onClick && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onClick();
        }
      }}
      className={
        `${onClick ? "cursor-pointer transition hover:-translate-y-0.5 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-200" : ""} ${active
          ? `rounded-2xl border p-4 ${activeStyles}`
          : done
            ? "rounded-2xl border border-emerald-200 bg-emerald-50 p-4"
            : "rounded-2xl border border-slate-100 bg-white p-4"}`
      }
    >
      <div className="flex items-start gap-3">
        <span
          className={
            active || done
              ? `grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white ${done ? "text-emerald-700" : iconStyles}`
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
  const [progressFeedbackDetail, setProgressFeedbackDetail] =
    useState<MilestoneProgressReport | null>(null);
  const [progressFeedbackOpen, setProgressFeedbackOpen] = useState<{
    milestone: Milestone;
    report: MilestoneProgressReport;
  } | null>(null);
  const [deliverableFeedbackDetail, setDeliverableFeedbackDetail] = useState<{
    deliverable: Deliverable;
    milestoneName: string;
    attemptNumber: number;
  } | null>(null);
  const [initiateDisputeOpen, setInitiateDisputeOpen] = useState<Milestone | null>(null);
  const [initiateDisputeType, setInitiateDisputeType] = useState<string>("OTHER");
  const [escalateDisputeOpen, setEscalateDisputeOpen] = useState<Milestone | null>(null);
  const [approveConfirmOpen, setApproveConfirmOpen] = useState<Milestone | null>(
    null,
  );
  const [abruptTerminationOpen, setAbruptTerminationOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deliverableForm, setDeliverableForm] = useState({
    type: "PROCESS",
    sourceCodeUrl: "",
    sourceCodeFileUrl: "",
    sourceCodeFileName: "",
    demoLink: "",
    submissionNotes: "",
    percentComplete: "50",
  });
  const [sourceArchiveFile, setSourceArchiveFile] = useState<File | null>(null);
  const [sourceArchiveError, setSourceArchiveError] = useState("");
  const [feedbackReason, setFeedbackReason] = useState("");
  const [failedCriteriaReasons, setFailedCriteriaReasons] = useState<Record<number, string>>({});
  const [selectedFailedCriteriaIds, setSelectedFailedCriteriaIds] = useState<number[]>([]);
  const [failedCriteriaError, setFailedCriteriaError] = useState("");
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
  const [submissionTabs, setSubmissionTabs] = useState<
    Record<number, "REPORTS" | "FINAL">
  >({});
  const [initiateDisputeOtherReason, setInitiateDisputeOtherReason] = useState("");
  const [initiateDisputeModalWarning, setInitiateDisputeModalWarning] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
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
  const shouldFocusMilestoneDeposit = new URLSearchParams(location.search).get(
    "focus",
  ) === "milestone-deposit";
  const focusMilestoneId = useMemo(() => {
    if (!shouldFocusMilestoneDeposit || session?.role !== "BUSINESS") {
      return undefined;
    }

    const firstDepositableMilestone = milestones
      .slice()
      .sort((a, b) => Number(a.orderIndex) - Number(b.orderIndex))
      .find(
        (milestone) =>
          normalizeStatus(milestone.status) === "PENDING" &&
          milestones
            .filter(
              (item) =>
                Number(item.orderIndex) < Number(milestone.orderIndex),
            )
            .every((item) => normalizeStatus(item.status) === "COMPLETED"),
      );

    return firstDepositableMilestone
      ? getSourceMilestoneId(firstDepositableMilestone)
      : undefined;
  }, [milestones, session?.role, shouldFocusMilestoneDeposit]);
  const businessDisplayName = cleanPartyName(
    contract?.businessName,
    "đối tác",
    "Doanh nghiệp",
  );
  const expertDisplayName = cleanPartyName(
    contract?.expertName,
    "đối tác",
    "Chuyên gia",
  );

  //cmt1: Tải toàn bộ dữ liệu workspace: hợp đồng, milestone, tranh chấp và yêu cầu chấm dứt liên quan.
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
    if (!shouldFocusMilestoneDeposit) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWorkspaceNotice({
      tone: "info",
      title: "Bước tiếp theo: ký quỹ cột mốc",
      message:
        "Doanh nghiệp cần ký quỹ từng cột mốc để Chuyên gia có thể bắt đầu thực hiện công việc.",
    });
  }, [shouldFocusMilestoneDeposit]);

  useEffect(() => {
    if (!focusMilestoneId) return;

    const timer = window.setTimeout(() => {
      document
        .getElementById(`milestone-deposit-${focusMilestoneId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);

    return () => window.clearTimeout(timer);
  }, [focusMilestoneId]);

  useEffect(() => {
    if (!resolvedDisputeNotice) return;

    window.scrollTo({ top: 0, behavior: "smooth" });
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, navigate, resolvedDisputeNotice]);

  useEffect(() => {
    queueMicrotask(() => void loadWorkspace());
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

  const scrollToMilestoneGroup = (predicate: (milestone: Milestone) => boolean) => {
    const target = milestones.find(predicate);
    if (!target) return;
    const sourceMilestoneId = getSourceMilestoneId(target);
    const element = document.getElementById(
      sourceMilestoneId
        ? `milestone-deposit-${sourceMilestoneId}`
        : `milestone-deposit-${getContractMilestoneId(target)}`,
    );
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  // Tải lại workspace sau mỗi thao tác để đồng bộ trạng thái dispute/milestone mới nhất.
  const refreshAfterAction = async () => {
    await loadWorkspace();
  };

  // Hiển thị thông báo theo từng milestone, hoặc thông báo chung nếu không có milestone cụ thể.
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

    // Thông báo thành công của thao tác trước không được giữ lại khi người dùng
    // chuyển sang thao tác khác. Trạng thái hiện tại vẫn được render từ dữ liệu
    // milestone/report sau khi tải lại.
    setMilestoneNotices({});
    setActionLoading(`${actionKey}:${sourceMilestoneId}`);
    try {
      await action(sourceMilestoneId);
      await refreshAfterAction();
      const successMessage =
        actionKey === "deposit"
          ? `Đã ký quỹ thành công ${formatCurrency(
              getMilestoneBudget(milestone),
            )} cho Cột mốc ${milestone.orderIndex}. Chuyên gia có thể bắt đầu thực hiện công việc.`
          : undefined;
      if (actionKey === "deposit") {
        setWorkspaceNotice({
          tone: "success",
          title: "Ký quỹ cột mốc thành công",
          message: successMessage,
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setMilestoneNotice(sourceMilestoneId, {
          tone: "success",
          title: successTitle,
          message: successMessage,
        });
      }
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
    if (!deliverableOpen || !contract) return;
    const sourceMilestoneId = getSourceMilestoneId(deliverableOpen);
    if (!sourceMilestoneId) {
      setWorkspaceNotice({
        tone: "danger",
        title: "Không xác định được milestone gốc để nộp deliverable.",
      });
      return;
    }
    const deadlineExceeded = isDeliverableDeadlineExceeded(deliverableOpen);
    if (deliverableForm.type === "FINAL" && deadlineExceeded) {
      setMilestoneNotice(sourceMilestoneId, {
        tone: "danger",
        title: "Cột mốc đã quá hạn nộp sản phẩm.",
        message: "Bạn không thể nộp final product hoặc upload source mới sau deadline. Hãy theo dõi luồng tranh chấp/xử lý quá hạn.",
      });
      return;
    }

    if (
      deliverableForm.type === "PROCESS" &&
      (deliverablesByMilestone[sourceMilestoneId] || []).length > 0
    ) {
      setMilestoneNotice(sourceMilestoneId, {
        tone: "warning",
        title: "Cột mốc đã có sản phẩm cuối cùng.",
        message: "Không thể nộp thêm báo cáo tiến độ. Chỉ có thể nộp lại sản phẩm cuối cùng nếu cần chỉnh sửa.",
      });
      setDeliverableOpen(null);
      return;
    }

    setMilestoneNotices({});
    setActionLoading(`submit:${sourceMilestoneId}`);
    try {
      const notes = deliverableForm.submissionNotes.trim();
      let sourceCodeFileUrl = deliverableForm.sourceCodeFileUrl || undefined;
      if (!notes) {
        setMilestoneNotice(sourceMilestoneId, {
          tone: "warning",
          title: "Vui lòng nhập nội dung báo cáo hoặc ghi chú bàn giao.",
        });
        return;
      }
      if (sourceArchiveFile) {
        sourceCodeFileUrl = await contractApi.uploadMilestoneSourceCode(
          contract.contractId,
          sourceMilestoneId,
          sourceArchiveFile,
        );
      }
      if (deliverableForm.type === "PROCESS") {
        const percentComplete = Number(deliverableForm.percentComplete || 0);
        await contractApi.submitProgressReport(id, sourceMilestoneId, {
          content: notes,
          percentComplete: Number.isFinite(percentComplete)
            ? percentComplete
            : undefined,
          sourceCodeUrl: normalizeExternalUrl(deliverableForm.sourceCodeUrl) || undefined,
          sourceCodeFileUrl,
          demoLink: normalizeExternalUrl(deliverableForm.demoLink) || undefined,
          submissionNotes: notes,
        });
      } else {
        if (!normalizeExternalUrl(deliverableForm.sourceCodeUrl) && !sourceCodeFileUrl) {
          setMilestoneNotice(sourceMilestoneId, {
            tone: "warning",
            title: "Vui lòng cung cấp Source code URL hoặc file ZIP source code.",
          });
          return;
        }
        await contractApi.submitDeliverable(contract.contractId, sourceMilestoneId, {
          milestoneId: sourceMilestoneId,
          sourceCodeUrl: normalizeExternalUrl(deliverableForm.sourceCodeUrl) || undefined,
          sourceCodeFileUrl,
          demoLink: normalizeExternalUrl(deliverableForm.demoLink) || undefined,
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
        sourceCodeFileUrl: "",
        sourceCodeFileName: "",
        demoLink: "",
        submissionNotes: "",
        percentComplete: "50",
      });
      setSourceArchiveFile(null);
      setSourceArchiveError("");
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
    if (selectedFailedCriteriaIds.length === 0) {
      setFailedCriteriaError("Vui lòng chọn ít nhất một tiêu chí chưa đạt.");
      return;
    }
    if (selectedFailedCriteriaIds.some((criteriaId) => !failedCriteriaReasons[criteriaId]?.trim())) {
      setFailedCriteriaError("Vui lòng mô tả chi tiết cho từng tiêu chí đã chọn.");
      return;
    }
    const milestone = feedbackOpen;
    await runMilestoneAction(
      milestone,
      "feedback",
      (sourceMilestoneId) => contractApi.rejectMilestone(contract!.contractId, sourceMilestoneId, {
        reason,
        failedCriteria: selectedFailedCriteriaIds.map((criteriaId) => ({
          criteriaId,
          reason: failedCriteriaReasons[criteriaId]?.trim() || "Tiêu chí chưa đạt yêu cầu nghiệm thu.",
        })),
      }),
      "Đã gửi feedback. Expert có thể chỉnh sửa và nộp lại final product.",
    );
    setFeedbackReason("");
    setFeedbackRequired(false);
    setFailedCriteriaError("");
    setFeedbackOpen(null);
  };

  const acknowledgeProgressReport = async (
    milestone: Milestone,
    report: MilestoneProgressReport,
  ) => {
    if (!contract) return;
    const sourceMilestoneId = getSourceMilestoneId(milestone);
    if (!sourceMilestoneId) {
      setWorkspaceNotice({
        tone: "danger",
        title: "Không xác định được cột mốc cần xác nhận báo cáo.",
      });
      return;
    }

    setMilestoneNotices({});
    setActionLoading(`progress-ack:${report.progressReportId}`);
    try {
      const savedReport = await contractApi.acknowledgeProgressReport(
        contract.contractId,
        sourceMilestoneId,
        report.progressReportId,
      );
      setProgressReportsByMilestone((current) => {
        const existing = current[sourceMilestoneId] || [];
        return {
          ...current,
          [sourceMilestoneId]: existing.map((item) =>
            item.progressReportId === savedReport.progressReportId
              ? savedReport
              : item,
          ),
        };
      });
      setMilestoneNotice(sourceMilestoneId, {
        tone: "success",
        title: `Bạn đã xác nhận đã xem báo cáo tiến độ của Chuyên gia ${expertDisplayName}.`,
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

  const approveMilestoneAndRefreshContract = async (milestone: Milestone) => {
    if (!contract) return;
    const sourceMilestoneId = getSourceMilestoneId(milestone);
    if (!sourceMilestoneId) {
      setWorkspaceNotice({
        tone: "danger",
        title: "Không xác định được cột mốc cần nghiệm thu.",
      });
      return;
    }

    setMilestoneNotices({});
    setActionLoading(`approve:${sourceMilestoneId}`);
    try {
      await contractApi.approveMilestone(contract.contractId, sourceMilestoneId);
      const [updatedContract, updatedMilestones] = await Promise.all([
        contractApi.getContract(contract.contractId),
        contractApi.listMilestones(contract.contractId),
      ]);
      setContract(updatedContract);
      setMilestones(updatedMilestones);

      const allMilestonesCompleted = updatedMilestones.every((item) =>
        normalizeStatus(item.status) === "COMPLETED"
      );

      setMilestoneNotice(sourceMilestoneId, {
        tone: "success",
        title: `Doanh nghiệp ${businessDisplayName} đã nghiệm thu sản phẩm cuối cùng.`,
        message: allMilestonesCompleted
          ? "Tất cả cột mốc đã hoàn tất. Hệ thống đang đồng bộ hoàn ký quỹ và đóng hợp đồng."
          : "Cột mốc đã hoàn tất nghiệm thu.",
      });

      if (allMilestonesCompleted) {
        setWorkspaceNotice({
          tone: "success",
          title: "Tất cả cột mốc đã hoàn tất nghiệm thu.",
          message: "Đang chuyển về trang hợp đồng để cập nhật trạng thái hoàn ký quỹ.",
        });
        window.dispatchEvent(new Event("aitasker:reload-wallet"));
        setTimeout(() => navigate(`/app/contracts/${contract.contractId}`), 900);
      }
      setApproveConfirmOpen(null);
    } catch (error) {
      setMilestoneNotice(sourceMilestoneId, {
        tone: "danger",
        title: getApiErrorMessage(error),
      });
    } finally {
      setActionLoading(null);
    }
  };

  //cmt2: Tạo hồ sơ tranh chấp ban đầu cho milestone, trước khi gửi Staff can thiệp.
  //hàm tạo hồ sơ: submitInitiateDispute được gọi khi người dùng nhấn nút "Tạo hồ sơ tranh chấp" trong modal mở hồ sơ tranh chấp.
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
      const disputeReason =
        initiateDisputeOtherReason.trim() ||
        formatDisputeType(initiateDisputeType) ||
        "Lý do tranh chấp chưa được cung cấp.";
      await disputeApi.create({
        contractId: contract.contractId,
        milestoneId: sourceMilestoneId,
        initiatedBy: session?.role === "BUSINESS" ? "BUSINESS" : "EXPERT",
        initiationType: initiateDisputeType,
        evidenceReport: disputeReason,
      });
      await refreshAfterAction();
      setMilestoneNotice(sourceMilestoneId, {
        tone: "success",
        title: "Đã tạo hồ sơ tranh chấp.",
        message: "Bạn có thể gửi yêu cầu Staff can thiệp khi cần nhân viên tiếp nhận xử lý.",
      });
      setInitiateDisputeOpen(null);
      setInitiateDisputeType("OTHER");
      setInitiateDisputeOtherReason("");
      setInitiateDisputeModalWarning("");
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

  // hàm Gửi yêu cầu Staff can thiệp cho hồ sơ tranh chấp đang ở trạng thái tự xử lý.
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
      if (!existing || normalizeStatus(existing.status) !== "PENDING_SELF_RESOLVE") return;
      const escalationReason = escalateDisputeNote.trim()
        ? `${reason}\n\nGhi chú bổ sung: ${escalateDisputeNote.trim()}`
        : reason;
      await disputeApi.escalate(
        existing.disputeId,
        escalationReason,
      );
      await refreshAfterAction();
      setMilestoneNotice(sourceMilestoneId, {
        tone: "success",
        title: "Đã gửi yêu cầu Staff can thiệp.",
        message: "Hệ thống sẽ tự động gán Staff phù hợp để xử lý.",
      });
      setEscalateDisputeOpen(null);
      setDisputeReason("");
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

  const submitProgressFeedback = async () => {
    if (!contract || !progressFeedbackOpen) return;
    const { milestone, report } = progressFeedbackOpen;
    const sourceMilestoneId = getSourceMilestoneId(milestone);
    const feedback = progressFeedbackForm.feedback.trim();
    if (!sourceMilestoneId || !feedback) {
      setWorkspaceNotice({
        tone: "warning",
        title: "Vui lòng nhập nội dung phản hồi cho báo cáo tiến độ.",
      });
      return;
    }

    setMilestoneNotices({});
    setActionLoading(`progress-feedback:${report.progressReportId}`);
    try {
      const savedReport = await contractApi.feedbackProgressReport(
        contract.contractId,
        sourceMilestoneId,
        report.progressReportId,
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
          item.progressReportId === savedReport.progressReportId
            ? savedReport
            : item,
        ),
      }));
      setProgressFeedbackOpen(null);
      setProgressFeedbackForm({
        feedback: "",
        category: "Core Logic",
        severity: "Medium",
        dodChecklist: [],
        requiresAdjustment: false,
      });
      setMilestoneNotice(sourceMilestoneId, {
        tone: "success",
        title: "Đã gửi phản hồi báo cáo tiến độ cho Chuyên gia.",
        message: progressFeedbackForm.requiresAdjustment
          ? "Chuyên gia sẽ thấy nội dung cần điều chỉnh trong báo cáo này."
          : "Phản hồi đã được ghi nhận để theo dõi tiến độ.",
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

  // Điều hướng tới màn chi tiết tranh chấp theo đúng vai trò hiện tại.
  const openDisputeProfile = (dispute: Dispute) => {
    if (!dispute.disputeId) return;
    const basePath = session?.role === "STAFF" ? "/app/tickets" : "/app/disputes";
    navigate(`${basePath}/${dispute.disputeId}`);
  };

  const checkOverdueMilestones = async () => {
    if (!contract) return;
    setActionLoading("check-overdue");
    try {
      await contractApi.checkOverdueMilestones(contract.contractId);
      await refreshAfterAction();
      setWorkspaceNotice({
        tone: "success",
        title: "Đã cập nhật trạng thái quá hạn của các cột mốc.",
      });
    } catch (error) {
      setWorkspaceNotice({ tone: "danger", title: getApiErrorMessage(error) });
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
          "Hợp đồng đã được hủy. Các cột mốc chưa hoàn thành sẽ được hoàn tiền cho Doanh nghiệp nếu cột mốc đó đang giữ ký quỹ.",
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
  const approvingLastMilestone =
    approveConfirmOpen !== null &&
    milestones
      .filter(
        (item) =>
          getSourceMilestoneId(item) !== getSourceMilestoneId(approveConfirmOpen),
      )
      .every((item) => normalizeStatus(item.status) === "COMPLETED");
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
  const deliverableOpenDeadlineExceeded = isDeliverableDeadlineExceeded(deliverableOpen);
  const canOpenProgressReport =
    !contractActionsFrozen &&
    deliverableOpen !== null &&
    PROGRESS_REPORT_STATUSES.has(deliverableOpenStatus);
  const canOpenFinalProduct =
    !contractActionsFrozen &&
    deliverableOpen !== null &&
    SUBMITTABLE_STATUSES.has(deliverableOpenStatus) &&
    !deliverableOpenDeadlineExceeded;

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          title={`Workspace: ${contract.contractTitle ||
            contract.title ||
            "Hợp đồng chưa có tên"
            }`}
          description="Business ký quỹ từng cột mốc, Expert nộp báo cáo tiến độ hoặc final product, Business nghiệm thu hoặc yêu cầu chỉnh sửa final product."
          actions={
            <div className="flex flex-wrap gap-2">
              {session?.role === "ADMIN" && (
                <>
                  <Button
                    variant="secondary"
                    onClick={checkOverdueMilestones}
                    loading={actionLoading === "check-overdue"}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Cập nhật quá hạn
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={autoApproveReviewSla}
                    loading={actionLoading === "review-sla"}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Xử lý nghiệm thu quá hạn
                  </Button>
                </>
              )}
              {canShowAbruptTermination && (
                <Button
                  variant="danger"
                  disabled={!canUseAbruptTermination}
                  title={
                    hasAbruptTerminationBlockedMilestone
                      ? "Không thể hủy ngang khi có cột mốc đang nghiệm thu hoặc tranh chấp."
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

      {normalizeStatus(contract.status) === "PENDING" && counts.pending > 0 && (
        <Notice
          tone="warning"
          title={
            session?.role === "BUSINESS"
              ? "Hợp đồng chưa được ký quỹ."
              : "Hợp đồng đang chờ Doanh nghiệp ký quỹ."
          }
          className="mt-2"
        >
          {session?.role === "BUSINESS"
            ? `Còn ${counts.pending} cột mốc chưa được ký quỹ. Hãy ký quỹ từng cột mốc để Chuyên gia có thể bắt đầu thực hiện.`
            : `Còn ${counts.pending} cột mốc đang chờ Doanh nghiệp ký quỹ. Bạn chỉ có thể bắt đầu nộp sản phẩm sau khi cột mốc được ký quỹ.`}
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
                <Badge tone="amber">{contractStatusLabel(contract.status)}</Badge>
                <Badge tone="slate">Hợp đồng tạm khóa thao tác</Badge>
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
          accent="sky"
          onClick={() => scrollToMilestoneGroup((milestone) => normalizeStatus(milestone.status) === "PENDING")}
        />
        <FlowStep
          icon={<UploadCloud className="h-4 w-4" />}
          title="Expert nộp sản phẩm"
          description={`${counts.ready} mốc chờ bắt đầu, ${counts.working} đang làm, ${counts.overdue} quá hạn.`}
          active={counts.ready > 0 || counts.working > 0 || counts.overdue > 0}
          accent="sky"
          onClick={() => scrollToMilestoneGroup((milestone) => ["DEPOSITED", "IN_PROGRESS", "OVERDUE"].includes(normalizeStatus(milestone.status)))}
        />
        <FlowStep
          icon={<CheckCircle2 className="h-4 w-4" />}
          title="Doanh nghiệp nghiệm thu"
          description={`${counts.review} cột mốc đang chờ nghiệm thu.`}
          active={counts.review > 0}
          accent="mint"
          onClick={() => scrollToMilestoneGroup((milestone) => normalizeStatus(milestone.status) === "UNDER_REVIEW")}
        />
        <FlowStep
          icon={<Gavel className="h-4 w-4" />}
          title="Tranh chấp"
          description={`${counts.disputed} cột mốc đang ở trạng thái tranh chấp.`}
          active={counts.disputed > 0}
          accent="amber"
          onClick={() => scrollToMilestoneGroup((milestone) => normalizeStatus(milestone.status) === "DISPUTED")}
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
              milestoneNotice.tone !== "info" &&
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
          const roleNotice = milestoneRoleNotice({
            role: session?.role,
            businessName: businessDisplayName,
            expertName: expertDisplayName,
            latestProgressReport,
            latestDeliverable,
            milestoneStatus: milestone.status,
          });
          // A fresh action notice is the single source of truth for the milestone.
          // Do not render the derived role notice beside it.
          const visibleRoleNotice =
            visibleMilestoneNotice || roleNotice?.tone === "info"
              ? null
              : roleNotice;
          const hasMilestoneSummaryNotice = Boolean(
            visibleMilestoneNotice || visibleRoleNotice,
          );
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
          const hasSubmittedFinal = milestoneDeliverables.length > 0;
          const submissionTabKey = sourceMilestoneId ?? milestone.milestoneId;
          const submissionTab = submissionTabs[submissionTabKey] || "REPORTS";
          const deliverableDeadlineExceeded = isDeliverableDeadlineExceeded(milestone);
          const canDepositNext =
            !contractActionsFrozen &&
            session?.role === "BUSINESS" &&
            status === "COMPLETED" &&
            nextMilestoneId &&
            DEPOSITABLE_STATUSES.has(normalizeStatus(nextMilestone?.status));
          const canSubmit =
            !contractActionsFrozen &&
            session?.role === "EXPERT" &&
            SUBMITTABLE_STATUSES.has(status) &&
            !deliverableDeadlineExceeded;
          const canSubmitProgress =
            !contractActionsFrozen &&
            session?.role === "EXPERT" &&
            PROGRESS_REPORT_STATUSES.has(status) &&
            !hasSubmittedFinal;
          const canRequestProgressReport =
            !contractActionsFrozen &&
            session?.role === "BUSINESS" &&
            PROGRESS_REPORT_STATUSES.has(status) &&
            !hasSubmittedFinal &&
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
            ? expandedMilestones[sourceMilestoneId] ?? isActiveMilestoneStatus(status)
            : true;
          const needsBusinessReview =
            session?.role === "BUSINESS" &&
            ((latestProgressReport && !isProgressReportAcknowledged(latestProgressReport)) ||
              (latestDeliverable && status === "UNDER_REVIEW"));
          const scrollToSubmission = () => {
            if (!sourceMilestoneId) return;
            document
              .getElementById(`milestone-submissions-${sourceMilestoneId}`)
              ?.scrollIntoView({ behavior: "smooth", block: "center" });
          };

          return (
            <Card
              id={
                sourceMilestoneId
                  ? `milestone-deposit-${sourceMilestoneId}`
                  : undefined
              }
              key={
                sourceMilestoneId ||
                getContractMilestoneId(milestone) ||
                milestone.orderIndex
              }
              className={`p-5 transition-shadow ${
                focusMilestoneId === sourceMilestoneId
                  ? "ring-2 ring-brand/50 shadow-lg"
                  : ""
              }`}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="brand">Mốc {milestone.orderIndex}</Badge>
                    <StatusBadge
                      status={milestoneStatusLabel(milestone.status)}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <h3 className="font-display text-xl font-extrabold text-ink">
                      {milestone.milestoneName}
                    </h3>
                    {status === "PENDING" ? (
                      session?.role === "BUSINESS" ? (
                        <Badge tone="rose">Doanh nghiệp cần ký quỹ</Badge>
                      ) : (
                        <Badge tone="amber">Chờ Doanh nghiệp ký quỹ</Badge>
                      )
                    ) : status && !["CANCELLED", "TERMINATED"].includes(status) ? (
                      <Badge tone="mint">Đã ký quỹ</Badge>
                    ) : null}
                  </div>
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
                          "Đã ký quỹ cột mốc.",
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
                        setSourceArchiveFile(null);
                        setSourceArchiveError("");
                        setDeliverableOpen(milestone);
                      }}
                    >
                      <Send className="h-4 w-4" />
                      Nộp báo cáo tiến độ
                    </Button>
                  )}
                  {canSubmit && (
                    <Button
                      size="sm"
                      loading={isLoading("submit")}
                      onClick={() => {
                        setDeliverableForm((value) => ({
                          ...value,
                          type: "FINAL",
                        }));
                        setSourceArchiveFile(null);
                        setSourceArchiveError("");
                        setDeliverableOpen(milestone);
                      }}
                    >
                      <UploadCloud className="h-4 w-4" />
                      Nộp sản phẩm cuối cùng
                    </Button>
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
                      Tạo hồ sơ tranh chấp
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
                            formatDisputeType(currentDispute.initiationType) ||
                            "Lý do tranh chấp chưa được cung cấp.",
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

                  {visibleRoleNotice && (
                    <div className="mt-4">
                      <Notice tone={visibleRoleNotice.tone} title={visibleRoleNotice.title}>
                        {visibleRoleNotice.message}
                      </Notice>
                      {needsBusinessReview && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="mt-3"
                          onClick={scrollToSubmission}
                        >
                          Đi đến nội dung cần xử lý
                        </Button>
                      )}
                    </div>
                  )}

                  {session?.role === "EXPERT" && deliverableDeadlineExceeded && (
                    <div className="mt-4">
                      <Notice tone="danger" title="Cột mốc đã quá hạn nộp sản phẩm">
                        Bạn vẫn có thể gửi báo cáo tiến độ nếu cần cập nhật tình hình, nhưng không thể nộp final product hoặc upload source ZIP mới sau deadline.
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
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        
                        <Badge tone="brand">
                          {normalizeStatus(currentDispute.status) === "ESCALATION_REQUESTED"
                            ? "Đã chuyển yêu cầu đến Staff"
                            : normalizeStatus(currentDispute.status) === "STAFF_REVIEWING"
                              ? "Staff đang xử lý"
                              : disputeWorkspaceNotice(currentDispute).title}
                        </Badge>
                      </div>
                      <Notice
                        tone="warning"
                        title={disputeWorkspaceNotice(currentDispute).title}
                      >
                        {disputeWorkspaceNotice(currentDispute).message}
                      </Notice>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openDisputeProfile(currentDispute)}
                        >
                          Xem và bổ sung bằng chứng
                        </Button>
                      </div>
                    </div>
                  )}
                  <div className="mt-5 grid gap-4">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm font-extrabold text-ink">
                        Định nghĩa hoàn thành / Tiêu chí nghiệm thu
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

                    <div
                      id={`milestone-submissions-${sourceMilestoneId}`}
                      className="rounded-2xl bg-slate-50 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-extrabold text-ink">
                          Báo cáo tiến độ / Sản phẩm bàn giao
                        </p>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500">
                          {milestoneReports.length + milestoneDeliverables.length} lần nộp
                        </span>
                      </div>
                      <div className="mt-4 grid grid-cols-1 gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 sm:grid-cols-2">
                        <button
                          type="button"
                          aria-pressed={submissionTab === "REPORTS"}
                          className={`rounded-lg border px-4 py-2.5 text-sm font-extrabold transition ${
                            submissionTab === "REPORTS"
                              ? "border-brand-600 bg-brand-600 text-white shadow-sm"
                              : "border-brand-100 bg-white text-brand-600 hover:border-brand-200 hover:bg-brand-50"
                          }`}
                          onClick={() =>
                            setSubmissionTabs((current) => ({
                              ...current,
                              [submissionTabKey]: "REPORTS",
                            }))
                          }
                        >
                          Báo cáo tiến độ ({milestoneReports.length})
                        </button>
                        <button
                          type="button"
                          aria-pressed={submissionTab === "FINAL"}
                          className={`rounded-lg border px-4 py-2.5 text-sm font-extrabold transition ${
                            submissionTab === "FINAL"
                              ? "border-brand-600 bg-brand-600 text-white shadow-sm"
                              : "border-brand-100 bg-white text-brand-600 hover:border-brand-200 hover:bg-brand-50"
                          }`}
                          onClick={() =>
                            setSubmissionTabs((current) => ({
                              ...current,
                              [submissionTabKey]: "FINAL",
                            }))
                          }
                        >
                          Sản phẩm cuối cùng ({milestoneDeliverables.length})
                        </button>
                      </div>
                      <div className="mt-3 grid gap-2">
                        {submissionTab === "REPORTS" && (
                          <>
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
                                      href={normalizeExternalUrl(item.sourceCodeUrl)}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="mt-1 block break-all font-bold text-brand-600 hover:text-brand-700"
                                    >
                                      {item.sourceCodeUrl}
                                    </a>
                                  </div>
                                )}
                                {item.sourceCodeFileUrl && (
                                  <div className="min-w-[220px] rounded-lg bg-white px-3 py-2">
                                    <p className="mb-2 text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
                                      Source ZIP
                                    </p>
                                    <FirebaseFileLink
                                      path={item.sourceCodeFileUrl}
                                      buttonText="Xem ZIP"
                                      showPath={false}
                                    />
                                  </div>
                                )}
                                {item.demoLink && (
                                  <div className="rounded-lg bg-white px-3 py-2">
                                    <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
                                      Demo URL
                                    </p>
                                    <a
                                      href={normalizeExternalUrl(item.demoLink)}
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
                                      href={normalizeExternalUrl(item.attachmentUrl)}
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
                            {(() => {
                              const notice = progressReportSubmissionNotice(
                                item,
                                session?.role,
                                businessDisplayName,
                                expertDisplayName,
                              );
                              const isLatestReport =
                                latestProgressReport?.progressReportId ===
                                item.progressReportId;
                              return notice.tone === "info" ||
                                (isLatestReport && hasMilestoneSummaryNotice)
                                ? null
                                : (
                                <Notice tone={notice.tone} title={notice.title} className="mt-3">
                                  {notice.message}
                                </Notice>
                              );
                            })()}
                            <div className="mt-3 flex flex-wrap gap-2">
                              {(session?.role === "EXPERT" || session?.role === "BUSINESS") &&
                                item.businessFeedback && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => setProgressFeedbackDetail(item)}
                                >
                                  {session.role === "BUSINESS"
                                    ? "Xem phản hồi đã gửi"
                                    : "Xem phản hồi của Doanh nghiệp"}
                                </Button>
                              )}
                              {session?.role === "BUSINESS" && (
                                <>
                                  {latestProgressReport?.progressReportId ===
                                    item.progressReportId &&
                                    !item.businessFeedback &&
                                    !isProgressReportAcknowledged(item) && (
                                      <Button
                                        size="sm"
                                        variant="secondary"
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
                                        Gửi phản hồi cho Chuyên gia
                                      </Button>
                                    )}
                                  {!isProgressReportAcknowledged(item) && (
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      disabled={
                                        latestProgressReport?.progressReportId !==
                                        item.progressReportId
                                      }
                                      loading={
                                        actionLoading ===
                                        `progress-ack:${item.progressReportId}`
                                      }
                                      onClick={() => acknowledgeProgressReport(milestone, item)}
                                    >
                                      {latestProgressReport?.progressReportId === item.progressReportId
                                        ? "Xác nhận đã xem báo cáo"
                                        : "Chỉ xác nhận lần nộp mới nhất"}
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                          </>
                        )}
                        {submissionTab === "FINAL" && (
                          <>
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
                                    href={normalizeExternalUrl(item.sourceCodeUrl)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-1 block break-all font-bold text-brand-600 hover:text-brand-700"
                                  >
                                    {item.sourceCodeUrl}
                                  </a>
                                </div>
                              )}
                              {item.sourceCodeFileUrl && (
                                <div className="min-w-[220px] rounded-lg bg-slate-50 px-3 py-2">
                                  <p className="mb-2 text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
                                    Source ZIP
                                  </p>
                                  <FirebaseFileLink
                                    path={item.sourceCodeFileUrl}
                                    buttonText="Xem ZIP"
                                    showPath={false}
                                  />
                                </div>
                              )}
                              {item.demoLink && (
                                <div className="rounded-lg bg-slate-50 px-3 py-2">
                                  <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
                                    Demo URL
                                  </p>
                                  <a
                                    href={normalizeExternalUrl(item.demoLink)}
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
                            {(() => {
                              const notice = deliverableSubmissionNotice(
                                item,
                                session?.role,
                                businessDisplayName,
                                expertDisplayName,
                                milestone.status,
                                latestDeliverable?.deliverableId === item.deliverableId,
                              );
                              const isLatestDeliverable =
                                latestDeliverable?.deliverableId ===
                                item.deliverableId;
                              return notice.tone === "info" ||
                                (isLatestDeliverable && hasMilestoneSummaryNotice)
                                ? null
                                : (
                                <Notice tone={notice.tone} title={notice.title} className="mt-3">
                                  {notice.message}
                                </Notice>
                              );
                            })()}
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
                                      {session?.role === "BUSINESS"
                                        ? "Xem phản hồi đã gửi"
                                        : "Xem phản hồi của Doanh nghiệp"}
                                    </Button>
                                  )}
                                  {session?.role === "BUSINESS" &&
                                    latestDeliverable?.deliverableId === item.deliverableId &&
                                    canReview && (
                                      <>
                                        <Button
                                          size="sm"
                                          onClick={() =>
                                            setApproveConfirmOpen(milestone)
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
                                            setFailedCriteriaReasons({});
                                            setSelectedFailedCriteriaIds([]);
                                            setFailedCriteriaError("");
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
                          </>
                        )}
                        {submissionTab === "REPORTS" && milestoneReports.length === 0 && (
                          <p className="rounded-xl border border-dashed border-slate-200 bg-white p-3 text-sm font-semibold text-slate-400">
                            Chưa có báo cáo tiến độ cho cột mốc này.
                          </p>
                        )}
                        {submissionTab === "FINAL" && milestoneDeliverables.length === 0 && (
                            <p className="rounded-xl border border-dashed border-slate-200 bg-white p-3 text-sm font-semibold text-slate-400">
                              Chưa có sản phẩm cuối cùng cho cột mốc này.
                            </p>
                          )}
                      </div>
                    </div>
                  </div>
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
        onClose={() => {
          setDeliverableOpen(null);
          setSourceArchiveFile(null);
          setSourceArchiveError("");
        }}
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
              onClick={() => {
                setDeliverableOpen(null);
                setSourceArchiveFile(null);
                setSourceArchiveError("");
              }}
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
          {deliverableOpenDeadlineExceeded && (
            <Notice tone="danger" title="Đã quá hạn nộp source ZIP">
              Backend sẽ từ chối upload source ZIP hoặc final product sau deadline. Bạn có thể gửi báo cáo tiến độ không kèm file ZIP nếu cần cập nhật tình hình.
            </Notice>
          )}
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
                      demoLink: "",
                    }))
                  }
                >
                  Final product
                </Button>
              )}
            </div>
          </Field>
          {deliverableForm.type === "PROCESS" && (
            <Field label={`Phần trăm hoàn thành: ${deliverableForm.percentComplete}%`}>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={deliverableForm.percentComplete}
                  aria-label="Phần trăm hoàn thành"
                  className="h-2 w-full cursor-pointer accent-brand-600"
                  onChange={(event) =>
                    setDeliverableForm((value) => ({
                      ...value,
                      percentComplete: event.target.value,
                    }))
                  }
                />
                <div className="mt-2 flex justify-between text-xs font-bold text-slate-400">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
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
              onBlur={() =>
                setDeliverableForm((value) => ({
                  ...value,
                  sourceCodeUrl: normalizeExternalUrl(value.sourceCodeUrl),
                }))
              }
            />
          </Field>
          <Field label="Source code ZIP">
            <div className="grid gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <label
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-sm font-extrabold ${
                    deliverableOpenDeadlineExceeded
                      ? "cursor-not-allowed bg-slate-200 text-slate-400"
                      : "bg-white text-brand-600 shadow-sm hover:text-brand-700"
                  }`}
                >
                  <UploadCloud className="h-4 w-4" />
                  Chọn file ZIP
                  <input
                    type="file"
                    accept=".zip,application/zip,application/x-zip-compressed"
                    className="hidden"
                    disabled={deliverableOpenDeadlineExceeded}
                    onChange={(event) => {
                      const file = event.target.files?.[0] || null;
                      event.target.value = "";
                      setSourceArchiveError("");
                      if (!file) return;
                      if (!file.name.toLowerCase().endsWith(".zip")) {
                        setSourceArchiveFile(null);
                        setDeliverableForm((value) => ({
                          ...value,
                          sourceCodeFileUrl: "",
                          sourceCodeFileName: "",
                        }));
                        setSourceArchiveError("Vui lòng chọn file .zip.");
                        return;
                      }
                      if (file.size > 50 * 1024 * 1024) {
                        setSourceArchiveFile(null);
                        setDeliverableForm((value) => ({
                          ...value,
                          sourceCodeFileUrl: "",
                          sourceCodeFileName: "",
                        }));
                        setSourceArchiveError("File ZIP không được vượt quá 50MB.");
                        return;
                      }
                      setSourceArchiveFile(file);
                      setDeliverableForm((value) => ({
                        ...value,
                        sourceCodeFileUrl: "",
                        sourceCodeFileName: file.name,
                      }));
                    }}
                  />
                </label>
                {(sourceArchiveFile || deliverableForm.sourceCodeFileName) && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setSourceArchiveFile(null);
                      setDeliverableForm((value) => ({
                        ...value,
                        sourceCodeFileUrl: "",
                        sourceCodeFileName: "",
                      }));
                    }}
                  >
                    Xóa file
                  </Button>
                )}
              </div>
              {sourceArchiveFile ? (
                <p className="text-sm font-bold text-slate-600">
                  {sourceArchiveFile.name} · {(sourceArchiveFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              ) : deliverableForm.sourceCodeFileUrl ? (
                <FirebaseFileLink
                  path={deliverableForm.sourceCodeFileUrl}
                  buttonText="Xem ZIP"
                  showPath
                />
              ) : (
                <p className="text-sm font-semibold text-slate-500">
                  Chỉ hỗ trợ file .zip, tối đa 50MB.
                </p>
              )}
              {sourceArchiveError && (
                <p className="text-sm font-bold text-rose-600">{sourceArchiveError}</p>
              )}
            </div>
          </Field>
          {deliverableForm.type === "FINAL" && (
            <Field label="Demo URL (không bắt buộc)">
              <Input
                value={deliverableForm.demoLink}
                placeholder="Nhập liên kết demo..."
                onChange={(event) =>
                  setDeliverableForm((value) => ({
                    ...value,
                    demoLink: event.target.value,
                  }))
                }
                onBlur={() =>
                  setDeliverableForm((value) => ({
                    ...value,
                    demoLink: normalizeExternalUrl(value.demoLink),
                  }))
                }
              />
            </Field>
          )}
          {deliverableForm.type === "PROCESS" && (
            <Field label="Demo link">
              <Input
                value={deliverableForm.demoLink}
                onChange={(event) =>
                  setDeliverableForm((value) => ({
                    ...value,
                    demoLink: event.target.value,
                  }))
                }
                onBlur={() =>
                  setDeliverableForm((value) => ({
                    ...value,
                    demoLink: normalizeExternalUrl(value.demoLink),
                  }))
                }
              />
            </Field>
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
        open={Boolean(approveConfirmOpen)}
        onClose={() => !actionLoading && setApproveConfirmOpen(null)}
        title="Xác nhận nghiệm thu sản phẩm cuối cùng"
        description={
          approvingLastMilestone
            ? "Đây là cột mốc cuối cùng của hợp đồng. Sau khi nghiệm thu, hệ thống sẽ hoàn tất hợp đồng và xử lý hoàn ký quỹ cho hai bên."
            : "Sau khi xác nhận, cột mốc sẽ được nghiệm thu và hệ thống sẽ giải ngân ngân sách cột mốc theo Flow 4."
        }
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setApproveConfirmOpen(null)}
              disabled={Boolean(actionLoading)}
            >
              Hủy
            </Button>
            <Button
              onClick={() =>
                approveConfirmOpen &&
                approveMilestoneAndRefreshContract(approveConfirmOpen)
              }
              loading={
                approveConfirmOpen
                  ? actionLoading ===
                    `approve:${getSourceMilestoneId(approveConfirmOpen)}`
                  : false
              }
            >
              <CheckCircle2 className="h-4 w-4" />
              Xác nhận nghiệm thu
            </Button>
          </>
        }
      >
        {approveConfirmOpen && (
          <div className="grid gap-3">
            <Notice
              tone="warning"
              title={`Cột mốc ${approveConfirmOpen.orderIndex}: ${approveConfirmOpen.milestoneName}`}
            >
              Hãy chắc chắn source code, demo và nội dung bàn giao đã đáp ứng tiêu
              chí nghiệm thu. Sau khi nghiệm thu, thao tác này sẽ không còn là bước
              phản hồi sửa sản phẩm.
            </Notice>
            {approvingLastMilestone && (
              <Notice tone="success" title="Bước tiếp theo sau khi nghiệm thu">
                Hệ thống sẽ tự hoàn ký quỹ của Business và Chuyên gia, chuyển hợp
                đồng sang trạng thái “Đã đóng” và hiển thị kết quả trên Contract
                Detail.
              </Notice>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(feedbackOpen)}
        onClose={() => {
          setFeedbackOpen(null);
          setFeedbackRequired(false);
          setFailedCriteriaReasons({});
          setSelectedFailedCriteriaIds([]);
          setFailedCriteriaError("");
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
                setFailedCriteriaReasons({});
                setSelectedFailedCriteriaIds([]);
                setFailedCriteriaError("");
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
        {feedbackOpen && getSourceMilestoneId(feedbackOpen) !== undefined && (criteriaByMilestone[getSourceMilestoneId(feedbackOpen)!] || []).length > 0 && (
          <div className="mt-4 space-y-3">
            <div>
              <p className="text-sm font-extrabold text-ink">Tiêu chí chưa đạt <span className="text-rose-600">*</span></p>
              <p className="mt-1 text-sm font-medium text-slate-500">Bắt buộc chọn ít nhất một tiêu chí chưa đáp ứng và mô tả cụ thể việc cần chỉnh sửa.</p>
            </div>
            {(criteriaByMilestone[getSourceMilestoneId(feedbackOpen)!] || []).map((criterion: AcceptanceCriteria) => (
              <div key={criterion.criteriaId} className="rounded-2xl border border-slate-200 bg-white p-4">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-brand-600"
                    checked={selectedFailedCriteriaIds.includes(criterion.criteriaId)}
                    onChange={(event) => {
                      setFailedCriteriaError("");
                      setSelectedFailedCriteriaIds((current) => event.target.checked
                        ? [...current, criterion.criteriaId]
                        : current.filter((id) => id !== criterion.criteriaId));
                    }}
                  />
                  <span className="min-w-0">
                    {criterion.criteriaCode && <span className="mr-2 text-xs font-black uppercase tracking-wide text-brand-600">{criterion.criteriaCode}</span>}
                    <span className="font-bold text-ink">{criterion.description}</span>
                    {criterion.category && <span className="mt-1 block text-xs font-semibold text-slate-500">Nhóm: {criterion.category}</span>}
                  </span>
                </label>
                {selectedFailedCriteriaIds.includes(criterion.criteriaId) && (
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <Field label="Mô tả chi tiết cần chỉnh sửa">
                      <Textarea
                        value={failedCriteriaReasons[criterion.criteriaId] || ""}
                        onChange={(event) => {
                          setFailedCriteriaError("");
                          setFailedCriteriaReasons((current) => ({ ...current, [criterion.criteriaId]: event.target.value }));
                        }}
                        placeholder="Mô tả phần chưa đạt, bằng chứng hoặc yêu cầu Expert cần xử lý..."
                        className="min-h-24"
                      />
                    </Field>
                  </div>
                )}
              </div>
            ))}
            {failedCriteriaError && <p className="text-sm font-bold text-rose-600">{failedCriteriaError}</p>}
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(initiateDisputeOpen)}
        onClose={() => {
          setInitiateDisputeOpen(null);
          setInitiateDisputeOtherReason("");
          setInitiateDisputeModalWarning("");
        }}
        title="Tạo hồ sơ tranh chấp"
        description="Đây là hồ sơ tranh chấp chính thức. Sau khi tạo hồ sơ, bạn có thể yêu cầu Staff can thiệp nếu cần."
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
              Tạo hồ sơ tranh chấp
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
          setEscalateDisputeNote("");
        }}
        title="Yêu cầu Staff can thiệp"
        description="Hồ sơ đã được tạo. Vui lòng xác nhận lý do và ghi chú bổ sung để gửi Staff xử lý."
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setEscalateDisputeOpen(null);
                setDisputeReason("");
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
          <Field label="Tên cột mốc">
            <Input
              value={escalateDisputeOpen?.milestoneName || ""}
              readOnly
              className="bg-slate-50 text-slate-700"
            />
          </Field>
          <Field label="Trạng thái">
            <Input
              value={milestoneStatusLabel(escalateDisputeOpen?.status)}
              readOnly
              className="bg-slate-50 text-slate-700"
            />
          </Field>
          <Field label="Loại tranh chấp">
            <Input
              value={
                escalateDisputeOpen
                  ? formatDisputeType(
                      disputesByMilestone[getSourceMilestoneId(escalateDisputeOpen) || 0]
                        ?.initiationType,
                    ) || "Lý do khác"
                  : ""
              }
              readOnly
              className="bg-slate-50 text-slate-700"
            />
          </Field>
          <Field label="Lý do tranh chấp">
            <Textarea
              value={disputeReason}
              readOnly
              className="bg-slate-50 text-slate-700"
            />
          </Field>
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
        open={Boolean(progressFeedbackOpen)}
        onClose={() => !actionLoading && setProgressFeedbackOpen(null)}
        title="Phản hồi báo cáo tiến độ"
        description="Phản hồi tiến độ chỉ giúp Chuyên gia theo dõi và điều chỉnh công việc; không thay thế nghiệm thu sản phẩm cuối hoặc mở tranh chấp."
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setProgressFeedbackOpen(null)}
              disabled={Boolean(actionLoading)}
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
              Gửi phản hồi
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Field label="Nội dung phản hồi *">
            <Textarea
              value={progressFeedbackForm.feedback}
              onChange={(event) =>
                setProgressFeedbackForm((current) => ({
                  ...current,
                  feedback: event.target.value,
                }))
              }
              placeholder="Nêu rõ điểm đã đạt, điểm cần bổ sung hoặc đề xuất cải thiện..."
            />
          </Field>
          <label className="flex items-start gap-3 rounded-xl bg-amber-50 p-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={progressFeedbackForm.requiresAdjustment}
              onChange={(event) =>
                setProgressFeedbackForm((current) => ({
                  ...current,
                  requiresAdjustment: event.target.checked,
                }))
              }
              className="mt-1"
            />
            <span>
              Yêu cầu Chuyên gia điều chỉnh nội dung trong các báo cáo hoặc sản phẩm tiếp theo.
            </span>
          </label>
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




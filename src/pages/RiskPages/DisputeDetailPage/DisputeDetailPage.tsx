import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  ClipboardCheck,
  FileText,
  Gavel,
  Handshake,
  Link2,
  RefreshCw,
  Send,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  LinkButton,
  Notice,
  PageHeader,
  SectionHeading,
  Textarea,
  Tabs,
} from "../../../components/ui";
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

type NoticeTone = "success" | "danger" | "info" | "warning";

const FLOW_STEPS = [
  { key: "PENDING_SELF_RESOLVE", label: "Tạo hồ sơ" },
  { key: "ESCALATION_REQUESTED", label: "Gửi nhân viên" },
  { key: "STAFF_REVIEWING", label: "Nhân viên xem xét" },
  { key: "STAFF_DECIDED", label: "Ra quyết định" },
  { key: "RESOLVED", label: "Hoàn tất" },
];

// Chuẩn hóa status dispute để các điều kiện xử lý không phụ thuộc chữ hoa/thường.
// Chức năng 1: Chuẩn hóa trạng thái tranh chấp để so sánh trong UI.
function normalizeStatus(status?: string) {
  return (status || "").trim().toUpperCase();
}

// Đổi mã trạng thái dispute thành nhãn tiếng Việt trên màn chi tiết.
// Chức năng 2: Chuyển trạng thái tranh chấp sang nhãn tiếng Việt.
function formatStatus(status?: string) {
  switch (normalizeStatus(status)) {
    case "PENDING_SELF_RESOLVE":
      return "Tạo hồ sơ";
    case "ESCALATION_REQUESTED":
      return "Đã yêu cầu nhân viên hỗ trợ";
    case "STAFF_REVIEWING":
      return "Nhân viên đang xem xét";
    case "STAFF_DECIDED":
      return "Nhân viên đã quyết định";
    case "RESOLVED":
      return "Đã giải quyết";
    case "CANCELLED":
      return "Đã rút tranh chấp";
    default:
      return status || "Chưa cập nhật";
  }
}

// Đổi loại khởi tạo tranh chấp sang mô tả nghiệp vụ dễ hiểu.
function formatInitiationType(type?: string) {
  switch (normalizeStatus(type)) {
    case "BUSINESS_REJECTED_DELIVERABLE":
      return "Doanh nghiệp phản đối kết quả bàn giao";
    case "EXPERT_SCOPE_CONCERN":
      return "Chuyên gia phản ánh yêu cầu ngoài phạm vi";
    case "EXPERT_NO_REVIEW_RESPONSE":
      return "Doanh nghiệp chưa phản hồi nghiệm thu";
    case "EXPERT_BAD_FAITH_REJECTION":
      return "Từ chối không phù hợp tiêu chí";
    case "OTHER":
      return "Lý do khác";
    default:
      return type || "Chưa phân loại";
  }
}

// Kiểm tra nội dung lý do có chỉ là mã initiationType thô hay không.
function isRawInitiationTypeText(text?: string, initiationType?: string) {
  const normalizedText = normalizeStatus(text);
  if (!normalizedText) return false;
  return (
    normalizedText === normalizeStatus(initiationType) ||
    [
      "BUSINESS_REJECTED_DELIVERABLE",
      "EXPERT_SCOPE_CONCERN",
      "EXPERT_NO_REVIEW_RESPONSE",
      "EXPERT_BAD_FAITH_REJECTION",
      "OTHER",
    ].includes(normalizedText)
  );
}

// Lấy nội dung lý do tranh chấp ưu tiên từ evidence/escalation và loại bỏ mã loại thô.
// Chức năng 3: Lấy nội dung lý do tranh chấp ưu tiên từ các trường dữ liệu.
function disputeReasonContent(dispute: Dispute) {
  const candidates = [
    dispute.evidenceReport?.trim(),
    dispute.escalationReason?.trim(),
  ].filter(Boolean) as string[];
  const narrative = candidates.find(
    (item) => !isRawInitiationTypeText(item, dispute.initiationType),
  );
  return narrative || formatInitiationType(dispute.initiationType);
}

// Đổi bên khởi tạo tranh chấp sang nhãn hiển thị.
function formatInitiator(value?: string) {
  switch (normalizeStatus(value)) {
    case "BUSINESS":
      return "Doanh nghiệp";
    case "EXPERT":
      return "Chuyên gia";
    default:
      return "Người tạo tranh chấp";
  }
}

// Trả về metadata hiển thị tương ứng với từng trạng thái dispute.
// Chức năng 4: Tạo thông tin mô tả theo trạng thái hiện tại của tranh chấp.
function statusInfo(status?: string): {
  tone: NoticeTone;
  title: string;
  message: string;
} {
  switch (normalizeStatus(status)) {
    case "PENDING_SELF_RESOLVE":
      return {
        tone: "warning",
        title: "Hồ sơ tranh chấp đã được tạo",
        message:
      "Hồ sơ đã được tạo nhưng chưa gửi đến nhân viên. Vui lòng gửi yêu cầu can thiệp để nhân viên tiếp nhận xử lý.",
      };
    case "ESCALATION_REQUESTED":
      return {
        tone: "warning",
    title: "Đã gửi yêu cầu nhân viên can thiệp",
        message:
      "Hệ thống sẽ phân công hồ sơ cho nhân viên phù hợp. Nhân viên không cần duyệt hay từ chối yêu cầu can thiệp.",
      };
    case "STAFF_REVIEWING":
      return {
        tone: "info",
        title: "Nhân viên đang xem xét hồ sơ",
        message:
          "Nhân viên đối chiếu bài nộp, tiêu chí nghiệm thu và bằng chứng để ra quyết định tỷ lệ xử lý tiền ký quỹ.",
      };
    case "STAFF_DECIDED":
      return {
        tone: "warning",
        title: "Nhân viên đã ra quyết định",
        message:
          "Hệ thống đang hoàn tất quyết toán theo tỷ lệ nhân viên đã quyết định.",
      };
    case "RESOLVED":
      return {
        tone: "success",
        title: "Tranh chấp đã được xử lý",
        message:
          "Kết quả quyết định và quyết toán đã được ghi nhận cho các bên liên quan.",
      };
    case "CANCELLED":
      return {
        tone: "danger",
        title: "Tranh chấp đã được rút",
    message: "Hồ sơ này không còn trong luồng nhân viên can thiệp.",
      };
    default:
      return {
        tone: "info",
        title: "Trạng thái tranh chấp",
        message: "Theo dõi trạng thái xử lý và các cập nhật mới nhất tại đây.",
      };
  }
}

// Lấy id milestone gốc của Job để đối chiếu dispute với milestone hợp đồng.
function getJobMilestoneId(milestone: Milestone) {
  return Number(
    (milestone as Milestone & { jobMilestoneId?: number }).jobMilestoneId ??
      milestone.milestoneId,
  );
}

function formatDateOnly(value?: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

// Hiển thị tiến trình xử lý tranh chấp từ tạo hồ sơ đến Staff quyết định và hoàn tất.
// Chức năng 5: Hiển thị tiến trình xử lý tranh chấp theo từng trạng thái.
function Stepper({
  status,
  dates = {},
}: {
  status?: string;
  dates?: Record<string, string | undefined>;
}) {
  const currentStatus = normalizeStatus(status);
  const rawIndex = FLOW_STEPS.findIndex((step) => step.key === currentStatus);
  const activeIndex =
    currentStatus === "CANCELLED" ? -1 : rawIndex >= 0 ? rawIndex : 0;
  const progressPercent =
    activeIndex <= 0
      ? 0
      : Math.min(100, (activeIndex / (FLOW_STEPS.length - 1)) * 100);

  return (
    <div className="overflow-x-auto pb-2">
      <div className="relative min-w-[760px] px-4 pb-2 pt-3">
        <div className="absolute left-[9%] right-[9%] top-[31px] h-1 rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-pink-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="relative z-10 grid grid-cols-5 gap-3">
          {FLOW_STEPS.map((step, index) => {
            const done = activeIndex >= 0 && index < activeIndex;
            const active = activeIndex >= 0 && index === activeIndex;

            return (
              <div
                key={step.key}
                className="flex min-w-0 flex-col items-center text-center"
              >
                <span
                  className={[
                    "grid h-10 w-10 place-items-center rounded-full border-4 bg-white text-sm font-black shadow-sm transition",
                    done ? "border-pink-200 bg-pink-50 text-pink-600" : "",
                    active
                      ? "border-pink-500 text-pink-600 ring-4 ring-pink-50"
                      : "",
                    !done && !active ? "border-slate-100 text-slate-400" : "",
                  ].join(" ")}
                >
                  {done ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : active ? (
                    <Circle className="h-4 w-4 fill-current" />
                  ) : (
                    index + 1
                  )}
                </span>

                <p
                  className={[
                    "mt-3 text-xs font-extrabold leading-5",
                    active ? "text-pink-700" : "text-slate-700",
                  ].join(" ")}
                >
                  {step.label}
                </p>
                <p
                  className={[
                    "mt-1 text-[11px] font-bold",
                    dates[step.key] ? "text-sky-600" : "text-slate-400",
                  ].join(" ")}
                >
                  {dates[step.key] ? formatDateOnly(dates[step.key]) : ""}
                </p>
                <p
                  className={[
                    "mt-1 text-[11px] font-bold",
                    done || currentStatus === "RESOLVED"
                      ? "text-green-600"
                      : active
                        ? "text-pink-700"
                        : "text-amber-600",
                  ].join(" ")}
                >
                  {done || currentStatus === "RESOLVED"
                    ? "Hoàn tất"
                    : active
                      ? "Đang xử lý"
                      : "Chưa đến"}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Chức năng 6: Hiển thị và xử lý chi tiết một hồ sơ tranh chấp.
export function DisputeDetailPage({
  staffMode = false,
}: {
  staffMode?: boolean;
}) {
  const { disputeId } = useParams();
  const navigate = useNavigate();
  const session = useSession();
  const [contract, setContract] = useState<Contract | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [criteria, setCriteria] = useState<AcceptanceCriteria[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [progressReports, setProgressReports] = useState<
    MilestoneProgressReport[]
  >([]);
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [evidenceItems, setEvidenceItems] = useState<CaseAttachment[]>([]);
  const [evidenceTab, setEvidenceTab] = useState<"EXPERT" | "BUSINESS">(
    "EXPERT",
  );
  const [submissionExpanded, setSubmissionExpanded] = useState(true);
  const [staffDecisionExpanded, setStaffDecisionExpanded] = useState(true);
  const [notice, setNotice] = useState<{
    tone: NoticeTone;
    title: string;
    message?: string;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [decisionForm, setDecisionForm] = useState({
    staffReport: "",
    note: "",
    expertPercent: "50",
  });
  const [decisionErrors, setDecisionErrors] = useState({
    staffReport: "",
    note: "",
    expertPercent: "",
  });
  const [interventionForm, setInterventionForm] = useState({
    reason: "",
    evidenceFile: "",
    note: "",
  });
  const [evidenceForm, setEvidenceForm] = useState({
    fileUrl: "",
    fileName: "",
    fileType: "TEXT_LOG",
    note: "",
  });

  // Tải chi tiết tranh chấp, bằng chứng, hợp đồng, milestone và dữ liệu bàn giao liên quan.
  //hàm Staff có thể xem chi tiết tranh chấp
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
        setDecisionForm({
          staffReport: disputeData.staffReport || "",
          note: disputeData.staffDecisionNote || "",
          expertPercent:
            typeof disputeData.staffDecisionPercentage === "number"
              ? String(disputeData.staffDecisionPercentage)
              : "50",
        });
        setInterventionForm({
          reason: disputeReasonContent(disputeData),
          evidenceFile: disputeData.escalationEvidenceFile || "",
          note: "",
        });

        const [contractData, milestoneData] = await Promise.all([
          contractApi.getContract(disputeData.contractId).catch(() => null),
          contractApi.listMilestones(disputeData.contractId).catch(() => []),
        ]);
        setContract(contractData);
        setMilestones(milestoneData);

        if (disputeData.milestoneId) {
          const [criteriaData, deliverableData, reportData] = await Promise.all(
            [
              contractApi.listCriteria(disputeData.milestoneId).catch(() => []),
              contractApi
                .listDeliverables(disputeData.milestoneId)
                .catch(() => []),
              contractApi
                .listProgressReports(
                  disputeData.contractId,
                  disputeData.milestoneId,
                )
                .catch(() => []),
            ],
          );
          setCriteria(criteriaData);
          setDeliverables(deliverableData);
          setProgressReports(reportData);
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

  const refreshDisputeDetail = async () => {
    const id = Number(disputeId);
    if (!Number.isFinite(id) || id <= 0) return;

    setRefreshing(true);
    try {
      const [disputeData, evidenceData] = await Promise.all([
        disputeApi.get(id),
        disputeApi.listEvidence(id).catch(() => []),
      ]);
      setDispute(disputeData);
      setEvidenceItems(evidenceData);
      setDecisionForm({
        staffReport: disputeData.staffReport || "",
        note: disputeData.staffDecisionNote || "",
        expertPercent:
          typeof disputeData.staffDecisionPercentage === "number"
            ? String(disputeData.staffDecisionPercentage)
            : "50",
      });
      setInterventionForm({
        reason: disputeReasonContent(disputeData),
        evidenceFile: disputeData.escalationEvidenceFile || "",
        note: "",
      });

      const [contractData, milestoneData] = await Promise.all([
        contractApi.getContract(disputeData.contractId).catch(() => null),
        contractApi.listMilestones(disputeData.contractId).catch(() => []),
      ]);
      setContract(contractData);
      setMilestones(milestoneData);

      if (disputeData.milestoneId) {
        const [criteriaData, deliverableData, reportData] = await Promise.all([
          contractApi.listCriteria(disputeData.milestoneId).catch(() => []),
          contractApi.listDeliverables(disputeData.milestoneId).catch(() => []),
          contractApi
            .listProgressReports(disputeData.contractId, disputeData.milestoneId)
            .catch(() => []),
        ]);
        setCriteria(criteriaData);
        setDeliverables(deliverableData);
        setProgressReports(reportData);
      } else {
        setCriteria([]);
        setDeliverables([]);
        setProgressReports([]);
      }
    } catch {
      setNotice({
        tone: "danger",
        title: "Không thể làm mới dữ liệu tranh chấp.",
        message: "Vui lòng thử lại sau ít phút.",
      });
    } finally {
      setRefreshing(false);
    }
  };

  // Sắp xếp báo cáo tiến độ mới nhất lên trước để Staff dễ kiểm tra.
  const sortedProgressReports = useMemo(
    () =>
      [...progressReports].sort((a, b) =>
        (b.createdAt || "").localeCompare(a.createdAt || ""),
      ),
    [progressReports],
  );
  // Sắp xếp deliverable mới nhất lên trước để Staff xem bài nộp hiện hành.
  const sortedDeliverables = useMemo(
    () =>
      [...deliverables].sort((a, b) =>
        (b.createdAt || "").localeCompare(a.createdAt || ""),
      ),
    [deliverables],
  );

  if (!dispute) {
    return (
      <EmptyState
        title="Không tìm thấy tranh chấp"
        description="Không lấy được dữ liệu hồ sơ tranh chấp từ hệ thống."
      />
    );
  }

  const role = session?.role;
  const status = normalizeStatus(dispute.status);
  const isAdmin = role === "ADMIN";
  const isStaff = role === "STAFF" || (staffMode && !isAdmin);
  const isParticipant = role === "BUSINESS" || role === "EXPERT";
  const canRequestIntervention =
    isParticipant && status === "PENDING_SELF_RESOLVE";
  const canAddEvidence =
    isParticipant &&
    [
      "PENDING_SELF_RESOLVE",
      "ESCALATION_REQUESTED",
      "STAFF_REVIEWING",
    ].includes(status);
  const canStaffRoute = false;
  const canStaffDecide = isStaff && status === "STAFF_REVIEWING";
  const canContinueProject = isParticipant && status === "RESOLVED";
  const canCancel =
    isParticipant &&
    !dispute.assignedStaffId &&
    ["PENDING_SELF_RESOLVE", "ESCALATION_REQUESTED"].includes(status) &&
    (dispute.initiatedByAccountId
      ? dispute.initiatedByAccountId === session?.accountId
      : dispute.initiatedBy === role);

  const info = statusInfo(dispute.status);
  const contractTitle =
    contract?.contractTitle ||
    contract?.title ||
    dispute.jobTitle ||
    "Hợp đồng đang tranh chấp";
  const disputedMilestone = milestones.find(
    (item) => getJobMilestoneId(item) === Number(dispute.milestoneId),
  );
  const finalExpertPercent = dispute.staffDecisionPercentage;
  const finalBusinessPercent =
    typeof finalExpertPercent === "number"
      ? 100 - finalExpertPercent
      : undefined;
  const settlementAmount =
    role === "EXPERT"
      ? dispute.staffProposedExpertAmount
      : role === "BUSINESS"
        ? dispute.businessRefundAmount
        : undefined;
  const hasStaffDecisionData = Boolean(
    dispute.staffReport?.trim() ||
    dispute.staffDecisionNote?.trim() ||
    typeof dispute.staffDecisionPercentage === "number" ||
    typeof dispute.staffProposedExpertAmount === "number" ||
    typeof dispute.businessRefundAmount === "number",
  );
  const shouldShowParticipantStaffDecision =
    isParticipant &&
    ["STAFF_DECIDED", "RESOLVED"].includes(status) &&
    hasStaffDecisionData;
  const baseDisputeReason = disputeReasonContent(dispute);
  const escalationReasonText = dispute.escalationReason?.trim();
  const supplementalReasonText =
    escalationReasonText && escalationReasonText !== baseDisputeReason
      ? escalationReasonText.includes("Ghi chú bổ sung:")
        ? escalationReasonText
            .slice(
              escalationReasonText.indexOf("Ghi chú bổ sung:") +
                "Ghi chú bổ sung:".length,
            )
            .trim()
        : escalationReasonText
      : "";
  const disputedMilestoneNumber =
    typeof disputedMilestone?.orderIndex === "number"
      ? disputedMilestone.orderIndex
      : dispute.milestoneId;
  const stepperDates = {
    PENDING_SELF_RESOLVE: dispute.createdAt,
    ESCALATION_REQUESTED: dispute.escalationRequestedAt,
    STAFF_REVIEWING: dispute.staffReviewStartedAt,
    STAFF_DECIDED: dispute.staffDecidedAt,
    RESOLVED: dispute.settlementExecutedAt || dispute.resolvedAt,
  };
  const timelineItems = (() => {
    const items: Array<{
      key: string;
      title: string;
      time?: string;
      dotClass: string;
    }> = [];

    const addItem = (
      key: string,
      title: string,
      time: string | undefined,
      dotClass: string,
    ) => {
      if (!time) return;
      items.push({ key, title, time, dotClass });
    };

    if (isStaff) {
      addItem(
        "staff-review-started",
        "Nhận hồ sơ xử lý",
        dispute.staffReviewStartedAt || dispute.escalationRequestedAt,
        "bg-pink-500 ring-pink-50",
      );
      if (status === "STAFF_REVIEWING") {
        addItem(
          "evidence-due",
          "Hạn bổ sung bằng chứng",
          dispute.evidenceCollectionDueAt,
          "bg-slate-400 ring-slate-100",
        );
        addItem(
          "staff-sla-due",
          dispute.staffSlaEscalatedAt
        ? "Quá hạn xử lý của nhân viên"
        : "Hạn xử lý của nhân viên",
          dispute.staffSlaDueAt,
          dispute.staffSlaEscalatedAt
            ? "bg-rose-500 ring-rose-50"
            : "bg-amber-400 ring-amber-50",
        );
        addItem(
          "staff-access-expires",
          "Hạn truy cập hồ sơ",
          dispute.staffAccessExpiresAt,
          "bg-violet-500 ring-violet-50",
        );
      }
      addItem(
        "staff-decided",
        "Đã ra quyết định",
        dispute.staffDecidedAt,
        "bg-mint-500 ring-mint-50",
      );
      addItem(
        "settlement-executed",
        "Hoàn tất xử lý",
        dispute.settlementExecutedAt || dispute.resolvedAt,
        "bg-mint-600 ring-mint-50",
      );
      return items;
    }

    if (isAdmin) {
      addItem(
        "created",
        "Mở hồ sơ tranh chấp",
        dispute.createdAt,
        "bg-amber-400 ring-amber-50",
      );
      addItem(
        "escalation-requested",
      "Yêu cầu nhân viên can thiệp",
        dispute.escalationRequestedAt,
        "bg-pink-500 ring-pink-50",
      );
      addItem(
        "staff-review-started",
      "Nhân viên bắt đầu xem xét",
        dispute.staffReviewStartedAt,
        "bg-violet-500 ring-violet-50",
      );
      addItem(
        "staff-decided",
      "Nhân viên ra quyết định",
        dispute.staffDecidedAt,
        "bg-mint-500 ring-mint-50",
      );
      addItem(
        "settlement-executed",
        "Hoàn tất quyết toán",
        dispute.settlementExecutedAt || dispute.resolvedAt,
        "bg-mint-600 ring-mint-50",
      );
      return items;
    }

    addItem(
      "created",
      "Mở hồ sơ tranh chấp",
      dispute.createdAt,
      "bg-amber-400 ring-amber-50",
    );
    addItem(
      "escalation-requested",
      "Yêu cầu nhân viên can thiệp",
      dispute.escalationRequestedAt,
      "bg-pink-500 ring-pink-50",
    );
    addItem(
      "staff-review-started",
      "Nhân viên đang xem xét",
      dispute.staffReviewStartedAt,
      "bg-violet-500 ring-violet-50",
    );
    addItem(
      "staff-decided",
      "Nhân viên đã ra quyết định",
      dispute.staffDecidedAt,
      "bg-mint-500 ring-mint-50",
    );
    addItem(
      "settlement-executed",
      "Tranh chấp đã giải quyết",
      dispute.settlementExecutedAt || dispute.resolvedAt,
      "bg-mint-600 ring-mint-50",
    );
    return items;
  })();

  // Quay lại workspace hợp đồng sau khi tranh chấp đã được giải quyết.
  // Chức năng 7: Điều hướng người dùng quay lại workspace để tiếp tục dự án.
  const continueProject = () => {
    navigate(`/app/contracts/${dispute.contractId}/workspace`, {
      state: {
        disputeResolvedNotice: {
          milestoneNumber: disputedMilestoneNumber,
        },
      },
    });
  };

  //hàm Gửi yêu cầu Staff can thiệp
  // Chức năng 8: Gửi yêu cầu Staff can thiệp vào tranh chấp.
  const requestIntervention = async () => {
    if (!interventionForm.reason.trim()) {
      setNotice({
        tone: "warning",
        title: "Vui lòng nhập lý do yêu cầu nhân viên can thiệp.",
      });
      return;
    }
    setActionLoading("request-intervention");
    try {
      const escalationReason = interventionForm.note.trim()
        ? `${interventionForm.reason.trim()}\n\nGhi chú bổ sung: ${interventionForm.note.trim()}`
        : interventionForm.reason.trim();
      const saved = await disputeApi.escalate(
        dispute.disputeId,
        escalationReason,
        interventionForm.evidenceFile.trim() || undefined,
      );
      setDispute(saved);
      setNotice({
        tone: "success",
        title: "Đã gửi yêu cầu nhân viên can thiệp.",
        message:
          "Hệ thống sẽ tự động phân công hồ sơ cho nhân viên phù hợp theo cấu hình máy chủ.",
      });
    } catch (error) {
      setNotice({ tone: "danger", title: getApiErrorMessage(error) });
    } finally {
      setActionLoading(null);
    }
  };

  // Nhận/gán hồ sơ tranh chấp cho Staff hiện tại khi backend cho phép route thủ công.
  // Chức năng 9: Gán tranh chấp cho Staff hiện tại xử lý.
  const routeToMe = async () => {
    setActionLoading("route-staff");
    try {
      const saved = await disputeApi.routeStaff(dispute.disputeId);
      setDispute(saved);
      setNotice({
        tone: "success",
        title: "Đã nhận xử lý tranh chấp.",
        message:
          "Bạn có thể kiểm tra bài nộp, bằng chứng và ra quyết định khi hồ sơ đủ rõ.",
      });
    } catch (error) {
      setNotice({ tone: "danger", title: getApiErrorMessage(error) });
    } finally {
      setActionLoading(null);
    }
  };

  // hàm Staff ra quyết định xử lý tranh chấp và tỷ lệ quyết toán tiền ký quỹ.
  // Chức năng 10: Staff gửi quyết định phân bổ tiền và báo cáo xử lý tranh chấp.
  const submitStaffDecision = async () => {
    let hasError = false;
    const errors = { staffReport: "", expertPercent: "", note: "" };

    const expertPercent = Number(decisionForm.expertPercent);
    if (
      !decisionForm.expertPercent ||
      !Number.isFinite(expertPercent) ||
      expertPercent < 0 ||
      expertPercent > 100
    ) {
      errors.expertPercent = "Vui lòng nhập tỷ lệ hợp lệ (0-100).";
      hasError = true;
    }
    if (!decisionForm.staffReport.trim()) {
      errors.staffReport = "Vui lòng nhập báo cáo kỹ thuật.";
      hasError = true;
    }
    if (!decisionForm.note.trim()) {
      errors.note = "Vui lòng nhập ghi chú quyết định.";
      hasError = true;
    }

    setDecisionErrors(errors);
    if (hasError) return;

    setActionLoading("staff-decision");
    try {
      //hàm Staff ra quyết định xử lý tranh chấp và tỷ lệ quyết toán tiền ký quỹ.
      const saved = await disputeApi.staffDecision(
        dispute.disputeId,
        expertPercent,
        decisionForm.note.trim() || undefined,
        decisionForm.staffReport.trim(),
      );
      setDispute(saved);
      setNotice({
        tone: "success",
        title: "Đã ra quyết định tranh chấp.",
        message: "Máy chủ sẽ tự động thực hiện quyết toán theo tỷ lệ đã chọn.",
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setNotice({ tone: "danger", title: getApiErrorMessage(error) });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setActionLoading(null);
    }
  };

  // Rút tranh chấp khi chưa có Staff xử lý hoặc hai bên không cần can thiệp nữa.
  // Chức năng 11: Rút hoặc hủy hồ sơ tranh chấp khi chưa tiếp tục can thiệp.
  const cancelDispute = async () => {
    const reason = window.prompt(
      "Lý do rút tranh chấp:",
      "Không cần nhân viên xử lý nữa.",
    );
    if (reason === null) return;
    setActionLoading("cancel-dispute");
    try {
      const saved = await disputeApi.cancel(
        dispute.disputeId,
        reason.trim() || undefined,
      );
      setDispute(saved);
      setNotice({
        tone: "success",
        title: "Đã rút tranh chấp.",
        message: "Hồ sơ không còn được xử lý trong luồng nhân viên can thiệp.",
      });
    } catch (error) {
      setNotice({ tone: "danger", title: getApiErrorMessage(error) });
    } finally {
      setActionLoading(null);
    }
  };

  // Thêm bằng chứng vào hồ sơ tranh chấp để Staff có thêm dữ liệu đánh giá.
  // Chức năng 12: Thêm bằng chứng vào hồ sơ tranh chấp để Staff đánh giá.
  const submitEvidence = async () => {
    if (!evidenceForm.fileUrl.trim()) {
      setNotice({
        tone: "warning",
        title: "Vui lòng nhập đường dẫn bằng chứng.",
      });
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
        title: "Đã thêm bằng chứng vào hồ sơ.",
        message: "Nhân viên có thể dùng bằng chứng này trong quá trình đánh giá.",
      });
    } catch (error) {
      setNotice({ tone: "danger", title: getApiErrorMessage(error) });
    } finally {
      setActionLoading(null);
    }
  };

  const staffDecisionCard = (
    <Card className="border border-pink-200 bg-gradient-to-br from-pink-50 via-white to-white p-6 shadow-sm md:p-7">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <SectionHeading
          title="Quyết định của nhân viên"
          description="Kết luận kỹ thuật, ghi chú quyết định và kết quả tiền ký quỹ sau xử lý."
        />
        <Button
          variant="secondary"
          onClick={() => setStaffDecisionExpanded((value) => !value)}
        >
          {staffDecisionExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
          {staffDecisionExpanded ? "Thu gọn" : "Mở chi tiết"}
        </Button>
      </div>

      {staffDecisionExpanded && (
        <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid gap-4">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                Báo cáo kỹ thuật
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-6 text-slate-700">
                {dispute.staffReport ||
          "Nhân viên chưa ra quyết định cho hồ sơ này."}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                Ghi chú quyết định
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-6 text-slate-700">
                {dispute.staffDecisionNote || "Chưa có ghi chú quyết định."}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-pink-100 bg-white p-5 shadow-sm">
            <p className="text-sm font-extrabold text-slate-800">
              Kết quả tiền ký quỹ
            </p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-mint-50 p-3 text-center">
                <p className="text-xs font-black uppercase text-mint-700">
                  Chuyên gia nhận
                </p>
                <p className="mt-1 font-display text-xl font-black text-ink">
                  {typeof finalExpertPercent === "number"
                    ? `${finalExpertPercent}%`
                    : "Chưa có"}
                </p>
                {typeof dispute.staffProposedExpertAmount === "number" && (
                  <p className="mt-1 text-xs font-bold text-slate-600">
                    {formatCurrency(dispute.staffProposedExpertAmount)}
                  </p>
                )}
              </div>
              <div className="rounded-xl bg-rose-50 p-3 text-center">
                <p className="text-xs font-black uppercase text-rose-700">
                  Doanh nghiệp được hoàn
                </p>
                <p className="mt-1 font-display text-xl font-black text-ink">
                  {typeof finalBusinessPercent === "number"
                    ? `${finalBusinessPercent}%`
                    : "Chưa có"}
                </p>
                {typeof dispute.businessRefundAmount === "number" && (
                  <p className="mt-1 text-xs font-bold text-slate-600">
                    {formatCurrency(dispute.businessRefundAmount)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 pb-10">
      <Card className="overflow-hidden border border-pink-100 bg-gradient-to-br from-white via-white to-pink-50/70 p-6 md:p-8">
        <PageHeader
          eyebrow="Hồ sơ tranh chấp"
          title={contractTitle}
          description="Theo dõi tiến trình xử lý, thực hiện đúng hành động theo vai trò và xem toàn bộ hồ sơ đối chiếu tại một nơi."
          actions={
            <>
              <LinkButton
                to={
                  isStaff
                    ? `/app/tickets/${dispute.disputeId}/project`
                    : `/app/disputes/${dispute.disputeId}/project`
                }
                variant="secondary"
              >
                <FileText className="h-4 w-4" />
                Xem thông tin dự án
              </LinkButton>

              <Button
                variant="secondary"
                onClick={refreshDisputeDetail}
                loading={refreshing}
              >
                <RefreshCw className="h-4 w-4" />
                Làm mới
              </Button>

              {canContinueProject && (
                <Button variant="secondary" onClick={continueProject}>
                  <CheckCircle2 className="h-4 w-4" />
                  Tiếp tục dự án
                </Button>
              )}

              {canStaffRoute && (
                <Button
                  onClick={routeToMe}
                  loading={actionLoading === "route-staff"}
                >
                  <ShieldCheck className="h-4 w-4" />
                  Nhận xử lý
                </Button>
              )}

              {canCancel && (
                <Button
                  variant="danger"
                  onClick={cancelDispute}
                  loading={actionLoading === "cancel-dispute"}
                >
                  <XCircle className="h-4 w-4" />
                  Rút tranh chấp
                </Button>
              )}
            </>
          }
        />

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl border border-pink-100 bg-white/90 p-4 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
              Trạng thái hiện tại
            </p>
            <div className="mt-3">
              <Badge tone="brand">{formatStatus(dispute.status)}</Badge>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white/90 p-4 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
              Mốc tranh chấp
            </p>
            <p className="mt-2 text-sm font-extrabold leading-6 text-slate-800">
              {disputedMilestone?.milestoneName || "Chưa cập nhật"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white/90 p-4 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
              Nhân viên phụ trách
            </p>
            <p className="mt-2 text-sm font-extrabold leading-6 text-slate-800">
              {dispute.staffName ||
                "Vui lòng yêu cầu can thiệp để phân công nhân viên có chuyên môn phù hợp"}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Badge tone="amber">
            Khởi tạo bởi: {formatInitiator(dispute.initiatedBy)}
          </Badge>
          {disputedMilestone?.dueAt && (
            <Badge tone="slate">
              Hạn mốc: {formatDateTime(disputedMilestone.dueAt)}
            </Badge>
          )}
          {disputedMilestone && (
            <Badge tone="mint">
              Ngân sách:{" "}
              {formatCurrency(
                disputedMilestone.finalBudget ||
                  disputedMilestone.fundsAllocated ||
                  0,
              )}
            </Badge>
          )}
        </div>

        <div className="mt-4 rounded-2xl border border-slate-100 bg-white/90 p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
            Nguyên nhân tranh chấp
          </p>
          <p className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-7 text-slate-800">
            {baseDisputeReason}
          </p>
          {supplementalReasonText && (
            <div className="mt-5 border-t border-slate-100 pt-5">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                Ghi chú bổ sung
              </p>
              <p className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-7 text-slate-800">
                {supplementalReasonText}
              </p>
            </div>
          )}
        </div>
      </Card>

      {notice && (
        <Notice tone={notice.tone} title={notice.title}>
          {notice.message}
        </Notice>
      )}

      <Card className="border border-slate-100 p-5 md:p-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-pink-600">
              Tình trạng hồ sơ
            </p>
            <h2 className="mt-1 font-display text-xl font-black text-ink">
              {info.title}
            </h2>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-600">
              {info.message}
            </p>
          </div>
          <Notice tone={info.tone} title="Việc cần lưu ý">
            {status === "PENDING_SELF_RESOLVE"
          ? "Gửi yêu cầu can thiệp để nhân viên phù hợp tiếp nhận và xử lý hồ sơ."
              : status === "STAFF_REVIEWING"
            ? "Nhân viên đang đối chiếu hồ sơ. Hai bên vẫn có thể bổ sung bằng chứng khi được phép."
                : status === "RESOLVED"
                  ? "Kiểm tra kết quả quyết toán và tiếp tục dự án khi cần."
                  : "Theo dõi các cập nhật mới nhất của hồ sơ tại trang này."}
          </Notice>
        </div>
      </Card>

      {status === "RESOLVED" && typeof settlementAmount === "number" && (
        <Notice tone="success" title="Đã nhận được tiền quyết toán">
          Đã nhận được {formatCurrency(settlementAmount)} từ quyết định của nhân
          viên. Vui lòng kiểm tra ở lịch sử Ví & Thanh toán.
        </Notice>
      )}

      <Card className="overflow-hidden border border-slate-100 p-5 md:p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
              Tiến trình xử lý
            </p>
            <h2 className="mt-1 font-display text-xl font-black text-ink">
              Hồ sơ đang ở bước “{formatStatus(dispute.status)}”
            </h2>
          </div>
          <Badge tone={status === "CANCELLED" ? "rose" : "brand"}>
            {status === "CANCELLED" ? "Luồng đã dừng" : "Đang được theo dõi"}
          </Badge>
        </div>
        <Stepper status={dispute.status} dates={stepperDates} />
      </Card>

      {shouldShowParticipantStaffDecision && staffDecisionCard}

      {isParticipant && (
        <Card className="border border-pink-100 p-6 shadow-sm md:p-7">
          <div className="flex items-start justify-between gap-3">
            <SectionHeading
              title="Bạn cần làm gì tiếp theo?"
              description="Hệ thống chỉ hiển thị hành động phù hợp với vai trò và trạng thái hiện tại."
            />
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-pink-50 text-pink-600">
              <Handshake className="h-5 w-5" />
            </span>
          </div>

          <div className="mt-5 space-y-4">
            {canRequestIntervention && (
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                <p className="font-extrabold text-amber-900">
                  Yêu cầu nhân viên can thiệp
                </p>
                <p className="mt-1 text-sm font-medium leading-6 text-amber-800">
                  Gửi hồ sơ để nhân viên phù hợp tiếp nhận và xử lý
                  tranh chấp. Hồ sơ sẽ dùng lại lý do tranh chấp đã mở và ghi
                  chú bổ sung nếu có.
                </p>

                <div className="mt-4 grid gap-3">
                  <div className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-extrabold text-slate-800">
                        Lý do tranh chấp
                      </p>
                      <Badge tone="amber">
                        {formatInitiationType(dispute.initiationType)}
                      </Badge>
                    </div>
                    <div className="mt-3 min-h-28 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="whitespace-pre-wrap text-sm font-semibold leading-7 text-slate-700">
                        {interventionForm.reason ||
                          "Chưa có nội dung lý do tranh chấp."}
                      </p>
                    </div>
                    <p className="mt-2 text-xs font-semibold text-amber-700">
                      Nội dung này được lấy từ lý do đã nhập khi mở tranh chấp.
                    </p>
                  </div>

                  {interventionForm.evidenceFile && (
              <Field label="Bằng chứng đã gửi nhân viên">
                      <Input
                        value={interventionForm.evidenceFile}
                        readOnly
                        className="bg-white/70 text-slate-700"
                      />
                    </Field>
                  )}

                  <Field label="Ghi chú bổ sung">
                    <Textarea
                      value={interventionForm.note}
                      onChange={(event) =>
                        setInterventionForm((value) => ({
                          ...value,
                          note: event.target.value,
                        }))
                      }
                  placeholder="Có thể bỏ trống. Nhập thêm nội dung muốn nhân viên lưu ý nếu cần..."
                    />
                  </Field>

                  <Button
                    onClick={requestIntervention}
                    loading={actionLoading === "request-intervention"}
                    className="w-full"
                  >
                    <Send className="h-4 w-4" />
                    Gửi yêu cầu can thiệp
                  </Button>
                </div>
              </div>
            )}

            {status === "PENDING_SELF_RESOLVE" && !canRequestIntervention && (
              <Notice tone="info" title="Hồ sơ đang chờ gửi nhân viên">
                Khi doanh nghiệp hoặc chuyên gia gửi yêu cầu nhân viên can thiệp, hồ sơ sẽ
                chuyển sang bước tiếp theo.
              </Notice>
            )}

            {status === "ESCALATION_REQUESTED" && (
              <Notice tone="warning" title="Đã gửi yêu cầu can thiệp">
                Hệ thống đang phân công nhân viên phù hợp. Bạn có thể tiếp tục bổ
                sung bằng chứng khi cần.
              </Notice>
            )}

            {status === "STAFF_REVIEWING" && (
              <Notice tone="warning" title="Nhân viên đang đánh giá hồ sơ">
                Nhân viên đang đối chiếu tiêu chí, bài nộp và bằng chứng trước khi
                ra quyết định.
              </Notice>
            )}

            {status === "STAFF_DECIDED" && (
              <Notice tone="warning" title="Đang hoàn tất quyết toán">
                Nhân viên đã ra quyết định. Hệ thống đang xử lý kết quả tài chính.
              </Notice>
            )}

            {status === "RESOLVED" && (
              <Notice tone="success" title="Hồ sơ đã hoàn tất">
                Kiểm tra kết quả tiền ký quỹ và tiếp tục dự án khi cần.
              </Notice>
            )}

            {status === "CANCELLED" && (
              <Notice tone="danger" title="Hồ sơ đã được rút">
                Không còn hành động xử lý cho tranh chấp này.
              </Notice>
            )}
          </div>
        </Card>
      )}

      <div className="space-y-6">
        <main className="space-y-6">
          <Card className="border border-slate-100 p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <SectionHeading
                title="Mốc đang tranh chấp"
                description="Thông tin gốc dùng để xác định phạm vi, thời hạn, ngân sách và kết quả cần bàn giao."
              />
              {disputedMilestone && (
                <Badge tone="brand">
                  {formatCurrency(
                    disputedMilestone.finalBudget ||
                      disputedMilestone.fundsAllocated ||
                      0,
                  )}
                </Badge>
              )}
            </div>

            <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                <div>
                  <p className="font-display text-xl font-black text-ink">
                    {disputedMilestone?.milestoneName ||
                      "Mốc đang tranh chấp"}
                  </p>
                  {disputedMilestone?.description ? (
                    <p className="mt-3 whitespace-pre-wrap text-sm font-medium leading-6 text-slate-700">
                      {disputedMilestone.description}
                    </p>
                  ) : (
                    <p className="mt-3 text-sm font-medium text-slate-400">
                      Chưa có mô tả chi tiết cho mốc này.
                    </p>
                  )}
                </div>

                <div className="rounded-xl bg-white p-4 shadow-sm">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                    Hạn hoàn thành
                  </p>
                  <p className="mt-2 text-sm font-extrabold leading-6 text-slate-800">
                    {disputedMilestone?.dueAt
                      ? formatDateTime(disputedMilestone.dueAt)
                      : "Chưa cập nhật"}
                  </p>
                </div>
              </div>

              {disputedMilestone?.deliverableExpectation && (
                <div className="mt-4 rounded-xl border border-white bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-mint-600" />
                    <p className="font-extrabold text-ink">Kỳ vọng bàn giao</p>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-6 text-slate-700">
                    {disputedMilestone.deliverableExpectation}
                  </p>
                </div>
              )}
            </div>
          </Card>

          <Card className="border border-slate-100 p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <SectionHeading
                title="Bằng chứng tranh chấp"
                description={
                  !isParticipant
                    ? "Chọn từng bên để xem nhanh nguồn bằng chứng và thời điểm cung cấp."
                    : "Tập hợp các tài liệu, đường dẫn và ghi chú bổ sung cho hồ sơ."
                }
              />

              {!isParticipant && (
                <Tabs
                  active={evidenceTab}
                  onChange={(id) => setEvidenceTab(id as "EXPERT" | "BUSINESS")}
                  tabs={[
                    { id: "EXPERT", label: "Chuyên gia cung cấp" },
                    { id: "BUSINESS", label: "Doanh nghiệp cung cấp" },
                  ]}
                />
              )}
            </div>

            <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              Hạn nộp bổ sung bằng chứng:{" "}
              {dispute.evidenceCollectionDueAt
                ? formatDateOnly(dispute.evidenceCollectionDueAt)
                : "Chưa có hạn bổ sung"}
            </div>

            <div className="mt-5 grid gap-3">
              {evidenceItems
                .filter((item) => {
                  if (isParticipant) return true;
                  const evidenceRole =
                    item.uploadedByAccountId === dispute.initiatedByAccountId
                      ? dispute.initiatedBy
                      : dispute.initiatedBy === "BUSINESS"
                        ? "EXPERT"
                        : "BUSINESS";
                  return evidenceRole === evidenceTab;
                })
                .map((item, index) => (
                  <article
                    key={`${item.fileUrl}-${item.createdAt || item.fileName}`}
                    className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-pink-50 text-pink-600">
                          <Link2 className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="font-extrabold text-ink">
                            {item.fileName || `Bằng chứng ${index + 1}`}
                          </p>
                          <p className="mt-1 text-xs font-bold text-slate-400">
                            {item.createdAt
                              ? formatDateTime(item.createdAt)
                              : "Chưa có thời gian tải lên"}
                          </p>
                        </div>
                      </div>
                      {item.fileType && (
                        <Badge tone="slate">{item.fileType}</Badge>
                      )}
                    </div>

                    <a
                      href={item.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 flex min-w-0 items-center gap-2 rounded-xl bg-slate-50 p-3 font-bold text-pink-600 transition hover:bg-pink-50 hover:text-pink-700"
                    >
                      <Link2 className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.fileUrl}</span>
                    </a>

                    {item.note && (
                      <div className="mt-3 rounded-xl bg-slate-50 p-4">
                        <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                          Ghi chú
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-6 text-slate-700">
                          {item.note}
                        </p>
                      </div>
                    )}
                  </article>
                ))}

              {evidenceItems.filter((item) => {
                if (isParticipant) return true;
                const evidenceRole =
                  item.uploadedByAccountId === dispute.initiatedByAccountId
                    ? dispute.initiatedBy
                    : dispute.initiatedBy === "BUSINESS"
                      ? "EXPERT"
                      : "BUSINESS";
                return evidenceRole === evidenceTab;
              }).length === 0 && (
                <EmptyState
                  title="Chưa có bằng chứng"
                  description={
                    !isParticipant
                      ? `Phía ${evidenceTab === "EXPERT" ? "Chuyên gia" : "Doanh nghiệp"} chưa cung cấp bằng chứng nào.`
                      : "Chưa có bằng chứng bổ sung nào trong hồ sơ."
                  }
                />
              )}
            </div>

            {canAddEvidence && (
              <div className="mt-6 rounded-2xl border border-dashed border-pink-200 bg-pink-50/40 p-5">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-pink-600 shadow-sm">
                    <Send className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-display text-base font-black text-ink">
                      Bổ sung bằng chứng
                    </p>
                    <p className="mt-1 text-sm font-medium leading-6 text-slate-600">
                      Cung cấp đường dẫn có quyền truy cập và ghi chú ngắn để
                      nhân viên hiểu nội dung cần kiểm tra.
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <Field label="Đường dẫn bằng chứng">
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

                  <Field label="Tên hiển thị">
                    <Input
                      value={evidenceForm.fileName}
                      onChange={(event) =>
                        setEvidenceForm((value) => ({
                          ...value,
                          fileName: event.target.value,
                        }))
                      }
                      placeholder="Ví dụ: Nhật ký trao đổi nghiệm thu"
                    />
                  </Field>

                  <div className="md:col-span-2">
            <Field label="Ghi chú cho nhân viên">
                      <Textarea
                        value={evidenceForm.note}
                        onChange={(event) =>
                          setEvidenceForm((value) => ({
                            ...value,
                            note: event.target.value,
                          }))
                        }
                placeholder="Tóm tắt nội dung bằng chứng và điểm cần nhân viên chú ý..."
                      />
                    </Field>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <Button
                    onClick={submitEvidence}
                    loading={actionLoading === "evidence"}
                  >
                    <Send className="h-4 w-4" />
                    Thêm vào hồ sơ
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {!isParticipant && (
            <>
              <Card className="border border-slate-100 p-6">
                <SectionHeading
                  title="Tiêu chí nghiệm thu"
                  description="Danh sách tiêu chí được dùng làm căn cứ đánh giá mức độ hoàn thành mốc."
                />

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {criteria.map((item, index) => (
                    <div
                      key={item.criteriaId}
                      className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4"
                    >
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-mint-50 text-mint-600">
                        <ClipboardCheck className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                          Tiêu chí {index + 1}
                        </p>
                        <p className="mt-1 text-sm font-medium leading-6 text-slate-700">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))}

                  {criteria.length === 0 && (
                    <div className="md:col-span-2">
                      <EmptyState
                        title="Chưa tải được tiêu chí"
                description="Máy chủ chưa trả về tiêu chí nghiệm thu cho cột mốc này."
                      />
                    </div>
                  )}
                </div>
              </Card>

              <Card className="border border-slate-100 p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <SectionHeading
                    title="Bài nộp và sản phẩm bàn giao"
                    description="Các phiên bản được sắp xếp từ mới nhất đến cũ hơn để thuận tiện đối chiếu."
                  />
                  <Button
                    variant="secondary"
                    onClick={() => setSubmissionExpanded((value) => !value)}
                  >
                    {submissionExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                    {submissionExpanded ? "Thu gọn" : "Mở chi tiết"}
                  </Button>
                </div>

                {submissionExpanded && (
                  <div className="mt-5 space-y-5">
                    {sortedProgressReports.length > 0 && (
                      <section>
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <h3 className="font-display text-base font-black text-ink">
                            Báo cáo tiến độ
                          </h3>
                          <Badge tone="brand">
                            {sortedProgressReports.length} báo cáo
                          </Badge>
                        </div>

                        <div className="grid gap-4">
                          {sortedProgressReports.map((item, index) => (
                            <article
                              key={`report-${item.progressReportId}`}
                              className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <p className="font-extrabold text-ink">
                                    Báo cáo tiến độ{" "}
                                    {sortedProgressReports.length - index}
                                  </p>
                                  <p className="mt-1 text-xs font-bold text-slate-400">
                                    {item.createdAt
                                      ? formatDateTime(item.createdAt)
                                      : "Chưa có thời gian nộp"}
                                  </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {item.checkpointType && (
                                    <Badge tone="slate">
                                      {item.checkpointType}
                                    </Badge>
                                  )}
                                  {typeof item.percentComplete === "number" && (
                                    <Badge tone="mint">
                                      Hoàn thành {item.percentComplete}%
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              <div className="mt-4 grid gap-3 md:grid-cols-2">
                                {item.sourceCodeUrl && (
                                  <a
                                    href={item.sourceCodeUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="min-w-0 rounded-xl bg-slate-50 p-4 transition hover:bg-pink-50"
                                  >
                                    <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                                      Mã nguồn
                                    </p>
                                    <p className="mt-1 truncate font-bold text-pink-600">
                                      {item.sourceCodeUrl}
                                    </p>
                                  </a>
                                )}

                                {item.demoLink && (
                                  <a
                                    href={item.demoLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="min-w-0 rounded-xl bg-slate-50 p-4 transition hover:bg-pink-50"
                                  >
                                    <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                                      Bản chạy thử
                                    </p>
                                    <p className="mt-1 truncate font-bold text-pink-600">
                                      {item.demoLink}
                                    </p>
                                  </a>
                                )}

                                {item.attachmentUrl && (
                                  <a
                                    href={item.attachmentUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="min-w-0 rounded-xl bg-slate-50 p-4 transition hover:bg-pink-50"
                                  >
                                    <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                                      Tệp đính kèm
                                    </p>
                                    <p className="mt-1 truncate font-bold text-pink-600">
                                      {item.attachmentUrl}
                                    </p>
                                  </a>
                                )}
                              </div>

                              {(item.submissionNotes || item.content) && (
                                <div className="mt-3 rounded-xl bg-slate-50 p-4">
                                  <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                                    Nội dung nộp
                                  </p>
                                  <p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-6 text-slate-700">
                                    {item.submissionNotes || item.content}
                                  </p>
                                </div>
                              )}

                              {item.businessFeedback && (
                                <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 p-4">
                                  <p className="text-xs font-black uppercase tracking-[0.12em] text-amber-700">
                                    Phản hồi của Doanh nghiệp
                                  </p>
                                  <p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-6 text-amber-900">
                                    {item.businessFeedback}
                                  </p>
                                </div>
                              )}
                            </article>
                          ))}
                        </div>
                      </section>
                    )}

                    {sortedDeliverables.length > 0 && (
                      <section>
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <h3 className="font-display text-base font-black text-ink">
                            Sản phẩm bàn giao
                          </h3>
                          <Badge tone="violet">
                            {sortedDeliverables.length} phiên bản
                          </Badge>
                        </div>

                        <div className="grid gap-4">
                          {sortedDeliverables.map((item, index) => (
                            <article
                              key={`deliverable-${item.deliverableId}`}
                              className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <p className="font-extrabold text-ink">
                                    Sản phẩm bàn giao{" "}
                                    {sortedDeliverables.length - index}
                                  </p>
                                  <p className="mt-1 text-xs font-bold text-slate-400">
                                    {item.createdAt
                                      ? formatDateTime(item.createdAt)
                                      : "Chưa có thời gian nộp"}
                                  </p>
                                </div>
                                <Badge tone="violet">Sản phẩm bàn giao</Badge>
                              </div>

                              <div className="mt-4 grid gap-3 md:grid-cols-2">
                                {item.sourceCodeUrl && (
                                  <a
                                    href={item.sourceCodeUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="min-w-0 rounded-xl bg-slate-50 p-4 transition hover:bg-pink-50"
                                  >
                                    <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                                      Mã nguồn
                                    </p>
                                    <p className="mt-1 truncate font-bold text-pink-600">
                                      {item.sourceCodeUrl}
                                    </p>
                                  </a>
                                )}

                                {item.demoLink && (
                                  <a
                                    href={item.demoLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="min-w-0 rounded-xl bg-slate-50 p-4 transition hover:bg-pink-50"
                                  >
                                    <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                                      Bản chạy thử
                                    </p>
                                    <p className="mt-1 truncate font-bold text-pink-600">
                                      {item.demoLink}
                                    </p>
                                  </a>
                                )}
                              </div>

                              {item.submissionNotes && (
                                <div className="mt-3 rounded-xl bg-slate-50 p-4">
                                  <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                                    Nội dung bàn giao
                                  </p>
                                  <p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-6 text-slate-700">
                                    {item.submissionNotes}
                                  </p>
                                </div>
                              )}

                              {item.rejectionFeedback && (
                                <div className="mt-3 rounded-xl border border-rose-100 bg-rose-50 p-4">
                                  <p className="text-xs font-black uppercase tracking-[0.12em] text-rose-700">
                                    Lý do bị từ chối
                                  </p>
                                  <p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-6 text-rose-900">
                                    {item.rejectionFeedback}
                                  </p>
                                </div>
                              )}
                            </article>
                          ))}
                        </div>
                      </section>
                    )}

                    {sortedProgressReports.length === 0 &&
                      sortedDeliverables.length === 0 && (
                        <EmptyState
                          title="Chưa có bài nộp"
                          description="Chưa tải được báo cáo tiến độ hoặc sản phẩm bàn giao liên quan đến mốc này."
                        />
                      )}
                  </div>
                )}
              </Card>
            </>
          )}

          {canStaffDecide && (
            <Card className="border border-pink-200 bg-gradient-to-br from-pink-50 via-white to-white p-6 shadow-sm md:p-7">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <SectionHeading
                  title="Ra quyết định tranh chấp"
                description="Đây là hành động chính của nhân viên. Hãy đối chiếu đầy đủ tiêu chí, bài nộp và bằng chứng trước khi xác nhận."
                />
              <Badge tone="brand">Hành động dành cho nhân viên</Badge>
              </div>

              <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="grid gap-4">
                  <Field
                    label="Báo cáo kỹ thuật"
                    error={decisionErrors.staffReport}
                  >
                    <Textarea
                      value={decisionForm.staffReport}
                      onChange={(event) =>
                        setDecisionForm((value) => ({
                          ...value,
                          staffReport: event.target.value,
                        }))
                      }
                      placeholder="Nêu môi trường kiểm tra, tiêu chí đạt/không đạt, bằng chứng và kết luận kỹ thuật..."
                      className={
                        decisionErrors.staffReport ? "border-danger-500" : ""
                      }
                    />
                  </Field>

                  <Field label="Ghi chú quyết định" error={decisionErrors.note}>
                    <Textarea
                      value={decisionForm.note}
                      onChange={(event) =>
                        setDecisionForm((value) => ({
                          ...value,
                          note: event.target.value,
                        }))
                      }
                      placeholder="Tóm tắt lý do lựa chọn tỷ lệ và trách nhiệm của mỗi bên..."
                      className={decisionErrors.note ? "border-danger-500" : ""}
                    />
                  </Field>
                </div>

                <div className="rounded-2xl border border-pink-100 bg-white p-5 shadow-sm">
                  <Field
              label="Tỷ lệ tiền ký quỹ trả cho chuyên gia (%)"
                    error={decisionErrors.expertPercent}
                  >
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={decisionForm.expertPercent}
                      onChange={(event) =>
                        setDecisionForm((value) => ({
                          ...value,
                          expertPercent: event.target.value,
                        }))
                      }
                      className={
                        decisionErrors.expertPercent ? "border-danger-500" : ""
                      }
                    />
                  </Field>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-mint-50 p-3 text-center">
                      <p className="text-xs font-black uppercase text-mint-700">
                        Chuyên gia
                      </p>
                      <p className="mt-1 font-display text-xl font-black text-ink">
                        {Number.isFinite(Number(decisionForm.expertPercent))
                          ? `${decisionForm.expertPercent || 0}%`
                          : "0%"}
                      </p>
                    </div>
                    <div className="rounded-xl bg-rose-50 p-3 text-center">
                      <p className="text-xs font-black uppercase text-rose-700">
                        Doanh nghiệp
                      </p>
                      <p className="mt-1 font-display text-xl font-black text-ink">
                        {Number.isFinite(Number(decisionForm.expertPercent))
                          ? `${100 - Number(decisionForm.expertPercent || 0)}%`
                          : "100%"}
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={submitStaffDecision}
                    loading={actionLoading === "staff-decision"}
                    className="mt-5 w-full"
                  >
                    <Gavel className="h-4 w-4" />
                    Xác nhận quyết định
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {!isParticipant && (
            <Card className="border border-pink-200 bg-gradient-to-br from-pink-50 via-white to-white p-6 shadow-sm md:p-7">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <SectionHeading
                  title="Quyết định của nhân viên"
                  description="Kết luận kỹ thuật, ghi chú quyết định và kết quả tiền ký quỹ sau xử lý."
                />
                <Button
                  variant="secondary"
                  onClick={() => setStaffDecisionExpanded((value) => !value)}
                >
                  {staffDecisionExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  {staffDecisionExpanded ? "Thu gọn" : "Mở chi tiết"}
                </Button>
              </div>

              {staffDecisionExpanded && (
                <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="grid gap-4">
                    <div className="rounded-2xl bg-white p-5 shadow-sm">
                      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                        Báo cáo kỹ thuật
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-6 text-slate-700">
                        {dispute.staffReport ||
          "Nhân viên chưa ra quyết định cho hồ sơ này."}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white p-5 shadow-sm">
                      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                        Ghi chú quyết định
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-6 text-slate-700">
                        {dispute.staffDecisionNote ||
                          "Chưa có ghi chú quyết định."}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-pink-100 bg-white p-5 shadow-sm">
                    <p className="text-sm font-extrabold text-slate-800">
                      Kết quả tiền ký quỹ
                    </p>
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="rounded-xl bg-mint-50 p-3 text-center">
                        <p className="text-xs font-black uppercase text-mint-700">
                          Chuyên gia nhận
                        </p>
                        <p className="mt-1 font-display text-xl font-black text-ink">
                          {typeof finalExpertPercent === "number"
                            ? `${finalExpertPercent}%`
                            : "Chưa có"}
                        </p>
                        {typeof dispute.staffProposedExpertAmount ===
                          "number" && (
                          <p className="mt-1 text-xs font-bold text-slate-600">
                            {formatCurrency(dispute.staffProposedExpertAmount)}
                          </p>
                        )}
                      </div>
                      <div className="rounded-xl bg-rose-50 p-3 text-center">
                        <p className="text-xs font-black uppercase text-rose-700">
                          Doanh nghiệp được hoàn
                        </p>
                        <p className="mt-1 font-display text-xl font-black text-ink">
                          {typeof finalBusinessPercent === "number"
                            ? `${finalBusinessPercent}%`
                            : "Chưa có"}
                        </p>
                        {typeof dispute.businessRefundAmount === "number" && (
                          <p className="mt-1 text-xs font-bold text-slate-600">
                            {formatCurrency(dispute.businessRefundAmount)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          )}
        </main>

        <aside className="space-y-6">
          <Card
            className={`border border-pink-100 p-6 shadow-sm ${
              isStaff || isParticipant || isAdmin ? "hidden" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <SectionHeading
                title="Bạn cần làm gì tiếp theo?"
                description="Hệ thống chỉ hiển thị hành động phù hợp với vai trò và trạng thái hiện tại."
              />
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-pink-50 text-pink-600">
                <Handshake className="h-5 w-5" />
              </span>
            </div>

            <div className="mt-5 space-y-4">
              {canRequestIntervention && (
                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                  <p className="font-extrabold text-amber-900">
                    Yêu cầu nhân viên can thiệp
                  </p>
                  <p className="mt-1 text-sm font-medium leading-6 text-amber-800">
                    Gửi hồ sơ để nhân viên phù hợp tiếp nhận và xử lý
                    tranh chấp. Lý do và bằng chứng là bắt buộc.
                  </p>

                  <div className="mt-4 grid gap-3">
                    <div className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-extrabold text-slate-800">
                          Lý do tranh chấp
                        </p>
                        <Badge tone="amber">
                          {formatInitiationType(dispute.initiationType)}
                        </Badge>
                      </div>
                      <div className="mt-3 min-h-28 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="whitespace-pre-wrap text-sm font-semibold leading-7 text-slate-700">
                          {interventionForm.reason ||
                            "Chưa có nội dung lý do tranh chấp."}
                        </p>
                      </div>
                      <p className="mt-2 text-xs font-semibold text-amber-700">
                        Nội dung này được lấy từ lý do đã nhập khi mở tranh
                        chấp.
                      </p>
                    </div>

                    {interventionForm.evidenceFile && (
              <Field label="Bằng chứng đã gửi nhân viên">
                        <Input
                          value={interventionForm.evidenceFile}
                          readOnly
                          className="bg-white/70 text-slate-700"
                        />
                      </Field>
                    )}

                    <Field label="Ghi chú bổ sung">
                      <Textarea
                        value={interventionForm.note}
                        onChange={(event) =>
                          setInterventionForm((value) => ({
                            ...value,
                            note: event.target.value,
                          }))
                        }
                  placeholder="Có thể bỏ trống. Nhập thêm nội dung muốn nhân viên lưu ý nếu cần..."
                      />
                    </Field>

                    <Button
                      onClick={requestIntervention}
                      loading={actionLoading === "request-intervention"}
                      className="w-full"
                    >
                      <Send className="h-4 w-4" />
                      Gửi yêu cầu can thiệp
                    </Button>
                  </div>
                </div>
              )}

              {status === "PENDING_SELF_RESOLVE" && !canRequestIntervention && (
              <Notice tone="info" title="Hồ sơ đang chờ gửi nhân viên">
                  Khi doanh nghiệp hoặc chuyên gia gửi yêu cầu nhân viên can thiệp, hồ sơ sẽ
                  chuyển sang bước tiếp theo.
                </Notice>
              )}

              {status === "ESCALATION_REQUESTED" && (
                <Notice tone="warning" title="Đã gửi yêu cầu can thiệp">
                  Hệ thống đang phân công nhân viên phù hợp. Bạn có thể tiếp tục bổ
                  sung bằng chứng khi cần.
                </Notice>
              )}

              {status === "STAFF_REVIEWING" && (
              <Notice tone="warning" title="Nhân viên đang đánh giá hồ sơ">
                  Nhân viên đang đối chiếu tiêu chí, bài nộp và bằng chứng trước khi
                  ra quyết định.
                </Notice>
              )}

              {status === "STAFF_DECIDED" && (
                <Notice tone="warning" title="Đang hoàn tất quyết toán">
                  Nhân viên đã ra quyết định. Hệ thống đang xử lý kết quả tài chính.
                </Notice>
              )}

              {status === "RESOLVED" && (
                <Notice tone="success" title="Hồ sơ đã hoàn tất">
                  Kiểm tra kết quả tiền ký quỹ và tiếp tục dự án khi cần.
                </Notice>
              )}

              {status === "CANCELLED" && (
                <Notice tone="danger" title="Hồ sơ đã được rút">
                  Không còn hành động xử lý cho tranh chấp này.
                </Notice>
              )}

              {isAdmin && (
                <Notice tone="info" title="Chế độ chỉ đọc">
                  Máy chủ hiện chưa cung cấp danh sách toàn bộ tranh chấp cho
                  quản trị viên trong màn hình này.
                </Notice>
              )}
            </div>
          </Card>

          <Card className="hidden border border-slate-100 p-6">
            <SectionHeading
              title="Kết quả tiền ký quỹ"
          description="Tỷ lệ và số tiền cuối cùng sau quyết định của nhân viên."
            />

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-2xl border border-mint-100 bg-mint-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-extrabold text-mint-800">
                    Chuyên gia nhận
                  </p>
                  <CheckCircle2 className="h-4 w-4 text-mint-600" />
                </div>
                <p className="mt-2 font-display text-2xl font-black text-ink">
                  {typeof finalExpertPercent === "number"
                    ? `${finalExpertPercent}%`
                    : "Chưa có"}
                </p>
                {typeof dispute.staffProposedExpertAmount === "number" && (
                  <p className="mt-1 text-sm font-bold text-slate-600">
                    {formatCurrency(dispute.staffProposedExpertAmount)}
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-extrabold text-rose-800">
                    Doanh nghiệp được hoàn
                  </p>
                  <ShieldCheck className="h-4 w-4 text-rose-600" />
                </div>
                <p className="mt-2 font-display text-2xl font-black text-ink">
                  {typeof finalBusinessPercent === "number"
                    ? `${finalBusinessPercent}%`
                    : "Chưa có"}
                </p>
                {typeof dispute.businessRefundAmount === "number" && (
                  <p className="mt-1 text-sm font-bold text-slate-600">
                    {formatCurrency(dispute.businessRefundAmount)}
                  </p>
                )}
              </div>
            </div>
          </Card>

          <Card className="hidden border border-slate-100 p-6">
            <SectionHeading
              title="Mốc thời gian xử lý"
              description={
                isStaff
                  ? "Chỉ hiển thị các mốc cần cho việc theo dõi và ra quyết định."
                  : isAdmin
            ? "Các mốc chính để quản trị viên theo dõi tiến độ xử lý."
                    : "Các mốc quan trọng để hai bên theo dõi kết quả tranh chấp."
              }
            />

            <div className="mt-5 space-y-4">
              {timelineItems.length > 0 ? (
                timelineItems.map((item) => (
                  <div key={item.key} className="flex gap-3">
                    <span
                      className={`mt-1 h-3 w-3 shrink-0 rounded-full ring-4 ${item.dotClass}`}
                    />
                    <div>
                      <p className="text-sm font-extrabold text-slate-800">
                        {item.title}
                      </p>
                      <p className="mt-1 text-xs font-bold text-slate-400">
                        {formatDateTime(item.time)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-400">
                  Chưa có mốc xử lý phù hợp để hiển thị.
                </p>
              )}
            </div>
          </Card>

          <Card className="hidden border border-slate-100 p-6">
            <SectionHeading
              title="Quyết định của nhân viên"
              description="Kết luận kỹ thuật và ghi chú được công bố cho các bên."
            />

            <div className="mt-5 rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                Báo cáo kỹ thuật
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-6 text-slate-700">
                {dispute.staffReport ||
          "Nhân viên chưa ra quyết định cho hồ sơ này."}
              </p>
            </div>

            {dispute.staffDecisionNote && (
              <div className="mt-3 rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                  Ghi chú quyết định
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-6 text-slate-700">
                  {dispute.staffDecisionNote}
                </p>
              </div>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}

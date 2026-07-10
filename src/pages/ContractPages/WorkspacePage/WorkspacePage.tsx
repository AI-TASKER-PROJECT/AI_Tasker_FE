import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Gavel,
  PlayCircle,
  RefreshCw,
  Send,
  WalletCards,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { contractApi, disputeApi, getApiErrorMessage } from "../../../lib/api";
import {
  canBusinessApproveMilestone,
  canBusinessDepositMilestone,
  canBusinessRejectMilestone,
  canCreateReview,
  canExpertInitiateDispute as canExpertOpenDispute,
  canExpertStartMilestone,
  canExpertSubmitDeliverable,
  canExpertSubmitPartialEvidence,
  canExpertSubmitProgress,
  canRequestStaffIntervention,
  canRequestTermination,
  canWithdrawTermination,
  contractStatusLabel,
  isActiveDispute,
  isActiveTermination,
  milestoneStatusLabel,
  normalizeFlowStatus,
  terminationStatusLabel,
} from "../../../lib/flowGuards";
import {
  canInitiatorCancelDispute,
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
  LinkButton,
  Modal,
  Notice,
  PageHeader,
  Select,
  SectionHeading,
  StatusBadge,
  Tabs,
  Textarea,
} from "../../../components/ui";
import {
  getMilestoneBudget,
  getSourceMilestoneId,
} from "../ContractPages.shared";

type NoticeState = {
  tone: "success" | "danger" | "info" | "warning";
  title: string;
  message?: string;
};

type ActionName =
  | "deposit"
  | "start"
  | "progress"
  | "deliverable"
  | "approve"
  | "reject"
  | "dispute"
  | "intervention"
  | "cancel-dispute"
  | "termination"
  | "withdraw-termination"
  | "partial-evidence"
  | "review";

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

export function WorkspacePage() {
  const { contractId } = useParams();
  const session = useSession();
  const numericContractId = Number(contractId);
  const [contract, setContract] = useState<Contract | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [terminationRequests, setTerminationRequests] = useState<
    TerminationRequest[]
  >([]);
  const [criteriaByMilestone, setCriteriaByMilestone] = useState<
    Record<number, AcceptanceCriteria[]>
  >({});
  const [deliverablesByMilestone, setDeliverablesByMilestone] = useState<
    Record<number, Deliverable[]>
  >({});
  const [reportsByMilestone, setReportsByMilestone] = useState<
    Record<number, MilestoneProgressReport[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [actionLoading, setActionLoading] = useState<ActionName | null>(null);
  const [depositOpen, setDepositOpen] = useState<Milestone | null>(null);
  const [startOpen, setStartOpen] = useState<Milestone | null>(null);
  const [approveOpen, setApproveOpen] = useState<Milestone | null>(null);
  const [progressOpen, setProgressOpen] = useState<Milestone | null>(null);
  const [deliverableOpen, setDeliverableOpen] = useState<Milestone | null>(null);
  const [rejectOpen, setRejectOpen] = useState<Milestone | null>(null);
  const [expertDisputeOpen, setExpertDisputeOpen] =
    useState<Milestone | null>(null);
  const [interventionOpen, setInterventionOpen] = useState<Dispute | null>(
    null,
  );
  const [cancelDisputeOpen, setCancelDisputeOpen] = useState<Dispute | null>(
    null,
  );
  const [terminationOpen, setTerminationOpen] = useState(false);
  const [withdrawTerminationOpen, setWithdrawTerminationOpen] =
    useState<TerminationRequest | null>(null);
  const [partialEvidenceOpen, setPartialEvidenceOpen] =
    useState<TerminationRequest | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  const [progressForm, setProgressForm] = useState({
    content: "",
    percentComplete: "50",
    attachmentUrl: "",
  });
  const [deliverableForm, setDeliverableForm] = useState({
    sourceCodeUrl: "",
    demoLink: "",
    submissionNotes: "",
  });
  const [rejectReason, setRejectReason] = useState("");
  const [expertDisputeType, setExpertDisputeType] =
    useState<DisputeInitiationType>("EXPERT_SCOPE_CONCERN");
  const [interventionForm, setInterventionForm] = useState({
    reason: "",
    evidenceFile: "",
  });
  const [cancelReason, setCancelReason] = useState("");
  const [terminationForm, setTerminationForm] = useState({
    reason: "",
    evidenceUrl: "",
  });
  const [partialEvidenceForm, setPartialEvidenceForm] = useState({
    note: "",
    url: "",
  });
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    comment: "",
  });


  const loadWorkspace = useCallback(async () => {
    if (!Number.isFinite(numericContractId) || numericContractId <= 0) {
      setContract(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [contractData, milestoneData, disputeData, terminationData] =
        await Promise.all([
          contractApi.getContract(numericContractId),
          contractApi.listMilestones(numericContractId),
          disputeApi.listByContract(numericContractId).catch(() => []),
          contractApi
            .listTerminationRequests(numericContractId)
            .catch(() => []),
        ]);
      setContract(contractData);
      setMilestones(milestoneData);
      setDisputes(disputeData);
      setTerminationRequests(terminationData);

      const milestoneIds = milestoneData
        .map(getSourceMilestoneId)
        .filter((value): value is number => Boolean(value));
      const detailGroups = await Promise.all(
        milestoneIds.map(async (milestoneId) => {
          const [criteria, deliverables, reports] = await Promise.all([
            contractApi.listCriteria(milestoneId).catch(() => []),
            contractApi.listDeliverables(milestoneId).catch(() => []),
            contractApi
              .listProgressReports(numericContractId, milestoneId)
              .catch(() => []),
          ]);
          return { milestoneId, criteria, deliverables, reports };
        }),
      );
      setCriteriaByMilestone(
        Object.fromEntries(
          detailGroups.map((item) => [item.milestoneId, item.criteria]),
        ),
      );
      setDeliverablesByMilestone(
        Object.fromEntries(
          detailGroups.map((item) => [item.milestoneId, item.deliverables]),
        ),
      );
      setReportsByMilestone(
        Object.fromEntries(
          detailGroups.map((item) => [item.milestoneId, item.reports]),
        ),
      );
    } catch (error) {
      setContract(null);
      setMilestones([]);
      setDisputes([]);
      setTerminationRequests([]);
      setNotice({ tone: "danger", title: getApiErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  }, [numericContractId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadWorkspace();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadWorkspace]);

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

  const activeTermination = terminationRequests.find((request) =>
    isActiveTermination(request.status),
  );
  const currentMilestone =
    milestones.find((item) =>
      ["PENDING", "DEPOSITED", "IN_PROGRESS", "UNDER_REVIEW", "DISPUTED"].includes(
        normalizeFlowStatus(item.status),
      ),
    ) || milestones[0];
  const activeContractDispute = disputes.find((item) =>
    isActiveDispute(item.status),
  );
  const completedCount = milestones.filter(
    (item) => normalizeFlowStatus(item.status) === "COMPLETED",
  ).length;
  const milestoneNeedingAction = milestones.filter((milestone) => {
    const milestoneId = getSourceMilestoneId(milestone);
    const activeDispute = milestoneId
      ? disputesByMilestone[milestoneId]?.find((item) =>
          isActiveDispute(item.status),
        )
      : undefined;
    return (
      canBusinessDepositMilestone(
        session?.role,
        contract,
        milestone,
        Boolean(activeTermination),
      ) ||
      canExpertStartMilestone(
        session?.role,
        contract,
        milestone,
        Boolean(activeTermination),
      ) ||
      canExpertSubmitProgress(
        session?.role,
        contract,
        milestone,
        Boolean(activeTermination),
      ) ||
      canExpertSubmitDeliverable(
        session?.role,
        contract,
        milestone,
        activeDispute,
        Boolean(activeTermination),
      ) ||
      canBusinessApproveMilestone(
        session?.role,
        contract,
        milestone,
        Boolean(activeTermination),
      )
    );
  }).length;

  async function runAction(action: ActionName, handler: () => Promise<void>) {
    setActionLoading(action);
    setNotice(null);
    try {
      await handler();
      closeModals();
      await loadWorkspace();
    } catch (error) {
      await loadWorkspace();
      setNotice({ tone: "danger", title: getApiErrorMessage(error) });
    } finally {
      setActionLoading(null);
    }
  }

  function closeModals() {
    setDepositOpen(null);
    setStartOpen(null);
    setApproveOpen(null);
    setProgressOpen(null);
    setDeliverableOpen(null);
    setRejectOpen(null);
    setExpertDisputeOpen(null);
    setInterventionOpen(null);
    setCancelDisputeOpen(null);
    setTerminationOpen(false);
    setWithdrawTerminationOpen(null);
    setPartialEvidenceOpen(null);
    setReviewOpen(false);
    setProgressForm({ content: "", percentComplete: "50", attachmentUrl: "" });
    setDeliverableForm({ sourceCodeUrl: "", demoLink: "", submissionNotes: "" });
    setRejectReason("");
    setInterventionForm({ reason: "", evidenceFile: "" });
    setCancelReason("");
    setTerminationForm({ reason: "", evidenceUrl: "" });
    setPartialEvidenceForm({ note: "", url: "" });
    setReviewForm({ rating: 5, comment: "" });
  }

  const depositMilestone = async () => {
    if (!contract || !depositOpen) return;
    const milestoneId = getSourceMilestoneId(depositOpen);
    if (!milestoneId) return;
    await runAction("deposit", async () => {
      await contractApi.depositMilestoneEscrow(contract.contractId, milestoneId);
      setNotice({ tone: "success", title: "Đã nạp ký quỹ milestone." });
    });
  };

  const startMilestone = async () => {
    if (!startOpen) return;
    const milestoneId = getSourceMilestoneId(startOpen);
    if (!milestoneId) return;
    await runAction("start", async () => {
      await contractApi.startMilestone(milestoneId);
      setNotice({ tone: "success", title: "Đã bắt đầu milestone." });
    });
  };

  const submitProgressReport = async () => {
    if (!contract || !progressOpen) return;
    const milestoneId = getSourceMilestoneId(progressOpen);
    const percentComplete = Number(progressForm.percentComplete);
    if (!milestoneId || !progressForm.content.trim()) {
      setNotice({ tone: "warning", title: "Vui lòng nhập nội dung báo cáo." });
      return;
    }
    if (
      !Number.isFinite(percentComplete) ||
      percentComplete < 0 ||
      percentComplete > 100
    ) {
      setNotice({
        tone: "warning",
        title: "Phần trăm hoàn thành phải nằm trong khoảng 0-100.",
      });
      return;
    }
    await runAction("progress", async () => {
      await contractApi.submitProgressReport(contract.contractId, milestoneId, {
        content: progressForm.content.trim(),
        percentComplete,
        attachmentUrl: progressForm.attachmentUrl || undefined,
      });
      setNotice({ tone: "success", title: "Đã gửi báo cáo tiến độ." });
    });
  };

  const submitDeliverable = async () => {
    if (!deliverableOpen) return;
    const milestoneId = getSourceMilestoneId(deliverableOpen);
    if (!milestoneId || !deliverableForm.submissionNotes.trim()) {
      setNotice({
        tone: "warning",
        title: "Vui lòng nhập ghi chú bàn giao trước khi gửi.",
      });
      return;
    }
    await runAction("deliverable", async () => {
      await contractApi.submitDeliverable(milestoneId, {
        milestoneId,
        sourceCodeUrl: deliverableForm.sourceCodeUrl || undefined,
        demoLink: deliverableForm.demoLink || undefined,
        submissionNotes: deliverableForm.submissionNotes.trim(),
      });
      setNotice({ tone: "success", title: "Đã nộp sản phẩm bàn giao." });
    });
  };

  const approveMilestone = async () => {
    if (!approveOpen) return;
    const milestoneId = getSourceMilestoneId(approveOpen);
    if (!milestoneId) return;
    await runAction("approve", async () => {
      await contractApi.approveMilestone(milestoneId);
      setNotice({
        tone: "success",
        title: "Đã duyệt milestone. Backend sẽ release escrow theo rule.",
      });
    });
  };

  const rejectMilestone = async () => {
    if (!rejectOpen) return;
    const milestoneId = getSourceMilestoneId(rejectOpen);
    if (!milestoneId || !rejectReason.trim()) {
      setNotice({ tone: "warning", title: "Vui lòng nhập lý do từ chối." });
      return;
    }
    await runAction("reject", async () => {
      await contractApi.rejectMilestone(milestoneId, rejectReason.trim());
      setNotice({
        tone: "success",
        title: "Đã từ chối bàn giao. Backend sẽ tạo/cập nhật dispute.",
      });
    });
  };

  const initiateExpertDispute = async () => {
    if (!contract || !expertDisputeOpen) return;
    const milestoneId = getSourceMilestoneId(expertDisputeOpen);
    if (!milestoneId) return;
    await runAction("dispute", async () => {
      await disputeApi.initiateExpertDispute({
        contractId: contract.contractId,
        milestoneId,
        initiatedBy: "EXPERT",
        initiationType: expertDisputeType,
      });
      setNotice({ tone: "success", title: "Đã tạo tranh chấp." });
    });
  };

  const requestStaffIntervention = async () => {
    if (!interventionOpen || !interventionForm.reason.trim()) {
      setNotice({
        tone: "warning",
        title: "Vui lòng nhập lý do yêu cầu Staff can thiệp.",
      });
      return;
    }
    await runAction("intervention", async () => {
      await disputeApi.requestStaffIntervention(interventionOpen.disputeId, {
        reason: interventionForm.reason.trim(),
        evidenceFile: interventionForm.evidenceFile || undefined,
      });
      setNotice({ tone: "success", title: "Đã yêu cầu Staff can thiệp." });
    });
  };

  const cancelDispute = async () => {
    if (!cancelDisputeOpen || !cancelReason.trim()) {
      setNotice({ tone: "warning", title: "Vui lòng nhập lý do rút dispute." });
      return;
    }
    await runAction("cancel-dispute", async () => {
      await disputeApi.cancel(cancelDisputeOpen.disputeId, {
        reason: cancelReason.trim(),
      });
      setNotice({ tone: "success", title: "Đã rút/cancel dispute." });
    });
  };

  const requestTermination = async () => {
    if (!contract || !terminationForm.reason.trim()) {
      setNotice({
        tone: "warning",
        title: "Vui lòng nhập lý do yêu cầu chấm dứt hợp đồng.",
      });
      return;
    }
    await runAction("termination", async () => {
      await contractApi.requestTermination(contract.contractId, {
        requestReason: terminationForm.reason.trim(),
        requestFileUrl: terminationForm.evidenceUrl || undefined,
      });
      setNotice({
        tone: "success",
        title: "Đã gửi yêu cầu chấm dứt hợp đồng.",
      });
    });
  };

  const withdrawTermination = async () => {
    if (!withdrawTerminationOpen || !terminationForm.reason.trim()) {
      setNotice({
        tone: "warning",
        title: "Vui lòng nhập lý do rút yêu cầu chấm dứt.",
      });
      return;
    }
    await runAction("withdraw-termination", async () => {
      await contractApi.withdrawTermination(
        withdrawTerminationOpen.terminationRequestId,
        terminationForm.reason.trim(),
      );
      setNotice({ tone: "success", title: "Đã rút yêu cầu chấm dứt." });
    });
  };

  const submitPartialEvidence = async () => {
    if (!partialEvidenceOpen || !partialEvidenceForm.note.trim()) {
      setNotice({
        tone: "warning",
        title: "Vui lòng nhập mô tả bằng chứng công việc một phần.",
      });
      return;
    }
    await runAction("partial-evidence", async () => {
      await contractApi.submitPartialEvidence(
        partialEvidenceOpen.terminationRequestId,
        {
          partialEvidenceNote: partialEvidenceForm.note.trim(),
          partialEvidenceUrl: partialEvidenceForm.url || undefined,
        },
      );
      setNotice({
        tone: "success",
        title: "Đã nộp bằng chứng công việc một phần.",
      });
    });
  };

  const submitReview = async () => {
    if (!contract) return;
    await runAction("review", async () => {
      await contractApi.createReview(contract.contractId, {
        rating: reviewForm.rating,
        comment: reviewForm.comment.trim(),
      });
      setNotice({ tone: "success", title: "Đã gửi đánh giá thành công." });
    });
  };

  if (loading) {
    return (
      <EmptyState
        title="Đang tải workspace"
        description="Đang lấy contract, milestone, dispute và termination từ backend."
      />
    );
  }

  if (!contract) {
    return (
      <EmptyState
        title="Không tìm thấy contract"
        description="Dữ liệu workspace được lấy trực tiếp từ backend."
      />
    );
  }

  const canOpenTermination = canRequestTermination(
    session?.role,
    contract,
    activeTermination,
  );
  const canOpenReview = canCreateReview(session?.role, contract);

  return (
    <div className="space-y-6">
      <Card className="p-6 md:p-8">
        <PageHeader
          eyebrow="Contract execution"
          title={contract.contractTitle || contract.title || "Workspace"}
          description="Không gian vận hành Flow 4 và Flow 5 cho Business/Expert, dựa trên trạng thái backend hiện tại."
          actions={
            <>
              <Button variant="secondary" onClick={loadWorkspace}>
                <RefreshCw className="h-4 w-4" />
                Tải lại
              </Button>
              {canOpenTermination && (
                <Button variant="danger" onClick={() => setTerminationOpen(true)}>
                  <AlertTriangle className="h-4 w-4" />
                  Yêu cầu chấm dứt hợp đồng
                </Button>
              )}
            </>
          }
        />
      </Card>

      {notice && (
        <Notice tone={notice.tone} title={notice.title}>
          {notice.message}
        </Notice>
      )}

      {activeContractDispute && (
        <Notice
          tone="warning"
          title={`Milestone đang có tranh chấp: ${
            translateDisputeStatus(activeContractDispute.status) ||
            activeContractDispute.status
          }`}
        >
          Các hành động milestone sẽ tuân theo self-resolve hoặc Staff
          intervention. Business/Expert không thể tự execute settlement.
        </Notice>
      )}

      {activeTermination && (
        <Notice
          tone="warning"
          title={`Hợp đồng đang trong termination flow: ${terminationStatusLabel(
            activeTermination.status,
          )}`}
        >
          Các action milestone mới đã bị khóa, trừ bằng chứng công việc một phần
          nếu backend yêu cầu.
        </Notice>
      )}

      <div className="grid gap-4 lg:grid-cols-4">
        <SummaryFact
          label="Trạng thái hợp đồng"
          value={contractStatusLabel(contract.status)}
        />
        <SummaryFact
          label="Tổng ngân sách"
          value={formatCurrency(contract.totalBudget)}
        />
        <SummaryFact
          label="Milestone hiện tại"
          value={currentMilestone?.milestoneName || "Chưa có milestone"}
        />
        <SummaryFact
          label="Hoàn thành"
          value={`${completedCount}/${milestones.length} milestone`}
        />
      </div>

      <Card className="p-4">
        <Tabs
          active={activeTab}
          onChange={setActiveTab}
          tabs={[
            { id: "overview", label: "Tổng quan" },
            {
              id: "milestones",
              label: "Milestone",
              count: milestoneNeedingAction,
            },
            {
              id: "cases",
              label: "Dispute & Termination",
              count:
                disputes.filter((item) => isActiveDispute(item.status)).length +
                terminationRequests.filter((item) =>
                  isActiveTermination(item.status),
                ).length,
            },
            { id: "settlement", label: "Settlement" },
          ]}
        />
      </Card>

      {activeTab === "overview" && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <Card className="p-5">
            <SectionHeading
              title="Việc cần làm tiếp theo"
              description="Chỉ hiện các bước hợp lệ với role và trạng thái hiện tại."
            />
            <div className="mt-5 grid gap-3">
              {milestones
                .filter((milestone) => {
                  const milestoneId = getSourceMilestoneId(milestone);
                  const activeDispute = milestoneId
                    ? disputesByMilestone[milestoneId]?.find((item) =>
                        isActiveDispute(item.status),
                      )
                    : undefined;
                  return (
                    canBusinessDepositMilestone(
                      session?.role,
                      contract,
                      milestone,
                      Boolean(activeTermination),
                    ) ||
                    canExpertStartMilestone(
                      session?.role,
                      contract,
                      milestone,
                      Boolean(activeTermination),
                    ) ||
                    canExpertSubmitProgress(
                      session?.role,
                      contract,
                      milestone,
                      Boolean(activeTermination),
                    ) ||
                    canExpertSubmitDeliverable(
                      session?.role,
                      contract,
                      milestone,
                      activeDispute,
                      Boolean(activeTermination),
                    ) ||
                    canBusinessApproveMilestone(
                      session?.role,
                      contract,
                      milestone,
                      Boolean(activeTermination),
                    )
                  );
                })
                .slice(0, 3)
                .map((milestone) => (
                  <NextActionCard
                    key={getSourceMilestoneId(milestone) || milestone.milestoneName}
                    milestone={milestone}
                    onOpenMilestones={() => setActiveTab("milestones")}
                  />
                ))}
              {milestoneNeedingAction === 0 && (
                <EmptyState
                  title="Không có action cần xử lý ngay"
                  description="Các bước hiện tại đang chờ bên còn lại hoặc chờ backend cập nhật trạng thái."
                />
              )}
            </div>
          </Card>

          <Card className="p-5">
            <SectionHeading
              title="Thông tin hợp đồng"
              description="Thông tin an toàn, không lộ raw account/wallet ID."
            />
            <div className="mt-5 grid gap-3">
              <InfoLine label="Business" value={contract.businessName || "Business"} />
              <InfoLine label="Expert" value={contract.expertName || "Expert"} />
              <InfoLine
                label="Ký quỹ contract 20%"
                value={formatCurrency(contract.totalBudget * 0.2)}
              />
              <InfoLine
                label="Trạng thái review"
                value={
                  canOpenReview
                    ? "Có thể đánh giá đối tác"
                    : "Chỉ mở khi hợp đồng CLOSED"
                }
              />
            </div>
            {canOpenReview && (
              <div className="mt-4">
                <Button onClick={() => setReviewOpen(true)} className="w-full">
                  Viết đánh giá
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === "milestones" && (
        <Card className="p-5">
          <SectionHeading
            title="Milestone timeline"
            description="Mỗi milestone hiển thị đúng trạng thái, escrow, criteria, deliverable và action theo role."
          />
          <div className="mt-5 grid gap-4">
            {milestones.map((milestone) => {
              const milestoneId = getSourceMilestoneId(milestone);
              const milestoneDisputes = milestoneId
                ? disputesByMilestone[milestoneId] || []
                : [];
              const activeDispute = milestoneDisputes.find((dispute) =>
                isActiveDispute(dispute.status),
              );
              const criteria = milestoneId
                ? criteriaByMilestone[milestoneId] || []
                : [];
              const deliverables = milestoneId
                ? deliverablesByMilestone[milestoneId] || []
                : [];
              const reports = milestoneId ? reportsByMilestone[milestoneId] || [] : [];
              const canDeposit = canBusinessDepositMilestone(
                session?.role,
                contract,
                milestone,
                Boolean(activeTermination),
              );
              const canStart = canExpertStartMilestone(
                session?.role,
                contract,
                milestone,
                Boolean(activeTermination),
              );
              const canProgress = canExpertSubmitProgress(
                session?.role,
                contract,
                milestone,
                Boolean(activeTermination),
              );
              const canFinal = canExpertSubmitDeliverable(
                session?.role,
                contract,
                milestone,
                activeDispute,
                Boolean(activeTermination),
              );
              const canApprove = canBusinessApproveMilestone(
                session?.role,
                contract,
                milestone,
                Boolean(activeTermination),
              );
              const canReject = canBusinessRejectMilestone(
                session?.role,
                contract,
                milestone,
                Boolean(activeTermination),
              );
              const canDispute = canExpertOpenDispute(
                session?.role,
                contract,
                milestone,
                activeDispute,
                Boolean(activeTermination),
              );
              const canIntervention = canRequestStaffIntervention(
                session?.role,
                activeDispute,
              );
              const canCancel = canInitiatorCancelDispute(
                session?.role,
                activeDispute,
                session?.accountId,
              );

              return (
                <MilestoneWorkspace
                  key={milestoneId || milestone.milestoneName}
                  milestone={milestone}
                  criteria={criteria}
                  reports={reports}
                  deliverables={deliverables}
                  activeDispute={activeDispute}
                  actions={
                    <>
                      {canDeposit && (
                        <Button size="sm" onClick={() => setDepositOpen(milestone)}>
                          <WalletCards className="h-4 w-4" />
                          Nạp ký quỹ milestone
                        </Button>
                      )}
                      {canStart && (
                        <Button size="sm" onClick={() => setStartOpen(milestone)}>
                          <PlayCircle className="h-4 w-4" />
                          Bắt đầu milestone
                        </Button>
                      )}
                      {canProgress && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setProgressOpen(milestone)}
                        >
                          <FileText className="h-4 w-4" />
                          Gửi báo cáo tiến độ
                        </Button>
                      )}
                      {canFinal && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setDeliverableOpen(milestone)}
                        >
                          <Send className="h-4 w-4" />
                          Nộp sản phẩm bàn giao
                        </Button>
                      )}
                      {canApprove && (
                        <Button
                          size="sm"
                          variant="success"
                          onClick={() => setApproveOpen(milestone)}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Duyệt milestone
                        </Button>
                      )}
                      {canReject && (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => setRejectOpen(milestone)}
                        >
                          <XCircle className="h-4 w-4" />
                          Từ chối bàn giao
                        </Button>
                      )}
                      {canDispute && (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => setExpertDisputeOpen(milestone)}
                        >
                          <Gavel className="h-4 w-4" />
                          Tạo tranh chấp
                        </Button>
                      )}
                      {canIntervention && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setInterventionOpen(activeDispute!)}
                        >
                          Yêu cầu Staff can thiệp
                        </Button>
                      )}
                      {canCancel && (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => setCancelDisputeOpen(activeDispute!)}
                        >
                          Rút dispute
                        </Button>
                      )}
                    </>
                  }
                />
              );
            })}
            {milestones.length === 0 && (
              <EmptyState
                title="Chưa có milestone"
                description="Backend chưa trả milestone cho contract này."
              />
            )}
          </div>
        </Card>
      )}

      {activeTab === "cases" && (
        <Card className="p-5">
          <SectionHeading
            title="Dispute & termination"
            description="Các case đang ảnh hưởng trực tiếp đến tiến độ contract."
          />
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <div className="grid content-start gap-3">
              <h3 className="font-display text-base font-black text-ink">
                Dispute
              </h3>
              {disputes.map((dispute) => (
                <div
                  key={dispute.disputeId}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge
                      status={translateDisputeStatus(dispute.status)}
                    />
                    <Badge tone="brand">
                      {dispute.initiatedBy === "EXPERT"
                        ? "Expert khởi tạo"
                        : dispute.initiatedBy === "BUSINESS"
                          ? "Business khởi tạo"
                          : "Người khởi tạo"}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm font-semibold leading-6 text-slate-700">
                    {dispute.escalationReason ||
                      dispute.evidenceReport ||
                      "Backend chưa có mô tả chi tiết."}
                  </p>
                  <div className="mt-4">
                    <LinkButton
                      to={`/app/disputes/${dispute.disputeId}`}
                      size="sm"
                      variant="secondary"
                    >
                      Chi tiết dispute
                    </LinkButton>
                  </div>
                </div>
              ))}
              {disputes.length === 0 && (
                <EmptyState
                  title="Chưa có dispute"
                  description="Contract hiện không có tranh chấp nào."
                />
              )}
            </div>

            <div className="grid content-start gap-3">
              <h3 className="font-display text-base font-black text-ink">
                Termination
              </h3>
              {terminationRequests.map((request) => (
              <div
                key={request.terminationRequestId}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={terminationStatusLabel(request.status)} />
                  <Badge tone="brand">{request.requestedByRole}</Badge>
                </div>
                <p className="mt-3 text-sm font-semibold leading-6 text-slate-700">
                  {request.requestReason || "Backend chưa có lý do."}
                </p>
                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  <InfoLine
                    label="Expert nhận"
                    value={
                      request.expertPayoutAmount !== undefined
                        ? formatCurrency(request.expertPayoutAmount)
                        : undefined
                    }
                  />
                  <InfoLine
                    label="Business hoàn"
                    value={
                      request.businessRefundAmount !== undefined
                        ? formatCurrency(request.businessRefundAmount)
                        : undefined
                    }
                  />
                  <InfoLine
                    label="Settlement"
                    value={
                      request.settlementExecutedAt
                        ? formatDateTime(request.settlementExecutedAt)
                        : undefined
                    }
                  />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <LinkButton
                    to={`/app/termination-requests/${request.terminationRequestId}`}
                    size="sm"
                    variant="secondary"
                  >
                    Chi tiết
                  </LinkButton>
                  {canWithdrawTermination(
                    session?.role,
                    request,
                    session?.accountId,
                  ) && (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => setWithdrawTerminationOpen(request)}
                    >
                      Rút yêu cầu chấm dứt
                    </Button>
                  )}
                  {canExpertSubmitPartialEvidence(session?.role, request) && (
                    <Button
                      size="sm"
                      onClick={() => setPartialEvidenceOpen(request)}
                    >
                      Nộp bằng chứng một phần
                    </Button>
                  )}
                </div>
              </div>
              ))}
              {terminationRequests.length === 0 && (
                <EmptyState
                  title="Chưa có termination request"
                  description="Contract hiện chưa có yêu cầu chấm dứt."
                />
              )}
            </div>
          </div>
        </Card>
      )}

      {activeTab === "settlement" && (
        <Card className="p-5">
          <SectionHeading
            title="Settlement & escrow"
            description="Tóm tắt trạng thái release escrow milestone và hoàn cọc contract."
          />
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {milestones.map((milestone) => (
              <div
                key={getSourceMilestoneId(milestone) || milestone.milestoneName}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
              >
                <StatusBadge status={milestoneStatusLabel(milestone.status)} />
                <h3 className="mt-3 font-display text-base font-black text-ink">
                  {milestone.milestoneName}
                </h3>
                <div className="mt-3 grid gap-2">
                  <InfoLine
                    label="Ngân sách"
                    value={formatCurrency(getMilestoneBudget(milestone))}
                  />
                  <InfoLine
                    label="Settlement source"
                    value={milestone.settlementSourceType || "Chưa settlement"}
                  />
                  <InfoLine
                    label="Escrow released"
                    value={
                      milestone.escrowReleasedAt
                        ? formatDateTime(milestone.escrowReleasedAt)
                        : undefined
                    }
                  />
                </div>
              </div>
            ))}
          </div>
          <Notice
            tone="info"
            title="Contract security deposit 20% là luồng riêng."
            className="mt-5"
          >
            Cọc hợp đồng chỉ được Admin hoàn sau khi contract COMPLETED hoặc
            TERMINATED theo backend.
          </Notice>
        </Card>
      )}

      <ConfirmFinancialModal
        open={Boolean(depositOpen)}
        title="Xác nhận nạp ký quỹ milestone"
        confirmLabel="Nạp ký quỹ milestone"
        loading={actionLoading === "deposit"}
        onClose={closeModals}
        onConfirm={depositMilestone}
      >
        {depositOpen && (
          <SettlementFacts
            milestone={depositOpen}
            warning="Số tiền milestone sẽ được chuyển vào escrow. Expert chỉ bắt đầu được sau bước này."
          />
        )}
      </ConfirmFinancialModal>

      <ConfirmFinancialModal
        open={Boolean(approveOpen)}
        title="Xác nhận duyệt milestone"
        confirmLabel="Duyệt và release escrow"
        loading={actionLoading === "approve"}
        onClose={closeModals}
        onConfirm={approveMilestone}
      >
        {approveOpen && (
          <SettlementFacts
            milestone={approveOpen}
            warning="Backend sẽ release 100% escrow milestone cho Expert. Hành động này là hành động tài chính."
          />
        )}
      </ConfirmFinancialModal>

      <Modal
        open={Boolean(startOpen)}
        onClose={closeModals}
        title="Bắt đầu milestone"
        footer={
          <>
            <Button variant="secondary" onClick={closeModals}>
              Hủy
            </Button>
            <Button
              onClick={startMilestone}
              loading={actionLoading === "start"}
              disabled={Boolean(actionLoading)}
            >
              Bắt đầu milestone
            </Button>
          </>
        }
      >
        <Notice tone="info" title="Milestone đã có escrow.">
          Khi xác nhận, backend sẽ chuyển milestone sang trạng thái đang thực
          hiện.
        </Notice>
      </Modal>

      <Modal
        open={Boolean(progressOpen)}
        onClose={closeModals}
        title="Gửi báo cáo tiến độ"
        footer={
          <>
            <Button variant="secondary" onClick={closeModals}>
              Hủy
            </Button>
            <Button
              onClick={submitProgressReport}
              loading={actionLoading === "progress"}
              disabled={Boolean(actionLoading)}
            >
              Gửi báo cáo
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Field label="Phần trăm hoàn thành">
            <Input
              type="number"
              min={0}
              max={100}
              value={progressForm.percentComplete}
              onChange={(event) =>
                setProgressForm((value) => ({
                  ...value,
                  percentComplete: event.target.value,
                }))
              }
            />
          </Field>
          <Field label="Nội dung báo cáo">
            <Textarea
              value={progressForm.content}
              onChange={(event) =>
                setProgressForm((value) => ({
                  ...value,
                  content: event.target.value,
                }))
              }
            />
          </Field>
          <Field label="File/evidence URL">
            <Input
              value={progressForm.attachmentUrl}
              onChange={(event) =>
                setProgressForm((value) => ({
                  ...value,
                  attachmentUrl: event.target.value,
                }))
              }
            />
          </Field>
        </div>
      </Modal>

      <Modal
        open={Boolean(deliverableOpen)}
        onClose={closeModals}
        title="Nộp sản phẩm bàn giao"
        footer={
          <>
            <Button variant="secondary" onClick={closeModals}>
              Hủy
            </Button>
            <Button
              onClick={submitDeliverable}
              loading={actionLoading === "deliverable"}
              disabled={Boolean(actionLoading)}
            >
              Nộp sản phẩm
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
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
          <Field label="Demo/evidence URL">
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
          <Field label="Ghi chú bàn giao">
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
        onClose={closeModals}
        title="Từ chối bàn giao"
        footer={
          <>
            <Button variant="secondary" onClick={closeModals}>
              Hủy
            </Button>
            <Button
              variant="danger"
              onClick={rejectMilestone}
              loading={actionLoading === "reject"}
              disabled={Boolean(actionLoading)}
            >
              Từ chối bàn giao
            </Button>
          </>
        }
      >
        <Notice tone="warning" title="Backend sẽ tạo hoặc cập nhật dispute.">
          Nếu đây là lần từ chối sau khi Expert nộp lại trong self-resolve,
          frontend không tạo dispute thứ hai.
        </Notice>
        <Field label="Lý do từ chối" className="mt-4">
          <Textarea
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
          />
        </Field>
      </Modal>

      <Modal
        open={Boolean(expertDisputeOpen)}
        onClose={closeModals}
        title="Tạo tranh chấp"
        footer={
          <>
            <Button variant="secondary" onClick={closeModals}>
              Hủy
            </Button>
            <Button
              variant="danger"
              onClick={initiateExpertDispute}
              loading={actionLoading === "dispute"}
              disabled={Boolean(actionLoading)}
            >
              Tạo tranh chấp
            </Button>
          </>
        }
      >
        <Notice tone="info" title="Không tạo dispute nếu milestone đã có active dispute." />
        <Field label="Loại tranh chấp" className="mt-4">
          <Select
            value={expertDisputeType}
            onChange={(event) =>
              setExpertDisputeType(event.target.value as DisputeInitiationType)
            }
          >
            {expertInitiationTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </Select>
        </Field>
      </Modal>

      <Modal
        open={Boolean(interventionOpen)}
        onClose={closeModals}
        title="Yêu cầu Staff can thiệp"
        footer={
          <>
            <Button variant="secondary" onClick={closeModals}>
              Hủy
            </Button>
            <Button
              onClick={requestStaffIntervention}
              loading={actionLoading === "intervention"}
              disabled={Boolean(actionLoading)}
            >
              Gửi yêu cầu
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Field label="Lý do">
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
        open={Boolean(cancelDisputeOpen)}
        onClose={closeModals}
        title="Rút dispute"
        footer={
          <>
            <Button variant="secondary" onClick={closeModals}>
              Hủy
            </Button>
            <Button
              variant="danger"
              onClick={cancelDispute}
              loading={actionLoading === "cancel-dispute"}
              disabled={Boolean(actionLoading)}
            >
              Xác nhận
            </Button>
          </>
        }
      >
        <Field label="Lý do">
          <Textarea
            value={cancelReason}
            onChange={(event) => setCancelReason(event.target.value)}
          />
        </Field>
      </Modal>

      <Modal
        open={terminationOpen || Boolean(withdrawTerminationOpen)}
        onClose={closeModals}
        title={
          withdrawTerminationOpen
            ? "Rút yêu cầu chấm dứt"
            : "Yêu cầu chấm dứt hợp đồng"
        }
        footer={
          <>
            <Button variant="secondary" onClick={closeModals}>
              Hủy
            </Button>
            <Button
              variant="danger"
              onClick={
                withdrawTerminationOpen ? withdrawTermination : requestTermination
              }
              loading={
                actionLoading === "termination" ||
                actionLoading === "withdraw-termination"
              }
              disabled={Boolean(actionLoading)}
            >
              Xác nhận
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Notice
            tone="warning"
            title="Termination sẽ khóa các action milestone mới."
          />
          <Field label="Lý do">
            <Textarea
              value={terminationForm.reason}
              onChange={(event) =>
                setTerminationForm((value) => ({
                  ...value,
                  reason: event.target.value,
                }))
              }
            />
          </Field>
          {!withdrawTerminationOpen && (
            <Field label="Evidence/file URL">
              <Input
                value={terminationForm.evidenceUrl}
                onChange={(event) =>
                  setTerminationForm((value) => ({
                    ...value,
                    evidenceUrl: event.target.value,
                  }))
                }
              />
            </Field>
          )}
        </div>
      </Modal>

      <Modal
        open={Boolean(partialEvidenceOpen)}
        onClose={closeModals}
        title="Nộp bằng chứng công việc một phần"
        footer={
          <>
            <Button variant="secondary" onClick={closeModals}>
              Hủy
            </Button>
            <Button
              onClick={submitPartialEvidence}
              loading={actionLoading === "partial-evidence"}
              disabled={Boolean(actionLoading)}
            >
              Nộp bằng chứng
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Notice
            tone="info"
            title="Chỉ dùng khi termination flow yêu cầu partial evidence."
          />
          <Field label="Ghi chú bằng chứng">
            <Textarea
              value={partialEvidenceForm.note}
              onChange={(event) =>
                setPartialEvidenceForm((value) => ({
                  ...value,
                  note: event.target.value,
                }))
              }
            />
          </Field>
          <Field label="Evidence/file URL">
            <Input
              value={partialEvidenceForm.url}
              onChange={(event) =>
                setPartialEvidenceForm((value) => ({
                  ...value,
                  url: event.target.value,
                }))
              }
            />
          </Field>
        </div>
      </Modal>

      <Modal
        open={reviewOpen}
        onClose={closeModals}
        title="Viết đánh giá đối tác"
        footer={
          <>
            <Button variant="secondary" onClick={closeModals}>
              Hủy
            </Button>
            <Button
              onClick={submitReview}
              loading={actionLoading === "review"}
              disabled={Boolean(actionLoading)}
            >
              Gửi đánh giá
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Field label="Điểm đánh giá (1-5)">
            <Select
              value={reviewForm.rating.toString()}
              onChange={(event) =>
                setReviewForm((value) => ({
                  ...value,
                  rating: Number(event.target.value),
                }))
              }
            >
              <option value="5">5 Sao - Rất tuyệt vời</option>
              <option value="4">4 Sao - Tốt</option>
              <option value="3">3 Sao - Bình thường</option>
              <option value="2">2 Sao - Kém</option>
              <option value="1">1 Sao - Rất tệ</option>
            </Select>
          </Field>
          <Field label="Nhận xét">
            <Textarea
              value={reviewForm.comment}
              onChange={(event) =>
                setReviewForm((value) => ({
                  ...value,
                  comment: event.target.value,
                }))
              }
              placeholder="Chia sẻ trải nghiệm làm việc..."
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}

function MilestoneWorkspace({
  milestone,
  criteria,
  reports,
  deliverables,
  activeDispute,
  actions,
}: {
  milestone: Milestone;
  criteria: AcceptanceCriteria[];
  reports: MilestoneProgressReport[];
  deliverables: Deliverable[];
  activeDispute?: Dispute;
  actions: React.ReactNode;
}) {
  const latestDeliverable = deliverables[deliverables.length - 1];
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={milestoneStatusLabel(milestone.status)} />
            <Badge tone="slate">{formatCurrency(getMilestoneBudget(milestone))}</Badge>
            {milestone.escrowReleasedAt && <Badge tone="mint">Escrow released</Badge>}
          </div>
          <h3 className="mt-3 font-display text-lg font-black text-ink">
            Milestone {milestone.orderIndex}: {milestone.milestoneName}
          </h3>
          {milestone.description && (
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
              {milestone.description}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
      </div>

      {activeDispute && (
        <Notice
          tone="warning"
          title={translateDisputeStatus(activeDispute.status) || "Dispute active"}
          className="mt-4"
        >
          {activeDispute.escalationReason ||
            activeDispute.evidenceReport ||
            "Milestone đang bị khóa bởi dispute."}
        </Notice>
      )}

      <div className="mt-4 grid gap-4 xl:grid-cols-4">
        <Panel title="Acceptance criteria">
          {criteria.length > 0 ? (
            criteria.map((item) => (
              <p key={item.criteriaId} className="text-sm leading-6 text-slate-600">
                {item.description}
              </p>
            ))
          ) : (
            <p className="text-sm text-slate-500">Backend chưa trả criteria.</p>
          )}
        </Panel>
        <Panel title="Progress reports">
          {reports.length > 0 ? (
            reports.map((report) => (
              <p key={report.progressReportId} className="text-sm leading-6 text-slate-600">
                {report.percentComplete ?? "-"}% - {report.content}
              </p>
            ))
          ) : (
            <p className="text-sm text-slate-500">Chưa có báo cáo tiến độ.</p>
          )}
        </Panel>
        <Panel title="Latest deliverable">
          {latestDeliverable ? (
            <div className="grid gap-2 text-sm leading-6 text-slate-600">
              <p>{latestDeliverable.submissionNotes || "Đã nộp bàn giao."}</p>
              {latestDeliverable.demoLink && (
                <a className="font-bold text-brand-600" href={latestDeliverable.demoLink} target="_blank" rel="noreferrer">
                  Mở demo/evidence
                </a>
              )}
              {latestDeliverable.sourceCodeUrl && (
                <a className="font-bold text-brand-600" href={latestDeliverable.sourceCodeUrl} target="_blank" rel="noreferrer">
                  Mở source
                </a>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Chưa có sản phẩm bàn giao.</p>
          )}
        </Panel>
        <Panel title="Settlement">
          <InfoLine
            label="Nguồn settlement"
            value={milestone.settlementSourceType || "Chưa settlement"}
          />
          <InfoLine
            label="Escrow released"
            value={
              milestone.escrowReleasedAt
                ? formatDateTime(milestone.escrowReleasedAt)
                : undefined
            }
          />
          {normalizeFlowStatus(milestone.status) === "CANCELLED" && (
            <InfoLine label="Trạng thái" value="Milestone đã bị hủy" />
          )}
        </Panel>
      </div>
    </div>
  );
}

function NextActionCard({
  milestone,
  onOpenMilestones,
}: {
  milestone: Milestone;
  onOpenMilestones: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpenMilestones}
      className="w-full rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left transition hover:border-brand-100 hover:bg-brand-50/60"
    >
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={milestoneStatusLabel(milestone.status)} />
        <Badge tone="slate">{formatCurrency(getMilestoneBudget(milestone))}</Badge>
      </div>
      <h3 className="mt-3 font-display text-base font-black text-ink">
        {milestone.milestoneName}
      </h3>
      <p className="mt-1 text-sm font-semibold text-slate-500">
        Mở tab Milestone để xử lý action phù hợp.
      </p>
    </button>
  );
}

function ConfirmFinancialModal({
  open,
  title,
  confirmLabel,
  loading,
  onClose,
  onConfirm,
  children,
}: {
  open: boolean;
  title: string;
  confirmLabel: string;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Hủy
          </Button>
          <Button onClick={onConfirm} loading={loading} disabled={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  );
}

function SettlementFacts({
  milestone,
  warning,
}: {
  milestone: Milestone;
  warning: string;
}) {
  return (
    <div className="grid gap-4">
      <Notice tone="warning" title={warning} />
      <div className="grid gap-3 md:grid-cols-3">
        <SummaryFact label="Milestone" value={milestone.milestoneName} />
        <SummaryFact
          label="Ngân sách"
          value={formatCurrency(getMilestoneBudget(milestone))}
        />
        <SummaryFact
          label="Trạng thái"
          value={milestoneStatusLabel(milestone.status)}
        />
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="font-extrabold text-ink">{title}</p>
      <div className="mt-3 grid gap-2">{children}</div>
    </div>
  );
}

function SummaryFact({ label, value }: { label: string; value?: string | number }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 break-words font-display text-lg font-black text-ink">
        {value || "Chưa có dữ liệu"}
      </p>
    </Card>
  );
}

function InfoLine({
  label,
  value,
}: {
  label: string;
  value?: string | number;
}) {
  return (
    <div>
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-700">
        {value || "Chưa có dữ liệu từ backend"}
      </p>
    </div>
  );
}

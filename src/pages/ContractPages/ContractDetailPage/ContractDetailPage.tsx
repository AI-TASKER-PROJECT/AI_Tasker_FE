import {
  CheckCircle2,
  FileText,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Star,
  WalletCards,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  contractApi,
  disputeApi,
  profileApi,
  walletApi,
} from "../../../lib/api";
import { useSession } from "../../../lib/session";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
} from "../../../lib/utils";
import type {
  BusinessProfile,
  Contract,
  ContractMilestone,
  ContractChangeMilestone,
  ContractChangeRequest,
  ContractDepositRateResponse,
  Dispute,
  ExpertProfile,
  Milestone,
  SystemWallet,
} from "../../../types";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  LinkButton,
  Modal,
  Notice,
  PageHeader,
  SectionHeading,
  StatusBadge,
  Field,
  Input,
  Textarea,
} from "../../../components/ui";
import {
  ContractLifecycle,
  ContractMetric,
  formatTimelineWeeks,
  formatTotalMilestoneDuration,
  getContractNextAction,
  getMilestoneBudget,
  getMilestoneDurationLabel,
  NDA_TERMS,
  normalizeContractStatus,
  Participant,
  SignatureBlock,
  translateContractStatus,
} from "../ContractPages.shared";

type ContactSource = {
  email?: string;
  phone?: string;
  accountEmail?: string;
  accountPhone?: string;
  contactEmail?: string;
  contactPhone?: string;
  phoneNumber?: string;
};

function firstContactValue(...values: Array<string | undefined>) {
  return values
    .find((value) => typeof value === "string" && value.trim())
    ?.trim();
}

function contactEmail(profile?: ContactSource | null, fallback?: string) {
  return firstContactValue(
    profile?.email,
    profile?.accountEmail,
    profile?.contactEmail,
    fallback,
  );
}

function contactPhone(profile?: ContactSource | null, fallback?: string) {
  return firstContactValue(
    profile?.phone,
    profile?.accountPhone,
    profile?.contactPhone,
    profile?.phoneNumber,
    fallback,
  );
}

function milestoneCriteriaLines(
  milestone?: Milestone | ContractMilestone | ContractChangeMilestone,
) {
  if (!milestone) return [];
  if ("criteria" in milestone && milestone.criteria?.length)
    return milestone.criteria.map((item) => item.description).filter(Boolean);
  if ("acceptanceCriteria" in milestone && milestone.acceptanceCriteria?.length)
    return milestone.acceptanceCriteria;
  const snapshot = milestone.criteriaSnapshot;
  if (!snapshot) return [];
  try {
    const parsed = JSON.parse(snapshot);
    if (Array.isArray(parsed))
      return parsed
        .map((item) => (typeof item === "string" ? item : item?.description))
        .filter(Boolean);
  } catch {
    /* Plain-text snapshots are handled below. */
  }
  return snapshot
    .split(/\r?\n/)
    .map((item) => item.replace(/^[-•\d.\s]+/, "").trim())
    .filter(Boolean);
}

function proposedChangeMilestones(request?: ContractChangeRequest | null) {
  if (!request?.proposedMilestones) return [];
  if (Array.isArray(request.proposedMilestones))
    return request.proposedMilestones;
  try {
    const parsed = JSON.parse(request.proposedMilestones);
    return Array.isArray(parsed) ? (parsed as ContractChangeMilestone[]) : [];
  } catch {
    return [];
  }
}

function milestoneDurationDays(
  milestone: Partial<ContractMilestone | Milestone | ContractChangeMilestone>,
) {
  const duration = Number(milestone.duration || 0);
  if (!Number.isFinite(duration) || duration <= 0) return 0;
  const unit = (milestone.durationUnit || "WEEK").toUpperCase();
  if (unit.includes("DAY")) return duration;
  if (unit.includes("MONTH")) return duration * 30;
  return duration * 7;
}

function sumMilestoneDurationDays(
  milestones: Array<
    Partial<ContractMilestone | Milestone | ContractChangeMilestone>
  >,
) {
  return milestones.reduce(
    (total, milestone) => total + milestoneDurationDays(milestone),
    0,
  );
}

function acceptedChangeTime(request: ContractChangeRequest) {
  return new Date(
    request.reviewedAt || request.updatedAt || request.createdAt || 0,
  ).getTime();
}

export function ContractDetailPage() {
  const { contractId } = useParams();
  const session = useSession();
  const [contract, setContract] = useState<Contract | null>(null);
  const [jobMilestones, setJobMilestones] = useState<Milestone[]>([]);
  const [contractMilestones, setContractMilestones] = useState<Milestone[]>([]);
  const [contractMilestoneViews, setContractMilestoneViews] = useState<
    ContractMilestone[]
  >([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [participants, setParticipants] = useState<{
    business: BusinessProfile | null;
    expert: ExpertProfile | null;
  }>({
    business: null,
    expert: null,
  });
  const [contractNotice, setContractNotice] = useState<{
    tone: "success" | "danger" | "info";
    title: string;
    message?: string;
  } | null>(null);
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositConfirmOpen, setDepositConfirmOpen] = useState(false);
  const [rejectConfirmOpen, setRejectConfirmOpen] = useState(false);
  const [rejectLoading, setRejectLoading] = useState(false);
  const [cancelDraftConfirmOpen, setCancelDraftConfirmOpen] = useState(false);
  const [cancelDraftLoading, setCancelDraftLoading] = useState(false);
  const [depositPaidLocally, setDepositPaidLocally] = useState(false);
  const [paymentWallet, setPaymentWallet] = useState<SystemWallet | null>(null);
  const [depositRates, setDepositRates] = useState<ContractDepositRateResponse>({
    businessPercentage: 20,
    expertPercentage: 10,
  });
  const [ndaModalMode, setNdaModalMode] = useState<"view" | "sign" | null>(
    null,
  );
  const [ndaSubmitting, setNdaSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [changeRequests, setChangeRequests] = useState<ContractChangeRequest[]>(
    [],
  );
  const [changeRequestOpen, setChangeRequestOpen] = useState(false);
  const [changeRequestLoading, setChangeRequestLoading] = useState(false);
  const [viewingChangeRequest, setViewingChangeRequest] =
    useState<ContractChangeRequest | null>(null);
  const [rejectingChangeRequest, setRejectingChangeRequest] =
    useState<ContractChangeRequest | null>(null);
  const [changeRequestReviewNote, setChangeRequestReviewNote] = useState("");
  const [changeRequestReviewLoading, setChangeRequestReviewLoading] =
    useState(false);
  const [changeRequestReviewError, setChangeRequestReviewError] = useState("");
  const [changeForm, setChangeForm] = useState({
    changeType: "MILESTONE",
    changeSummary: "",
    proposedBudget: "",
    proposedTimelineDays: "",
    proposedScope: "",
    milestoneId: "",
    milestoneName: "",
    milestoneDescription: "",
    milestoneDuration: "",
    milestoneBudget: "",
  });

  useEffect(() => {
    contractApi
      .getContract(Number(contractId))
      .then(setContract)
      .catch(() => setContract(null));
    contractApi
      .getDepositRates()
      .then(setDepositRates)
      .catch(() => undefined);
  }, [contractId]);

  useEffect(() => {
    if (!contract) return;
    let ignore = false;
    const jobId = contract.jobId;
    const activeContractId = contract.contractId;

    async function loadOperationalData() {
      try {
        const [jobMilestoneItems, contractMilestoneItems, disputeItems] =
          await Promise.all([
            contractApi.listJobMilestones(jobId).catch(() => []),
            contractApi.listMilestones(activeContractId).catch(() => []),
            disputeApi.listByContract(activeContractId).catch(() => []),
          ]);
        if (ignore) return;
        setJobMilestones(jobMilestoneItems);
        setContractMilestones(contractMilestoneItems);
        setContractMilestoneViews(
          contractMilestoneItems as unknown as ContractMilestone[],
        );
        setDisputes(disputeItems);
        contractApi
          .listChangeRequests(activeContractId)
          .then(setChangeRequests)
          .catch(() => setChangeRequests([]));
      } catch {
        if (!ignore) {
          setJobMilestones([]);
          setContractMilestones([]);
          setDisputes([]);
        }
      }
    }

    void loadOperationalData();
    return () => {
      ignore = true;
    };
  }, [contract]);

  const canRequestChange = ["DRAFT", "PENDING", "ACTIVE"].includes(
    (contract?.status || "").toUpperCase(),
  );
  const currentAccountId = Number(
    session?.accountId ||
      (session?.role === "BUSINESS"
        ? participants.business?.accountId
        : session?.role === "EXPERT"
          ? participants.expert?.accountId
          : undefined),
  );
  const isChangeRequestCreator = (request?: ContractChangeRequest | null) =>
    Boolean(
      request &&
      currentAccountId > 0 &&
      Number(request.requestedByAccountId) === currentAccountId,
    );
  const changeRequestHeading = (request: ContractChangeRequest) => {
    const requester = isChangeRequestCreator(request)
      ? "Bạn"
      : session?.role === "BUSINESS"
        ? "Chuyên gia"
        : "Doanh nghiệp";
    return `${requester} đã yêu cầu thay đổi ${
      request.changeType === "MILESTONE" ? "mốc" : "hợp đồng"
    }`;
  };
  const canReviewChangeRequest = (request?: ContractChangeRequest | null) =>
    Boolean(
      request &&
      request.status.toUpperCase() === "PENDING" &&
      currentAccountId > 0 &&
      !isChangeRequestCreator(request),
    );
  const selectedChangeMilestone = contractMilestoneViews.find(
    (item) => item.contractMilestoneId === Number(changeForm.milestoneId),
  );
  const selectedChangeCriteria = milestoneCriteriaLines(
    selectedChangeMilestone,
  );
  const viewingProposedMilestone =
    proposedChangeMilestones(viewingChangeRequest)[0];
  const viewingCurrentMilestone = contractMilestoneViews.find(
    (item) =>
      item.contractMilestoneId ===
      Number(viewingProposedMilestone?.contractMilestoneId),
  );
  const submitChangeRequest = async () => {
    if (!contract || !changeForm.changeSummary.trim()) return;
    setChangeRequestLoading(true);
    try {
      const selectedMilestone = contractMilestoneViews.find(
        (item) => item.contractMilestoneId === Number(changeForm.milestoneId),
      );
      if (!selectedMilestone) {
        setContractNotice({
          tone: "danger",
          title: "Chưa chọn mốc",
          message: "Vui lòng chọn một mốc chưa bắt đầu.",
        });
        return;
      }
      const proposedMilestones: ContractChangeRequest["proposedMilestones"] =
        selectedMilestone
          ? [
              {
                contractMilestoneId: selectedMilestone.contractMilestoneId,
                jobMilestoneId: selectedMilestone.jobMilestoneId,
                milestoneName:
                  changeForm.milestoneName.trim() ||
                  selectedMilestone.milestoneName,
                description:
                  changeForm.milestoneDescription.trim() ||
                  selectedMilestone.description,
                finalBudget: Number(
                  changeForm.milestoneBudget || selectedMilestone.finalBudget,
                ),
                orderIndex: selectedMilestone.orderIndex,
                duration: Number(
                  changeForm.milestoneDuration || selectedMilestone.duration,
                ),
                durationUnit: "WEEK",
                criteriaSnapshot: selectedMilestone.criteriaSnapshot,
                deliverableExpectation:
                  selectedMilestone.deliverableExpectation,
              },
            ]
          : undefined;
      const created = await contractApi.createChangeRequest(
        contract.contractId,
        {
          changeType: "MILESTONE",
          changeSummary: changeForm.changeSummary.trim(),
          proposedMilestones,
        },
      );
      setChangeRequests((items) => [created, ...items]);
      setChangeRequestOpen(false);
      setChangeForm({
        changeType: "MILESTONE",
        changeSummary: "",
        proposedBudget: "",
        proposedTimelineDays: "",
        proposedScope: "",
        milestoneId: "",
        milestoneName: "",
        milestoneDescription: "",
        milestoneDuration: "",
        milestoneBudget: "",
      });
    } finally {
      setChangeRequestLoading(false);
    }
  };
  const acceptChangeRequest = async (request: ContractChangeRequest) => {
    if (!contract) return;
    const updated = await contractApi.acceptChangeRequest(
      contract.contractId,
      request.requestId,
    );
    setChangeRequests((items) =>
      items.map((item) =>
        item.requestId === updated.requestId ? updated : item,
      ),
    );
    const [updatedContract, jobMilestoneItems, contractMilestoneItems] =
      await Promise.all([
        contractApi.getContract(contract.contractId),
        contractApi.listJobMilestones(contract.jobId).catch(() => []),
        contractApi.listMilestones(contract.contractId).catch(() => []),
      ]);
    setContract(updatedContract);
    setJobMilestones(jobMilestoneItems);
    setContractMilestones(contractMilestoneItems);
    setContractMilestoneViews(
      contractMilestoneItems as unknown as ContractMilestone[],
    );
    setViewingChangeRequest(null);
  };

  const rejectChangeRequest = async () => {
    if (!contract || !rejectingChangeRequest) return;
    if (!changeRequestReviewNote.trim()) {
      setChangeRequestReviewError("Vui lòng nhập lý do từ chối yêu cầu.");
      return;
    }
    setChangeRequestReviewLoading(true);
    setChangeRequestReviewError("");
    try {
      const updated = await contractApi.rejectChangeRequest(
        contract.contractId,
        rejectingChangeRequest.requestId,
        changeRequestReviewNote.trim(),
      );
      setChangeRequests((items) =>
        items.map((item) =>
          item.requestId === updated.requestId ? updated : item,
        ),
      );
      setRejectingChangeRequest(null);
      setChangeRequestReviewNote("");
    } catch (error) {
      setChangeRequestReviewError(
        error instanceof Error ? error.message : "Không thể từ chối yêu cầu.",
      );
    } finally {
      setChangeRequestReviewLoading(false);
    }
  };

  useEffect(() => {
    if (!contract) return;
    let ignore = false;
    const businessId = contract.businessId;
    const expertId = contract.expertId;

    async function loadParticipants() {
      try {
        const [businessResult, expertResult] = await Promise.allSettled([
          profileApi.getBusinessById(businessId),
          profileApi.getExpertById(expertId),
        ]);
        if (ignore) return;
        setParticipants({
          business:
            businessResult.status === "fulfilled" ? businessResult.value : null,
          expert:
            expertResult.status === "fulfilled" ? expertResult.value : null,
        });
      } catch {
        if (!ignore) {
          setParticipants({ business: null, expert: null });
        }
      }
    }

    void loadParticipants();
    return () => {
      ignore = true;
    };
  }, [contract]);

  useEffect(() => {
    if (
      !contract ||
      (session?.role !== "BUSINESS" && session?.role !== "EXPERT")
    ) {
      return;
    }
    let ignore = false;

    walletApi
      .current()
      .then((wallet) => {
        if (!ignore) setPaymentWallet(wallet);
      })
      .catch(() => {
        if (!ignore) setPaymentWallet(null);
      });

    return () => {
      ignore = true;
    };
  }, [contract, session?.role]);

  const pollingContractId = contract?.contractId;
  const pollingContractStatus = contract?.status;

  useEffect(() => {
    if (
      !pollingContractId ||
      normalizeContractStatus(pollingContractStatus) !== "COMPLETED"
    ) {
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const timer = window.setInterval(async () => {
      attempts += 1;
      try {
        const updated = await contractApi.getContract(pollingContractId);
        if (cancelled) return;
        setContract(updated);
        if (
          normalizeContractStatus(updated.status) === "CLOSED" ||
          attempts >= 8
        ) {
          window.clearInterval(timer);
        }
      } catch {
        if (attempts >= 8) {
          window.clearInterval(timer);
        }
      }
    }, 1500);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [pollingContractId, pollingContractStatus]);

  if (!contract) {
    return <EmptyState title="Không tìm thấy hợp đồng" description="" />;
  }

  const signContract = async () => {
    setContractNotice(null);
    try {
      const updated = await contractApi.sign(contract.contractId);
      setContract(updated);
      setContractNotice({
        tone: "success",
        title: "Ký hợp đồng thành công.",
        message:
          "Hệ thống đã ghi nhận xác nhận hợp đồng của bạn. Khi hai bên ký đủ hợp đồng và NDA, hợp đồng sẽ sẵn sàng cho bước tiếp theo.",
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setContractNotice({
        tone: "danger",
        title:
          error instanceof Error
            ? error.message
            : "Không thể ký hợp đồng. Vui lòng thử lại.",
      });
    }
  };

  const signNda = async () => {
    setContractNotice(null);
    try {
      const updated = await contractApi.signNda(contract.contractId);
      setContract(updated);
      setContractNotice({
        tone: "success",
        title: "Ký NDA thành công.",
        message: "Hệ thống đã ghi nhận chữ ký NDA của bạn cho hợp đồng này.",
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setContractNotice({
        tone: "danger",
        title:
          error instanceof Error
            ? error.message
            : "Không thể ký NDA. Vui lòng thử lại.",
      });
    }
  };

  const rejectContract = async () => {
    setRejectLoading(true);
    setContractNotice(null);
    try {
      const updated = await contractApi.rejectContract(contract.contractId);
      setContract(updated);
      setRejectConfirmOpen(false);
      setContractNotice({
        tone: "success",
        title: "Đã từ chối hợp đồng.",
        message:
          "Hợp đồng đã được hủy trước khi kích hoạt. Dự án sẽ được mở lại để Doanh nghiệp chọn bản đề xuất khác.",
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setContractNotice({
        tone: "danger",
        title:
          error instanceof Error
            ? error.message
            : "Không thể từ chối hợp đồng. Vui lòng thử lại.",
      });
    } finally {
      setRejectLoading(false);
    }
  };

  const cancelDraftContract = async () => {
    setCancelDraftLoading(true);
    setContractNotice(null);
    try {
      const updated = await contractApi.cancelDraft(contract.contractId);
      setContract(updated);
      setCancelDraftConfirmOpen(false);
      setContractNotice({
        tone: "success",
        title: "Đã hủy hợp đồng nháp.",
        message:
          "Hợp đồng đã được hủy trước khi ký. Thao tác này không liên quan đến hủy ngang và không phát sinh bồi thường.",
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setContractNotice({
        tone: "danger",
        title:
          error instanceof Error
            ? error.message
            : "Không thể hủy hợp đồng nháp. Vui lòng thử lại.",
      });
    } finally {
      setCancelDraftLoading(false);
    }
  };

  const refreshContract = async () => {
    const updated = await contractApi.getContract(contract.contractId);
    setContract(updated);
    setJobMilestones(
      await contractApi.listJobMilestones(updated.jobId).catch(() => []),
    );
    setContractMilestones(
      await contractApi.listMilestones(updated.contractId).catch(() => []),
    );
    return updated;
  };

  const payDeposit = async () => {
    setDepositLoading(true);
    setContractNotice(null);
    try {
      const isExpertDeposit = session?.role === "EXPERT";
      const result = isExpertDeposit
        ? await contractApi.payExpertDeposit(contract.contractId)
        : await contractApi.payDeposit(contract.contractId);
      if (result.needTopup) {
        setContractNotice({
          tone: "danger",
          title: "Ví chưa đủ để ký quỹ hợp đồng.",
          message: result.missingAmount
            ? `Cần nạp thêm ${formatCurrency(result.missingAmount)}.`
            : result.message,
        });
        return;
      }
      if (result.redirectUrl) {
        window.location.assign(result.redirectUrl);
        return;
      }
      const depositAmount = result.data?.depositAmount ?? currentDepositAmount;
      const [, updatedWallet] = await Promise.all([
        refreshContract(),
        walletApi.current().catch(() => null),
      ]);
      setPaymentWallet(updatedWallet);
      setDepositPaidLocally(true);
      setDepositConfirmOpen(false);
      window.dispatchEvent(new Event("aitasker:reload-wallet"));
      setContractNotice({
        tone: "success",
        title: "Đã giữ tiền ký quỹ hợp đồng.",
        message: updatedWallet
          ? `Hệ thống đã giữ ${formatCurrency(depositAmount)} vào tiền ký quỹ. Số dư khả dụng còn ${formatCurrency(updatedWallet.availableBalance)}, tiền ký quỹ hiện tại ${formatCurrency(updatedWallet.escrowBalance)}.`
          : `Hệ thống đã giữ ${formatCurrency(depositAmount)} vào tiền ký quỹ. Hợp đồng sẽ được kích hoạt khi cả Doanh nghiệp và Chuyên gia đều đã ký quỹ.`,
      });
      setDepositPaidLocally(true);
    } catch (err) {
      setContractNotice({
        tone: "danger",
        title:
          err instanceof Error ? err.message : "Không thể ký quỹ hợp đồng.",
      });
    } finally {
      setDepositLoading(false);
    }
  };
  const contractTitle =
    contract.contractTitle || contract.title || "Hợp đồng chưa có tên";
  const contractStatus = normalizeContractStatus(contract.status);
  const contractInProgress = ["ACTIVE", "IN_PROGRESS"].includes(contractStatus);
  const renderedMilestones =
    contract.contractMilestones && contract.contractMilestones.length > 0
      ? contract.contractMilestones
      : contractMilestones;
  const projectSummaryAvailable =
    ["COMPLETED", "CLOSED"].includes(contractStatus) &&
    renderedMilestones.length > 0 &&
    renderedMilestones.every(
      (milestone) => normalizeContractStatus(milestone.status) === "COMPLETED",
    );
  const originalContractBudget = renderedMilestones.length
    ? renderedMilestones.reduce(
        (total, milestone) =>
          total +
          Number(
            "originalBudget" in milestone ? milestone.originalBudget || 0 : 0,
          ),
        0,
      ) || Number(contract.totalBudget || 0)
    : Number(contract.totalBudget || 0);
  const proposedContractBudget = renderedMilestones.length
    ? renderedMilestones.reduce(
        (total, milestone) =>
          total +
          Number(
            "finalBudget" in milestone
              ? milestone.finalBudget || 0
              : milestone.fundsAllocated || 0,
          ),
        0,
      ) || Number(contract.totalBudget || 0)
    : Number(contract.totalBudget || 0);
  const currentDepositPercentage =
    session?.role === "EXPERT"
      ? depositRates.expertPercentage
      : depositRates.businessPercentage;
  const currentDepositAmount =
    (proposedContractBudget * currentDepositPercentage) / 100;
  const currentDepositRoleLabel =
    session?.role === "EXPERT" ? "Chuyên gia" : "Doanh nghiệp";
  const ndaSigned = Boolean(
    contract.ndaSigned ||
    (contract.businessNdaSignedAt && contract.expertNdaSignedAt),
  );
  const businessAccepted = Boolean(contract.businessAcceptedAt);
  const expertAccepted = Boolean(contract.expertAcceptedAt);
  const businessNdaSigned = Boolean(contract.businessNdaSignedAt);
  const expertNdaSigned = Boolean(contract.expertNdaSignedAt);
  const readyToActivate =
    businessAccepted && expertAccepted && businessNdaSigned && expertNdaSigned;
  const canCurrentPartyAct =
    session?.role === "BUSINESS" || session?.role === "EXPERT";
  const currentPartyAccepted =
    session?.role === "BUSINESS"
      ? businessAccepted
      : session?.role === "EXPERT"
        ? expertAccepted
        : false;
  const currentPartyNdaSigned =
    session?.role === "BUSINESS"
      ? businessNdaSigned
      : session?.role === "EXPERT"
        ? expertNdaSigned
        : false;
  const activeDisputes = disputes.filter(
    (item) =>
      !["RESOLVED", "CLOSED", "CANCELLED"].includes(
        (item.status || "").trim().toUpperCase(),
      ),
  );
  const underReviewCount = jobMilestones.filter(
    (item) => normalizeContractStatus(item.status) === "UNDER_REVIEW",
  ).length;
  const originalTimelineDays = Number(contract.timelineDays || 0);
  const acceptedChangeRequests = changeRequests
    .filter((request) => request.status.toUpperCase() === "ACCEPTED")
    .slice()
    .sort((a, b) => acceptedChangeTime(a) - acceptedChangeTime(b));
  const latestAcceptedChange =
    acceptedChangeRequests[acceptedChangeRequests.length - 1];
  const acceptedChangeNumber = acceptedChangeRequests.length;
  const latestAcceptedMilestones =
    proposedChangeMilestones(latestAcceptedChange);
  const changedBudget =
    latestAcceptedChange?.proposedBudget ??
    (latestAcceptedMilestones.some((milestone) => milestone.finalBudget != null)
      ? renderedMilestones.reduce(
          (total, milestone) =>
            total +
            Number("finalBudget" in milestone ? milestone.finalBudget || 0 : 0),
          0,
        )
      : undefined);
  const changedTimelineDays =
    latestAcceptedChange?.proposedTimelineDays ??
    (latestAcceptedMilestones.some((milestone) => milestone.duration != null)
      ? sumMilestoneDurationDays(renderedMilestones)
      : undefined);
  const changedTimelineLabel =
    changedTimelineDays && changedTimelineDays > 0
      ? formatTimelineWeeks(changedTimelineDays)
      : undefined;
  const hasAcceptedChange = acceptedChangeNumber > 0;
  const displayedContractBudget = changedBudget ?? proposedContractBudget;
  const displayedTimelineDays = changedTimelineDays ?? originalTimelineDays;
  const displayedTimelineLabel =
    changedTimelineLabel || formatTimelineWeeks(originalTimelineDays);
  const totalMilestoneDurationLabel =
    formatTotalMilestoneDuration(renderedMilestones);
  const businessDisplayName =
    contract.businessName ||
    participants.business?.companyName ||
    "Doanh nghiệp";
  const expertDisplayName =
    contract.expertName || participants.expert?.fullName || "Chuyên gia";
  const sessionPhone = session?.phone;
  const isBusinessSession =
    session?.role === "BUSINESS" &&
    participants.business?.accountId === session.accountId;
  const isExpertSession =
    session?.role === "EXPERT" &&
    participants.expert?.accountId === session.accountId;
  const businessEmail = contactEmail(
    participants.business,
    isBusinessSession ? session?.email : undefined,
  );
  const businessPhone = contactPhone(
    participants.business,
    isBusinessSession ? sessionPhone : undefined,
  );
  const expertEmail = contactEmail(
    participants.expert,
    isExpertSession ? session?.email : undefined,
  );
  const expertPhone = contactPhone(
    participants.expert,
    isExpertSession ? sessionPhone : undefined,
  );
  const contractStartDate = contract.createdAt || contract.activatedAt;
  const contractEndDate = contractStartDate
    ? new Date(
        new Date(contractStartDate).getTime() +
          displayedTimelineDays * 24 * 60 * 60 * 1000,
      ).toISOString()
    : undefined;
  const contractTimelineLabel =
    contractStartDate && contractEndDate
      ? `${formatDate(contractStartDate)} - ${formatDate(contractEndDate)}`
      : "Chưa có timeline";
  const cancelledByBusiness =
    contract.cancelledByRole?.toUpperCase() === "BUSINESS" ||
    contract.cancelledByAccountId === contract.businessId;
  const cancelledByExpert =
    contract.cancelledByRole?.toUpperCase() === "EXPERT" ||
    contract.cancelledByAccountId === contract.expertId;
  const nextAction =
    contractStatus === "CANCELLED" && (cancelledByBusiness || cancelledByExpert)
      ? {
          tone: "danger" as const,
          title: cancelledByBusiness
            ? `Doanh nghiệp ${businessDisplayName} đã hủy hợp đồng nháp.`
            : `Chuyên gia ${expertDisplayName} đã từ chối hợp đồng.`,
          description:
            "Hợp đồng đã bị hủy trước khi ký hoặc kích hoạt. Các mốc không thể tiếp tục thực hiện.",
        }
      : getContractNextAction({
          contract,
          role: session?.role,
          businessAccepted,
          expertAccepted,
          businessNdaSigned,
          expertNdaSigned,
          underReviewCount,
          activeDisputeCount: activeDisputes.length,
        });
  const canPayDeposit =
    (session?.role === "BUSINESS" || session?.role === "EXPERT") &&
    contractStatus === "PENDING" &&
    readyToActivate &&
    !depositPaidLocally;
  const canExpertRejectContract =
    session?.role === "EXPERT" &&
    ["DRAFT", "PENDING"].includes(contractStatus) &&
    !expertAccepted;
  const canBusinessCancelDraft =
    session?.role === "BUSINESS" &&
    contractStatus === "DRAFT" &&
    !businessAccepted;
  const availableBalance = paymentWallet?.availableBalance ?? 0;
  const depositMissingAmount = Math.max(
    0,
    currentDepositAmount - availableBalance,
  );
  const hasEnoughDepositBalance = depositMissingAmount <= 0;
  const businessSignatureComplete = businessAccepted && businessNdaSigned;
  const expertSignatureComplete = expertAccepted && expertNdaSigned;
  const signatureProgress = [
    {
      label: "Doanh nghiệp",
      name: businessDisplayName,
      accepted: businessAccepted,
      completed: businessSignatureComplete,
      acceptedAt: contract.businessAcceptedAt,
      completedAt: contract.businessNdaSignedAt,
    },
    {
      label: "Chuyên gia",
      name: expertDisplayName,
      accepted: expertAccepted,
      completed: expertSignatureComplete,
      acceptedAt: contract.expertAcceptedAt,
      completedAt: contract.expertNdaSignedAt,
    },
  ].filter((item) => item.accepted || item.completed);
  const currentPartyLabel =
    session?.role === "BUSINESS"
      ? "doanh nghiệp"
      : session?.role === "EXPERT"
        ? "chuyên gia"
        : "bên tham gia";
  const ndaModalOpen = ndaModalMode !== null;
  const ndaModalTitle =
    ndaModalMode === "sign"
      ? "Điều khoản NDA và xác nhận ký"
      : "Nội dung NDA của hợp đồng";
  const ndaModalDescription =
    ndaModalMode === "sign"
      ? "Vui lòng đọc điều khoản bảo mật trước khi xác nhận ký NDA trên hệ thống."
      : "Bạn đang xem lại bộ điều khoản NDA được lưu trên hệ thống cho hợp đồng này.";
  const openNdaPreview = () => setNdaModalMode("view");
  const openNdaSigning = () => setNdaModalMode("sign");
  const closeNdaModal = () => {
    if (!ndaSubmitting) {
      setNdaModalMode(null);
    }
  };
  const confirmNdaSigning = async () => {
    setNdaSubmitting(true);
    try {
      await signNda();
      setNdaModalMode(null);
    } finally {
      setNdaSubmitting(false);
    }
  };

  const refreshContractDetail = async () => {
    if (!contractId) return;
    setRefreshing(true);
    try {
      const updatedContract = await contractApi.getContract(Number(contractId));
      setContract(updatedContract);
      const [
        jobMilestoneItems,
        contractMilestoneItems,
        disputeItems,
        businessResult,
        expertResult,
      ] = await Promise.all([
        contractApi.listJobMilestones(updatedContract.jobId).catch(() => []),
        contractApi.listMilestones(updatedContract.contractId).catch(() => []),
        disputeApi.listByContract(updatedContract.contractId).catch(() => []),
        profileApi
          .getBusinessById(updatedContract.businessId)
          .catch(() => null),
        profileApi.getExpertById(updatedContract.expertId).catch(() => null),
      ]);
      setJobMilestones(jobMilestoneItems);
      setContractMilestones(contractMilestoneItems);
      setDisputes(disputeItems);
      setParticipants({
        business: businessResult,
        expert: expertResult,
      });
      if (session?.role === "BUSINESS" || session?.role === "EXPERT") {
        setPaymentWallet(await walletApi.current().catch(() => null));
      }
    } catch {
      setContractNotice({
        tone: "danger",
        title: "Không thể làm mới dữ liệu hợp đồng.",
        message: "Vui lòng thử lại sau ít phút.",
      });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          eyebrow="CHI TIẾT HỢP ĐỒNG"
          title={contractTitle}
          description="Thông tin chi tiết của hợp đồng, bao gồm các bên tham gia, trạng thái ký hợp đồng, NDA, mốc, ngân sách và thời gian thực hiện."
          actions={
            <>
              <Button variant="secondary" onClick={openNdaPreview}>
                <FileText className="h-4 w-4" />
                Xem NDA
              </Button>
              <Button
                variant="secondary"
                onClick={refreshContractDetail}
                loading={refreshing}
              >
                <RefreshCw className="h-4 w-4" />
                Làm mới
              </Button>
              <LinkButton
                to={`/app/contracts/${contract.contractId}/workspace`}
                variant="secondary"
              >
                Không gian làm việc
              </LinkButton>
              {projectSummaryAvailable && (
                <LinkButton to={`/app/contracts/${contract.contractId}/summary`}>
                  <CheckCircle2 className="h-4 w-4" />
                  Xem tổng kết dự án
                </LinkButton>
              )}
              {canRequestChange && (
                <Button
                  variant="secondary"
                  onClick={() => setChangeRequestOpen(true)}
                >
                  Yêu cầu thay đổi
                </Button>
              )}
              {contractStatus === "CLOSED" && (
                <LinkButton
                  to={`/app/reviews?contractId=${contract.contractId}`}
                  variant="secondary"
                >
                  <Star className="h-4 w-4" />
                  Đánh giá đối tác
                </LinkButton>
              )}
            </>
          }
        />
      </div>
      {contractNotice && (
        <Notice tone={contractNotice.tone} title={contractNotice.title}>
          <div className="space-y-3">
            <p>{contractNotice.message}</p>
            {contractNotice.tone === "success" &&
              depositPaidLocally &&
              session?.role === "BUSINESS" && (
                <div className="flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-white/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-semibold leading-6 text-slate-700">
                    Để chuyên gia bắt đầu làm việc, bạn cần ký quỹ cột mốc 1. Tiền
                    sẽ được giữ trong quỹ bảo đảm và chỉ giải ngân sau khi bạn nghiệm
                    thu.
                  </p>
                  <LinkButton
                    to={`/app/contracts/${contract.contractId}/workspace?focus=milestone-deposit`}
                    size="sm"
                  >
                    Đi tới không gian làm việc và ký quỹ cột mốc
                  </LinkButton>
                </div>
              )}
          </div>
        </Notice>
      )}
      {changeRequests.length > 0 && (
        <Card className="p-5">
          <SectionHeading
            title="Yêu cầu thay đổi về cột mốc của hợp đồng"
            description="Các thay đổi chỉ có hiệu lực sau khi bên còn lại chấp nhận."
          />
          <div className="mt-4 space-y-3">
            {changeRequests.map((request) => (
              <div
                key={request.requestId}
                className="rounded-2xl border border-slate-100 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-extrabold text-ink">
                      {changeRequestHeading(request)}
                    </p>
                  </div>
                  <StatusBadge status={request.status} />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setViewingChangeRequest(request)}
                  >
                    Xem chi tiết
                  </Button>
                  {canReviewChangeRequest(request) && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => acceptChangeRequest(request)}
                      >
                        Chấp nhận
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => {
                          setChangeRequestReviewError("");
                          setChangeRequestReviewNote("");
                          setRejectingChangeRequest(request);
                        }}
                      >
                        Từ chối
                      </Button>
                    </>
                  )}
                  {request.status.toUpperCase() === "PENDING" &&
                    isChangeRequestCreator(request) && (
                      <span className="text-sm font-semibold text-slate-500">
                        Đang chờ đối tác phản hồi
                      </span>
                    )}
                  {request.reviewNote && (
                    <span className="text-sm font-semibold text-slate-500">
                      Đã có phản hồi · xem chi tiết
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
      {canPayDeposit && (
        <Notice
          tone="warning"
          title="NDA đã ký. Bước tiếp theo: thanh toán ký quỹ."
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span>
              Thanh toán {currentDepositRoleLabel} để hoàn tất kích hoạt hợp
              đồng sau khi cả hai bên đã ký quỹ.
            </span>
            <Button onClick={() => setDepositConfirmOpen(true)}>
              <WalletCards className="h-4 w-4" />
              Thanh toán ký quỹ
            </Button>
          </div>
        </Notice>
      )}
      <Card className="p-4">
        <SectionHeading
          title="Vòng đời hợp đồng"
          description="Các bước này thể hiện trạng thái hiện tại của hợp đồng trên hệ thống."
        />
        <ContractLifecycle status={contract.status} />
      </Card>
      <div className="grid gap-6">
        <Card className="p-6">
          <Notice
            tone={nextAction.tone}
            title={nextAction.title}
            className="mb-5"
          >
            {nextAction.description}
          </Notice>

          {contractInProgress && (
            <Notice
              tone="info"
              title="Hợp đồng đang trong quá trình thực hiện, các thao tác đổi trạng thái đã bị khóa."
              className="mb-5"
            />
          )}

          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={translateContractStatus(contract.status)} />
            <Badge tone={ndaSigned ? "mint" : "amber"}>
              <LockKeyhole className="h-3.5 w-3.5" />
              NDA {ndaSigned ? "đã ký" : "chưa ký"}
            </Badge>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <ContractMetric
              label="Tổng ngân sách gốc"
              value={formatCurrency(originalContractBudget)}
            />
            <ContractMetric
              label={`Tổng ngân sách đề xuất${hasAcceptedChange && changedBudget != null ? " sau thay đổi" : ""}`}
              value={formatCurrency(displayedContractBudget)}
            />
            <ContractMetric
              label={`Ký quỹ ${currentDepositPercentage}% (theo ngân sách đề xuất)`}
              value={formatCurrency(currentDepositAmount)}
            />
            <ContractMetric
              label={`Timeline${hasAcceptedChange && changedTimelineLabel ? " sau thay đổi" : ""}`}
              value={displayedTimelineLabel}
            />
            <ContractMetric
              label="Ngày tạo hợp đồng"
              value={formatDateTime(contract.createdAt)}
            />
            <ContractMetric
              label="Chờ nghiệm thu"
              value={`${underReviewCount} mốc`}
            />
            <ContractMetric
              label="Tranh chấp mở"
              value={`${activeDisputes.length} vụ`}
            />
          </div>

          <div className="mt-6 rounded-3xl bg-slate-50 p-5">
            <SectionHeading
              title="Hai bên tham gia"
              description="Thông tin liên hệ và chi tiết của hai bên tham gia hợp đồng, bao gồm doanh nghiệp và chuyên gia thực hiện."
            />
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Participant
                label="Bên A - Doanh nghiệp"
                value={businessDisplayName}
                details={[
                  ["Mã số thuế", participants.business?.taxCode],
                  ["Địa chỉ", participants.business?.address],

                  ["Email", businessEmail],
                  ["Số điện thoại", businessPhone],
                ]}
              />
              <Participant
                label="Bên B - Chuyên gia"
                value={expertDisplayName}
                details={[
                  ["Chức danh", participants.expert?.title],
                  ["Email", expertEmail],
                  ["Số điện thoại", expertPhone],
                  [
                    "Kinh nghiệm",
                    participants.expert?.yearsOfExperience != null
                      ? `${participants.expert.yearsOfExperience} năm`
                      : undefined,
                  ],
                ]}
              />
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-slate-100 bg-white p-5">
            <SectionHeading
              title="Nội dung hợp đồng"
              description="Hiển thị thông tin chi tiết của hợp đồng, chữ ký/xác thực của hai bên và các mốc."
            />
            <div className="mt-4 border-b border-slate-100 pb-4 text-center">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                Hợp đồng dịch vụ AI Tasker
              </p>
              <h3 className="mt-2 font-display text-2xl font-black text-ink">
                {contractTitle}
              </h3>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <ContractMetric
                label="Tổng ngân sách gốc"
                value={formatCurrency(originalContractBudget)}
              />
              <ContractMetric
                label={`Tổng ngân sách đề xuất${hasAcceptedChange && changedBudget != null ? " sau thay đổi" : ""}`}
                value={formatCurrency(displayedContractBudget)}
              />
              <ContractMetric
                label={`Ký quỹ ${currentDepositPercentage}% (theo ngân sách đề xuất)`}
                value={formatCurrency(currentDepositAmount)}
              />
              <ContractMetric
                label={`Thời hạn${hasAcceptedChange && changedTimelineLabel ? " sau thay đổi" : ""}`}
                value={displayedTimelineLabel}
              />
              <ContractMetric
                label={`Timeline${hasAcceptedChange && changedTimelineLabel ? " sau thay đổi" : ""}`}
                value={contractTimelineLabel}
              />
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <SignatureBlock
                title="Đại diện doanh nghiệp"
                name={businessDisplayName}
                signedAt={contract.businessAcceptedAt}
                ndaSigned={businessNdaSigned}
                verified={readyToActivate}
              />
              <SignatureBlock
                title="Chuyên gia thực hiện"
                name={expertDisplayName}
                signedAt={contract.expertAcceptedAt}
                ndaSigned={expertNdaSigned}
                verified={readyToActivate}
              />
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-slate-100 p-5">
            <SectionHeading
              title="Trạng thái chữ ký hợp đồng"
              description="Hiển thị bên đã ký/xác thực; khi đủ hai bên thì hợp đồng sẵn sàng kích hoạt."
            />
            <Notice
              tone={
                readyToActivate || contractStatus === "ACTIVE"
                  ? "success"
                  : "info"
              }
              title={
                readyToActivate || contractStatus === "ACTIVE"
                  ? "Hợp đồng đã có đủ chữ ký và xác thực của 2 bên."
                  : signatureProgress.length > 0
                    ? "Hợp đồng đang chờ bên còn lại hoàn tất chữ ký/xác thực."
                    : "Hợp đồng chưa có bên nào ký/xác thực."
              }
              className="mt-4"
            >
              {contractStatus === "ACTIVE"
                ? "Hợp đồng đã hoạt động, ngân sách mốc và trạng thái công việc đã được hệ thống cập nhật."
                : readyToActivate
                  ? "Doanh nghiệp và Chuyên gia đã hoàn tất hợp đồng cùng NDA. Doanh nghiệp có thể tiếp tục ký quỹ để kích hoạt luồng làm việc."
              : "Bên đã ký sẽ được ghi nhận ngay khi máy chủ trả thời điểm ký hoặc xác thực."}
            </Notice>
            {signatureProgress.length > 0 && !readyToActivate && (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {signatureProgress.map((item) => (
                  <div
                    key={item.label}
                    className={
                      item.completed
                        ? "rounded-2xl border border-mint-100 bg-mint-50 p-4"
                        : "rounded-2xl border border-amber-100 bg-amber-50 p-4"
                    }
                  >
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                      {item.label}
                    </p>
                    <p className="mt-1 font-display text-lg font-black text-ink">
                      {item.name}
                    </p>
                    <p
                      className={
                        item.completed
                          ? "mt-2 text-sm font-bold text-mint-700"
                          : "mt-2 text-sm font-bold text-amber-700"
                      }
                    >
                      {item.completed
                        ? `Đã ký đủ hợp đồng và NDA: ${formatDateTime(item.completedAt)}`
                        : `Đã ký hợp đồng: ${formatDateTime(item.acceptedAt)}, chờ ký NDA`}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 rounded-3xl border border-slate-100 p-5">
            <SectionHeading
              title="Mốc"
              description="Các ngân sách chốt được tạo từ dự án và bản đề xuất đã được chấp nhận."
              action={
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-right">
                  <p className="text-xs font-bold text-slate-400">
                    Tổng thời gian mốc
                  </p>
                  <p className="mt-1 font-display text-lg font-black text-ink">
                    {totalMilestoneDurationLabel}
                  </p>
                </div>
              }
            />
            <div className="mt-4 grid gap-3">
              {renderedMilestones.map((milestone) => (
                <div
                  key={
                    "contractMilestoneId" in milestone
                      ? milestone.contractMilestoneId
                      : milestone.milestoneId
                  }
                  className="grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-[minmax(0,1fr)_160px_160px]"
                >
                  <div className="min-w-0">
                    <p className="font-extrabold text-ink">
                      {milestone.orderIndex}. {milestone.milestoneName}
                    </p>
                    {milestone.description && (
                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        {milestone.description}
                      </p>
                    )}
                    <p className="mt-2 text-xs font-bold text-slate-400">
                      Thời gian: {getMilestoneDurationLabel(milestone)}
                    </p>
                  </div>
                  <ContractMetric
                    label="Ngân sách gốc"
                    value={formatCurrency(
                      "originalBudget" in milestone
                        ? milestone.originalBudget
                        : milestone.fundsAllocated,
                    )}
                  />
                  <ContractMetric
                    label="Ngân sách chốt"
                    value={formatCurrency(getMilestoneBudget(milestone))}
                  />
                </div>
              ))}
              {renderedMilestones.length === 0 && (
                <EmptyState
                  title="Chưa có mốc draft"
                  description="Hệ thống chưa có dữ liệu mốc cho hợp đồng này."
                />
              )}
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {canBusinessCancelDraft && (
              <Button
                variant="danger"
                onClick={() => setCancelDraftConfirmOpen(true)}
              >
                <XCircle className="h-4 w-4" />
                Hủy hợp đồng nháp
              </Button>
            )}
            {canExpertRejectContract && (
              <Button
                variant="danger"
                onClick={() => setRejectConfirmOpen(true)}
              >
                <XCircle className="h-4 w-4" />
                Từ chối hợp đồng
              </Button>
            )}
            {canCurrentPartyAct && contractStatus === "DRAFT" && (
              <Button onClick={signContract} disabled={currentPartyAccepted}>
                <CheckCircle2 className="h-4 w-4" />
                Chấp nhận hợp đồng
              </Button>
            )}
            {canCurrentPartyAct && contractStatus === "DRAFT" && (
              <Button
                variant="secondary"
                onClick={openNdaSigning}
                disabled={!currentPartyAccepted || currentPartyNdaSigned}
              >
                <ShieldCheck className="h-4 w-4" />
                Ký NDA
              </Button>
            )}
            {canPayDeposit && (
              <Button onClick={() => setDepositConfirmOpen(true)}>
                <WalletCards className="h-4 w-4" />
                Thanh toán ký quỹ {currentDepositRoleLabel}
              </Button>
            )}
          </div>
        </Card>
      </div>

      <Modal
        open={ndaModalOpen}
        onClose={closeNdaModal}
        title={ndaModalTitle}
        description={ndaModalDescription}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeNdaModal}>
              Đóng
            </Button>
            {ndaModalMode === "sign" && (
              <Button
                onClick={confirmNdaSigning}
                disabled={!currentPartyAccepted || currentPartyNdaSigned}
                loading={ndaSubmitting}
              >
                <ShieldCheck className="h-4 w-4" />
                Xác nhận ký NDA
              </Button>
            )}
          </>
        }
      >
        <Notice tone="info" title={`Áp dụng cho ${contractTitle}`}>
          NDA này ràng buộc {currentPartyLabel} trong việc bảo mật thông tin dự
          án, tài liệu bàn giao và dữ liệu phát sinh trong quá trình hợp tác.
        </Notice>
        <div className="mt-5 space-y-4">
          {NDA_TERMS.map((section) => (
            <div
              key={section.title}
              className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4"
            >
              <h4 className="text-sm font-extrabold text-ink">
                {section.title}
              </h4>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {section.body}
              </p>
            </div>
          ))}
        </div>
        {ndaModalMode === "sign" && (
          <Notice
            tone={
              currentPartyAccepted && !currentPartyNdaSigned
                ? "success"
                : "warning"
            }
            title={
              currentPartyNdaSigned
                ? "Bạn đã ký NDA cho hợp đồng này."
                : currentPartyAccepted
                  ? "Sau khi xác nhận, hệ thống sẽ ghi nhận thời điểm ký NDA của bạn."
                  : "Bạn cần chấp nhận hợp đồng trước khi ký NDA."
            }
            className="mt-5"
          />
        )}
      </Modal>

      <Modal
        open={rejectConfirmOpen}
        onClose={() => !rejectLoading && setRejectConfirmOpen(false)}
        title="Xác nhận từ chối hợp đồng"
        description="Thao tác này chỉ áp dụng khi hợp đồng chưa kích hoạt. Sau khi từ chối, hợp đồng sẽ bị hủy và dự án được mở lại để Doanh nghiệp chọn bản đề xuất khác."
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setRejectConfirmOpen(false)}
              disabled={rejectLoading}
            >
              Hủy
            </Button>
            <Button
              variant="danger"
              onClick={rejectContract}
              loading={rejectLoading}
            >
              <XCircle className="h-4 w-4" />
              Từ chối hợp đồng
            </Button>
          </>
        }
      >
        <Notice tone="warning" title={`Hợp đồng: ${contractTitle}`}>
          Bạn đang từ chối hợp đồng trước khi kích hoạt. Thao tác này không phải
          hủy ngang hợp đồng, không phát sinh bồi thường.
        </Notice>
      </Modal>

      <Modal
        open={cancelDraftConfirmOpen}
        onClose={() => !cancelDraftLoading && setCancelDraftConfirmOpen(false)}
        title="Xác nhận hủy hợp đồng nháp"
        description="Hợp đồng nháp sẽ chuyển sang trạng thái đã hủy trước khi hai bên ký hoặc ký NDA."
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setCancelDraftConfirmOpen(false)}
              disabled={cancelDraftLoading}
            >
              Quay lại
            </Button>
            <Button
              variant="danger"
              onClick={cancelDraftContract}
              loading={cancelDraftLoading}
            >
              <XCircle className="h-4 w-4" />
              Xác nhận hủy
            </Button>
          </>
        }
      >
        <Notice tone="warning" title="Hủy hợp đồng nháp">
          Đây là thao tác hủy trước khi kích hoạt, không phải hủy ngang và không
          phát sinh bồi thường.
        </Notice>
      </Modal>

      <Modal
        open={changeRequestOpen}
        onClose={() => !changeRequestLoading && setChangeRequestOpen(false)}
        title="Yêu cầu thay đổi hợp đồng"
        description="Bên còn lại cần chấp nhận trước khi hợp đồng được cập nhật."
        size="xl"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setChangeRequestOpen(false)}
            >
              Hủy
            </Button>
            <Button
              onClick={submitChangeRequest}
              loading={changeRequestLoading}
              disabled={
                !changeForm.milestoneId || !changeForm.changeSummary.trim()
              }
            >
              Gửi yêu cầu
            </Button>
          </>
        }
      >
        <div className="grid gap-5">
          <>
            <Notice tone="warning" title="Chỉ các mốc chưa bắt đầu">
              Các cột mốc đã hoàn thành, đang thực hiện hoặc đã giải ngân tiền ký quỹ
              không thể được thay đổi.
            </Notice>
            <Field label="Chọn mốc cần thay đổi">
              <select
                className="h-12 w-full rounded-2xl border border-slate-300 bg-white px-3 font-semibold text-ink"
                value={changeForm.milestoneId}
                onChange={(event) => {
                  const item = contractMilestoneViews.find(
                    (milestone) =>
                      milestone.contractMilestoneId ===
                      Number(event.target.value),
                  );
                  setChangeForm((value) => ({
                    ...value,
                    milestoneId: event.target.value,
                    milestoneName: item?.milestoneName || "",
                    milestoneDescription: item?.description || "",
                    milestoneDuration: String(item?.duration || ""),
                    milestoneBudget: String(item?.finalBudget || ""),
                  }));
                }}
              >
                <option value="">-- Chọn mốc sắp tới --</option>
                {contractMilestoneViews
                  .filter(
                    (milestone) =>
                      !["COMPLETED", "IN_PROGRESS", "APPROVED"].includes(
                        milestone.status.toUpperCase(),
                      ) && !milestone.escrowReleasedAt,
                  )
                  .sort((a, b) => a.orderIndex - b.orderIndex)
                  .map((milestone) => (
                    <option
                      key={milestone.contractMilestoneId}
                      value={milestone.contractMilestoneId}
                    >
                      Mốc {milestone.orderIndex}: {milestone.milestoneName}
                    </option>
                  ))}
              </select>
            </Field>
            {changeForm.milestoneId && (
              <div className="grid gap-4 rounded-2xl border border-brand-100 bg-brand-50/30 p-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-extrabold text-ink">
                    Thông tin hiện tại của mốc
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        Ngân sách hiện tại
                      </p>
                      <p className="mt-1 font-extrabold text-ink">
                        {formatCurrency(
                          selectedChangeMilestone?.finalBudget || 0,
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        Thời lượng hiện tại
                      </p>
                      <p className="mt-1 font-extrabold text-ink">
                        {selectedChangeMilestone?.duration || 0}{" "}
                        {selectedChangeMilestone?.durationUnit === "WEEK"
                          ? "tuần"
                          : selectedChangeMilestone?.durationUnit || ""}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      Tiêu chí nghiệm thu hiện tại
                    </p>
                    {selectedChangeCriteria.length ? (
                      <ul className="mt-2 space-y-1 text-sm font-medium text-slate-700">
                        {selectedChangeCriteria.map((criterion, index) => (
                          <li
                            key={`${criterion}-${index}`}
                            className="flex gap-2"
                          >
                            <span className="text-brand-600">•</span>
                            <span>{criterion}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-sm font-medium text-slate-500">
                        Chưa có tiêu chí được khai báo.
                      </p>
                    )}
                  </div>
                </div>
                <div className="border-t border-brand-100 pt-4">
                  <p className="mb-3 text-sm font-extrabold text-brand-700">
                    Thông tin bạn đề xuất thay đổi
                  </p>
                  <Field label="Mô tả / sản phẩm bàn giao mới">
                    <Textarea
                      value={
                        changeForm.milestoneDescription ||
                        selectedChangeMilestone?.description ||
                        ""
                      }
                      onChange={(event) =>
                        setChangeForm((value) => ({
                          ...value,
                          milestoneDescription: event.target.value,
                        }))
                      }
                    />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Ngân sách mốc mới (VND)">
                      <Input
                        type="number"
                        value={
                          changeForm.milestoneBudget ||
                          String(selectedChangeMilestone?.finalBudget || "")
                        }
                        onChange={(event) =>
                          setChangeForm((value) => ({
                            ...value,
                            milestoneBudget: event.target.value,
                          }))
                        }
                      />
                    </Field>
                    <Field label="Thời lượng mới (tuần)">
                      <Input
                        type="number"
                        value={
                          changeForm.milestoneDuration ||
                          String(selectedChangeMilestone?.duration || "")
                        }
                        onChange={(event) =>
                          setChangeForm((value) => ({
                            ...value,
                            milestoneDuration: event.target.value,
                          }))
                        }
                      />
                    </Field>
                  </div>
                </div>
              </div>
            )}
          </>
          <Field label="Tóm tắt lý do thay đổi">
            <Textarea
              value={changeForm.changeSummary}
              onChange={(event) =>
                setChangeForm((value) => ({
                  ...value,
                  changeSummary: event.target.value,
                }))
              }
              placeholder="Giải thích lý do và kết quả mong muốn để bên còn lại dễ đánh giá..."
            />
          </Field>
        </div>
      </Modal>

      <Modal
        open={Boolean(viewingChangeRequest)}
        onClose={() => setViewingChangeRequest(null)}
        title={
          viewingChangeRequest
            ? changeRequestHeading(viewingChangeRequest)
            : "Chi tiết yêu cầu thay đổi"
        }
        description="Nội dung đề xuất và phản hồi của đối tác (nếu có)."
        size="xl"
        footer={
          <>
            {canReviewChangeRequest(viewingChangeRequest) && (
              <>
                <Button
                  onClick={() =>
                    viewingChangeRequest &&
                    void acceptChangeRequest(viewingChangeRequest)
                  }
                >
                  Chấp nhận
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    if (!viewingChangeRequest) return;
                    setChangeRequestReviewError("");
                    setChangeRequestReviewNote("");
                    setRejectingChangeRequest(viewingChangeRequest);
                    setViewingChangeRequest(null);
                  }}
                >
                  Từ chối
                </Button>
              </>
            )}
            <Button
              variant="secondary"
              onClick={() => setViewingChangeRequest(null)}
            >
              Đóng
            </Button>
          </>
        }
      >
        {viewingChangeRequest && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-end gap-3">
              <StatusBadge status={viewingChangeRequest.status} />
            </div>
            <Field label="Bạn muốn thay đổi gì?">
              <Input
                disabled
                value={
                  viewingChangeRequest.changeType === "MILESTONE"
                    ? "Một mốc sắp tới chưa bắt đầu"
                    : "Thông tin hợp đồng"
                }
              />
            </Field>
            {viewingChangeRequest.changeType === "MILESTONE" ? (
              <>
                <Field label="Mốc cần thay đổi">
                  <Input
                    disabled
                    value={
                      viewingCurrentMilestone
                        ? `Mốc ${viewingCurrentMilestone.orderIndex}: ${viewingCurrentMilestone.milestoneName}`
                        : viewingProposedMilestone?.milestoneName ||
                          "Mốc đã chọn"
                    }
                  />
                </Field>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-extrabold text-ink">
                    Thông tin hiện tại của mốc
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <p className="text-sm text-slate-700">
                      Ngân sách hiện tại:{" "}
                      <strong>
                        {formatCurrency(
                          viewingCurrentMilestone?.finalBudget || 0,
                        )}
                      </strong>
                    </p>
                    <p className="text-sm text-slate-700">
                      Thời lượng hiện tại:{" "}
                      <strong>
                        {viewingCurrentMilestone?.duration || 0} tuần
                      </strong>
                    </p>
                  </div>
                  <p className="mt-3 text-sm text-slate-700">
                    Mô tả / sản phẩm bàn giao hiện tại
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
                    {viewingCurrentMilestone?.description || "Chưa có mô tả."}
                  </p>
                </div>
                <div className="rounded-2xl border border-brand-100 bg-brand-50/30 p-4">
                  <p className="mb-3 font-extrabold text-brand-700">
                    Thông tin mới được đề xuất
                  </p>
                  <Field label="Mô tả / sản phẩm bàn giao mới">
                    <Textarea
                      disabled
                      value={
                        viewingProposedMilestone?.description ||
                        viewingCurrentMilestone?.description ||
                        ""
                      }
                    />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Ngân sách mốc mới (VND)">
                      <Input
                        disabled
                        value={
                          viewingProposedMilestone?.finalBudget
                            ? formatCurrency(
                                viewingProposedMilestone.finalBudget,
                              )
                            : "Không thay đổi"
                        }
                      />
                    </Field>
                    <Field label="Thời lượng mới">
                      <Input
                        disabled
                        value={
                          viewingProposedMilestone?.duration
                            ? `${viewingProposedMilestone.duration} tuần`
                            : "Không thay đổi"
                        }
                      />
                    </Field>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-extrabold text-ink">
                    Thông tin hiện tại của hợp đồng
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <p className="text-sm text-slate-700">
                      Ngân sách hiện tại:{" "}
                      <strong>{formatCurrency(originalContractBudget)}</strong>
                    </p>
                    <p className="text-sm text-slate-700">
                      Thời lượng hiện tại:{" "}
                      <strong>
                        {formatTimelineWeeks(originalTimelineDays)}
                      </strong>
                    </p>
                  </div>
                  <p className="mt-3 text-sm text-slate-700">
                    Phạm vi hiện tại
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
                    {contract?.contractScope || "Chưa có thông tin phạm vi."}
                  </p>
                </div>
                <div className="rounded-2xl border border-brand-100 bg-brand-50/30 p-4">
                  <p className="mb-3 font-extrabold text-brand-700">
                    Thông tin mới được đề xuất
                  </p>
                  <Field label="Phạm vi mới">
                    <Textarea
                      disabled
                      value={
                        viewingChangeRequest.proposedScope || "Không thay đổi"
                      }
                    />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Tổng ngân sách mới (VND)">
                      <Input
                        disabled
                        value={
                          viewingChangeRequest.proposedBudget
                            ? formatCurrency(
                                viewingChangeRequest.proposedBudget,
                              )
                            : "Không thay đổi"
                        }
                      />
                    </Field>
                    <Field label="Thời lượng mới">
                      <Input
                        disabled
                        value={
                          viewingChangeRequest.proposedTimelineDays
                            ? formatTimelineWeeks(
                                viewingChangeRequest.proposedTimelineDays,
                              )
                            : "Không thay đổi"
                        }
                      />
                    </Field>
                  </div>
                </div>
              </>
            )}
            <Field label="Tóm tắt lý do thay đổi">
              <Textarea disabled value={viewingChangeRequest.changeSummary} />
            </Field>
            {viewingChangeRequest.reviewNote && (
              <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-slate-700">
                <p className="font-extrabold text-rose-700">
                  Phản hồi của đối tác
                </p>
                <p className="mt-1 whitespace-pre-wrap">
                  {viewingChangeRequest.reviewNote}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(rejectingChangeRequest)}
        onClose={() => {
          if (changeRequestReviewLoading) return;
          setRejectingChangeRequest(null);
          setChangeRequestReviewNote("");
          setChangeRequestReviewError("");
        }}
        title="Từ chối yêu cầu thay đổi"
        description="Lý do từ chối sẽ được gửi cho đối tác tạo yêu cầu."
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setRejectingChangeRequest(null)}
              disabled={changeRequestReviewLoading}
            >
              Hủy
            </Button>
            <Button
              variant="danger"
              onClick={rejectChangeRequest}
              loading={changeRequestReviewLoading}
            >
              Xác nhận từ chối
            </Button>
          </>
        }
      >
        <Field label="Lý do từ chối">
          <Textarea
            value={changeRequestReviewNote}
            onChange={(event) => {
              setChangeRequestReviewNote(event.target.value);
              setChangeRequestReviewError("");
            }}
            placeholder="Nêu rõ lý do không thể chấp nhận yêu cầu thay đổi này..."
            className="min-h-28"
          />
          {changeRequestReviewError && (
            <p className="mt-2 text-sm font-bold text-rose-600">
              {changeRequestReviewError}
            </p>
          )}
        </Field>
      </Modal>

      <Modal
        open={depositConfirmOpen}
        onClose={() => !depositLoading && setDepositConfirmOpen(false)}
        title="Xác nhận ký quỹ hợp đồng"
        description={`Số tiền ký quỹ ${currentDepositRoleLabel} bằng ${currentDepositPercentage}% tổng ngân sách hợp đồng và sẽ được giữ trong quỹ bảo chứng.`}
        size="lg"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setDepositConfirmOpen(false)}
              disabled={depositLoading}
            >
              Hủy
            </Button>
            {!hasEnoughDepositBalance && (
              <Button
                variant="secondary"
                onClick={() =>
                  window.dispatchEvent(
                    new CustomEvent("aitasker:open-wallet-topup", {
                      detail: {
                        amount: depositMissingAmount,
                        description: `Nạp ví để ký quỹ hợp đồng "${contractTitle}"`,
                      },
                    }),
                  )
                }
              >
                Nạp ví
              </Button>
            )}
            <Button
              onClick={payDeposit}
              loading={depositLoading}
              disabled={!hasEnoughDepositBalance || depositLoading}
            >
              Xác nhận ký quỹ
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-3">
            <ContractMetric
              label="Tổng ngân sách đề xuất"
              value={formatCurrency(proposedContractBudget)}
            />
            <ContractMetric
              label={`Ký quỹ ${currentDepositPercentage}%`}
              value={formatCurrency(currentDepositAmount)}
            />
            <ContractMetric
              label="Số dư khả dụng"
              value={formatCurrency(availableBalance)}
            />
          </div>
          {!hasEnoughDepositBalance ? (
            <Notice
              tone="danger"
              title={`Vì còn thiếu ${formatCurrency(depositMissingAmount)} để ký quỹ.`}
            >
              Hãy nạp thêm vào ví trước, sau khi PayOS xác nhận số dư thì quay
              lại bấm xác nhận ký quỹ.
            </Notice>
          ) : (
            <Notice
              tone="warning"
              title="Bạn có chắc chắn muốn ký quỹ hợp đồng này?"
            >
              Sau khi xác nhận, hệ thống sẽ giữ {currentDepositPercentage}% giá
              trị hợp đồng trong quỹ bảo chứng, sau đó kích hoạt hợp đồng khi cả
              Doanh nghiệp và Chuyên gia đều đã ký quỹ.
            </Notice>
          )}
          <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
            <SectionHeading
              title="Điều kiện trước khi ký quỹ"
              description="Hợp đồng phải ở trạng thái chờ ký quỹ và đã đủ chữ ký, xác thực của hai bên."
            />
            <div className="mt-4 grid gap-2 text-sm font-semibold text-slate-600">
              <span>Hợp đồng: {contractTitle}</span>
              <span>Trạng thái: {contract.status}</span>
              <span>
                Chữ ký/xác thực:{" "}
                {readyToActivate
                  ? "Đã đủ hai bên"
                  : signatureProgress.length > 0
                    ? signatureProgress
                        .map((item) =>
                          item.completed
                            ? `${item.label} đã hoàn tất`
                            : `${item.label} đã ký hợp đồng`,
                        )
                        .join(", ")
                    : "Chưa có bên nào hoàn tất"}
              </span>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

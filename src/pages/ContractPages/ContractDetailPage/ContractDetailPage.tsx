import {
  CheckCircle2,
  Clock3,
  FileText,
  LockKeyhole,
  ShieldCheck,
  WalletCards,
  XCircle,
} from "lucide-react";
import { useEffect, useState, ReactNode } from "react";
import { useParams } from "react-router-dom";
import {
  contractApi,
  disputeApi,
  profileApi,
  walletApi,
} from "../../../lib/api";
import { useSession } from "../../../lib/session";
import { formatCurrency, formatDate, formatDateTime } from "../../../lib/utils";
import type {
  BusinessProfile,
  Contract,
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
  Field,
  LinkButton,
  Modal,
  Notice,
  PageHeader,
  SectionHeading,
  StatusBadge,
  Textarea,
} from "../../../components/ui";
import {
  calculateSecurityDeposit,
  ContractLifecycle,
  ContractMetric,
  formatTimelineWeeks,
  formatTotalMilestoneDuration,
  getContractNextAction,
  getMilestoneBudget,
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

function displayTerminateReason(value: string) {
  if (value === "CLIENT_STOP_PROJECT") {
    return "Doanh nghiệp dừng dự án";
  }

  return value;
}

export function ContractDetailPage() {
  const { contractId } = useParams();
  const session = useSession();
  const [contract, setContract] = useState<Contract | null>(null);
  const [jobMilestones, setJobMilestones] = useState<Milestone[]>([]);
  const [contractMilestones, setContractMilestones] = useState<Milestone[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [participants, setParticipants] = useState<{
    business: BusinessProfile | null;
    expert: ExpertProfile | null;
  }>({
    business: null,
    expert: null,
  });
  const [contractNotice, setContractNotice] = useState<{
    tone: "success" | "danger" | "info" | "warning";
    title: string;
    message?: ReactNode;
  } | null>(null);
  const [actionNotice, setActionNotice] = useState<{
    tone: "success" | "danger" | "info" | "warning";
    title: string;
    message?: ReactNode;
  } | null>(null);
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositConfirmOpen, setDepositConfirmOpen] = useState(false);
  const [paymentWallet, setPaymentWallet] = useState<SystemWallet | null>(null);
  const [terminateOpen, setTerminateOpen] = useState(false);
  const [ndaModalMode, setNdaModalMode] = useState<"view" | "sign" | null>(
    null,
  );
  const [ndaSubmitting, setNdaSubmitting] = useState(false);
  const [reason, setReason] = useState("CLIENT_STOP_PROJECT");

  useEffect(() => {
    contractApi
      .getContract(Number(contractId))
      .then(setContract)
      .catch(() => setContract(null));
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
        setDisputes(disputeItems);
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
    if (!contract || session?.role !== "BUSINESS") return;
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

  if (!contract) {
    return (
      <EmptyState
        title="Không tìm thấy hợp đồng"
        description="Dữ liệu hợp đồng được lấy trực tiếp từ hệ thống."
      />
    );
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

  const rejectContract = async () =>
    setContract(await contractApi.reject(contract.contractId));

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
    setActionNotice(null);
    try {
      const result = await contractApi.payDeposit(contract.contractId);
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
      const depositAmount = result.data?.depositAmount ?? securityDepositAmount;
      const [, updatedWallet] = await Promise.all([
        refreshContract(),
        walletApi.current().catch(() => null),
      ]);
      setPaymentWallet(updatedWallet);
      setDepositConfirmOpen(false);
      window.dispatchEvent(new Event("aitasker:reload-wallet"));
      sessionStorage.setItem("justActivatedContract", "true");
      setContractNotice({
        tone: "success",
        title: "Đã ký quỹ và kích hoạt hợp đồng.",
        message: updatedWallet ? (
          <div className="flex flex-col gap-1 mt-1">
            <span>
              Hệ thống đã giữ {formatCurrency(depositAmount)} trong quỹ bảo
              chứng.
            </span>
            <span>
              Số dư khả dụng còn{" "}
              {formatCurrency(updatedWallet.availableBalance)}.
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-1 mt-1">
            <span>
              Hệ thống đã giữ {formatCurrency(depositAmount)} trong quỹ bảo
              chứng và cập nhật hợp đồng/mốc công việc.
            </span>
          </div>
        ),
      });
      setActionNotice({
        tone: "warning",
        title: "Việc tiếp theo",
        message: "Vui lòng truy cập Không gian làm việc để triển khai dự án.",
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
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
  const terminate = async () => {
    setContract(await contractApi.terminate(contract.contractId, reason));
    setTerminateOpen(false);
  };
  const contractTitle = contract.contractTitle || contract.title || "Hợp đồng";
  const contractStatus = normalizeContractStatus(contract.status);
  const contractInProgress = ["ACTIVE", "IN_PROGRESS"].includes(contractStatus);
  const securityDepositAmount = calculateSecurityDeposit(contract.totalBudget);
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
    (item) => !["Resolved", "Closed"].includes(item.status),
  );
  const underReviewCount = jobMilestones.filter(
    (item) => normalizeContractStatus(item.status) === "UNDER_REVIEW",
  ).length;
  const renderedMilestones =
    contract.contractMilestones && contract.contractMilestones.length > 0
      ? contract.contractMilestones
      : contractMilestones;
  const totalMilestoneDurationLabel =
    formatTotalMilestoneDuration(renderedMilestones);
  const businessDisplayName =
    contract.businessName ||
    participants.business?.companyName ||
    `Doanh nghiệp #${contract.businessId}`;
  const expertDisplayName =
    contract.expertName ||
    participants.expert?.fullName ||
    `Chuyên gia #${contract.expertId}`;
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
          Number(contract.timelineDays || 0) * 24 * 60 * 60 * 1000,
      ).toISOString()
    : undefined;
  const contractTimelineLabel =
    contractStartDate && contractEndDate
      ? `${formatDate(contractStartDate)} - ${formatDate(contractEndDate)}`
      : "Chưa có thời gian dự kiến";
  const nextAction = getContractNextAction({
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
    session?.role === "BUSINESS" && contractStatus === "PENDING";
  const canTerminate =
    (session?.role === "BUSINESS" || session?.role === "ADMIN") &&
    !contractInProgress &&
    !["COMPLETED", "CANCELLED"].includes(contractStatus);
  const canRejectContract =
    session?.role === "EXPERT" && ["DRAFT", "PENDING"].includes(contractStatus);
  const availableBalance = paymentWallet?.availableBalance ?? 0;
  const depositMissingAmount = Math.max(
    0,
    securityDepositAmount - availableBalance,
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

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          eyebrow="CHI TIẾT HỢP ĐỒNG"
          title={contractTitle}
          description="Thông tin chi tiết của hợp đồng, bao gồm các bên tham gia, trạng thái ký hợp đồng và NDA, mốc công việc, ngân sách và thời gian thực hiện."
          actions={
            <>
              <Button variant="secondary" onClick={openNdaPreview}>
                <FileText className="h-4 w-4" />
                Xem NDA
              </Button>
              <LinkButton
                to={`/app/contracts/${contract.contractId}/workspace`}
                variant="secondary"
              >
                Không gian làm việc
              </LinkButton>
              <LinkButton to="/app/finance" variant="secondary">
                Ký quỹ
              </LinkButton>
            </>
          }
        />
      </div>
      {contractNotice && (
        <Notice tone={contractNotice.tone as any} title={contractNotice.title}>
          {contractNotice.message}
        </Notice>
      )}
      {actionNotice && (
        <Notice
          tone={actionNotice.tone as any}
          title={actionNotice.title}
          className="mt-4"
        >
          {actionNotice.message}
        </Notice>
      )}
      <Card className="p-4">
        <SectionHeading title="Vòng đời hợp đồng" />
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
              title="Hợp đồng đang ở trạng thái đang thực hiện/đang hoạt động, các thao tác đổi trạng thái đã bị khóa."
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
              label="Tổng ngân sách"
              value={formatCurrency(contract.totalBudget)}
            />
            <ContractMetric
              label="Ký quỹ 20%"
              value={formatCurrency(securityDepositAmount)}
            />
            <ContractMetric
              label="Thời gian"
              value={formatTimelineWeeks(contract.timelineDays)}
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
              description="Hiển thị thông tin chi tiết của hợp đồng, chữ ký/xác thực của hai bên và các mốc công việc."
            />
            <div className="mt-4 border-b border-slate-100 pb-4 text-center">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                Hợp đồng dịch vụ AI Tasker
              </p>
              <h3 className="mt-2 font-display text-2xl font-black text-ink">
                {contractTitle}
              </h3>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-4">
              <ContractMetric
                label="Giá trị hợp đồng"
                value={formatCurrency(contract.totalBudget)}
              />
              <ContractMetric
                label="Ký quỹ 20%"
                value={formatCurrency(securityDepositAmount)}
              />
              <ContractMetric
                label="Thời hạn"
                value={formatTimelineWeeks(contract.timelineDays)}
              />
              <ContractMetric label="Thời gian" value={contractTimelineLabel} />
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
                ? "Hợp đồng đã được kích hoạt, ngân sách mốc công việc và trạng thái công việc đã được hệ thống cập nhật."
                : readyToActivate
                  ? "Doanh nghiệp và chuyên gia đã hoàn tất hợp đồng cùng NDA. Doanh nghiệp có thể tiếp tục ký quỹ để kích hoạt luồng làm việc."
                  : "Bên đã ký sẽ được ghi nhận ngay khi hệ thống trả thời điểm ký/xác thực."}
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
              title="Mốc công việc"
              description="Danh sách các mốc công việc được hệ thống lưu cho hợp đồng này, bao gồm thời gian dự kiến và ngân sách gốc/đã chốt."
              action={
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-right">
                  <p className="text-xs font-bold text-slate-400">
                    Tổng thời gian milestone
                  </p>
                  <p className="mt-1 font-display text-lg font-black text-ink">
                    {totalMilestoneDurationLabel}
                  </p>
                </div>
              }
            />
            <div className="mt-4 grid gap-3">
              {renderedMilestones.map((milestone) => {
                const criteriaList = (() => {
                  if (
                    (milestone as any).criteria &&
                    Array.isArray((milestone as any).criteria)
                  ) {
                    return (milestone as any).criteria;
                  }
                  if ((milestone as any).criteriaSnapshot) {
                    try {
                      const snapshot = (milestone as any).criteriaSnapshot;
                      if (typeof snapshot === "string") {
                        return snapshot
                          .split(/\r?\n/)
                          .map((item) => item.trim())
                          .filter(Boolean)
                          .map((desc, i) => ({
                            criteriaId: `snap-${i}`,
                            description: desc,
                          }));
                      }
                    } catch {
                      return [];
                    }
                  }
                  return [];
                })();

                return (
                  <div
                    key={
                      "contractMilestoneId" in milestone
                        ? milestone.contractMilestoneId
                        : milestone.milestoneId
                    }
                    className="grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-[minmax(0,1fr)_160px_160px]"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold uppercase tracking-wide text-brand-600">
                        Mốc {milestone.orderIndex}
                      </p>
                      <p className="break-words text-sm font-extrabold text-ink">
                        {milestone.milestoneName}
                      </p>
                      {milestone.description && (
                        <p className="mt-1 text-sm leading-6 text-slate-500">
                          {milestone.description}
                        </p>
                      )}
                      <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-slate-400">
                        <Clock3 className="h-3.5 w-3.5" />
                        {(() => {
                          const dVal =
                            (milestone as any).durationValue ??
                            (milestone as any).duration;
                          const unit =
                            (milestone as any).durationUnit === "WEEK"
                              ? "TUẦN"
                              : (milestone as any).durationUnit || "TUẦN";
                          return dVal && dVal > 0
                            ? `${dVal} ${unit}`
                            : "Chưa xác định";
                        })()}
                      </p>

                      {criteriaList && criteriaList.length > 0 && (
                        <div className="mt-3 space-y-1.5 border-t border-slate-200/60 pt-3">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            Tiêu chí nghiệm thu
                          </p>
                          <ul className="grid gap-1.5">
                            {criteriaList.map((c: any, i: number) => (
                              <li
                                key={c.criteriaId || i}
                                className="flex items-start gap-2 text-sm text-slate-600"
                              >
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                                <span>{c.description}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
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
                      label="Ngân sách đã chốt"
                      value={formatCurrency(getMilestoneBudget(milestone))}
                    />
                  </div>
                );
              })}
              {renderedMilestones.length === 0 && (
                <EmptyState
                  title="Chưa có bản nháp mốc công việc"
                  description="Hệ thống chưa trả dữ liệu mốc công việc cho hợp đồng này."
                />
              )}
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
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
                Thanh toán ký quỹ
              </Button>
            )}
            {canRejectContract && (
              <Button variant="danger" onClick={rejectContract}>
                <XCircle className="h-4 w-4" />
                Từ chối hợp đồng
              </Button>
            )}
            {canTerminate && (
              <Button variant="danger" onClick={() => setTerminateOpen(true)}>
                <XCircle className="h-4 w-4" />
                Chấm dứt
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
        open={depositConfirmOpen}
        onClose={() => !depositLoading && setDepositConfirmOpen(false)}
        title="Xác nhận ký quỹ hợp đồng"
        description="Số tiền ký quỹ bằng 20% tổng ngân sách hợp đồng và sẽ được giữ trong quỹ bảo chứng."
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
                        description: `Nạp ví để ký quỹ hợp đồng #${contract.contractId}`,
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
              label="Tổng giá trị hợp đồng"
              value={formatCurrency(contract.totalBudget)}
            />
            <ContractMetric
              label="Ký quỹ 20%"
              value={formatCurrency(securityDepositAmount)}
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
              Sau khi xác nhận, hệ thống sẽ giữ 20% giá trị hợp đồng trong quỹ
              bảo chứng, chuyển hợp đồng sang trạng thái hoạt động và cập nhật
              ngân sách mốc công việc theo đề xuất đã được chấp nhận.
            </Notice>
          )}
          <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
            <SectionHeading
              title="Điều kiện trước khi ký quỹ"
              description="Hợp đồng phải ở trạng thái chờ xử lý và đã đủ chữ ký/xác thực của hai bên."
            />
            <div className="mt-4 grid gap-2 text-sm font-semibold text-slate-600">
              <span>Hợp đồng: {contract.contractTitle}</span>
              <span>
                Trạng thái: {translateContractStatus(contract.status)}
              </span>
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

      <Modal
        open={terminateOpen}
        onClose={() => setTerminateOpen(false)}
        title="Chấm dứt hợp đồng"
        description="Giao diện hiển thị tổng quan chấm dứt dù hệ thống hiện mới đổi trạng thái hợp đồng."
        footer={
          <>
            <Button variant="secondary" onClick={() => setTerminateOpen(false)}>
              Hủy
            </Button>
            <Button variant="danger" onClick={terminate}>
              Xác nhận chấm dứt
            </Button>
          </>
        }
      >
        <Notice tone="warning" title="Tổng quan tiến độ">
          Mốc đã giải ngân sẽ thuộc về chuyên gia; mốc chưa hoàn thành sẽ hoàn
          tiền cho doanh nghiệp. Logic chi tiết đang chờ hệ thống xử lý.
        </Notice>
        <Field label="Lý do" className="mt-4">
          <Textarea
            value={displayTerminateReason(reason)}
            onChange={(event) => setReason(event.target.value)}
          />
        </Field>
      </Modal>
    </div>
  );
}

import {
  CheckCircle2,
  FileText,
  LockKeyhole,
  ShieldCheck,
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
  getMilestoneDurationLabel,
  NDA_TERMS,
  normalizeContractStatus,
  OperationStat,
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
  return values.find((value) => typeof value === "string" && value.trim())
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
    tone: "success" | "danger" | "info";
    title: string;
    message?: string;
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
        description="Dữ liệu hợp đồng được lấy trực tiếp từ backend."
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
        title: "Ký contract thành công.",
        message:
          "Hệ thống đã ghi nhận xác nhận hợp đồng của bạn. Khi hai bên ký đủ contract và NDA, contract sẽ sẵn sàng cho bước tiếp theo.",
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setContractNotice({
        tone: "danger",
        title:
          error instanceof Error
            ? error.message
            : "Không thể ký contract. Vui lòng thử lại.",
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
        message:
          "Hệ thống đã ghi nhận chữ ký NDA của bạn cho hợp đồng này.",
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
    try {
      const result = await contractApi.payDeposit(contract.contractId);
      if (result.needTopup) {
        setContractNotice({
          tone: "danger",
          title: "Ví chưa đủ để ký quỹ contract.",
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
      setContractNotice({
        tone: "success",
        title: "Đã ký quỹ và kích hoạt contract.",
        message: updatedWallet
          ? `Backend đã hold ${formatCurrency(depositAmount)} vào escrow. Số dư khả dụng còn ${formatCurrency(updatedWallet.availableBalance)}, escrow hiện tại ${formatCurrency(updatedWallet.escrowBalance)}.`
          : `Backend đã hold ${formatCurrency(depositAmount)} vào escrow và cập nhật contract/milestone.`,
      });
    } catch (err) {
      setContractNotice({
        tone: "danger",
        title:
          err instanceof Error ? err.message : "Không thể ký quỹ contract.",
      });
    } finally {
      setDepositLoading(false);
    }
  };
  const terminate = async () => {
    setContract(await contractApi.terminate(contract.contractId, reason));
    setTerminateOpen(false);
  };
  const contractTitle =
    contract.contractTitle ||
    contract.title ||
    `Contract #${contract.contractId}`;
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
  const completedMilestoneCount = jobMilestones.filter((item) =>
    ["COMPLETED", "RELEASED"].includes(normalizeContractStatus(item.status)),
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
    `Business #${contract.businessId}`;
  const expertDisplayName =
    contract.expertName ||
    participants.expert?.fullName ||
    `Expert #${contract.expertId}`;
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
      : "Chưa có timeline";
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
      label: "Business",
      name: businessDisplayName,
      accepted: businessAccepted,
      completed: businessSignatureComplete,
      acceptedAt: contract.businessAcceptedAt,
      completedAt: contract.businessNdaSignedAt,
    },
    {
      label: "Expert",
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
          eyebrow="CONTRACT DETAIL"
          title={contractTitle}
          description="Điểm điều phối cho đàm phán, activate, NDA, termination và các luồng con."
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
                Workspace
              </LinkButton>
              <LinkButton to="/app/finance" variant="secondary">
                Escrow
              </LinkButton>
            </>
          }
        />
      </div>
      {contractNotice && (
        <Notice tone={contractNotice.tone} title={contractNotice.title}>
          {contractNotice.message}
        </Notice>
      )}
      <Card className="p-4">
        <SectionHeading
          title="Vòng đời contract"
          description="Các bước này khớp với status backend đang lưu."
        />
        <ContractLifecycle status={contract.status} />
      </Card>
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
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
              title="Contract đang IN_PROGRESS/ACTIVE, các thao tác đổi trạng thái đã bị khóa."
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
              label="Timeline"
              value={formatTimelineWeeks(contract.timelineDays)}
            />
            <ContractMetric
              label="Ngày tạo hợp đồng"
              value={formatDateTime(contract.createdAt)}
            />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
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
              description="Tên và thông tin liên hệ được lấy từ API profile nếu backend có dữ liệu."
            />
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Participant
                label="Bên A - Doanh nghiệp"
                value={businessDisplayName}
                details={[
                  ["Mã số thuế", participants.business?.taxCode],
                  ["Địa chỉ", participants.business?.address],
                  ["Website", participants.business?.website],
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
                  ["KYC", participants.expert?.kycStatus],
                ]}
              />
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-slate-100 bg-white p-5">
            <SectionHeading
              title="Trang ký hợp đồng"
              description="Bản trình bày một trang để hai bên kiểm tra trước khi ký contract và NDA."
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
              <ContractMetric label="Timeline" value={contractTimelineLabel} />
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
                ? "Contract đã Active, milestone budget và job status đã được backend cập nhật."
                : readyToActivate
                  ? "Business và Expert đã hoàn tất contract cùng NDA. Business có thể tiếp tục ký quỹ để kích hoạt flow làm việc."
                  : "Bên đã ký sẽ được ghi nhận ngay khi backend trả thời điểm ký/xác thực."}
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
                        ? `Đã ký đủ contract và NDA: ${formatDateTime(item.completedAt)}`
                        : `Đã ký contract: ${formatDateTime(item.acceptedAt)}, chờ ký NDA`}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 rounded-3xl border border-slate-100 p-5">
            <SectionHeading
              title="Milestone trong draft"
              description="Các ngân sách chốt được backend tạo từ job và proposal đã accepted."
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
                  title="Chưa có milestone draft"
                  description="Backend chưa trả contractMilestones cho contract này."
                />
              )}
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {canCurrentPartyAct && contractStatus === "DRAFT" && (
              <Button onClick={signContract} disabled={currentPartyAccepted}>
                <CheckCircle2 className="h-4 w-4" />
                Chấp nhận contract
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
                Terminate
              </Button>
            )}
          </div>
        </Card>
        <Card className="p-6">
          <SectionHeading
            title="Vận hành thực tế"
            description="Dữ liệu lấy từ milestone, deliverable, transaction và dispute endpoints hiện có."
          />
          <div className="mt-5 grid gap-3">
            <OperationStat
              label="Milestone completed/released"
              value={`${completedMilestoneCount}/${jobMilestones.length}`}
            />
            <OperationStat
              label="Milestone chờ business nghiệm thu"
              value={`${underReviewCount}`}
            />
            <OperationStat
              label="Dispute chưa xử lý xong"
              value={`${activeDisputes.length}`}
            />
            {jobMilestones.slice(0, 4).map((milestone) => (
              <div
                key={milestone.milestoneId}
                className="rounded-2xl border border-slate-100 p-3.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="min-w-0 truncate font-extrabold text-ink">
                    {milestone.orderIndex}. {milestone.milestoneName}
                  </p>
                  <StatusBadge
                    status={translateContractStatus(milestone.status)}
                  />
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-500">
                  {formatCurrency(milestone.fundsAllocated)}
                </p>
              </div>
            ))}
            {jobMilestones.length > 4 && (
              <LinkButton
                to={`/app/contracts/${contract.contractId}/workspace`}
                variant="secondary"
              >
                Xem tất cả milestone trong workspace
              </LinkButton>
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
        title="Xác nhận ký quỹ contract"
        description="Số tiền ký quỹ bằng 20% tổng ngân sách contract và sẽ được giữ trong escrow."
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
                        description: `Nạp ví để ký quỹ contract #${contract.contractId}`,
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
              label="Tổng contract"
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
              title="Bạn có chắc chắn muốn ký quỹ contract này?"
            >
              Sau khi xác nhận, BE sẽ hold 20% giá trị contract vào escrow,
              chuyển contract sang ACTIVE và cập nhật ngân sách milestone theo
              proposal đã accept.
            </Notice>
          )}
          <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
            <SectionHeading
              title="Điều kiện trước khi ký quỹ"
              description="Contract phải ở trạng thái PENDING và đã đủ chữ ký/xác thực của hai bên."
            />
            <div className="mt-4 grid gap-2 text-sm font-semibold text-slate-600">
              <span>Contract: #{contract.contractId}</span>
              <span>Status: {contract.status}</span>
              <span>
                Chữ ký/xác thực:{" "}
                {readyToActivate
                  ? "Đã đủ hai bên"
                  : signatureProgress.length > 0
                    ? signatureProgress
                        .map((item) =>
                          item.completed
                            ? `${item.label} đã hoàn tất`
                            : `${item.label} đã ký contract`,
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
        description="UI thể hiện snapshot termination dù back-end hiện mới đổi trạng thái contract."
        footer={
          <>
            <Button variant="secondary" onClick={() => setTerminateOpen(false)}>
              Hủy
            </Button>
            <Button variant="danger" onClick={terminate}>
              Xác nhận terminate
            </Button>
          </>
        }
      >
        <Notice tone="warning" title="Snapshot tiến độ">
          Mốc đã Released sẽ thuộc chuyên gia; mốc chưa hoàn thành sẽ hoàn tiền
          doanh nghiệp. Logic chi tiết đang chờ back-end.
        </Notice>
        <Field label="Lý do" className="mt-4">
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </Field>
      </Modal>
    </div>
  );
}

import {
  CheckCircle2,
  Download,
  FileCheck2,
  FileText,
  Gavel,
  LockKeyhole,
  MessageSquareText,
  Plus,
  ReceiptText,
  ShieldCheck,
  Star,
  UploadCloud,
  WalletCards,
  XCircle,
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  adminApi,
  contractApi,
  disputeApi,
  financeApi,
  getApiErrorMessage,
  profileApi,
  walletApi,
} from "../../lib/api";
import { useSession } from "../../lib/session";
import {
  formatCompactCurrency,
  formatCurrency,
  formatDateTime,
} from "../../lib/utils";
import type {
  AcceptanceCriteria,
  Contract,
  Dispute,
  Deliverable,
  Milestone,
  Review,
  SystemWallet,
  Transaction,
} from "../../types";
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
  Progress,
  SectionHeading,
  StatusBadge,
  Textarea,
} from "../../components/ui";

export function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [activeStatus, setActiveStatus] = useState<
    "ALL" | "DRAFT" | "PENDING" | "ACTIVE" | "COMPLETED"
  >("ALL");

  useEffect(() => {
    contractApi
      .listContracts()
      .then(setContracts)
      .catch(() => setContracts([]));
  }, []);

  const filteredContracts =
    activeStatus === "ALL"
      ? contracts
      : contracts.filter(
          (contract) =>
            normalizeContractStatus(contract.status) ===
            normalizeContractStatus(activeStatus),
        );
  const draftCount = contracts.filter(
    (contract) => normalizeContractStatus(contract.status) === "DRAFT",
  ).length;
  const pendingCount = contracts.filter(
    (contract) => normalizeContractStatus(contract.status) === "PENDING",
  ).length;
  const negotiatingCount = pendingCount;
  const activeCount = contracts.filter(
    (contract) => normalizeContractStatus(contract.status) === "ACTIVE",
  ).length;
  const completedCount = contracts.filter(
    (contract) => normalizeContractStatus(contract.status) === "COMPLETED",
  ).length;

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
        eyebrow="CON-01 / CON-02"
        title="Hợp đồng"
        description="Danh sách contract để đi vào đàm phán, NDA, workspace milestone, escrow và review."
      />
      </div>
      <Card className="p-4">
        <div className="flex flex-wrap gap-2">
          {[
            { id: "ALL", label: "Tất cả", count: contracts.length },
            { id: "Draft", label: "Nháp", count: draftCount },
            { id: "Negotiating", label: "Đàm phán", count: negotiatingCount },
            { id: "Active", label: "Đang chạy", count: activeCount },
          ].map((item) => (
            <Button
              key={item.id}
              type="button"
              variant={activeStatus === item.id ? "primary" : "secondary"}
              size="sm"
              onClick={() => setActiveStatus(item.id as typeof activeStatus)}
            >
              {item.label}
              <Badge tone={activeStatus === item.id ? "mint" : "slate"}>
                {item.count}
              </Badge>
            </Button>
          ))}
        </div>
      </Card>
      <div className="grid gap-4 xl:grid-cols-3">
        {filteredContracts.map((contract) => (
          <Card key={contract.contractId} hover className="p-5">
            <div className="flex items-start justify-between gap-3">
              <Badge tone="brand">#{contract.contractId}</Badge>
              <StatusBadge status={contract.status} />
            </div>
            <h3 className="mt-4 font-display text-lg font-extrabold leading-7 text-ink">
              {contract.contractTitle ||
                contract.title ||
                `Hợp đồng nháp #${contract.contractId}`}
            </h3>
            <p className="mt-2 text-xs font-bold text-slate-400">
              Ngày tạo: {formatDateTime(contract.createdAt)}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-3">
              <div>
                <p className="text-xs font-bold text-slate-400">Giá trị</p>
                <p className="mt-1 text-sm font-extrabold text-ink">
                  {formatCompactCurrency(contract.totalBudget)}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400">Timeline</p>
                <p className="mt-1 text-sm font-extrabold text-ink">
                  {formatTimelineWeeks(contract.timelineDays)}
                </p>
              </div>
            </div>
            <div className="mt-5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                <span>Tiến độ</span>
                <span>{contract.progress || 0}%</span>
              </div>
              <Progress value={contract.progress || 0} className="mt-2" />
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <LinkButton
                to={`/app/contracts/${contract.contractId}`}
                variant="secondary"
                size="sm"
              >
                Chi tiết
              </LinkButton>
              <LinkButton
                to={`/app/contracts/${contract.contractId}/workspace`}
                size="sm"
              >
                Workspace
              </LinkButton>
            </div>
          </Card>
        ))}
      </div>
      {filteredContracts.length === 0 && (
        <EmptyState
          title={
            normalizeContractStatus(activeStatus) === "DRAFT"
              ? "Chưa có hợp đồng nháp"
              : "Chưa có hợp đồng"
          }
          description="Hợp đồng nháp sẽ xuất hiện sau khi doanh nghiệp accept proposal và bấm tạo contract từ màn hình quản lý job."
        />
      )}
    </div>
  );
}

export function ContractDetailPage() {
  const { contractId } = useParams();
  const session = useSession();
  const [contract, setContract] = useState<Contract | null>(null);
  const [jobMilestones, setJobMilestones] = useState<Milestone[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [participantNames, setParticipantNames] = useState({
    businessName: "",
    expertName: "",
  });
  const [contractNotice, setContractNotice] = useState<{
    tone: "success" | "danger" | "info";
    title: string;
    message?: string;
  } | null>(null);
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositConfirmOpen, setDepositConfirmOpen] = useState(false);
  const [paymentWallet, setPaymentWallet] = useState<SystemWallet | null>(null);
  const [changeOpen, setChangeOpen] = useState(false);
  const [terminateOpen, setTerminateOpen] = useState(false);
  const [changeForm, setChangeForm] = useState({
    changeType: "TIMELINE",
    changeSummary: "",
    proposedBudget: "",
    proposedTimelineDays: "",
  });
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
        const [milestoneItems, disputeItems] = await Promise.all([
          contractApi.listJobMilestones(jobId).catch(() => []),
          disputeApi.listByContract(activeContractId).catch(() => []),
        ]);
        if (ignore) return;
        setJobMilestones(milestoneItems);
        setDisputes(disputeItems);
      } catch {
        if (!ignore) {
          setJobMilestones([]);
          setDisputes([]);
        }
      }
    }

    void loadOperationalData();
    return () => {
      ignore = true;
    };
  }, [contract?.contractId, contract?.jobId]);

  useEffect(() => {
    if (!contract) return;
    let ignore = false;
    const businessId = contract.businessId;
    const expertId = contract.expertId;

    async function loadParticipantNames() {
      try {
        const [businesses, experts] = await Promise.all([
          profileApi.listBusinesses(),
          profileApi.listExperts(),
        ]);
        if (ignore) return;
        setParticipantNames({
          businessName:
            businesses.find((item) => item.businessId === businessId)
              ?.companyName || "",
          expertName:
            experts.find((item) => item.expertId === expertId)
              ?.fullName || "",
        });
      } catch {
        if (!ignore) {
          setParticipantNames({ businessName: "", expertName: "" });
        }
      }
    }

    void loadParticipantNames();
    return () => {
      ignore = true;
    };
  }, [contract?.businessId, contract?.expertId]);

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
  }, [contract?.contractId, session?.role]);

  if (!contract)
    return (
      <EmptyState
        title="Không tìm thấy hợp đồng"
        description="Dữ liệu hợp đồng được lấy trực tiếp từ backend."
      />
    );

  const signContract = async () =>
    setContract(await contractApi.sign(contract.contractId));
  const signNda = async () =>
    setContract(await contractApi.signNda(contract.contractId));
  const rejectContract = async () =>
    setContract(await contractApi.reject(contract.contractId));
  const refreshContract = async () => {
    const updated = await contractApi.getContract(contract.contractId);
    setContract(updated);
    setJobMilestones(await contractApi.listJobMilestones(updated.jobId).catch(() => []));
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
        message: "Backend đã chuyển contract sang Active và gắn budget vào milestone thật.",
      });
      setContractNotice({
        tone: "success",
        title: "Da ky quy va kich hoat contract.",
        message: updatedWallet
          ? `Backend da hold ${formatCurrency(depositAmount)} vao escrow. So du kha dung con ${formatCurrency(updatedWallet.availableBalance)}, escrow hien tai ${formatCurrency(updatedWallet.escrowBalance)}.`
          : `Backend da hold ${formatCurrency(depositAmount)} vao escrow va cap nhat contract/milestone.`,
      });
    } catch (err) {
      setContractNotice({
        tone: "danger",
        title: err instanceof Error ? err.message : "Không thể ký quỹ contract.",
      });
    } finally {
      setDepositLoading(false);
    }
  };
  const terminate = async () => {
    setContract(await contractApi.terminate(contract.contractId, reason));
    setTerminateOpen(false);
  };
  const requestChange = async () => {
    await contractApi.requestChange({
      contractId: contract.contractId,
      changeType: changeForm.changeType,
      changeSummary: changeForm.changeSummary,
      proposedBudget: Number(changeForm.proposedBudget) || undefined,
      proposedTimelineDays:
        Number(changeForm.proposedTimelineDays) > 0
          ? Number(changeForm.proposedTimelineDays) * 7
          : undefined,
    });
    setChangeOpen(false);
  };
  const contractTitle =
    contract.contractTitle || contract.title || `Contract #${contract.contractId}`;
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
  const completedMilestoneCount = jobMilestones.filter(
    (item) => ["COMPLETED", "RELEASED"].includes(
      normalizeContractStatus(item.status),
    ),
  ).length;
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
  const canRequestChange = contractStatus === "DRAFT";
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

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
        eyebrow="CONTRACT DETAIL"
        title={contractTitle}
        description="Điểm điều phối cho đàm phán, activate, NDA, termination và các luồng con."
        actions={
          <>
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
            <StatusBadge status={contract.status} />
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
              label="Ky quy 20%"
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
            <SectionHeading title="Hai bên tham gia" />
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Participant
                label="Doanh nghiệp"
                value={
                  contract.businessName ||
                  participantNames.businessName ||
                  `Business #${contract.businessId}`
                }
              />
              <Participant
                label="Chuyên gia"
                value={
                  contract.expertName ||
                  participantNames.expertName ||
                  `Expert #${contract.expertId}`
                }
              />
            </div>
          </div>
          <div className="mt-6 rounded-3xl border border-slate-100 p-5">
            <SectionHeading
              title="Điều kiện kích hoạt hợp đồng"
              description="BE chỉ chuyển contract sang Active khi đủ 4 bước: business accept, expert accept, business ký NDA, expert ký NDA."
            />
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <ContractFlowStep
                label="Business chấp nhận contract"
                done={businessAccepted}
                value={contract.businessAcceptedAt}
              />
              <ContractFlowStep
                label="Expert chấp nhận contract"
                done={expertAccepted}
                value={contract.expertAcceptedAt}
              />
              <ContractFlowStep
                label="Business ký NDA"
                done={businessNdaSigned}
                value={contract.businessNdaSignedAt}
              />
              <ContractFlowStep
                label="Expert ký NDA"
                done={expertNdaSigned}
                value={contract.expertNdaSignedAt}
              />
            </div>
            <Notice
              tone={
                readyToActivate || contractStatus === "ACTIVE"
                  ? "success"
                  : "info"
              }
              title={
                contractStatus === "ACTIVE"
                  ? "Contract đã Active, milestone budget và job status đã được backend cập nhật."
                  : "Contract sẽ Active sau khi đủ 2 chữ ký contract và 2 chữ ký NDA."
              }
              className="mt-4"
            />
          </div>
          <div className="mt-6 rounded-3xl border border-slate-100 p-5">
            <SectionHeading
              title="Milestone trong draft"
              description="Các ngân sách final được backend tạo từ job và proposal đã accepted."
            />
            <div className="mt-4 grid gap-3">
              {(contract.contractMilestones || []).map((milestone) => (
                <div
                  key={milestone.contractMilestoneId}
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
                    value={formatCurrency(milestone.originalBudget)}
                  />
                  <ContractMetric
                    label="Ngân sách final"
                    value={formatCurrency(milestone.finalBudget)}
                  />
                </div>
              ))}
              {(!contract.contractMilestones ||
                contract.contractMilestones.length === 0) && (
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
                onClick={signNda}
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
                Tu choi hop dong
              </Button>
            )}
            {canRequestChange && (
              <Button variant="secondary" onClick={() => setChangeOpen(true)}>
                <MessageSquareText className="h-4 w-4" />
                Request change
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
                  <StatusBadge status={milestone.status} />
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
          <Notice tone="info" title="Request change" className="mt-4">
            Backend hiện có API tạo request change, chưa có API list lịch sử request change nên UI không hiển thị timeline giả.
          </Notice>
        </Card>
      </div>
      </div>

      <Modal
        open={depositConfirmOpen}
        onClose={() => !depositLoading && setDepositConfirmOpen(false)}
        title="Xac nhan ky quy contract"
        description="So tien ky quy bang 20% tong ngan sach contract va se duoc giu trong escrow."
        size="lg"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setDepositConfirmOpen(false)}
              disabled={depositLoading}
            >
              Huy
            </Button>
            {!hasEnoughDepositBalance && (
              <Button
                variant="secondary"
                onClick={() =>
                  window.dispatchEvent(
                    new CustomEvent("aitasker:open-wallet-topup", {
                      detail: {
                        amount: depositMissingAmount,
                        description: `Nap vi de ky quy contract #${contract.contractId}`,
                      },
                    }),
                  )
                }
              >
                Nap vi
              </Button>
            )}
            <Button
              onClick={payDeposit}
              loading={depositLoading}
              disabled={!hasEnoughDepositBalance || depositLoading}
            >
              Xac nhan ky quy
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-3">
            <ContractMetric
              label="Tong contract"
              value={formatCurrency(contract.totalBudget)}
            />
            <ContractMetric
              label="Ky quy 20%"
              value={formatCurrency(securityDepositAmount)}
            />
            <ContractMetric
              label="So du kha dung"
              value={formatCurrency(availableBalance)}
            />
          </div>
          {!hasEnoughDepositBalance ? (
            <Notice
              tone="danger"
              title={`Vi con thieu ${formatCurrency(depositMissingAmount)} de ky quy.`}
            >
              Hay nap them vao vi truoc, sau khi PayOS xac nhan so du thi quay lai bam xac nhan ky quy.
            </Notice>
          ) : (
            <Notice
              tone="warning"
              title="Ban co chac chan muon ky quy contract nay?"
            >
              Sau khi xac nhan, BE se hold 20% gia tri contract vao escrow, chuyen contract sang ACTIVE va cap nhat ngan sach milestone theo proposal da accept.
            </Notice>
          )}
          <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
            <SectionHeading
              title="Dieu kien truoc khi ky quy"
              description="Contract phai o trang thai PENDING, nghia la business va expert da chap nhan contract va da ky NDA."
            />
            <div className="mt-4 grid gap-2 text-sm font-semibold text-slate-600 md:grid-cols-2">
              <span>Contract: #{contract.contractId}</span>
              <span>Status: {contract.status}</span>
              <span>Business accepted: {businessAccepted ? "Da xong" : "Chua"}</span>
              <span>Expert accepted: {expertAccepted ? "Da xong" : "Chua"}</span>
              <span>Business NDA: {businessNdaSigned ? "Da xong" : "Chua"}</span>
              <span>Expert NDA: {expertNdaSigned ? "Da xong" : "Chua"}</span>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={changeOpen}
        onClose={() => setChangeOpen(false)}
        title="Request change"
        description="Gửi yêu cầu sửa hợp đồng khi contract đang Draft/Negotiating."
        footer={
          <>
            <Button variant="secondary" onClick={() => setChangeOpen(false)}>
              Hủy
            </Button>
            <Button onClick={requestChange}>Gửi yêu cầu</Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Field label="Loại thay đổi">
            <Input
              value={changeForm.changeType}
              onChange={(event) =>
                setChangeForm((value) => ({
                  ...value,
                  changeType: event.target.value,
                }))
              }
            />
          </Field>
          <Field label="Nội dung">
            <Textarea
              value={changeForm.changeSummary}
              onChange={(event) =>
                setChangeForm((value) => ({
                  ...value,
                  changeSummary: event.target.value,
                }))
              }
            />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Ngân sách đề xuất">
              <Input
                type="number"
                value={changeForm.proposedBudget}
                onChange={(event) =>
                  setChangeForm((value) => ({
                    ...value,
                    proposedBudget: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Timeline đề xuất (tuần)">
              <Input
                type="number"
                value={changeForm.proposedTimelineDays}
                onChange={(event) =>
                  setChangeForm((value) => ({
                    ...value,
                    proposedTimelineDays: event.target.value,
                  }))
                }
              />
            </Field>
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

function normalizeContractStatus(status?: string) {
  const normalized = (status || "").trim().replace(/ /g, "_").toUpperCase();
  if (normalized === "DRAFT" || normalized === "NEGOTIATING") return "DRAFT";
  if (normalized === "PENDING" || normalized === "PENDINGDEPOSIT") return "PENDING";
  if (normalized === "ACTIVE") return "ACTIVE";
  if (normalized === "COMPLETED") return "COMPLETED";
  if (normalized === "TERMINATED" || normalized === "CANCELLED") return "CANCELLED";
  return normalized;
}

function calculateSecurityDeposit(totalBudget?: number) {
  return Math.round(Number(totalBudget || 0) * 20) / 100;
}

function formatTimelineWeeks(timelineDays?: number) {
  const weeks = Math.max(1, Math.ceil(Number(timelineDays || 0) / 7));
  return `${weeks} tuần`;
}

function getSourceMilestoneId(milestone: Partial<Milestone>) {
  const value =
    (milestone as Partial<Milestone> & { jobMilestoneId?: number })
      .jobMilestoneId ?? milestone.milestoneId;
  return Number.isFinite(Number(value)) ? Number(value) : undefined;
}

function getContractMilestoneId(milestone: Partial<Milestone>) {
  const value = (milestone as { contractMilestoneId?: number })
    .contractMilestoneId;
  return Number.isFinite(Number(value)) ? Number(value) : undefined;
}

function getMilestoneBudget(milestone: Partial<Milestone>) {
  const value =
    (milestone as Partial<Milestone> & { finalBudget?: number }).finalBudget ??
    milestone.fundsAllocated;
  return Number(value || 0);
}

function getMilestoneDurationLabel(
  milestone: Partial<Milestone> & { duration?: number; durationUnit?: string },
) {
  const duration = Number(milestone.duration || 0);
  if (!Number.isFinite(duration) || duration <= 0) return "Chưa có thời gian";
  return `${duration} ${milestone.durationUnit || "tuần"}`;
}

function canBackendReviewMilestone(status?: string) {
  const normalized = (status || "")
    .trim()
    .replace(/[\s-]+/g, "_")
    .toUpperCase();
  return [
    "UNDER_REVIEW",
    "IN_REVIEW",
    "PENDING_REVIEW",
    "WAITING_REVIEW",
    "WAITING_APPROVAL",
    "PENDING_APPROVAL",
    "CHO_DUYET",
    "CHO_NGHIEM_THU",
  ].includes(normalized);
}

function ContractLifecycle({ status }: { status: string }) {
  const steps = ["DRAFT", "PENDING", "ACTIVE", "COMPLETED"];
  const labels: Record<string, string> = {
    DRAFT: "Draft",
    PENDING: "Cho ky quy",
    ACTIVE: "Active",
    COMPLETED: "Completed",
  };
  const normalizedStatus = normalizeContractStatus(status);
  const currentIndex = steps.indexOf(normalizedStatus);
  const terminal = normalizedStatus === "CANCELLED";

  return (
    <div className="mt-3 grid gap-2 md:grid-cols-5">
      {steps.map((step, index) => {
        const reached = !terminal && currentIndex >= index;
        const current = normalizedStatus === step;
        return (
          <div
            key={step}
            className={
              current
                ? "rounded-2xl border border-brand-100 bg-brand-50 p-3"
                : reached
                  ? "rounded-2xl border border-mint-100 bg-mint-50 p-3"
                  : "rounded-2xl border border-slate-100 bg-white p-3"
            }
          >
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={
                  reached || current
                    ? "grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-white text-mint-600"
                    : "grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-slate-50 text-slate-400"
                }
              >
                <CheckCircle2 className="h-4 w-4" />
              </span>
              <p className="min-w-0 truncate text-xs font-extrabold text-ink">
                {labels[step] || step}
              </p>
            </div>
          </div>
        );
      })}
      {terminal && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 md:col-span-5">
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-rose-600" />
            <p className="text-sm font-extrabold text-rose-700">
              Contract đã dừng ở trạng thái {status}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function getContractNextAction({
  contract,
  role,
  businessAccepted,
  expertAccepted,
  businessNdaSigned,
  expertNdaSigned,
  underReviewCount,
  activeDisputeCount,
}: {
  contract: Contract;
  role?: string;
  businessAccepted: boolean;
  expertAccepted: boolean;
  businessNdaSigned: boolean;
  expertNdaSigned: boolean;
  underReviewCount: number;
  activeDisputeCount: number;
}): { tone: "info" | "success" | "warning" | "danger"; title: string; description: string } {
  const contractStatus = normalizeContractStatus(contract.status);
  if (activeDisputeCount > 0) {
    return {
      tone: "warning",
      title: "Contract đang có tranh chấp cần theo dõi.",
      description: `${activeDisputeCount} dispute chưa xử lý xong. Hai bên nên ưu tiên xử lý trước khi tiếp tục nghiệm thu/thanh toán.`,
    };
  }
  if (contractStatus === "COMPLETED") {
    return {
      tone: "success",
      title: "Contract đã hoàn tất.",
      description: "Tất cả milestone đã hoàn thành theo logic backend.",
    };
  }
  if (contractStatus === "CANCELLED") {
    return {
      tone: "danger",
      title: "Contract không còn tiếp tục thực hiện.",
      description: `Trạng thái hiện tại là ${contract.status}.`,
    };
  }
  if (contractStatus === "PENDING") {
    return {
      tone: role === "BUSINESS" ? "warning" : "info",
      title:
        role === "BUSINESS"
          ? "Bạn cần thanh toán ký quỹ để kích hoạt contract."
          : "Đang chờ doanh nghiệp thanh toán ký quỹ.",
      description: "BE chỉ cho ký quỹ khi contract ở trạng thái PendingDeposit.",
    };
  }
  if (!businessAccepted) {
    return {
      tone: role === "BUSINESS" ? "warning" : "info",
      title:
        role === "BUSINESS"
          ? "Bạn cần chấp nhận contract."
          : "Đang chờ doanh nghiệp chấp nhận contract.",
      description: "Một trong 4 điều kiện kích hoạt contract vẫn chưa hoàn tất.",
    };
  }
  if (!expertAccepted) {
    return {
      tone: role === "EXPERT" ? "warning" : "info",
      title:
        role === "EXPERT"
          ? "Bạn cần chấp nhận contract."
          : "Đang chờ chuyên gia chấp nhận contract.",
      description: "Một trong 4 điều kiện kích hoạt contract vẫn chưa hoàn tất.",
    };
  }
  if (!businessNdaSigned) {
    return {
      tone: role === "BUSINESS" ? "warning" : "info",
      title:
        role === "BUSINESS"
          ? "Bạn cần ký NDA."
          : "Đang chờ doanh nghiệp ký NDA.",
      description: "BE lưu thời điểm ký NDA riêng cho từng bên.",
    };
  }
  if (!expertNdaSigned) {
    return {
      tone: role === "EXPERT" ? "warning" : "info",
      title:
        role === "EXPERT"
          ? "Bạn cần ký NDA."
          : "Đang chờ chuyên gia ký NDA.",
      description: "BE lưu thời điểm ký NDA riêng cho từng bên.",
    };
  }
  if (contractStatus === "ACTIVE") {
    return {
      tone: underReviewCount > 0 && role === "BUSINESS" ? "warning" : "success",
      title:
        underReviewCount > 0 && role === "BUSINESS"
          ? "Có milestone đang chờ nghiệm thu."
          : "Contract đang Active.",
      description:
        underReviewCount > 0
          ? `${underReviewCount} milestone đã có deliverable và đang Under Review.`
          : "Expert có thể submit deliverable trong workspace, business nghiệm thu milestone khi có submission.",
    };
  }
  return {
    tone: "info",
    title: "Contract đang trong giai đoạn chuẩn bị.",
    description: "Theo dõi các điều kiện kích hoạt và action theo role ở bên dưới.",
  };
}

function ContractMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-100 p-4">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-2 font-display text-lg font-black text-ink">{value}</p>
    </div>
  );
}

function OperationStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3.5">
      <p className="min-w-0 text-sm font-bold leading-5 text-slate-500">
        {label}
      </p>
      <p className="shrink-0 font-display text-lg font-black text-ink">
        {value}
      </p>
    </div>
  );
}

function ContractFlowStep({
  label,
  done,
  value,
}: {
  label: string;
  done: boolean;
  value?: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
      <span
        className={
          done
            ? "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-2xl bg-mint-50 text-mint-600"
            : "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-700"
        }
      >
        {done ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <LockKeyhole className="h-4 w-4" />
        )}
      </span>
      <div className="min-w-0">
        <p className="font-extrabold text-ink">{label}</p>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          {done && value
            ? formatDateTime(value)
            : done
              ? "Đã hoàn tất"
              : "Đang chờ"}
        </p>
      </div>
    </div>
  );
}

function Participant({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 font-extrabold text-ink">{value}</p>
    </div>
  );
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
  const [deliverableOpen, setDeliverableOpen] = useState<Milestone | null>(
    null,
  );
  const [deliverableForm, setDeliverableForm] = useState({
    sourceCodeUrl: "",
    demoLink: "",
    submissionNotes: "",
  });
  const [workspaceNotice, setWorkspaceNotice] = useState<{
    tone: "success" | "danger" | "info";
    title: string;
  } | null>(null);
  const [milestoneNotices, setMilestoneNotices] = useState<
    Record<number, { tone: "success" | "danger" | "info"; title: string }>
  >({});

  useEffect(() => {
    const id = Number(contractId);
    contractApi
      .listContracts()
      .then((items) =>
        setContract(items.find((item) => item.contractId === id) || null),
      )
      .catch(() => setContract(null));
    contractApi
      .listMilestones(id)
      .then(setMilestones)
      .catch(() => setMilestones([]));
  }, [contractId]);

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
    });
  }, [milestones]);

  if (!contract)
    return (
      <EmptyState
        title="Không tìm thấy workspace"
        description="Dữ liệu workspace được lấy trực tiếp từ backend."
      />
    );

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
    setWorkspaceNotice(null);
    try {
      await contractApi.submitDeliverable({
        milestoneId: sourceMilestoneId,
        ...deliverableForm,
      });
      const [updatedDeliverables, updatedMilestones] = await Promise.all([
        contractApi.listDeliverables(sourceMilestoneId),
        contractApi.listMilestones(contract.contractId),
      ]);
      setDeliverablesByMilestone((current) => ({
        ...current,
        [sourceMilestoneId]: updatedDeliverables,
      }));
      setMilestones(updatedMilestones);
      setDeliverableForm({
        sourceCodeUrl: "",
        demoLink: "",
        submissionNotes: "",
      });
      setDeliverableOpen(null);
      setMilestoneNotices((current) => ({
        ...current,
        [sourceMilestoneId]: {
          tone: "success",
          title: "Đã nộp deliverable. Trạng thái milestone lấy theo phản hồi từ backend.",
        },
      }));
    } catch (error) {
      setMilestoneNotices((current) => ({
        ...current,
        [sourceMilestoneId]: {
          tone: "danger",
          title: getApiErrorMessage(error),
        },
      }));
    }
  };

  const completeMilestone = async (milestone: Milestone) => {
    const sourceMilestoneId = getSourceMilestoneId(milestone);
    if (!sourceMilestoneId) {
      setWorkspaceNotice({
        tone: "danger",
        title: "Không xác định được milestone gốc để nghiệm thu.",
      });
      return;
    }
    setWorkspaceNotice(null);
    try {
      await contractApi.completeMilestone(sourceMilestoneId);
      setMilestones(await contractApi.listMilestones(contract.contractId));
      setMilestoneNotices((current) => ({
        ...current,
        [sourceMilestoneId]: {
          tone: "success",
          title: `Đã gửi nghiệm thu cho ${milestone.milestoneName}.`,
        },
      }));
    } catch (error) {
      setMilestoneNotices((current) => ({
        ...current,
        [sourceMilestoneId]: {
          tone: "danger",
          title: getApiErrorMessage(error),
        },
      }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          eyebrow="EXEC-01 / EXEC-02"
          title={`Workspace: ${
            contract.contractTitle ||
            contract.title ||
            `Contract #${contract.contractId}`
          }`}
          description="Theo dõi milestone, acceptance criteria và deliverable từ backend."
        />
      </div>
      {workspaceNotice && (
        <Notice tone={workspaceNotice.tone} title={workspaceNotice.title} />
      )}
      <div className="grid gap-4">
        {milestones.map((milestone) => {
          const sourceMilestoneId = getSourceMilestoneId(milestone);
          const milestoneDeliverables = sourceMilestoneId
            ? deliverablesByMilestone[sourceMilestoneId] || []
            : [];
          const criteriaItems = sourceMilestoneId
            ? criteriaByMilestone[sourceMilestoneId] || []
            : [];
          const milestoneNotice = sourceMilestoneId
            ? milestoneNotices[sourceMilestoneId]
            : null;
          const canSubmitDeliverable = session?.role === "EXPERT";
          const reviewableByBackend = canBackendReviewMilestone(milestone.status);
          const canCompleteMilestone =
            session?.role === "BUSINESS" &&
            milestoneDeliverables.length > 0 &&
            reviewableByBackend;

          return (
            <Card
              key={sourceMilestoneId || getContractMilestoneId(milestone) || milestone.orderIndex}
              className="p-5"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="brand">Mốc {milestone.orderIndex}</Badge>
                    <StatusBadge status={milestone.status} />
                  </div>
                  <h3 className="mt-3 font-display text-xl font-extrabold text-ink">
                    {milestone.milestoneName}
                  </h3>
                  <p className="mt-2 text-sm text-slate-500">
                    Ký quỹ: {formatCurrency(getMilestoneBudget(milestone))}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Thời gian: {getMilestoneDurationLabel(milestone)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {canSubmitDeliverable && (
                    <Button size="sm" onClick={() => setDeliverableOpen(milestone)}>
                      <UploadCloud className="h-4 w-4" /> Submit deliverable
                    </Button>
                  )}
                  {session?.role === "BUSINESS" && (
                    <Button
                      size="sm"
                      variant="success"
                      disabled={!canCompleteMilestone}
                      onClick={() => completeMilestone(milestone)}
                    >
                      <CheckCircle2 className="h-4 w-4" /> Nghiệm thu
                    </Button>
                  )}
                  <CreateDisputeInline
                    contractId={contract.contractId}
                    milestoneId={sourceMilestoneId}
                  />
                </div>
              </div>

              {milestoneNotice && (
                <div className="mt-4">
                  <Notice tone={milestoneNotice.tone} title={milestoneNotice.title} />
                </div>
              )}

              {session?.role === "BUSINESS" && milestoneDeliverables.length === 0 && (
                <div className="mt-4">
                  <Notice
                    tone="info"
                    title="Chưa có deliverable từ backend nên chưa thể nghiệm thu milestone này."
                  />
                </div>
              )}
              {session?.role === "BUSINESS" &&
                milestoneDeliverables.length > 0 &&
                !reviewableByBackend && (
                  <div className="mt-4">
                    <Notice
                      tone="warning"
                      title={`Backend đang trả milestone ở trạng thái ${milestone.status}; cần chuyển sang trạng thái chờ nghiệm thu trước khi gọi nghiệm thu.`}
                    />
                  </div>
                )}

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm font-extrabold text-ink">
                    Acceptance Criteria
                  </p>
                  <div className="mt-3 grid gap-2">
                    {criteriaItems.map((criteria) => (
                      <div
                        key={criteria.criteriaId}
                        className="flex items-center gap-2 text-sm text-slate-600"
                      >
                        {criteria.isPassed ? (
                          <CheckCircle2 className="h-4 w-4 text-mint-600" />
                        ) : (
                          <span className="h-4 w-4 rounded-full border border-slate-300" />
                        )}
                        {criteria.description}
                      </div>
                    ))}
                    {criteriaItems.length === 0 && (
                      <p className="rounded-xl border border-dashed border-slate-200 bg-white p-3 text-sm font-semibold text-slate-400">
                        Backend chưa trả acceptance criteria cho milestone này.
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-extrabold text-ink">Deliverables</p>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500">
                      {milestoneDeliverables.length} sản phẩm
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2">
                    {milestoneDeliverables.map((item) => (
                      <div
                        key={item.deliverableId}
                        className="rounded-xl bg-white p-3 text-sm text-slate-600 shadow-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-bold text-ink">
                            Deliverable #{item.deliverableId}
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
                          <p className="mt-2 leading-6">{item.submissionNotes}</p>
                        )}
                      </div>
                    ))}
                    {milestoneDeliverables.length === 0 && (
                      <p className="rounded-xl border border-dashed border-slate-200 bg-white p-3 text-sm font-semibold text-slate-400">
                        Backend chưa có deliverable cho milestone này.
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
        title="Nộp deliverable"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setDeliverableOpen(null)}
            >
              Hủy
            </Button>
            <Button onClick={submitDeliverable}>Nộp</Button>
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
    </div>
  );
}
export function FinancePage() {
  const session = useSession();
  const isAdmin = session?.role === "ADMIN";
  const canCreateTransaction = session?.role === "BUSINESS" || isAdmin;
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [wallet, setWallet] = useState<SystemWallet | null>(null);
  const [lookupMilestoneId, setLookupMilestoneId] = useState("");
  const [transactionOpen, setTransactionOpen] = useState(false);
  const [form, setForm] = useState({
    milestoneId: "",
    amount: "",
    commissionFee: "0",
    transactionType: "Deposit",
    status: "Pending",
  });
  const [message, setMessage] = useState("");

  useEffect(() => {
    walletApi
      .current()
      .then(setWallet)
      .catch(() => setWallet(null));
  }, []);

  const loadTransactions = async (milestoneIdValue = lookupMilestoneId) => {
    const milestoneId = Number(milestoneIdValue);
    if (!Number.isFinite(milestoneId) || milestoneId <= 0) {
      setMessage("Nhập Milestone ID hợp lệ từ database để tải giao dịch.");
      return;
    }
    setMessage("");
    setTransactions(await financeApi.listTransactions(milestoneId));
  };

  const createTransaction = async () => {
    const milestoneId = Number(form.milestoneId);
    const amount = Number(form.amount);
    const commissionFee = Number(form.commissionFee || 0);
    if (
      !Number.isFinite(milestoneId) ||
      milestoneId <= 0 ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !Number.isFinite(commissionFee) ||
      commissionFee < 0
    ) {
      setMessage("Milestone ID, amount và commission fee phải là số hợp lệ.");
      return;
    }
    const tx = await financeApi.createTransaction({
      milestoneId,
      amount,
      commissionFee,
      transactionType: form.transactionType as "Deposit",
      status: form.status,
    });
    setLookupMilestoneId(String(tx.milestoneId));
    await loadTransactions(String(tx.milestoneId));
    setTransactionOpen(false);
  };
  const webhook = async (transactionId: number) => {
    const updated = await financeApi.paymentWebhook(transactionId, "Success");
    setTransactions((items) =>
      items.map((item) =>
        item.transactionId === transactionId
          ? { ...item, status: updated.status }
          : item,
      ),
    );
  };
  const updateStatus = async (transactionId: number, status: string) => {
    const updated = await financeApi.updateTransactionStatus(
      transactionId,
      status,
    );
    setTransactions((items) =>
      items.map((item) =>
        item.transactionId === transactionId
          ? { ...item, status: updated.status }
          : item,
      ),
    );
  };
  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
        eyebrow="FIN-01"
        title="Ví thanh toán & ký quỹ"
        description="Nạp số dư qua payOS để sử dụng trong nền tảng, đồng thời theo dõi giao dịch ký quỹ theo từng milestone."
        actions={
          <>
            <Button onClick={() => window.dispatchEvent(new Event("aitasker:open-wallet-topup"))}>
              <WalletCards className="h-4 w-4" /> Nạp tiền qua payOS
            </Button>
            {canCreateTransaction && (
              <Button variant="secondary" onClick={() => setTransactionOpen(true)}>
                <Plus className="h-4 w-4" /> Tạo ký quỹ milestone
              </Button>
            )}
          </>
        }
      />
      </div>
      <Card className="overflow-hidden border-brand-100 bg-gradient-to-br from-brand-50 via-white to-indigo-50">
        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <Badge tone="brand">PAYOS · NẠP VÍ</Badge>
            <h2 className="mt-3 font-display text-2xl font-black tracking-tight text-ink">
              Nạp tiền nhanh, hệ thống tự đối soát
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Nhập số tiền nguyên VND từ 2.000đ, quét QR hoặc mở trang payOS. Khi payOS xác nhận, số dư khả dụng được cập nhật tự động qua wallet ledger.
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-3xl bg-white/90 p-4 shadow-card">
            <span className="text-xs font-extrabold uppercase tracking-wide text-slate-400">Quy trình</span>
            <span className="text-sm font-bold text-ink">Tạo QR → Thanh toán → Xác nhận</span>
            <Button size="sm" onClick={() => window.dispatchEvent(new Event("aitasker:open-wallet-topup"))}>
              Bắt đầu nạp tiền
            </Button>
          </div>
        </div>
      </Card>
      <Card className="p-5">
        {wallet && (
          <div className="mb-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">
                Available wallet
              </p>
              <p className="mt-2 font-display text-2xl font-black text-ink">
                {formatCompactCurrency(wallet.availableBalance)}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">
                Escrow balance
              </p>
              <p className="mt-2 font-display text-2xl font-black text-amber-700">
                {formatCompactCurrency(wallet.escrowBalance)}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">
                Wallet type
              </p>
              <p className="mt-2 font-display text-2xl font-black text-brand-700">
                {wallet.walletType}
              </p>
            </div>
          </div>
        )}
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <Field label="Tải giao dịch theo Milestone ID">
            <Input
              type="number"
              min={1}
              value={lookupMilestoneId}
              onChange={(event) => setLookupMilestoneId(event.target.value)}
            />
          </Field>
          <Button
            type="button"
            variant="secondary"
            onClick={() => loadTransactions()}
          >
            Tải từ API
          </Button>
        </div>
        {message && <Notice tone="danger" title={message} className="mt-4" />}
      </Card>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm font-bold text-slate-500">Tổng lưu chuyển</p>
          <p className="mt-2 font-display text-3xl font-black text-ink">
            {formatCompactCurrency(
              transactions.reduce((sum, item) => sum + item.amount, 0),
            )}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-bold text-slate-500">Phí nền tảng</p>
          <p className="mt-2 font-display text-3xl font-black text-mint-600">
            {formatCompactCurrency(
              transactions.reduce((sum, item) => sum + item.commissionFee, 0),
            )}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-bold text-slate-500">Giao dịch pending</p>
          <p className="mt-2 font-display text-3xl font-black text-coral-600">
            {transactions.filter((item) => item.status === "Pending").length}
          </p>
        </Card>
      </div>
      <Card className="overflow-hidden">
        <div className="grid border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-extrabold uppercase tracking-wide text-slate-400 md:grid-cols-[1fr_120px_120px_130px_260px]">
          <span>Milestone</span>
          <span>Loại</span>
          <span>Số tiền</span>
          <span>Status</span>
          <span>Action</span>
        </div>
        {transactions.map((tx) => (
          <div
            key={tx.transactionId}
            className="grid gap-3 border-b border-slate-100 px-5 py-4 text-sm md:grid-cols-[1fr_120px_120px_130px_260px] md:items-center"
          >
            <div>
              <p className="font-extrabold text-ink">#{tx.transactionId}</p>
              <p className="mt-1 text-slate-500">
                {tx.milestoneName || `Milestone #${tx.milestoneId}`}
              </p>
            </div>
            <Badge tone="brand">{tx.transactionType}</Badge>
            <span className="font-extrabold text-ink">
              {formatCompactCurrency(tx.amount)}
            </span>
            <StatusBadge status={tx.status} />
            <div className="flex flex-wrap gap-2">
              {isAdmin ? (
                <>
                  <Button
                    size="sm"
                    variant="success"
                    onClick={() => webhook(tx.transactionId)}
                  >
                    Webhook
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => updateStatus(tx.transactionId, "Failed")}
                  >
                    Fail
                  </Button>
                </>
              ) : (
                <Badge tone="slate">View only</Badge>
              )}
            </div>
          </div>
        ))}
        {transactions.length === 0 && (
          <EmptyState
            title="Chưa có giao dịch"
            description="Nhập Milestone ID thật để tải transaction từ back-end."
          />
        )}
      </Card>
      <Notice tone="info" title="Hai luồng thanh toán độc lập">
        Nạp ví dùng payOS và chỉ cộng số dư sau khi order được xác nhận PAID. Bảng bên trên là giao dịch ký quỹ theo milestone; giao dịch đó không thay thế lịch sử nạp ví.
      </Notice>

      <Modal
        open={transactionOpen}
        onClose={() => setTransactionOpen(false)}
        title="Tạo transaction"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setTransactionOpen(false)}
            >
              Hủy
            </Button>
            <Button onClick={createTransaction}>Tạo</Button>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Milestone ID">
            <Input
              type="number"
              min={1}
              value={form.milestoneId}
              onChange={(event) =>
                setForm((value) => ({
                  ...value,
                  milestoneId: event.target.value,
                }))
              }
            />
          </Field>
          <Field label="Amount">
            <Input
              type="number"
              min={1}
              value={form.amount}
              onChange={(event) =>
                setForm((value) => ({ ...value, amount: event.target.value }))
              }
            />
          </Field>
          <Field label="Commission fee">
            <Input
              type="number"
              min={0}
              value={form.commissionFee}
              onChange={(event) =>
                setForm((value) => ({
                  ...value,
                  commissionFee: event.target.value,
                }))
              }
            />
          </Field>
          <Field label="Transaction type">
            <Input
              value={form.transactionType}
              onChange={(event) =>
                setForm((value) => ({
                  ...value,
                  transactionType: event.target.value,
                }))
              }
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}

export function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [form, setForm] = useState({
    contractId: "",
    rating: "5",
    comment: "",
  });
  const [message, setMessage] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const contractId = Number(form.contractId);
    const rating = Number(form.rating);
    if (
      !Number.isFinite(contractId) ||
      contractId <= 0 ||
      !Number.isFinite(rating) ||
      rating < 1 ||
      rating > 5
    ) {
      setMessage(
        "Contract ID phải là số dương và rating nằm trong khoảng 1-5.",
      );
      return;
    }
    setMessage("");
    const review = await adminApi.createReview({
      contractId,
      rating,
      comment: form.comment,
    });
    setReviews((items) => [...items, review]);
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
        eyebrow="REV-01"
        title="Đánh giá chéo"
        description="Hai bên đánh giá sau khi hợp đồng Completed/Terminated/Cancelled."
      />
      </div>
      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <Card className="p-6">
          <SectionHeading title="Gửi review" />
          <form onSubmit={submit} className="mt-5 grid gap-4">
            <Field label="Contract ID">
              <Input
                type="number"
                min={1}
                value={form.contractId}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    contractId: event.target.value,
                  }))
                }
                required
              />
            </Field>
            <Field label="Rating 1-5">
              <Input
                type="number"
                min="1"
                max="5"
                step="0.1"
                value={form.rating}
                onChange={(event) =>
                  setForm((value) => ({ ...value, rating: event.target.value }))
                }
                required
              />
            </Field>
            <Field label="Nhận xét">
              <Textarea
                value={form.comment}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    comment: event.target.value,
                  }))
                }
              />
            </Field>
            <Button type="submit">
              <Star className="h-4 w-4" /> Gửi đánh giá
            </Button>
          </form>
          {message && <Notice tone="danger" title={message} className="mt-4" />}
        </Card>
        <Card className="p-6">
          <SectionHeading
            title="Review theo hợp đồng"
            action={
              <Button variant="secondary" size="sm">
                <Download className="h-4 w-4" /> Export UI
              </Button>
            }
          />
          <div className="mt-5 grid gap-3">
            {reviews.map((review) => (
              <div
                key={review.reviewId}
                className="rounded-2xl border border-slate-100 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-extrabold text-ink">
                    {review.reviewerName || `Reviewer #${review.reviewerId}`}
                  </p>
                  <Badge tone="amber">
                    <Star className="h-3.5 w-3.5 fill-current" />{" "}
                    {review.rating}
                  </Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {review.comment}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

export function CreateDisputeInline({
  contractId,
  milestoneId,
}: {
  contractId: number;
  milestoneId?: number;
}) {
  const [open, setOpen] = useState(false);
  const [evidenceReport, setEvidenceReport] = useState("");

  const submit = async () => {
    await disputeApi.create({
      contractId,
      milestoneId,
      evidenceReport,
      status: "Open",
    });
    setOpen(false);
  };

  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>
        <Gavel className="h-4 w-4" />
        Khiếu nại
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Tạo dispute"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Hủy
            </Button>
            <Button variant="danger" onClick={submit}>
              Gửi dispute
            </Button>
          </>
        }
      >
        <Field label="Bằng chứng / mô tả tranh chấp">
          <Textarea
            value={evidenceReport}
            onChange={(event) => setEvidenceReport(event.target.value)}
          />
        </Field>
      </Modal>
    </>
  );
}

export function ContractQuickLinks({ contract }: { contract: Contract }) {
  const links = [
    {
      to: `/app/contracts/${contract.contractId}`,
      label: "Chi tiết",
      icon: <FileText className="h-4 w-4" />,
    },
    {
      to: `/app/contracts/${contract.contractId}/workspace`,
      label: "Workspace",
      icon: <FileCheck2 className="h-4 w-4" />,
    },
    {
      to: "/app/finance",
      label: "Escrow",
      icon: <WalletCards className="h-4 w-4" />,
    },
    { to: "/app/reviews", label: "Review", icon: <Star className="h-4 w-4" /> },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {links.map((link) => (
        <Link
          key={link.to}
          to={link.to}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-100 bg-white px-3 py-2 text-sm font-bold text-slate-600 transition hover:border-brand-100 hover:text-brand-700"
        >
          {link.icon}
          {link.label}
        </Link>
      ))}
      <span className="inline-flex items-center gap-2 rounded-2xl bg-mint-50 px-3 py-2 text-sm font-bold text-mint-600">
        <ReceiptText className="h-4 w-4" />
        VNPay transaction ready
      </span>
    </div>
  );
}

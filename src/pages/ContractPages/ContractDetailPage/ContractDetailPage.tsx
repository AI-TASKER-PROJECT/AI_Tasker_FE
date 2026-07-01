import { CheckCircle2, FileText, LockKeyhole, ShieldCheck, WalletCards, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { contractApi, disputeApi, profileApi, walletApi } from "../../../lib/api";
import { useSession } from "../../../lib/session";
import { formatCurrency, formatDateTime } from "../../../lib/utils";
import type { Contract, Dispute, Milestone, SystemWallet } from "../../../types";
import { Badge, Button, Card, EmptyState, Field, LinkButton, Modal, Notice, PageHeader, SectionHeading, StatusBadge, Textarea } from "../../../components/ui";
import { calculateSecurityDeposit, ContractFlowStep, ContractLifecycle, ContractMetric, formatTimelineWeeks, getContractNextAction, getMilestoneDurationLabel, NDA_TERMS, normalizeContractStatus, OperationStat, Participant, translateContractStatus } from "../ContractPages.shared";

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
  }, [contract]);

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
            experts.find((item) => item.expertId === expertId)?.fullName || "",
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
    setJobMilestones(
      await contractApi.listJobMilestones(updated.jobId).catch(() => []),
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
        message:
          "Backend đã chuyển contract sang Active và gắn budget vào milestone thật.",
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
              title="Contract đang IN_PROGRESS/ACTIVE, các thao tác dổi trạng thái đã bị khóa."
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
                Tu choi hop dong
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
              Dong
            </Button>
            {ndaModalMode === "sign" && (
              <Button
                onClick={confirmNdaSigning}
                disabled={!currentPartyAccepted || currentPartyNdaSigned}
                loading={ndaSubmitting}
              >
                <ShieldCheck className="h-4 w-4" />
                Xac nhan ky NDA
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
        title="Xac nhan ky quy contract"
        description="Số tiền ký quỹ bằng 20% tổng ngân sách contract và sẽ được giữ trong escrow."
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
                        description: `Nạp ví để ký quỹ contract #${contract.contractId}`,
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
              title={`Vì còn thiếu ${formatCurrency(depositMissingAmount)} de ky quy.`}
            >
              Hãy nạp thêm vào ví trước, sau khi PayOS xác nhận số dư thì quay
              lại bấm xác nhận ký quỹ.
            </Notice>
          ) : (
            <Notice
              tone="warning"
              title="Bạn có chắc chắn muốn ký quỹ contract này?"
            >
              Sau khi xac nhan, BE se hold 20% gia tri contract vao escrow,
              chuyen contract sang ACTIVE va cap nhat ngan sach milestone theo
              proposal da accept.
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
              <span>
                Business accepted: {businessAccepted ? "Da xong" : "Chua"}
              </span>
              <span>
                Expert accepted: {expertAccepted ? "Da xong" : "Chua"}
              </span>
              <span>
                Business NDA: {businessNdaSigned ? "Da xong" : "Chua"}
              </span>
              <span>Expert NDA: {expertNdaSigned ? "Da xong" : "Chua"}</span>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={terminateOpen}
        onClose={() => setTerminateOpen(false)}
        title="Chấm dứt hợp đồng"
        description="UI thể hiện snapshot termination dù back-end hiện mới dổi trạng thái contract."
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
        <Notice tone="warning" title="Snapshot tiến dộ">
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

import {
  ArrowDownLeft,
  ArrowUpRight,
  Building,
  ChevronLeft,
  ChevronRight,
  Clock,
  RefreshCw,
  Send,
  Shield,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  contractApi,
  disputeApi,
  getApiErrorMessage,
  profileApi,
  walletApi,
  walletTransactionApi,
  withdrawalApi,
} from "../../../services";
import { useSession } from "../../../context/sessionContext";
import { cn, formatCurrency, maskSensitiveValue } from "../../../lib/utils";
import type {
  PaymentActionResponse,
  BusinessProfile,
  Contract,
  Dispute,
  ExpertProfile,
  Milestone,
  SystemWallet,
  WalletTransaction,
  WithdrawalRequest,
} from "../../../types";
import {
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  MetricCard,
  Modal,
  Notice,
  PageHeader,
  SectionHeading,
  StatusBadge,
  Tabs,
} from "../../../components/ui";

// ── Helpers ───────────────────────────────────────────────────────────────────

function SplitDateTime({ value }: { value?: string }) {
  if (!value) return <span>—</span>;
  const dateObj = new Date(value);
  const time = new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(dateObj);
  const date = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(dateObj);
  return (
    <div className="flex flex-col items-end leading-tight gap-0.5">
      <span>{time}</span>
      <span>{date}</span>
    </div>
  );
}

function txIcon(type: WalletTransaction["transactionType"]) {
  if (
    type === "TOPUP" ||
    type === "DEPOSIT_REFUND" ||
    type === "WITHDRAW_REJECTED"
  )
    return <ArrowDownLeft className="h-5 w-5" />;
  return <ArrowUpRight className="h-5 w-5" />;
}

function txDisplayLabel(tx: WalletTransaction, role?: string) {
  const type = (tx.transactionType || "").toUpperCase();
  const direction = (tx.direction || "").toUpperCase();
  const balanceType = (tx.balanceType || "").toUpperCase();
  const isExpert = role === "EXPERT";

  if (type === "TOPUP") return "Nạp tiền vào ví";
  if (type === "MEMBERSHIP_PURCHASE") return "Thanh toán gói thành viên";
  if (type === "CREDIT_PURCHASE") return "Mua lượt sử dụng";
  if (type === "CONTRACT_SECURITY_DEPOSIT_HOLD") {
    return isExpert ? "Giữ ký quỹ bảo đảm hợp đồng" : "Giữ tiền ký quỹ dự án";
  }
  if (type === "EXPERT_CONTRACT_DEPOSIT_HOLD") {
    return "Ký quỹ bảo đảm hợp đồng";
  }
  if (type === "EXPERT_CONTRACT_DEPOSIT_REFUND") {
    return "Hoàn ký quỹ bảo đảm hợp đồng";
  }
  if (type === "DEPOSIT_REFUND") {
    return isExpert ? "Hoàn ký quỹ bảo đảm" : "Hoàn tiền ký quỹ dự án";
  }
  if (type === "WITHDRAW_HOLD") return "Tạm giữ tiền chờ rút";
  if (type === "WITHDRAW_APPROVED") return "Rút tiền về ngân hàng";
  if (type === "WITHDRAW_REJECTED") return "Hoàn tiền do rút bị từ chối";

  if (direction === "CREDIT") return "Tiền cộng vào ví";
  if (direction === "DEBIT") return "Tiền trừ khỏi ví";
  if (direction === "HOLD") {
    if (balanceType === "ESCROW") return "Tiền đang được giữ ký quỹ";
    if (balanceType === "HOLDING") return "Tiền đang chờ xử lý";
    if (balanceType === "DISPUTE") return "Tiền đang bị giữ do tranh chấp";
    return "Tiền đang được tạm giữ";
  }
  if (direction === "RELEASE") return "Tiền được giải ngân/hoàn lại";

  return tx.title || tx.description || "Giao dịch ví";
}

function txExtra(tx: WalletTransaction) {
  return tx as WalletTransaction & {
    milestoneNumber?: number | string;
    milestoneOrderIndex?: number | string;
    milestoneName?: string;
  };
}

function txMilestoneText(tx: WalletTransaction) {
  const extra = txExtra(tx);
  const value = extra.milestoneNumber ?? extra.milestoneOrderIndex;
  return value ? String(value) : "";
}

function txPartyText(value: string | undefined, fallback: string) {
  return value?.trim() || fallback;
}

function txContractContextLabel(tx: WalletTransaction) {
  const title = tx.contractTitle
    ?.trim()
    .replace(/^hợp đồng\s+/i, "")
    .replace(/^"(.+)"$/, "$1")
    .trim();
  if (title) return title;
  return tx.contractId ? "Hợp đồng liên quan" : tx.jobTitle?.trim() || "";
}

const TRANSACTIONS_PER_PAGE = 6;

function cleanWalletDescription(value?: string) {
  if (!value) return "";
  return value
    .replace(/Thời hạn từ\s+\S+\s+đến\s+\S+\.?/gi, "")
    .replace(/về\s+Ngân hàng:\s*[^.]+\.?/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+\./g, ".")
    .trim();
}

function txDisplayDescription(tx: WalletTransaction, role?: string) {
  const text =
    `${tx.title || ""} ${tx.description || ""} ${tx.rawDescription || ""}`.toLowerCase();
  const type = (tx.transactionType || "").toUpperCase();
  const isExpert = role === "EXPERT";
  const businessName = txPartyText(tx.businessName, "Doanh nghiệp");
  const expertName = txPartyText(tx.expertName, "Chuyên gia");
  const contractTitle = txPartyText(tx.contractTitle, "hợp đồng chưa có tên");
  const milestoneText = txMilestoneText(tx);
  const milestonePhrase = milestoneText
    ? `mốc ${milestoneText}`
    : "mốc tương ứng";

  if (text.includes("deposit milestone escrow")) {
    return isExpert
      ? `${businessName} đã ký quỹ ${milestonePhrase} cho hợp đồng "${contractTitle}" với bạn. Khoản tiền này đang được giữ để thanh toán sau khi mốc được nghiệm thu.`
      : `${businessName} đã ký quỹ ${milestonePhrase} cho hợp đồng "${contractTitle}" với chuyên gia ${expertName}.`;
  }
  if (text.includes("milestone approved payout")) {
    return isExpert
      ? `Bạn đã nhận thanh toán cho ${milestonePhrase} của hợp đồng "${contractTitle}" sau khi doanh nghiệp ${businessName} nghiệm thu.`
      : `${expertName} đã nhận thanh toán nghiệm thu ${milestonePhrase} của hợp đồng "${contractTitle}".`;
  }
  if (text.includes("release approved milestone escrow")) {
    return isExpert
      ? `Tiền ký quỹ ${milestonePhrase} của hợp đồng "${contractTitle}" đã được giải ngân vào ví của bạn.`
      : `${businessName} đã giải ngân tiền ký quỹ ${milestonePhrase} của hợp đồng "${contractTitle}" cho chuyên gia ${expertName}.`;
  }
  if (text.includes("review sla auto-approval payout")) {
    return isExpert
      ? `Bạn đã nhận thanh toán ${milestonePhrase} của hợp đồng "${contractTitle}" do mốc được tự động nghiệm thu sau thời hạn phản hồi.`
      : `${expertName} đã nhận thanh toán ${milestonePhrase} của hợp đồng "${contractTitle}" do mốc được tự động nghiệm thu sau thời hạn phản hồi.`;
  }
  if (text.includes("immediate termination milestone refund")) {
    return `${businessName} đã được hoàn tiền ký quỹ ${milestonePhrase} của hợp đồng "${contractTitle}" do hợp đồng bị chấm dứt.`;
  }
  if (text.includes("dispute business refund")) {
    return isExpert
      ? `${businessName} đã nhận phần tiền hoàn từ quyết toán tranh chấp ${milestonePhrase} của hợp đồng "${contractTitle}" theo quyết định xử lý.`
      : `${businessName} đã nhận tiền hoàn từ quyết toán tranh chấp ${milestonePhrase} của hợp đồng "${contractTitle}" với chuyên gia ${expertName}.`;
  }
  if (text.includes("dispute expert payout")) {
    return isExpert
      ? `Bạn đã nhận phần tiền được quyết toán từ tranh chấp ${milestonePhrase} của hợp đồng "${contractTitle}" với doanh nghiệp ${businessName}.`
      : `${expertName} đã nhận phần tiền được quyết toán từ tranh chấp ${milestonePhrase} của hợp đồng "${contractTitle}".`;
  }
  if (text.includes("dispute settlement debit")) {
    return isExpert
      ? `Bạn đã nhận phần tiền được quyết toán từ tranh chấp ${milestonePhrase} của hợp đồng "${contractTitle}" với doanh nghiệp ${businessName}.`
      : `${businessName} đã được quyết toán tranh chấp ${milestonePhrase} của hợp đồng "${contractTitle}" với chuyên gia ${expertName}.`;
  }
  if (text.includes("termination expert payout")) {
    return isExpert
      ? `Bạn đã nhận phần tiền được quyết toán khi chấm dứt hợp đồng "${contractTitle}" với doanh nghiệp ${businessName}.`
      : `${expertName} đã nhận phần tiền được quyết toán khi chấm dứt hợp đồng "${contractTitle}".`;
  }
  if (text.includes("termination business refund")) {
    return `${businessName} đã nhận phần tiền hoàn khi chấm dứt hợp đồng "${contractTitle}" theo quyết định xử lý.`;
  }
  if (text.includes("termination settlement debit")) {
    return `Tiền ký quỹ của hợp đồng "${contractTitle}" đã được quyết toán theo yêu cầu chấm dứt hợp đồng.`;
  }
  if (
    type === "EXPERT_CONTRACT_DEPOSIT_HOLD" ||
    text.includes("expert contract deposit") ||
    text.includes("expert security deposit hold")
  ) {
    return isExpert
      ? `Bạn đã ký quỹ bảo đảm cho hợp đồng "${contractTitle}". Khoản tiền này được giữ trong thời gian thực hiện hợp đồng.`
      : `${expertName} đã ký quỹ bảo đảm cho hợp đồng "${contractTitle}".`;
  }
  if (
    type === "EXPERT_CONTRACT_DEPOSIT_REFUND" ||
    text.includes("expert security deposit refund")
  ) {
    return isExpert
      ? `Bạn đã được hoàn lại tiền ký quỹ bảo đảm của hợp đồng "${contractTitle}".`
      : `${expertName} đã được hoàn ký quỹ bảo đảm của hợp đồng "${contractTitle}".`;
  }
  if (text.includes("refund participant contract deposit")) {
    return isExpert
      ? `Bạn đã được hoàn lại tiền ký quỹ tham gia hợp đồng "${contractTitle}".`
      : `Tiền ký quỹ tham gia hợp đồng "${contractTitle}" đã được hoàn cho bên liên quan.`;
  }
  if (text.includes("refund contract security deposit")) {
    return `${businessName} đã được hoàn lại tiền ký quỹ bảo đảm của hợp đồng "${contractTitle}".`;
  }
  if (text.includes("admin resolved contract security deposit")) {
    return `Tiền ký quỹ bảo đảm của hợp đồng "${contractTitle}" đã được xử lý theo quyết định của Admin.`;
  }

  return (
    cleanWalletDescription(tx.description) ||
    cleanWalletDescription(tx.rawDescription) ||
    tx.contractTitle ||
    tx.jobTitle ||
    ""
  );
}

function withdrawStatusLabel(status: string) {
  const map: Record<string, string> = {
    PENDING: "Đang chờ",
    APPROVED: "Đã duyệt",
    REJECTED: "Bị từ chối",
  };
  return map[status?.toUpperCase()] ?? status;
}

function transactionStatusLabel(status?: string) {
  if (!status) return "";
  const map: Record<string, string> = {
    SUCCESS: "Thành công",
    POSTED: "Thành công",
    PENDING: "Đang xử lý",
    FAILED: "Thất bại",
    CANCELLED: "Đã huỷ",
  };
  return map[status.toUpperCase()] ?? status;
}

function parseMilestoneOperationContext(tx: WalletTransaction) {
  const operationKey = tx.operationKey || "";
  const match = operationKey.match(
    /^MILESTONE_ESCROW_(?:DEPOSIT|RELEASE|REFUND|SETTLEMENT_PAYOUT|SETTLEMENT_REFUND):(\d+):(\d+)/i,
  );
  if (match) {
    return {
      contractId: Number(match[1]),
      milestoneId: Number(match[2]),
    };
  }
  if (
    String(tx.referenceType || "").toUpperCase() === "MILESTONE" &&
    tx.contractId &&
    tx.referenceId
  ) {
    return {
      contractId: Number(tx.contractId),
      milestoneId: Number(tx.referenceId),
    };
  }
  return null;
}

function parseContractOperationContext(tx: WalletTransaction) {
  const operationKey = tx.operationKey || "";
  const type = String(tx.transactionType || "").toUpperCase();
  const referenceType = String(tx.referenceType || "").toUpperCase();
  const contractHoldMatch = operationKey.match(/^CONTRACT_DEPOSIT_HOLD:/i);
  if (
    contractHoldMatch &&
    referenceType === "CONTRACT_DEPOSIT" &&
    tx.referenceId
  ) {
    return { contractId: Number(tx.referenceId) };
  }
  if (
    type === "EXPERT_CONTRACT_DEPOSIT_HOLD" &&
    referenceType === "CONTRACT_DEPOSIT" &&
    tx.referenceId
  ) {
    return { contractId: Number(tx.referenceId) };
  }
  return null;
}

function parseDisputeOperationId(tx: WalletTransaction) {
  const operationKey = tx.operationKey || "";
  const match = operationKey.match(/^DISPUTE_SETTLEMENT:(\d+)/i);
  if (match) return Number(match[1]);
  if (
    String(tx.referenceType || "").toUpperCase() === "DISPUTE" &&
    tx.referenceId
  ) {
    return Number(tx.referenceId);
  }
  return null;
}

function needsContractContext(tx: WalletTransaction) {
  const text =
    `${tx.title || ""} ${tx.description || ""} ${tx.rawDescription || ""}`.toLowerCase();
  const type = String(tx.transactionType || "").toUpperCase();
  const isMilestoneWalletTx =
    text.includes("deposit milestone escrow") ||
    text.includes("milestone approved payout") ||
    text.includes("release approved milestone escrow") ||
    text.includes("review sla auto-approval escrow release") ||
    text.includes("review sla auto-approval payout") ||
    text.includes("immediate termination milestone refund") ||
    text.includes("dispute business refund") ||
    text.includes("dispute expert payout") ||
    text.includes("dispute settlement debit") ||
    text.includes("expert contract deposit") ||
    type === "EXPERT_CONTRACT_DEPOSIT_HOLD" ||
    type === "EXPERT_CONTRACT_DEPOSIT_REFUND" ||
    type.startsWith("MILESTONE_ESCROW_");

  if (!isMilestoneWalletTx) return false;
  return (
    !tx.businessName ||
    !tx.expertName ||
    !tx.contractTitle ||
    !tx.milestoneNumber
  );
}

async function enrichWalletTransactions(
  transactions: WalletTransaction[],
): Promise<WalletTransaction[]> {
  const contextByIndex = new Map<
    number,
    { contractId: number; milestoneId?: number }
  >();
  transactions.forEach((tx, index) => {
    if (!needsContractContext(tx)) return;
    const context =
      parseMilestoneOperationContext(tx) || parseContractOperationContext(tx);
    if (context) contextByIndex.set(index, context);
  });

  const disputeRequests = transactions
    .map((tx, index) => ({
      index,
      disputeId: needsContractContext(tx) ? parseDisputeOperationId(tx) : null,
    }))
    .filter((item): item is { index: number; disputeId: number } =>
      Number.isFinite(item.disputeId),
    );

  const disputeByIndex = new Map<number, Dispute | null>();
  await Promise.all(
    disputeRequests.map(async ({ index, disputeId }) => {
      const dispute = await disputeApi.get(disputeId).catch(() => null);
      disputeByIndex.set(index, dispute);
      if (dispute?.contractId) {
        contextByIndex.set(index, {
          contractId: Number(dispute.contractId),
          milestoneId: dispute.milestoneId
            ? Number(dispute.milestoneId)
            : undefined,
        });
      }
    }),
  );

  const contractIds = [
    ...new Set([...contextByIndex.values()].map((item) => item.contractId)),
  ];
  if (contractIds.length === 0) return transactions;

  const contextByContract = new Map<
    number,
    {
      contract: Contract | null;
      milestones: Milestone[];
      business: BusinessProfile | null;
      expert: ExpertProfile | null;
    }
  >();

  await Promise.all(
    contractIds.map(async (contractId) => {
      const [contract, milestones] = await Promise.all([
        contractApi.getContract(contractId).catch(() => null),
        contractApi.listMilestones(contractId).catch(() => [] as Milestone[]),
      ]);
      const [business, expert] = await Promise.all([
        contract?.businessId
          ? profileApi.getBusinessById(contract.businessId).catch(() => null)
          : Promise.resolve(null),
        contract?.expertId
          ? profileApi.getExpertById(contract.expertId).catch(() => null)
          : Promise.resolve(null),
      ]);
      contextByContract.set(contractId, {
        contract,
        milestones,
        business,
        expert,
      });
    }),
  );

  return transactions.map((tx, index) => {
    if (!needsContractContext(tx)) return tx;
    const context = contextByIndex.get(index);
    if (!context) return tx;
    const data = contextByContract.get(context.contractId);
    if (!data) return tx;

    const milestone = data.milestones.find((item) => {
      const jobMilestoneId = (item as Milestone & { jobMilestoneId?: number })
        .jobMilestoneId;
      return (
        item.milestoneId === context.milestoneId ||
        jobMilestoneId === context.milestoneId
      );
    });
    const dispute = disputeByIndex.get(index);

    return {
      ...tx,
      contractId: tx.contractId ?? context.contractId,
      contractTitle:
        tx.contractTitle ||
        data.contract?.contractTitle ||
        data.contract?.title ||
        dispute?.jobTitle ||
        undefined,
      businessName:
        tx.businessName ||
        data.contract?.businessName ||
        data.business?.companyName,
      expertName:
        tx.expertName ||
        data.contract?.expertName ||
        data.expert?.fullName ||
        data.expert?.title,
      milestoneNumber: tx.milestoneNumber ?? milestone?.orderIndex,
      milestoneName: tx.milestoneName || milestone?.milestoneName,
    };
  });
}

// ── WithdrawalModal ───────────────────────────────────────────────────────────

function WithdrawalModal({
  open,
  onClose,
  onSuccess,
  wallet,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  wallet: SystemWallet | null;
}) {
  const [form, setForm] = useState({
    amount: "",
    bankName: "",
    bankAccountNumber: "",
    bankAccountHolder: "",
  });
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{
    tone: "info" | "success" | "warning" | "danger";
    msg: string;
  } | null>(null);
  const [result, setResult] =
    useState<PaymentActionResponse<WithdrawalRequest> | null>(null);

  const reset = () => {
    setForm({
      amount: "",
      bankName: "",
      bankAccountNumber: "",
      bankAccountHolder: "",
    });
    setNotice(null);
    setResult(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const submit = async () => {
    const amount = Number(form.amount);
    if (!amount || amount <= 0) {
      setNotice({ tone: "danger", msg: "Vui lòng nhập số tiền hợp lệ." });
      return;
    }
    if (
      !form.bankName.trim() ||
      !form.bankAccountNumber.trim() ||
      !form.bankAccountHolder.trim()
    ) {
      setNotice({
        tone: "danger",
        msg: "Vui lòng diền dầy dủ thông tin ngân hàng.",
      });
      return;
    }
    if (wallet && amount > wallet.availableBalance) {
      setNotice({
        tone: "danger",
        msg: `Số dư khả dụng không dủ. Tối da: ${formatCurrency(wallet.availableBalance)}`,
      });
      return;
    }

    setLoading(true);
    setNotice(null);
    try {
      const res = await withdrawalApi.create({
        amount,
        bankName: form.bankName.trim(),
        bankAccountNumber: form.bankAccountNumber.trim(),
        bankAccountHolder: form.bankAccountHolder.trim(),
      });
      setResult(res);
      if (res.completed) {
        setNotice({
          tone: "success",
          msg: "Yêu cầu rút tiền dã dược gửi. Admin sẽ xử lý và chuyển khoản thủ công.",
        });
        onSuccess();
      } else if (res.needTopup) {
        setNotice({
          tone: "warning",
          msg: `Số dư không dủ. Cần thêm ${formatCurrency(res.missingAmount ?? 0)} dể thực hiện.`,
        });
      }
    } catch (err) {
      setNotice({ tone: "danger", msg: getApiErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Yêu cầu rút tiền"
      description="Số tiền sẽ được Admin kiểm duyệt và thanh toán cho tài khoản ngân hàng của bạn."
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>
            Hủy
          </Button>
          <Button
            onClick={submit}
            loading={loading}
            disabled={loading || !!result?.completed}
          >
            <Send className="h-4 w-4" />
            Gửi yêu cầu
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        {notice && <Notice tone={notice.tone} title={notice.msg} />}

        {wallet && (
          <div className="rounded-2xl bg-gradient-to-br from-brand-50 to-indigo-50 p-4 ring-1 ring-brand-100">
            <p className="text-xs font-bold text-brand-600 uppercase tracking-wide">
              Số dư khả dụng
            </p>
            <p className="mt-1 text-2xl font-black text-brand-700">
              {formatCurrency(wallet.availableBalance)}
            </p>
          </div>
        )}

        <Field label="Số tiền rút (VND)">
          <Input
            type="text"
            placeholder="Nhập số tiền..."
            value={
              form.amount ? Number(form.amount).toLocaleString("vi-VN") : ""
            }
            onChange={(e) => {
              const rawValue = e.target.value.replace(/\D/g, "");
              setForm((v) => ({ ...v, amount: rawValue }));
            }}
          />
        </Field>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Tên ngân hàng">
            <Input
              placeholder="VD: Vietcombank, Techcombank..."
              value={form.bankName}
              onChange={(e) =>
                setForm((v) => ({ ...v, bankName: e.target.value }))
              }
            />
          </Field>
          <Field label="Số tài khoản">
            <Input
              placeholder="Số tài khoản ngân hàng"
              value={form.bankAccountNumber}
              onChange={(e) =>
                setForm((v) => ({ ...v, bankAccountNumber: e.target.value }))
              }
            />
          </Field>
        </div>

        <Field label="Chủ tài khoản">
          <Input
            placeholder="Họ tên chủ tài khoản (in hoa)"
            value={form.bankAccountHolder}
            onChange={(e) =>
              setForm((v) => ({ ...v, bankAccountHolder: e.target.value }))
            }
          />
        </Field>

        <Notice tone="info" title="Lưu ý về rút tiền">
          Chỉ có thể rút từ số dư khả dụng.
        </Notice>
      </div>
    </Modal>
  );
}

// ── WalletPage ────────────────────────────────────────────────────────────────

export function WalletPage() {
  const session = useSession();
  const [wallet, setWallet] = useState<SystemWallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"transactions" | "withdrawals">(
    "transactions",
  );
  const [transactionPage, setTransactionPage] = useState(1);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [w, txs, wdrs] = await Promise.allSettled([
        walletApi.current(),
        walletTransactionApi.list(),
        withdrawalApi.listMy(),
      ]);
      if (w.status === "fulfilled") setWallet(w.value);
      if (txs.status === "fulfilled") {
        setTransactions(await enrichWalletTransactions(txs.value));
        setTransactionPage(1);
      }
      if (wdrs.status === "fulfilled") setWithdrawals(wdrs.value);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
    window.addEventListener("aitasker:reload-wallet", load);
    return () => window.removeEventListener("aitasker:reload-wallet", load);
  }, [load]);

  const openTopup = () =>
    window.dispatchEvent(new Event("aitasker:open-wallet-topup"));

  if (!session) return null;

  const role = session.role;
  const isExternalRole = role === "BUSINESS" || role === "EXPERT";
  const transactionTotalPages = Math.max(
    1,
    Math.ceil(transactions.length / TRANSACTIONS_PER_PAGE),
  );
  const safeTransactionPage = Math.min(transactionPage, transactionTotalPages);
  const pagedTransactions = transactions.slice(
    (safeTransactionPage - 1) * TRANSACTIONS_PER_PAGE,
    safeTransactionPage * TRANSACTIONS_PER_PAGE,
  );

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          eyebrow="Ví & Thanh toán"
          title="Quản lý ví"
          description="Theo dõi số dư, nạp tiền qua PayOS, rút tiền và xem toàn bộ lịch sử giao dịch ví."
        />
      </div>

      {/* Balance Overview */}
      {wallet && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            label="Số dư khả dụng"
            value={formatCurrency(wallet.availableBalance)}
            helper="Có thể sử dụng ngay"
            icon={<Wallet className="h-5 w-5" />}
            tone="brand"
          />
          <MetricCard
            label={role === "EXPERT" ? "Đang ký quỹ" : "Quỹ hợp đồng"}
            value={formatCurrency(wallet.escrowBalance)}
            helper={
              role === "EXPERT" ? "Chờ nghiệm thu" : "Đang giữ cho hợp đồng"
            }
            icon={<Shield className="h-5 w-5" />}
            tone="amber"
          />
          <MetricCard
            label="Đang chờ rút"
            value={formatCurrency(wallet.holdingBalance)}
            helper="Yêu cầu rút đang xử lý"
            icon={<Clock className="h-5 w-5" />}
            tone="coral"
          />
        </div>
      )}

      {/* Total balance banner */}
      {wallet && (
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-4 bg-gradient-to-br from-brand-600 via-indigo-600 to-violet-700 p-6 text-white sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-100">
                Tổng tài sản ví
              </p>
              <p className="mt-1 font-display text-4xl font-black tracking-tight">
                {formatCurrency(wallet.currentBalance)}
              </p>
              <p className="mt-2 text-xs font-semibold text-blue-200">
                Bao gồm khả dụng, escrow/ký quỹ và chờ rút ·{" "}
                {wallet.currency}
              </p>
            </div>
            <div className="flex gap-3">
              {isExternalRole && (
                <>
                  <button
                    type="button"
                    onClick={openTopup}
                    className="flex items-center gap-2 rounded-2xl border border-white/25 bg-white/15 px-4 py-2.5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/25"
                  >
                    <TrendingUp className="h-4 w-4" />
                    Nạp tiền
                  </button>
                  <button
                    type="button"
                    onClick={() => setWithdrawOpen(true)}
                    className="flex items-center gap-2 rounded-2xl border border-white/25 bg-white/15 px-4 py-2.5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/25"
                  >
                    <TrendingDown className="h-4 w-4" />
                    Rút tiền
                  </button>
                </>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Transactions & Withdrawals */}
      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <SectionHeading
            title="Lịch sử"
            action={
              <div className="flex items-center gap-3">
                <Tabs
                  tabs={[
                    {
                      id: "transactions",
                      label: "Giao dịch",
                      count: transactions.length,
                    },
                    {
                      id: "withdrawals",
                      label: "Rút tiền",
                      count: withdrawals.length,
                    },
                  ]}
                  active={tab}
                  onChange={(id) => setTab(id as typeof tab)}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={load}
                  title="Làm mới"
                >
                  <RefreshCw
                    className={cn("h-4 w-4", loading && "animate-spin")}
                  />
                </Button>
              </div>
            }
          />
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm font-semibold text-slate-400">
            Đang tải dữ liệu...
          </div>
        ) : tab === "transactions" ? (
          transactions.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="Chưa có giao dịch nào"
                description="Các giao dịch nạp tiền, mua gói, dặt cọc hợp đồng và rút tiền sẽ xuất hiện tại dây."
                action={
                  isExternalRole ? (
                    <Button onClick={openTopup}>
                      <TrendingUp className="h-4 w-4" />
                      Nạp tiền ngay
                    </Button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <>
            <div className="overflow-x-auto divide-y divide-slate-50">
              {/* Header */}
              <div className="grid min-w-[720px] grid-cols-[auto_minmax(260px,1fr)_auto_auto_auto] gap-3 bg-slate-50 px-5 py-3 text-xs font-extrabold uppercase tracking-wide text-slate-400">
                <span className="w-9" />
                <span>Nội dung giao dịch</span>
                <span className="text-right">Số tiền</span>
                <span className="w-24 text-center">Trạng thái</span>
                <span className="w-28 text-right">Thời gian</span>
              </div>
              {pagedTransactions.map((tx) => {
                const isCredit =
                  tx.direction === "CREDIT" || tx.direction === "RELEASE";
                return (
                  <div
                    key={tx.id}
                    className="grid min-w-[720px] grid-cols-[auto_minmax(260px,1fr)_auto_auto_auto] items-center gap-3 px-5 py-4 transition hover:bg-slate-50/50"
                  >
                    <span
                      className={cn(
                        "grid h-11 w-11 place-items-center rounded-2xl",
                        isCredit
                          ? "bg-mint-50 text-mint-600"
                          : "bg-coral-50 text-coral-600",
                      )}
                    >
                      {txIcon(tx.transactionType)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-base font-extrabold leading-snug text-ink">
                        {txDisplayLabel(tx, role)}
                      </p>
                      {txDisplayDescription(tx, role) && (
                        <p className="mt-1 max-w-4xl text-sm font-medium leading-relaxed text-slate-700">
                          {txDisplayDescription(tx, role)}
                        </p>
                      )}
                      {txContractContextLabel(tx) && (
                        <p className="mt-1.5 text-sm font-semibold text-slate-500">
                          {txContractContextLabel(tx)}
                        </p>
                      )}
                      <p className="mt-1.5 text-xs font-semibold text-slate-500">
                        {tx.actorRole && `Vai trò: ${tx.actorRole}`}
                        {tx.counterpartyName && ` · Đối tác: ${tx.counterpartyName}${tx.counterpartyRole ? ` (${tx.counterpartyRole})` : ""}`}
                        {tx.balanceType && ` · Số dư: ${tx.balanceType}`}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-400">
                        Trước/Sau: {formatCurrency(tx.availableBalanceBefore ?? tx.balanceBefore)} / {formatCurrency(tx.availableBalanceAfter ?? tx.balanceAfter)}
                        {tx.referenceType && ` · Tham chiếu: ${tx.referenceType}${tx.referenceId ? ` #${tx.referenceId}` : ""}`}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "whitespace-nowrap text-right text-base font-black",
                        isCredit ? "text-emerald-600" : "text-rose-600",
                      )}
                    >
                      {isCredit ? "+" : "-"}
                      {formatCurrency(tx.amount)}
                    </span>
                    <span className="w-24 text-center">
                      <StatusBadge status={transactionStatusLabel(tx.status)} />
                    </span>
                    <span className="w-28 text-right text-sm font-bold text-slate-600">
                      <SplitDateTime value={tx.createdAt} />
                    </span>
                  </div>
                );
              })}
            </div>
            {transactionTotalPages > 1 && (
              <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-semibold text-slate-500">
                  Hiển thị {pagedTransactions.length} / {transactions.length} giao dịch
                </p>
                <div className="flex items-center gap-3">
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setTransactionPage((page) => Math.max(1, page - 1))
                    }
                    disabled={safeTransactionPage <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Trước
                  </Button>
                  <span className="min-w-24 text-center text-sm font-extrabold text-slate-600">
                    Trang {safeTransactionPage} / {transactionTotalPages}
                  </span>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setTransactionPage((page) =>
                        Math.min(transactionTotalPages, page + 1),
                      )
                    }
                    disabled={safeTransactionPage >= transactionTotalPages}
                  >
                    Sau
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            </>
          )
        ) : withdrawals.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="Chưa có yêu cầu rút tiền"
              description="Các yêu cầu rút tiền của bạn sẽ xuất hiện tại dây sau khi bạn tạo."
              action={
                isExternalRole ? (
                  <Button onClick={() => setWithdrawOpen(true)}>
                    <TrendingDown className="h-4 w-4" />
                    Tạo yêu cầu rút tiền
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto divide-y divide-slate-50">
            {/* Header */}
            <div className="grid min-w-[700px] grid-cols-[minmax(260px,1fr)_auto_auto_auto_auto] gap-3 bg-slate-50 px-5 py-3 text-xs font-extrabold uppercase tracking-wide text-slate-400">
              <span>Ngân hàng</span>
              <span className="text-right">Số tiền</span>
              <span className="w-24 text-center">Trạng thái</span>
              <span className="w-28 text-right">Ngày tạo</span>
              <span className="w-28 text-right">Xử lý lúc</span>
            </div>
            {withdrawals.map((wr) => (
              <div
                key={wr.withdrawalId}
                className="grid min-w-[700px] grid-cols-[minmax(260px,1fr)_auto_auto_auto_auto] items-center gap-3 px-5 py-4 transition hover:bg-slate-50/50"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-600">
                    <Building className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-base font-extrabold leading-snug text-ink">
                      {wr.bankName}
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-600">
                      {maskSensitiveValue(wr.bankAccountNumber)}
                    </p>
                  </div>
                </div>
                <span className="whitespace-nowrap text-right text-base font-black text-ink">
                  {formatCurrency(wr.amount)}
                </span>
                <span className="w-24 text-center">
                  <StatusBadge status={withdrawStatusLabel(wr.status)} />
                </span>
                <span className="w-28 text-right text-sm font-bold text-slate-600">
                  <SplitDateTime value={wr.requestedAt ?? wr.createdAt} />
                </span>
                <span className="w-28 text-right text-sm font-bold text-slate-600">
                  <SplitDateTime value={wr.reviewedAt} />
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Withdrawal Modal */}
      <WithdrawalModal
        open={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        onSuccess={load}
        wallet={wallet}
      />
    </div>
  );
}

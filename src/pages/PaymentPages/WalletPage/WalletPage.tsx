import {
  ArrowDownLeft,
  ArrowUpRight,
  Building,
  Clock,
  Lock,
  RefreshCw,
  Send,
  Shield,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  getApiErrorMessage,
  walletApi,
  walletTransactionApi,
  withdrawalApi,
} from "../../../services";
import { useSession } from "../../../context/sessionContext";
import { cn, formatCurrency } from "../../../lib/utils";
import type {
  PaymentActionResponse,
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

function txTypeLabel(type: WalletTransaction["transactionType"]) {
  const map: Record<WalletTransaction["transactionType"], string> = {
    TOPUP: "Nạp tiền",
    MEMBERSHIP_PURCHASE: "Mua gói thành viên",
    CREDIT_PURCHASE: "Mua credits",
    CONTRACT_SECURITY_DEPOSIT_HOLD: "Đặt cọc hợp đồng",
    DEPOSIT_REFUND: "Hoàn cọc",
    WITHDRAW_HOLD: "Yêu cầu rút tiền",
    WITHDRAW_APPROVED: "Rút tiền thành công",
    WITHDRAW_REJECTED: "Rút tiền bị từ chối",
  };
  return map[type] ?? type;
}

function txIcon(type: WalletTransaction["transactionType"]) {
  if (
    type === "TOPUP" ||
    type === "DEPOSIT_REFUND" ||
    type === "WITHDRAW_REJECTED"
  )
    return <ArrowDownLeft className="h-4 w-4" />;
  return <ArrowUpRight className="h-4 w-4" />;
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
              form.amount
                ? Number(form.amount).toLocaleString("vi-VN")
                : ""
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
      if (txs.status === "fulfilled") setTransactions(txs.value);
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
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Số dư khả dụng"
            value={formatCurrency(wallet.availableBalance)}
            helper="Có thể sử dụng ngay"
            icon={<Wallet className="h-5 w-5" />}
            tone="brand"
          />
          <MetricCard
            label={role === "EXPERT" ? "Đang ký quỹ / escrow" : "Quỹ hợp đồng"}
            value={formatCurrency(wallet.escrowBalance)}
            helper={
              role === "EXPERT"
                ? "Tiền đã hold, không còn là số dư khả dụng"
                : "Đang giữ cho hợp đồng"
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
          <MetricCard
            label="Tranh chấp"
            value={formatCurrency(wallet.disputedBalance)}
            helper="Đang bị khóa do dispute"
            icon={<Lock className="h-5 w-5" />}
            tone="coral"
          />
        </div>
      )}

      {/* Total balance banner */}
      {wallet && (
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-4 bg-gradient-to-br from-brand-600 via-indigo-600 to-violet-700 p-6 text-white sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-100">Tổng tài sản ví</p>
              <p className="mt-1 font-display text-4xl font-black tracking-tight">
                {formatCurrency(wallet.currentBalance)}
              </p>
              <p className="mt-2 text-xs font-semibold text-blue-200">
                Bao gồm khả dụng, escrow/ký quỹ, chờ rút và tranh chấp · {wallet.currency}
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
            <div className="divide-y divide-slate-50">
              {/* Header */}
              <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 bg-slate-50 px-5 py-3 text-xs font-extrabold uppercase tracking-wide text-slate-400">
                <span className="w-9" />
                <span>Loại giao dịch</span>
                <span className="text-right">Số tiền</span>
                <span className="w-24 text-center">Trạng thái</span>
                <span className="w-28 text-right">Thời gian</span>
              </div>
              {transactions.map((tx) => {
                const isCredit =
                  tx.direction === "CREDIT" || tx.direction === "RELEASE";
                return (
                  <div
                    key={tx.id}
                    className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-3 px-5 py-4 transition hover:bg-slate-50/50"
                  >
                    <span
                      className={cn(
                        "grid h-9 w-9 place-items-center rounded-2xl",
                        isCredit
                          ? "bg-mint-50 text-mint-600"
                          : "bg-coral-50 text-coral-600",
                      )}
                    >
                      {txIcon(tx.transactionType)}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-ink">
                        {txTypeLabel(tx.transactionType)}
                      </p>
                      {tx.description && (
                        <p className="mt-0.5 text-xs text-slate-400 line-clamp-1">
                          {tx.description}
                        </p>
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-right text-sm font-extrabold",
                        isCredit ? "text-mint-600" : "text-coral-600",
                      )}
                    >
                      {isCredit ? "+" : "-"}
                      {formatCurrency(tx.amount)}
                    </span>
                    <span className="w-24 text-center">
                      <StatusBadge status={transactionStatusLabel(tx.status)} />
                    </span>
                    <span className="w-28 text-right text-xs font-semibold text-slate-400">
                      <SplitDateTime value={tx.createdAt} />
                    </span>
                  </div>
                );
              })}
            </div>
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
          <div className="divide-y divide-slate-50">
            {/* Header */}
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 bg-slate-50 px-5 py-3 text-xs font-extrabold uppercase tracking-wide text-slate-400">
              <span>Ngân hàng</span>
              <span className="text-right">Số tiền</span>
              <span className="w-24 text-center">Trạng thái</span>
              <span className="w-28 text-right">Ngày tạo</span>
              <span className="w-28 text-right">Xử lý lúc</span>
            </div>
            {withdrawals.map((wr) => (
              <div
                key={wr.withdrawalId}
                className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-3 px-5 py-4 transition hover:bg-slate-50/50"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-2xl bg-slate-50 text-slate-500">
                    <Building className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-ink">{wr.bankName}</p>
                    <p className="text-xs text-slate-400">
                      {wr.bankAccountNumber} · {wr.bankAccountHolder}
                    </p>
                  </div>
                </div>
                <span className="text-right text-sm font-extrabold text-ink">
                  {formatCurrency(wr.amount)}
                </span>
                <span className="w-24 text-center">
                  <StatusBadge status={withdrawStatusLabel(wr.status)} />
                </span>
                <span className="w-28 text-right text-xs font-semibold text-slate-400">
                  <SplitDateTime value={wr.requestedAt ?? wr.createdAt} />
                </span>
                <span className="w-28 text-right text-xs font-semibold text-slate-400">
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

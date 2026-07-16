import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ShieldAlert,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { adminApi } from "../../../lib/api";
import { formatCurrency, formatDateTime, walletTypeLabel } from "../../../lib/utils";
import {
  Badge,
  Button,
  Card,
  PageHeader,
  SectionHeading,
} from "../../../components/ui";
import { AdminMetric, WalletFact } from "../AdminPages.shared";
import type { AdminAccount, SystemWallet, WalletTransaction } from "../../../types";

export function SystemWalletPage() {
  const [wallet, setWallet] = useState<SystemWallet | null>(null);
  const [history, setHistory] = useState<WalletTransaction[]>([]);
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const historyPageSize = 5;

  const load = useCallback(async (sync = false) => {
    setLoading(true);
    try {
      const [w, h, accs] = await Promise.all([
        sync ? adminApi.syncSystemWallet() : adminApi.getSystemWallet(),
        adminApi.listPlatformWalletTransactions(),
        adminApi.listAccounts(),
      ]);
      setWallet(w);
      setHistory(h);
      setAccounts(accs);
      setHistoryPage(1);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  const historyPageCount = Math.max(1, Math.ceil(history.length / historyPageSize));
  const visibleHistory = useMemo(
    () => history.slice((historyPage - 1) * historyPageSize, historyPage * historyPageSize),
    [history, historyPage],
  );

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          title="Quản lý ví"
          description="Dữ liệu được cập nhật tự động từ hệ thống mỗi khi có giao dịch hoặc biến động tranh chấp."
          actions={
            <Button onClick={() => load(true)} disabled={loading}>
              <RefreshCw className="h-4 w-4" /> Đồng bộ
            </Button>
          }
        />
      </div>
      {wallet && (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <AdminMetric
              label="Tổng số dư"
              value={formatCurrency(wallet.currentBalance)}
              icon={<WalletCards className="h-5 w-5" />}
              tone="mint"
            />
            <AdminMetric
              label="Số dư ký quỹ"
              value={formatCurrency(wallet.escrowBalance)}
              icon={<ShieldAlert className="h-5 w-5" />}
              tone="amber"
            />
            <AdminMetric
              label="Tổng doanh thu"
              value={formatCurrency(wallet.totalRevenue)}
              icon={<TrendingUp className="h-5 w-5" />}
            />
            <AdminMetric
              label="Số dư tranh chấp"
              value={formatCurrency(wallet.disputedBalance)}
              icon={<ShieldAlert className="h-5 w-5" />}
              tone="coral"
            />
          </div>
          <div className="grid gap-6">
            <Card className="p-6">
              <SectionHeading
                title="Thông tin tổng quan"
                description="Các số liệu chung của sổ cái."
              />
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <WalletFact label="Loại ví" value={walletTypeLabel(wallet.walletType)} />
                <WalletFact
                  label="Khả dụng"
                  value={formatCurrency(wallet.availableBalance)}
                  tone="mint"
                />
                <WalletFact
                  label="Doanh nghiệp ký quỹ"
                  value={wallet.depositedBusinessCount}
                  tone="brand"
                />
                <WalletFact
                  label="Giao dịch thành công"
                  value={wallet.successfulDepositCount}
                  tone="mint"
                />
              </div>
            </Card>

            <Card className="p-6">
              <SectionHeading
                title="Lịch sử giao dịch nền tảng"
                description="Theo dõi giao dịch ví nền tảng, mục đích thanh toán và đối tượng liên quan."
              />
              <div className="mt-5 overflow-hidden rounded-2xl border border-slate-100">
                <div className="hidden gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4 text-xs font-extrabold uppercase text-slate-400 md:grid md:grid-cols-[1fr_180px_160px] md:items-center">
                  <span>Mục đích và dòng tiền</span>
                  <span>Người nhận / tài khoản</span>
                  <span className="md:text-right">Số tiền</span>
                </div>

                {history.length === 0 ? (
                  <div className="px-5 py-10 text-center text-sm font-bold text-slate-400">
                    Chưa có lịch sử giao dịch nền tảng.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {visibleHistory.map((t) => {
                      const transactionId = t.transactionId ?? t.id;
                      const isPositive = walletTransactionDisplayIsPositive(t);

                      return (
                        <div
                          key={transactionId}
                          className="grid gap-3 px-5 py-4 transition hover:bg-slate-50/70 md:grid-cols-[minmax(0,1fr)_180px_160px] md:items-center"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge
                                tone={walletTransactionBadgeTone(
                                  t.transactionType,
                                )}
                              >
                                {walletTransactionTypeLabel(t.transactionType)}
                              </Badge>
                              <Badge tone={walletTransactionStatusTone(t.status)}>
                                {walletTransactionStatusLabel(t.status)}
                              </Badge>
                              <span className="text-xs font-bold text-slate-400">
                                {formatDateTime(t.createdAt)}
                              </span>
                            </div>

                            <p className="mt-2 truncate text-base font-extrabold text-ink">
                              {walletTransactionPurposeTitle(t)}
                            </p>
                            <p className="mt-1 truncate text-xs text-slate-400">
                              {walletTransactionReadableDescription(t, accounts)}
                            </p>
                          </div>

                          <div className="grid gap-1 text-sm">
                            <span className="text-xs font-bold text-slate-400">
                              {walletTransactionPartyLabel(t)}
                            </span>
                            <span className="font-extrabold text-slate-700">
                              {walletTransactionPartyName(t, accounts)}
                            </span>
                            <span className="text-xs font-bold text-slate-400">
                              {walletTransactionBalanceLabel(t.balanceType)}
                            </span>
                          </div>

                          <div className="md:text-right">
                            <div
                              className={
                                isPositive
                                  ? "text-xl font-black text-mint-600"
                                  : "text-xl font-black text-brand-600"
                              }
                            >
                              {isPositive ? "+" : "-"}
                              {formatCurrency(t.amount)}
                            </div>
                            <div className="mt-1 text-xs font-bold text-slate-400">
                              {walletTransactionDisplayDirectionLabel(t)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div className="sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-white/95 px-5 py-3 shadow-soft backdrop-blur-xl">
                      <span className="text-xs font-bold text-slate-400">
                        Hiển thị {(historyPage - 1) * historyPageSize + 1}–{Math.min(historyPage * historyPageSize, history.length)} trong {history.length} giao dịch
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setHistoryPage((page) => Math.max(1, page - 1))}
                          disabled={historyPage === 1}
                          aria-label="Trang trước"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="min-w-20 text-center text-xs font-extrabold text-slate-500">
                          Trang {historyPage}/{historyPageCount}
                        </span>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setHistoryPage((page) => Math.min(historyPageCount, page + 1))}
                          disabled={historyPage === historyPageCount}
                          aria-label="Trang sau"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function walletTransactionTypeLabel(type?: string) {
  const labels: Record<string, string> = {
    TOPUP: "Nạp ví",
    MEMBERSHIP_PURCHASE: "Mua gói",
    CREDIT_PURCHASE: "Mua lượt",
    CONTRACT_SECURITY_DEPOSIT_HOLD: "Ký quỹ hợp đồng",
    DEPOSIT_REFUND: "Hoàn ký quỹ",
    WITHDRAW_HOLD: "Giữ tiền rút",
    WITHDRAW_APPROVED: "Duyệt rút tiền",
    WITHDRAW_REJECTED: "Từ chối rút tiền",
  };
  return labels[type ?? ""] ?? walletTransactionTypeFallback(type);
}

function walletTransactionTypeFallback(type?: string) {
  const labels: Record<string, string> = {
    EXPERT_CONTRACT_DEPOSIT_REFUND: "Hoàn ký quỹ cho chuyên gia",
    CONTRACT_SECURITY_DEPOSIT_REFUND: "Hoàn ký quỹ hợp đồng",
    MILESTONE_ESCROW_RELEASE: "Giải ngân theo giai đoạn",
    MILESTONE_ESCROW_DEPOSIT: "Ký quỹ theo giai đoạn",
    "MILESTONE ESCROW DEPOSIT": "Ký quỹ theo giai đoạn",
    "MILESTONE APPROVED PAYOUT": "Giải ngân giai đoạn đã duyệt",
    EXPERT_CONTRACT_DEPOSIT_HOLD: "Ký quỹ hợp đồng chuyên gia",
    "EXPERT CONTRACT DEPOSIT HOLD": "Ký quỹ hợp đồng chuyên gia",
    IMMEDIATE_TERMINATION_PENALTY: "Phạt chấm dứt hợp đồng ngay",
    "IMMEDIATE TERMINATION PENALTY": "Phạt chấm dứt hợp đồng ngay",
    MILESTONE_ESCROW_REFUND: "Hoàn ký quỹ theo giai đoạn",
    "MILESTONE ESCROW REFUND": "Hoàn ký quỹ theo giai đoạn",
  };
  const normalizedType = type?.trim().toUpperCase();
  if (normalizedType && labels[normalizedType]) return labels[normalizedType];
  return type
    ? type.toLowerCase().split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ")
    : "Giao dịch";
}

function walletTransactionStatusLabel(status?: string) {
  const labels: Record<string, string> = {
    POSTED: "Đã ghi nhận",
    SUCCESS: "Thành công",
    PENDING: "Đang chờ xử lý",
    FAILED: "Thất bại",
    CANCELLED: "Đã hủy",
  };
  return labels[status ?? ""] ?? "Đã ghi nhận";
}

function walletTransactionBalanceLabel(balanceType?: string) {
  const labels: Record<string, string> = {
    AVAILABLE: "Số dư khả dụng",
    ESCROW: "Số dư ký quỹ",
    HOLDING: "Đang tạm giữ",
    DISPUTE: "Đang tranh chấp",
  };
  return labels[balanceType ?? ""] ?? "Số dư ví";
}

function walletTransactionDirectionLabel(direction?: string) {
  const labels: Record<string, string> = {
    CREDIT: "Cộng tiền",
    DEBIT: "Trừ tiền",
    HOLD: "Tạm giữ",
    RELEASE: "Giải tỏa",
  };
  return labels[direction ?? ""] ?? "Điều chỉnh số dư";
}

function isPlatformRevenueTransaction(tx: WalletTransaction) {
  return tx.transactionType === "MEMBERSHIP_PURCHASE";
}

function walletTransactionDisplayIsPositive(tx: WalletTransaction) {
  return (
    isPlatformRevenueTransaction(tx) ||
    tx.direction === "CREDIT" ||
    tx.direction === "RELEASE"
  );
}

function walletTransactionDisplayDirectionLabel(tx: WalletTransaction) {
  if (isPlatformRevenueTransaction(tx)) return "Cộng doanh thu";
  return walletTransactionDirectionLabel(tx.direction);
}

function walletTransactionBadgeTone(type?: string): "violet" {
  void type;
  return "violet";
}

function walletTransactionStatusTone(status?: string) {
  if (status === "SUCCESS" || status === "POSTED") return "mint";
  if (status === "PENDING") return "amber";
  if (status === "FAILED" || status === "CANCELLED") return "coral";
  return "slate";
}

function walletTransactionActorName(
  tx: WalletTransaction,
  accounts: AdminAccount[],
) {
  if (tx.actorName) return tx.actorName;
  if (!tx.accountId) return "Hệ thống";
  return accounts.find((account) => account.accountId === tx.accountId)?.fullName
    ?? "Tài khoản người dùng";
}

function walletTransactionPartyName(
  tx: WalletTransaction,
  accounts: AdminAccount[],
) {
  if (isPlatformRevenueTransaction(tx)) return "Hệ thống";
  if (tx.direction === "DEBIT" && tx.counterpartyName) return tx.counterpartyName;
  return walletTransactionActorName(tx, accounts);
}

function walletTransactionPartyLabel(tx: WalletTransaction) {
  if (isPlatformRevenueTransaction(tx)) return "Người nhận tiền";
  if (tx.direction === "DEBIT") return "Bên nhận tiền";
  if (tx.direction === "CREDIT" || tx.direction === "RELEASE") return "Người nhận tiền";
  return "Bên liên quan";
}

function walletTransactionPurposeTitle(tx: WalletTransaction) {
  if (tx.transactionType === "EXPERT_CONTRACT_DEPOSIT_REFUND") return "Hoàn ký quỹ cho chuyên gia";
  if (tx.transactionType === "CONTRACT_SECURITY_DEPOSIT_REFUND") return "Hoàn ký quỹ hợp đồng";
  if (tx.transactionType === "MILESTONE_ESCROW_RELEASE") return "Giải ngân theo giai đoạn";
  if (tx.title) return walletTransactionTitleLabel(tx.title);
  if (tx.transactionType === "TOPUP") return "Nạp tiền vào ví";
  if (tx.transactionType === "MEMBERSHIP_PURCHASE") {
    return `Mua gói ${tx.packageName ?? "thành viên"}`;
  }
  if (tx.transactionType === "CREDIT_PURCHASE") return "Mua lượt sử dụng";
  if (tx.transactionType === "CONTRACT_SECURITY_DEPOSIT_HOLD") {
    return `Ký quỹ hợp đồng ${tx.contractTitle ?? ""}`.trim();
  }
  if (tx.transactionType === "DEPOSIT_REFUND") {
    return `Hoàn ký quỹ hợp đồng ${tx.contractTitle ?? ""}`.trim();
  }
  if (tx.transactionType === "WITHDRAW_HOLD") return "Tạo yêu cầu rút tiền";
  if (tx.transactionType === "WITHDRAW_APPROVED") return "Rút tiền đã được duyệt";
  if (tx.transactionType === "WITHDRAW_REJECTED") return "Rút tiền bị từ chối";
  return walletTransactionTypeLabel(tx.transactionType);
}

function walletTransactionReadableDescription(
  tx: WalletTransaction,
  accounts: AdminAccount[],
) {
  const recipient = walletTransactionPartyName(tx, accounts);
  const amount = formatCurrency(tx.amount);
  const balance = walletTransactionBalanceLabel(tx.balanceType).toLowerCase();
  const direction = walletTransactionDisplayDirectionLabel(tx).toLowerCase();
  const purpose = tx.contractTitle
    ? `cho hợp đồng "${tx.contractTitle}"`
    : tx.jobTitle
      ? `cho dự án "${tx.jobTitle}"`
      : tx.milestoneName
        ? `cho giai đoạn "${tx.milestoneName}"`
        : tx.packageName
          ? `để mua gói "${tx.packageName}"`
          : "theo nghiệp vụ nền tảng";

  return `${direction} ${amount} vào ${balance} của ${recipient}, ${purpose}.`;
}

function walletTransactionTitleLabel(title: string) {
  const labels: Record<string, string> = {
    "Milestone Escrow Deposit": "Ký quỹ theo giai đoạn",
    "Milestone Approved Payout": "Giải ngân giai đoạn đã duyệt",
    "Release approved milestone escrow": "Giải tỏa ký quỹ giai đoạn đã duyệt",
    "Refund participant contract deposit": "Hoàn ký quỹ cho người tham gia hợp đồng",
    "Expert Contract Deposit Hold": "Ký quỹ hợp đồng chuyên gia",
    "Immediate Termination Penalty": "Phạt chấm dứt hợp đồng ngay",
    "Milestone Escrow Refund": "Hoàn ký quỹ theo giai đoạn",
    "Ví được cộng tiền": "Tiền được cộng vào ví",
    "Ví được giải tỏa tiền": "Tiền được giải tỏa khỏi ví",
    "Ví bị trừ tiền": "Tiền được trừ khỏi ví",
  };
  return labels[title.trim()] ?? walletTransactionTypeFallback(title);
}

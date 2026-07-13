import {
  RefreshCw,
  ShieldAlert,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../../../lib/api";
import { formatCurrency, formatDateTime } from "../../../lib/utils";
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
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

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
              label="Số dư hiện tại"
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
                <WalletFact label="Loại ví" value={wallet.walletType} />
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
                  <span>Thanh toán cho việc gì</span>
                  <span>Người thực hiện</span>
                  <span className="md:text-right">Số tiền</span>
                </div>

                {history.length === 0 ? (
                  <div className="px-5 py-10 text-center text-sm font-bold text-slate-400">
                    Chưa có lịch sử giao dịch nền tảng.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {history.map((t) => {
                      const transactionId = t.transactionId ?? t.id;
                      const contextItems = walletTransactionContextItems(t);
                      const isPositive =
                        t.direction === "CREDIT" || t.direction === "RELEASE";

                      return (
                        <div
                          key={transactionId}
                          className="grid gap-4 px-5 py-5 transition hover:bg-slate-50/70 md:grid-cols-[1fr_180px_160px] md:items-start"
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
                                {t.status}
                              </Badge>
                              <span className="text-xs font-bold text-slate-400">
                                {formatDateTime(t.createdAt)}
                              </span>
                            </div>

                            <p className="mt-3 text-base font-extrabold text-ink">
                              {walletTransactionPurposeTitle(t)}
                            </p>
                            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                              {walletTransactionPurposeDescription(t)}
                            </p>

                            {contextItems.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {contextItems.map((item) => (
                                  <span
                                    key={item}
                                    className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500 ring-1 ring-inset ring-slate-100"
                                  >
                                    {item}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="grid gap-1 text-sm">
                            <span className="font-extrabold text-slate-700">
                              {walletTransactionActorName(t, accounts)}
                            </span>
                            <span className="text-xs font-bold text-slate-400">
                              {t.balanceType || "BALANCE"}
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
                              {t.direction}
                            </div>
                          </div>
                        </div>
                      );
                    })}
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
  return labels[type ?? ""] ?? type ?? "Giao dịch";
}

function walletTransactionBadgeTone(type?: string) {
  if (type === "TOPUP" || type === "WITHDRAW_APPROVED") return "mint";
  if (type === "CONTRACT_SECURITY_DEPOSIT_HOLD" || type === "DEPOSIT_REFUND") {
    return "amber";
  }
  if (type === "WITHDRAW_REJECTED" || type === "WITHDRAW_HOLD") return "coral";
  if (type === "MEMBERSHIP_PURCHASE" || type === "CREDIT_PURCHASE") {
    return "violet";
  }
  return "slate";
}

function walletTransactionStatusTone(status?: string) {
  if (status === "SUCCESS") return "mint";
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

function walletTransactionPurposeTitle(tx: WalletTransaction) {
  if (tx.title) return tx.title;
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

function walletTransactionPurposeDescription(tx: WalletTransaction) {
  if (tx.description) return tx.description;
  if (tx.rawDescription) return tx.rawDescription;

  const amount = formatCurrency(tx.amount);
  if (tx.transactionType === "TOPUP") {
    return `Người dùng nạp ${amount} vào ví${tx.providerOrderCode ? ` qua mã thanh toán ${tx.providerOrderCode}` : ""}.`;
  }
  if (tx.transactionType === "MEMBERSHIP_PURCHASE") {
    return `Thanh toán ${amount} để mua gói ${tx.packageName ?? "thành viên"}.`;
  }
  if (tx.transactionType === "CREDIT_PURCHASE") {
    return `Thanh toán ${amount} để mua thêm lượt đăng job hoặc lượt nộp proposal.`;
  }
  if (tx.transactionType === "CONTRACT_SECURITY_DEPOSIT_HOLD") {
    return `Doanh nghiệp ký quỹ ${amount} cho hợp đồng${tx.contractTitle ? ` "${tx.contractTitle}"` : ""}.`;
  }
  if (tx.transactionType === "DEPOSIT_REFUND") {
    return `Admin xử lý hoàn ký quỹ ${amount}${tx.contractTitle ? ` cho hợp đồng "${tx.contractTitle}"` : ""}.`;
  }
  if (tx.transactionType === "WITHDRAW_HOLD") {
    return `Hệ thống giữ ${amount} khi người dùng tạo yêu cầu rút tiền.`;
  }
  if (tx.transactionType === "WITHDRAW_APPROVED") {
    return `Admin duyệt rút ${amount} về tài khoản ngân hàng.`;
  }
  if (tx.transactionType === "WITHDRAW_REJECTED") {
    return `Yêu cầu rút ${amount} bị từ chối và tiền được hoàn về ví khả dụng.`;
  }
  return "Giao dịch ví nền tảng được backend ghi nhận.";
}

function walletTransactionContextItems(tx: WalletTransaction) {
  return [
    tx.contractTitle ? `Contract: ${tx.contractTitle}` : null,
    tx.jobTitle ? `Job: ${tx.jobTitle}` : null,
    tx.businessName ? `Doanh nghiệp: ${tx.businessName}` : null,
    tx.expertName ? `Chuyên gia: ${tx.expertName}` : null,
    tx.packageName ? `Gói: ${tx.packageName}` : null,
    tx.withdrawalId ? "Yêu cầu rút tiền" : null,
    tx.providerOrderCode ? "Thanh toán qua PayOS" : null,
    tx.bankName ? `Ngân hàng: ${tx.bankName}` : null,
  ].filter(Boolean) as string[];
}

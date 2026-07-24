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
import {
  formatCurrency,
  formatDateTime,
  walletTypeLabel,
} from "../../../lib/utils";
import {
  Badge,
  Button,
  Card,
  PageHeader,
  SectionHeading,
  Tabs,
} from "../../../components/ui";
import { AdminMetric, WalletFact } from "../AdminPages.shared";
import type {
  AdminAccount,
  SystemWallet,
  WalletTransaction,
} from "../../../types";

// ── Constants ────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 6;
type TabId = "ledger" | "user-activity";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "ledger", label: "Lịch sử ví" },
  { id: "user-activity", label: "Giao dịch nền tảng" },
];

// ── Category filter definitions ──────────────────────────────────────────────────

interface SubTabDef {
  id: string;
  label: string;
  match: (tx: WalletTransaction) => boolean;
}

interface CategoryDef {
  id: string;
  label: string;
  match: (tx: WalletTransaction) => boolean;
  subTabs: SubTabDef[];
}

const TRANSACTION_CATEGORIES: CategoryDef[] = [
  {
    id: "all",
    label: "Tất cả giao dịch",
    match: () => true,
    subTabs: [],
  },
  {
    id: "topup",
    label: "Lịch sử nạp tiền của Chuyên gia/Doanh nghiệp",
    match: (tx) => tx.transactionType === "TOPUP",
    subTabs: [],
  },
  {
    id: "service-revenue",
    label: "Mua gói thành viên / Mua lượt đăng bài/lượt nộp đề xuất",
    match: (tx) =>
      tx.transactionType === "MEMBERSHIP_PURCHASE" ||
      tx.transactionType === "CREDIT_PURCHASE",
    subTabs: [
      {
        id: "purchase",
        label: "Mua gói thành viên",
        match: (tx) =>
          (tx.transactionType === "MEMBERSHIP_PURCHASE" ||
            tx.transactionType === "CREDIT_PURCHASE") &&
          tx.operationLeg !== "PLATFORM_REVENUE_CREDIT",
      },
      {
        id: "revenue",
        label: "Mua lượt đăng bài/lượt nộp đề xuất",
        match: (tx) => tx.transactionType === "CREDIT_PURCHASE",
      },
    ],
  },
  {
    id: "contract-deposit",
    label: "Ký quỹ hợp đồng",
    match: (tx) =>
      tx.transactionType === "CONTRACT_SECURITY_DEPOSIT_HOLD" ||
      tx.transactionType === "CONTRACT_SECURITY_DEPOSIT_REFUND" ||
      tx.transactionType === "CONTRACT_SECURITY_DEPOSIT_RESOLVED" ||
      tx.transactionType === "EXPERT_CONTRACT_DEPOSIT_HOLD" ||
      tx.transactionType === "EXPERT_CONTRACT_DEPOSIT_REFUND" ||
      tx.transactionType === "DEPOSIT_REFUND",
    subTabs: [
      {
        id: "hold",
        label: "Ký quỹ giữ lại",
        match: (tx) =>
          tx.transactionType.includes("HOLD") ||
          tx.transactionType.includes("RESOLVED"),
      },
      {
        id: "refund",
        label: "Hoàn / Giải tỏa ký quỹ",
        match: (tx) => tx.transactionType.includes("REFUND"),
      },
    ],
  },
  {
    id: "milestone-escrow",
    label: "Ký quỹ mốc",
    match: (tx) =>
      tx.transactionType === "MILESTONE_ESCROW_DEPOSIT" ||
      tx.transactionType === "MILESTONE_ESCROW_RELEASE" ||
      tx.transactionType === "MILESTONE_ESCROW_REFUND",
    subTabs: [
      {
        id: "deposit",
        label: "Ký quỹ mốc",
        match: (tx) => tx.transactionType === "MILESTONE_ESCROW_DEPOSIT",
      },
      {
        id: "release-refund",
        label: "Giải ngân / Hoàn tiền",
        match: (tx) =>
          tx.transactionType === "MILESTONE_ESCROW_RELEASE" ||
          tx.transactionType === "MILESTONE_ESCROW_REFUND",
      },
    ],
  },
  {
    id: "settlement",
    label: "Quyết toán tranh chấp / Chấm dứt",
    match: (tx) =>
      tx.transactionType === "MILESTONE_ESCROW_SETTLEMENT_PAYOUT" ||
      tx.transactionType === "MILESTONE_ESCROW_SETTLEMENT_REFUND" ||
      tx.transactionType === "IMMEDIATE_TERMINATION_PENALTY" ||
      tx.transactionType === "IMMEDIATE_TERMINATION_COMPENSATION",
    subTabs: [
      {
        id: "expert-payout",
        label: "Chuyển cho chuyên gia",
        match: (tx) =>
          tx.transactionType === "MILESTONE_ESCROW_SETTLEMENT_PAYOUT" ||
          tx.transactionType === "IMMEDIATE_TERMINATION_COMPENSATION",
      },
      {
        id: "business-refund",
        label: "Hoàn cho doanh nghiệp",
        match: (tx) =>
          tx.transactionType === "MILESTONE_ESCROW_SETTLEMENT_REFUND" ||
          tx.transactionType === "IMMEDIATE_TERMINATION_PENALTY",
      },
    ],
  },
  {
    id: "withdrawal",
    label: "Rút tiền",
    match: (tx) =>
      tx.transactionType === "WITHDRAW_HOLD" ||
      tx.transactionType === "WITHDRAW_APPROVED" ||
      tx.transactionType === "WITHDRAW_REJECTED",
    subTabs: [
      {
        id: "request",
        label: "Yêu cầu rút tiền",
        match: (tx) => tx.transactionType === "WITHDRAW_HOLD",
      },
      {
        id: "processed",
        label: "Đã xử lý",
        match: (tx) =>
          tx.transactionType === "WITHDRAW_APPROVED" ||
          tx.transactionType === "WITHDRAW_REJECTED",
      },
    ],
  },
];

// ── Helpers ─────────────────────────────────────────────────────────────────────

function walletTransactionTypeLabel(type: string) {
  const labels: Record<string, string> = {
    TOPUP: "Nạp tiền",
    MEMBERSHIP_PURCHASE: "Mua gói thành viên",
    CREDIT_PURCHASE: "Mua lượt sử dụng",
    CONTRACT_SECURITY_DEPOSIT_HOLD: "Ký quỹ hợp đồng",
    CONTRACT_SECURITY_DEPOSIT_REFUND: "Hoàn ký quỹ hợp đồng",
    CONTRACT_SECURITY_DEPOSIT_RESOLVED: "Giữ lại ký quỹ",
    DEPOSIT_REFUND: "Hoàn ký quỹ",
    WITHDRAW_HOLD: "Tạm giữ rút tiền",
    WITHDRAW_APPROVED: "Rút tiền",
    WITHDRAW_REJECTED: "Từ chối rút tiền",
    PLATFORM_REVENUE_CREDIT: "Doanh thu nền tảng",
    EXPERT_CONTRACT_DEPOSIT_HOLD: "Ký quỹ chuyên gia",
    EXPERT_CONTRACT_DEPOSIT_REFUND: "Hoàn ký quỹ chuyên gia",
    MILESTONE_ESCROW_DEPOSIT: "Ký quỹ mốc",
    MILESTONE_ESCROW_RELEASE: "Giải ngân mốc",
    MILESTONE_ESCROW_REFUND: "Hoàn ký quỹ mốc",
    MILESTONE_ESCROW_SETTLEMENT_PAYOUT: "Quyết toán cho chuyên gia",
    MILESTONE_ESCROW_SETTLEMENT_REFUND: "Quyết toán hoàn tiền",
    IMMEDIATE_TERMINATION_PENALTY: "Phạt chấm dứt",
    IMMEDIATE_TERMINATION_COMPENSATION: "Bồi thường chấm dứt",
  };
  return labels[type] ?? type;
}

function walletTransactionBadgeTone(type: string) {
  const up: string[] = [
    "TOPUP",
    "PLATFORM_REVENUE_CREDIT",
    "DEPOSIT_REFUND",
    "WITHDRAW_REJECTED",
    "EXPERT_CONTRACT_DEPOSIT_REFUND",
  ];
  const down: string[] = [
    "MEMBERSHIP_PURCHASE",
    "CREDIT_PURCHASE",
    "WITHDRAW_APPROVED",
    "WITHDRAW_HOLD",
  ];
  if (up.includes(type)) return "mint" as const;
  if (down.includes(type)) return "amber" as const;
  if (type.includes("HOLD")) return "coral" as const;
  return "brand" as const;
}

function walletTransactionStatusTone(status: string) {
  if (status === "SUCCESS") return "mint" as const;
  if (status === "FAILED" || status === "CANCELLED") return "coral" as const;
  if (status === "PENDING") return "amber" as const;
  return "slate" as const;
}

function walletTransactionStatusLabel(status: string) {
  const labels: Record<string, string> = {
    SUCCESS: "Thành công",
    FAILED: "Thất bại",
    PENDING: "Chờ xử lý",
    CANCELLED: "Đã hủy",
  };
  return labels[status] ?? status;
}

function walletTransactionDisplayType(tx: WalletTransaction) {
  return (
    tx.transactionTypeLabel?.trim() ||
    walletTransactionTypeLabel(tx.transactionType)
  );
}

function walletTransactionDisplayStatus(tx: WalletTransaction) {
  return tx.statusLabel?.trim() || walletTransactionStatusLabel(tx.status);
}

function walletTransactionIsSuccessful(status: string) {
  return status === "SUCCESS" || status === "POSTED";
}

function walletTransactionDisplayIsPositive(tx: WalletTransaction) {
  return tx.amount >= 0;
}

function normalizePlatformHistory(history: WalletTransaction[]) {
  return history.filter(Boolean);
}

function categoryDisplayLabel(
  category: CategoryDef,
  transactions: WalletTransaction[],
) {
  if (category.id === "all") return "Tất cả giao dịch";
  if (category.id === "service-revenue") return category.label;
  return (
    transactions
      .find((tx) => tx.transactionGroup === category.id)
      ?.transactionGroupLabel?.trim() || category.label
  );
}

function subTabDisplayLabel(
  subTab: SubTabDef,
  transactions: WalletTransaction[],
) {
  if (subTab.id === "purchase" || subTab.id === "revenue") {
    return subTab.label;
  }
  return (
    transactions
      .find((tx) => tx.transactionSubGroup === subTab.id)
      ?.transactionSubGroupLabel?.trim() || subTab.label
  );
}

type PartyDisplayMode = "default" | "platform";

function accountDisplayName(account?: AdminAccount) {
  return account?.fullName?.trim() || account?.email;
}

function findAccountNameByIds(
  accounts: AdminAccount[],
  accountIds: Array<number | undefined>,
  roles?: string[],
) {
  for (const id of accountIds) {
    if (!id) continue;
    const account = accounts.find(
      (a) => a.accountId === id && (!roles || roles.includes(a.role)),
    );
    const name = accountDisplayName(account);
    if (name) return name;
  }
  return undefined;
}

function walletTransactionPartyLabel(
  tx: WalletTransaction,
  mode: PartyDisplayMode = "default",
) {
  if (mode === "platform") return "Nền tảng";
  if (tx.counterpartyLabel?.trim()) return tx.counterpartyLabel;
  if (tx.counterpartyRole === "BUSINESS") return "Doanh nghiệp";
  if (tx.counterpartyRole === "EXPERT") return "Chuyên gia";
  if (tx.counterpartyRole === "ADMIN" || tx.counterpartyRole === "STAFF")
    return "Nội bộ";
  return (
    tx.counterpartyName?.trim() ||
    tx.businessName?.trim() ||
    tx.expertName?.trim() ||
    "—"
  );
}

function walletTransactionPartyName(
  tx: WalletTransaction,
  accounts: AdminAccount[],
  mode: PartyDisplayMode = "default",
) {
  if (mode === "platform") {
    const platformAccountName = findAccountNameByIds(
      accounts,
      [tx.accountId, tx.actorAccountId, tx.counterpartyAccountId],
      ["ADMIN", "STAFF"],
    );
    return (
      tx.adminName?.trim() ||
      platformAccountName ||
      (tx.actorRole === "ADMIN" || tx.actorRole === "STAFF"
        ? tx.actorName?.trim()
        : undefined) ||
      "Nền tảng"
    );
  }

  if (tx.counterpartyName?.trim()) return tx.counterpartyName;
  if (tx.businessName?.trim()) return tx.businessName;
  if (tx.expertName?.trim()) return tx.expertName;
  if (tx.adminName?.trim()) return tx.adminName;
  const acc = accounts.find((a) => a.accountId === tx.counterpartyAccountId);
  return (
    accountDisplayName(acc) ??
    (tx.counterpartyRole === "BUSINESS" ? "Doanh nghiệp" : "Chuyên gia")
  );
}

// ── Row component ─────────────────────────────────────────────────────────────────

function TransactionRow({
  tx,
  accounts,
  partyMode = "default",
}: {
  tx: WalletTransaction;
  accounts: AdminAccount[];
  partyMode?: PartyDisplayMode;
}) {
  const transactionId = tx.transactionId ?? tx.id;

  return (
    <div
      key={transactionId}
      className="grid gap-3 px-5 py-4 transition hover:bg-slate-50/70 md:grid-cols-[minmax(0,1fr)_180px_160px] md:items-center"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={walletTransactionBadgeTone(tx.transactionType)}>
            {walletTransactionDisplayType(tx)}
          </Badge>
          <Badge tone={walletTransactionStatusTone(tx.status)}>
            {walletTransactionDisplayStatus(tx)}
          </Badge>
          <span className="text-xs font-bold text-slate-400">
            {formatDateTime(tx.createdAt)}
          </span>
        </div>

        <p className="mt-2 truncate text-base font-extrabold text-ink">
          {tx.title || walletTransactionDisplayType(tx) || "Giao dịch"}
        </p>
        <p className="mt-1 truncate text-xs text-slate-400">
          {tx.description || tx.rawDescription || ""}
        </p>
      </div>

      <div className="grid gap-1 text-sm">
        <span className="text-xs font-bold text-slate-400">
          {walletTransactionPartyLabel(tx, partyMode)}
        </span>
        <span className="truncate font-extrabold text-slate-600">
          {walletTransactionPartyName(tx, accounts, partyMode)}
        </span>
      </div>

      <span
        className={`text-right text-base font-black ${
          walletTransactionDisplayIsPositive(tx)
            ? "text-mint-600"
            : "text-coral-600"
        }`}
      >
        {walletTransactionDisplayIsPositive(tx) ? "+" : "–"}
        {formatCurrency(Math.abs(tx.amount))}
      </span>
    </div>
  );
}

// ── Pagination component ──────────────────────────────────────────────────────────

function Pagination({
  page,
  pageCount,
  onChange,
}: {
  page: number;
  pageCount: number;
  onChange: (p: number) => void;
}) {
  if (pageCount <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
      <span className="text-xs font-bold text-slate-400">
        Trang {page} / {pageCount}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-ink disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {Array.from({ length: Math.min(pageCount, 5) }, (_, i) => {
          const start = Math.max(1, Math.min(page - 2, pageCount - 4));
          const p = start + i;
          if (p > pageCount) return null;
          return (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              className={`grid h-9 min-w-[2.25rem] place-items-center rounded-xl text-sm font-bold transition ${
                p === page
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-100 hover:text-ink"
              }`}
            >
              {p}
            </button>
          );
        })}
        <button
          type="button"
          disabled={page >= pageCount}
          onClick={() => onChange(page + 1)}
          className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-ink disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ── Transaction list table component ──────────────────────────────────────────────

function TransactionList({
  transactions,
  accounts,
  partyMode = "default",
  page,
  pageCount,
  onPageChange,
  emptyLabel,
}: {
  transactions: WalletTransaction[];
  accounts: AdminAccount[];
  partyMode?: PartyDisplayMode;
  page: number;
  pageCount: number;
  onPageChange: (p: number) => void;
  emptyLabel: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100">
      <div className="hidden gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4 text-xs font-extrabold uppercase text-slate-400 md:grid md:grid-cols-[1fr_180px_160px] md:items-center">
        <span>Mục đích và dòng tiền</span>
        <span>Người nhận / tài khoản</span>
        <span className="md:text-right">Số tiền</span>
      </div>

      {transactions.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm font-bold text-slate-400">
          {emptyLabel}
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {transactions.map((t) => (
            <TransactionRow
              key={t.transactionId ?? t.id}
              tx={t}
              accounts={accounts}
              partyMode={partyMode}
            />
          ))}
        </div>
      )}

      <Pagination page={page} pageCount={pageCount} onChange={onPageChange} />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────────

export function SystemWalletPage() {
  const [wallet, setWallet] = useState<SystemWallet | null>(null);
  const [ledger, setLedger] = useState<WalletTransaction[]>([]);
  const [userActivity, setUserActivity] = useState<WalletTransaction[]>([]);
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("ledger");
  const [ledgerPage, setLedgerPage] = useState(1);
  const [userActivityPage, setUserActivityPage] = useState(1);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [activeSubTab, setActiveSubTab] = useState<string>("");

  const load = useCallback(async (sync = false) => {
    setLoading(true);
    try {
      const [w, l, ua, accs] = await Promise.all([
        sync ? adminApi.syncSystemWallet() : adminApi.getSystemWallet(),
        adminApi.listPlatformWalletLedger(),
        adminApi.listPlatformWalletTransactions(),
        adminApi.listAccounts(),
      ]);
      setWallet(w);
      setLedger(l);
      setUserActivity(ua);
      setAccounts(accs);
      setLedgerPage(1);
      setUserActivityPage(1);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  const normalizedLedger = useMemo(
    () => normalizePlatformHistory(ledger),
    [ledger],
  );
  const normalizedUserActivity = useMemo(
    () => normalizePlatformHistory(userActivity),
    [userActivity],
  );

  // Category + sub-tab filtering
  const selectedCategory = useMemo(
    () =>
      TRANSACTION_CATEGORIES.find((c) => c.id === selectedCategoryId) ??
      TRANSACTION_CATEGORIES[0],
    [selectedCategoryId],
  );

  const filteredUserActivity = useMemo(() => {
    if (selectedCategory.id === "all") return normalizedUserActivity;
    const categoryFiltered = normalizedUserActivity.filter(
      selectedCategory.match,
    );
    if (!activeSubTab || selectedCategory.subTabs.length === 0)
      return categoryFiltered;
    const subTab = selectedCategory.subTabs.find((s) => s.id === activeSubTab);
    if (!subTab) return categoryFiltered;
    return categoryFiltered.filter(subTab.match);
  }, [normalizedUserActivity, selectedCategory, activeSubTab]);

  const selectedCategoryTransactions = useMemo(
    () =>
      selectedCategory.id === "all"
        ? normalizedUserActivity
        : normalizedUserActivity.filter(selectedCategory.match),
    [normalizedUserActivity, selectedCategory],
  );

  const ledgerPageCount = Math.max(
    1,
    Math.ceil(normalizedLedger.length / PAGE_SIZE),
  );
  const userActivityPageCount = Math.max(
    1,
    Math.ceil(filteredUserActivity.length / PAGE_SIZE),
  );

  const visibleLedger = useMemo(
    () =>
      normalizedLedger.slice(
        (ledgerPage - 1) * PAGE_SIZE,
        ledgerPage * PAGE_SIZE,
      ),
    [normalizedLedger, ledgerPage],
  );
  const visibleUserActivity = useMemo(
    () =>
      filteredUserActivity.slice(
        (userActivityPage - 1) * PAGE_SIZE,
        userActivityPage * PAGE_SIZE,
      ),
    [filteredUserActivity, userActivityPage],
  );

  const successfulPlatformTransactionCount = useMemo(
    () =>
      normalizedLedger.filter((tx) => walletTransactionIsSuccessful(tx.status))
        .length,
    [normalizedLedger],
  );

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          title="Ví nền tảng"
          description="Theo dõi doanh thu nền tảng, tiền đang giữ và các giao dịch phát sinh từ gói thành viên, lượt sử dụng, ký quỹ và rút tiền."
          actions={
            <Button onClick={() => load(true)} disabled={loading}>
              <RefreshCw className="h-4 w-4" /> Đồng bộ ví nền tảng
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
              label="Tiền đang giữ cho kí quỹ"
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
              label="Tiền đang tranh chấp"
              value={formatCurrency(wallet.disputedBalance)}
              icon={<ShieldAlert className="h-5 w-5" />}
              tone="coral"
            />
          </div>

          <Card className="p-6">
            <SectionHeading
              title="Thông tin tổng quan"
              description="Số liệu ví sau lần đồng bộ gần nhất."
            />
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <WalletFact
                label="Loại ví"
                value={walletTypeLabel(wallet.walletType)}
              />
              <WalletFact
                label="Doanh thu khả dụng"
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
                value={successfulPlatformTransactionCount}
                tone="mint"
              />
            </div>
          </Card>

          {/* Tab navigation */}
          <div className="flex items-center justify-between">
            <Tabs
              tabs={TABS}
              active={activeTab}
              onChange={(id) => {
                setActiveTab(id as TabId);
                setSelectedCategoryId("all");
                setActiveSubTab("");
                setLedgerPage(1);
                setUserActivityPage(1);
              }}
            />
            <span className="text-xs font-bold text-slate-400">
              Hiển thị{" "}
              {activeTab === "ledger"
                ? normalizedLedger.length
                : filteredUserActivity.length}{" "}
              giao dịch
            </span>
          </div>

          {/* Tab content */}
          <Card className="p-6">
            {activeTab === "ledger" ? (
              <>
                <SectionHeading
                  title="Lịch sử ví nền tảng"
                  description="Sổ cái các giao dịch làm thay đổi số dư của ví nền tảng."
                />
                <div className="mt-5">
                  <TransactionList
                    transactions={visibleLedger}
                    accounts={accounts}
                    partyMode="platform"
                    page={ledgerPage}
                    pageCount={ledgerPageCount}
                    onPageChange={setLedgerPage}
                    emptyLabel="Chưa có lịch sử giao dịch trên ví nền tảng."
                  />
                </div>
              </>
            ) : (
              <>
                <SectionHeading
                  title="Lịch sử giao dịch nền tảng"
                  description="Các giao dịch phát sinh từ hoạt động của người dùng trên toàn nền tảng."
                />

                {/* Category dropdown */}
                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <label className="text-xs font-extrabold uppercase text-slate-400">
                    Loại giao dịch:
                  </label>
                  <select
                    value={selectedCategoryId}
                    onChange={(e) => {
                      setSelectedCategoryId(e.target.value);
                      const cat = TRANSACTION_CATEGORIES.find(
                        (c) => c.id === e.target.value,
                      );
                      setActiveSubTab(
                        cat && cat.subTabs.length > 0 ? cat.subTabs[0].id : "",
                      );
                      setUserActivityPage(1);
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-ink shadow-sm transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200 sm:w-auto"
                  >
                    {TRANSACTION_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {categoryDisplayLabel(cat, normalizedUserActivity)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sub-tabs */}
                {selectedCategory.subTabs.length > 0 && (
                  <div className="mt-4 flex gap-2">
                    {selectedCategory.subTabs.map((sub) => (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => {
                          setActiveSubTab(sub.id);
                          setUserActivityPage(1);
                        }}
                        className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                          activeSubTab === sub.id
                            ? "bg-brand-600 text-white shadow-sm"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-ink"
                        }`}
                      >
                        {subTabDisplayLabel(sub, selectedCategoryTransactions)}
                      </button>
                    ))}
                  </div>
                )}

                <div className="mt-5">
                  <TransactionList
                    transactions={visibleUserActivity}
                    accounts={accounts}
                    page={userActivityPage}
                    pageCount={userActivityPageCount}
                    onPageChange={setUserActivityPage}
                    emptyLabel="Chưa có hoạt động giao dịch nào trong danh mục này."
                  />
                </div>
              </>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

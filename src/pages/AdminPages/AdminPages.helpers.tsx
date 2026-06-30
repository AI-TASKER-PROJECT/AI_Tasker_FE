import {
  BriefcaseBusiness,
  Download,
  FileText,
  Gavel,
  Plus,
  ReceiptText,
  RefreshCw,
  Save,
  Settings2,
  ShieldAlert,
  TrendingUp,
  Users,
  WalletCards,
} from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  adminApi,
  catalogApi,
  contractApi,
  type Domain,
  type Skill,
} from "../../lib/api";
import {
  formatCurrency,
  formatCompactCurrency,
  formatDate,
  formatTime,
  formatDateTime,
} from "../../lib/utils";
import type {
  AccountStatus,
  AdminAccount,
  AnalyticsOverview,
  AcceptanceCriteria,
  AuditLog,
  Role,
  Staff,
  SystemSetting,
  SystemWallet,
  WalletTransaction,
} from "../../types";
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  Modal,
  Notice,
  PageHeader,
  Progress,
  SectionHeading,
} from "../../components/ui";

export function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  useEffect(() => {
    adminApi.analyticsOverview().then(setAnalytics);
  }, []);
  const value = analytics;

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          title="Analytics & Revenue"
          description="Gọi `/api/v1/admin/analytics/overview`, hiển thị KPI và biểu đồ nhẹ bằng CSS để tránh phụ thuộc chart nặng."
          actions={
            <Button variant="secondary">
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          }
        />
      </div>
      {value && (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <AdminMetric
              label="Tổng hợp đồng"
              value={value.totalContracts}
              icon={<BriefcaseBusiness className="h-5 w-5" />}
            />
            <AdminMetric
              label="Tỷ lệ thành công"
              value={`${value.contractSuccessRatePercent}%`}
              icon={<TrendingUp className="h-5 w-5" />}
              tone="mint"
            />
            <AdminMetric
              label="Dispute mở"
              value={value.openDisputes}
              icon={<Gavel className="h-5 w-5" />}
              tone="coral"
            />
            <AdminMetric
              label="Volume"
              value={formatCompactCurrency(value.transactionVolume)}
              icon={<WalletCards className="h-5 w-5" />}
              tone="amber"
            />
          </div>
          <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
            <Card className="p-6">
              <SectionHeading title="Contract funnel" />
              <div className="mt-6 space-y-5">
                <Funnel
                  label="Total"
                  value={value.totalContracts}
                  max={value.totalContracts}
                />
                <Funnel
                  label="Completed"
                  value={value.completedContracts}
                  max={value.totalContracts}
                  color="mint"
                />
                <Funnel
                  label="Terminated/Cancelled"
                  value={value.terminatedContracts}
                  max={value.totalContracts}
                  color="coral"
                />
                <Funnel
                  label="Open disputes"
                  value={value.openDisputes}
                  max={value.totalDisputes || 1}
                  color="amber"
                />
              </div>
            </Card>
            <Card className="p-6">
              <SectionHeading
                title="Báo cáo chu kỳ"
                description="UI sẵn cho lọc tuần/tháng/quý, back-end hiện chưa có query theo thời gian."
              />
              <div className="mt-5 grid gap-3">
                {["Tuần này", "Tháng này", "Quý này"].map((label, index) => (
                  <div key={label} className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-bold text-ink">{label}</span>
                      <span className="font-extrabold text-brand-600">
                        +{12 - index * 3}%
                      </span>
                    </div>
                    <Progress value={76 - index * 13} className="mt-3" />
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function AdminMetric({
  label,
  value,
  icon,
  tone = "brand",
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  tone?: "brand" | "mint" | "coral" | "amber";
}) {
  const tones = {
    brand: "bg-brand-50 text-brand-600",
    mint: "bg-mint-50 text-mint-600",
    coral: "bg-coral-50 text-coral-600",
    amber: "bg-amber-50 text-amber-700",
  };
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-bold text-slate-500">{label}</p>
          <p className="mt-2 font-display text-2xl font-black text-ink">
            {value}
          </p>
        </div>
        <span
          className={`grid h-11 w-11 place-items-center rounded-2xl ${tones[tone]}`}
        >
          {icon}
        </span>
      </div>
    </Card>
  );
}

function DateTimeCell({ value }: { value?: string }) {
  return (
    <span className="grid gap-1 text-center font-bold text-slate-500">
      <span>{formatDate(value)}</span>
      {value && (
        <span className="text-xs font-semibold text-slate-400">
          {formatTime(value)}
        </span>
      )}
    </span>
  );
}

function Funnel({
  label,
  value,
  max,
  color = "brand",
}: {
  label: string;
  value: number;
  max: number;
  color?: "brand" | "mint" | "coral" | "amber";
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-bold text-slate-600">{label}</span>
        <span className="font-extrabold text-ink">{value}</span>
      </div>
      <Progress
        value={(value / max) * 100}
        color={color === "amber" ? "coral" : color}
      />
    </div>
  );
}

export function SystemWalletPage() {
  const [wallet, setWallet] = useState<SystemWallet | null>(null);
  const [history, setHistory] = useState<WalletTransaction[]>([]);
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (sync = false) => {
    setLoading(true);
    try {
      const [w, h, accs] = await Promise.all([
        sync
          ? adminApi.syncSystemWallet()
          : adminApi.getSystemWallet(),
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
              <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-100">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="w-28 px-4 py-3 text-left font-bold text-slate-500">
                        Mã giao dịch
                      </th>
                      <th className="w-32 px-4 py-3 text-left font-bold text-slate-500">
                        Ngày giờ
                      </th>
                      <th className="min-w-[360px] px-4 py-3 text-left font-bold text-slate-500">
                        Nội dung giao dịch
                      </th>
                      <th className="min-w-[180px] px-4 py-3 text-left font-bold text-slate-500">
                        Người thực hiện
                      </th>
                      <th className="w-36 px-4 py-3 text-left font-bold text-slate-500">
                        Số tiền
                      </th>
                      <th className="w-32 px-4 py-3 text-left font-bold text-slate-500">
                        Nguồn tiền
                      </th>
                      <th className="w-28 px-4 py-3 text-left font-bold text-slate-500">
                        Trạng thái
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {history.map((t) => {
                      const transactionId = t.transactionId ?? t.id;
                      const contextItems = walletTransactionContextItems(t);
                      return (
                        <tr key={transactionId}>
                          <td className="px-4 py-3 font-semibold text-slate-700">
                            #{transactionId}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col font-medium text-slate-500">
                              {(() => {
                                const dt = formatDateTime(t.createdAt);
                                const [time, date] = dt.split(" ");
                                return (
                                  <>
                                    <span>{time}</span>
                                    <span>{date}</span>
                                  </>
                                );
                              })()}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="space-y-2">
                              <div>
                                <p className="font-extrabold text-ink">
                                  {walletTransactionPurposeTitle(t)}
                                </p>
                                <p className="mt-1 max-w-xl text-xs leading-5 text-slate-500">
                                  {walletTransactionPurposeDescription(t)}
                                </p>
                              </div>
                              {contextItems.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {contextItems.map((item) => (
                                    <Badge key={item} tone="brand">
                                      {item}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {t.actorName ??
                              (t.accountId
                                ? (accounts.find(a => a.accountId === t.accountId)?.fullName ?? `#${t.accountId}`)
                                : "-")}
                          </td>
                          <td className="px-4 py-3">
                            <div
                              className={
                                t.direction === "CREDIT" || t.direction === "RELEASE"
                                  ? "font-extrabold text-mint-600"
                                  : "font-extrabold text-brand-600"
                              }
                            >
                              {t.direction === "CREDIT" || t.direction === "RELEASE" ? "+" : "-"}
                              {formatCurrency(t.amount)}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="grid gap-1">
                              <Badge tone="slate">{walletTransactionTypeLabel(t.transactionType)}</Badge>
                              <span className="text-xs font-semibold text-slate-400">
                                {t.balanceType}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              tone={
                                t.status === "SUCCESS"
                                  ? "mint"
                                  : t.status === "PENDING"
                                    ? "amber"
                                    : "coral"
                              }
                            >
                              {t.status}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                    {history.length === 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-8 text-center text-slate-400"
                        >
                          Chưa có lịch sử giao dịch nền tảng.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
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
    tx.withdrawalId ? `Rút tiền #${tx.withdrawalId}` : null,
    tx.providerOrderCode ? `PayOS #${tx.providerOrderCode}` : null,
    tx.bankName ? `Ngân hàng: ${tx.bankName}` : null,
  ].filter(Boolean) as string[];
}

function WalletFact({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string | number;
  tone?: "slate" | "brand" | "mint" | "coral" | "amber";
}) {
  const tones = {
    slate: "bg-slate-50 text-slate-400",
    brand: "bg-brand-50 text-brand-600",
    mint: "bg-mint-50 text-mint-600",
    coral: "bg-coral-50 text-coral-600",
    amber: "bg-amber-50 text-amber-600",
  };
  return (
    <div
      className={`rounded-2xl p-4 ${tone === "slate" ? "bg-slate-50" : tones[tone].split(" ")[0]}`}
    >
      <p
        className={`text-xs font-extrabold uppercase tracking-wide ${tone === "slate" ? "text-slate-400" : tones[tone].split(" ")[1]}`}
      >
        {label}
      </p>
      <p className="mt-2 text-lg font-black text-ink">{value}</p>
    </div>
  );
}

const internalRoles: Role[] = ["ADMIN", "STAFF"];
const externalRoles: Role[] = ["BUSINESS", "EXPERT"];
const accountStatuses: AccountStatus[] = [
  "Pending",
  "Approved",
  "Rejected",
  "Lock",
];

function specializationFromDomains(domainIds: number[], domains: Domain[]) {
  return domains
    .filter((domain) => domainIds.includes(domain.domainId))
    .map((domain) => domain.domainName)
    .join(", ");
}

function selectedDomainIdsFromSpecialization(
  specialization: string | undefined,
  domains: Domain[],
) {
  const tokens = (specialization || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return domains
    .filter(
      (domain) =>
        tokens.includes(domain.domainName.toLowerCase()) ||
        tokens.includes(domain.domainCode.toLowerCase()),
    )
    .map((domain) => domain.domainId);
}

function formatAuditTimestamp(value?: string) {
  if (!value) return { date: "Chưa cập nhật", time: "" };
  const date = new Date(value);
  return {
    date: new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date),
    time: new Intl.DateTimeFormat("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(date),
  };
}

function SpecializationSelector({
  domains,
  selectedIds,
  onChange,
}: {
  domains: Domain[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}) {
  const toggle = (domainId: number) => {
    onChange(
      selectedIds.includes(domainId)
        ? selectedIds.filter((id) => id !== domainId)
        : [...selectedIds, domainId],
    );
  };

  return (
    <div className="grid max-h-56 gap-2 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 md:grid-cols-2">
      {domains.map((domain) => (
        <label
          key={domain.domainId}
          className="flex cursor-pointer items-center gap-2 rounded-xl px-2 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <input
            type="checkbox"
            checked={selectedIds.includes(domain.domainId)}
            onChange={() => toggle(domain.domainId)}
            className="h-4 w-4 rounded border-slate-300 text-brand-600"
          />
          <span>{domain.domainName}</span>
        </label>
      ))}
    </div>
  );
}

export function AccountsPage() {
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [accountTab, setAccountTab] = useState<"internal" | "external">(
    "internal",
  );
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminAccount | null>(null);
  const [form, setForm] = useState({
    email: "",
    password: "",
    phone: "",
    fullName: "",
    role: "STAFF" as Role,
    status: "Approved" as AccountStatus,
    domainIds: [] as number[],
  });

  const load = async () => setAccounts(await adminApi.listAccounts());

  useEffect(() => {
    void Promise.resolve().then(() => load());
    catalogApi
      .listDomains(true)
      .then(setDomains)
      .catch(() => setDomains([]));
  }, []);

  const visibleAccounts = accounts.filter((account) =>
    accountTab === "internal"
      ? internalRoles.includes(account.role)
      : externalRoles.includes(account.role),
  );

  const beginCreate = () => {
    setEditing(null);
    const role: Role = accountTab === "internal" ? "STAFF" : "BUSINESS";
    setForm({
      email: "",
      password: "",
      phone: "",
      fullName: "",
      role,
      status: role === "STAFF" ? "Approved" : "Pending",
      domainIds: [],
    });
    setOpen(true);
  };

  const beginEdit = (account: AdminAccount) => {
    setEditing(account);
    setForm({
      email: account.email,
      password: "",
      phone: account.phone || "",
      fullName: account.fullName,
      role: account.role,
      status: account.status,
      domainIds: selectedDomainIdsFromSpecialization(
        account.specialization,
        domains,
      ),
    });
    setOpen(true);
  };

  const saveAccount = async () => {
    const payload = {
      email: form.email,
      password: form.password || undefined,
      phone: form.phone,
      fullName: form.fullName,
      role: form.role,
      status: form.status,
      specialization:
        form.role === "STAFF"
          ? specializationFromDomains(form.domainIds, domains)
          : undefined,
    };
    const saved = editing
      ? await adminApi.updateAccount(editing.accountId, payload)
      : await adminApi.createAccount(payload);
    if (!editing && saved.role === "STAFF") {
      await adminApi.createStaff({
        accountId: saved.accountId,
        specialization: payload.specialization,
      });
    }
    setAccounts((items) =>
      editing
        ? items.map((item) =>
            item.accountId === saved.accountId ? saved : item,
          )
        : [...items, saved],
    );
    setOpen(false);
  };

  const changeStatus = async (account: AdminAccount, status: AccountStatus) => {
    const updated = await adminApi.setAccountStatus(account.accountId, status);
    setAccounts((items) =>
      items.map((item) =>
        item.accountId === updated.accountId ? updated : item,
      ),
    );
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          title="Account Management"
          description="Admin can create, update, activate, and deactivate every role account."
          actions={
            <Button onClick={beginCreate}>
              <Plus className="h-4 w-4" /> Create account
            </Button>
          }
        />
      </div>
      <Card className="overflow-hidden">
        <div className="flex flex-wrap gap-2 border-b border-slate-100 bg-white px-5 py-4">
          <Button
            variant={accountTab === "internal" ? "primary" : "secondary"}
            onClick={() => setAccountTab("internal")}
          >
            Nội bộ
          </Button>
          <Button
            variant={accountTab === "external" ? "primary" : "secondary"}
            onClick={() => setAccountTab("external")}
          >
            Bên ngoài
          </Button>
        </div>
        <div className="grid border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-extrabold uppercase tracking-wide text-slate-400 md:grid-cols-[80px_1fr_150px_130px_180px]">
          <span>ID</span>
          <span>Account</span>
          <span>Role</span>
          <span>Status</span>
          <span>Actions</span>
        </div>
        {visibleAccounts.map((account) => (
          <div
            key={account.accountId}
            className="grid gap-3 border-b border-slate-100 px-5 py-4 text-sm md:grid-cols-[80px_1fr_150px_130px_180px] md:items-center"
          >
            <span className="font-extrabold text-slate-500">
              #{account.accountId}
            </span>
            <div>
              <p className="font-extrabold text-ink">{account.fullName}</p>
              <p className="text-slate-500">{account.email}</p>
            </div>
            <Badge
              tone={
                account.role === "ADMIN"
                  ? "rose"
                  : account.role === "STAFF"
                    ? "amber"
                    : "brand"
              }
            >
              {account.role}
            </Badge>
            <Badge
              tone={
                account.status === "Approved"
                  ? "mint"
                  : account.status === "Rejected"
                    ? "rose"
                    : account.status === "Lock"
                      ? "slate"
                      : "amber"
              }
            >
              {account.status}
            </Badge>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => beginEdit(account)}>
                Edit
              </Button>
              <Button
                variant="ghost"
                onClick={() =>
                  changeStatus(
                    account,
                    account.status === "Lock" ? "Approved" : "Lock",
                  )
                }
              >
                {account.status === "Lock" ? "Unlock" : "Lock"}
              </Button>
            </div>
          </div>
        ))}
      </Card>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit account" : "Create account"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveAccount}>
              <Save className="h-4 w-4" /> Save
            </Button>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Email">
            <Input
              value={form.email}
              onChange={(event) =>
                setForm((value) => ({ ...value, email: event.target.value }))
              }
            />
          </Field>
          <Field label={editing ? "New password" : "Password"}>
            <Input
              type="password"
              value={form.password}
              onChange={(event) =>
                setForm((value) => ({ ...value, password: event.target.value }))
              }
            />
          </Field>
          <Field label="Full name">
            <Input
              value={form.fullName}
              onChange={(event) =>
                setForm((value) => ({ ...value, fullName: event.target.value }))
              }
            />
          </Field>
          <Field label="Phone">
            <Input
              value={form.phone}
              onChange={(event) =>
                setForm((value) => ({ ...value, phone: event.target.value }))
              }
            />
          </Field>
          <Field label="Role">
            <select
              value={form.role}
              onChange={(event) => {
                const role = event.target.value as Role;
                setForm((value) => ({
                  ...value,
                  role,
                  status:
                    role === "STAFF" || role === "ADMIN"
                      ? "Approved"
                      : value.status,
                }));
              }}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none"
            >
              {(accountTab === "internal" ? internalRoles : externalRoles).map(
                (role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ),
              )}
            </select>
          </Field>
          <Field label="Status">
            <select
              value={form.status}
              onChange={(event) =>
                setForm((value) => ({
                  ...value,
                  status: event.target.value as AccountStatus,
                }))
              }
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none"
            >
              {accountStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </Field>
          {form.role === "STAFF" && (
            <div className="md:col-span-2">
              <Field label="Staff specialization">
                <SpecializationSelector
                  domains={domains}
                  selectedIds={form.domainIds}
                  onChange={(ids) =>
                    setForm((value) => ({ ...value, domainIds: ids }))
                  }
                />
              </Field>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

export function StaffPage() {
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [domainIds, setDomainIds] = useState<number[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ accountId: "", specialization: "NLP" });

  useEffect(() => {
    adminApi.listStaffs().then(setStaffs);
    catalogApi
      .listDomains(true)
      .then(setDomains)
      .catch(() => setDomains([]));
  }, []);

  const beginEditStaff = (staff: Staff) => {
    setEditing(staff);
    setDomainIds(
      selectedDomainIdsFromSpecialization(staff.specialization, domains),
    );
  };

  const saveStaff = async () => {
    if (!editing) return;
    const updated = await adminApi.updateStaff(editing.staffId, {
      specialization: specializationFromDomains(domainIds, domains),
    });
    setStaffs((items) =>
      items.map((item) => (item.staffId === updated.staffId ? updated : item)),
    );
    setEditing(null);
  };

  const create = async () => {
    const staff = await adminApi.createStaff({
      accountId: Number(form.accountId),
      specialization: form.specialization,
    });
    setStaffs((items) => [...items, staff]);
    setOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          title="Quản lý Staff"
          description="Admin tạo hồ sơ staff nội bộ và khai báo specialization để auto-routing dispute."
          actions={
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Tạo staff
            </Button>
          }
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {staffs.map((staff) => (
          <Card key={staff.staffId} className="p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                <Users className="h-5 w-5" />
              </span>
              <div>
                <p className="font-extrabold text-ink">
                  {staff.fullName || `Staff #${staff.staffId}`}
                </p>
                <p className="text-sm text-slate-500">
                  {staff.email || `Account #${staff.accountId}`}
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {(staff.specialization || "General").split(",").map((item) => (
                <Badge key={item.trim()} tone="brand">
                  {item.trim()}
                </Badge>
              ))}
              <Badge tone="amber">{staff.activeTickets || 0} ticket</Badge>
            </div>
            <Button
              variant="secondary"
              className="mt-5 w-full"
              onClick={() => beginEditStaff(staff)}
            >
              <Settings2 className="h-4 w-4" /> Edit specialization
            </Button>
          </Card>
        ))}
      </div>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Tạo staff"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Hủy
            </Button>
            <Button onClick={create}>Tạo</Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Field label="Account ID">
            <Input
              value={form.accountId}
              onChange={(event) =>
                setForm((value) => ({
                  ...value,
                  accountId: event.target.value,
                }))
              }
            />
          </Field>
          <Field label="Specialization">
            <Input
              value={form.specialization}
              onChange={(event) =>
                setForm((value) => ({
                  ...value,
                  specialization: event.target.value,
                }))
              }
            />
          </Field>
        </div>
      </Modal>
      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Edit staff specialization"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={saveStaff}>
              <Save className="h-4 w-4" /> Save
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Field label="Staff">
            <Input
              value={editing?.email || `Account #${editing?.accountId || ""}`}
              readOnly
            />
          </Field>
          <Field label="Specialization">
            <SpecializationSelector
              domains={domains}
              selectedIds={domainIds}
              onChange={setDomainIds}
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}

export function SettingsPage() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [editing, setEditing] = useState<SystemSetting | null>(null);
  const [value, setValue] = useState("");

  useEffect(() => {
    adminApi.listSettings().then(setSettings);
  }, []);

  const save = async () => {
    if (!editing) return;
    const updated = await adminApi.updateSetting(
      editing.settingKey,
      value,
      editing.isActive,
    );
    setSettings((items) =>
      items.map((item) =>
        item.settingKey === updated.settingKey ? updated : item,
      ),
    );
    setEditing(null);
  };

  const toggle = async (setting: SystemSetting) => {
    const updated = await adminApi.updateSetting(
      setting.settingKey,
      setting.settingValue,
      !setting.isActive,
    );
    setSettings((items) =>
      items.map((item) =>
        item.settingKey === updated.settingKey ? updated : item,
      ),
    );
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          title="System Settings"
          description="Cấu hình phí nền tảng, SLA và auto assign staff không cần sửa code."
        />
      </div>
      <div className="grid gap-4">
        {settings.map((setting) => (
          <Card key={setting.settingKey} className="p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                  <Settings2 className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-extrabold text-ink">
                    {setting.settingKey}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {setting.description}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge tone="brand">{setting.valueType}</Badge>
                    <Badge tone={setting.isActive ? "mint" : "rose"}>
                      {setting.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-2xl bg-slate-50 px-4 py-2 font-display text-lg font-black text-ink">
                  {setting.settingValue}
                </span>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setEditing(setting);
                    setValue(setting.settingValue);
                  }}
                >
                  Sửa
                </Button>
                <Button variant="ghost" onClick={() => toggle(setting)}>
                  {setting.isActive ? "Tắt" : "Bật"}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Cập nhật setting"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Hủy
            </Button>
            <Button onClick={save}>
              <Save className="h-4 w-4" /> Lưu
            </Button>
          </>
        }
      >
        <Field label={editing?.settingKey || "Setting"}>
          <Input
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        </Field>
      </Modal>
    </div>
  );
}

export function MasterDataPage() {
  const [tab, setTab] = useState<"domains" | "skills" | "criteria">("domains");
  const [domains, setDomains] = useState<Domain[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [criteria, setCriteria] = useState<AcceptanceCriteria[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Domain | null>(null);
  const [skillOpen, setSkillOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [criteriaOpen, setCriteriaOpen] = useState(false);
  const [form, setForm] = useState({
    domainCode: "",
    domainName: "",
    description: "",
    isActive: true,
    sortOrder: 0,
  });
  const [skillForm, setSkillForm] = useState({
    skillCode: "",
    skillName: "",
    description: "",
    isActive: true,
  });
  const [criteriaForm, setCriteriaForm] = useState({
    criteriaCode: "",
    description: "",
    isActive: true,
    sortOrder: 0,
  });

  const loadCatalog = async () => {
    setLoading(true);
    setError("");
    try {
      const [domainItems, skillItems, criteriaItems] = await Promise.all([
        catalogApi.listDomains(false),
        catalogApi.listSkills(false),
        catalogApi.listAcceptanceCriteria(false),
      ]);
      setDomains(domainItems);
      setSkills(skillItems);
      setCriteria(criteriaItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong tai duoc catalog.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(loadCatalog);
  }, []);

  const sortedDomains = [...domains].sort((left, right) => {
    const sortDelta = (left.sortOrder || 0) - (right.sortOrder || 0);
    if (sortDelta !== 0) return sortDelta;
    const nameDelta = left.domainName.localeCompare(right.domainName);
    if (nameDelta !== 0) return nameDelta;
    return left.domainId - right.domainId;
  });
  const sortedSkills = [...skills];
  const sortedCriteria = [...criteria].sort((left, right) => {
    const sortDelta = (left.sortOrder || 0) - (right.sortOrder || 0);
    if (sortDelta !== 0) return sortDelta;
    return (left.criteriaCode || "").localeCompare(right.criteriaCode || "");
  });

  const beginCreate = () => {
    setEditing(null);
    setForm({
      domainCode: "",
      domainName: "",
      description: "",
      isActive: true,
      sortOrder:
        Math.max(0, ...domains.map((domain) => domain.sortOrder || 0)) + 1,
    });
    setOpen(true);
  };

  const beginEdit = (domain: Domain) => {
    setEditing(domain);
    setForm({
      domainCode: domain.domainCode,
      domainName: domain.domainName,
      description: domain.description || "",
      isActive: domain.isActive,
      sortOrder: domain.sortOrder || 0,
    });
    setOpen(true);
  };

  const saveDomain = async () => {
    const payload = {
      domainCode: form.domainCode,
      domainName: form.domainName,
      description: form.description,
      isActive: form.isActive,
      sortOrder: Number(form.sortOrder) || 0,
    };
    const saved = editing
      ? await catalogApi.updateDomain(editing.domainId, payload)
      : await catalogApi.createDomain(payload);
    setDomains((items) =>
      editing
        ? items.map((item) => (item.domainId === saved.domainId ? saved : item))
        : [...items, saved],
    );
    setOpen(false);
  };

  const beginCreateSkill = () => {
    setEditingSkill(null);
    setSkillForm({
      skillCode: "",
      skillName: "",
      description: "",
      isActive: true,
    });
    setSkillOpen(true);
  };

  const beginEditSkill = (skill: Skill) => {
    setEditingSkill(skill);
    setSkillForm({
      skillCode: skill.skillCode,
      skillName: skill.skillName,
      description: skill.description || "",
      isActive: skill.isActive,
    });
    setSkillOpen(true);
  };

  const saveSkill = async () => {
    const payload = {
      skillCode: skillForm.skillCode,
      skillName: skillForm.skillName,
      description: skillForm.description,
      isActive: skillForm.isActive,
    };
    const saved = editingSkill
      ? await catalogApi.updateSkill(editingSkill.skillId, payload)
      : await catalogApi.createSkill(payload);
    setSkills((items) =>
      editingSkill
        ? items.map((item) => (item.skillId === saved.skillId ? saved : item))
        : [...items, saved],
    );
    setSkillOpen(false);
  };

  const beginCreateCriteria = () => {
    setCriteriaForm({
      criteriaCode: "",
      description: "",
      isActive: true,
      sortOrder:
        Math.max(0, ...criteria.map((item) => item.sortOrder || 0)) + 1,
    });
    setCriteriaOpen(true);
  };

  const saveCriteria = async () => {
    const saved = await contractApi.createCriteria({
      criteriaCode: criteriaForm.criteriaCode,
      category: "GENERAL",
      description: criteriaForm.description,
      isActive: criteriaForm.isActive,
      sortOrder: Number(criteriaForm.sortOrder) || 0,
    });
    setCriteria((items) => [...items, saved]);
    setCriteriaOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          title="Catalog Management"
          description="Quan ly domain va skill dung cho job, staff specialization va ho so chuyen gia."
          actions={
            tab === "criteria" ? (
              <Button onClick={beginCreateCriteria}>
                <Plus className="h-4 w-4" /> Create criteria
              </Button>
            ) : (
              <Button
                onClick={tab === "domains" ? beginCreate : beginCreateSkill}
              >
                <Plus className="h-4 w-4" />{" "}
                {tab === "domains" ? "Create domain" : "Create skill"}
              </Button>
            )
          }
        />
      </div>
      <Card className="flex flex-wrap gap-2 p-3">
        <Button
          variant={tab === "domains" ? "primary" : "secondary"}
          onClick={() => setTab("domains")}
        >
          Domains
        </Button>
        <Button
          variant={tab === "skills" ? "primary" : "secondary"}
          onClick={() => setTab("skills")}
        >
          Skills
        </Button>
        <Button
          variant={tab === "criteria" ? "primary" : "secondary"}
          onClick={() => setTab("criteria")}
        >
          Acceptance criteria
        </Button>
      </Card>
      {error && (
        <Notice tone="danger" title="Khong tai duoc catalog">
          {error}
        </Notice>
      )}
      {tab === "domains" && (
        <Card className="overflow-hidden">
          <div className="grid gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3 text-left text-xs font-extrabold uppercase tracking-wide text-slate-400 md:grid-cols-[90px_220px_minmax(0,1fr)_170px_170px_110px]">
            <span>ID</span>
            <span>Code</span>
            <span>Description</span>
            <span className="text-center">Created</span>
            <span className="text-center">Updated</span>
            <span>Actions</span>
          </div>
          {loading && (
            <div className="px-5 py-6 text-sm font-bold text-slate-500">
              Dang tai domain...
            </div>
          )}
          {!loading && sortedDomains.length === 0 && (
            <div className="px-5 py-8 text-sm font-bold text-slate-500">
              Chua co domain.
            </div>
          )}
          {!loading &&
            sortedDomains.map((domain) => (
              <div
                key={domain.domainId}
                className="grid gap-3 border-b border-slate-100 px-5 py-4 text-left text-sm md:grid-cols-[90px_220px_minmax(0,1fr)_170px_170px_110px] md:items-start"
              >
                <span className="font-extrabold text-slate-500">
                  #{domain.domainId}
                </span>
                <span className="font-mono text-xs font-bold text-brand-700">
                  {domain.domainCode}
                </span>
                <div>
                  <p className="font-extrabold text-ink">{domain.domainName}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {domain.description || "Chua co mo ta"}
                  </p>
                </div>
                <DateTimeCell value={domain.createdAt} />
                <DateTimeCell value={domain.updatedAt} />
                <div className="flex flex-wrap justify-start gap-2">
                  <Button variant="secondary" onClick={() => beginEdit(domain)}>
                    Edit
                  </Button>
                </div>
              </div>
            ))}
        </Card>
      )}
      {tab === "skills" && (
        <Card className="overflow-hidden">
          <div className="grid gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3 text-left text-xs font-extrabold uppercase tracking-wide text-slate-400 md:grid-cols-[90px_220px_minmax(0,1fr)_170px_170px_110px]">
            <span>ID</span>
            <span>Code</span>
            <span>Description</span>
            <span className="text-center">Created</span>
            <span className="text-center">Updated</span>
            <span>Actions</span>
          </div>
          {loading && (
            <div className="px-5 py-6 text-sm font-bold text-slate-500">
              Dang tai skill...
            </div>
          )}
          {!loading && sortedSkills.length === 0 && (
            <div className="px-5 py-8 text-sm font-bold text-slate-500">
              Chua co skill.
            </div>
          )}
          {!loading &&
            sortedSkills.map((skill) => (
              <div
                key={skill.skillId}
                className="grid gap-3 border-b border-slate-100 px-5 py-4 text-left text-sm md:grid-cols-[90px_220px_minmax(0,1fr)_170px_170px_110px] md:items-start"
              >
                <span className="font-extrabold text-slate-500">
                  #{skill.skillId}
                </span>
                <span className="font-mono text-xs font-bold text-brand-700">
                  {skill.skillCode}
                </span>
                <div>
                  <p className="font-extrabold text-ink">{skill.skillName}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {skill.description || "Chua co mo ta"}
                  </p>
                </div>
                <DateTimeCell value={skill.createdAt} />
                <DateTimeCell value={skill.updatedAt} />
                <div className="flex flex-wrap justify-start gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => beginEditSkill(skill)}
                  >
                    Edit
                  </Button>
                </div>
              </div>
            ))}
        </Card>
      )}
      {tab === "criteria" && (
        <Card className="overflow-hidden">
          <div className="grid gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3 text-left text-xs font-extrabold uppercase tracking-wide text-slate-400 md:grid-cols-[90px_220px_minmax(0,1fr)_160px_170px_170px]">
            <span>ID</span>
            <span>Code</span>
            <span>Description</span>
            <span>Status</span>
            <span className="text-center">Created</span>
            <span className="text-center">Updated</span>
          </div>
          {loading && (
            <div className="px-5 py-6 text-sm font-bold text-slate-500">
              Dang tai acceptance criteria...
            </div>
          )}
          {!loading && sortedCriteria.length === 0 && (
            <div className="px-5 py-8 text-sm font-bold text-slate-500">
              Chua co acceptance criteria.
            </div>
          )}
          {!loading &&
            sortedCriteria.map((item) => (
              <div
                key={item.criteriaId}
                className="grid gap-3 border-b border-slate-100 px-5 py-4 text-left text-sm md:grid-cols-[90px_220px_minmax(0,1fr)_160px_170px_170px] md:items-start"
              >
                <span className="font-extrabold text-slate-500">
                  #{item.criteriaId}
                </span>
                <span className="font-mono text-xs font-bold text-brand-700">
                  {item.criteriaCode}
                </span>
                <p className="text-sm font-semibold leading-6 text-slate-600">
                  {item.description}
                </p>
                <div className="flex justify-start">
                  <Badge tone={item.isActive ? "mint" : "rose"}>
                    {item.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <DateTimeCell value={item.createdAt} />
                <DateTimeCell value={item.updatedAt} />
              </div>
            ))}
        </Card>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Update domain" : "Create domain"}
        description="Domain code se duoc backend chuan hoa thanh chu in hoa va dau gach duoi."
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveDomain}>
              <Save className="h-4 w-4" /> Save
            </Button>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Domain code">
            <Input
              value={form.domainCode}
              onChange={(event) =>
                setForm((value) => ({
                  ...value,
                  domainCode: event.target.value,
                }))
              }
            />
          </Field>
          <Field label="Domain name">
            <Input
              value={form.domainName}
              onChange={(event) =>
                setForm((value) => ({
                  ...value,
                  domainName: event.target.value,
                }))
              }
            />
          </Field>
          <Field label="Description" className="md:col-span-2">
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((value) => ({
                  ...value,
                  description: event.target.value,
                }))
              }
              rows={4}
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none transition focus:border-brand-200 focus:ring-4 focus:ring-brand-50"
            />
          </Field>
        </div>
      </Modal>
      <Modal
        open={skillOpen}
        onClose={() => setSkillOpen(false)}
        title={editingSkill ? "Update skill" : "Create skill"}
        description="Skill code se duoc backend chuan hoa thanh chu in hoa va dau gach duoi."
        footer={
          <>
            <Button variant="secondary" onClick={() => setSkillOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveSkill}>
              <Save className="h-4 w-4" /> Save
            </Button>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Skill code">
            <Input
              value={skillForm.skillCode}
              onChange={(event) =>
                setSkillForm((value) => ({
                  ...value,
                  skillCode: event.target.value,
                }))
              }
            />
          </Field>
          <Field label="Skill name">
            <Input
              value={skillForm.skillName}
              onChange={(event) =>
                setSkillForm((value) => ({
                  ...value,
                  skillName: event.target.value,
                }))
              }
            />
          </Field>
          <Field label="Description" className="md:col-span-2">
            <textarea
              value={skillForm.description}
              onChange={(event) =>
                setSkillForm((value) => ({
                  ...value,
                  description: event.target.value,
                }))
              }
              rows={4}
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none transition focus:border-brand-200 focus:ring-4 focus:ring-brand-50"
            />
          </Field>
        </div>
      </Modal>
      <Modal
        open={criteriaOpen}
        onClose={() => setCriteriaOpen(false)}
        title="Create acceptance criteria"
        description="Criteria code se duoc backend chuan hoa thanh chu in hoa va dau gach duoi."
        footer={
          <>
            <Button variant="secondary" onClick={() => setCriteriaOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveCriteria}>
              <Save className="h-4 w-4" /> Save
            </Button>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Criteria code">
            <Input
              value={criteriaForm.criteriaCode}
              onChange={(event) =>
                setCriteriaForm((value) => ({
                  ...value,
                  criteriaCode: event.target.value,
                }))
              }
            />
          </Field>
          <Field label="Status">
            <select
              value={criteriaForm.isActive ? "active" : "inactive"}
              onChange={(event) =>
                setCriteriaForm((value) => ({
                  ...value,
                  isActive: event.target.value === "active",
                }))
              }
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </Field>
          <Field label="Description" className="md:col-span-2">
            <textarea
              value={criteriaForm.description}
              onChange={(event) =>
                setCriteriaForm((value) => ({
                  ...value,
                  description: event.target.value,
                }))
              }
              rows={5}
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none transition focus:border-brand-200 focus:ring-4 focus:ring-brand-50"
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}

export function AuditLogsPage() {
  const [tab, setTab] =
    useState<NonNullable<AuditLog["actorGroup"]>>("EXTERNAL");
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(
    async (actorGroup = tab) => {
      setLoading(true);
      setError("");
      try {
        setLogs(await adminApi.auditLogs(actorGroup));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Không tải được audit log.",
        );
      } finally {
        setLoading(false);
      }
    },
    [tab],
  );

  useEffect(() => {
    queueMicrotask(() => {
      void load(tab);
    });
  }, [load, tab]);

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          title="Nhật ký audit"
          description="Admin theo dõi các thao tác quan trọng của tài khoản nội bộ và tài khoản bên ngoài."
        />
      </div>
      <Card className="overflow-hidden">
        <div className="flex flex-wrap gap-2 border-b border-slate-100 bg-white px-5 py-4">
          <Button
            variant={tab === "INTERNAL" ? "primary" : "secondary"}
            onClick={() => setTab("INTERNAL")}
          >
            Nội bộ
          </Button>
          <Button
            variant={tab === "EXTERNAL" ? "primary" : "secondary"}
            onClick={() => setTab("EXTERNAL")}
          >
            Bên ngoài
          </Button>
          <Button variant="ghost" onClick={() => load()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
        </div>
        <div className="grid border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-extrabold uppercase tracking-wide text-slate-400 md:grid-cols-[150px_1.1fr_1.2fr_1fr]">
          <span>Thời gian</span>
          <span>Hành động</span>
          <span>Đối tượng</span>
          <span>Người thực hiện</span>
        </div>
        {error && (
          <div className="px-5 py-4">
            <Notice tone="danger" title="Không tải được audit log">
              {error}
            </Notice>
          </div>
        )}
        {loading && (
          <div className="px-5 py-6 text-sm font-bold text-slate-500">
            Đang tải audit log...
          </div>
        )}
        {!loading && !error && logs.length === 0 && (
          <div className="px-5 py-8 text-sm font-bold text-slate-500">
            Chưa có audit log cho nhóm này.
          </div>
        )}
        {!loading &&
          !error &&
          logs.map((log) => {
            const timestamp = formatAuditTimestamp(log.createdAt);
            return (
              <div
                key={log.logId}
                className="grid gap-3 border-b border-slate-100 px-5 py-4 text-sm md:grid-cols-[150px_1.1fr_1.2fr_1fr] md:items-center"
              >
                <div className="space-y-1">
                  <p className="font-bold text-slate-600">{timestamp.date}</p>
                  <p className="text-xs font-semibold text-slate-400">
                    {timestamp.time}
                  </p>
                </div>
                <span className="font-extrabold text-ink">{log.action}</span>
                <div className="space-y-1">
                  <p className="font-extrabold text-ink">
                    {log.entityDisplayName ||
                      `${log.entityName} ${log.entityId ? `#${log.entityId}` : ""}`}
                  </p>
                  <p className="text-xs font-semibold text-slate-500">
                    {log.entityName} {log.entityId ? `#${log.entityId}` : ""}
                  </p>
                  <div className="space-y-1 pt-1">
                    <p className="font-bold text-slate-700">
                      {log.entityOwner || "Chưa xác dịnh tài khoản"}
                    </p>
                    <p className="break-all text-xs text-slate-500">
                      {log.entityOwnerEmail || "Không có email"}
                    </p>
                    {log.entityOwnerRole ? (
                      <Badge
                        tone={
                          log.entityOwnerRole === "ADMIN"
                            ? "rose"
                            : log.entityOwnerRole === "STAFF"
                              ? "amber"
                              : "brand"
                        }
                      >
                        {log.entityOwnerRole}
                      </Badge>
                    ) : (
                      <Badge tone="slate">Không có role</Badge>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="font-extrabold text-ink">{log.actor}</p>
                  <p className="break-all text-xs text-slate-500">
                    {log.actorEmail || "Không có email"}
                  </p>
                  {log.actorRole && (
                    <Badge
                      tone={
                        log.actorRole === "ADMIN"
                          ? "rose"
                          : log.actorRole === "STAFF"
                            ? "amber"
                            : "brand"
                      }
                    >
                      {log.actorRole}
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
      </Card>
    </div>
  );
}

export function ReportsPage() {
  const [range, setRange] = useState("month");
  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          title="Reports & Export"
          description="Giao diện xuất báo cáo tuần/tháng/quý. API export hiện chưa có, UI giữ đủ filter và preview."
          actions={
            <Button>
              <Download className="h-4 w-4" /> Xuất báo cáo
            </Button>
          }
        />
      </div>
      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <Card className="p-6">
          <SectionHeading title="Bộ lọc báo cáo" />
          <div className="mt-5 grid gap-4">
            <Field label="Chu kỳ">
              <select
                value={range}
                onChange={(event) => setRange(event.target.value)}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none"
              >
                <option value="week">Tuần</option>
                <option value="month">Tháng</option>
                <option value="quarter">Quý</option>
              </select>
            </Field>
            <Field label="Từ ngày">
              <Input type="date" defaultValue="2026-06-01" />
            </Field>
            <Field label="Đến ngày">
              <Input type="date" defaultValue="2026-06-30" />
            </Field>
          </div>
        </Card>
        <Card className="p-6">
          <SectionHeading
            title="Preview báo cáo"
            description="Các chỉ số hiện lấy từ API live đang có; báo cáo theo chu kỳ cần bổ sung endpoint tổng hợp."
          />
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              [
                "Doanh thu phí sàn",
                "1.24 tỷ",
                <WalletCards className="h-5 w-5" />,
              ],
              ["Hợp đồng hoàn tất", "32", <FileText className="h-5 w-5" />],
              ["Dispute phát sinh", "5", <ShieldAlert className="h-5 w-5" />],
              ["Ticket staff xử lý", "18", <ReceiptText className="h-5 w-5" />],
            ].map(([label, value, icon]) => (
              <div key={String(label)} className="rounded-3xl bg-slate-50 p-5">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-brand-600 shadow-sm">
                  {icon}
                </span>
                <p className="mt-4 text-sm font-bold text-slate-500">{label}</p>
                <p className="mt-1 font-display text-2xl font-black text-ink">
                  {value}
                </p>
              </div>
            ))}
          </div>
          <Notice tone="info" title="Export engine" className="mt-5">
            Có thể nối ExcelJS/SheetJS hoặc API server-side export ở phase sau.
          </Notice>
        </Card>
      </div>
    </div>
  );
}

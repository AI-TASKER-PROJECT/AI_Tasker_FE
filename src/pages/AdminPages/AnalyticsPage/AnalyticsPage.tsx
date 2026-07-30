import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Field,
  Input,
  Notice,
  PageHeader,
  SectionHeading,
} from "../../../components/ui";
import { adminApi } from "../../../lib/api";
import { formatCompactCurrency, formatCurrency } from "../../../lib/utils";
import { contractApi } from "../../../services";
import type {
  AdminAccount,
  Contract,
  DashboardBreakdownItem,
  DashboardContractsResponse,
  DashboardDisputesResponse,
  DashboardJobsProposalsResponse,
  DashboardMembershipResponse,
  DashboardSummaryResponse,
  DashboardTimeSeriesPoint,
  DashboardUsersResponse,
  WalletTransaction,
} from "../../../types";
import { Funnel } from "../AdminPages.shared";

type DashboardTab = "revenue" | "marketplace" | "users" | "risk";

type DashboardState = {
  summary: DashboardSummaryResponse;
  contracts: DashboardContractsResponse;
  users: DashboardUsersResponse;
  jobsProposals: DashboardJobsProposalsResponse;
  disputes: DashboardDisputesResponse;
  membership: DashboardMembershipResponse;
  platformWalletTransactions: WalletTransaction[];
  contractItems: Contract[];
  accountItems: AdminAccount[];
};

type RevenueSourceKey =
  | "BUSINESS_STANDARD"
  | "BUSINESS_PLUS"
  | "BUSINESS_PREMIUM"
  | "EXPERT_STANDARD"
  | "EXPERT_PLUS"
  | "EXPERT_PREMIUM"
  | "JOB_POST_CREDIT"
  | "PROPOSAL_CREDIT";

type NormalizedRevenueSource = {
  key: RevenueSourceKey;
  label: string;
  amount: number;
  count: number;
  color: string;
  sourceIndex: number;
  percent: number;
};

type RevenueTrendRangeKey = "7d" | "30d" | "6m" | "12m";

type RevenueTrendPoint = {
  key: string;
  label: string;
  tooltipLabel: string;
  amount: number;
};

type RevenueTrend = {
  points: RevenueTrendPoint[];
  total: number;
  hasData: boolean;
  groupBy: "day" | "month";
};

const revenueSourceConfig: Array<{
  key: RevenueSourceKey;
  label: string;
  color: string;
}> = [
  {
    key: "BUSINESS_STANDARD",
    label: "Gói Business Standard",
    color: "#2563eb",
  },
  { key: "BUSINESS_PLUS", label: "Gói Business Plus", color: "#059669" },
  { key: "BUSINESS_PREMIUM", label: "Gói Business Premium", color: "#d97706" },
  { key: "EXPERT_STANDARD", label: "Gói Expert Standard", color: "#7c3aed" },
  { key: "EXPERT_PLUS", label: "Gói Expert Plus", color: "#db2777" },
  { key: "EXPERT_PREMIUM", label: "Gói Expert Premium", color: "#0891b2" },
  { key: "JOB_POST_CREDIT", label: "Gói lượt đăng bài", color: "#dc2626" },
  { key: "PROPOSAL_CREDIT", label: "Gói lượt nộp bản đề xuất", color: "#475569" },
];

const tabs: Array<{ key: DashboardTab; label: string }> = [
  { key: "revenue", label: "Doanh thu" },
  { key: "marketplace", label: "Thị trường" },
  { key: "users", label: "Người dùng" },
  { key: "risk", label: "Rủi ro" },
];

const revenueTrendRanges: Array<{
  key: RevenueTrendRangeKey;
  label: string;
  days: number;
  groupBy: "day" | "month";
}> = [
  { key: "7d", label: "7 ngày", days: 6, groupBy: "day" },
  { key: "30d", label: "30 ngày", days: 29, groupBy: "day" },
  { key: "6m", label: "6 tháng", days: 182, groupBy: "month" },
];

function todayMinus(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function displayPeriod(point: DashboardTimeSeriesPoint) {
  if (!point.periodStart) return point.period;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(point.periodStart));
}

function toSafeAmount(value: unknown) {
  const amount =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : 0;
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function normalizeRevenueBreakdownKey(value?: string) {
  return (value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_");
}

function revenueTooltip(source: NormalizedRevenueSource) {
  return `${source.label}: ${source.count} lượt mua, ${formatCurrency(source.amount)}`;
}

function percentOf(amount: number, total: number) {
  if (total <= 0) return 0;
  return (amount / total) * 100;
}

function isPostedRevenueTransaction(transaction: WalletTransaction) {
  const status = (transaction.status || "").toUpperCase();
  return status === "POSTED" || status === "SUCCESS";
}

function platformRevenueTransactionKey(transaction: WalletTransaction) {
  const type = (transaction.transactionType || "").toUpperCase();
  if (type === "MEMBERSHIP_PURCHASE") return "MEMBERSHIP_PURCHASE";
  return creditRevenueKey(transaction);
}

function isWithinDateRange(
  value: string | undefined,
  from: string,
  to: string,
) {
  if (!value) return false;
  const date = value.slice(0, 10);
  return date >= from && date <= to;
}

function creditRevenueKey(
  transaction: WalletTransaction,
): RevenueSourceKey | null {
  if ((transaction.transactionType || "").toUpperCase() !== "CREDIT_PURCHASE") {
    return null;
  }
  const text = [
    transaction.rawDescription,
    transaction.description,
    transaction.title,
    transaction.operationKey,
    transaction.referenceType,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (
    text.includes("job-post") ||
    text.includes("đăng job") ||
    text.includes("đăng bài")
  ) {
    return "JOB_POST_CREDIT";
  }
  if (
    text.includes("proposal") ||
    text.includes("nộp proposal") ||
    text.includes("bản đề xuất")
  ) {
    return "PROPOSAL_CREDIT";
  }
  return null;
}

function creditPurchaseQuantity(transaction: WalletTransaction) {
  const text = [
    transaction.rawDescription,
    transaction.description,
    transaction.title,
  ]
    .filter(Boolean)
    .join(" ");
  const match = text.match(/(?:credits:|mua)\s*(\d+)/i);
  const quantity = match ? Number(match[1]) : 1;
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
}

function normalizePlatformRevenueSources(
  membership: DashboardMembershipResponse,
  transactions: WalletTransaction[],
  from: string,
  to: string,
) {
  const amounts = new Map<RevenueSourceKey, number>(
    revenueSourceConfig.map((source) => [source.key, 0]),
  );
  const counts = new Map<RevenueSourceKey, number>(
    revenueSourceConfig.map((source) => [source.key, 0]),
  );

  for (const item of membership.packageBreakdown || []) {
    const key = normalizeRevenueBreakdownKey(
      item.key || item.label,
    ) as RevenueSourceKey;
    if (amounts.has(key)) {
      amounts.set(key, (amounts.get(key) || 0) + toSafeAmount(item.amount));
      counts.set(key, (counts.get(key) || 0) + toSafeAmount(item.count));
    }
  }

  for (const transaction of transactions || []) {
    const key = creditRevenueKey(transaction);
    if (!key) continue;
    if (!isPostedRevenueTransaction(transaction)) continue;
    if (!isWithinDateRange(transaction.createdAt, from, to)) continue;
    amounts.set(
      key,
      (amounts.get(key) || 0) + toSafeAmount(transaction.amount),
    );
    counts.set(
      key,
      (counts.get(key) || 0) + creditPurchaseQuantity(transaction),
    );
  }

  const total = Array.from(amounts.values()).reduce(
    (sum, amount) => sum + amount,
    0,
  );
  const normalized = revenueSourceConfig.map((source, sourceIndex) => {
    const amount = amounts.get(source.key) || 0;
    return {
      ...source,
      sourceIndex,
      amount,
      count: counts.get(source.key) || 0,
      percent: percentOf(amount, total),
    };
  });

  return {
    total,
    items: normalized,
    sortedItems: [...normalized].sort(
      (left, right) =>
        right.amount - left.amount || left.sourceIndex - right.sourceIndex,
    ),
  };
}

function normalizePlatformRevenueTrend(
  transactions: WalletTransaction[],
  rangeKey: RevenueTrendRangeKey,
): RevenueTrend {
  const range =
    revenueTrendRanges.find((item) => item.key === rangeKey) ||
    revenueTrendRanges[1];
  const today = parseDateOnly(new Date().toISOString()) || new Date();
  const fromDate =
    range.groupBy === "month"
      ? startOfMonth(addDays(today, -range.days))
      : addDays(today, -range.days);
  const buckets = new Map<string, RevenueTrendPoint>();

  for (
    let cursor = periodStart(fromDate, range.groupBy);
    cursor <= today;
    cursor = nextPeriod(cursor, range.groupBy)
  ) {
    const key = dateKey(cursor);
    buckets.set(key, {
      key,
      label: formatPeriodLabel(cursor, range.groupBy),
      tooltipLabel: formatTooltipDate(cursor, range.groupBy),
      amount: 0,
    });
  }

  for (const transaction of transactions || []) {
    if (!isPostedRevenueTransaction(transaction)) continue;
    if (!platformRevenueTransactionKey(transaction)) continue;
    const createdAt = parseDateOnly(transaction.createdAt);
    if (!createdAt || createdAt < fromDate || createdAt > today) continue;
    const bucket = buckets.get(dateKey(periodStart(createdAt, range.groupBy)));
    if (!bucket) continue;
    bucket.amount += toSafeAmount(transaction.amount);
  }

  const points = Array.from(buckets.values()).sort((left, right) =>
    left.key.localeCompare(right.key),
  );
  const total = points.reduce((sum, point) => sum + point.amount, 0);

  return {
    points,
    total,
    hasData: total > 0,
    groupBy: range.groupBy,
  };
}

type ProjectOutcomePoint = {
  key: string;
  label: string;
  tooltipLabel: string;
  completed: number;
  canceled: number;
};

type ProjectOutcomeTrend = {
  points: ProjectOutcomePoint[];
  totalCompleted: number;
  totalCanceled: number;
  hasData: boolean;
};

type NewUsersRangeKey = "7d" | "30d" | "6m" | "12m";

type NewUsersPoint = {
  key: string;
  label: string;
  tooltipLabel: string;
  total: number;
  business: number;
  expert: number;
};

type NewUsersTrend = {
  points: NewUsersPoint[];
  total: number;
  business: number;
  expert: number;
  hasData: boolean;
  groupBy: "day" | "month";
};

const newUsersRanges: Array<{
  key: NewUsersRangeKey;
  label: string;
  days: number;
  groupBy: "day" | "month";
}> = [
  { key: "7d", label: "7 ngày", days: 6, groupBy: "day" },
  { key: "30d", label: "30 ngày", days: 29, groupBy: "day" },
  { key: "6m", label: "6 tháng", days: 182, groupBy: "month" },
  { key: "12m", label: "12 tháng", days: 365, groupBy: "month" },
];

function parseDateOnly(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfWeek(date: Date) {
  const next = new Date(date);
  const day = next.getDay() || 7;
  next.setDate(next.getDate() - day + 1);
  return new Date(next.getFullYear(), next.getMonth(), next.getDate());
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function periodStart(date: Date, groupBy: string) {
  if (groupBy === "month") return startOfMonth(date);
  if (groupBy === "week") return startOfWeek(date);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function nextPeriod(date: Date, groupBy: string) {
  if (groupBy === "month") {
    return new Date(date.getFullYear(), date.getMonth() + 1, 1);
  }
  return addDays(date, groupBy === "week" ? 7 : 1);
}

function formatPeriodLabel(date: Date, groupBy: string) {
  if (groupBy === "month") {
    return `Tháng ${date.getMonth() + 1}`;
  }
  if (groupBy === "week") {
    return `Tuần ${Math.ceil(date.getDate() / 7)}`;
  }
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

function formatTooltipDate(date: Date, groupBy: string) {
  if (groupBy === "month") {
    return `Tháng ${date.getMonth() + 1}/${date.getFullYear()}`;
  }
  const formatted = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
  return groupBy === "week" ? `Tuần bắt đầu ${formatted}` : formatted;
}

function normalizeProjectOutcomeTrend(
  contracts: Contract[],
  from: string,
  to: string,
  groupBy: string,
): ProjectOutcomeTrend {
  const fromDate = parseDateOnly(from);
  const toDate = parseDateOnly(to);
  if (!fromDate || !toDate || fromDate > toDate) {
    return { points: [], totalCompleted: 0, totalCanceled: 0, hasData: false };
  }

  const start = periodStart(fromDate, groupBy);
  const buckets = new Map<string, ProjectOutcomePoint>();
  for (
    let cursor = start;
    cursor <= toDate;
    cursor = nextPeriod(cursor, groupBy)
  ) {
    const key = dateKey(cursor);
    buckets.set(key, {
      key,
      label: formatPeriodLabel(cursor, groupBy),
      tooltipLabel: formatTooltipDate(cursor, groupBy),
      completed: 0,
      canceled: 0,
    });
  }

  for (const contract of contracts || []) {
    const status = (contract.status || "").trim().toUpperCase();
    const isCompleted = status === "COMPLETED";
    const isCanceled = status === "TERMINATED" || status === "CANCELLED";
    if (!isCompleted && !isCanceled) continue;

    const eventDate = parseDateOnly(
      isCanceled
        ? contract.terminatedAt || contract.cancelledAt || contract.updatedAt
        : contract.updatedAt,
    );
    if (!eventDate || eventDate < fromDate || eventDate > toDate) continue;

    const bucket = buckets.get(dateKey(periodStart(eventDate, groupBy)));
    if (!bucket) continue;
    if (isCompleted) bucket.completed += 1;
    if (isCanceled) bucket.canceled += 1;
  }

  const points = Array.from(buckets.values()).sort((left, right) =>
    left.key.localeCompare(right.key),
  );
  const totalCompleted = points.reduce(
    (sum, point) => sum + point.completed,
    0,
  );
  const totalCanceled = points.reduce((sum, point) => sum + point.canceled, 0);

  return {
    points,
    totalCompleted,
    totalCanceled,
    hasData: totalCompleted + totalCanceled > 0,
  };
}

function normalizeNewUsersTrend(
  accounts: AdminAccount[],
  rangeKey: NewUsersRangeKey,
): NewUsersTrend {
  const range =
    newUsersRanges.find((item) => item.key === rangeKey) || newUsersRanges[1];
  const today = parseDateOnly(new Date().toISOString()) || new Date();
  const fromDate =
    range.groupBy === "month"
      ? startOfMonth(addDays(today, -range.days))
      : addDays(today, -range.days);
  const buckets = new Map<string, NewUsersPoint>();

  for (
    let cursor = periodStart(fromDate, range.groupBy);
    cursor <= today;
    cursor = nextPeriod(cursor, range.groupBy)
  ) {
    const key = dateKey(cursor);
    buckets.set(key, {
      key,
      label: formatPeriodLabel(cursor, range.groupBy),
      tooltipLabel: formatTooltipDate(cursor, range.groupBy),
      total: 0,
      business: 0,
      expert: 0,
    });
  }

  for (const account of accounts || []) {
    const createdAt = parseDateOnly(account.createdAt);
    if (!createdAt || createdAt < fromDate || createdAt > today) continue;
    const bucket = buckets.get(dateKey(periodStart(createdAt, range.groupBy)));
    if (!bucket) continue;
    const role = (account.role || "").toUpperCase();
    if (role === "BUSINESS") {
      bucket.business += 1;
      bucket.total += 1;
    }
    if (role === "EXPERT") {
      bucket.expert += 1;
      bucket.total += 1;
    }
  }

  const points = Array.from(buckets.values()).sort((left, right) =>
    left.key.localeCompare(right.key),
  );
  const total = points.reduce((sum, point) => sum + point.total, 0);
  const business = points.reduce((sum, point) => sum + point.business, 0);
  const expert = points.reduce((sum, point) => sum + point.expert, 0);

  return {
    points,
    total,
    business,
    expert,
    hasData: total > 0,
    groupBy: range.groupBy,
  };
}

function RevenueSkeleton() {
  return (
    <Card className="p-6">
      <div className="h-5 w-48 animate-pulse rounded-full bg-slate-100" />
      <div className="mt-3 h-4 w-80 max-w-full animate-pulse rounded-full bg-slate-100" />
      <div className="mt-8 grid gap-8 xl:grid-cols-[1.08fr_.92fr]">
        <div className="space-y-5">
          <div className="h-20 animate-pulse rounded-3xl bg-slate-100" />
          {Array.from({ length: 8 }, (_, index) => (
            <div
              key={index}
              className="h-12 animate-pulse rounded-2xl bg-slate-100"
            />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-1 2xl:grid-cols-[220px_minmax(0,1fr)]">
          <div className="h-72 animate-pulse rounded-3xl bg-slate-100" />
        </div>
      </div>
    </Card>
  );
}

function PlatformRevenueCard({
  membership,
  transactions,
  from,
  to,
  loading,
}: {
  membership: DashboardMembershipResponse;
  transactions: WalletTransaction[];
  from: string;
  to: string;
  loading: boolean;
}) {
  const revenue = useMemo(
    () => normalizePlatformRevenueSources(membership, transactions, from, to),
    [from, membership, to, transactions],
  );
  const maxAmount = Math.max(
    1,
    ...revenue.sortedItems.map((item) => item.amount),
  );
  const hasRevenue = revenue.total > 0;

  if (loading) return <RevenueSkeleton />;

  return (
    <Card className="overflow-visible p-6 md:p-7">
      <SectionHeading
        title="Doanh thu nền tảng"
        description="Doanh thu từ gói thành viên và lượt sử dụng dịch vụ."
      />

      <div className="mt-7 grid gap-8 xl:grid-cols-[1.08fr_.92fr]">
        <div className="min-w-0 space-y-6">
          <div className="rounded-3xl border border-brand-100 bg-gradient-to-br from-brand-50 to-mint-50 p-5">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-600">
              Tổng doanh thu
            </p>
            <p className="mt-2 font-display text-3xl font-black text-ink">
              {formatCurrency(revenue.total)}
            </p>
          </div>

          {!hasRevenue && (
            <Notice tone="info" title="Chưa có dữ liệu doanh thu">
              Danh sách nguồn doanh thu vẫn được giữ đủ để theo dõi khi có giao
              dịch mới.
            </Notice>
          )}

          <div className="space-y-4">
            {revenue.sortedItems.map((source, index) => (
              <div
                key={source.key}
                className="grid gap-2 rounded-2xl border border-slate-100 bg-white p-3 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card md:grid-cols-[2.25rem_minmax(9rem,13rem)_minmax(0,1fr)_9rem] md:items-center"
                title={revenueTooltip(source)}
              >
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-slate-50 text-xs font-black text-slate-500">
                  {index + 1}
                </span>
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white"
                    style={{ backgroundColor: source.color }}
                  />
                  <span className="min-w-0 truncate text-sm font-extrabold text-ink">
                    {source.label}
                  </span>
                </span>
                <div className="h-4 min-w-0 overflow-hidden rounded-full bg-slate-200 shadow-inner">
                  <div
                    className="h-full rounded-full shadow-[inset_0_1px_2px_rgba(255,255,255,.5)] transition-all duration-500 ease-out"
                    style={{
                      width: `${hasRevenue ? Math.max(2, (source.amount / maxAmount) * 100) : 0}%`,
                      backgroundColor: source.color,
                    }}
                  />
                </div>
                <span className="text-right">
                  <span className="block text-xs font-bold text-slate-400">
                    {source.count} lượt mua
                  </span>
                  <span className="block text-sm font-black text-ink">
                    {formatCurrency(source.amount)}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="min-w-0 border-slate-100 xl:border-l xl:pl-8">
          <PlatformRevenueTrendChart transactions={transactions} />
        </div>
      </div>
    </Card>
  );
}

function PlatformRevenueTrendChart({
  transactions,
}: {
  transactions: WalletTransaction[];
}) {
  const [rangeKey, setRangeKey] = useState<RevenueTrendRangeKey>("30d");
  const trend = useMemo(
    () => normalizePlatformRevenueTrend(transactions, rangeKey),
    [rangeKey, transactions],
  );
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const width = 760;
  const height = 260;
  const padding = { top: 20, right: 26, bottom: 42, left: 58 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(1, ...trend.points.map((point) => point.amount));
  const yMax = Math.max(1, Math.ceil(maxValue / 1000) * 1000);
  const yTicks = Array.from({ length: 5 }, (_, index) =>
    Math.round((yMax / 4) * index),
  );
  const visibleLabelEvery = Math.max(1, Math.ceil(trend.points.length / 7));

  const xFor = (index: number) =>
    padding.left +
    (trend.points.length <= 1
      ? chartWidth / 2
      : (chartWidth / (trend.points.length - 1)) * index);
  const yFor = (value: number) =>
    padding.top + chartHeight - (Math.max(0, value) / yMax) * chartHeight;
  const coords = trend.points.map((point, index) => ({
    x: xFor(index),
    y: yFor(point.amount),
  }));
  const smoothPath = (items: Array<{ x: number; y: number }>) => {
    if (items.length === 0) return "";
    if (items.length === 1) return `M ${items[0].x} ${items[0].y}`;
    const [first, ...rest] = items;
    let path = `M ${first.x} ${first.y}`;
    rest.forEach((point, index) => {
      const previous = items[index];
      const midX = (previous.x + point.x) / 2;
      const midY = (previous.y + point.y) / 2;
      path += ` Q ${previous.x} ${previous.y} ${midX} ${midY}`;
      if (index === rest.length - 1) {
        path += ` T ${point.x} ${point.y}`;
      }
    });
    return path;
  };
  const areaPath = (items: Array<{ x: number; y: number }>) => {
    if (items.length === 0) return "";
    const baseline = padding.top + chartHeight;
    return `${smoothPath(items)} L ${items[items.length - 1].x} ${baseline} L ${items[0].x} ${baseline} Z`;
  };
  const activePoint =
    activeIndex == null ? null : (trend.points[activeIndex] ?? null);

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-extrabold text-ink">
            Xu hướng doanh thu
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            Tổng tiền kiếm được từ các gói theo thời gian.
          </p>
          <p className="mt-3 font-display text-2xl font-black text-ink">
            {formatCurrency(trend.total)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {revenueTrendRanges.map((range) => (
            <button
              key={range.key}
              type="button"
              onClick={() => setRangeKey(range.key)}
              className={`rounded-full border px-3 py-1.5 text-xs font-extrabold transition ${
                rangeKey === range.key
                  ? "border-brand-500 bg-brand-600 text-white shadow-soft"
                  : "border-slate-200 bg-white text-slate-500 hover:border-brand-200 hover:text-brand-600"
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mt-5">
        {!trend.hasData && (
          <div className="absolute inset-x-4 top-1/2 z-10 -translate-y-1/2 rounded-2xl border border-dashed border-slate-200 bg-white/90 px-4 py-5 text-center text-sm font-semibold text-slate-400 shadow-sm">
            Chưa có dữ liệu doanh thu trong khoảng thời gian này.
          </div>
        )}
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Xu hướng doanh thu nền tảng"
          className="h-[260px] w-full overflow-visible"
          onMouseLeave={() => setActiveIndex(null)}
        >
          <defs>
            <linearGradient id="revenueTrendFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {yTicks.map((tick) => {
            const y = yFor(tick);
            return (
              <g key={tick}>
                <line
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={y}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray={tick === 0 ? "0" : "4 8"}
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 12}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-400 text-[11px] font-bold"
                >
                  {formatCompactCurrency(tick)}
                </text>
              </g>
            );
          })}

          {trend.points.map((point, index) => (
            <g key={point.key}>
              <rect
                x={
                  xFor(index) -
                  chartWidth / Math.max(trend.points.length, 1) / 2
                }
                y={padding.top}
                width={chartWidth / Math.max(trend.points.length, 1)}
                height={chartHeight}
                fill="transparent"
                onMouseEnter={() => setActiveIndex(index)}
                onFocus={() => setActiveIndex(index)}
              />
              {index % visibleLabelEvery === 0 && (
                <text
                  x={xFor(index)}
                  y={height - 14}
                  textAnchor="middle"
                  className="fill-slate-400 text-[11px] font-bold"
                >
                  {point.label}
                </text>
              )}
            </g>
          ))}

          <path d={areaPath(coords)} fill="url(#revenueTrendFill)" />
          <path
            d={smoothPath(coords)}
            fill="none"
            stroke="#2563eb"
            strokeLinecap="round"
            strokeWidth="3.5"
            className="chart-line-in"
          />

          {trend.points.map((point, index) => {
            const showPoint = trend.points.length <= 20 || activeIndex === index;
            if (!showPoint) return null;
            return (
              <circle
                key={`${point.key}-dot`}
                cx={xFor(index)}
                cy={yFor(point.amount)}
                r={activeIndex === index ? 5 : 3}
                fill="#2563eb"
                stroke="#ffffff"
                strokeWidth="2"
              />
            );
          })}

          {activePoint && (
            <line
              x1={xFor(activeIndex ?? 0)}
              x2={xFor(activeIndex ?? 0)}
              y1={padding.top}
              y2={padding.top + chartHeight}
              stroke="#cbd5e1"
              strokeDasharray="4 6"
              strokeWidth="1"
            />
          )}
        </svg>

        {activePoint && (
          <div
            className="pointer-events-none absolute top-6 z-20 min-w-60 rounded-2xl border border-slate-100 bg-white p-4 text-sm shadow-card"
            style={{
              left: `min(calc(100% - 16rem), max(1rem, ${(xFor(activeIndex ?? 0) / width) * 100}%))`,
            }}
          >
            <p className="font-extrabold text-ink">
              {activePoint.tooltipLabel}
            </p>
            <div className="mt-3 flex items-center justify-between gap-4">
              <span className="flex items-center gap-2 text-slate-600">
                <span className="h-2.5 w-2.5 rounded-full bg-brand-600" />
                Doanh thu
              </span>
              <span className="font-extrabold text-ink">
                {formatCurrency(activePoint.amount)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


function ProjectOutcomeLineChart({
  contracts,
  from,
  to,
  groupBy,
}: {
  contracts: Contract[];
  from: string;
  to: string;
  groupBy: string;
}) {
  const trend = useMemo(
    () => normalizeProjectOutcomeTrend(contracts, from, to, groupBy),
    [contracts, from, groupBy, to],
  );
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const width = 760;
  const height = 260;
  const padding = { top: 20, right: 26, bottom: 42, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(
    1,
    ...trend.points.map((point) => Math.max(point.completed, point.canceled)),
  );
  const yMax = Math.max(1, Math.ceil(maxValue));
  const yTicks = Array.from({ length: Math.min(yMax, 4) + 1 }, (_, index) =>
    Math.round((yMax / Math.min(yMax, 4)) * index),
  );
  const visibleLabelEvery = Math.max(1, Math.ceil(trend.points.length / 8));

  const xFor = (index: number) =>
    padding.left +
    (trend.points.length <= 1
      ? chartWidth / 2
      : (chartWidth / (trend.points.length - 1)) * index);
  const yFor = (value: number) =>
    padding.top + chartHeight - (Math.max(0, value) / yMax) * chartHeight;
  const coords = (field: "completed" | "canceled") =>
    trend.points.map((point, index) => ({
      x: xFor(index),
      y: yFor(point[field]),
    }));
  const smoothPath = (items: Array<{ x: number; y: number }>) => {
    if (items.length === 0) return "";
    if (items.length === 1) return `M ${items[0].x} ${items[0].y}`;
    const [first, ...rest] = items;
    let path = `M ${first.x} ${first.y}`;
    rest.forEach((point, index) => {
      const previous = items[index];
      const midX = (previous.x + point.x) / 2;
      const midY = (previous.y + point.y) / 2;
      path += ` Q ${previous.x} ${previous.y} ${midX} ${midY}`;
      if (index === rest.length - 1) {
        path += ` T ${point.x} ${point.y}`;
      }
    });
    return path;
  };
  const areaPath = (items: Array<{ x: number; y: number }>) => {
    if (items.length === 0) return "";
    const baseline = padding.top + chartHeight;
    return `${smoothPath(items)} L ${items[items.length - 1].x} ${baseline} L ${items[0].x} ${baseline} Z`;
  };
  const completedCoords = coords("completed");
  const canceledCoords = coords("canceled");
  const activePoint =
    activeIndex == null ? null : (trend.points[activeIndex] ?? null);

  return (
    <div className="mt-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <TrendSummary
            color="bg-mint-500"
            label="Dự án đã hoàn thành"
            value={trend.totalCompleted}
          />
          <TrendSummary
            color="bg-coral-500"
            label="Dự án đã hủy"
            value={trend.totalCanceled}
          />
        </div>
        <p className="text-xs font-semibold text-slate-400">
          Nhóm theo{" "}
          {groupBy === "month" ? "tháng" : groupBy === "week" ? "tuần" : "ngày"}
        </p>
      </div>

      <div className="relative rounded-3xl border border-slate-100 bg-white p-3">
        {!trend.hasData && (
          <div className="absolute inset-x-4 top-1/2 z-10 -translate-y-1/2 rounded-2xl border border-dashed border-slate-200 bg-white/90 px-4 py-5 text-center text-sm font-semibold text-slate-400 shadow-sm">
            Chưa có dữ liệu hoàn thành hoặc hủy dự án trong khoảng thời gian
            này.
          </div>
        )}
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Xu hướng hoàn thành và hủy dự án"
          className="h-[260px] w-full overflow-visible"
          onMouseLeave={() => setActiveIndex(null)}
        >
          <defs>
            <linearGradient id="completedTrendFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="canceledTrendFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {yTicks.map((tick) => {
            const y = yFor(tick);
            return (
              <g key={tick}>
                <line
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={y}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray={tick === 0 ? "0" : "4 8"}
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 12}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-400 text-[11px] font-bold"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {trend.points.map((point, index) => (
            <g key={point.key}>
              <rect
                x={
                  xFor(index) -
                  chartWidth / Math.max(trend.points.length, 1) / 2
                }
                y={padding.top}
                width={chartWidth / Math.max(trend.points.length, 1)}
                height={chartHeight}
                fill="transparent"
                onMouseEnter={() => setActiveIndex(index)}
                onFocus={() => setActiveIndex(index)}
              />
              {index % visibleLabelEvery === 0 && (
                <text
                  x={xFor(index)}
                  y={height - 14}
                  textAnchor="middle"
                  className="fill-slate-400 text-[11px] font-bold"
                >
                  {point.label}
                </text>
              )}
            </g>
          ))}

          <path d={areaPath(canceledCoords)} fill="url(#canceledTrendFill)" />
          <path d={areaPath(completedCoords)} fill="url(#completedTrendFill)" />
          <path
            d={smoothPath(completedCoords)}
            fill="none"
            stroke="#10b981"
            strokeLinecap="round"
            strokeWidth="3.5"
            className="chart-line-in"
          />
          <path
            d={smoothPath(canceledCoords)}
            fill="none"
            stroke="#f43f5e"
            strokeLinecap="round"
            strokeWidth="3.5"
            className="chart-line-in"
          />

          {trend.points.map((point, index) => {
            const showPoint =
              trend.points.length <= 20 || activeIndex === index;
            if (!showPoint) return null;
            return (
              <g key={`${point.key}-dots`}>
                <circle
                  cx={xFor(index)}
                  cy={yFor(point.completed)}
                  r={activeIndex === index ? 5 : 3}
                  fill="#10b981"
                  stroke="#ffffff"
                  strokeWidth="2"
                />
                <circle
                  cx={xFor(index)}
                  cy={yFor(point.canceled)}
                  r={activeIndex === index ? 5 : 3}
                  fill="#f43f5e"
                  stroke="#ffffff"
                  strokeWidth="2"
                />
              </g>
            );
          })}

          {activePoint && (
            <line
              x1={xFor(activeIndex ?? 0)}
              x2={xFor(activeIndex ?? 0)}
              y1={padding.top}
              y2={padding.top + chartHeight}
              stroke="#cbd5e1"
              strokeDasharray="4 6"
              strokeWidth="1"
            />
          )}
        </svg>

        {activePoint && (
          <div
            className="pointer-events-none absolute top-6 z-20 min-w-56 rounded-2xl border border-slate-100 bg-white p-4 text-sm shadow-card"
            style={{
              left: `min(calc(100% - 15rem), max(1rem, ${(xFor(activeIndex ?? 0) / width) * 100}%))`,
            }}
          >
            <p className="font-extrabold text-ink">
              {activePoint.tooltipLabel}
            </p>
            <div className="mt-3 grid gap-2">
              <TooltipRow
                color="bg-mint-500"
                label="Đã hoàn thành"
                value={activePoint.completed}
              />
              <TooltipRow
                color="bg-coral-500"
                label="Đã hủy"
                value={activePoint.canceled}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TrendSummary({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      <span className="text-xs font-bold text-slate-500">{label}</span>
      <span className="text-sm font-black text-ink">{value}</span>
    </div>
  );
}

function TooltipRow({
  color,
  label,
  value,
  unit = "dự án",
}: {
  color: string;
  label: string;
  value: number;
  unit?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-2 text-slate-600">
        <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
        {label}
      </span>
      <span className="font-extrabold text-ink">
        {value} {unit}
      </span>
    </div>
  );
}

function NewUsersTrendCard({ accounts }: { accounts: AdminAccount[] }) {
  const [rangeKey, setRangeKey] = useState<NewUsersRangeKey>("30d");
  const trend = useMemo(
    () => normalizeNewUsersTrend(accounts, rangeKey),
    [accounts, rangeKey],
  );
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const width = 760;
  const height = 230;
  const padding = { top: 18, right: 24, bottom: 38, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(
    1,
    ...trend.points.map((point) => Math.max(point.business, point.expert)),
  );
  const yMax = Math.max(1, Math.ceil(maxValue));
  const tickCount = Math.min(yMax, 4);
  const yTicks = Array.from({ length: tickCount + 1 }, (_, index) =>
    Math.round((yMax / tickCount) * index),
  );
  const visibleLabelEvery = Math.max(1, Math.ceil(trend.points.length / 8));
  const xFor = (index: number) =>
    padding.left +
    (trend.points.length <= 1
      ? chartWidth / 2
      : (chartWidth / (trend.points.length - 1)) * index);
  const yFor = (value: number) =>
    padding.top + chartHeight - (Math.max(0, value) / yMax) * chartHeight;
  const coords = (field: "business" | "expert") =>
    trend.points.map((point, index) => ({
      x: xFor(index),
      y: yFor(point[field]),
    }));
  const smoothPath = (items: Array<{ x: number; y: number }>) => {
    if (items.length === 0) return "";
    if (items.length === 1) return `M ${items[0].x} ${items[0].y}`;
    const [first, ...rest] = items;
    let path = `M ${first.x} ${first.y}`;
    rest.forEach((point, index) => {
      const previous = items[index];
      const midX = (previous.x + point.x) / 2;
      const midY = (previous.y + point.y) / 2;
      path += ` Q ${previous.x} ${previous.y} ${midX} ${midY}`;
      if (index === rest.length - 1) path += ` T ${point.x} ${point.y}`;
    });
    return path;
  };
  const areaPath = (items: Array<{ x: number; y: number }>) => {
    if (items.length === 0) return "";
    const baseline = padding.top + chartHeight;
    return `${smoothPath(items)} L ${items[items.length - 1].x} ${baseline} L ${items[0].x} ${baseline} Z`;
  };
  const businessCoords = coords("business");
  const expertCoords = coords("expert");
  const activePoint =
    activeIndex == null ? null : (trend.points[activeIndex] ?? null);

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <SectionHeading
          title="Người dùng mới"
          description="Theo dõi số tài khoản đăng ký mới trên nền tảng theo thời gian."
        />
        <div className="flex flex-wrap gap-2">
          {newUsersRanges.map((range) => (
            <Button
              key={range.key}
              type="button"
              size="sm"
              variant={rangeKey === range.key ? "primary" : "secondary"}
              onClick={() => setRangeKey(range.key)}
            >
              {range.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <TrendSummary
          color="bg-brand-500"
          label="Tổng tài khoản mới"
          value={trend.total}
        />
        <TrendSummary
          color="bg-brand-600"
          label="Business mới"
          value={trend.business}
        />
        <TrendSummary
          color="bg-mint-500"
          label="Expert mới"
          value={trend.expert}
        />
      </div>

      <div className="mt-5 rounded-3xl border border-slate-100 bg-white p-3">
        <div className="mb-2 flex flex-wrap items-center justify-end gap-3 px-2">
          <LegendDot color="bg-brand-600" label="Business mới" />
          <LegendDot color="bg-mint-500" label="Expert mới" />
        </div>
        <div className="relative">
          {!trend.hasData && (
            <div className="absolute inset-x-4 top-1/2 z-10 -translate-y-1/2 rounded-2xl border border-dashed border-slate-200 bg-white/90 px-4 py-5 text-center text-sm font-semibold text-slate-400 shadow-sm">
              Chưa có người dùng mới trong khoảng thời gian này.
            </div>
          )}
          <svg
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label="Người dùng mới theo thời gian"
            className="h-[230px] w-full overflow-visible"
            onMouseLeave={() => setActiveIndex(null)}
          >
            <defs>
              <linearGradient
                id="businessUsersFill"
                x1="0"
                x2="0"
                y1="0"
                y2="1"
              >
                <stop offset="0%" stopColor="#1767f2" stopOpacity="0.16" />
                <stop offset="100%" stopColor="#1767f2" stopOpacity="0.02" />
              </linearGradient>
              <linearGradient id="expertUsersFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.14" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {yTicks.map((tick) => {
              const y = yFor(tick);
              return (
                <g key={tick}>
                  <line
                    x1={padding.left}
                    x2={width - padding.right}
                    y1={y}
                    y2={y}
                    stroke="#e2e8f0"
                    strokeDasharray={tick === 0 ? "0" : "4 8"}
                  />
                  <text
                    x={padding.left - 12}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-slate-400 text-[11px] font-bold"
                  >
                    {tick}
                  </text>
                </g>
              );
            })}

            {trend.points.map((point, index) => (
              <g key={point.key}>
                <rect
                  x={
                    xFor(index) -
                    chartWidth / Math.max(trend.points.length, 1) / 2
                  }
                  y={padding.top}
                  width={chartWidth / Math.max(trend.points.length, 1)}
                  height={chartHeight}
                  fill="transparent"
                  onMouseEnter={() => setActiveIndex(index)}
                />
                {index % visibleLabelEvery === 0 && (
                  <text
                    x={xFor(index)}
                    y={height - 12}
                    textAnchor="middle"
                    className="fill-slate-400 text-[11px] font-bold"
                  >
                    {point.label}
                  </text>
                )}
              </g>
            ))}

            <path d={areaPath(businessCoords)} fill="url(#businessUsersFill)" />
            <path d={areaPath(expertCoords)} fill="url(#expertUsersFill)" />
            <path
              d={smoothPath(businessCoords)}
              fill="none"
              stroke="#1767f2"
              strokeLinecap="round"
              strokeWidth="3.25"
              className="chart-line-in"
            />
            <path
              d={smoothPath(expertCoords)}
              fill="none"
              stroke="#10b981"
              strokeLinecap="round"
              strokeWidth="3.25"
              className="chart-line-in"
            />

            {trend.points.map((point, index) => {
              const showPoint =
                trend.points.length <= 20 || activeIndex === index;
              if (!showPoint) return null;
              return (
                <g key={`${point.key}-dots`}>
                  <circle
                    cx={xFor(index)}
                    cy={yFor(point.business)}
                    r={activeIndex === index ? 5 : 3}
                    fill="#1767f2"
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                  <circle
                    cx={xFor(index)}
                    cy={yFor(point.expert)}
                    r={activeIndex === index ? 5 : 3}
                    fill="#10b981"
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                </g>
              );
            })}

            {activePoint && (
              <line
                x1={xFor(activeIndex ?? 0)}
                x2={xFor(activeIndex ?? 0)}
                y1={padding.top}
                y2={padding.top + chartHeight}
                stroke="#cbd5e1"
                strokeDasharray="4 6"
              />
            )}
          </svg>

          {activePoint && (
            <div
              className="pointer-events-none absolute top-4 z-20 min-w-60 rounded-2xl border border-slate-100 bg-white p-4 text-sm shadow-card"
              style={{
                left: `min(calc(100% - 16rem), max(1rem, ${(xFor(activeIndex ?? 0) / width) * 100}%))`,
              }}
            >
              <p className="font-extrabold text-ink">
                {activePoint.tooltipLabel}
              </p>
              <div className="mt-3 grid gap-2">
                <TooltipRow
                  color="bg-brand-500"
                  label="Người dùng mới"
                  value={activePoint.total}
                  unit="tài khoản"
                />
                <TooltipRow
                  color="bg-brand-600"
                  label="Business"
                  value={activePoint.business}
                  unit="tài khoản"
                />
                <TooltipRow
                  color="bg-mint-500"
                  label="Expert"
                  value={activePoint.expert}
                  unit="tài khoản"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-bold text-slate-500">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}

function RiskTrendChart({
  disputePoints,
  contractPoints,
  from,
  to,
  groupBy,
}: {
  disputePoints: DashboardTimeSeriesPoint[];
  contractPoints: DashboardTimeSeriesPoint[];
  from: string;
  to: string;
  groupBy: "day" | "week" | "month";
}) {
  if (
    disputePoints.length === 0 &&
    contractPoints.length === 0 &&
    !(groupBy === "day" && from && to)
  ) {
    return (
      <p className="py-10 text-center text-sm font-semibold text-slate-400">
        Chưa có dữ liệu trong khoảng thời gian này.
      </p>
    );
  }

  const disputeKeys = new Set(disputePoints);
  const contractKeys = new Set(contractPoints);
  const allPoints = [...contractPoints, ...disputePoints];
  const pointByStart = new Map<
    string,
    { period: string; periodStart?: string; disputes: number; contracts: number }
  >();

  allPoints.forEach((point) => {
    const key = point.periodStart || point.period;
    const current = pointByStart.get(key) || {
      period: point.period,
      periodStart: point.periodStart,
      disputes: 0,
      contracts: 0,
    };
    if (disputeKeys.has(point)) current.disputes = point.count;
    if (contractKeys.has(point)) current.contracts = point.count;
    pointByStart.set(key, current);
  });

  if (groupBy === "day" && from && to) {
    const start = parseDateOnly(from);
    const end = parseDateOnly(to);
    if (start && end) {
      for (let date = new Date(start); date <= end; date = addDays(date, 1)) {
        const key = dateKey(date);
        if (!pointByStart.has(key)) {
          pointByStart.set(key, {
            period: key,
            periodStart: key,
            disputes: 0,
            contracts: 0,
          });
        }
      }
    }
  }

  const points = Array.from(pointByStart.values())
    .sort((left, right) =>
      String(left.periodStart || left.period).localeCompare(
        String(right.periodStart || right.period),
      ),
    )
    .map((point) => ({ ...point, count: point.disputes }));
  const width = 900;
  const height = 260;
  const left = 42;
  const right = 20;
  const top = 20;
  const bottom = 42;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const maxDisputes = Math.max(1, ...points.map((point) => point.disputes));
  const plotted = points.map((point, index) => ({
    point,
    x:
      points.length === 1
        ? left + chartWidth / 2
        : left + (index / (points.length - 1)) * chartWidth,
    y: top + chartHeight - (point.disputes / maxDisputes) * chartHeight,
    rate: point.contracts > 0 ? (point.disputes / point.contracts) * 100 : null,
  }));
  const disputePath = plotted
    .map(({ x, y }, index) => `${index === 0 ? "M" : "L"} ${x} ${y}`)
    .join(" ");
  const ratePoints = plotted.filter((item) => item.rate !== null);
  const ratePath = ratePoints
    .map(
      ({ x, rate }, index) =>
        `${index === 0 ? "M" : "L"} ${x} ${
          top + chartHeight - (Math.min(100, rate || 0) / 100) * chartHeight
        }`,
    )
    .join(" ");
  const labelStep = Math.max(1, Math.ceil(points.length / 8));
  const labels = plotted.filter(
    (_, index) =>
      index === 0 || index === plotted.length - 1 || index % labelStep === 0,
  );
  const totalDisputes = points.reduce((sum, point) => sum + point.disputes, 0);
  const totalContracts = points.reduce((sum, point) => sum + point.contracts, 0);
  const overallRate =
    totalContracts > 0 ? (totalDisputes / totalContracts) * 100 : null;

  return (
    <div className="mt-6 overflow-x-auto">
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="inline-flex items-center gap-2 rounded-xl bg-brand-50 px-4 py-2 text-sm font-bold text-slate-600">
          <i className="h-2.5 w-2.5 rounded-full bg-brand-600" />
          Tổng tranh chấp <strong className="text-ink">{totalDisputes}</strong>
        </div>
        <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2 text-sm font-bold text-slate-600">
          <i className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          Tỷ lệ trung bình{" "}
          <strong className="text-ink">
            {overallRate === null ? "N/A" : `${overallRate.toFixed(1)}%`}
          </strong>
        </div>
      </div>
      <div className="mb-3 flex flex-wrap justify-end gap-4 text-xs font-bold text-slate-600">
        <span className="inline-flex items-center gap-2">
          <i className="h-3 w-3 rounded-full bg-brand-600" /> Số tranh chấp
        </span>
        <span className="inline-flex items-center gap-2">
          <i className="h-3 w-3 rounded-full bg-emerald-500" /> Tỷ lệ tranh chấp
          / hợp đồng
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-64 min-w-[720px] w-full"
        role="img"
        aria-label="Số lượng và tỷ lệ tranh chấp theo thời gian"
      >
        {[0, 1, 2, 3, 4].map((row) => {
          const value = Math.round((maxDisputes / 4) * (4 - row));
          const y = top + row * (chartHeight / 4);
          return (
            <g key={row}>
              <line
                x1={left}
                x2={width - right}
                y1={y}
                y2={y}
                stroke="#e7edf5"
                strokeDasharray="4 6"
              />
              <text
                x={left - 10}
                y={y + 4}
                textAnchor="end"
                fill="#94a3b8"
                fontSize="12"
                fontWeight="700"
              >
                {value}
              </text>
            </g>
          );
        })}
        <text
          x={left - 10}
          y={top - 4}
          textAnchor="end"
          fill="#c026d3"
          fontSize="11"
          fontWeight="700"
        >
          Số lượng
        </text>
        <text
          x={width - right + 10}
          y={top - 4}
          fill="#059669"
          fontSize="11"
          fontWeight="700"
        >
          Tỷ lệ %
        </text>
        {plotted.length > 0 && (
          <path
            d={`${disputePath} L ${plotted[plotted.length - 1].x} ${
              top + chartHeight
            } L ${plotted[0].x} ${top + chartHeight} Z`}
            fill="#c026d3"
            opacity=".08"
          />
        )}
        <path
          d={disputePath}
          fill="none"
          stroke="#c026d3"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="4"
        />
        <path
          d={ratePath}
          fill="none"
          stroke="#10b981"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="4"
        />
        {plotted.map(({ point, rate }) => (
          <g key={`${point.period}-${point.periodStart || ""}`}>
            <title>{`${point.period}: ${point.disputes} tranh chấp, ${
              rate === null ? "N/A" : `${rate.toFixed(1)}%`
            } tỷ lệ tranh chấp trên ${point.contracts} hợp đồng`}</title>
          </g>
        ))}
        {labels.map(({ point, x }) => (
          <text
            key={`label-${point.period}-${point.periodStart || ""}`}
            x={x}
            y={height - 10}
            textAnchor="middle"
            fill="#64748b"
            fontSize="12"
            fontWeight="700"
          >
            {displayPeriod(point)}
          </text>
        ))}
      </svg>
    </div>
  );
}

function DonutChart({
  items,
  amount = false,
}: {
  items: DashboardBreakdownItem[];
  amount?: boolean;
}) {
  const visible = items
    .filter((item) => (amount ? (item.amount ?? 0) : item.count) > 0)
    .slice(0, 6);
  const total = visible.reduce(
    (sum, item) => sum + (amount ? (item.amount ?? 0) : item.count),
    0,
  );
  if (visible.length === 0 || total <= 0) {
    return (
      <p className="py-10 text-center text-sm font-semibold text-slate-400">
        Chưa có dữ liệu để hiển thị.
      </p>
    );
  }

  const colors = [
    "#1767f2",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#64748b",
  ];
  const segments = visible.reduce<
    Array<{ start: number; end: number; color: string }>
  >((acc, item, index) => {
    const value = amount ? (item.amount ?? 0) : item.count;
    const start = acc[index - 1]?.end ?? 0;
    const end = start + (value / total) * 100;
    acc.push({ start, end, color: colors[index] });
    return acc;
  }, []);
  const gradient = segments
    .map((segment) => `${segment.color} ${segment.start}% ${segment.end}%`)
    .join(", ");

  return (
    <div className="grid gap-6 md:grid-cols-[180px_minmax(0,1fr)] md:items-center">
      <div
        className="mx-auto grid h-44 w-44 place-items-center rounded-full"
        style={{ background: `conic-gradient(${gradient})` }}
      >
        <div className="grid h-24 w-24 place-items-center rounded-full bg-white text-center shadow-sm">
          <span className="text-lg font-black text-ink">
            {amount ? formatCompactCurrency(total) : total}
          </span>
        </div>
      </div>
      <div className="space-y-3">
        {visible.map((item, index) => {
          const value = amount ? (item.amount ?? 0) : item.count;
          return (
            <div
              key={`${item.key}-${item.label}`}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span className="flex min-w-0 items-center gap-2 font-bold text-slate-600">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: colors[index] }}
                />
                <span className="truncate">{item.label || item.key}</span>
              </span>
              <span className="shrink-0 font-extrabold text-ink">
                {amount ? formatCompactCurrency(value) : value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AnalyticsPage() {
  const [data, setData] = useState<DashboardState | null>(null);
  const [activeTab, setActiveTab] = useState<DashboardTab>("revenue");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [from, setFrom] = useState(() => todayMinus(90));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [groupBy, setGroupBy] = useState<"day" | "week" | "month">("day");

  const params = useMemo(() => ({ from, to, groupBy }), [from, to, groupBy]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [
        summary,
        contracts,
        users,
        jobsProposals,
        disputes,
        membership,
        platformWalletTransactions,
        contractItems,
        accountItems,
      ] = await Promise.all([
        adminApi.dashboardSummary(),
        adminApi.dashboardContracts(params),
        adminApi.dashboardUsers(params),
        adminApi.dashboardJobsProposals(params),
        adminApi.dashboardDisputes(params),
        adminApi.dashboardMembership(params),
        adminApi.listPlatformWalletTransactions(),
        contractApi.listContracts(),
        adminApi.listAccounts(),
      ]);
      setData({
        summary,
        contracts,
        users,
        jobsProposals,
        disputes,
        membership,
        platformWalletTransactions,
        contractItems,
        accountItems,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không tải được dữ liệu dashboard.",
      );
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    void Promise.resolve().then(loadDashboard);
  }, [loadDashboard]);

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[linear-gradient(135deg,#ffffff_0%,#eef7ff_55%,#f7fbf5_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          title="Tổng quan vận hành"
          description="Các số liệu được gom theo nhóm để dễ đọc, không hiển thị ID nội bộ hoặc thông tin nhạy cảm."
          actions={
            <div className="flex flex-wrap gap-3">
              <Button
                variant="secondary"
                onClick={loadDashboard}
                loading={loading}
              >
                <RefreshCw className="h-4 w-4" /> Làm mới
              </Button>
            </div>
          }
        />
      </div>

      <Card className="grid gap-4 p-4 md:grid-cols-[1fr_1fr_160px_auto] md:items-end">
        <Field label="Từ ngày">
          <Input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </Field>
        <Field label="Đến ngày">
          <Input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </Field>
        <Field label="Nhóm theo">
          <select
            value={groupBy}
            onChange={(event) =>
              setGroupBy(event.target.value as "day" | "week" | "month")
            }
            className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-brand-200 focus:ring-4 focus:ring-brand-50"
          >
            <option value="day">Ngày</option>
            <option value="week">Tuần</option>
            <option value="month">Tháng</option>
          </select>
        </Field>
        <Button onClick={loadDashboard} loading={loading}>
          Áp dụng
        </Button>
      </Card>

      {error && (
        <Notice
          tone="danger"
          title={
            activeTab === "revenue"
              ? "Không thể tải dữ liệu doanh thu. Vui lòng thử lại."
              : "Không thể tải dashboard"
          }
        >
          {error}
        </Notice>
      )}

      {loading && !data ? (
        <Card className="p-8 text-center text-sm font-semibold text-slate-500">
          Đang tải dữ liệu dashboard...
        </Card>
      ) : data ? (
        <>
          <Card className="flex flex-wrap gap-2 p-3">
            {tabs.map((tab) => (
              <Button
                key={tab.key}
                variant={activeTab === tab.key ? "primary" : "secondary"}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </Button>
            ))}
          </Card>

          {activeTab === "revenue" && (
            <PlatformRevenueCard
              membership={data.membership}
              transactions={data.platformWalletTransactions}
              from={from}
              to={to}
              loading={loading}
            />
          )}

          {activeTab === "marketplace" && (
            <div className="grid gap-6">
              <Card className="p-6">
                <SectionHeading
                  title="Xu hướng hoàn thành và hủy dự án"
                  description="So sánh số dự án hoàn thành và số dự án bị hủy theo thời gian."
                />
                <ProjectOutcomeLineChart
                  contracts={data.contractItems}
                  from={from}
                  to={to}
                  groupBy={groupBy}
                />
              </Card>
            </div>
          )}

          {activeTab === "users" && (
            <div className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
              <Card className="p-6">
                <SectionHeading
                  title="Cơ cấu người dùng"
                  description="Phân bổ theo vai trò."
                />
                <div className="mt-6">
                  <DonutChart items={data.users.roleBreakdown} />
                </div>
              </Card>
              <NewUsersTrendCard accounts={data.accountItems} />
            </div>
          )}

          {activeTab === "risk" && (
            <div className="grid gap-6 xl:grid-cols-2">
              <Card className="p-6">
                <SectionHeading
                  title="Hợp đồng"
                  description="Tình trạng xử lý hợp đồng."
                />
                <div className="mt-6 space-y-5">
                  <Funnel
                    label="Đang hoạt động"
                    value={data.contracts.activeContracts}
                    max={Math.max(data.contracts.totalContracts, 1)}
                  />
                  <Funnel
                    label="Hoàn tất"
                    value={data.contracts.completedContracts}
                    max={Math.max(data.contracts.totalContracts, 1)}
                    color="mint"
                  />
                  <Funnel
                    label="Đã chấm dứt"
                    value={data.contracts.terminatedContracts}
                    max={Math.max(data.contracts.totalContracts, 1)}
                    color="coral"
                  />
                </div>
              </Card>
              <Card className="p-6">
                <SectionHeading
                  title="Tranh chấp"
                  description="Tổng quan trạng thái rủi ro."
                />
                <div className="mt-6 space-y-5">
                  <Funnel
                    label="Đang mở"
                    value={data.disputes.openDisputes}
                    max={Math.max(data.disputes.totalDisputes, 1)}
                    color="amber"
                  />
                  <Funnel
                    label="Đã xử lý"
                    value={data.disputes.resolvedDisputes}
                    max={Math.max(data.disputes.totalDisputes, 1)}
                    color="mint"
                  />
                  <Funnel
                    label="Quá SLA"
                    value={data.disputes.overdueStaffSlaDisputes}
                    max={Math.max(data.disputes.totalDisputes, 1)}
                    color="coral"
                  />
                </div>
              </Card>
              <Card className="p-6 xl:col-span-2">
                <SectionHeading
                  title="Tranh chấp phát sinh"
                  description="Số tranh chấp mới theo thời gian."
                />
                <RiskTrendChart
                  disputePoints={data.disputes.createdTrend}
                  contractPoints={data.contracts.createdTrend}
                  from={from}
                  to={to}
                  groupBy={groupBy}
                />
              </Card>
            </div>
          )}

        </>
      ) : null}
    </div>
  );
}

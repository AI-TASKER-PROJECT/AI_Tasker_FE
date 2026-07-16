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
import type {
  DashboardBreakdownItem,
  DashboardContractsResponse,
  DashboardDisputesResponse,
  DashboardFinanceBreakdownResponse,
  DashboardJobsProposalsResponse,
  DashboardMembershipResponse,
  DashboardSummaryResponse,
  DashboardTimeSeriesPoint,
  DashboardUsersResponse,
  WalletTransaction,
} from "../../../types";
import { Funnel } from "../AdminPages.shared";

type DashboardTab = "revenue" | "marketplace" | "users" | "risk" | "finance";

type DashboardState = {
  summary: DashboardSummaryResponse;
  contracts: DashboardContractsResponse;
  users: DashboardUsersResponse;
  jobsProposals: DashboardJobsProposalsResponse;
  disputes: DashboardDisputesResponse;
  membership: DashboardMembershipResponse;
  finance: DashboardFinanceBreakdownResponse;
  platformWalletTransactions: WalletTransaction[];
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
  { key: "PROPOSAL_CREDIT", label: "Gói lượt nộp proposal", color: "#475569" },
];

const tabs: Array<{ key: DashboardTab; label: string }> = [
  { key: "revenue", label: "Doanh thu" },
  { key: "marketplace", label: "Marketplace" },
  { key: "users", label: "Người dùng" },
  { key: "risk", label: "Rủi ro" },
  { key: "finance", label: "Tài chính" },
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
  if (text.includes("proposal") || text.includes("nộp proposal")) {
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
          <div className="mx-auto h-56 w-56 animate-pulse rounded-full bg-slate-100" />
          <div className="space-y-3">
            {Array.from({ length: 8 }, (_, index) => (
              <div
                key={index}
                className="h-9 animate-pulse rounded-xl bg-slate-100"
              />
            ))}
          </div>
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
  const donutRadius = 88;
  const donutStroke = 28;
  const donutCircumference = 2 * Math.PI * donutRadius;
  let donutOffset = 0;

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
          <div className="grid gap-6 md:grid-cols-[240px_minmax(0,1fr)] md:items-center xl:grid-cols-1 2xl:grid-cols-[240px_minmax(0,1fr)]">
            <div className="relative mx-auto h-60 w-60">
              <svg viewBox="0 0 240 240" className="h-full w-full -rotate-90">
                <circle
                  cx="120"
                  cy="120"
                  r={donutRadius}
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth={donutStroke}
                />
                {hasRevenue &&
                  revenue.sortedItems.map((source) => {
                    const dash =
                      (source.amount / revenue.total) * donutCircumference;
                    const segment = (
                      <circle
                        key={source.key}
                        cx="120"
                        cy="120"
                        r={donutRadius}
                        fill="none"
                        stroke={source.color}
                        strokeWidth={donutStroke}
                        strokeDasharray={`${dash} ${donutCircumference - dash}`}
                        strokeDashoffset={-donutOffset}
                        strokeLinecap={source.amount > 0 ? "round" : "butt"}
                        className="transition-all duration-500"
                      >
                        <title>{revenueTooltip(source)}</title>
                      </circle>
                    );
                    donutOffset += dash;
                    return segment;
                  })}
              </svg>
              <div className="absolute inset-0 grid place-items-center text-center">
                <div>
                  <p className="mt-1 text-lg font-black text-ink">
                    {formatCurrency(revenue.total)}
                  </p>
                </div>
              </div>
            </div>

            <div className="min-w-0 space-y-3">
              {revenue.sortedItems.map((source) => (
                <div
                  key={source.key}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-slate-50 px-3 py-2.5"
                  title={revenueTooltip(source)}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full ring-2 ring-white"
                      style={{ backgroundColor: source.color }}
                    />
                    <span className="truncate text-sm font-bold text-slate-600">
                      {source.label}
                    </span>
                  </span>
                  <span className="text-right text-sm font-black text-ink">
                    {formatCurrency(source.amount)}
                    <span className="ml-2 text-xs font-bold text-slate-400">
                      {source.percent.toFixed(1)}%
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function BarChart({
  points,
  amount = false,
}: {
  points: DashboardTimeSeriesPoint[];
  amount?: boolean;
}) {
  const max = Math.max(
    1,
    ...points.map((point) => (amount ? (point.amount ?? 0) : point.count)),
  );
  if (points.length === 0) {
    return (
      <p className="py-10 text-center text-sm font-semibold text-slate-400">
        Chưa có dữ liệu trong khoảng thời gian này.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-h-[220px] min-w-[520px] items-end gap-4 px-2">
        {points.map((point) => {
          const value = amount ? (point.amount ?? 0) : point.count;
          return (
            <div
              key={`${point.period}-${point.periodStart}`}
              className="flex w-10 shrink-0 flex-col items-center gap-2"
            >
              <div className="flex h-40 w-full items-end rounded-2xl bg-slate-50 px-2 pt-3">
                <div
                  className="w-full rounded-t-xl bg-gradient-to-t from-sky-600 to-cyan-400"
                  title={amount ? formatCompactCurrency(value) : String(value)}
                  style={{
                    height: `${Math.max(6, Math.min(100, (value / max) * 100))}%`,
                  }}
                />
              </div>
              <span className="max-w-16 truncate text-xs font-bold text-slate-500">
                {displayPeriod(point)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

  const allPoints = [...contractPoints, ...disputePoints];
  const pointByStart = new Map<string, { period: string; periodStart?: string; disputes: number; contracts: number }>();
  allPoints.forEach((point) => {
    const key = point.periodStart || point.period;
    const current = pointByStart.get(key) || {
      period: point.period,
      periodStart: point.periodStart,
      disputes: 0,
      contracts: 0,
    };
    if (disputePoints.includes(point)) current.disputes = point.count;
    if (contractPoints.includes(point)) current.contracts = point.count;
    pointByStart.set(key, current);
  });

  if (groupBy === "day" && from && to) {
    const start = new Date(`${from}T00:00:00`);
    const end = new Date(`${to}T00:00:00`);
    for (const date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const key = localDateKey(date);
      if (!pointByStart.has(key)) {
        pointByStart.set(key, { period: key, periodStart: key, disputes: 0, contracts: 0 });
      }
    }
  }

  const points = Array.from(pointByStart.values())
    .sort((a, b) => String(a.periodStart || a.period).localeCompare(String(b.periodStart || b.period)))
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
    x: points.length === 1 ? left + chartWidth / 2 : left + (index / (points.length - 1)) * chartWidth,
    y: top + chartHeight - (point.disputes / maxDisputes) * chartHeight,
    rate: point.contracts > 0 ? (point.disputes / point.contracts) * 100 : null,
  }));
  const path = plotted.map(({ x, y }, index) => `${index === 0 ? "M" : "L"} ${x} ${y}`).join(" ");
  const ratePoints = plotted.filter((item) => item.rate !== null);
  const ratePath = ratePoints
    .map(({ x, rate }, index) => `${index === 0 ? "M" : "L"} ${x} ${top + chartHeight - Math.min(100, rate || 0) / 100 * chartHeight}`)
    .join(" ");
  const labelStep = Math.max(1, Math.ceil(points.length / 8));
  const labels = plotted.filter((_, index) => index === 0 || index === plotted.length - 1 || index % labelStep === 0);
  const totalDisputes = points.reduce((sum, point) => sum + point.disputes, 0);
  const totalContracts = points.reduce((sum, point) => sum + point.contracts, 0);
  const overallRate = totalContracts > 0 ? (totalDisputes / totalContracts) * 100 : null;

  return (
    <div className="mt-6 overflow-x-auto">
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="inline-flex items-center gap-2 rounded-xl bg-brand-50 px-4 py-2 text-sm font-bold text-slate-600">
          <i className="h-2.5 w-2.5 rounded-full bg-brand-600" />
          Tổng tranh chấp <strong className="text-ink">{totalDisputes}</strong>
        </div>
        <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2 text-sm font-bold text-slate-600">
          <i className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          Tỷ lệ trung bình <strong className="text-ink">{overallRate === null ? "N/A" : `${overallRate.toFixed(1)}%`}</strong>
        </div>
      </div>
      <div className="mb-3 flex flex-wrap justify-end gap-4 text-xs font-bold text-slate-600">
        <span className="inline-flex items-center gap-2"><i className="h-3 w-3 rounded-full bg-brand-600" /> Số tranh chấp</span>
        <span className="inline-flex items-center gap-2"><i className="h-3 w-3 rounded-full bg-emerald-500" /> Tỷ lệ tranh chấp / hợp đồng</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-64 min-w-[720px] w-full" role="img" aria-label="Số lượng và tỷ lệ tranh chấp theo thời gian">
        {[0, 1, 2, 3, 4].map((row) => {
          const value = Math.round((maxDisputes / 4) * (4 - row));
          const y = top + row * (chartHeight / 4);
          return (
            <g key={row}>
              <line x1={left} x2={width - right} y1={y} y2={y} stroke="#e7edf5" strokeDasharray="4 6" />
              <text x={left - 10} y={y + 4} textAnchor="end" fill="#94a3b8" fontSize="12" fontWeight="700">{value}</text>
            </g>
          );
        })}
        <text x={left - 10} y={top - 4} textAnchor="end" fill="#c026d3" fontSize="11" fontWeight="700">Số lượng</text>
        <text x={width - right + 10} y={top - 4} fill="#059669" fontSize="11" fontWeight="700">Tỷ lệ %</text>
        <path d={`${path} L ${plotted[plotted.length - 1].x} ${top + chartHeight} L ${plotted[0].x} ${top + chartHeight} Z`} fill="#c026d3" opacity=".08" />
        <path d={path} fill="none" stroke="#c026d3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
        <path d={ratePath} fill="none" stroke="#10b981" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
        {plotted.map(({ point, rate }) => (
          <g key={`${point.period}-${point.periodStart || ""}`}>
            <title>{`${point.period}: ${point.disputes} tranh chấp, ${rate === null ? "N/A" : `${rate.toFixed(1)}%`} tỷ lệ tranh chấp trên ${point.contracts} hợp đồng`}</title>
          </g>
        ))}
        {labels.map(({ point, x }) => (
          <text key={`label-${point.period}-${point.periodStart || ""}`} x={x} y={height - 10} textAnchor="middle" fill="#64748b" fontSize="12" fontWeight="700">{displayPeriod(point)}</text>
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
        finance,
        platformWalletTransactions,
      ] = await Promise.all([
        adminApi.dashboardSummary(),
        adminApi.dashboardContracts(params),
        adminApi.dashboardUsers(params),
        adminApi.dashboardJobsProposals(params),
        adminApi.dashboardDisputes(params),
        adminApi.dashboardMembership(params),
        adminApi.dashboardFinanceBreakdown({ from, to }),
        adminApi.listPlatformWalletTransactions(),
      ]);
      setData({
        summary,
        contracts,
        users,
        jobsProposals,
        disputes,
        membership,
        finance,
        platformWalletTransactions,
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
  }, [from, params, to]);

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
            <div className="grid gap-6 xl:grid-cols-2">
              <Card className="p-6">
                <SectionHeading
                  title="Dự án và đề xuất"
                  description="Các chỉ số chính của marketplace."
                />
                <div className="mt-6 space-y-5">
                  <Funnel
                    label="Dự án đang mở"
                    value={data.jobsProposals.openJobs}
                    max={Math.max(data.jobsProposals.totalJobs, 1)}
                  />
                  <Funnel
                    label="Đề xuất được chấp nhận"
                    value={data.jobsProposals.acceptedProposals}
                    max={Math.max(data.jobsProposals.totalProposals, 1)}
                    color="mint"
                  />
                  <Funnel
                    label="Tỷ lệ chấp nhận đề xuất"
                    value={Math.round(
                      data.jobsProposals.proposalAcceptanceRatePercent,
                    )}
                    max={100}
                    color="amber"
                  />
                </div>
              </Card>
              <Card className="p-6">
                <SectionHeading
                  title="Trạng thái dự án"
                  description="Phân bổ dự án theo trạng thái."
                />
                <div className="mt-6">
                  <DonutChart items={data.jobsProposals.jobStatusBreakdown} />
                </div>
              </Card>
              <Card className="p-6 xl:col-span-2">
                <SectionHeading
                  title="Tăng trưởng dự án"
                  description="Số dự án mới theo thời gian."
                />
                <div className="mt-6">
                  <BarChart points={data.jobsProposals.jobCreatedTrend} />
                </div>
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
              <Card className="p-6">
                <SectionHeading
                  title="Người dùng mới"
                  description="Số tài khoản mới theo thời gian."
                />
                <div className="mt-6">
                  <BarChart points={data.users.newUsersTrend} />
                </div>
              </Card>
              <Card className="p-6 xl:col-span-2">
                <SectionHeading
                  title="Trạng thái tài khoản"
                  description="Tổng hợp trạng thái hồ sơ và tài khoản."
                />
                <div className="mt-6">
                  <DonutChart items={data.users.statusBreakdown} />
                </div>
              </Card>
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
                <div className="mt-6">
                  <RiskTrendChart
                    disputePoints={data.disputes.createdTrend}
                    contractPoints={data.contracts.createdTrend}
                    from={from}
                    to={to}
                    groupBy={groupBy}
                  />
                </div>
              </Card>
            </div>
          )}

          {activeTab === "finance" && (
            <div className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
              <Card className="p-6">
                <SectionHeading
                  title="Số dư hệ thống"
                  description="Tổng hợp ví nền tảng, không kèm thông tin tài khoản."
                />
                <div className="mt-6 space-y-5">
                  <Funnel
                    label="Số dư khả dụng"
                    value={data.finance.systemAvailableBalance}
                    max={Math.max(data.finance.systemCurrentBalance, 1)}
                    color="mint"
                  />
                  <Funnel
                    label="Đang giữ escrow"
                    value={data.finance.systemEscrowBalance}
                    max={Math.max(data.finance.systemCurrentBalance, 1)}
                    color="amber"
                  />
                  <Funnel
                    label="Rút tiền chờ xử lý"
                    value={data.finance.pendingWithdrawalAmount}
                    max={Math.max(data.finance.grossTransactionVolume, 1)}
                    color="coral"
                  />
                </div>
              </Card>
              <Card className="p-6">
                <SectionHeading
                  title="Cơ cấu giao dịch"
                  description="Phân bổ giá trị theo loại giao dịch."
                />
                <div className="mt-6">
                  <DonutChart
                    items={data.finance.transactionTypeBreakdown}
                    amount
                  />
                </div>
              </Card>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

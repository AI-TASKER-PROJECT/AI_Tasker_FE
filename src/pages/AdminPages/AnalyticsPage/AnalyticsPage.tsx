import {
  BriefcaseBusiness,
  Gavel,
  RefreshCw,
  Users,
  WalletCards,
} from "lucide-react";
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
import { formatCompactCurrency } from "../../../lib/utils";
import type {
  DashboardBreakdownItem,
  DashboardContractsResponse,
  DashboardDisputesResponse,
  DashboardFinanceBreakdownResponse,
  DashboardJobsProposalsResponse,
  DashboardMembershipResponse,
  DashboardSeriesResponse,
  DashboardSummaryResponse,
  DashboardTimeSeriesPoint,
  DashboardUsersResponse,
} from "../../../types";
import { AdminMetric, Funnel } from "../AdminPages.shared";

type DashboardTab = "revenue" | "marketplace" | "users" | "risk" | "finance";

type DashboardState = {
  summary: DashboardSummaryResponse;
  revenue: DashboardSeriesResponse;
  contracts: DashboardContractsResponse;
  users: DashboardUsersResponse;
  jobsProposals: DashboardJobsProposalsResponse;
  disputes: DashboardDisputesResponse;
  membership: DashboardMembershipResponse;
  finance: DashboardFinanceBreakdownResponse;
};

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
      <div className="flex min-h-[220px] min-w-[520px] items-end gap-3">
        {points.map((point) => {
          const value = amount ? (point.amount ?? 0) : point.count;
          return (
            <div
              key={`${point.period}-${point.periodStart}`}
              className="flex flex-1 flex-col items-center gap-2"
            >
              <div className="flex h-40 w-full items-end rounded-2xl bg-slate-50 px-2 pt-3">
                <div
                  className="w-full rounded-t-xl bg-gradient-to-t from-brand-600 to-mint-400"
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
  const [groupBy, setGroupBy] = useState<"day" | "week" | "month">("month");

  const params = useMemo(() => ({ from, to, groupBy }), [from, to, groupBy]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [
        summary,
        revenue,
        contracts,
        users,
        jobsProposals,
        disputes,
        membership,
        finance,
      ] = await Promise.all([
        adminApi.dashboardSummary(),
        adminApi.dashboardRevenue(params),
        adminApi.dashboardContracts(params),
        adminApi.dashboardUsers(params),
        adminApi.dashboardJobsProposals(params),
        adminApi.dashboardDisputes(params),
        adminApi.dashboardMembership(params),
        adminApi.dashboardFinanceBreakdown({ from, to }),
      ]);
      setData({
        summary,
        revenue,
        contracts,
        users,
        jobsProposals,
        disputes,
        membership,
        finance,
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
        <Notice tone="danger" title="Không thể tải dashboard">
          {error}
        </Notice>
      )}

      {loading && !data ? (
        <Card className="p-8 text-center text-sm font-semibold text-slate-500">
          Đang tải dữ liệu dashboard...
        </Card>
      ) : data ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <AdminMetric
              label="Người dùng"
              value={data.summary.totalUsers}
              icon={<Users className="h-5 w-5" />}
            />
            <AdminMetric
              label="Hồ sơ chờ duyệt"
              value={data.summary.pendingProfileReviews}
              icon={<BriefcaseBusiness className="h-5 w-5" />}
              tone="amber"
            />
            <AdminMetric
              label="Tranh chấp đang mở"
              value={data.summary.openDisputes}
              icon={<Gavel className="h-5 w-5" />}
              tone="coral"
            />
            <AdminMetric
              label="Tổng giá trị giao dịch"
              value={formatCompactCurrency(data.summary.grossTransactionVolume)}
              icon={<WalletCards className="h-5 w-5" />}
              tone="mint"
            />
          </div>

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
            <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
              <Card className="p-6">
                <SectionHeading
                  title="Xu hướng doanh thu"
                  description="Biểu đồ cột theo khoảng thời gian đã chọn."
                />
                <div className="mt-6">
                  <BarChart points={data.revenue.series} amount />
                </div>
              </Card>
              <Card className="p-6">
                <SectionHeading
                  title="Doanh thu theo nguồn"
                  description="Tỷ trọng doanh thu đã ghi nhận."
                />
                <div className="mt-6">
                  <DonutChart items={data.revenue.breakdown} amount />
                </div>
              </Card>
              <Card className="p-6 xl:col-span-2">
                <SectionHeading
                  title="Gói thành viên"
                  description="Doanh thu và lượt mua theo từng gói."
                />
                <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
                  <DonutChart items={data.membership.packageBreakdown} amount />
                  <BarChart points={data.membership.purchaseTrend} />
                </div>
              </Card>
            </div>
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
                  <BarChart points={data.disputes.createdTrend} />
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

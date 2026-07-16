import {
  AlertTriangle,
  BriefcaseBusiness,
  CheckCircle2,
  Download,
  FileText,
  Gavel,
  RefreshCw,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, Field, Input, Notice, PageHeader, Progress, SectionHeading } from "../../../components/ui";
import { adminApi } from "../../../lib/api";
import { formatCompactCurrency } from "../../../lib/utils";
import type {
  DashboardContractsResponse,
  DashboardDisputesResponse,
  DashboardFinanceBreakdownResponse,
  DashboardJobsProposalsResponse,
  DashboardMembershipResponse,
  DashboardSeriesResponse,
  DashboardTimeSeriesPoint,
} from "../../../types";
import { AdminMetric, Funnel } from "../AdminPages.shared";

type ReportData = {
  revenue: DashboardSeriesResponse;
  contracts: DashboardContractsResponse;
  jobsProposals: DashboardJobsProposalsResponse;
  disputes: DashboardDisputesResponse;
  membership: DashboardMembershipResponse;
  finance: DashboardFinanceBreakdownResponse;
};

function dateDaysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function percentage(value: number, total: number) {
  if (!total) return 0;
  return Math.min(100, Math.round((value / total) * 100));
}

function TrendChart({
  points,
  value = "amount",
  color = "bg-brand-500",
  format = (point) => String(point.amount ?? point.count ?? 0),
}: {
  points: DashboardTimeSeriesPoint[];
  value?: "amount" | "count";
  color?: string;
  format?: (point: DashboardTimeSeriesPoint) => string;
}) {
  const max = Math.max(...points.map((point) => (value === "amount" ? point.amount || 0 : point.count || 0)), 1);
  if (!points.length) return <p className="py-8 text-center text-sm font-semibold text-slate-400">Chưa có dữ liệu trong khoảng đã chọn.</p>;
  const colorMap: Record<string, string> = { "bg-brand-500": "#d4148e", "bg-emerald-400": "#34d399", "bg-violet-500": "#8b5cf6", "bg-rose-400": "#fb7185" };
  const stroke = colorMap[color] || color;
  const width = 800;
  const height = 180;
  const padding = 24;
  const plotted = points.map((point, index) => {
    const raw = value === "amount" ? point.amount || 0 : point.count || 0;
    const x = points.length === 1 ? width / 2 : padding + (index / (points.length - 1)) * (width - padding * 2);
    const y = height - 28 - (raw / max) * (height - 56);
    return { point, x, y };
  });
  const line = plotted.map(({ x, y }, index) => `${index ? "L" : "M"} ${x} ${y}`).join(" ");
  const last = plotted[plotted.length - 1];
  const area = `${line} L ${last.x} ${height - 28} L ${plotted[0].x} ${height - 28} Z`;
  return (
    <div className="mt-5">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-48 w-full" role="img" aria-label="Biểu đồ xu hướng">
        {[0, 1, 2, 3].map((row) => <line key={row} x1={padding} x2={width - padding} y1={24 + row * 40} y2={24 + row * 40} stroke="#e8edf5" strokeDasharray="4 6" />)}
        <path d={area} fill={stroke} opacity=".1" />
        <path d={line} fill="none" stroke={stroke} strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
        {plotted.map(({ point, x, y }) => <g key={`${point.period}-${point.periodStart || ""}`}><title>{`${point.period}: ${format(point)}`}</title><circle cx={x} cy={y} r="6" fill="white" stroke={stroke} strokeWidth="4" /><text x={x} y={height - 4} textAnchor="middle" fill="#94a3b8" fontSize="12" fontWeight="700">{point.period}</text></g>)}
      </svg>
    </div>
  );
}

function BreakdownList({ items }: { items: { label: string; count: number; amount?: number }[] }) {
  const max = Math.max(...items.map((item) => item.amount ?? item.count), 1);
  if (!items.length) return <p className="py-8 text-center text-sm font-semibold text-slate-400">Chưa có dữ liệu.</p>;
  return (
    <div className="mt-5 space-y-4">
      {items.map((item) => {
        const value = item.amount ?? item.count;
        return (
          <div key={item.label}>
            <div className="mb-1 flex justify-between gap-3 text-sm"><span className="truncate font-bold text-slate-600">{item.label}</span><span className="font-black text-ink">{item.amount != null ? formatCompactCurrency(item.amount) : item.count}</span></div>
            <Progress value={Math.round((value / max) * 100)} color="brand" />
          </div>
        );
      })}
    </div>
  );
}

function downloadCsv(data: ReportData, from: string, to: string) {
  const rows = [
    ["Báo cáo từ ngày", from], ["Báo cáo đến ngày", to], ["Chỉ số", "Giá trị"],
    ["Tổng hợp đồng", String(data.contracts.totalContracts)], ["Hợp đồng hoàn tất", String(data.contracts.completedContracts)],
    ["Tổng proposal", String(data.jobsProposals.totalProposals)], ["Proposal được chấp nhận", String(data.jobsProposals.acceptedProposals)],
    ["Tổng dispute", String(data.disputes.totalDisputes)], ["Dispute đang mở", String(data.disputes.openDisputes)],
    ["Tổng giao dịch", String(data.revenue.totalCount)], ["Giá trị giao dịch", String(data.revenue.totalAmount)],
    ["Doanh thu membership", String(data.membership.totalRevenue)],
  ];
  const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = `bao-cao-he-thong-${from}-${to}.csv`; link.click(); URL.revokeObjectURL(url);
}

export function ReportsPage() {
  const [report, setReport] = useState<ReportData | null>(null);
  const [range, setRange] = useState("month");
  const [fromDate, setFromDate] = useState(() => dateDaysAgo(30));
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReport = useCallback(async () => {
    setLoading(true); setError("");
    const groupBy = range === "day" || range === "custom" ? "day" : range === "week" ? "week" : "month";
    try {
      const [revenue, contracts, jobsProposals, disputes, membership, finance] = await Promise.all([
        adminApi.dashboardRevenue({ from: fromDate, to: toDate, groupBy }),
        adminApi.dashboardContracts({ from: fromDate, to: toDate, groupBy }),
        adminApi.dashboardJobsProposals({ from: fromDate, to: toDate, groupBy }),
        adminApi.dashboardDisputes({ from: fromDate, to: toDate, groupBy }),
        adminApi.dashboardMembership({ from: fromDate, to: toDate, groupBy }),
        adminApi.dashboardFinanceBreakdown({ from: fromDate, to: toDate }),
      ]);
      setReport({ revenue, contracts, jobsProposals, disputes, membership, finance });
    } catch (err) { setError(err instanceof Error ? err.message : "Không thể tải báo cáo."); }
    finally { setLoading(false); }
  }, [fromDate, range, toDate]);

  useEffect(() => { void Promise.resolve().then(loadReport); }, [loadReport]);

  const health = useMemo(() => report ? {
    completion: percentage(report.contracts.completedContracts, report.contracts.totalContracts),
    dispute: percentage(report.disputes.openDisputes, report.disputes.totalDisputes),
  } : null, [report]);

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader title="Báo cáo & xuất dữ liệu" description="Theo dõi hoạt động hệ thống theo khoảng thời gian và xuất báo cáo CSV." actions={<div className="flex flex-wrap gap-3"><Button variant="secondary" onClick={loadReport} loading={loading}><RefreshCw className="h-4 w-4" /> Làm mới</Button><Button onClick={() => report && downloadCsv(report, fromDate, toDate)} disabled={!report || loading}><Download className="h-4 w-4" /> Xuất CSV</Button></div>} />
      </div>
      <div className="space-y-6">
        <Card className="grid gap-4 p-4 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end"><div className="md:col-span-4"><SectionHeading title="Bộ lọc báo cáo" description="Chọn kỳ và khoảng thời gian cần tổng hợp." /></div><div className="grid gap-4 md:contents">
          <Field label="Chu kỳ"><select value={range} onChange={(event) => setRange(event.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-brand-400"><option value="day">Ngày</option><option value="week">Tuần</option><option value="month">Tháng</option><option value="quarter">Quý</option><option value="custom">Tùy chỉnh</option></select></Field>
          <Field label="Từ ngày"><Input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></Field>
          <Field label="Đến ngày"><Input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></Field>
          <Button variant="secondary" onClick={loadReport} loading={loading}><CheckCircle2 className="h-4 w-4" /> Áp dụng bộ lọc</Button>
          <p className="text-xs leading-5 text-slate-400">Khoảng đã chọn: {fromDate} — {toDate}</p>
        </div></Card>
        <div className="space-y-6">{error && <Notice tone="danger" title="Không thể tải báo cáo">{error}</Notice>}{loading && !report ? <Card className="p-8 text-center text-sm font-semibold text-slate-500">Đang tải dữ liệu báo cáo…</Card> : report ? <>
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4"><AdminMetric label="Tổng hợp đồng" value={report.contracts.totalContracts} icon={<BriefcaseBusiness className="h-5 w-5" />} /><AdminMetric label="Hợp đồng hoàn tất" value={report.contracts.completedContracts} icon={<FileText className="h-5 w-5" />} tone="mint" /><AdminMetric label="Tỷ lệ hoàn tất" value={`${health?.completion || 0}%`} icon={<TrendingUp className="h-5 w-5" />} tone="amber" /><AdminMetric label="Giá trị giao dịch" value={formatCompactCurrency(report.revenue.totalAmount)} icon={<WalletCards className="h-5 w-5" />} tone="brand" /></div>
          <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]"><Card className="p-6"><SectionHeading title="Hiệu quả hợp đồng" description="Phân bổ trạng thái hợp đồng trong kỳ báo cáo." /><div className="mt-6 space-y-5"><Funnel label="Tổng hợp đồng" value={report.contracts.totalContracts} max={Math.max(report.contracts.totalContracts, 1)} /><Funnel label="Hoàn tất" value={report.contracts.completedContracts} max={Math.max(report.contracts.totalContracts, 1)} color="mint" /><Funnel label="Đang hoạt động" value={report.contracts.activeContracts} max={Math.max(report.contracts.totalContracts, 1)} color="amber" /><Funnel label="Đã chấm dứt" value={report.contracts.terminatedContracts} max={Math.max(report.contracts.totalContracts, 1)} color="coral" /></div></Card><Card className="p-6"><SectionHeading title="Sức khỏe vận hành" description="Các chỉ số cần ưu tiên theo dõi." /><div className="mt-6 space-y-5"><div><div className="mb-2 flex justify-between text-sm"><span className="font-bold text-slate-600">Tỷ lệ hoàn tất</span><span className="font-black text-ink">{health?.completion}%</span></div><Progress value={health?.completion || 0} color="mint" /></div><div><div className="mb-2 flex justify-between text-sm"><span className="font-bold text-slate-600">Dispute đang mở</span><span className="font-black text-ink">{report.disputes.openDisputes}/{report.disputes.totalDisputes}</span></div><Progress value={health?.dispute || 0} color="coral" /></div><div><div className="mb-2 flex justify-between text-sm"><span className="font-bold text-slate-600">Proposal được chấp nhận</span><span className="font-black text-ink">{report.jobsProposals.acceptedProposals}/{report.jobsProposals.totalProposals}</span></div><Progress value={report.jobsProposals.proposalAcceptanceRatePercent} color="brand" /></div></div></Card></div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><AdminMetric label="Dispute đang mở" value={report.disputes.openDisputes} icon={<Gavel className="h-5 w-5" />} tone="coral" /><AdminMetric label="Tổng giao dịch" value={report.revenue.totalCount} icon={<AlertTriangle className="h-5 w-5" />} tone="amber" /><AdminMetric label="Doanh thu membership" value={formatCompactCurrency(report.membership.totalRevenue)} icon={<WalletCards className="h-5 w-5" />} tone="mint" /><AdminMetric label="Đang giữ escrow" value={formatCompactCurrency(report.finance.systemEscrowBalance)} icon={<WalletCards className="h-5 w-5" />} tone="brand" /></div>
          <div className="grid gap-6 xl:grid-cols-2"><Card className="p-6"><SectionHeading title="Doanh thu theo thời gian" description={`Tổng ${formatCompactCurrency(report.revenue.totalAmount)} trong kỳ đã chọn.`} /><TrendChart points={report.revenue.series} format={(point) => formatCompactCurrency(point.amount || 0)} /></Card><Card className="p-6"><SectionHeading title="Hợp đồng tạo mới" description="Số hợp đồng phát sinh theo từng kỳ." /><TrendChart points={report.contracts.createdTrend} value="count" color="bg-emerald-400" format={(point) => `${point.count || 0} hợp đồng`} /></Card><Card className="p-6"><SectionHeading title="Proposal" description={`${report.jobsProposals.acceptedProposals}/${report.jobsProposals.totalProposals} proposal được chấp nhận trong kỳ.`} /><TrendChart points={report.jobsProposals.proposalCreatedTrend} value="count" color="bg-violet-500" format={(point) => `${point.count || 0} proposal`} /></Card><Card className="p-6"><SectionHeading title="Dispute phát sinh" description={`${report.disputes.openDisputes} dispute đang mở.`} /><TrendChart points={report.disputes.createdTrend} value="count" color="bg-rose-400" format={(point) => `${point.count || 0} dispute`} /></Card></div>
          <div className="grid gap-6 xl:grid-cols-2"><Card className="p-6"><SectionHeading title="Giao dịch theo loại" description="Phân bổ giá trị giao dịch trong kỳ." /><BreakdownList items={report.revenue.breakdown} /></Card><Card className="p-6"><SectionHeading title="Membership theo gói" description="Doanh thu membership trong kỳ." /><BreakdownList items={report.membership.packageBreakdown} /></Card></div>
        </> : null}</div>
      </div>
    </div>
  );
}

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
import { useEffect, useMemo, useState } from "react";
import { Button, Card, Field, Input, Notice, PageHeader, Progress, SectionHeading } from "../../../components/ui";
import { adminApi } from "../../../lib/api";
import { formatCompactCurrency } from "../../../lib/utils";
import type { AnalyticsOverview } from "../../../types";
import { AdminMetric, Funnel } from "../AdminPages.shared";

const initialFrom = "2026-06-01";
const initialTo = "2026-06-30";

function percentage(value: number, total: number) {
  if (!total) return 0;
  return Math.min(100, Math.round((value / total) * 100));
}

function downloadCsv(data: AnalyticsOverview) {
  const rows = [
    ["Chỉ số", "Giá trị"],
    ["Tổng hợp đồng", String(data.totalContracts)],
    ["Hợp đồng hoàn tất", String(data.completedContracts)],
    ["Hợp đồng đã chấm dứt", String(data.terminatedContracts)],
    ["Tỷ lệ hợp đồng thành công", `${data.contractSuccessRatePercent}%`],
    ["Tổng dispute", String(data.totalDisputes)],
    ["Dispute đang mở", String(data.openDisputes)],
    ["Tổng giao dịch", String(data.totalTransactions)],
    ["Tổng giá trị giao dịch", String(data.transactionVolume)],
  ];
  const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `bao-cao-he-thong-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function ReportsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [range, setRange] = useState("month");
  const [fromDate, setFromDate] = useState(initialFrom);
  const [toDate, setToDate] = useState(initialTo);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadReport = () => {
    setLoading(true);
    setError(false);
    adminApi
      .analyticsOverview()
      .then(setAnalytics)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void Promise.resolve().then(loadReport);
  }, []);

  const health = useMemo(() => {
    if (!analytics) return null;
    return {
      completion: percentage(analytics.completedContracts, analytics.totalContracts),
      dispute: percentage(analytics.openDisputes, analytics.totalDisputes),
      success: Math.round(analytics.contractSuccessRatePercent),
    };
  }, [analytics]);

  const applyRange = () => {
    // The current API returns an all-time aggregate. Keeping this action makes the UI
    // ready for the upcoming from/to query without pretending the dates filter data yet.
    loadReport();
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          title="Báo cáo & xuất dữ liệu"
          description="Theo dõi sức khỏe vận hành, hiệu quả hợp đồng và giá trị giao dịch của toàn hệ thống."
          actions={
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={loadReport} loading={loading}>
                <RefreshCw className="h-4 w-4" /> Làm mới
              </Button>
              <Button onClick={() => analytics && downloadCsv(analytics)} disabled={!analytics || loading}>
                <Download className="h-4 w-4" /> Xuất CSV
              </Button>
            </div>
          }
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <Card className="p-6">
          <SectionHeading title="Bộ lọc báo cáo" description="Chọn kỳ muốn xem hoặc chuẩn bị khoảng thời gian cho bản API tiếp theo." />
          <div className="mt-5 grid gap-4">
            <Field label="Chu kỳ">
              <select
                value={range}
                onChange={(event) => setRange(event.target.value)}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-brand-400"
              >
                <option value="week">Tuần</option>
                <option value="month">Tháng</option>
                <option value="quarter">Quý</option>
                <option value="custom">Tùy chỉnh</option>
              </select>
            </Field>
            <Field label="Từ ngày">
              <Input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
            </Field>
            <Field label="Đến ngày">
              <Input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
            </Field>
            <Button variant="secondary" onClick={applyRange} loading={loading}>
              <CheckCircle2 className="h-4 w-4" /> Áp dụng bộ lọc
            </Button>
            <p className="text-xs leading-5 text-slate-400">Khoảng đã chọn: {fromDate} — {toDate}</p>
          </div>
        </Card>

        <div className="space-y-6">
          {error && (
            <Notice tone="danger" title="Không thể tải báo cáo">
              Vui lòng thử làm mới lại. Nếu lỗi tiếp tục xảy ra, kiểm tra API analytics của BE.
            </Notice>
          )}

          {loading && !analytics ? (
            <Card className="p-8 text-center text-sm font-semibold text-slate-500">Đang tải dữ liệu báo cáo…</Card>
          ) : analytics ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
                <AdminMetric label="Tổng hợp đồng" value={analytics.totalContracts} icon={<BriefcaseBusiness className="h-5 w-5" />} />
                <AdminMetric label="Hợp đồng hoàn tất" value={analytics.completedContracts} icon={<FileText className="h-5 w-5" />} tone="mint" />
                <AdminMetric label="Tỷ lệ thành công" value={`${analytics.contractSuccessRatePercent}%`} icon={<TrendingUp className="h-5 w-5" />} tone="amber" />
                <AdminMetric label="Giá trị giao dịch" value={formatCompactCurrency(analytics.transactionVolume)} icon={<WalletCards className="h-5 w-5" />} tone="brand" />
              </div>

              <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
                <Card className="p-6">
                  <SectionHeading title="Hiệu quả hợp đồng" description="Tỷ trọng các trạng thái chính trên tổng số hợp đồng." />
                  <div className="mt-6 space-y-5">
                    <Funnel label="Tổng hợp đồng" value={analytics.totalContracts} max={Math.max(analytics.totalContracts, 1)} />
                    <Funnel label="Hoàn tất" value={analytics.completedContracts} max={Math.max(analytics.totalContracts, 1)} color="mint" />
                    <Funnel label="Đã chấm dứt" value={analytics.terminatedContracts} max={Math.max(analytics.totalContracts, 1)} color="coral" />
                  </div>
                </Card>
                <Card className="p-6">
                  <SectionHeading title="Sức khỏe vận hành" description="Các chỉ số cần ưu tiên theo dõi." />
                  <div className="mt-6 space-y-5">
                    <div>
                      <div className="mb-2 flex justify-between text-sm"><span className="font-bold text-slate-600">Tỷ lệ thành công</span><span className="font-black text-ink">{health?.success}%</span></div>
                      <Progress value={health?.success || 0} color="mint" />
                    </div>
                    <div>
                      <div className="mb-2 flex justify-between text-sm"><span className="font-bold text-slate-600">Tỷ lệ hoàn tất</span><span className="font-black text-ink">{health?.completion}%</span></div>
                      <Progress value={health?.completion || 0} />
                    </div>
                    <div>
                      <div className="mb-2 flex justify-between text-sm"><span className="font-bold text-slate-600">Dispute đang mở</span><span className="font-black text-ink">{analytics.openDisputes}/{analytics.totalDisputes}</span></div>
                      <Progress value={health?.dispute || 0} color="coral" />
                    </div>
                  </div>
                </Card>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <AdminMetric label="Dispute đang mở" value={analytics.openDisputes} icon={<Gavel className="h-5 w-5" />} tone="coral" />
                <AdminMetric label="Tổng giao dịch" value={analytics.totalTransactions} icon={<AlertTriangle className="h-5 w-5" />} tone="amber" />
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

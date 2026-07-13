import {
  BriefcaseBusiness,
  Download,
  Gavel,
  RefreshCw,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button, Card, Notice, PageHeader, SectionHeading } from "../../../components/ui";
import { adminApi } from "../../../lib/api";
import { formatCompactCurrency } from "../../../lib/utils";
import type { AnalyticsOverview } from "../../../types";
import { AdminMetric, Funnel } from "../AdminPages.shared";

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
  const csv = rows
    .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `phan-tich-he-thong-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadAnalytics = () => {
    setLoading(true);
    setError(false);
    adminApi
      .analyticsOverview()
      .then(setAnalytics)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void Promise.resolve().then(loadAnalytics);
  }, []);

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          title="Phân tích & doanh thu"
          description="Theo dõi các chỉ số vận hành, hợp đồng, tranh chấp và giá trị giao dịch của toàn hệ thống."
          actions={
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={loadAnalytics} loading={loading}>
                <RefreshCw className="h-4 w-4" /> Làm mới
              </Button>
              <Button onClick={() => analytics && downloadCsv(analytics)} disabled={!analytics || loading}>
                <Download className="h-4 w-4" /> Xuất CSV
              </Button>
            </div>
          }
        />
      </div>

      {error && (
        <Notice tone="danger" title="Không thể tải dữ liệu phân tích">
          Vui lòng thử làm mới. Nếu lỗi tiếp tục xảy ra, cần kiểm tra trạng thái API analytics ở BE.
        </Notice>
      )}

      {loading && !analytics ? (
        <Card className="p-8 text-center text-sm font-semibold text-slate-500">Đang tải dữ liệu phân tích…</Card>
      ) : analytics ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <AdminMetric label="Tổng hợp đồng" value={analytics.totalContracts} icon={<BriefcaseBusiness className="h-5 w-5" />} />
            <AdminMetric label="Tỷ lệ thành công" value={`${analytics.contractSuccessRatePercent}%`} icon={<TrendingUp className="h-5 w-5" />} tone="mint" />
            <AdminMetric label="Dispute đang mở" value={analytics.openDisputes} icon={<Gavel className="h-5 w-5" />} tone="coral" />
            <AdminMetric label="Giá trị giao dịch" value={formatCompactCurrency(analytics.transactionVolume)} icon={<WalletCards className="h-5 w-5" />} tone="amber" />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
            <Card className="p-6">
              <SectionHeading title="Tình hình hợp đồng" description="Tỷ trọng các trạng thái trên tổng số hợp đồng." />
              <div className="mt-6 space-y-5">
                <Funnel label="Tổng hợp đồng" value={analytics.totalContracts} max={Math.max(analytics.totalContracts, 1)} />
                <Funnel label="Hoàn tất" value={analytics.completedContracts} max={Math.max(analytics.totalContracts, 1)} color="mint" />
                <Funnel label="Đã chấm dứt" value={analytics.terminatedContracts} max={Math.max(analytics.totalContracts, 1)} color="coral" />
                <Funnel label="Dispute đang mở" value={analytics.openDisputes} max={Math.max(analytics.totalDisputes, 1)} color="amber" />
              </div>
            </Card>
            <Card className="p-6">
              <SectionHeading title="Chỉ số bổ sung" description="Các số liệu tổng hợp hiện có từ hệ thống." />
              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-2xl bg-slate-50 p-4"><p className="text-sm font-bold text-slate-500">Tổng dispute</p><p className="mt-2 text-2xl font-black text-ink">{analytics.totalDisputes}</p></div>
                <div className="rounded-2xl bg-slate-50 p-4"><p className="text-sm font-bold text-slate-500">Tổng giao dịch</p><p className="mt-2 text-2xl font-black text-ink">{analytics.totalTransactions}</p></div>
                <div className="rounded-2xl bg-slate-50 p-4"><p className="text-sm font-bold text-slate-500">Hợp đồng đã chấm dứt</p><p className="mt-2 text-2xl font-black text-ink">{analytics.terminatedContracts}</p></div>
              </div>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}

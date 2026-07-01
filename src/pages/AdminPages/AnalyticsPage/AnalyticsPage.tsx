import {
  BriefcaseBusiness,
  Download,
  Gavel,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { useEffect, useState } from "react";
import { adminApi } from "../../../lib/api";
import { formatCompactCurrency } from "../../../lib/utils";
import {
  Button,
  Card,
  PageHeader,
  Progress,
  SectionHeading,
} from "../../../components/ui";
import { AdminMetric, Funnel } from "../AdminPages.shared";
import type { AnalyticsOverview } from "../../../types";

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

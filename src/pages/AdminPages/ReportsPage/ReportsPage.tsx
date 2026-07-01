import {
  Download,
  FileText,
  ReceiptText,
  ShieldAlert,
  WalletCards,
} from "lucide-react";
import { useState } from "react";
import {
  Button,
  Card,
  Field,
  Input,
  Notice,
  PageHeader,
  SectionHeading,
} from "../../../components/ui";

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

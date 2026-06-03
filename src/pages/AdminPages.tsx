import {
  BarChart3,
  BriefcaseBusiness,
  Download,
  FileText,
  Gavel,
  Plus,
  ReceiptText,
  Save,
  Settings2,
  ShieldAlert,
  TrendingUp,
  Users,
  WalletCards,
} from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  mockAuditLogs,
  mockBusinessProfiles,
  mockContracts,
  mockDisputes,
  mockJobs,
  mockReviews,
} from '../data/mock';
import { adminApi } from '../lib/api';
import { formatCompactCurrency, formatDate } from '../lib/utils';
import type { AnalyticsOverview, Staff, SystemSetting } from '../types';
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
  SearchInput,
  SectionHeading,
} from '../components/ui';

export function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  useEffect(() => {
    adminApi.analyticsOverview().then(setAnalytics);
  }, []);
  const value = analytics;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="ADM-02"
        title="Analytics & Revenue"
        description="Gọi `/api/v1/admin/analytics/overview`, hiển thị KPI và biểu đồ nhẹ bằng CSS để tránh phụ thuộc chart nặng."
        actions={<Button variant="secondary"><Download className="h-4 w-4" /> Export CSV</Button>}
      />
      {value && (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <AdminMetric label="Tổng hợp đồng" value={value.totalContracts} icon={<BriefcaseBusiness className="h-5 w-5" />} />
            <AdminMetric label="Tỷ lệ thành công" value={`${value.contractSuccessRatePercent}%`} icon={<TrendingUp className="h-5 w-5" />} tone="mint" />
            <AdminMetric label="Dispute mở" value={value.openDisputes} icon={<Gavel className="h-5 w-5" />} tone="coral" />
            <AdminMetric label="Volume" value={formatCompactCurrency(value.transactionVolume)} icon={<WalletCards className="h-5 w-5" />} tone="amber" />
          </div>
          <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
            <Card className="p-6">
              <SectionHeading title="Contract funnel" />
              <div className="mt-6 space-y-5">
                <Funnel label="Total" value={value.totalContracts} max={value.totalContracts} />
                <Funnel label="Completed" value={value.completedContracts} max={value.totalContracts} color="mint" />
                <Funnel label="Terminated/Cancelled" value={value.terminatedContracts} max={value.totalContracts} color="coral" />
                <Funnel label="Open disputes" value={value.openDisputes} max={value.totalDisputes || 1} color="amber" />
              </div>
            </Card>
            <Card className="p-6">
              <SectionHeading title="Báo cáo chu kỳ" description="UI sẵn cho lọc tuần/tháng/quý, back-end hiện chưa có query theo thời gian." />
              <div className="mt-5 grid gap-3">
                {['Tuần này', 'Tháng này', 'Quý này'].map((label, index) => (
                  <div key={label} className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-bold text-ink">{label}</span>
                      <span className="font-extrabold text-brand-600">+{12 - index * 3}%</span>
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

function AdminMetric({ label, value, icon, tone = 'brand' }: { label: string; value: string | number; icon: ReactNode; tone?: 'brand' | 'mint' | 'coral' | 'amber' }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-600',
    mint: 'bg-mint-50 text-mint-600',
    coral: 'bg-coral-50 text-coral-600',
    amber: 'bg-amber-50 text-amber-700',
  };
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-bold text-slate-500">{label}</p>
          <p className="mt-2 font-display text-2xl font-black text-ink">{value}</p>
        </div>
        <span className={`grid h-11 w-11 place-items-center rounded-2xl ${tones[tone]}`}>{icon}</span>
      </div>
    </Card>
  );
}

function Funnel({ label, value, max, color = 'brand' }: { label: string; value: number; max: number; color?: 'brand' | 'mint' | 'coral' | 'amber' }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-bold text-slate-600">{label}</span>
        <span className="font-extrabold text-ink">{value}</span>
      </div>
      <Progress value={(value / max) * 100} color={color === 'amber' ? 'coral' : color} />
    </div>
  );
}

export function StaffPage() {
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ accountId: '', specialization: 'NLP' });

  useEffect(() => {
    adminApi.listStaffs().then(setStaffs);
  }, []);

  const create = async () => {
    const staff = await adminApi.createStaff({ accountId: Number(form.accountId), specialization: form.specialization });
    setStaffs((items) => [...items, staff]);
    setOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="STF-01"
        title="Quản lý Staff"
        description="Admin tạo hồ sơ staff nội bộ và khai báo specialization để auto-routing dispute."
        actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Tạo staff</Button>}
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {staffs.map((staff) => (
          <Card key={staff.staffId} className="p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                <Users className="h-5 w-5" />
              </span>
              <div>
                <p className="font-extrabold text-ink">{staff.fullName || `Staff #${staff.staffId}`}</p>
                <p className="text-sm text-slate-500">{staff.email || `Account #${staff.accountId}`}</p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Badge tone="brand">{staff.specialization || 'General'}</Badge>
              <Badge tone="amber">{staff.activeTickets || 0} ticket</Badge>
            </div>
          </Card>
        ))}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Tạo staff" footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Hủy</Button><Button onClick={create}>Tạo</Button></>}>
        <div className="grid gap-4">
          <Field label="Account ID"><Input value={form.accountId} onChange={(event) => setForm((value) => ({ ...value, accountId: event.target.value }))} /></Field>
          <Field label="Specialization"><Input value={form.specialization} onChange={(event) => setForm((value) => ({ ...value, specialization: event.target.value }))} /></Field>
        </div>
      </Modal>
    </div>
  );
}

export function SettingsPage() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [editing, setEditing] = useState<SystemSetting | null>(null);
  const [value, setValue] = useState('');

  useEffect(() => {
    adminApi.listSettings().then(setSettings);
  }, []);

  const save = async () => {
    if (!editing) return;
    const updated = await adminApi.updateSetting(editing.settingKey, value, editing.isActive);
    setSettings((items) => items.map((item) => (item.settingKey === updated.settingKey ? updated : item)));
    setEditing(null);
  };

  const toggle = async (setting: SystemSetting) => {
    const updated = await adminApi.updateSetting(setting.settingKey, setting.settingValue, !setting.isActive);
    setSettings((items) => items.map((item) => (item.settingKey === updated.settingKey ? updated : item)));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="ADM-03"
        title="System Settings"
        description="Cấu hình phí nền tảng, SLA và auto assign staff không cần sửa code."
      />
      <div className="grid gap-4">
        {settings.map((setting) => (
          <Card key={setting.settingKey} className="p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                  <Settings2 className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-extrabold text-ink">{setting.settingKey}</p>
                  <p className="mt-1 text-sm text-slate-500">{setting.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge tone="brand">{setting.valueType}</Badge>
                    <Badge tone={setting.isActive ? 'mint' : 'rose'}>{setting.isActive ? 'Active' : 'Inactive'}</Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-2xl bg-slate-50 px-4 py-2 font-display text-lg font-black text-ink">{setting.settingValue}</span>
                <Button variant="secondary" onClick={() => { setEditing(setting); setValue(setting.settingValue); }}>Sửa</Button>
                <Button variant="ghost" onClick={() => toggle(setting)}>{setting.isActive ? 'Tắt' : 'Bật'}</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title="Cập nhật setting" footer={<><Button variant="secondary" onClick={() => setEditing(null)}>Hủy</Button><Button onClick={save}><Save className="h-4 w-4" /> Lưu</Button></>}>
        <Field label={editing?.settingKey || 'Setting'}><Input value={value} onChange={(event) => setValue(event.target.value)} /></Field>
      </Modal>
    </div>
  );
}

export function MasterDataPage() {
  const [query, setQuery] = useState('');
  const datasets = useMemo(
    () => [
      { title: 'Accounts', count: mockBusinessProfiles.length + mockStaffsCount(), status: 'UI waiting API', icon: <Users className="h-5 w-5" /> },
      { title: 'Jobs', count: mockJobs.length, status: 'GET /jobs available', icon: <BriefcaseBusiness className="h-5 w-5" /> },
      { title: 'Contracts', count: mockContracts.length, status: 'GET /contracts available', icon: <FileText className="h-5 w-5" /> },
      { title: 'Reviews', count: mockReviews.length, status: 'Review API available', icon: <BarChart3 className="h-5 w-5" /> },
      { title: 'Disputes', count: mockDisputes.length, status: 'List API waiting', icon: <Gavel className="h-5 w-5" /> },
    ],
    [],
  );
  const filtered = datasets.filter((item) => item.title.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="ADM-01"
        title="Master Data"
        description="Giao diện quản trị dữ liệu nền tảng. Một số CRUD account/job/contract/review cần bổ sung API mới."
      />
      <Card className="p-4"><SearchInput value={query} onChange={setQuery} placeholder="Tìm module dữ liệu..." /></Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((item) => (
          <Card key={item.title} className="p-5">
            <div className="flex items-start justify-between">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">{item.icon}</span>
              <Badge tone={item.status.includes('waiting') ? 'amber' : 'mint'}>{item.status}</Badge>
            </div>
            <p className="mt-5 font-display text-2xl font-black text-ink">{item.count}</p>
            <p className="mt-1 text-sm font-bold text-slate-500">{item.title}</p>
            <Button variant="secondary" className="mt-5 w-full">Mở module</Button>
          </Card>
        ))}
      </div>
      <Notice tone="warning" title="Không gọi API chưa tồn tại">
        Trang này giữ sẵn cấu trúc quản trị và audit, nhưng các thao tác CRUD đầy đủ cần back-end bổ sung endpoint.
      </Notice>
    </div>
  );
}

function mockStaffsCount() {
  return 3;
}

export function AuditLogsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="ADM-01"
        title="Audit Logs"
        description="Back-end hiện ghi audit khi duyệt hồ sơ, nhưng chưa có endpoint list audit log. UI đã chuẩn bị bảng theo schema."
      />
      <Card className="overflow-hidden">
        <div className="grid border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-extrabold uppercase tracking-wide text-slate-400 md:grid-cols-[130px_1fr_170px_120px_150px]">
          <span>Time</span><span>Action</span><span>Entity</span><span>Actor</span><span>IP</span>
        </div>
        {mockAuditLogs.map((log) => (
          <div key={log.logId} className="grid gap-3 border-b border-slate-100 px-5 py-4 text-sm md:grid-cols-[130px_1fr_170px_120px_150px]">
            <span className="text-slate-500">{formatDate(log.createdAt)}</span>
            <span className="font-extrabold text-ink">{log.action}</span>
            <span>{log.entityName} #{log.entityId}</span>
            <span>{log.actor}</span>
            <span>{log.ipAddress}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

export function ReportsPage() {
  const [range, setRange] = useState('month');
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="ADM-02"
        title="Reports & Export"
        description="Giao diện xuất báo cáo tuần/tháng/quý. API export hiện chưa có, UI giữ đủ filter và preview."
        actions={<Button><Download className="h-4 w-4" /> Xuất báo cáo</Button>}
      />
      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <Card className="p-6">
          <SectionHeading title="Bộ lọc báo cáo" />
          <div className="mt-5 grid gap-4">
            <Field label="Chu kỳ">
              <select value={range} onChange={(event) => setRange(event.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none">
                <option value="week">Tuần</option>
                <option value="month">Tháng</option>
                <option value="quarter">Quý</option>
              </select>
            </Field>
            <Field label="Từ ngày"><Input type="date" defaultValue="2026-06-01" /></Field>
            <Field label="Đến ngày"><Input type="date" defaultValue="2026-06-30" /></Field>
          </div>
        </Card>
        <Card className="p-6">
          <SectionHeading title="Preview báo cáo" description="Các chỉ số này dùng mock cho đến khi có API theo chu kỳ." />
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              ['Doanh thu phí sàn', '1.24 tỷ', <WalletCards className="h-5 w-5" />],
              ['Hợp đồng hoàn tất', '32', <FileText className="h-5 w-5" />],
              ['Dispute phát sinh', '5', <ShieldAlert className="h-5 w-5" />],
              ['Ticket staff xử lý', '18', <ReceiptText className="h-5 w-5" />],
            ].map(([label, value, icon]) => (
              <div key={String(label)} className="rounded-3xl bg-slate-50 p-5">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-brand-600 shadow-sm">{icon}</span>
                <p className="mt-4 text-sm font-bold text-slate-500">{label}</p>
                <p className="mt-1 font-display text-2xl font-black text-ink">{value}</p>
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

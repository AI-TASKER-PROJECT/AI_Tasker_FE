import { FormEvent, useState } from 'react';
import { Building2, ClipboardCheck, IdCard, Link2, Save, ShieldCheck } from 'lucide-react';
import { profileApi } from '../lib/api';
import { getSession, saveSession } from '../lib/session';
import {
  Button,
  Card,
  Field,
  Input,
  Notice,
  PageHeader,
  SectionHeading,
  StatusBadge,
  Textarea,
} from '../components/ui';

export function BusinessProfilePage() {
  const [form, setForm] = useState({
    taxCode: '',
    companyName: '',
    address: '',
    businessLicenseUrl: '',
  });
  const [status, setStatus] = useState('Chưa gửi');
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    const profile = await profileApi.upsertBusiness(form);
    setStatus(profile.kybStatus);
    const session = getSession();
    if (session) saveSession({ ...session, accountStatus: 'Pending' });
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="REG-02 / KYB"
        title="Hồ sơ xác minh doanh nghiệp"
        description="Doanh nghiệp nộp mã số thuế và giấy phép kinh doanh. Staff/Admin duyệt ở module Verifications."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="p-6">
          <form onSubmit={submit} className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Mã số thuế">
                <Input value={form.taxCode} onChange={(event) => setForm((value) => ({ ...value, taxCode: event.target.value }))} required />
              </Field>
              <Field label="Tên doanh nghiệp">
                <Input value={form.companyName} onChange={(event) => setForm((value) => ({ ...value, companyName: event.target.value }))} required />
              </Field>
            </div>
            <Field label="Địa chỉ">
              <Input value={form.address} onChange={(event) => setForm((value) => ({ ...value, address: event.target.value }))} />
            </Field>
            <Field label="URL giấy phép kinh doanh" hint="Tạm dùng URL vì back-end chưa tích hợp Firebase Storage.">
              <Input value={form.businessLicenseUrl} onChange={(event) => setForm((value) => ({ ...value, businessLicenseUrl: event.target.value }))} />
            </Field>
            <div className="flex justify-end">
              <Button type="submit" loading={loading}>
                <Save className="h-4 w-4" />
                Lưu hồ sơ
              </Button>
            </div>
          </form>
        </Card>
        <Card className="p-6">
          <SectionHeading title="Trạng thái KYB" />
          <div className="mt-5 flex items-center gap-3 rounded-3xl bg-brand-50 p-4">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-brand-600 shadow-sm">
              <Building2 className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-slate-500">Hồ sơ hiện tại</p>
              <div className="mt-1">
                <StatusBadge status={status} />
              </div>
            </div>
          </div>
          <Notice tone="warning" title="Điều kiện mở khóa giao dịch" className="mt-4">
            Back-end hiện kiểm role nhưng chưa chặn mọi giao dịch theo Approved status. UI vẫn thể hiện đúng yêu cầu nghiệp vụ để team BE bổ sung sau.
          </Notice>
        </Card>
      </div>
    </div>
  );
}

export function ExpertProfilePage() {
  const [form, setForm] = useState({
    nationalId: '',
    portfolioUrl: '',
    yearsOfExperience: '1',
  });
  const [status, setStatus] = useState('Chưa gửi');
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    const profile = await profileApi.upsertExpert({
      nationalId: form.nationalId,
      portfolioUrl: form.portfolioUrl,
      yearsOfExperience: Number(form.yearsOfExperience),
    });
    setStatus(profile.kycStatus);
    const session = getSession();
    if (session) saveSession({ ...session, accountStatus: 'Pending' });
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="REG-02 / KYC"
        title="Hồ sơ xác minh chuyên gia"
        description="Chuyên gia nộp CCCD/hộ chiếu và ảnh đối soát. Sau khi Approved mới nên mở khóa giao dịch."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="p-6">
          <form onSubmit={submit} className="grid gap-4">
            <Field label="Số CCCD / Hộ chiếu">
              <Input value={form.nationalId} onChange={(event) => setForm((value) => ({ ...value, nationalId: event.target.value }))} required />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Portfolio URL">
                <Input value={form.portfolioUrl} onChange={(event) => setForm((value) => ({ ...value, portfolioUrl: event.target.value }))} required />
              </Field>
              <Field label="Số năm kinh nghiệm">
                <Input type="number" min="0" value={form.yearsOfExperience} onChange={(event) => setForm((value) => ({ ...value, yearsOfExperience: event.target.value }))} required />
              </Field>
            </div>
            <div className="flex justify-end">
              <Button type="submit" loading={loading}>
                <ShieldCheck className="h-4 w-4" />
                Gửi xác minh
              </Button>
            </div>
          </form>
        </Card>
        <Card className="p-6">
          <SectionHeading title="Trạng thái KYC" />
          <div className="mt-5 flex items-center gap-3 rounded-3xl bg-mint-50 p-4">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-mint-600 shadow-sm">
              <IdCard className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-slate-500">Hồ sơ hiện tại</p>
              <div className="mt-1">
                <StatusBadge status={status} />
              </div>
            </div>
          </div>
          <Notice tone="info" title="Bước tiếp theo" className="mt-4">
            Hoàn thiện Portfolio AI để xuất hiện ở tab AI đề xuất của doanh nghiệp.
          </Notice>
        </Card>
      </div>
    </div>
  );
}

export function ExpertPortfolioPage() {
  const [form, setForm] = useState({
    context: '',
    dataProcessing: '',
    modelArchitecture: '',
    performanceMetrics: '',
    pocUrl: '',
  });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    await profileApi.upsertPortfolio(form);
    setSaved(true);
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="PRF-01"
        title="Portfolio năng lực AI"
        description="Bắt buộc theo mô hình 4 thành phần: bối cảnh, xử lý dữ liệu, kiến trúc mô hình và metrics."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="p-6">
          <form onSubmit={submit} className="grid gap-4">
            <Field label="1. Bối cảnh dự án">
              <Textarea value={form.context} onChange={(event) => setForm((value) => ({ ...value, context: event.target.value }))} required />
            </Field>
            <Field label="2. Xử lý dữ liệu">
              <Textarea value={form.dataProcessing} onChange={(event) => setForm((value) => ({ ...value, dataProcessing: event.target.value }))} required />
            </Field>
            <Field label="3. Kiến trúc mô hình">
              <Textarea value={form.modelArchitecture} onChange={(event) => setForm((value) => ({ ...value, modelArchitecture: event.target.value }))} required />
            </Field>
            <Field label="4. Chỉ số hiệu năng">
              <Textarea value={form.performanceMetrics} onChange={(event) => setForm((value) => ({ ...value, performanceMetrics: event.target.value }))} required />
            </Field>
            <Field label="PoC URL">
              <Input value={form.pocUrl} onChange={(event) => setForm((value) => ({ ...value, pocUrl: event.target.value }))} />
            </Field>
            <div className="flex justify-end">
              <Button type="submit" loading={loading}>
                <ClipboardCheck className="h-4 w-4" />
                Lưu portfolio
              </Button>
            </div>
          </form>
        </Card>
        <Card className="p-6">
          <SectionHeading title="Preview matching" description="Thông tin này dùng để so khớp với SoW." />
          <div className="mt-5 space-y-3">
            {['RAG', 'LLM', 'Vector DB', 'MLOps'].map((skill) => (
              <div key={skill} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                <span className="font-bold text-ink">{skill}</span>
                <span className="text-brand-600">High</span>
              </div>
            ))}
          </div>
          {saved && (
            <Notice tone="success" title="Đã lưu portfolio" className="mt-4">
              Portfolio đã sẵn sàng cho API matching hiện tại và AI matching sau này.
            </Notice>
          )}
          <div className="mt-5 flex items-center gap-2 rounded-2xl bg-brand-50 p-3 text-sm font-semibold text-brand-700">
            <Link2 className="h-4 w-4" />
            {form.pocUrl || 'Chưa có PoC URL'}
          </div>
        </Card>
      </div>
    </div>
  );
}

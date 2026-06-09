import { FormEvent, useEffect, useState } from 'react';
import { Building2, ClipboardCheck, IdCard, Link2, PencilLine, Save } from 'lucide-react';
import { profileApi } from '../lib/api';
import type { BusinessProfile, ExpertProfile } from '../types';
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

const EMPTY_PROFILE_STATUS = 'Chưa gửi';
const LOCKED_FIELD_CLASS = 'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';

const EMPTY_BUSINESS_FORM = {
  taxCode: '',
  companyName: '',
  address: '',
  businessLicenseUrl: '',
};

const EMPTY_EXPERT_FORM = {
  nationalId: '',
  portfolioUrl: '',
  yearsOfExperience: '1',
};

export function BusinessProfilePage() {
  const [form, setForm] = useState(EMPTY_BUSINESS_FORM);
  const [status, setStatus] = useState(EMPTY_PROFILE_STATUS);
  const [hasProfile, setHasProfile] = useState(false);
  const [isEditing, setIsEditing] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const profile = await profileApi.myBusinessProfile();
        if (!active) return;
        setForm(businessProfileToForm(profile));
        setStatus(profile.kybStatus || 'Approved');
        setHasProfile(true);
        setIsEditing(false);
      } catch (error) {
        if (!active) return;
        if (isNotFoundError(error)) {
          setForm(EMPTY_BUSINESS_FORM);
          setStatus(EMPTY_PROFILE_STATUS);
          setHasProfile(false);
          setIsEditing(true);
        } else {
          setMessage(profileLoadErrorMessage(error));
          setIsEditing(false);
        }
      } finally {
        if (active) setLoadingProfile(false);
      }
    }

    loadProfile();
    return () => {
      active = false;
    };
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isEditing) return;
    setLoading(true);
    setMessage('');
    try {
      const profile = await profileApi.upsertBusiness(form);
      setForm(businessProfileToForm(profile));
      setStatus(profile.kybStatus);
      setHasProfile(true);
      setIsEditing(false);
    } catch (error) {
      setMessage(businessProfileErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const fieldsDisabled = loadingProfile || !isEditing;
  const taxCodeDisabled = loadingProfile || hasProfile || !isEditing;

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
            {message && <Notice tone="danger" title={message} />}
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Mã số thuế">
                <Input
                  value={form.taxCode}
                  onChange={(event) => setForm((value) => ({ ...value, taxCode: event.target.value }))}
                  disabled={taxCodeDisabled}
                  className={LOCKED_FIELD_CLASS}
                  required
                />
              </Field>
              <Field label="Tên doanh nghiệp">
                <Input
                  value={form.companyName}
                  onChange={(event) => setForm((value) => ({ ...value, companyName: event.target.value }))}
                  disabled={fieldsDisabled}
                  className={LOCKED_FIELD_CLASS}
                  required
                />
              </Field>
            </div>
            <Field label="Địa chỉ">
              <Input
                value={form.address}
                onChange={(event) => setForm((value) => ({ ...value, address: event.target.value }))}
                disabled={fieldsDisabled}
                className={LOCKED_FIELD_CLASS}
              />
            </Field>
            <Field label="URL giấy phép kinh doanh" hint="Tạm dùng URL vì back-end chưa tích hợp Firebase Storage.">
              <Input
                value={form.businessLicenseUrl}
                onChange={(event) => setForm((value) => ({ ...value, businessLicenseUrl: event.target.value }))}
                disabled={fieldsDisabled}
                className={LOCKED_FIELD_CLASS}
              />
            </Field>
            <div className="flex justify-end gap-2">
              {hasProfile && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsEditing(true)}
                  disabled={isEditing || loading || loadingProfile}
                >
                  <PencilLine className="h-4 w-4" />
                  Sửa hồ sơ
                </Button>
              )}
              <Button type="submit" loading={loading} disabled={!isEditing || loadingProfile}>
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
              <p className="mt-1 text-xs font-semibold text-slate-500">{profileStatusLabel(status)}</p>
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

function businessProfileErrorMessage(error: unknown) {
  const apiError = error as {
    response?: { status?: number; data?: { message?: string } };
    message?: string;
  };
  const status = apiError.response?.status;
  const message = apiError.response?.data?.message || apiError.message || '';

  if (status === 409 && isTaxCodeConflict(message)) {
    return 'Mã số thuế này đã tồn tại trong hệ thống. Vui lòng kiểm tra lại hoặc dùng mã số thuế khác.';
  }
  if (status === 409) {
    return 'Thông tin hồ sơ bị trùng với dữ liệu đã có trong hệ thống.';
  }
  return message || 'Không thể lưu hồ sơ doanh nghiệp. Vui lòng thử lại.';
}

function isTaxCodeConflict(message: string) {
  const text = message.toLowerCase();
  return (
    text.includes('tax_code') ||
    text.includes('tax code') ||
    text.includes('ma so thue') ||
    text.includes('mã số thuế')
  );
}

function businessProfileToForm(profile: BusinessProfile) {
  return {
    taxCode: profile.taxCode || '',
    companyName: profile.companyName || '',
    address: profile.address || '',
    businessLicenseUrl: profile.businessLicenseUrl || '',
  };
}

function expertProfileToForm(profile: ExpertProfile) {
  return {
    nationalId: profile.nationalId || '',
    portfolioUrl: profile.portfolioUrl || '',
    yearsOfExperience:
      profile.yearsOfExperience == null ? '0' : String(profile.yearsOfExperience),
  };
}

function profileStatusLabel(status: string) {
  const normalized = status.toLowerCase();
  if (normalized.includes('approved')) return 'Đã xác minh';
  if (normalized.includes('pending')) return 'Chờ xác minh';
  if (normalized.includes('rejected')) return 'Bị từ chối';
  return 'Chưa gửi hồ sơ xác minh';
}

function isNotFoundError(error: unknown) {
  return (error as { response?: { status?: number } }).response?.status === 404;
}

function profileLoadErrorMessage(error: unknown) {
  const apiError = error as {
    response?: { data?: { message?: string } };
    message?: string;
  };
  return apiError.response?.data?.message || apiError.message || 'Không thể tải hồ sơ hiện tại.';
}

function profileSubmitErrorMessage(error: unknown, fallback: string) {
  const apiError = error as {
    response?: { data?: { message?: string } };
    message?: string;
  };
  return apiError.response?.data?.message || apiError.message || fallback;
}

export function ExpertProfilePage() {
  const [form, setForm] = useState(EMPTY_EXPERT_FORM);
  const [status, setStatus] = useState(EMPTY_PROFILE_STATUS);
  const [hasProfile, setHasProfile] = useState(false);
  const [isEditing, setIsEditing] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const profile = await profileApi.myExpertProfile();
        if (!active) return;
        setForm(expertProfileToForm(profile));
        setStatus(profile.kycStatus || 'Approved');
        setHasProfile(true);
        setIsEditing(false);
      } catch (error) {
        if (!active) return;
        if (isNotFoundError(error)) {
          setForm(EMPTY_EXPERT_FORM);
          setStatus(EMPTY_PROFILE_STATUS);
          setHasProfile(false);
          setIsEditing(true);
        } else {
          setMessage(profileLoadErrorMessage(error));
          setIsEditing(false);
        }
      } finally {
        if (active) setLoadingProfile(false);
      }
    }

    loadProfile();
    return () => {
      active = false;
    };
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isEditing) return;
    setLoading(true);
    setMessage('');
    try {
      const profile = await profileApi.upsertExpert({
        nationalId: form.nationalId,
        portfolioUrl: form.portfolioUrl,
        yearsOfExperience: Number(form.yearsOfExperience),
      });
      setForm(expertProfileToForm(profile));
      setStatus(profile.kycStatus);
      setHasProfile(true);
      setIsEditing(false);
    } catch (error) {
      setMessage(profileSubmitErrorMessage(error, 'Không thể lưu hồ sơ chuyên gia. Vui lòng thử lại.'));
    } finally {
      setLoading(false);
    }
  };

  const fieldsDisabled = loadingProfile || !isEditing;
  const nationalIdDisabled = loadingProfile || hasProfile || !isEditing;

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
            {message && <Notice tone="danger" title={message} />}
            <Field label="Số CCCD / Hộ chiếu">
              <Input
                value={form.nationalId}
                onChange={(event) => setForm((value) => ({ ...value, nationalId: event.target.value }))}
                disabled={nationalIdDisabled}
                className={LOCKED_FIELD_CLASS}
                required
              />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Portfolio URL">
                <Input
                  value={form.portfolioUrl}
                  onChange={(event) => setForm((value) => ({ ...value, portfolioUrl: event.target.value }))}
                  disabled={fieldsDisabled}
                  className={LOCKED_FIELD_CLASS}
                  required
                />
              </Field>
              <Field label="Số năm kinh nghiệm">
                <Input
                  type="number"
                  min="0"
                  value={form.yearsOfExperience}
                  onChange={(event) => setForm((value) => ({ ...value, yearsOfExperience: event.target.value }))}
                  disabled={fieldsDisabled}
                  className={LOCKED_FIELD_CLASS}
                  required
                />
              </Field>
            </div>
            <div className="flex justify-end gap-2">
              {hasProfile && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsEditing(true)}
                  disabled={isEditing || loading || loadingProfile}
                >
                  <PencilLine className="h-4 w-4" />
                  Sửa hồ sơ
                </Button>
              )}
              <Button type="submit" loading={loading} disabled={!isEditing || loadingProfile}>
                <Save className="h-4 w-4" />
                Lưu hồ sơ
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
              <p className="mt-1 text-xs font-semibold text-slate-500">{profileStatusLabel(status)}</p>
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

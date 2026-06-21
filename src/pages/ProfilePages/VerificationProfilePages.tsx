import { type FormEvent, useEffect, useState } from "react";
import { Building2, IdCard, Save, ShieldCheck } from "lucide-react";
import { profileApi } from "../../lib/api";
import { getSession, saveSession } from "../../lib/session";
import { FirebaseFileLink } from "../../components/FirebaseFileLink";
import { Button, Card, Field, Input, Notice, PageHeader, SectionHeading, StatusBadge } from "../../components/ui";
import type { AccountStatus } from "../../types";

function accountStatus(status?: string): AccountStatus {
  return status === "Approved" || status === "Rejected" || status === "Lock" ? status : "Pending";
}

export function BusinessVerificationProfilePage() {
  const [form, setForm] = useState({ taxCode: "", companyName: "", address: "", businessLicenseUrl: "" });
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [status, setStatus] = useState("Chưa gửi");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    profileApi.getMyBusiness().then((profile) => {
      setForm({ taxCode: profile.taxCode || "", companyName: profile.companyName || "", address: profile.address || "", businessLicenseUrl: profile.businessLicenseUrl || "" });
      setStatus(profile.kybStatus || "Chưa gửi");
    }).catch(() => undefined);
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true); setMessage(""); setError("");
    try {
      const businessLicenseUrl = licenseFile ? await profileApi.uploadBusinessLicense(licenseFile) : form.businessLicenseUrl;
      const profile = await profileApi.upsertBusiness({ ...form, businessLicenseUrl });
      setForm({ taxCode: profile.taxCode || "", companyName: profile.companyName || "", address: profile.address || "", businessLicenseUrl: profile.businessLicenseUrl || "" });
      setStatus(profile.kybStatus);
      const session = getSession();
      if (session) saveSession({ ...session, accountStatus: accountStatus(profile.kybStatus) });
      setMessage("Đã lưu hồ sơ doanh nghiệp.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể lưu hồ sơ doanh nghiệp.");
    } finally { setLoading(false); }
  };

  return <div className="space-y-6">
    <PageHeader eyebrow="REG-02 / KYB" title="Hồ sơ xác minh doanh nghiệp" description="Doanh nghiệp nộp mã số thuế và giấy phép kinh doanh để được xét duyệt." />
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <Card className="p-6"><form onSubmit={submit} className="grid gap-4">
        {message && <Notice tone="success" title={message} />}{error && <Notice tone="danger" title={error} />}
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Mã số thuế"><Input value={form.taxCode} disabled={status === "Approved"} onChange={(e) => setForm((v) => ({ ...v, taxCode: e.target.value }))} required /></Field>
          <Field label="Tên doanh nghiệp"><Input value={form.companyName} onChange={(e) => setForm((v) => ({ ...v, companyName: e.target.value }))} required /></Field>
        </div>
        <Field label="Địa chỉ"><Input value={form.address} onChange={(e) => setForm((v) => ({ ...v, address: e.target.value }))} /></Field>
        <Field label="Tệp giấy phép kinh doanh" hint="Chọn ảnh, PDF hoặc DOC/DOCX để thay file hiện tại."><Input type="file" accept="image/png,image/jpeg,application/pdf,.doc,.docx" onChange={(e) => setLicenseFile(e.target.files?.[0] || null)} /><FirebaseFileLink path={form.businessLicenseUrl} emptyText="Chưa có giấy phép" buttonText="Xem giấy phép" className="mt-3" showPath={false} /></Field>
        <div className="flex justify-end"><Button type="submit" loading={loading}><Save className="h-4 w-4" />Lưu hồ sơ</Button></div>
      </form></Card>
      <Card className="p-6"><SectionHeading title="Trạng thái KYB" /><div className="mt-5 flex items-center gap-3 rounded-3xl bg-brand-50 p-4"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-brand-600"><Building2 className="h-5 w-5" /></span><div><p className="text-sm font-bold text-slate-500">Hồ sơ hiện tại</p><div className="mt-1"><StatusBadge status={status} /></div></div></div></Card>
    </div>
  </div>;
}

export function ExpertVerificationProfilePage() {
  const [form, setForm] = useState({ nationalId: "", portfolioUrl: "", yearsOfExperience: "1" });
  const [portfolioFile, setPortfolioFile] = useState<File | null>(null);
  const [status, setStatus] = useState("Chưa gửi");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { profileApi.getMyExpert().then((profile) => { setForm({ nationalId: profile.nationalId || "", portfolioUrl: profile.portfolioUrl || "", yearsOfExperience: String(profile.yearsOfExperience ?? 1) }); setStatus(profile.kycStatus || "Chưa gửi"); }).catch(() => undefined); }, []);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setLoading(true); setMessage(""); setError("");
    try {
      const portfolioUrl = portfolioFile ? await profileApi.uploadExpertPortfolio(portfolioFile) : form.portfolioUrl;
      const profile = await profileApi.upsertExpert({ nationalId: form.nationalId, portfolioUrl, yearsOfExperience: Number(form.yearsOfExperience) });
      setForm({ nationalId: profile.nationalId || "", portfolioUrl: profile.portfolioUrl || "", yearsOfExperience: String(profile.yearsOfExperience ?? 1) }); setStatus(profile.kycStatus);
      const session = getSession(); if (session) saveSession({ ...session, accountStatus: accountStatus(profile.kycStatus) }); setMessage("Đã lưu hồ sơ chuyên gia.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể lưu hồ sơ chuyên gia."); } finally { setLoading(false); }
  };

  return <div className="space-y-6">
    <PageHeader eyebrow="REG-02 / KYC" title="Hồ sơ xác minh chuyên gia" description="Chuyên gia nộp CCCD/hộ chiếu và tệp portfolio để được xét duyệt." />
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <Card className="p-6"><form onSubmit={submit} className="grid gap-4">
        {message && <Notice tone="success" title={message} />}{error && <Notice tone="danger" title={error} />}
        <Field label="Số CCCD / Hộ chiếu"><Input value={form.nationalId} disabled={status === "Approved"} onChange={(e) => setForm((v) => ({ ...v, nationalId: e.target.value }))} required /></Field>
        <div className="grid gap-4 md:grid-cols-2"><Field label="Tệp Portfolio" hint="Chọn ảnh, PDF hoặc DOC/DOCX để thay file hiện tại."><Input type="file" accept="image/png,image/jpeg,application/pdf,.doc,.docx" onChange={(e) => setPortfolioFile(e.target.files?.[0] || null)} required={!form.portfolioUrl} /><FirebaseFileLink path={form.portfolioUrl} emptyText="Chưa có tệp Portfolio" buttonText="Xem Portfolio" className="mt-3" showPath={false} /></Field><Field label="Số năm kinh nghiệm"><Input type="number" min="0" value={form.yearsOfExperience} onChange={(e) => setForm((v) => ({ ...v, yearsOfExperience: e.target.value }))} required /></Field></div>
        <div className="flex justify-end"><Button type="submit" loading={loading}><ShieldCheck className="h-4 w-4" />Lưu hồ sơ</Button></div>
      </form></Card>
      <Card className="p-6"><SectionHeading title="Trạng thái KYC" /><div className="mt-5 flex items-center gap-3 rounded-3xl bg-mint-50 p-4"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-mint-600"><IdCard className="h-5 w-5" /></span><div><p className="text-sm font-bold text-slate-500">Hồ sơ hiện tại</p><div className="mt-1"><StatusBadge status={status} /></div></div></div></Card>
    </div>
  </div>;
}

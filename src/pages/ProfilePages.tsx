import { FormEvent, useEffect, useState } from "react";
import {
  Building2,
  ClipboardCheck,
  IdCard,
  Save,
  ShieldCheck,
} from "lucide-react";
import { catalogApi, profileApi, type Domain, type Skill } from "../lib/api";
import { getSession, saveSession } from "../lib/session";
import { FirebaseFileLink } from "../components/FirebaseFileLink";
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  Notice,
  PageHeader,
  SectionHeading,
  StatusBadge,
  Textarea,
} from "../components/ui";
import type { AccountStatus } from "../types";

export function BusinessProfilePage() {
  const [form, setForm] = useState({
    taxCode: "",
    companyName: "",
    address: "",
    businessLicenseUrl: "",
  });
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [status, setStatus] = useState("Chưa gửi");
  const [rejectionReason, setRejectionReason] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    profileApi
      .getMyBusiness()
      .then((profile) => {
        setForm({
          taxCode: profile.taxCode || "",
          companyName: profile.companyName || "",
          address: profile.address || "",
          businessLicenseUrl: profile.businessLicenseUrl || "",
        });
        setStatus(profile.kybStatus || "Chưa gửi");
        setRejectionReason(profile.rejectionReason || "");
      })
      .catch(() => undefined);
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    try {
      let businessLicenseUrl = form.businessLicenseUrl;
      if (licenseFile) {
        businessLicenseUrl =
          await profileApi.uploadBusinessLicense(licenseFile);
      }
      const profile = await profileApi.upsertBusiness({
        ...form,
        businessLicenseUrl,
      });
      setForm({
        taxCode: profile.taxCode || "",
        companyName: profile.companyName || "",
        address: profile.address || "",
        businessLicenseUrl: profile.businessLicenseUrl || "",
      });
      setStatus(profile.kybStatus);
      setRejectionReason(profile.rejectionReason || "");
      setMessage("Đã lưu hồ sơ doanh nghiệp và đường dẫn file Firebase.");
      const session = getSession();
      if (session) {
        saveSession({
          ...session,
          accountStatus: normalizeAccountStatus(profile.kybStatus),
        });
      }
    } catch (submitError) {
      setError(readApiError(submitError, "Không thể lưu hồ sơ doanh nghiệp."));
    } finally {
      setLoading(false);
    }
  };

  const isApproved = status === "Approved";

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
            {message && <Notice tone="success" title={message} />}
            {error && <Notice tone="danger" title={error} />}
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Mã số thuế">
                <Input
                  value={form.taxCode}
                  disabled={isApproved}
                  // Đổi màu nền khi isApproved (ví dụ: bg-slate-100 hoặc bg-brand-50)
                  className={isApproved ? "!bg-brand-50" : ""}
                  onChange={(event) =>
                    setForm((value) => ({
                      ...value,
                      taxCode: event.target.value,
                    }))
                  }
                  required
                />
              </Field>
              <Field label="Tên doanh nghiệp">
                <Input
                  value={form.companyName}
                  onChange={(event) =>
                    setForm((value) => ({
                      ...value,
                      companyName: event.target.value,
                    }))
                  }
                  required
                />
              </Field>
            </div>
            <Field label="Địa chỉ">
              <Input
                value={form.address}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    address: event.target.value,
                  }))
                }
              />
            </Field>
            <Field
              label="Tệp giấy phép kinh doanh"
              hint="Chọn ảnh, PDF hoặc DOC/DOCX để thay file hiện tại."
            >
              <Input
                type="file"
                accept="image/png,image/jpeg,application/pdf,.doc,.docx"
                onChange={(event) =>
                  setLicenseFile(event.target.files?.[0] || null)
                }
              />
              <FirebaseFileLink
                path={form.businessLicenseUrl}
                emptyText="Chưa có giấy phép"
                buttonText="Xem giấy phép"
                className="mt-3"
                showPath={false}
              />
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
          {status === "Rejected" && rejectionReason && (
            <Notice tone="danger" title="Lý do từ chối" className="mt-4">
              <ul className="list-disc ml-5 mt-1 space-y-1">
                {rejectionReason.split(";").map((reason, index) => {
                  const trimmedReason = reason.trim();
                  // Chỉ render thẻ li nếu chuỗi sau khi xóa khoảng trắng không bị rỗng
                  return trimmedReason ? (
                    <li key={index}>{trimmedReason}</li>
                  ) : null;
                })}
              </ul>
            </Notice>
          )}
        </Card>
      </div>
    </div>
  );
}

export function ExpertProfilePage() {
  const [form, setForm] = useState({
    nationalId: "",
    portfolioUrl: "",
    yearsOfExperience: "1",
  });
  const [portfolioFile, setPortfolioFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Chưa gửi");
  const [rejectionReason, setRejectionReason] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    profileApi
      .getMyExpert()
      .then((profile) => {
        setForm({
          nationalId: profile.nationalId || "",
          portfolioUrl: profile.portfolioUrl || "",
          yearsOfExperience: String(profile.yearsOfExperience ?? 1),
        });
        setStatus(profile.kycStatus || "Chưa gửi");
        setRejectionReason(profile.rejectionReason || "");
      })
      .catch(() => undefined);
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    try {
      let portfolioUrl = form.portfolioUrl;
      if (portfolioFile) {
        portfolioUrl = await profileApi.uploadExpertPortfolio(portfolioFile);
      }
      const profile = await profileApi.upsertExpert({
        nationalId: form.nationalId,
        portfolioUrl,
        yearsOfExperience: Number(form.yearsOfExperience),
      });
      setForm({
        nationalId: profile.nationalId || "",
        portfolioUrl: profile.portfolioUrl || "",
        yearsOfExperience: String(profile.yearsOfExperience ?? 1),
      });
      setStatus(profile.kycStatus);
      setRejectionReason(profile.rejectionReason || "");

      const session = getSession();
      setMessage("Đã lưu thành công hồ sơ");
      if (session) {
        saveSession({
          ...session,
          accountStatus: normalizeAccountStatus(profile.kycStatus),
        });
      }
    } catch (submitError) {
      setError(readApiError(submitError, "Không thể lưu hồ sơ chuyên gia."));
    } finally {
      setLoading(false);
    }
  };

  const isApproved = status === "Approved";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="REG-02 / KYC"
        title="Hồ sơ xác minh chuyên gia"
        description="Chuyên gia nộp CCCD/hộ chiếu và tệp Portfolio. Sau khi Approved mới nên mở khóa giao dịch."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="p-6">
          <form onSubmit={submit} className="grid gap-4">
            {/* Đã di chuyển thông báo lên đầu form */}
            {message && <Notice tone="success" title={message} />}
            {error && <Notice tone="danger" title={error} />}

            <Field label="Số CCCD / Hộ chiếu">
              <Input
                value={form.nationalId}
                disabled={isApproved}
                className={isApproved ? "!bg-brand-50" : ""}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    nationalId: event.target.value,
                  }))
                }
                required
              />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Tệp Portfolio"
                hint="Chọn ảnh, PDF hoặc DOC/DOCX để thay file hiện tại."
              >
                <Input
                  type="file"
                  accept="image/png,image/jpeg,application/pdf,.doc,.docx"
                  onChange={(event) =>
                    setPortfolioFile(event.target.files?.[0] || null)
                  }
                  required={!form.portfolioUrl}
                />
                <FirebaseFileLink
                  path={form.portfolioUrl}
                  emptyText="Chưa có tệp Portfolio"
                  buttonText="Xem Portfolio"
                  className="mt-3"
                  showPath={false}
                />
              </Field>
              <Field label="Số năm kinh nghiệm">
                <Input
                  type="number"
                  min="0"
                  value={form.yearsOfExperience}
                  onChange={(event) =>
                    setForm((value) => ({
                      ...value,
                      yearsOfExperience: event.target.value,
                    }))
                  }
                  required
                />
              </Field>
            </div>
            <div className="flex justify-end">
              <Button type="submit" loading={loading}>
                <ShieldCheck className="h-4 w-4" />
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
            </div>
          </div>
          {status === "Rejected" && rejectionReason && (
            <Notice tone="danger" title="Lý do từ chối" className="mt-4">
              <ul className="list-disc ml-5 mt-1 space-y-1">
                {rejectionReason.split(";").map((reason, index) => {
                  const trimmedReason = reason.trim();
                  // Chỉ render thẻ li nếu chuỗi sau khi xóa khoảng trắng không bị rỗng
                  return trimmedReason ? (
                    <li key={index}>{trimmedReason}</li>
                  ) : null;
                })}
              </ul>
            </Notice>
          )}
        </Card>
      </div>
    </div>
  );
}

export function ExpertPortfolioPage() {
  const [form, setForm] = useState({
    yearsExperience: "1",
    certificates: "",
    selfDescription: "",
  });
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedDomainIds, setSelectedDomainIds] = useState<number[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<number[]>([]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      catalogApi.listDomains(true),
      catalogApi.listSkills(true),
      profileApi.getMyPortfolio().catch(() => null),
    ]).then(([domainItems, skillItems, portfolio]) => {
      setDomains(domainItems);
      setSkills(skillItems);
      if (portfolio) {
        setForm({
          yearsExperience: String(portfolio.yearsExperience ?? 1),
          certificates: portfolio.certificates || "",
          selfDescription: portfolio.selfDescription || "",
        });
        setSelectedDomainIds(parseCatalogIds(portfolio.domainIds));
        setSelectedSkillIds(parseCatalogIds(portfolio.skillIds));
      } else {
        setSelectedDomainIds(
          domainItems.slice(0, 2).map((item) => item.domainId),
        );
        setSelectedSkillIds(skillItems.slice(0, 4).map((item) => item.skillId));
      }
    });
  }, []);

  const toggleDomain = (domainId: number) => {
    setSelectedDomainIds((items) =>
      items.includes(domainId)
        ? items.filter((id) => id !== domainId)
        : [...items, domainId],
    );
  };

  const toggleSkill = (skillId: number) => {
    setSelectedSkillIds((items) =>
      items.includes(skillId)
        ? items.filter((id) => id !== skillId)
        : [...items, skillId],
    );
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setSaved(false);
    setError("");
    try {
      let certificates = form.certificates;
      if (certificateFile) {
        certificates =
          await profileApi.uploadExpertCertificate(certificateFile);
      }
      await profileApi.upsertPortfolio({
        domainIds: selectedDomainIds.join(","),
        skillIds: selectedSkillIds.join(","),
        yearsExperience: Number(form.yearsExperience),
        certificates,
        selfDescription: form.selfDescription,
      });
      setForm((value) => ({ ...value, certificates }));
      setSaved(true);
    } catch (submitError) {
      setError(readApiError(submitError, "Không thể lưu portfolio."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="PRF-01"
        title="Portfolio năng lực AI"
        description="Khai báo lĩnh vực, skill, kinh nghiệm và mô tả bản thân để doanh nghiệp xem khi review proposal."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="p-6">
          <form onSubmit={submit} className="grid gap-4">
            {error && <Notice tone="danger" title={error} />}
            <div className="grid gap-4 lg:grid-cols-2">
              <Field label="Lĩnh vực">
                <div className="max-h-64 overflow-y-auto rounded-2xl border border-slate-100 bg-white p-3">
                  <div className="grid gap-2">
                    {domains.map((domain) => (
                      <label
                        key={domain.domainId}
                        className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedDomainIds.includes(domain.domainId)}
                          onChange={() => toggleDomain(domain.domainId)}
                        />
                        {domain.domainName}
                      </label>
                    ))}
                  </div>
                </div>
              </Field>
              <Field label="Skill">
                <div className="max-h-64 overflow-y-auto rounded-2xl border border-slate-100 bg-white p-3">
                  <div className="grid gap-2">
                    {skills.map((skill) => (
                      <label
                        key={skill.skillId}
                        className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedSkillIds.includes(skill.skillId)}
                          onChange={() => toggleSkill(skill.skillId)}
                        />
                        {skill.skillName}
                      </label>
                    ))}
                  </div>
                </div>
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Số năm kinh nghiệm">
                <Input
                  type="number"
                  min="0"
                  value={form.yearsExperience}
                  onChange={(event) =>
                    setForm((value) => ({
                      ...value,
                      yearsExperience: event.target.value,
                    }))
                  }
                  required
                />
              </Field>
              <Field
                label="Chứng chỉ"
                hint={
                  form.certificates ||
                  "Chọn ảnh, PDF hoặc DOC/DOCX để upload lên Firebase Storage."
                }
              >
                <Input
                  type="file"
                  accept="image/png,image/jpeg,application/pdf,.doc,.docx"
                  onChange={(event) =>
                    setCertificateFile(event.target.files?.[0] || null)
                  }
                />
              </Field>
            </div>
            <Field label="Mô tả bản thân">
              <Textarea
                value={form.selfDescription}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    selfDescription: event.target.value,
                  }))
                }
                required
              />
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
          <SectionHeading
            title="Preview matching"
            description="Dữ liệu này sẽ hiển thị trong khung chi tiết chuyên gia của doanh nghiệp."
          />
          <div className="mt-5 flex flex-wrap gap-2">
            {skills
              .filter((skill) => selectedSkillIds.includes(skill.skillId))
              .map((skill) => (
                <Badge key={skill.skillId} tone="brand">
                  {skill.skillName}
                </Badge>
              ))}
          </div>
          {saved && (
            <Notice tone="success" title="Đã lưu portfolio" className="mt-4">
              Portfolio đã sẵn sàng để doanh nghiệp xem khi đánh giá proposal.
            </Notice>
          )}
          <FirebaseFileLink
            path={form.certificates}
            emptyText="Chưa có chứng chỉ"
            buttonText="Xem chứng chỉ"
            className="mt-5"
            showPath={false}
          />
        </Card>
      </div>
    </div>
  );
}

function readApiError(error: unknown, fallback: string) {
  const apiError = error as {
    response?: { data?: { message?: string } };
    message?: string;
  };
  return apiError.response?.data?.message || apiError.message || fallback;
}

function parseCatalogIds(ids?: string) {
  if (!ids) return [];
  return ids
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item));
}

function normalizeAccountStatus(status?: string): AccountStatus {
  return status === "Approved" || status === "Rejected" || status === "Lock"
    ? status
    : "Pending";
}

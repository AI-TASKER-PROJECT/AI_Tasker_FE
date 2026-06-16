import { FormEvent, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Award,
  BrainCircuit,
  Building2,
  ClipboardCheck,
  Cpu,
  FileText,
  IdCard,
  Layers3,
  Save,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  catalogApi,
  profileApi,
  type Domain,
  type Skill,
  type Technology,
} from "../../lib/api";
import { getSession, saveSession } from "../../lib/session";
import { FirebaseFileLink } from "../../components/FirebaseFileLink";
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
} from "../../components/ui";
import type { AccountStatus } from "../../types";

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
  const [technologies, setTechnologies] = useState<Technology[]>([]);
  const [selectedDomainIds, setSelectedDomainIds] = useState<number[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<number[]>([]);
  const [selectedTechnologyIds, setSelectedTechnologyIds] = useState<number[]>(
    [],
  );
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      catalogApi.listDomains(true),
      catalogApi.listSkills(true),
      catalogApi.listTechnologies(true),
      profileApi.getMyPortfolio().catch(() => null),
    ]).then(([domainItems, skillItems, technologyItems, portfolio]) => {
      setDomains(domainItems);
      setSkills(skillItems);
      setTechnologies(technologyItems);
      if (portfolio) {
        setForm({
          yearsExperience: String(portfolio.yearsExperience ?? 1),
          certificates: portfolio.certificates || "",
          selfDescription: portfolio.selfDescription || "",
        });
        setSelectedDomainIds(parseCatalogIds(portfolio.domainIds));
        setSelectedSkillIds(parseCatalogIds(portfolio.skillIds));
        setSelectedTechnologyIds(parseCatalogIds(portfolio.technologyIds));
      } else {
        setSelectedDomainIds(
          domainItems.slice(0, 2).map((item) => item.domainId),
        );
        setSelectedSkillIds(skillItems.slice(0, 4).map((item) => item.skillId));
        setSelectedTechnologyIds(
          technologyItems.slice(0, 4).map((item) => item.technologyId),
        );
      }
    });
  }, []);

  const selectedDomains = useMemo(
    () => domains.filter((domain) => selectedDomainIds.includes(domain.domainId)),
    [domains, selectedDomainIds],
  );

  const selectedSkills = useMemo(
    () => skills.filter((skill) => selectedSkillIds.includes(skill.skillId)),
    [skills, selectedSkillIds],
  );

  const selectedTechnologies = useMemo(
    () =>
      technologies.filter((technology) =>
        selectedTechnologyIds.includes(technology.technologyId),
      ),
    [technologies, selectedTechnologyIds],
  );

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

  const toggleTechnology = (technologyId: number) => {
    setSelectedTechnologyIds((items) =>
      items.includes(technologyId)
        ? items.filter((id) => id !== technologyId)
        : [...items, technologyId],
    );
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (
      selectedDomainIds.length === 0 ||
      selectedSkillIds.length === 0 ||
      selectedTechnologyIds.length === 0
    ) {
      setError("Vui lòng chọn ít nhất 1 lĩnh vực, 1 kỹ năng và 1 công nghệ.");
      return;
    }
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
        technologyIds: selectedTechnologyIds.join(","),
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
    <div className="space-y-7">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#effcf7,transparent_34%),linear-gradient(135deg,#ffffff_0%,#eef7ff_52%,#fff4f1_100%)] p-6 shadow-card md:p-8">
        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <PageHeader
            eyebrow="PRF-01 / Expert portfolio"
            title="Portfolio năng lực AI"
            description="Biến hồ sơ chuyên gia thành một bản giới thiệu đủ rõ để doanh nghiệp nhìn thấy lĩnh vực mạnh, stack công nghệ, chứng chỉ và cách bạn giải quyết dự án."
          />
          <div className="grid grid-cols-3 gap-3">
            <PortfolioMetric
              icon={<Layers3 className="h-4 w-4" />}
              label="Lĩnh vực"
              value={selectedDomainIds.length}
            />
            <PortfolioMetric
              icon={<BrainCircuit className="h-4 w-4" />}
              label="Kỹ năng"
              value={selectedSkillIds.length}
            />
            <PortfolioMetric
              icon={<Cpu className="h-4 w-4" />}
              label="Công nghệ"
              value={selectedTechnologyIds.length}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
        <form onSubmit={submit} className="space-y-6">
          {error && <Notice tone="danger" title={error} />}
          {saved && (
            <Notice tone="success" title="Đã lưu portfolio">
              Portfolio đã sẵn sàng để doanh nghiệp xem khi đánh giá proposal.
            </Notice>
          )}

          <Card className="p-6">
            <SectionHeading
              title="Vùng chuyên môn"
              description="Chọn các mảng AI mà bạn tự tin nhận dự án."
            />
            <div className="mt-5">
              <p className="mb-3 text-sm font-extrabold text-ink">Lĩnh vực</p>
              <div className="grid max-h-80 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                {domains.map((domain) => (
                  <TogglePill
                    key={domain.domainId}
                    checked={selectedDomainIds.includes(domain.domainId)}
                    label={domain.domainName}
                    description={domain.description}
                    onChange={() => toggleDomain(domain.domainId)}
                    compact
                  />
                ))}
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <SectionHeading
              title="Kỹ năng & công nghệ"
              description="Ghép skill nghiệp vụ với stack triển khai để matching tốt hơn."
            />
            <div className="mt-5 grid gap-6 lg:grid-cols-2">
              <div>
                <p className="mb-3 text-sm font-extrabold text-ink">Kỹ năng</p>
                <div className="grid max-h-80 gap-2 overflow-y-auto pr-1">
                  {skills.map((skill) => (
                    <TogglePill
                      key={skill.skillId}
                      checked={selectedSkillIds.includes(skill.skillId)}
                      label={skill.skillName}
                      description={skill.description}
                      onChange={() => toggleSkill(skill.skillId)}
                      compact
                    />
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-3 text-sm font-extrabold text-ink">Công nghệ</p>
                <div className="grid max-h-80 gap-2 overflow-y-auto pr-1">
                  {technologies.map((technology) => (
                    <TogglePill
                      key={technology.technologyId}
                      checked={selectedTechnologyIds.includes(
                        technology.technologyId,
                      )}
                      label={technology.technologyName}
                      description={technology.description}
                      onChange={() => toggleTechnology(technology.technologyId)}
                      compact
                    />
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <SectionHeading
              title="Bằng chứng năng lực"
              description="Kinh nghiệm, chứng chỉ và đoạn tự giới thiệu sẽ là phần doanh nghiệp đọc kỹ nhất."
            />
            <div className="mt-5 grid gap-4 md:grid-cols-[180px_1fr]">
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
            <Field label="Mô tả bản thân" className="mt-4">
              <Textarea
                value={form.selfDescription}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    selfDescription: event.target.value,
                  }))
                }
                placeholder="Ví dụ: Tôi chuyên xây dựng RAG, chatbot CSKH và pipeline dữ liệu từ PoC đến production..."
                className="min-h-40"
                required
              />
            </Field>
            <div className="mt-5 flex justify-end">
              <Button type="submit" loading={loading}>
                <ClipboardCheck className="h-4 w-4" />
                Lưu portfolio
              </Button>
            </div>
          </Card>
        </form>

        <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
          <Card className="overflow-hidden">
            <div className="bg-ink p-6 text-white">
              <div className="flex items-start justify-between gap-4">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10 text-mint-100 ring-1 ring-white/15">
                  <Sparkles className="h-6 w-6" />
                </span>
                <Badge tone="mint">{form.yearsExperience || 0} năm kinh nghiệm</Badge>
              </div>
              <h2 className="mt-5 font-display text-2xl font-extrabold">
                Hồ sơ chuyên gia AI
              </h2>
              <p className="mt-3 line-clamp-4 text-sm leading-6 text-white/75">
                {form.selfDescription ||
                  "Thêm mô tả bản thân để doanh nghiệp hiểu thế mạnh, cách làm việc và loại dự án bạn phù hợp."}
              </p>
            </div>
            <div className="space-y-5 p-6">
              <PreviewGroup
                icon={<Layers3 className="h-4 w-4" />}
                title="Lĩnh vực"
                emptyText="Chưa chọn lĩnh vực"
                items={selectedDomains.map((item) => item.domainName)}
                tone="mint"
              />
              <PreviewGroup
                icon={<BrainCircuit className="h-4 w-4" />}
                title="Kỹ năng nổi bật"
                emptyText="Chưa chọn kỹ năng"
                items={selectedSkills.map((item) => item.skillName)}
                tone="brand"
              />
              <PreviewGroup
                icon={<Cpu className="h-4 w-4" />}
                title="Stack công nghệ"
                emptyText="Chưa chọn công nghệ"
                items={selectedTechnologies.map((item) => item.technologyName)}
                tone="coral"
              />
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-extrabold text-ink">
                  <Award className="h-4 w-4 text-amber-600" />
                  Chứng chỉ
                </div>
                <FirebaseFileLink
                  path={form.certificates}
                  emptyText="Chưa có chứng chỉ"
                  buttonText="Xem chứng chỉ"
                  showPath={false}
                />
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                <FileText className="h-4 w-4" />
              </span>
              <div>
                <h3 className="font-display text-base font-extrabold text-ink">
                  Gợi ý để matching tốt
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Chọn đúng công nghệ đang dùng trong dự án thật và viết mô tả
                  theo kết quả đã bàn giao. Điều này giúp doanh nghiệp đọc hồ sơ
                  nhanh hơn khi so sánh proposal.
                </p>
              </div>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function PortfolioMetric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/75 p-4 shadow-sm backdrop-blur">
      <div className="mb-3 flex items-center justify-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-ink text-white">
          {icon}
        </div>
        <p className="font-display text-2xl font-extrabold text-ink">
          {value}
        </p>
      </div>
      <p className="text-center text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>
    </div>
  );
}

function TogglePill({
  checked,
  label,
  description,
  onChange,
  compact = false,
}: {
  checked: boolean;
  label: string;
  description?: string;
  onChange: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`group flex min-h-[72px] w-full items-start gap-3 rounded-2xl border p-3 text-left transition ${
        checked
          ? "border-brand-200 bg-brand-50 shadow-glow"
          : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50"
      } ${compact ? "min-h-[60px]" : ""}`}
    >
      <span
        className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border text-[10px] font-black ${
          checked
            ? "border-brand-600 bg-brand-600 text-white"
            : "border-slate-200 bg-white text-transparent"
        }`}
      >
        ✓
      </span>
      <span className="min-w-0">
        <span className="block break-words text-sm font-extrabold text-ink">
          {label}
        </span>
        {description && (
          <span className="mt-1 line-clamp-2 block text-xs leading-5 text-slate-500">
            {description}
          </span>
        )}
      </span>
    </button>
  );
}

function PreviewGroup({
  icon,
  title,
  items,
  emptyText,
  tone,
}: {
  icon: ReactNode;
  title: string;
  items: string[];
  emptyText: string;
  tone: "brand" | "mint" | "coral";
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-sm font-extrabold text-ink">
        {icon}
        {title}
      </div>
      {items.length ? (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <Badge key={item} tone={tone}>
              {item}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-400">
          {emptyText}
        </p>
      )}
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

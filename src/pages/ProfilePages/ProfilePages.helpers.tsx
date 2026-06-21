import { FormEvent, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import {
  Award,
  BrainCircuit,
  BriefcaseBusiness,
  Building2,
  ClipboardCheck,
  Cpu,
  Edit3,
  ExternalLink,
  FileText,
  IdCard,
  Layers3,
  MapPin,
  Save,
  ShieldCheck,
  Sparkles,
  Users,
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
  Avatar,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  LinkButton,
  Notice,
  PageHeader,
  SectionHeading,
  Tabs,
  StatusBadge,
  Textarea,
} from "../../components/ui";
import type { AccountStatus, BusinessProfile, ExpertProfile, Job, Portfolio } from "../../types";

//Định danh business
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
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const session = getSession();

  const isOwner = session?.role === "BUSINESS";

  useEffect(() => { 
    profileApi //api Business profile
      .getMyBusiness() //lấy info business
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
    profileApi
      .getMyBusiness()
      .then((profile) => profileApi.listBusinessJobs(profile.businessId).catch(() => []))
      .then((items) => setJobs(items || []))
      .catch(() => setJobs([]));
  }, []);

  const submit = async (event: FormEvent) => { //khi submit
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    try {
      let businessLicenseUrl = form.businessLicenseUrl;
      if (licenseFile) {
        businessLicenseUrl =
          await profileApi.uploadBusinessLicense(licenseFile); //upload lên firebase trước để lấy URL
      }
      const profile = await profileApi.upsertBusiness({ //lưu daata
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
      setMessage("Đã lưu hồ sơ doanh nghiệp.");
      const session = getSession();
      if (session) {
        saveSession({ //cập nhật session
          ...session,
          accountStatus: normalizeAccountStatus(profile.kybStatus),//cập nhật status
        });
      }
    } catch (submitError) {
      setError(readApiError(submitError, "Không thể lưu hồ sơ doanh nghiệp."));
    } finally {
      setLoading(false);
    }
  };

  const isApproved = status === "Approved";

  const canEdit = isOwner;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-slate-100">
        <div className="bg-[radial-gradient(circle_at_top_left,#e0f2fe,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eff6ff_55%,#f5f7ff_100%)] p-6 md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-5 md:flex-row md:items-center">
              <Avatar name={form.companyName || "Doanh nghiệp"} size="xl" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Trang cá nhân doanh nghiệp</p>
                <h1 className="mt-2 text-3xl font-black text-ink md:text-4xl">{form.companyName || "Doanh nghiệp chưa cập nhật tên"}</h1>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                  <span className="inline-flex items-center gap-2"><Building2 className="h-4 w-4" />{form.taxCode || "Chưa có mã số thuế"}</span>
                  <span className="hidden h-4 w-px bg-slate-200 sm:inline-block" />
                  <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4" />{form.address || "Chưa có địa chỉ"}</span>
                  <span className="hidden h-4 w-px bg-slate-200 sm:inline-block" />
                  <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4" /><StatusBadge status={status} /></span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" type="button" className="min-w-40">
                Theo dõi công ty
              </Button>
              {canEdit && (
                <Button type="button" onClick={() => setActiveTab("edit")}>
                  <Edit3 className="h-4 w-4" />
                  Chỉnh sửa
                </Button>
              )}
            </div>
          </div>
          <div className="mt-6">
            <Tabs
              tabs={[
                { id: "overview", label: "Trang chủ" },
                { id: "projects", label: "Dự án", count: jobs.length },
                ...(canEdit ? [{ id: "edit", label: "Chỉnh sửa" }] : []),
              ]}
              active={activeTab}
              onChange={setActiveTab}
            />
          </div>
        </div>
      </Card>

      {activeTab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Card className="p-6">
            <SectionHeading title="Giới thiệu công ty" description="Thông tin hiển thị từ hồ sơ KYB." />
            <div className="mt-5 space-y-4 text-sm leading-7 text-slate-600">
              <p><strong className="text-ink">{form.companyName || "Doanh nghiệp"}</strong> đang sử dụng hồ sơ xác minh để đăng tải dự án và làm việc với chuyên gia.</p>
              {rejectionReason && status === "Rejected" && <Notice tone="danger" title="Lý do từ chối">{rejectionReason}</Notice>}
            </div>
          </Card>
          <Card className="p-6">
            <SectionHeading title="Thông tin chung" />
            <div className="mt-5 space-y-4">
              <ProfileRow label="Mã số thuế" value={form.taxCode || "Chưa cập nhật"} />
              <ProfileRow label="Địa chỉ" value={form.address || "Chưa cập nhật"} />
              <ProfileRow label="Trạng thái KYB" value={<StatusBadge status={status} />} />
            </div>
          </Card>
        </div>
      )}

      {activeTab === "projects" && (
        <Card className="p-6">
          <SectionHeading title="Dự án đã public" description="Danh sách job doanh nghiệp đã đăng công khai." />
          <div className="mt-5 grid gap-4">
            {jobs.length ? jobs.map((job) => (
              <Link key={job.jobId} to={`/jobs/${job.jobId}`} className="rounded-3xl border border-slate-100 bg-slate-50 p-5 transition hover:border-brand-200 hover:bg-white hover:shadow-soft">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-lg font-extrabold text-ink">{job.title}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">{job.rawRequirements || "Chưa có mô tả."}</p>
                  </div>
                  <Badge tone="mint">{job.status}</Badge>
                </div>
              </Link>
            )) : <EmptyState title="Chưa có dự án public" description="Khi doanh nghiệp đăng job, chúng sẽ xuất hiện ở đây." />}
          </div>
        </Card>
      )}

      {activeTab === "edit" && canEdit && (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Card className="p-6">
            <form onSubmit={submit} className="grid gap-4">
              {message && <Notice tone="success" title={message} />}
              {error && <Notice tone="danger" title={error} />}
              <Field label="Mã số thuế"><Input value={form.taxCode} disabled={isApproved} className={isApproved ? "!bg-brand-50" : ""} onChange={(event) => setForm((value) => ({ ...value, taxCode: event.target.value }))} required /></Field>
              <Field label="Tên doanh nghiệp"><Input value={form.companyName} onChange={(event) => setForm((value) => ({ ...value, companyName: event.target.value }))} required /></Field>
              <Field label="Địa chỉ"><Input value={form.address} onChange={(event) => setForm((value) => ({ ...value, address: event.target.value }))} /></Field>
              <Field label="Tệp giấy phép kinh doanh" hint="Chọn ảnh, PDF hoặc DOC/DOCX để thay file hiện tại."><Input type="file" accept="image/png,image/jpeg,application/pdf,.doc,.docx" onChange={(event) => setLicenseFile(event.target.files?.[0] || null)} /><FirebaseFileLink path={form.businessLicenseUrl} emptyText="Chưa có giấy phép" buttonText="Xem giấy phép" className="mt-3" showPath={false} /></Field>
              <div className="flex justify-end"><Button type="submit" loading={loading}><Save className="h-4 w-4" />Lưu hồ sơ</Button></div>
            </form>
          </Card>
          <Card className="p-6">
            <SectionHeading title="Trạng thái KYB" />
            <div className="mt-5 flex items-center gap-3 rounded-3xl bg-brand-50 p-4">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-brand-600 shadow-sm"><Building2 className="h-5 w-5" /></span>
              <div><p className="text-sm font-bold text-slate-500">Hồ sơ hiện tại</p><div className="mt-1"><StatusBadge status={status} /></div></div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

//Định danh chuyên gia
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
  const [loading, setLoading] = useState(false);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [technologies, setTechnologies] = useState<Technology[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const session = getSession();
  const canEdit = session?.role === "EXPERT";

  useEffect(() => {
    Promise.all([
      profileApi.getMyExpert(),
      profileApi.getMyPortfolio().catch(() => null),
      catalogApi.listDomains(true),
      catalogApi.listSkills(true),
      catalogApi.listTechnologies(true),
    ])
      .then(([profile, expertPortfolio, domainItems, skillItems, technologyItems]) => {
        setForm({
          nationalId: profile.nationalId || "",
          portfolioUrl: profile.portfolioUrl || "",
          yearsOfExperience: String(profile.yearsOfExperience ?? 1),
        });
        setStatus(profile.kycStatus || "Chưa gửi");
        setPortfolio(expertPortfolio);
        setDomains(domainItems);
        setSkills(skillItems);
        setTechnologies(technologyItems);
      })
      .catch(() => undefined);
  }, []);

  const selectedDomains = useMemo(() => resolveCatalogNames(domains, parseCatalogIds(portfolio?.domainIds), "domainId", "domainName"), [domains, portfolio?.domainIds]);
  const selectedSkills = useMemo(() => resolveCatalogNames(skills, parseCatalogIds(portfolio?.skillIds), "skillId", "skillName"), [skills, portfolio?.skillIds]);
  const selectedTechnologies = useMemo(() => resolveCatalogNames(technologies, parseCatalogIds(portfolio?.technologyIds), "technologyId", "technologyName"), [technologies, portfolio?.technologyIds]);

  const submit = async (event: FormEvent) => { // bấm submit
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    try {
      let portfolioUrl = form.portfolioUrl;
      if (portfolioFile) {
        portfolioUrl = await profileApi.uploadExpertPortfolio(portfolioFile); //lấy info hsnl
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

      const session = getSession(); //lưu session
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
      <Card className="overflow-hidden border-slate-100">
        <div className="bg-[radial-gradient(circle_at_top_left,#ccfbf1,transparent_35%),linear-gradient(135deg,#111827_0%,#0f766e_100%)] p-6 text-white md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-5 md:flex-row md:items-center">
              <Avatar name={form.nationalId || "Chuyên gia"} size="xl" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">Trang cá nhân chuyên gia</p>
                <h1 className="mt-2 text-3xl font-black md:text-4xl">{portfolio?.selfDescription ? "Chuyên gia AI" : "Chuyên gia"}</h1>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-white/75">
                  <span className="inline-flex items-center gap-2"><Award className="h-4 w-4" />{portfolio?.yearsExperience ?? form.yearsOfExperience} năm kinh nghiệm</span>
                  <span className="hidden h-4 w-px bg-white/20 sm:inline-block" />
                  <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4" /><StatusBadge status={status} /></span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" type="button" className="min-w-40">Theo dõi chuyên gia</Button>
              {canEdit && <Button type="button" onClick={() => setActiveTab("edit")}><Edit3 className="h-4 w-4" />Chỉnh sửa</Button>}
            </div>
          </div>
          <div className="mt-6">
            <Tabs tabs={[{ id: "overview", label: "Trang chủ" }, { id: "portfolio", label: "Portfolio" }, ...(canEdit ? [{ id: "edit", label: "Chỉnh sửa" }] : [])]} active={activeTab} onChange={setActiveTab} />
          </div>
        </div>
      </Card>

      {activeTab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Card className="p-6">
            <SectionHeading title="Giới thiệu chuyên gia" description="Nội dung lấy từ selfDescription của Portfolio." />
            <p className="mt-5 text-sm leading-7 text-slate-600">{portfolio?.selfDescription || "Chuyên gia đang hoàn thiện phần giới thiệu và hồ sơ năng lực."}</p>
          </Card>
          <Card className="p-6">
            <SectionHeading title="Thông tin chung" />
            <div className="mt-5 space-y-4">
              <ProfileRow label="Số năm kinh nghiệm" value={`${portfolio?.yearsExperience ?? form.yearsOfExperience} năm`} />
              <ProfileRow label="Số CCCD / Hộ chiếu" value={form.nationalId || "Chưa cập nhật"} />
              <ProfileRow label="Trạng thái KYC" value={<StatusBadge status={status} />} />
            </div>
          </Card>
        </div>
      )}

      {activeTab === "portfolio" && (
        <Card className="p-6">
          <SectionHeading title="Portfolio" description="Lĩnh vực, kỹ năng, công nghệ và tệp đính kèm." />
          <div className="mt-5 grid gap-6 lg:grid-cols-2">
            <PreviewGroup icon={<Layers3 className="h-4 w-4" />} title="Lĩnh vực" emptyText="Chưa có lĩnh vực" items={selectedDomains} tone="mint" />
            <PreviewGroup icon={<BrainCircuit className="h-4 w-4" />} title="Kỹ năng" emptyText="Chưa có kỹ năng" items={selectedSkills} tone="brand" />
            <PreviewGroup icon={<Cpu className="h-4 w-4" />} title="Công nghệ" emptyText="Chưa có công nghệ" items={selectedTechnologies} tone="coral" />
            <Card className="rounded-3xl border border-slate-100 bg-slate-50 p-5 shadow-none">
              <div className="mb-3 flex items-center gap-2 text-sm font-extrabold text-ink"><FileText className="h-4 w-4 text-brand-600" />Tệp đính kèm</div>
              <FirebaseFileLink path={portfolio?.certificates || form.portfolioUrl} emptyText="Chưa có tệp" buttonText="Xem tệp" showPath={false} />
            </Card>
          </div>
        </Card>
      )}

      {activeTab === "edit" && canEdit && (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Card className="p-6">
            <form onSubmit={submit} className="grid gap-4">
              {message && <Notice tone="success" title={message} />}
              {error && <Notice tone="danger" title={error} />}
              <Field label="Số CCCD / Hộ chiếu"><Input value={form.nationalId} disabled={isApproved} className={isApproved ? "!bg-brand-50" : ""} onChange={(event) => setForm((value) => ({ ...value, nationalId: event.target.value }))} required /></Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Tệp Portfolio" hint="Chọn ảnh, PDF hoặc DOC/DOCX để thay file hiện tại."><Input type="file" accept="image/png,image/jpeg,application/pdf,.doc,.docx" onChange={(event) => setPortfolioFile(event.target.files?.[0] || null)} required={!form.portfolioUrl} /><FirebaseFileLink path={form.portfolioUrl} emptyText="Chưa có tệp Portfolio" buttonText="Xem Portfolio" className="mt-3" showPath={false} /></Field>
                <Field label="Số năm kinh nghiệm"><Input type="number" min="0" value={form.yearsOfExperience} onChange={(event) => setForm((value) => ({ ...value, yearsOfExperience: event.target.value }))} required /></Field>
              </div>
              <div className="flex justify-end"><Button type="submit" loading={loading}><ShieldCheck className="h-4 w-4" />Lưu hồ sơ</Button></div>
            </form>
          </Card>
          <Card className="p-6">
            <SectionHeading title="Trạng thái KYC" />
            <div className="mt-5 flex items-center gap-3 rounded-3xl bg-mint-50 p-4"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-mint-600 shadow-sm"><IdCard className="h-5 w-5" /></span><div><p className="text-sm font-bold text-slate-500">Hồ sơ hiện tại</p><div className="mt-1"><StatusBadge status={status} /></div></div></div>
          </Card>
        </div>
      )}
    </div>
  );
}

//Portfolio
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

  const submit = async (event: FormEvent) => { //bấm submit
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
      setSaved(true);//lưu
    } catch (submitError) {
      setError(readApiError(submitError, "Không thể lưu portfolio."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-7">
            <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
            eyebrow="PRF-01 / Expert portfolio"
            title="Portfolio năng lực AI"
            description="Biến hồ sơ chuyên gia thành một bản giới thiệu đủ rõ để doanh nghiệp nhìn thấy lĩnh vực mạnh, stack công nghệ, chứng chỉ và cách bạn giải quyết dự án."
          />
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

export function MyPublicBusinessProfilePage() {
  const [businessId, setBusinessId] = useState<number | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    profileApi.getMyBusiness().then((profile) => setBusinessId(profile.businessId)).catch(() => setError("Không thể tải trang cá nhân doanh nghiệp."));
  }, []);
  if (error) return <Notice tone="danger" title={error} />;
  if (!businessId) return <Notice title="Đang mở trang cá nhân..." />;
  return <Navigate to={`/business-profile/${businessId}`} replace />;
}

export function MyPublicExpertProfilePage() {
  const [expertId, setExpertId] = useState<number | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    profileApi.getMyExpert().then((profile) => setExpertId(profile.expertId)).catch(() => setError("Không thể tải trang cá nhân chuyên gia."));
  }, []);
  if (error) return <Notice tone="danger" title={error} />;
  if (!expertId) return <Notice title="Đang mở trang cá nhân..." />;
  return <Navigate to={`/expert-profile/${expertId}`} replace />;
}

export function PublicBusinessProfilePage() {
  const { businessId } = useParams();
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("home");
  const session = getSession();
  const numericBusinessId = Number(businessId);

  useEffect(() => {
    if (!Number.isFinite(numericBusinessId)) return;
    Promise.all([
      profileApi.getBusinessById(numericBusinessId),
      profileApi.listBusinessJobs(numericBusinessId).catch(() => []),
    ])
      .then(([businessProfile, businessJobs]) => {
        setProfile(businessProfile);
        setJobs(businessJobs);
      })
      .catch((loadError) =>
        setError(readApiError(loadError, "Không thể tải hồ sơ doanh nghiệp.")),
      );
  }, [numericBusinessId]);

  if (!Number.isFinite(numericBusinessId)) return <Notice tone="danger" title="Không tìm thấy doanh nghiệp." />;
  if (error) return <Notice tone="danger" title={error} />;
  if (!profile) return <Notice title="Đang tải hồ sơ doanh nghiệp..." />;

  const canEdit = session?.role === "BUSINESS" && profile.accountId === session.accountId;
  const logoLabel = profile.companyName || "Doanh nghiệp";

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-slate-100">
        <div className="bg-[radial-gradient(circle_at_top_left,#dbeafe,transparent_34%),linear-gradient(135deg,#0f172a_0%,#1d4ed8_100%)] p-5 text-white md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              {profile.logoUrl ? (
                <img src={profile.logoUrl} alt={logoLabel} className="h-16 w-16 rounded-3xl bg-white object-contain p-2 shadow-sm ring-1 ring-white/20" />
              ) : (
                <Avatar name={logoLabel} size="lg" className="bg-white/95 text-brand-700" />
              )}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/70">Trang cá nhân công khai doanh nghiệp</p>
                <h1 className="mt-1 text-2xl font-black md:text-3xl">{profile.companyName || "Doanh nghiệp"}</h1>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-white/75">
                  {profile.website && <a className="inline-flex items-center gap-2 hover:text-white" href={profile.website} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" />{profile.website}</a>}
                  {profile.followersCount != null && <span className="inline-flex items-center gap-2"><Users className="h-4 w-4" />{profile.followersCount} người theo dõi</span>}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {canEdit ? (
                <LinkButton to="/app/business/profile" variant="secondary">Chỉnh sửa trang cá nhân</LinkButton>
              ) : (
                <Button type="button" variant="secondary">Theo dõi công ty</Button>
              )}
            </div>
          </div>
          <div className="mt-4">
            <Tabs tabs={[{ id: "home", label: "Trang chủ" }, { id: "jobs", label: "Tin tuyển dụng", count: jobs.filter(j => j.status === 'OPEN').length }]} active={activeTab} onChange={setActiveTab} />
          </div>
        </div>
      </Card>

      {activeTab === "home" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Card className="p-6">
            <SectionHeading title="Giới thiệu công ty" />
            <p className="mt-5 text-sm leading-7 text-slate-600">
              {profile.description || "Doanh nghiệp chưa cập nhật phần giới thiệu."}
            </p>
          </Card>
          <Card className="p-6">
            <SectionHeading title="Thông tin chung" />
            <div className="mt-5 space-y-4">
              <ProfileDetailRow icon={<IdCard className="h-4 w-4" />} label="Mã số thuế" value={profile.taxCode || "Chưa cập nhật"} />
              <ProfileDetailRow icon={<Layers3 className="h-4 w-4" />} label="Lĩnh vực hoạt động" value={profile.industry || "Chưa cập nhật"} />
              <ProfileDetailRow icon={<MapPin className="h-4 w-4" />} label="Địa chỉ" value={profile.address || "Chưa cập nhật"} />
            </div>
          </Card>
        </div>
      )}

      {activeTab === "jobs" && (
        <Card className="p-6">
          <SectionHeading title="Tin tuyển dụng / dự án đã đăng" />
          <div className="mt-5 grid gap-4">
            {jobs.filter(job => job.status === 'OPEN').length ? jobs.filter(job => job.status === 'OPEN').map((job) => (
              <Link key={job.jobId} to={`/jobs/${job.jobId}`} className="group rounded-3xl border border-slate-100 bg-slate-50 p-4 transition hover:border-brand-200 hover:bg-white hover:shadow-soft">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-display text-lg font-extrabold text-ink group-hover:text-brand-700">{job.title}</h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">{job.rawRequirements || "Chưa có mô tả yêu cầu."}</p>
                  </div>
                  <Badge tone="mint">{job.status}</Badge>
                </div>
              </Link>
            )) : (
              <EmptyProfileBlock icon={<BriefcaseBusiness className="h-5 w-5" />} title="Chưa có tin tuyển dụng nào" description="Doanh nghiệp hiện tại không có tin tuyển dụng OPEN." />
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

export function PublicExpertProfilePage() {
  const { expertId } = useParams();
  const [profile, setProfile] = useState<ExpertProfile | null>(null);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [technologies, setTechnologies] = useState<Technology[]>([]);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("home");
  const session = getSession();
  const numericExpertId = Number(expertId);

  useEffect(() => {
    if (!Number.isFinite(numericExpertId)) return;
    Promise.all([
      profileApi.getExpertById(numericExpertId),
      profileApi.getPortfolioByExpert(numericExpertId).catch(() => null),
      catalogApi.listDomains(true),
      catalogApi.listSkills(true),
      catalogApi.listTechnologies(true),
    ])
      .then(([expertProfile, expertPortfolio, domainItems, skillItems, technologyItems]) => {
        setProfile(expertProfile);
        setPortfolio(expertPortfolio);
        setDomains(domainItems);
        setSkills(skillItems);
        setTechnologies(technologyItems);
      })
      .catch((loadError) =>
        setError(readApiError(loadError, "Không thể tải hồ sơ chuyên gia.")),
      );
  }, [numericExpertId]);

  const canEdit =
    session?.role === "EXPERT" && profile?.accountId === session.accountId;
  const selectedDomains = resolveCatalogNames(domains, parseCatalogIds(portfolio?.domainIds), "domainId", "domainName");
  const selectedSkills = resolveCatalogNames(skills, parseCatalogIds(portfolio?.skillIds), "skillId", "skillName");
  const selectedTechnologies = resolveCatalogNames(
    technologies,
    parseCatalogIds(portfolio?.technologyIds),
    "technologyId",
    "technologyName",
  );

  if (!Number.isFinite(numericExpertId)) return <Notice tone="danger" title="Không tìm thấy chuyên gia." />;
  if (error) return <Notice tone="danger" title={error} />;
  if (!profile) return <Notice title="Đang tải hồ sơ chuyên gia..." />;

  const displayName = profile.fullName || "Chuyên gia";
  const introText = portfolio?.selfDescription || profile.description || "Chuyên gia chưa cập nhật phần giới thiệu.";

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-slate-100">
        <div className="bg-[radial-gradient(circle_at_top_left,#ccfbf1,transparent_35%),linear-gradient(135deg,#111827_0%,#0f766e_100%)] p-5 text-white md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <Avatar name={displayName} size="lg" className="bg-white/95 text-brand-700" />
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/70">Trang cá nhân công khai chuyên gia</p>
                <h1 className="mt-1 text-2xl font-black md:text-3xl">{displayName}</h1>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-white/75">
                  {profile.title && <span className="inline-flex items-center gap-2"><BriefcaseBusiness className="h-4 w-4" />{profile.title}</span>}
                  <span className="inline-flex items-center gap-2"><Award className="h-4 w-4" />{portfolio?.yearsExperience ?? profile.yearsOfExperience ?? 0} năm kinh nghiệm</span>
                  {profile.followersCount != null && <span className="inline-flex items-center gap-2"><Users className="h-4 w-4" />{profile.followersCount} người theo dõi</span>}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {canEdit ? (
                <LinkButton to="/app/expert/profile" variant="secondary">Chỉnh sửa trang cá nhân</LinkButton>
              ) : (
                <Button type="button" variant="secondary">Theo dõi</Button>
              )}
            </div>
          </div>
          <div className="mt-4">
            <Tabs tabs={[{ id: "home", label: "Trang chủ" }, { id: "projects", label: "Dự án đã làm" }]} active={activeTab} onChange={setActiveTab} />
          </div>
        </div>
      </Card>

      {activeTab === "home" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Card className="p-6">
            <SectionHeading title="Mô tả bản thân" />
            <p className="mt-5 text-sm leading-7 text-slate-600">{introText}</p>
          </Card>
          <Card className="p-6">
            <SectionHeading title="Thông tin chung" />
            <div className="mt-5 space-y-4">
              <ProfileDetailRow icon={<Layers3 className="h-4 w-4" />} label="Lĩnh vực" value={selectedDomains.length ? selectedDomains.join(", ") : "Chưa cập nhật"} />
              <ProfileDetailRow icon={<BrainCircuit className="h-4 w-4" />} label="Kỹ năng" value={selectedSkills.length ? selectedSkills.join(", ") : "Chưa cập nhật"} />
              <ProfileDetailRow icon={<Cpu className="h-4 w-4" />} label="Công nghệ" value={selectedTechnologies.length ? selectedTechnologies.join(", ") : "Chưa cập nhật"} />
              <ProfileDetailRow icon={<Award className="h-4 w-4" />} label="Số năm kinh nghiệm" value={`${portfolio?.yearsExperience ?? profile.yearsOfExperience ?? 0} năm`} />
              <ProfileDetailRow icon={<FileText className="h-4 w-4" />} label="Chứng chỉ" value={<FirebaseFileLink path={portfolio?.certificates || profile.portfolioUrl} emptyText="Chưa có chứng chỉ" buttonText="Xem chứng chỉ" showPath={false} />} />
            </div>
          </Card>
        </div>
      )}

      {activeTab === "projects" && (
        <Card className="p-6">
          <SectionHeading title="Dự án đã làm" description="Những dự án đã hoàn thành trên nền tảng." />
          <div className="mt-5">
            {profile.completedProjects && profile.completedProjects > 0 ? (
              <div className="grid h-32 place-items-center rounded-3xl border border-dashed border-brand-200 bg-brand-50/50">
                 <p className="text-sm font-bold text-brand-700">Chuyên gia đã hoàn thành {profile.completedProjects} dự án.</p>
              </div>
            ) : (
              <EmptyProfileBlock icon={<BriefcaseBusiness className="h-5 w-5" />} title="Chưa có dự án hoàn thành" description="Chuyên gia này chưa hoàn thành dự án nào trên nền tảng." />
            )}
          </div>
        </Card>
      )}
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

function ProfileRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
      <span className="font-bold text-slate-500">{label}</span>
      <span className="text-right font-extrabold text-ink">{value}</span>
    </div>
  );
}

function ProfileDetailRow({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="flex items-start gap-4">
      <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500">
        {icon}
      </span>
      <div>
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        <div className="mt-1 text-sm font-bold text-ink">{value}</div>
      </div>
    </div>
  );
}

function EmptyProfileBlock({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white text-slate-400 shadow-sm">
        {icon}
      </span>
      <h3 className="mt-4 font-display text-lg font-extrabold text-ink">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

function resolveCatalogNames<T extends object>(
  items: T[],
  ids: number[],
  idKey: keyof T,
  nameKey: keyof T,
) {
  return items
    .filter((item) => ids.includes(Number(item[idKey] as unknown)))
    .map((item) => String(item[nameKey] as unknown));
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

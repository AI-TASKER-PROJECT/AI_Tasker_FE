import {
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  ChevronDown,
  CheckCircle2,
  Clock3,
  Filter,
  ShieldCheck,
  Sparkles,
  Star,
  WalletCards,
  Search,
} from "lucide-react";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  catalogApi,
  contractApi,
  marketplaceApi,
  profileApi,
  type Domain,
  type JobDomain,
  type JobSkill,
  type JobTechnology,
  type Skill,
  type Technology,
} from "../../lib/api";
import { getPublicExperience } from "../../lib/roleExperience";
import { useSession } from "../../lib/session";
import { formatCompactCurrency, formatCurrency } from "../../lib/utils";
import type {
  BusinessProfile,
  ExpertProfile,
  Job,
  Milestone,
  Portfolio,
} from "../../types";
import { jobDomainLabel } from "./publicPages.utils";
import { FirebaseFileLink } from "../../components/FirebaseFileLink";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  LinkButton,
  Modal,
  Notice,
  PageHeader,
  Progress,
  SearchInput,
  SectionHeading,
  StatusBadge,
} from "../../components/ui";

function skillCountLabel(count: number) {
  return `${count} kỹ năng`;
}

function resolveSkillName(skillId: number, skills: Skill[]) {
  return (
    skills.find((skill) => skill.skillId === skillId)?.skillName ||
    `Skill #${skillId}`
  );
}

function resolveTechnologyName(
  technologyId: number,
  technologies: Technology[],
) {
  return (
    technologies.find((technology) => technology.technologyId === technologyId)
      ?.technologyName || `Technology #${technologyId}`
  );
}

function resolveDomainName(domainId: number, domains: Domain[]) {
  return (
    domains.find((domain) => domain.domainId === domainId)?.domainName ||
    `Lĩnh vực #${domainId}`
  );
}

function parseCatalogIds(value?: string) {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item));
}

export function JobDomainBadge({
  label,
  className = "",
}: {
  label: string;
  className?: string;
}) {
  return (
    <Badge tone="brand" className={`max-w-full ${className}`}>
      <span className="max-w-[180px] truncate">{label}</span>
    </Badge>
  );
}

function JobDomainBadgeForJob({
  jobId,
  className,
}: {
  jobId: number;
  className?: string;
}) {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [domainIds, setDomainIds] = useState<number[]>([]);

  useEffect(() => {
    let ignore = false;

    Promise.all([
      catalogApi.listDomains(true),
      catalogApi.listJobDomains(jobId),
    ])
      .then(([domainItems, jobDomainItems]) => {
        if (ignore) return;
        setDomains(domainItems);
        setDomainIds(jobDomainItems.map((item) => item.id.domainId));
      })
      .catch(() => {
        if (ignore) return;
        setDomains([]);
        setDomainIds([]);
      });

    return () => {
      ignore = true;
    };
  }, [jobId]);

  return (
    <JobDomainBadge
      label={jobDomainLabel(domainIds, domains)}
      className={className}
    />
  );
}

export function JobHoverPopover({
  job,
  children,
}: {
  job: Job;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [popoverSide, setPopoverSide] = useState<"left" | "right">("left");
  const [detail, setDetail] = useState<Job>(job);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [jobDomainIds, setJobDomainIds] = useState<number[]>([]);
  const [jobSkillIds, setJobSkillIds] = useState<number[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const closeTimer = useRef<number | null>(null);

  const updatePopoverSide = () => {
    const wrapper = wrapperRef.current;
    if (!wrapper || typeof window === "undefined") return;

    const rect = wrapper.getBoundingClientRect();
    const shouldOpenRight = rect.left + rect.width / 2 < window.innerWidth / 3;
    setPopoverSide(shouldOpenRight ? "right" : "left");
  };

  useLayoutEffect(() => {
    if (!open) return;

    updatePopoverSide();

    const handleViewportChange = () => updatePopoverSide();
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let ignore = false;

    Promise.all([
      marketplaceApi.getJob(job.jobId),
      catalogApi.listDomains(true),
      catalogApi.listSkills(true),
      catalogApi.listJobDomains(job.jobId),
      catalogApi.listJobSkills(job.jobId),
      contractApi.listJobMilestones(job.jobId),
    ])
      .then(
        ([
          jobDetail,
          domainItems,
          skillItems,
          jobDomainItems,
          jobSkillItems,
          milestoneItems,
        ]) => {
          if (ignore) return;
          setDetail(jobDetail);
          setDomains(domainItems);
          setSkills(skillItems);
          setJobDomainIds(jobDomainItems.map((item) => item.id.domainId));
          setJobSkillIds(jobSkillItems.map((item) => item.id.skillId));
          setMilestones(milestoneItems);
        },
      )
      .catch(() => {
        if (ignore) return;
        setDetail(job);
        setDomains([]);
        setSkills([]);
        setJobDomainIds([]);
        setJobSkillIds([]);
        setMilestones([]);
      });

    return () => {
      ignore = true;
    };
  }, [job, open]);

  const scheduleClose = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), 120);
  };

  const cancelClose = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };

  return (
    <div
      ref={wrapperRef}
      className="relative"
      onMouseEnter={() => {
        cancelClose();
        updatePopoverSide();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
    >
      {children}
      {open && (
        <div
          className={
            popoverSide === "right"
              ? "absolute left-full top-0 z-30 ml-3 w-[min(38rem,calc(100vw-2rem))] max-h-[32rem] overflow-y-auto rounded-3xl border border-slate-100 bg-white p-5 shadow-soft"
              : "absolute right-full top-0 z-30 mr-3 w-[min(38rem,calc(100vw-2rem))] max-h-[32rem] overflow-y-auto rounded-3xl border border-slate-100 bg-white p-5 shadow-soft"
          }
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap gap-2">
                <JobDomainBadge label={jobDomainLabel(jobDomainIds, domains)} />
                {detail.isHot && <Badge tone="coral">Hot project</Badge>}
              </div>
              <h4 className="mt-3 line-clamp-2 font-display text-lg font-extrabold leading-7 text-ink">
                {detail.title}
              </h4>
            </div>
            <StatusBadge status={detail.status} />
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {detail.structuredSow || detail.rawRequirements}
          </p>
          <div className="mt-4 grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-2">
            <InfoRow
              icon={<WalletCards className="h-4 w-4" />}
              label="Ngân sách"
              value={formatCompactCurrency(detail.budget)}
            />
            <InfoRow
              icon={<Clock3 className="h-4 w-4" />}
              label="Thời lượng"
              value={`${detail.plannedDurationValue || 0} ${detail.plannedDurationUnit || "tuần"}`}
            />
            <InfoRow
              icon={<Star className="h-4 w-4" />}
              label="Proposal"
              value={`${detail.proposalsCount || 0}`}
            />
            <InfoRow
              icon={<CheckCircle2 className="h-4 w-4" />}
              label="Milestone"
              value={`${milestones.length}`}
            />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Lĩnh vực
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {jobDomainIds.map((domainId) => (
                  <Badge key={domainId} tone="brand">
                    {resolveDomainName(domainId, domains)}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Kỹ năng
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {jobSkillIds.map((skillId) => (
                  <Badge key={skillId} tone="slate">
                    {resolveSkillName(skillId, skills)}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          {milestones.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Milestones
              </p>
              <div className="mt-2 grid gap-2">
                {milestones.map((milestone) => (
                  <div
                    key={milestone.milestoneId}
                    className="rounded-2xl border border-slate-100 bg-white p-3 text-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-extrabold text-ink">
                        {milestone.milestoneName}
                      </p>
                      <span className="text-xs font-bold text-slate-400">
                        {formatCurrency(Number(milestone.fundsAllocated || 0))}
                      </span>
                    </div>
                    {milestone.description && (
                      <p className="mt-1 text-xs leading-6 text-slate-500">
                        {milestone.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function LandingPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const session = useSession();
  const location = useLocation();
  const publicExperience = getPublicExperience(session);

  useEffect(() => {
    marketplaceApi.listJobs().then((data) => setJobs(data.slice(0, 3)));
  }, []);

  useEffect(() => {
    const sectionId =
      location.pathname === "/how-it-works"
        ? "how-it-works"
        : location.pathname === "/about"
          ? "about"
          : "";

    if (!sectionId) return;
    window.requestAnimationFrame(() => {
      document.getElementById(sectionId)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, [location.pathname]);

  return (
    <main>
      <section className="relative overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-brand-100/60 blur-3xl" />
        <div className="absolute right-8 top-28 h-24 w-24 rounded-full bg-coral-100 blur-2xl" />
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 md:grid-cols-[1fr_1.05fr] md:px-6 md:py-24">
          <div className="relative z-10">
            <Badge tone="brand">
              <Sparkles className="h-3.5 w-3.5" />
              {publicExperience.badge}
            </Badge>
            <h1 className="mt-6 font-display text-4xl font-black tracking-[-0.055em] text-ink md:text-6xl">
              {publicExperience.heroTitle}
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-slate-600">
              {publicExperience.heroDescription}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton to={publicExperience.primaryPath} size="lg">
                {publicExperience.primaryLabel}{" "}
                <ArrowRight className="h-4 w-4" />
              </LinkButton>
              <LinkButton
                to={publicExperience.secondaryPath}
                size="lg"
                variant="secondary"
              >
                {publicExperience.secondaryLabel}
              </LinkButton>
            </div>
            <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">
              <HeroStat value="23" label="Business rules" />
              <HeroStat value="4" label="Vai trò chính" />
              <HeroStat value="100%" label="API mapped" />
            </div>
          </div>
          <div className="relative z-10">
            <div className="absolute -left-4 top-12 z-20 hidden rounded-3xl border border-white/80 bg-white/95 p-4 shadow-soft backdrop-blur md:block">
              <p className="text-xs font-bold text-slate-400">Matching score</p>
              <div className="mt-2 flex items-end gap-2">
                <span className="font-display text-3xl font-black text-brand-600">
                  96%
                </span>
                <Badge tone="mint">RAG</Badge>
              </div>
              <Progress value={96} className="mt-3 w-40" />
            </div>
            <div className="relative animate-float overflow-hidden rounded-[2.5rem] border border-white bg-white p-2 shadow-soft">
              <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-white/45 via-transparent to-brand-100/40" />
              <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-cyan-300/30 blur-3xl" />
              <img
                src="/images/hero-collaboration.png"
                alt="AI hologram between robot and human hand"
                className="relative h-full min-h-[320px] w-full rounded-[2rem] object-cover object-center ring-1 ring-cyan-100/60"
              />
            </div>
            <div className="absolute bottom-6 right-2 z-20 hidden rounded-3xl border border-white/80 bg-white/95 p-4 shadow-soft backdrop-blur md:block">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-mint-50 text-mint-600">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-extrabold text-ink">
                    Escrow bảo vệ 2 chiều
                  </p>
                  <p className="text-xs text-slate-500">
                    Milestone, NDA, dispute, VNPay
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className="mx-auto max-w-7xl px-4 py-12 md:px-6"
      >
        <SectionHeading
          title="Một luồng làm việc khép kín"
          description="Thiết kế theo đúng nghiệp vụ trong BR_DB: đăng ký, thẩm định, đấu thầu, hợp đồng, thực thi, tài chính và rủi ro."
        />
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {[
            [
              "1",
              "Chuẩn hóa bài toán",
              "AI Job Assistant chuyển yêu cầu thô thành SoW có cấu trúc.",
            ],
            [
              "2",
              "Nhận proposal",
              "Doanh nghiệp xem tab AI đề xuất và tab chuyên gia tự nộp.",
            ],
            [
              "3",
              "Ký hợp đồng",
              "Draft, request change, activate, NDA và milestone.",
            ],
            [
              "4",
              "Nghiệm thu an toàn",
              "Escrow, SLA 7 ngày, dispute và review chéo.",
            ],
          ].map(([step, title, desc]) => (
            <Card key={step} hover className="p-5">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-50 font-display text-lg font-black text-brand-700">
                {step}
              </span>
              <h3 className="mt-4 font-display text-lg font-extrabold text-ink">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">{desc}</p>
            </Card>
          ))}
        </div>
      </section>

      <section
        id="about"
        className="mx-auto grid max-w-7xl gap-6 px-4 py-12 md:grid-cols-[1fr_1fr] md:px-6"
      >
        <Card className="overflow-hidden p-6">
          <div className="flex items-start justify-between gap-4">
            <SectionHeading
              title="Job đang nổi bật"
              description="Dữ liệu được tải trực tiếp từ API `/api/v1/jobs`; khi back-end chưa có dữ liệu, giao diện hiển thị trạng thái trống."
            />
            <LinkButton to="/jobs" variant="secondary" size="sm">
              Xem tất cả
            </LinkButton>
          </div>
          <div className="mt-5 grid gap-3">
            {jobs.map((job) => (
              <Link
                key={job.jobId}
                to={`/jobs/${job.jobId}`}
                className="group rounded-2xl border border-slate-100 p-4 transition hover:border-brand-100 hover:bg-brand-50/40"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <JobDomainBadgeForJob jobId={job.jobId} className="mb-2" />
                    <p className="font-bold text-ink transition-all duration-200 group-hover:-translate-y-0.5 group-hover:text-brand-700">
                      {job.title}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {job.companyName}
                    </p>
                  </div>
                  <StatusBadge status={job.status} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone="mint">{formatCompactCurrency(job.budget)}</Badge>
                  <Badge tone="slate">{job.proposalsCount || 0} proposal</Badge>
                </div>
              </Link>
            ))}
          </div>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-brand-600 to-indigo-700 p-6 text-white">
          <div className="absolute -right-14 -top-14 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
          <div className="relative z-10 max-w-md">
            <Badge tone="mint">AI Job Assistant</Badge>
            <h2 className="mt-5 font-display text-3xl font-black tracking-tight">
              Giao diện đã có sẵn cho AI service dù back-end chưa tích hợp thật.
            </h2>
            <p className="mt-4 text-sm leading-7 text-blue-50">
              Form tạo job có khu vực mô tả thô, SoW gợi ý, lĩnh vực, kỹ năng,
              ngân sách và thời lượng để giữ đúng JOB-01.
            </p>
            <div className="mt-6">
              <LinkButton to="/app/jobs/new" variant="secondary">
                Thử tạo job
              </LinkButton>
            </div>
          </div>
        </Card>
      </section>
    </main>
  );
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-3xl border border-white bg-white/80 p-4 shadow-card backdrop-blur">
      <p className="font-display text-2xl font-black text-brand-700">{value}</p>
      <p className="mt-1 text-xs font-semibold text-slate-500">{label}</p>
    </div>
  );
}

export function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [domains, setDomains] = useState<Domain[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [technologies, setTechnologies] = useState<Technology[]>([]);
  const [jobDomainIdsByJobId, setJobDomainIdsByJobId] = useState<
    Record<number, number[]>
  >({});
  const [jobSkillIdsByJobId, setJobSkillIdsByJobId] = useState<
    Record<number, number[]>
  >({});
  const [jobTechnologyIdsByJobId, setJobTechnologyIdsByJobId] = useState<
    Record<number, number[]>
  >({});
  const [domainFilterOpen, setDomainFilterOpen] = useState(false);
  const [skillFilterOpen, setSkillFilterOpen] = useState(false);
  const [technologyFilterOpen, setTechnologyFilterOpen] = useState(false);
  const [selectedDomainIds, setSelectedDomainIds] = useState<number[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<number[]>([]);
  const [selectedTechnologyIds, setSelectedTechnologyIds] = useState<number[]>(
    [],
  );
  const session = useSession();
  const publicExperience = getPublicExperience(session);

  useEffect(() => {
    let ignore = false;

    async function loadJobs() {
      const [jobItems, domainItems, skillItems, technologyItems] =
        await Promise.all([
          marketplaceApi.listJobs(),
          catalogApi.listDomains(true),
          catalogApi.listSkills(true),
          catalogApi.listTechnologies(true),
        ]);

      if (ignore) return;
      setJobs(jobItems);
      setDomains(domainItems);
      setSkills(skillItems);
      setTechnologies(technologyItems);

      const relationItems = await Promise.all(
        jobItems.map(async (job) => {
          const [jobDomains, jobSkills, jobTechnologies] = await Promise.all([
            catalogApi.listJobDomains(job.jobId).catch(() => [] as JobDomain[]),
            catalogApi.listJobSkills(job.jobId).catch(() => [] as JobSkill[]),
            catalogApi
              .listJobTechnologies(job.jobId)
              .catch(() => [] as JobTechnology[]),
          ]);

          return {
            jobId: job.jobId,
            domainIds: jobDomains.map((item) => item.id.domainId),
            skillIds: jobSkills.map((item) => item.id.skillId),
            technologyIds: jobTechnologies.map((item) => item.id.technologyId),
          };
        }),
      );

      if (ignore) return;
      setJobDomainIdsByJobId(
        Object.fromEntries(
          relationItems.map((item) => [item.jobId, item.domainIds]),
        ),
      );
      setJobSkillIdsByJobId(
        Object.fromEntries(
          relationItems.map((item) => [item.jobId, item.skillIds]),
        ),
      );
      setJobTechnologyIdsByJobId(
        Object.fromEntries(
          relationItems.map((item) => [item.jobId, item.technologyIds]),
        ),
      );
    }

    loadJobs();
    return () => {
      ignore = true;
    };
  }, []);

  const toggleSelectedId = (
    value: number,
    setter: Dispatch<SetStateAction<number[]>>,
  ) => {
    setter((items) =>
      items.includes(value)
        ? items.filter((item) => item !== value)
        : [...items, value],
    );
  };

  const filtered = useMemo(() => {
    const matchesAny = (selectedIds: number[], candidateIds: number[]) =>
      selectedIds.length === 0 ||
      selectedIds.some((selectedId) => candidateIds.includes(selectedId));

    return jobs.filter((job) => {
      const domainIds = jobDomainIdsByJobId[job.jobId] || [];
      const skillIds = jobSkillIdsByJobId[job.jobId] || [];
      const technologyIds = jobTechnologyIdsByJobId[job.jobId] || [];
      const domainNames = domainIds.map((domainId) =>
        resolveDomainName(domainId, domains),
      );
      const skillNames = skillIds.map((skillId) =>
        resolveSkillName(skillId, skills),
      );
      const technologyNames = technologyIds.map((technologyId) =>
        resolveTechnologyName(technologyId, technologies),
      );
      const matchesQuery = `${job.title} ${job.rawRequirements} ${
        job.structuredSow || ""
      } ${domainNames.join(" ")} ${skillNames.join(" ")} ${technologyNames.join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase());
      const matchesStatus = status === "ALL" || job.status === status;
      return (
        matchesQuery &&
        matchesStatus &&
        matchesAny(selectedDomainIds, domainIds) &&
        matchesAny(selectedSkillIds, skillIds) &&
        matchesAny(selectedTechnologyIds, technologyIds)
      );
    });
  }, [
    domains,
    jobDomainIdsByJobId,
    jobSkillIdsByJobId,
    jobTechnologyIdsByJobId,
    jobs,
    query,
    selectedDomainIds,
    selectedSkillIds,
    selectedTechnologyIds,
    skills,
    status,
    technologies,
  ]);

  const hasActiveFilters =
    query ||
    status !== "ALL" ||
    selectedDomainIds.length > 0 ||
    selectedSkillIds.length > 0 ||
    selectedTechnologyIds.length > 0;

  const clearFilters = () => {
    setQuery("");
    setStatus("ALL");
    setSelectedDomainIds([]);
    setSelectedSkillIds([]);
    setSelectedTechnologyIds([]);
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 md:px-6">
      <PageHeader
        eyebrow="Marketplace"
        title="Cơ hội dự án AI"
        description="Danh sách job công khai cho chuyên gia và là nơi doanh nghiệp kiểm tra thị trường."
        actions={
          <LinkButton to={publicExperience.primaryPath}>
            {publicExperience.primaryLabel}
          </LinkButton>
        }
      />
      <Card className="mt-8 p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Tìm theo tiêu đề, kỹ năng, lĩnh vực..."
          />
          <Button
            variant="secondary"
            onClick={() => {
              setDomainFilterOpen(true);
              setSkillFilterOpen(true);
              setTechnologyFilterOpen(true);
            }}
          >
            <Search className="h-4 w-4" />
            Tìm kiếm
          </Button>
        </div>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-[340px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Filter className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-lg font-extrabold text-ink">
                  Loc nang cao
                </h3>
                <p className="text-sm text-slate-500">
                  Chon linh vuc, ky nang va cong nghe phu hop.
                </p>
              </div>
            </div>

            <div className="my-5 border-t border-slate-200/80" />

            <div className="grid gap-3">
              <FilterAccordion
                title="Linh vuc"
                count={selectedDomainIds.length}
                open={domainFilterOpen}
                onToggle={() => setDomainFilterOpen((value) => !value)}
              >
                <ChipGrid
                  items={domains.map((domain) => ({
                    id: domain.domainId,
                    label: domain.domainName,
                    selected: selectedDomainIds.includes(domain.domainId),
                  }))}
                  emptyLabel="Chua co du lieu"
                  onToggle={(id) => toggleSelectedId(id, setSelectedDomainIds)}
                />
              </FilterAccordion>

              <FilterAccordion
                title="Ky nang"
                count={selectedSkillIds.length}
                open={skillFilterOpen}
                onToggle={() => setSkillFilterOpen((value) => !value)}
              >
                <ChipGrid
                  items={skills.map((skill) => ({
                    id: skill.skillId,
                    label: skill.skillName,
                    selected: selectedSkillIds.includes(skill.skillId),
                  }))}
                  emptyLabel="Chua co du lieu"
                  onToggle={(id) => toggleSelectedId(id, setSelectedSkillIds)}
                />
              </FilterAccordion>

              <FilterAccordion
                title="Cong nghe"
                count={selectedTechnologyIds.length}
                open={technologyFilterOpen}
                onToggle={() => setTechnologyFilterOpen((value) => !value)}
              >
                <ChipGrid
                  items={technologies.map((technology) => ({
                    id: technology.technologyId,
                    label: technology.technologyName,
                    selected: selectedTechnologyIds.includes(
                      technology.technologyId,
                    ),
                  }))}
                  emptyLabel="Chua co du lieu"
                  onToggle={(id) =>
                    toggleSelectedId(id, setSelectedTechnologyIds)
                  }
                />
              </FilterAccordion>
            </div>

            <div className="mt-5 flex flex-wrap gap-3 border-t border-slate-200/80 pt-4">
              <Button
                type="button"
                variant="secondary"
                disabled={!hasActiveFilters}
                onClick={clearFilters}
              >
                Xoa loc
              </Button>
              <Button type="button" onClick={() => {}}>
                Luu bo loc
              </Button>
            </div>
          </Card>
        </aside>

        <section>
          <p className="mb-4 text-xs font-semibold text-slate-400">
            Hien thi {filtered.length}/{jobs.length} job phu hop.
          </p>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((job) => (
              <JobCard key={job.jobId} job={job} />
            ))}
          </div>
        </section>
      </div>
      {filtered.length === 0 && (
        <div className="mt-6">
          <EmptyState
            title="Không có job phù hợp"
            description="Thử đổi từ khóa hoặc bỏ bớt bộ lọc trạng thái."
          />
        </div>
      )}
    </main>
  );
}

export function JobCard({
  job,
  manage = false,
  detailTo,
}: {
  job: Job;
  manage?: boolean;
  detailTo?: string;
}) {
  const [milestoneCount, setMilestoneCount] = useState(0);
  const [skillCount, setSkillCount] = useState(0);

  useEffect(() => {
    let ignore = false;

    contractApi
      .listJobMilestones(job.jobId)
      .then((items) => {
        if (!ignore) setMilestoneCount(items.length);
      })
      .catch(() => {
        if (!ignore) setMilestoneCount(0);
      });

    catalogApi
      .listJobSkills(job.jobId)
      .then((items) => {
        if (!ignore) setSkillCount(items.length);
      })
      .catch(() => {
        if (!ignore) setSkillCount(0);
      });

    return () => {
      ignore = true;
    };
  }, [job.jobId]);

  return (
    <Card hover className="flex h-full flex-col p-5">
      <div className="flex min-h-9 items-start justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <JobDomainBadgeForJob jobId={job.jobId} />
          {job.isHot && <Badge tone="coral">Hot project</Badge>}
        </div>
        <StatusBadge status={job.status} />
      </div>
      <h3 className="mt-4 min-h-14 line-clamp-2 font-display text-lg font-extrabold leading-7 text-ink transition-all duration-200 group-hover:-translate-y-0.5 group-hover:text-brand-700">
        {job.title}
      </h3>
      <p className="mt-2 min-h-[4.5rem] line-clamp-3 text-sm leading-6 text-slate-500">
        {job.structuredSow || job.rawRequirements}
      </p>
      <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-3">
        <div>
          <p className="text-xs font-bold text-slate-400">Ngân sách</p>
          <p className="mt-1 text-sm font-extrabold text-ink">
            {formatCompactCurrency(job.budget)}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold text-slate-400">Proposal</p>
          <p className="mt-1 text-sm font-extrabold text-ink">
            {job.proposalsCount || 0}
          </p>
        </div>
      </div>
      <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
        <p className="text-xs font-bold text-slate-400">Kỹ năng</p>
        <p className="mt-1 text-sm font-extrabold text-ink">
          {skillCountLabel(skillCount)}
        </p>
      </div>
      <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
        <p className="text-xs font-bold text-slate-400">Milestone</p>
        <p className="mt-1 text-sm font-extrabold text-ink">
          {milestoneCount} mốc
        </p>
      </div>
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <span className="text-xs font-semibold text-slate-400">
          {job.companyName || "Doanh nghiệp"}
        </span>
        <LinkButton
          to={manage ? `/app/jobs/${job.jobId}/manage` : `/jobs/${job.jobId}`}
          size="sm"
          variant="secondary"
        >
          Chi tiết <ArrowRight className="h-4 w-4" />
        </LinkButton>
      </div>
    </Card>
  );
}

export function JobDetailPage() {
  const { jobId } = useParams();
  const session = useSession();
  const [job, setJob] = useState<Job | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [technologies, setTechnologies] = useState<Technology[]>([]);
  const [jobDomainIds, setJobDomainIds] = useState<number[]>([]);
  const [jobSkills, setJobSkills] = useState<JobSkill[]>([]);
  const [jobTechnologies, setJobTechnologies] = useState<JobTechnology[]>([]);
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [businessOpen, setBusinessOpen] = useState(false);
  const [businessLoading, setBusinessLoading] = useState(false);

  useEffect(() => {
    const id = Number(jobId);
    marketplaceApi.getJob(id).then(setJob);
    Promise.all([
      catalogApi.listDomains(true),
      catalogApi.listSkills(true),
      catalogApi.listTechnologies(true),
      catalogApi.listJobDomains(id),
      catalogApi.listJobSkills(id),
      catalogApi.listJobTechnologies(id).catch(() => []),
    ])
      .then(
        ([
          domainItems,
          skillItems,
          technologyItems,
          jobDomainItems,
          jobSkillItems,
          jobTechnologyItems,
        ]) => {
          setDomains(domainItems);
          setSkills(skillItems);
          setTechnologies(technologyItems);
          setJobDomainIds(jobDomainItems.map((item) => item.id.domainId));
          setJobSkills(jobSkillItems);
          setJobTechnologies(jobTechnologyItems);
        },
      )
      .catch(() => {
        setDomains([]);
        setSkills([]);
        setTechnologies([]);
        setJobDomainIds([]);
        setJobSkills([]);
        setJobTechnologies([]);
      });
    contractApi
      .listJobMilestones(id)
      .then(setMilestones)
      .catch(() => setMilestones([]));
  }, [jobId]);

  useEffect(() => {
    if (!job) return;
    let ignore = false;
    const currentJobId = job.jobId;

    async function loadBusiness() {
      setBusinessLoading(true);
      try {
        const profile = await profileApi.getBusinessByJob(currentJobId);
        if (!ignore) setBusiness(profile);
      } catch {
        if (!ignore) setBusiness(null);
      } finally {
        if (!ignore) setBusinessLoading(false);
      }
    }

    loadBusiness();
    return () => {
      ignore = true;
    };
  }, [job]);

  if (!job) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        Đang tải job...
      </main>
    );
  }

  const isOpenJob = job.status === "OPEN";
  const canSubmitProposal = session?.role === "EXPERT" && isOpenJob;

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 md:px-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          <Link to="/jobs" className="text-sm font-bold text-brand-600">
            ← Quay lại marketplace
          </Link>
          <div className="mt-5 flex flex-wrap gap-2">
            {jobDomainIds.map((domainId) => (
              <Badge key={domainId} tone="brand">
                {resolveDomainName(domainId, domains)}
              </Badge>
            ))}
            {job.isHot && <Badge tone="coral">Hot project</Badge>}
            <StatusBadge status={job.status} />
          </div>
          <h1 className="mt-5 font-display text-4xl font-black tracking-[-0.045em] text-ink">
            {job.title}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
            {job.rawRequirements}
          </p>
          <Card className="mt-8 p-6">
            <SectionHeading
              title="Statement of Work đã chuẩn hóa"
              description="Khu vực này phục vụ JOB-01. Khi AI service được tích hợp, SoW sẽ được sinh tự động từ mô tả thô."
            />
            <div className="mt-5 rounded-3xl bg-gradient-to-br from-brand-50 to-indigo-50 p-5 text-sm leading-7 text-slate-700">
              {job.structuredSow ||
                "Chưa có SoW. Doanh nghiệp có thể cập nhật bằng AI Job Assistant."}
            </div>
            <div className="mt-6 grid gap-4 border-t border-slate-100 pt-5">
              <ChipRow
                label="Kĩ năng:"
                items={jobSkills.map((item) =>
                  resolveSkillName(item.id.skillId, skills),
                )}
              />
              <ChipRow
                label="Công nghệ:"
                items={jobTechnologies.map((item) =>
                  resolveTechnologyName(item.id.technologyId, technologies),
                )}
              />
            </div>
          </Card>
          <Card className="mt-6 p-6">
            <SectionHeading
              title="Milestone dự án"
              description="Các mốc công việc doanh nghiệp đã khai báo khi tạo job."
            />
            <MilestoneList milestones={milestones} />
          </Card>
        </div>
        <aside className="space-y-4">
          <Card className="p-5">
            <SectionHeading title="Tóm tắt dự án" />
            <div className="mt-5 grid gap-3">
              <InfoRow
                icon={<WalletCards className="h-4 w-4" />}
                label="Ngân sách"
                value={formatCurrency(job.budget)}
              />
              <InfoRow
                icon={<Clock3 className="h-4 w-4" />}
                label="Thời lượng"
                value={`${job.plannedDurationValue || 0} ${job.plannedDurationUnit || "tuần"}`}
              />
              <InfoRow
                icon={<BriefcaseBusiness className="h-4 w-4" />}
                label="Doanh nghiệp"
                value={
                  business?.companyName || job.companyName || "Đang cập nhật"
                }
              />
              <InfoRow
                icon={<ShieldCheck className="h-4 w-4" />}
                label="Mã số thuế"
                value={business?.taxCode || "Đang cập nhật"}
              />
              <InfoRow
                icon={<Bot className="h-4 w-4" />}
                label="Kỹ năng"
                value={skillCountLabel(jobSkills.length)}
              />
              <InfoRow
                icon={<CheckCircle2 className="h-4 w-4" />}
                label="Milestone"
                value={`${milestones.length} mốc`}
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              className="mt-5 w-full"
              onClick={() => setBusinessOpen(true)}
            >
              Xem chi tiết doanh nghiệp
            </Button>
            {canSubmitProposal && (
              <LinkButton
                to={`/app/jobs/${job.jobId}/proposal`}
                className="mt-5 w-full"
              >
                Nộp báo giá dự thầu
              </LinkButton>
            )}
            {!session && (
              <LinkButton to="/login" className="mt-5 w-full">
                Nộp báo giá dự thầu
              </LinkButton>
            )}
            {session && session.role !== "EXPERT" && (
              <>
                <Button className="mt-5 w-full" disabled>
                  Nộp báo giá dự thầu
                </Button>
                <p className="mt-2 text-xs font-semibold text-slate-400">
                  Chỉ tài khoản Chuyên gia mới có thể nộp báo giá cho dự án.
                </p>
              </>
            )}
            {session?.role === "EXPERT" && !isOpenJob && (
              <>
                <Button className="mt-5 w-full" disabled>
                  Nộp báo giá dự thầu
                </Button>
                <p className="mt-2 text-xs font-semibold text-slate-400">
                  Dự án cần ở trạng thái OPEN để nhận proposal.
                </p>
              </>
            )}
          </Card>
        </aside>
      </div>
      <Modal
        open={businessOpen}
        onClose={() => setBusinessOpen(false)}
        title="Thông tin doanh nghiệp"
        description="Dữ liệu hồ sơ KYB của doanh nghiệp đăng job."
        size="lg"
      >
        <div className="grid gap-4">
          {businessLoading && (
            <Notice tone="info" title="Đang tải hồ sơ doanh nghiệp..." />
          )}
          {!businessLoading && !business && (
            <Notice
              tone="warning"
              title="Chưa lấy được hồ sơ doanh nghiệp từ API hiện tại."
            />
          )}
          <div className="grid gap-3 md:grid-cols-2">
            <BusinessInfoItem
              label="Tên doanh nghiệp"
              value={
                business?.companyName || job.companyName || "Chưa có dữ liệu"
              }
            />
            <BusinessInfoItem
              label="Mã số thuế"
              value={business?.taxCode || "Chưa có dữ liệu"}
            />
            <BusinessInfoItem
              label="Trạng thái KYB"
              value={business?.kybStatus || "Chưa có dữ liệu"}
            />
            <BusinessInfoItem
              label="Địa chỉ"
              value={business?.address || "Chưa có dữ liệu"}
              multiline
            />
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-4">
            <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">
              Giấy phép kinh doanh
            </p>
            <div className="mt-2">
              <FirebaseFileLink
                path={business?.businessLicenseUrl}
                emptyText="Chưa có giấy phép kinh doanh"
                buttonText="Xem giấy phép"
              />
            </div>
          </div>
        </div>
      </Modal>
    </main>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-brand-600 shadow-sm">
        {icon}
      </span>
      <div>
        <p className="text-xs font-bold text-slate-400">{label}</p>
        <p className="text-sm font-extrabold text-ink">{value}</p>
      </div>
    </div>
  );
}

function ChipRow({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-[150px_1fr] sm:items-start">
      <p className="text-lg font-extrabold text-slate-700">{label}</p>
      <div className="flex flex-wrap gap-3">
        {items.length > 0 ? (
          items.map((item) => (
            <span
              key={item}
              className="inline-flex min-h-10 items-center rounded-full border border-slate-200 bg-white px-5 py-2 text-base font-semibold text-ink shadow-sm"
            >
              {item}
            </span>
          ))
        ) : (
          <span className="inline-flex min-h-10 items-center rounded-full border border-dashed border-slate-200 bg-white px-5 py-2 text-base font-semibold text-slate-400">
            Chưa có dữ liệu
          </span>
        )}
      </div>
    </div>
  );
}

function MilestoneList({ milestones }: { milestones: Milestone[] }) {
  if (milestones.length === 0) {
    return (
      <EmptyState
        title="Chưa có milestone"
        description="Khi doanh nghiệp khai báo milestone, các mốc sẽ hiển thị tại đây."
      />
    );
  }

  return (
    <div className="mt-5 grid gap-3">
      {milestones
        .slice()
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((milestone) => (
          <div
            key={milestone.milestoneId}
            className="grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 md:grid-cols-[64px_1fr_160px]"
          >
            <p className="text-xs font-extrabold uppercase tracking-wide text-brand-600">
              Mốc {milestone.orderIndex}
            </p>
            <div className="min-w-0">
              <p className="break-words text-sm font-extrabold text-ink">
                {milestone.milestoneName}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-400">
                {milestone.status || "Pending"}
              </p>
            </div>
            <p className="text-sm font-extrabold text-ink md:text-right">
              {formatCurrency(milestone.fundsAllocated)}
            </p>
          </div>
        ))}
    </div>
  );
}

function BusinessInfoItem({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p
        className={
          multiline
            ? "mt-2 text-sm leading-6 text-slate-700"
            : "mt-2 break-words text-sm font-extrabold text-ink"
        }
      >
        {value}
      </p>
    </div>
  );
}

function FilterAccordion({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div>
          <p className="text-sm font-extrabold text-ink">{title}</p>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-slate-400 transition ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="border-t border-slate-100 p-3">{children}</div>}
    </div>
  );
}

function ChipGrid({
  items,
  emptyLabel,
  onToggle,
}: {
  items: Array<{ id: number; label: string; selected: boolean }>;
  emptyLabel: string;
  onToggle: (id: number) => void;
}) {
  return (
    <div className="grid max-h-48 gap-2 overflow-y-auto pr-1">
      {items.length === 0 && (
        <span className="text-sm font-semibold text-slate-400">
          {emptyLabel}
        </span>
      )}
      {items.map((item) => (
        <label
          key={item.id}
          className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold transition ${
            item.selected
              ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
              : "text-slate-600 hover:bg-white hover:text-brand-700"
          }`}
        >
          <input
            type="checkbox"
            className="h-5 w-5 rounded border-slate-300 text-emerald-600 accent-emerald-600"
            checked={item.selected}
            onChange={() => onToggle(item.id)}
          />
          <span className="min-w-0 flex-1 break-words">{item.label}</span>
        </label>
      ))}
    </div>
  );
}

export function ExpertDirectoryPage() {
  const [experts, setExperts] = useState<ExpertProfile[]>([]);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [technologies, setTechnologies] = useState<Technology[]>([]);
  const [query, setQuery] = useState("");
  const [domainFilterOpen, setDomainFilterOpen] = useState(false);
  const [skillFilterOpen, setSkillFilterOpen] = useState(false);
  const [technologyFilterOpen, setTechnologyFilterOpen] = useState(false);
  const [experienceFilter, setExperienceFilter] = useState<
    "ALL" | "UNDER_5" | "FROM_5_TO_10" | "OVER_10"
  >("ALL");
  const [selectedDomainIds, setSelectedDomainIds] = useState<number[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<number[]>([]);
  const [selectedTechnologyIds, setSelectedTechnologyIds] = useState<number[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadExperts() {
      setLoading(true);
      setError("");
      try {
        const [
          expertItems,
          portfolioItems,
          domainItems,
          skillItems,
          technologyItems,
        ] = await Promise.all([
          profileApi.listExperts(),
          profileApi.listPortfolios(),
          catalogApi.listDomains(true),
          catalogApi.listSkills(true),
          catalogApi.listTechnologies(true),
        ]);
        if (ignore) return;
        setExperts(expertItems);
        setPortfolios(portfolioItems);
        setDomains(domainItems);
        setSkills(skillItems);
        setTechnologies(technologyItems);
      } catch {
        if (ignore) return;
        setExperts([]);
        setPortfolios([]);
        setDomains([]);
        setSkills([]);
        setTechnologies([]);
        setError(
          "Chua lay duoc du lieu chuyen gia tu backend. Vui long kiem tra server hoac quyen truy cap API.",
        );
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadExperts();
    return () => {
      ignore = true;
    };
  }, []);

  const portfolioByExpertId = useMemo(
    () =>
      new Map(portfolios.map((portfolio) => [portfolio.expertId, portfolio])),
    [portfolios],
  );

  const toggleSelectedId = (
    value: number,
    setter: Dispatch<SetStateAction<number[]>>,
  ) => {
    setter((items) =>
      items.includes(value)
        ? items.filter((item) => item !== value)
        : [...items, value],
    );
  };

  const filteredExperts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const matchesAny = (selectedIds: number[], candidateIds: number[]) =>
      selectedIds.length === 0 ||
      selectedIds.some((selectedId) => candidateIds.includes(selectedId));

    return experts.filter((expert) => {
      const portfolio = portfolioByExpertId.get(expert.expertId);
      const experience =
        portfolio?.yearsExperience ?? expert.yearsOfExperience ?? 0;
      const domainIds = parseCatalogIds(portfolio?.domainIds);
      const skillIds = parseCatalogIds(portfolio?.skillIds);
      const technologyIds = parseCatalogIds(portfolio?.technologyIds);
      const skillNames = skillIds.map((skillId) =>
        resolveSkillName(skillId, skills),
      );
      const domainNames = domainIds.map((domainId) =>
        resolveDomainName(domainId, domains),
      );
      const technologyNames = technologyIds.map((technologyId) =>
        resolveTechnologyName(technologyId, technologies),
      );
      const searchable = [
        expert.fullName,
        expert.title,
        expert.phone,
        portfolio?.selfDescription,
        ...skillNames,
        ...domainNames,
        ...technologyNames,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        (!normalizedQuery || searchable.includes(normalizedQuery)) &&
        (experienceFilter === "ALL" ||
          (experienceFilter === "UNDER_5" && experience < 5) ||
          (experienceFilter === "FROM_5_TO_10" &&
            experience >= 5 &&
            experience <= 10) ||
          (experienceFilter === "OVER_10" && experience > 10)) &&
        matchesAny(selectedDomainIds, domainIds) &&
        matchesAny(selectedSkillIds, skillIds) &&
        matchesAny(selectedTechnologyIds, technologyIds)
      );
    });
  }, [
    domains,
    experienceFilter,
    experts,
    portfolioByExpertId,
    query,
    selectedDomainIds,
    selectedSkillIds,
    selectedTechnologyIds,
    skills,
    technologies,
  ]);

  const hasActiveFilters =
    query ||
    experienceFilter !== "ALL" ||
    selectedDomainIds.length > 0 ||
    selectedSkillIds.length > 0 ||
    selectedTechnologyIds.length > 0;

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 md:px-6">
      <PageHeader
        eyebrow="Expert network"
        title="Danh bạ chuyên gia AI"
        description="Giao diện phục vụ matching, review uy tín và lựa chọn chuyên gia. Khi API public expert profile chưa có dữ liệu, trang hiển thị trạng thái trống."
      />

      <Card className="mt-8 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Tim theo ten, ky nang, linh vuc, cong nghe..."
            className="flex-1"
          />
          <Button
            type="button"
            variant="secondary"
            disabled={!hasActiveFilters}
            onClick={() => {
              setQuery("");
              setExperienceFilter("ALL");
              setSelectedDomainIds([]);
              setSelectedSkillIds([]);
              setSelectedTechnologyIds([]);
            }}
          >
            <Search className="h-4 w-4" />
            Tìm kiếm
          </Button>
        </div>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-[340px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Filter className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-lg font-extrabold text-ink">
                  Loc nang cao
                </h3>
                <p className="text-sm text-slate-500">
                  Chon tieu chi de tim chuyen gia phu hop.
                </p>
              </div>
            </div>

            <div className="my-5 border-t border-slate-200/80" />

            <section>
              <p className="text-sm font-extrabold text-ink">Kinh nghiem</p>
              <div className="mt-3 grid gap-3">
                {[
                  { value: "ALL", label: "Khong loc" },
                  { value: "UNDER_5", label: "Duoi 5 nam" },
                  { value: "FROM_5_TO_10", label: "Tu 5-10 nam" },
                  { value: "OVER_10", label: "Tren 10 nam" },
                ].map((item) => {
                  const selected = experienceFilter === item.value;
                  return (
                    <label
                      key={item.value}
                      className="flex cursor-pointer items-center gap-3 rounded-2xl px-1 py-1 text-sm font-semibold text-slate-700"
                    >
                      <input
                        type="radio"
                        name="experience-filter"
                        checked={selected}
                        onChange={() =>
                          setExperienceFilter(
                            item.value as
                              | "ALL"
                              | "UNDER_5"
                              | "FROM_5_TO_10"
                              | "OVER_10",
                          )
                        }
                        className="h-5 w-5 accent-emerald-600"
                      />
                      {item.label}
                    </label>
                  );
                })}
              </div>
            </section>

            <div className="my-5 border-t border-dashed border-slate-200" />

            <div className="grid gap-3">
              <FilterAccordion
                title="Linh vuc"
                count={selectedDomainIds.length}
                open={domainFilterOpen}
                onToggle={() => setDomainFilterOpen((value) => !value)}
              >
                <ChipGrid
                  items={domains.map((domain) => ({
                    id: domain.domainId,
                    label: domain.domainName,
                    selected: selectedDomainIds.includes(domain.domainId),
                  }))}
                  emptyLabel="Chua co du lieu"
                  onToggle={(id) => toggleSelectedId(id, setSelectedDomainIds)}
                />
              </FilterAccordion>

              <FilterAccordion
                title="Ky nang"
                count={selectedSkillIds.length}
                open={skillFilterOpen}
                onToggle={() => setSkillFilterOpen((value) => !value)}
              >
                <ChipGrid
                  items={skills.map((skill) => ({
                    id: skill.skillId,
                    label: skill.skillName,
                    selected: selectedSkillIds.includes(skill.skillId),
                  }))}
                  emptyLabel="Chua co du lieu"
                  onToggle={(id) => toggleSelectedId(id, setSelectedSkillIds)}
                />
              </FilterAccordion>

              <FilterAccordion
                title="Cong nghe"
                count={selectedTechnologyIds.length}
                open={technologyFilterOpen}
                onToggle={() => setTechnologyFilterOpen((value) => !value)}
              >
                <ChipGrid
                  items={technologies.map((technology) => ({
                    id: technology.technologyId,
                    label: technology.technologyName,
                    selected: selectedTechnologyIds.includes(
                      technology.technologyId,
                    ),
                  }))}
                  emptyLabel="Chua co du lieu"
                  onToggle={(id) =>
                    toggleSelectedId(id, setSelectedTechnologyIds)
                  }
                />
              </FilterAccordion>
            </div>

            <div className="mt-5 flex flex-wrap gap-3 border-t border-slate-200/80 pt-4">
              <Button
                type="button"
                variant="secondary"
                disabled={!hasActiveFilters}
                onClick={() => {
                  setQuery("");
                  setExperienceFilter("ALL");
                  setSelectedDomainIds([]);
                  setSelectedSkillIds([]);
                  setSelectedTechnologyIds([]);
                }}
              >
                Xoa loc
              </Button>
              <Button type="button" onClick={() => {}}>
                Luu bo loc
              </Button>
            </div>
          </Card>
        </aside>

        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-slate-400">
              Hien thi {filteredExperts.length}/{experts.length} chuyen gia phu
              hop.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {error && (
              <Notice className="col-span-full" tone="warning" title={error} />
            )}
            {loading &&
              Array.from({ length: 4 }).map((_, index) => (
                <Card
                  key={`expert-skeleton-${index}`}
                  className="h-72 animate-pulse bg-slate-50 p-5"
                >
                  <span className="sr-only">Dang tai chuyen gia</span>
                </Card>
              ))}
            {!loading && filteredExperts.length === 0 && !error && (
              <div className="col-span-full">
                <EmptyState
                  title={
                    experts.length === 0
                      ? "Chua co chuyen gia"
                      : "Khong tim thay chuyen gia phu hop"
                  }
                  description={
                    experts.length === 0
                      ? "Khi backend co ho so chuyen gia, danh sach se hien thi tai day."
                      : "Thu bo bot linh vuc, ky nang, cong nghe hoac doi tu khoa tim kiem."
                  }
                />
              </div>
            )}
            {!loading &&
              filteredExperts.map((expert) => {
                const portfolio = portfolioByExpertId.get(expert.expertId);
                const skillNames = parseCatalogIds(portfolio?.skillIds)
                  .map((skillId) => resolveSkillName(skillId, skills))
                  .slice(0, 3);
                const experience =
                  portfolio?.yearsExperience ?? expert.yearsOfExperience ?? 0;
                const displayName =
                  expert.fullName || `Expert #${expert.expertId}`;
                const description =
                  portfolio?.selfDescription ||
                  expert.title ||
                  "Chuyen gia AI tren AITASKER";

                return (
                  <Card
                    key={expert.expertId}
                    hover
                    className="flex h-full flex-col p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <Avatar name={displayName} size="xl" />
                      <StatusBadge status={expert.kycStatus} />
                    </div>
                    <h3 className="mt-4 min-h-12 line-clamp-2 font-display text-lg font-extrabold leading-6 text-ink">
                      {displayName}
                    </h3>
                    <p className="mt-1 min-h-16 line-clamp-3 text-sm leading-6 text-slate-500">
                      {description}
                    </p>
                    <div className="mt-4 flex items-center gap-2">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      <span className="text-sm font-extrabold text-ink">
                        {experience} nam kinh nghiem
                      </span>
                    </div>
                    <div className="mt-4 flex min-h-16 flex-wrap content-start gap-2">
                      {skillNames.length > 0 ? (
                        skillNames.map((skill) => (
                          <Badge key={skill} tone="slate">
                            {skill}
                          </Badge>
                        ))
                      ) : (
                        <Badge tone="slate">Chua cap nhat ky nang</Badge>
                      )}
                    </div>
                    <div className="mt-auto pt-5">
                      {expert.portfolioUrl ? (
                        <FirebaseFileLink
                          path={expert.portfolioUrl}
                          buttonText="Xem nang luc"
                          emptyText="Chua co ho so nang luc"
                        />
                      ) : (
                        <Button className="w-full" variant="secondary" disabled>
                          Chua co ho so nang luc
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
          </div>
        </section>
      </div>
    </main>
  );
}

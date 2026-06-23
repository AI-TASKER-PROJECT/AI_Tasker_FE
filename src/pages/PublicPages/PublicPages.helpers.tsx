import {
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  ShieldCheck,
  Sparkles,
  Star,
  WalletCards,
  Search,
  Eye,
  BarChart3,
  Workflow,
  Cpu,
  PenTool,
  MessageSquareText,
  Target,
  FileSignature,
} from "lucide-react";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  catalogApi,
  contractApi,
  marketplaceApi,
  profileApi,
  type Domain,
  type JobSkill,
  type JobTechnology,
  type Skill,
  type Technology,
} from "../../lib/api";
import { getPublicExperience } from "../../lib/roleExperience";
import { useSession } from "../../lib/session";
import { cn, formatCompactCurrency, formatCurrency, formatDate } from "../../lib/utils";
import type { BusinessProfile, Job, Milestone } from "../../types";
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
  SectionHeading,
  StatusBadge,
} from "../../components/ui";
import { ScrollReveal } from "../../components/ui/ScrollReveal";

const heroImage =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDqRp4QflFu-D-EIWMjnmYsbOjXRCdI4aDej1btMDToV9m43vKdHfxezJrNscBn_wTGgZ68l0pe_bwjwtTOa-bBsxSLO5Wn2yULNmTW55tm8Qc3FhuQKqgvLSYNIWzGEXnIhkICsECPzizVd1xtttbyCcysC0xqjUXz60YhmWz_nqv9tke8Gbk3joKQgpwtuogZ4NYoYf6DujYBglOeeGb4Z53KlBwPvjc1tcVT6yjGY9kzfokWXgoJYx24h92N_E4kL6u7cDQtOJLX";

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
    marketplaceApi
      .listJobs()
      .then((data) => setJobs(data.slice(0, 3)))
      .catch(() => setJobs([]));
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
      <section className="relative overflow-hidden bg-[#fff8f8] px-4 pb-24 pt-20 md:px-6 md:pb-32">
        <div className="absolute inset-0 bg-[radial-gradient(#df0e84_1px,transparent_1px)] bg-[length:32px_32px] opacity-10" />
        <div className="absolute right-[-10rem] top-[-4rem] h-[32rem] w-[32rem] rounded-full bg-[#ffb0cc]/35 blur-3xl" />
        <div className="absolute left-[-8rem] top-[-8rem] h-[26rem] w-[26rem] rounded-full bg-[#d8e2ff]/45 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(420px,1.02fr)] lg:gap-16">
          <div>
            <Badge
              tone="brand"
              className="bg-[#df0e84] text-white ring-0 shadow-[0_6px_18px_rgba(223,14,132,.28)]"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {session?.role === "BUSINESS"
                ? "Không gian doanh nghiệp"
                : session?.role === "EXPERT"
                  ? "Không gian chuyên gia"
                  : session?.role === "STAFF"
                    ? "Không gian vận hành"
                    : session?.role === "ADMIN"
                      ? "Không gian quản trị"
                      : "Nền tảng AI Freelance Số 1"}
            </Badge>
            <h1 className="mt-6 max-w-[42rem] font-display text-5xl font-black leading-[1.05] tracking-[-0.04em] text-[#27171d] md:text-[4.2rem]">
              Nền tảng kết nối doanh nghiệp với{" "}
              <span className="inline-block text-[#b30069]">
                chuyên gia AI
                <span className="mt-1 block h-[4px] w-full rounded-full bg-[#0070ea]" />
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-xl leading-9 text-[#594048]">
              AITASKER giúp bạn tìm kiếm, thuê và quản lý dự án AI trọn vẹn từ
              hợp đồng dến thanh toán trên một hệ thống minh bạch.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <LinkButton
                to={publicExperience.primaryPath}
                size="lg"
                className="h-14 rounded-xl bg-[#b30069] px-8 text-[15px] font-bold shadow-[0_10px_24px_rgba(179,0,105,.22)] hover:bg-[#b8006c]"
              >
                {session ? publicExperience.primaryLabel : "Đăng dự án ngay"}
                <ArrowRight className="h-4 w-4" />
              </LinkButton>
              <LinkButton
                to={publicExperience.secondaryPath}
                size="lg"
                variant="secondary"
                className="h-14 rounded-xl border-[#8d6f79] bg-white px-8 text-[15px] font-bold text-[#27171d] hover:bg-[#fff0f3]"
              >
                {session ? publicExperience.secondaryLabel : "Tìm việc AI"}
                <Search className="h-4 w-4" />
              </LinkButton>
            </div>
            <div className="mt-14 flex items-center gap-4 border-t border-[#f8dbe3] pt-8">
              <div className="flex -space-x-3">
                <Avatar
                  name="Lan Anh"
                  size="sm"
                  className="ring-2 ring-[#fff8f8]"
                />
                <Avatar
                  name="Minh Khoa"
                  size="sm"
                  className="ring-2 ring-[#fff8f8]"
                />
                <Avatar
                  name="Bao Ngoc"
                  size="sm"
                  className="ring-2 ring-[#fff8f8]"
                />
                <span className="grid h-8 w-8 place-items-center rounded-full bg-[#ffd9e4] text-xs font-bold text-[#b30069] ring-2 ring-[#fff8f8]">
                  5k+
                </span>
              </div>
              <p className="text-base text-[#594048]">
                Hơn{" "}
                <span className="font-extrabold text-[#27171d]">5,000+</span>{" "}
                chuyên gia đã tham gia
              </p>
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="overflow-hidden rounded-[1.5rem] border border-[#e1bdc8]/30 bg-[#fff0f3]/70 p-2 shadow-[0_18px_40px_rgba(61,44,49,.12)] backdrop-blur-xl">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDqRp4QflFu-D-EIWMjnmYsbOjXRCdI4aDej1btMDToV9m43vKdHfxezJrNscBn_wTGgZ68l0pe_bwjwtTOa-bBsxSLO5Wn2yULNmTW55tm8Qc3FhuQKqgvLSYNIWzGEXnIhkICsECPzizVd1xtttbyCcysC0xqjUXz60YhmWz_nqv9tke8Gbk3joKQgpwtuogZ4NYoYf6DujYBglOeeGb4Z53KlBwPvjc1tcVT6yjGY9kzfokWXgoJYx24h92N_E4kL6u7cDQtOJLX"
                alt="Minh họa cộng tác AI"
                className="h-[27rem] w-full rounded-[1.15rem] object-cover"
              />
            </div>
            <div className="absolute left-0 top-8 rounded-2xl border border-[#e1bdc8] bg-white/95 px-4 py-3 shadow-lg">
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-[#0070ea] text-white">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-bold text-[#27171d]">
                    Hợp đồng ký kết
                  </p>
                  <p className="text-xs text-[#594048]">Vừa xong</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className="bg-white px-4 py-20 md:px-6 md:py-24"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-display text-[2rem] font-black text-[#27171d] md:text-[2.35rem]">
              Tính năng nổi bật
            </h2>
            <p className="mt-4 text-lg leading-8 text-[#594048]">
              Hệ sinh thái công cụ toàn diện giúp quá trình hợp tác trở nên dễ
              dàng và an toàn hơn bao giờ hết.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3 md:auto-rows-[250px]">
            <Card className="group relative overflow-hidden rounded-[1.2rem] border-[#f6dce5] bg-[#fff0f3] p-7 shadow-none md:col-span-2">
              <div className="relative z-10 max-w-[65%]">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#df0e84] text-white">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <h3 className="mt-6 font-display text-[2rem] font-black text-[#27171d]">
                  Hồ sơ xác minh
                </h3>
                <p className="mt-3 text-base leading-7 text-[#594048]">
                  100% chuyên gia trên nền tảng dều trải qua quy trình kiểm tra
                  năng lực và danh tính nghiêm ngặt.
                </p>
              </div>
              <div className="absolute bottom-0 right-0 h-40 w-40 bg-[linear-gradient(180deg,rgba(137,122,129,.05),rgba(137,122,129,.14))] [clip-path:polygon(52%_0,100%_0,100%_100%,15%_100%)] opacity-70 transition-opacity group-hover:opacity-100" />
            </Card>

            <Card className="rounded-[1.2rem] border-[#0070ea] bg-[#0070ea] p-7 text-white shadow-none">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-white/15 text-white">
                <Sparkles className="h-5 w-5" />
              </span>
              <h3 className="mt-12 font-display text-[2rem] font-black">
                AI gợi ý phù hợp
              </h3>
              <p className="mt-3 text-base leading-7 text-blue-50">
                Thuật toán thông minh phân tích yêu cầu và tự động dề xuất những
                chuyên gia có kỹ năng sát nhất với dự án của bạn.
              </p>
            </Card>

            {[
              {
                icon: <WalletCards className="h-5 w-5" />,
                title: "Ví diện tử & Thanh toán",
                description:
                  "Bảo mật tuyệt dối với hệ thống Escrow. Tiền chỉ dược giải ngân khi bạn hài lòng với kết quả nghiệm thu.",
                iconClassName: "bg-white text-[#df0e84]",
              },
              {
                icon: <CheckCircle2 className="h-5 w-5" />,
                title: "Quản lý Tiến dộ",
                description:
                  "Chia nhỏ dự án thành các mốc (Milestone) rõ ràng, dễ dàng theo dõi và dánh giá từng giai doạn.",
                iconClassName: "bg-[#2e7e94] text-white",
              },
              {
                icon: <BriefcaseBusiness className="h-5 w-5" />,
                title: "Hợp đồng & NDA diện tử",
                description:
                  "Ký kết văn bản pháp lý trực tuyến nhanh chóng, dảm bảo tính bảo mật và quyền sở hữu trí tuệ.",
                iconClassName: "bg-white text-[#0059bb]",
              },
            ].map((feature) => (
              <Card
                key={feature.title}
                className="rounded-[1.2rem] border-[#f6dce5] bg-[#fff0f3] p-7 shadow-none"
              >
                <span
                  className={`grid h-12 w-12 place-items-center rounded-xl ${feature.iconClassName}`}
                >
                  {feature.icon}
                </span>
                <h3 className="mt-8 font-display text-[2rem] font-black text-[#27171d]">
                  {feature.title}
                </h3>
                <p className="mt-3 text-base leading-7 text-[#594048]">
                  {feature.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="bg-white px-4 pb-20 md:px-6 md:pb-24">
        <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-[1.15fr_.85fr]">
          <Card className="overflow-hidden rounded-[1.5rem] border-[#f0dbe4] p-6 shadow-none md:p-7">
            <div className="flex items-start justify-between gap-4">
              <SectionHeading
                title="Dự án đang nổi bật"
                description="Dữ liệu dược tải trực tiếp từ API job hiện có dể giữ nguyên luồng public listing và diều hướng vào chi tiết job."
              />
              <LinkButton
                to="/business"
                variant="secondary"
                size="sm"
                className="rounded-xl"
              >
                Khám phá ngay
              </LinkButton>
            </div>
            <div className="mt-6 grid gap-3">
              {jobs.length > 0 ? (
                jobs.map((job) => (
                  <Link
                    key={job.jobId}
                    to={`/jobs/${job.jobId}`}
                    className="group rounded-[1rem] border border-[#f0dbe4] bg-[#fff8fb] p-4 transition hover:border-[#e1bdc8] hover:bg-[#fff0f3]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <JobDomainBadgeForJob
                          jobId={job.jobId}
                          className="mb-2"
                        />
                        <p className="font-bold text-[#27171d] transition group-hover:text-[#b30069]">
                          {job.title}
                        </p>
                        <p className="mt-1 text-sm text-[#594048]">
                          {job.companyName}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge tone="mint">
                        {formatCompactCurrency(job.budget)}
                      </Badge>
                      <Badge tone="slate">
                        {job.proposalsCount || 0} dề xuất
                      </Badge>
                    </div>
                  </Link>
                ))
              ) : (
                <EmptyState
                  title="Chưa có job công khai"
                  description="Khi API job chưa trả dữ liệu, phần này sẽ giữ trạng thái trống an toàn."
                />
              )}
            </div>
          </Card>

          <Card className="relative overflow-hidden rounded-[1.5rem] border-0 bg-[linear-gradient(180deg,#1877e6_0%,#0f69d8_100%)] p-6 text-white shadow-none md:p-7">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
            <div className="relative z-10">
              <Badge tone="mint" className="bg-white/15 text-white ring-0">
                Trợ lý tạo dự án AI
              </Badge>
              <h2 className="mt-6 font-display text-[2rem] font-black leading-tight">
                Luồng tạo dự án vẫn giữ nguyên logic hiện có của ứng dụng.
              </h2>
              <p className="mt-4 text-base leading-7 text-blue-50">
                CTA tiếp tục dùng route theo phiên dăng nhập hiện tại, còn form
                tạo dự án, xác minh và diều hướng sau dăng nhập vẫn không thay
                dổi.
              </p>
              <div className="mt-8">
                <LinkButton
                  to={publicExperience.primaryPath}
                  variant="secondary"
                  className="rounded-xl border-white/30 bg-white text-[#0f69d8] hover:bg-white/90"
                >
                  {session ? publicExperience.primaryLabel : "Bắt dầu dự án"}
                </LinkButton>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
}

export function JobsPage() {
  const session = useSession();
  const publicExperience = getPublicExperience(session);

  return (
    <div className="relative overflow-x-hidden bg-[#f7faff] pb-24 pt-16">
      <main className="relative z-10 mx-auto max-w-7xl px-4 md:px-6">
        {/* Section 1: Hero */}
        <ScrollReveal>
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <Badge
                tone="brand"
                className="bg-[#ffe6f0] text-[#C50070] ring-[#f6dce5]"
              >
                BUSINESS SOLUTION
              </Badge>
              <h1 className="mt-6 font-display text-4xl font-black leading-tight tracking-[-0.02em] text-ink lg:text-5xl lg:leading-[1.15]">
                Đưa dự án AI của doanh nghiệp từ ý tưởng dến triển khai thực tế
              </h1>
              <p className="mt-6 text-lg leading-8 text-slate-600">
                AITASKER giúp doanh nghiệp tìm dúng chuyên gia AI, dăng dự án
                nhanh chóng, nhận dề xuất phù hợp và quản lý toàn bộ quá trình
                hợp tác qua hợp dồng, milestone, escrow và nghiệm thu minh bạch.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <LinkButton
                  size="lg"
                  to={publicExperience.primaryPath}
                  className="bg-[#C50070] text-white hover:bg-[#a3005c]"
                >
                  Bắt dầu dự án
                </LinkButton>
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={() =>
                    document
                      .getElementById("process-section")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  Tìm hiểu quy trình
                </Button>
              </div>
            </div>
            <div className="relative hidden lg:block">
              <div className="rounded-[1.75rem] border border-[#e1bdc8]/30 bg-[rgba(255,240,243,0.7)] p-2 shadow-[0_18px_40px_rgba(61,44,49,.12)] backdrop-blur-[10px]">
                <img
                  src={heroImage}
                  alt="Minh họa cộng tác AI"
                  className="h-[25rem] w-full rounded-[1.25rem] object-cover"
                />
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Section 2: Trust metrics */}
        <ScrollReveal>
          <div className="mt-24 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Chuyên gia trong mạng lưới", value: "5,000+" },
              { label: "Lĩnh vực AI có thể triển khai", value: "30+" },
              { label: "Hợp dồng, NDA và escrow", value: "Minh bạch" },
              { label: "Nhận dề xuất phù hợp", value: "Nhanh chóng" },
            ].map((metric) => (
              <Card
                key={metric.label}
                className="flex flex-col items-center justify-center p-8 text-center"
              >
                <p className="font-display text-4xl font-black text-[#C50070]">
                  {metric.value}
                </p>
                <p className="mt-3 text-sm font-bold text-slate-600">
                  {metric.label}
                </p>
              </Card>
            ))}
          </div>
        </ScrollReveal>

        {/* Section 3: AI Capabilities */}
        <ScrollReveal>
          <div className="mt-32 text-center">
            <h2 className="font-display text-3xl font-black tracking-[-0.02em] text-ink lg:text-4xl">
              Doanh nghiệp có thể triển khai gì với AITASKER?
            </h2>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Chatbot chăm sóc khách hàng",
                desc: "Tích hợp trợ lý ảo AI dể hỗ trợ khách hàng 24/7.",
                icon: <Bot />,
              },
              {
                title: "Tự dộng hóa quy trình nội bộ",
                desc: "Tối ưu hóa các tác vụ lặp di lặp lại bằng AI và RPA.",
                icon: <Workflow />,
              },
              {
                title: "Phân tích dữ liệu kinh doanh",
                desc: "Dự báo xu hướng và phân tích dữ liệu dể ra quyết dịnh.",
                icon: <BarChart3 />,
              },
              {
                title: "Computer Vision",
                desc: "Nhận diện hình ảnh, OCR, và kiểm tra chất lượng tự dộng.",
                icon: <Eye />,
              },
              {
                title: "AI Recommendation System",
                desc: "Hệ thống gợi ý sản phẩm giúp tăng tỷ lệ chuyển dổi.",
                icon: <Cpu />,
              },
              {
                title: "Xây dựng MVP sản phẩm AI",
                desc: "Triển khai nhanh chóng phiên bản MVP dể thử nghiệm thị trường.",
                icon: <PenTool />,
              },
              {
                title: "Tối ưu vận hành bằng AI",
                desc: "Ứng dụng AI dể giảm chi phí và nâng cao hiệu suất hoạt dộng.",
                icon: <Target />,
              },
              {
                title: "Tư vấn chiến lược AI",
                desc: "Xây dựng lộ trình ứng dụng AI phù hợp với mục tiêu kinh doanh.",
                icon: <BriefcaseBusiness />,
              },
            ].map((role) => (
              <Card key={role.title} hover className="p-6">
                <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-[#ffe6f0] text-[#C50070]">
                  {role.icon}
                </span>
                <h3 className="text-lg font-extrabold text-ink">
                  {role.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {role.desc}
                </p>
              </Card>
            ))}
          </div>
        </ScrollReveal>

        {/* Section 4: Why choose us */}
        <ScrollReveal>
          <div className="mt-32">
            <h2 className="text-center font-display text-3xl font-black tracking-[-0.02em] text-ink lg:text-4xl">
              Vì sao doanh nghiệp chọn AITASKER?
            </h2>
            <div className="mt-12 grid gap-8 lg:grid-cols-4">
              {[
                {
                  title: "Tìm chuyên gia phù hợp bằng AI Matching",
                  desc: "Thuật toán thông minh tự dộng phân tích dự án và dề xuất chuyên gia có kỹ năng sát nhất.",
                  icon: <Sparkles />,
                  color: "text-[#0B7AEA]",
                  bg: "bg-[#e6f0ff]",
                },
                {
                  title: "Hồ sơ chuyên gia dược kiểm tra",
                  desc: "100% chuyên gia trên hệ thống dều trải qua quá trình xác minh danh tính và kiểm dịnh năng lực.",
                  icon: <ShieldCheck />,
                  color: "text-teal-600",
                  bg: "bg-teal-50",
                },
                {
                  title: "Quản lý dự án theo milestone",
                  desc: "Chia nhỏ dự án thành các giai doạn rõ ràng dể dễ dàng nghiệm thu và dánh giá tiến dộ.",
                  icon: <Target />,
                  color: "text-emerald-600",
                  bg: "bg-emerald-50",
                },
                {
                  title: "Thanh toán an toàn qua escrow",
                  desc: "Ngân sách dược hệ thống giữ an toàn và chỉ giải ngân khi bạn dã nghiệm thu công việc.",
                  icon: <FileSignature />,
                  color: "text-[#C50070]",
                  bg: "bg-[#ffe6f0]",
                },
              ].map((reason) => (
                <div key={reason.title} className="text-center">
                  <span
                    className={`mx-auto grid h-16 w-16 place-items-center rounded-[2rem] ${reason.bg} ${reason.color} mb-6`}
                  >
                    {reason.icon}
                  </span>
                  <h3 className="text-lg font-extrabold text-ink">
                    {reason.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    {reason.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* Section 5: Process */}
        <ScrollReveal>
          <Card
            id="process-section"
            className="mt-32 bg-gradient-to-br from-white to-[#ffe6f0]/20 p-8 md:p-12 lg:p-16"
          >
            <h2 className="text-center font-display text-3xl font-black tracking-[-0.02em] text-ink lg:text-4xl">
              Quy trình dành cho doanh nghiệp
            </h2>
            <div className="relative mt-16 grid gap-12 lg:grid-cols-4">
              <div className="absolute left-[12.5%] right-[12.5%] top-8 hidden h-px bg-slate-200 lg:block" />
              {[
                {
                  step: 1,
                  title: "Mô tả nhu cầu dự án AI",
                  desc: "Đăng tải yêu cầu chi tiết về bài toán doanh nghiệp cần giải quyết.",
                },
                {
                  step: 2,
                  title: "Nhận gợi ý chuyên gia và proposal phù hợp",
                  desc: "Hệ thống dề xuất chuyên gia phù hợp và nhận báo giá chi tiết.",
                },
                {
                  step: 3,
                  title: "Ký hợp dồng, NDA và thống nhất milestone",
                  desc: "Ký kết văn bản pháp lý diện tử và chốt kế hoạch thực hiện.",
                },
                {
                  step: 4,
                  title: "Theo dõi tiến dộ, nghiệm thu và thanh toán",
                  desc: "Quản lý tiến dộ theo từng cột mốc và thanh toán minh bạch qua escrow.",
                },
              ].map((step) => (
                <div key={step.step} className="relative z-10 text-center">
                  <span className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-full border-4 border-white bg-[#C50070] text-xl font-black text-white shadow-xl shadow-[#C50070]/20">
                    {step.step}
                  </span>
                  <h3 className="text-lg font-extrabold text-ink">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </ScrollReveal>
        {/* Section 7: Trust features */}
        <ScrollReveal>
          <div className="mt-32 border-y border-slate-200/60 py-16">
            <div className="mb-12 text-center">
              <h2 className="font-display text-2xl font-black text-ink">
                Hợp tác minh bạch & kiểm soát rủi ro
              </h2>
            </div>
            <div className="flex flex-wrap justify-center gap-4 md:gap-8">
              {[
                "KYB/KYC",
                "NDA diện tử",
                "Hợp dồng diện tử",
                "Escrow",
                "Milestone rõ ràng",
                "Đánh giá sau dự án",
                "Quản lý tranh chấp",
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <span className="font-bold text-slate-600">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </main>

      {/* AI/SaaS Light Mesh Grid Background Overlay */}
      <div className="pointer-events-none absolute inset-0 z-0 ai-grid-layer" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[30%] z-0 opacity-40 bottom-glow-overlay" />
    </div>
  );
}

function getDomainTone(name: string): "brand" | "mint" | "coral" | "amber" | "rose" | "violet" {
  const tones = ["brand", "mint", "coral", "amber", "rose", "violet"] as const;
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return tones[Math.abs(hash) % tones.length];
}

export function JobCard({
  job,
  manage = false,
  hideStatus = false,
}: {
  job: Job;
  manage?: boolean;
  hideStatus?: boolean;
}) {
  const [milestoneCount, setMilestoneCount] = useState(0);
  const [skillCount, setSkillCount] = useState(0);
  const [domainName, setDomainName] = useState<string>("");

  const [businessName, setBusinessName] = useState(
    job.companyName || "Doanh nghiệp",
  );

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

    profileApi
      .getBusinessByJob(job.jobId)
      .then((profile) => {
        if (ignore) return;
        if (profile?.companyName) {
          setBusinessName(profile.companyName);
        }
      })
      .catch(() => {});

    Promise.all([
      catalogApi.listDomains(true),
      catalogApi.listJobDomains(job.jobId)
    ])
      .then(([allDomains, jobDomains]) => {
        if (!ignore && jobDomains.length > 0) {
          const matched = allDomains.find(
            (d) => d.domainId === jobDomains[0].id.domainId
          );
          if (matched) setDomainName(matched.domainName);
        }
      })
      .catch(() => {});

    return () => {
      ignore = true;
    };
  }, [job.jobId]);

  return (
    <Card hover className="flex h-full flex-col p-5">
      <div className="flex min-h-9 items-start justify-between gap-3">
        {domainName ? (
          <Badge tone={getDomainTone(domainName)} className="w-fit border-0 px-3 py-1 text-[12px] font-semibold ring-0">
            {domainName}
          </Badge>
        ) : (
          <div /> /* Empty div to push StatusBadge to the right if we wanted, but let's keep StatusBadge on the left if no domain */
        )}
        {!hideStatus && <StatusBadge status={job.status} />}
      </div>
      <h3
        className={cn(
          "min-h-14 line-clamp-2 font-display text-lg font-extrabold leading-7 text-ink transition-all duration-200 group-hover:-translate-y-0.5 group-hover:text-brand-700",
          !hideStatus && "mt-4"
        )}
      >
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
      <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
        <p className="text-xs font-bold text-slate-400">Ngay tao job</p>
        <p className="mt-1 text-sm font-extrabold text-ink">
          {formatDate(job.createdAt)}
        </p>
      </div>
      <div className="mt-auto border-t border-slate-100 pt-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold text-slate-400">
            {businessName}
          </span>
          <LinkButton
            to={manage ? `/app/jobs/${job.jobId}/manage` : `/jobs/${job.jobId}`}
            size="sm"
            variant="secondary"
          >
            Chi tiết <ArrowRight className="h-4 w-4" />
          </LinkButton>
        </div>
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
      <div className="mb-8">
        <Link
          to={
            session?.role === "BUSINESS"
              ? `/app/jobs/${job.jobId}/manage`
              : "/app/opportunities"
          }
          className="text-sm font-bold text-brand-600"
        >
          ← Quay lại
        </Link>
        <div className="mt-5 flex flex-wrap gap-2">
          {jobDomainIds.map((domainId) => (
            <Badge key={domainId} tone="brand">
              {resolveDomainName(domainId, domains)}
            </Badge>
          ))}
        </div>
        <h1 className="mt-5 font-display text-4xl font-black tracking-[-0.045em] text-ink">
          {job.title}
        </h1>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          <Card className="p-6">
            <SectionHeading title="Thông tin dự án" />
            <div className="mt-5 whitespace-pre-wrap rounded-3xl bg-gradient-to-br from-brand-50 to-indigo-50 p-5 text-sm leading-7 text-slate-700">
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
              description="Các mốc công việc doanh nghiệp dã khai báo khi tạo job."
            />
            <MilestoneList milestones={milestones} />
            {(canSubmitProposal || !session) && (
              <div className="mt-8 flex justify-center border-t border-slate-100 pt-6">
                <LinkButton
                  to={session ? `/app/jobs/${job.jobId}/proposal` : "/login"}
                  size="lg"
                  className="px-8"
                >
                  Nộp proposal ngay
                </LinkButton>
              </div>
            )}
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
                icon={<Target className="h-4 w-4" />}
                label="Lĩnh vực"
                value={
                  domains
                    .filter((d) => jobDomainIds.includes(d.domainId))
                    .map((d) => d.domainName)
                    .join(", ") || "Chưa cập nhật"
                }
              />
              <InfoRow
                icon={<BriefcaseBusiness className="h-4 w-4" />}
                label="Doanh nghiệp"
                value={
                  business?.companyName || job.companyName || "Đang cập nhật"
                }
              />
              <InfoRow
                icon={<CheckCircle2 className="h-4 w-4" />}
                label="Milestone"
                value={`${milestones.length} mốc`}
              />
            </div>
            {business && (
              <Button
                onClick={() => setBusinessOpen(true)}
                className="mt-5 w-full"
              >
                Chi tiết doanh nghiệp
              </Button>
            )}
            {canSubmitProposal && (
              <LinkButton
                to={`/app/jobs/${job.jobId}/proposal`}
                className="mt-5 w-full"
              >
                Nộp Proposal ngay
              </LinkButton>
            )}
            {!session && (
              <LinkButton to="/login" className="mt-5 w-full">
                Nộp Proposal ngay
              </LinkButton>
            )}

            {session?.role === "EXPERT" && !isOpenJob && (
              <>
                <Button className="mt-5 w-full" disabled>
                  Nộp báo giá dự thầu
                </Button>
                <p className="mt-2 text-xs font-semibold text-slate-400">
                  Dự án cần ở trạng thái OPEN dể nhận proposal.
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
        description="Dữ liệu hồ sơ KYB của doanh nghiệp dăng job."
        size="lg"
      >
        <div className="grid gap-4">
          {businessLoading && (
            <Notice tone="info" title="Đang tải hồ sơ doanh nghiệp..." />
          )}
          {!businessLoading && !business && (
            <Notice
              tone="warning"
              title="Chưa lấy dược hồ sơ doanh nghiệp từ API hiện tại."
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
        description="Khi doanh nghiệp khai báo milestone, các mốc sẽ hiển thị tại dây."
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
              <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-slate-400">
                <Clock3 className="h-3.5 w-3.5" />
                {(() => {
                  const dVal =
                    milestone.durationValue ?? (milestone as any).duration;
                  return dVal && dVal > 0
                    ? `${dVal} ${milestone.durationUnit || "WEEK"}`
                    : "Chưa xác định";
                })()}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-400">
                Thời gian: {formatMilestoneDuration(milestone)}
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

function formatMilestoneDuration(milestone: Milestone) {
  const duration = Number(milestone.duration || 0);
  if (!Number.isFinite(duration) || duration <= 0) {
    return "Chưa có thời gian";
  }
  return `${duration} ${milestone.durationUnit || "tuần"}`;
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

export function ExpertDirectoryPage() {
  const session = useSession();

  return (
    <div className="relative overflow-hidden bg-[#f7faff] pb-24 pt-16">
      <div className="absolute inset-0 z-0 opacity-[0.03] [background-image:linear-gradient(to_right,#000_1px,transparent_1px),linear-gradient(to_bottom,#000_1px,transparent_1px)] [background-size:32px_32px]" />
      <div className="absolute inset-0 z-0 bg-gradient-to-t from-[#f7faff] via-transparent to-transparent" />
      <main className="relative z-10 mx-auto max-w-7xl px-4 md:px-6">
        {/* Section 1: Hero */}
        <ScrollReveal>
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <Badge tone="brand">EXPERT NETWORK</Badge>
              <h1 className="mt-6 font-display text-4xl font-black leading-tight tracking-[-0.02em] text-ink lg:text-5xl lg:leading-[1.15]">
                Mạng lưới chuyên gia AI sẵn sàng đồng hành cùng doanh nghiệp
              </h1>
              <p className="mt-6 text-lg leading-8 text-slate-600">
                Kết nối với các chuyên gia AI dã dược chọn lọc, có năng lực thực
                chiến và phù hợp với nhu cầu dự án của bạn — từ tư vấn chiến
                lược, xây dựng chatbot, automation, phân tích dữ liệu dến triển
                khai mô hình AI.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <LinkButton
                  size="lg"
                  to={session ? "/app/opportunities" : "/register"}
                >
                  Tìm dự án ngay
                </LinkButton>
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={() =>
                    document
                      .getElementById("process-section")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  Tìm hiểu quy trình
                </Button>
              </div>
            </div>
            <div className="relative hidden lg:block">
              <div className="rounded-[1.75rem] border border-[#e1bdc8]/30 bg-[rgba(255,240,243,0.7)] p-2 shadow-[0_18px_40px_rgba(61,44,49,.12)] backdrop-blur-[10px]">
                <img
                  src={heroImage}
                  alt="Minh họa cộng tác AI"
                  className="h-[25rem] w-full rounded-[1.25rem] object-cover"
                />
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Section 2: Trust metrics */}
        <ScrollReveal>
          <div className="mt-24 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Chuyên gia đã tham gia", value: "5,000+" },
              { label: "Lĩnh vực AI", value: "30+" },
              { label: "Hồ sơ dược kiểm tra", value: "100%" },
              { label: "Hợp đồng & thanh toán", value: "Minh bạch" },
            ].map((metric) => (
              <Card
                key={metric.label}
                className="flex flex-col items-center justify-center p-8 text-center"
              >
                <p className="font-display text-4xl font-black text-brand-600">
                  {metric.value}
                </p>
                <p className="mt-3 text-sm font-bold text-slate-600">
                  {metric.label}
                </p>
              </Card>
            ))}
          </div>
        </ScrollReveal>

        {/* Section 3: AI Capabilities Grid */}
        <ScrollReveal>
          <div className="mt-32 text-center">
            <h2 className="font-display text-3xl font-black tracking-[-0.02em] text-ink lg:text-4xl">
              Chuyên gia AI cho mọi nhu cầu
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
              Đội ngũ chuyên gia da dạng, dáp ứng toàn diện vòng dời phát triển
              dự án AI của doanh nghiệp.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "AI Strategy Consultant",
                desc: "Tư vấn lộ trình ứng dụng AI, dánh giá tính khả thi và thiết kế kiến trúc hệ thống.",
                icon: <BriefcaseBusiness />,
              },
              {
                title: "Chatbot & Conversational AI",
                desc: "Xây dựng trợ lý ảo thông minh, tích hợp LLMs vào quy trình chăm sóc khách hàng.",
                icon: <Bot />,
              },
              {
                title: "Computer Vision",
                desc: "Phân tích hình ảnh, nhận diện khuôn mặt, OCR và kiểm tra chất lượng tự động.",
                icon: <Eye />,
              },
              {
                title: "Data Science & Analytics",
                desc: "Khai phá dữ liệu, dự báo xu hướng và xây dựng dashboard BI nâng cao.",
                icon: <BarChart3 />,
              },
              {
                title: "Workflow Automation",
                desc: "Tự dộng hóa quy trình nghiệp vụ với AI agent, n8n, Zapier và RPA.",
                icon: <Workflow />,
              },
              {
                title: "Machine Learning Engineer",
                desc: "Huấn luyện, fine-tune và deploy các mô hình ML lên môi trường production.",
                icon: <Cpu />,
              },
              {
                title: "AI Product Designer",
                desc: "Thiết kế trải nghiệm người dùng tối ưu cho các sản phẩm tích hợp AI.",
                icon: <PenTool />,
              },
              {
                title: "Prompt Engineer",
                desc: "Tối ưu hóa câu lệnh giao tiếp với AI dể dạt dược kết quả chính xác cao nhất.",
                icon: <MessageSquareText />,
              },
            ].map((role) => (
              <Card key={role.title} hover className="p-6">
                <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                  {role.icon}
                </span>
                <h3 className="text-lg font-extrabold text-ink">
                  {role.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {role.desc}
                </p>
              </Card>
            ))}
          </div>
        </ScrollReveal>

        {/* Section 4: Why choose AITASKER experts? */}
        <ScrollReveal>
          <div className="mt-32">
            <h2 className="text-center font-display text-3xl font-black tracking-[-0.02em] text-ink lg:text-4xl">
              Vì sao doanh nghiệp chọn chuyên gia trên AITASKER?
            </h2>
            <div className="mt-12 grid gap-8 lg:grid-cols-4">
              {[
                {
                  title: "Hồ sơ dược xác minh",
                  desc: "Mọi chuyên gia dều phải trải qua quá trình KYC và kiểm dịnh năng lực khắt khe.",
                  icon: <ShieldCheck />,
                  color: "text-emerald-600",
                  bg: "bg-emerald-50",
                },
                {
                  title: "AI gợi ý chuyên gia",
                  desc: "Hệ thống AI tự động phân tích SoW và match dúng chuyên gia phù hợp nhất.",
                  icon: <Sparkles />,
                  color: "text-blue-600",
                  bg: "bg-blue-50",
                },
                {
                  title: "Làm việc theo milestone",
                  desc: "Chia nhỏ dự án thành các cột mốc rõ ràng, dễ dàng nghiệm thu và quản lý rủi ro.",
                  icon: <Target />,
                  color: "text-brand-600",
                  bg: "bg-brand-50",
                },
                {
                  title: "Minh bạch hợp đồng & escrow",
                  desc: "Hợp đồng diện tử, NDA bảo mật và cơ chế giữ tiền an toàn cho cả hai bên.",
                  icon: <FileSignature />,
                  color: "text-indigo-600",
                  bg: "bg-indigo-50",
                },
              ].map((reason) => (
                <div key={reason.title} className="text-center">
                  <span
                    className={`mx-auto grid h-16 w-16 place-items-center rounded-[2rem] ${reason.bg} ${reason.color} mb-6`}
                  >
                    {reason.icon}
                  </span>
                  <h3 className="text-lg font-extrabold text-ink">
                    {reason.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    {reason.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* Section 5: Process */}
        <ScrollReveal>
          <Card
            id="process-section"
            className="mt-32 bg-gradient-to-br from-white to-slate-50/50 p-8 md:p-12 lg:p-16"
          >
            <h2 className="text-center font-display text-3xl font-black tracking-[-0.02em] text-ink lg:text-4xl">
              Quy trình kết nối chuyên gia
            </h2>
            <div className="relative mt-16 grid gap-12 lg:grid-cols-4">
              <div className="absolute left-[12.5%] right-[12.5%] top-8 hidden h-px bg-slate-200 lg:block" />
              {[
                {
                  step: 1,
                  title: "Mô tả nhu cầu",
                  desc: "Doanh nghiệp dăng tải yêu cầu dự án AI cần giải quyết.",
                },
                {
                  step: 2,
                  title: "AI gợi ý chuyên gia",
                  desc: "Hệ thống phân tích và dề xuất chuyên gia phù hợp năng lực.",
                },
                {
                  step: 3,
                  title: "Ký hợp đồng",
                  desc: "Trao dổi proposal, chốt ngân sách và ký hợp đồng diện tử.",
                },
                {
                  step: 4,
                  title: "Nghiệm thu",
                  desc: "Theo dõi milestone, nghiệm thu công việc và thanh toán.",
                },
              ].map((step) => (
                <div key={step.step} className="relative z-10 text-center">
                  <span className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-full border-4 border-[#f7faff] bg-brand-600 text-xl font-black text-white shadow-xl shadow-brand-600/20">
                    {step.step}
                  </span>
                  <h3 className="text-lg font-extrabold text-ink">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </ScrollReveal>

        {/* Section 6: Trust features */}
        <ScrollReveal>
          <div className="mt-32 border-y border-slate-200/60 py-16">
            <div className="mb-12 text-center">
              <h2 className="font-display text-2xl font-black text-ink">
                Hợp tác minh bạch & tin cậy
              </h2>
            </div>
            <div className="flex flex-wrap justify-center gap-4 md:gap-8">
              {[
                "Định danh KYC/KYB",
                "Ký NDA diện tử",
                "Hợp đồng pháp lý",
                "Thanh toán Escrow",
                "Đánh giá năng lực",
                "Hỗ trợ giải quyết tranh chấp",
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <span className="font-bold text-slate-600">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </main>
    </div>
  );
}

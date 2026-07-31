import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Star,
  WalletCards,
} from "lucide-react";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
import {
  catalogApi,
  contractApi,
  marketplaceApi,
  profileApi,
  type Domain,
  type Skill,
  type Technology,
} from "../../lib/api";
import {
  cn,
  formatCompactCurrency,
  formatCurrency,
  formatDate,
} from "../../lib/utils";
import type { Job, Milestone } from "../../types";
import { getJobSowSummary } from "../../lib/jobSow";
import { jobDomainLabel } from "./publicPages.utils";
import {
  Badge,
  Card,
  EmptyState,
  LinkButton,
  StatusBadge,
} from "../../components/ui";
import heroLandingImage from "../../assets/images/img_landingPage.png";

export const heroImage = heroLandingImage;

export function skillCountLabel(count: number) {
  return `${count} kỹ năng`;
}

export function resolveSkillName(skillId: number, skills: Skill[]) {
  return (
    skills.find((skill) => skill.skillId === skillId)?.skillName ||
    "Kỹ năng chưa có tên"
  );
}

export function resolveTechnologyName(
  technologyId: number,
  technologies: Technology[],
) {
  return (
    technologies.find((technology) => technology.technologyId === technologyId)
      ?.technologyName || "Công nghệ chưa có tên"
  );
}

export function resolveDomainName(domainId: number, domains: Domain[]) {
  return (
    domains.find((domain) => domain.domainId === domainId)?.domainName ||
    "Lĩnh vực chưa có tên"
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

export function JobDomainBadgeForJob({
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
            {getJobSowSummary(detail) || detail.rawRequirements}
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
              value={`${detail.plannedDurationValue || 0} ${detail.plannedDurationUnit === "WEEK" ? "TUẦN" : detail.plannedDurationUnit || "tuần"}`}
            />
            <InfoRow
              icon={<Star className="h-4 w-4" />}
              label="Bản đề xuất"
              value={`${detail.proposalsCount || 0}`}
            />
            <InfoRow
              icon={<CheckCircle2 className="h-4 w-4" />}
              label="Mốc"
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
                Mốc
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

export const domainTones = [
  "brand",
  "mint",
  "coral",
  "amber",
  "rose",
  "violet",
] as const;

type DomainTone = (typeof domainTones)[number];

export function getDomainTone(name: string): DomainTone {
  let hash = 0;

  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % domainTones.length;

  return domainTones[index]!;
}

export function JobCard({
  job,
  manage = false,
  hideStatus = false,
  compact = false,
  hidePublicStats = false,
}: {
  job: Job;
  manage?: boolean;
  hideStatus?: boolean;
  compact?: boolean;
  hidePublicStats?: boolean;
}) {
  const [milestoneCount, setMilestoneCount] = useState(0);
  const [skillCount, setSkillCount] = useState(0);
  const [domainName, setDomainName] = useState<string>("");
  const [isLoadingDomain, setIsLoadingDomain] = useState(true);

  const [businessName, setBusinessName] = useState(
    job.companyName || "Doanh nghiệp",
  );

  useEffect(() => {
    let ignore = false;

    if (!compact && !hidePublicStats) {
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
    }

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
      catalogApi.listJobDomains(job.jobId),
    ])
      .then(([allDomains, jobDomains]) => {
        if (!ignore) {
          if (jobDomains.length > 0) {
            const matched = allDomains.find(
              (d) => d.domainId === jobDomains[0].id.domainId,
            );
            if (matched) setDomainName(matched.domainName);
          }
          setIsLoadingDomain(false);
        }
      })
      .catch(() => {
        if (!ignore) setIsLoadingDomain(false);
      });

    return () => {
      ignore = true;
    };
  }, [compact, hidePublicStats, job.jobId]);

  return (
    <Card
      hover
      className={cn("flex h-full min-w-0 flex-col", compact ? "p-4" : "p-5")}
    >
      <div className="flex min-h-9 items-start justify-between gap-3">
        {!isLoadingDomain ? (
          <JobDomainBadge label={domainName || "Chưa có lĩnh vực"} />
        ) : (
          <div className="h-6 w-24 animate-pulse rounded-full bg-slate-200" />
        )}
        {!hideStatus && <StatusBadge status={job.status} />}
      </div>
      <Link to={`/jobs/${job.jobId}`} className="group min-w-0">
        <h3
          className={cn(
            "min-h-14 line-clamp-2 break-words font-display text-lg font-extrabold leading-7 text-ink transition-all duration-200 group-hover:-translate-y-0.5 group-hover:text-pink-600",
            !hideStatus && "mt-4",
          )}
        >
          {job.title}
        </h3>
      </Link>
      <p
        className={cn(
          "mt-2 line-clamp-3 text-sm leading-6 text-slate-500",
          compact ? "min-h-[3.75rem]" : "min-h-[4.5rem]",
        )}
      >
        {getJobSowSummary(job) || job.rawRequirements}
      </p>
      <div
        className={cn(
          "grid gap-3 rounded-2xl bg-slate-50 p-3",
          hidePublicStats ? "grid-cols-1" : "grid-cols-2",
          compact ? "mt-3" : "mt-5",
        )}
      >
        <div>
          <p className="text-xs font-bold text-slate-400">Ngân sách</p>
          <p className="mt-1 text-sm font-extrabold text-ink">
            {formatCompactCurrency(job.budget)}
          </p>
        </div>
        {!hidePublicStats && (
          <div>
            <p className="text-xs font-bold text-slate-400">
              {compact ? "Ngày đăng bài" : "Bản đề xuất"}
            </p>
            <p className="mt-1 text-sm font-extrabold text-ink">
              {compact ? formatDate(job.createdAt) : job.proposalsCount || 0}
            </p>
          </div>
        )}
      </div>

      {!compact && !hidePublicStats && (
        <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
          <p className="text-xs font-bold text-slate-400">Kỹ năng</p>
          <p className="mt-1 text-sm font-extrabold text-ink">
            {skillCountLabel(skillCount)}
          </p>
        </div>
      )}
      {!compact && !hidePublicStats && (
        <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
          <p className="text-xs font-bold text-slate-400">Mốc</p>
          <p className="mt-1 text-sm font-extrabold text-ink">
            {milestoneCount} mốc
          </p>
        </div>
      )}
      {!compact && (
        <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
          <p className="text-xs font-bold text-slate-400">Ngày đăng bài</p>
          <p className="mt-1 text-sm font-extrabold text-ink">
            {formatDate(job.createdAt)}
          </p>
        </div>
      )}
      <div className="mt-auto border-t border-slate-100 pt-4">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
          <span className="min-w-0 break-words text-xs font-extrabold text-[#b30069]">
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

export function InfoRow({
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

export function ChipRow({ label, items }: { label: string; items: string[] }) {
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

export function MilestoneList({ milestones }: { milestones: Milestone[] }) {
  if (milestones.length === 0) {
    return (
      <EmptyState
        title="Chưa có mốc"
        description="Khi doanh nghiệp khai báo cột mốc, các cột mốc sẽ hiển thị tại đây."
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
                  const unit =
                    milestone.durationUnit === "WEEK"
                      ? "TUẦN"
                      : milestone.durationUnit || "TUẦN";
                  return dVal && dVal > 0 ? `${dVal} ${unit}` : "Chưa xác định";
                })()}
              </p>

              {milestone.criteria && milestone.criteria.length > 0 && (
                <div className="mt-3 space-y-1.5 border-t border-slate-200/60 pt-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Tiêu chí nghiệm thu
                  </p>
                  <ul className="grid gap-1.5">
                    {milestone.criteria.map((c, i) => (
                      <li
                        key={c.criteriaId || i}
                        className="flex items-start gap-2 text-sm text-slate-600"
                      >
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        <span>{c.description}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <p className="text-sm font-extrabold text-ink md:text-right">
              {formatCurrency(milestone.fundsAllocated)}
            </p>
          </div>
        ))}
    </div>
  );
}

export function BusinessInfoItem({
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

/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  CheckCircle2,
  Eye,
  FileCheck2,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  XCircle,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import {
  catalogApi,
  contractApi,
  getApiErrorMessage,
  marketplaceApi,
  profileApi,
  sowApi,
  type GeneratedSow,
  type GeneratedSowMilestone,
  type Domain,
  type JobSkill,
  type Skill,
} from "../../../services";
import { cn, formatCompactCurrency, formatCurrency } from "../../../lib/utils";
import { useSession } from "../../../context/sessionContext";
import { FirebaseFileLink } from "../../../components/FirebaseFileLink";
import type {
  AcceptanceCriteria,
  ExpertProfile,
  Job,
  Milestone,
  Portfolio,
  Proposal,
} from "../../../types";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  LinkButton,
  Modal,
  Notice,
  PageHeader,
  SearchInput,
  SectionHeading,
  StatusBadge,
  Textarea,
} from "../../../components/ui";
import { JobCard, JobDomainBadge } from "../../PublicPages";
import {
  formatGeneratedSow,
  jobDomainLabel,
  parseCatalogIdList,
  resolveDomainName,
  resolveSkillName,
  skillCountLabel,
  type MilestoneDraft,
  type SkillAssignment,
} from "../marketplacePages.utils";
import { MilestoneCount, SkillCount } from "../marketplacePages.helpers";
export function MyJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [milestonesByJobId, setMilestonesByJobId] = useState<
    Record<number, Milestone[]>
  >({});
  const [jobSkillsByJobId, setJobSkillsByJobId] = useState<
    Record<number, JobSkill[]>
  >({});
  const [jobDomainIdsByJobId, setJobDomainIdsByJobId] = useState<
    Record<number, number[]>
  >({});
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "DRAFT" | "OPEN" | "CLOSED"
  >("ALL");

  useEffect(() => {
    marketplaceApi
      .listMyJobs()
      .then(setJobs)
      .catch(() => setJobs([]));
    catalogApi
      .listDomains(true)
      .then(setDomains)
      .catch(() => setDomains([]));
  }, []);

  useEffect(() => {
    if (jobs.length === 0) {
      queueMicrotask(() => {
        setMilestonesByJobId({});
        setJobSkillsByJobId({});
        setJobDomainIdsByJobId({});
      });
      return;
    }
    let ignore = false;

    async function loadJobCounts() {
      const [milestoneResults, skillResults, domainResults] = await Promise.all(
        [
          Promise.allSettled(
            jobs.map((job) => contractApi.listJobMilestones(job.jobId)),
          ),
          Promise.allSettled(
            jobs.map((job) => catalogApi.listJobSkills(job.jobId)),
          ),
          Promise.allSettled(
            jobs.map((job) => catalogApi.listJobDomains(job.jobId)),
          ),
        ],
      );
      if (ignore) return;
      const milestoneMap: Record<number, Milestone[]> = {};
      const skillMap: Record<number, JobSkill[]> = {};
      const domainMap: Record<number, number[]> = {};
      milestoneResults.forEach((result, index) => {
        milestoneMap[jobs[index].jobId] =
          result.status === "fulfilled" ? result.value : [];
      });
      skillResults.forEach((result, index) => {
        skillMap[jobs[index].jobId] =
          result.status === "fulfilled" ? result.value : [];
      });
      domainResults.forEach((result, index) => {
        domainMap[jobs[index].jobId] =
          result.status === "fulfilled"
            ? result.value.map((item) => item.id.domainId)
            : [];
      });
      setMilestonesByJobId(milestoneMap);
      setJobSkillsByJobId(skillMap);
      setJobDomainIdsByJobId(domainMap);
    }

    loadJobCounts();
    return () => {
      ignore = true;
    };
  }, [jobs]);

  const statusTabs = [
    { value: "ALL", label: "All" },
    { value: "DRAFT", label: "Draft" },
    { value: "OPEN", label: "Open" },
    { value: "CLOSED", label: "Close" },
  ] as const;

  const statusCounts = statusTabs.reduce(
    (counts, tab) => ({
      ...counts,
      [tab.value]:
        tab.value === "ALL"
          ? jobs.length
          : jobs.filter((job) => job.status === tab.value).length,
    }),
    {} as Record<(typeof statusTabs)[number]["value"], number>,
  );

  const filtered = jobs.filter((job) => {
    const matchesQuery =
      `${job.title} ${job.rawRequirements} ${job.structuredSow || ""}`
        .toLowerCase()
        .includes(query.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || job.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const updateStatus = async (jobId: number, status: string) => {
    const updated = await marketplaceApi.updateJobStatus(jobId, status);
    setJobs((items) =>
      items.map((item) => (item.jobId === jobId ? updated : item)),
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="JOB-01 / MATCH-01"
        title="Dự án của doanh nghiệp"
        description="Tạo job, mở/đóng job, kiểm tra milestone và proposal chuyên gia gửi."
        actions={
          <LinkButton to="/app/jobs/new">
            <Plus className="h-4 w-4" />
            Tạo job mới
          </LinkButton>
        }
      />
      <Card className="p-3">
        <div className="flex flex-wrap gap-2">
          {statusTabs.map((tab) => {
            const isActive = statusFilter === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setStatusFilter(tab.value)}
                className={cn(
                  "inline-flex h-12 items-center gap-3 rounded-2xl border px-5 text-sm font-extrabold transition",
                  isActive
                    ? "border-brand-600 bg-brand-600 text-white shadow-[0_8px_20px_rgba(23,103,242,.2)]"
                    : "border-slate-200 bg-white text-brand-700 hover:border-brand-200 hover:bg-brand-50",
                )}
              >
                {tab.label}
                <span
                  className={cn(
                    "inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs font-black",
                    isActive
                      ? "bg-mint-50 text-mint-600"
                      : "bg-slate-100 text-slate-500",
                  )}
                >
                  {statusCounts[tab.value]}
                </span>
              </button>
            );
          })}
        </div>
      </Card>
      <Card className="p-4">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Tìm job của tôi..."
        />
      </Card>
      <div className="grid gap-4 lg:grid-cols-3">
        {filtered.map((job) => (
          <Card key={job.jobId} className="group flex h-full flex-col p-5">
            <div className="flex min-h-9 items-start justify-between gap-3">
              <JobDomainBadge
                label={jobDomainLabel(
                  jobDomainIdsByJobId[job.jobId] || [],
                  domains,
                )}
              />
              <StatusBadge status={job.status} />
            </div>
            <Link to={`/jobs/${job.jobId}`} className="group">
              <h3 className="mt-4 min-h-14 line-clamp-2 font-display text-lg font-extrabold leading-7 text-ink transition-all duration-200 group-hover:-translate-y-0.5 group-hover:text-brand-700">
                {job.title}
              </h3>
            </Link>
            <p className="mt-2 min-h-[4.5rem] line-clamp-3 text-sm leading-6 text-slate-500">
              {job.structuredSow}
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
            <SkillCount count={(jobSkillsByJobId[job.jobId] || []).length} />
            <MilestoneCount
              count={(milestonesByJobId[job.jobId] || []).length}
            />
            <div className="mt-auto flex flex-wrap gap-2 pt-5">
              <LinkButton
                to={`/app/jobs/${job.jobId}/manage`}
                variant="secondary"
                size="sm"
              >
                Quản lý
              </LinkButton>
              {job.status !== "OPEN" && (
                <Button
                  variant="success"
                  size="sm"
                  onClick={() => updateStatus(job.jobId, "OPEN")}
                >
                  Mở job
                </Button>
              )}
              {job.status === "OPEN" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => updateStatus(job.jobId, "CLOSED")}
                >
                  Đóng job
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

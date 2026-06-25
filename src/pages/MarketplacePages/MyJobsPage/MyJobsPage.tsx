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
import {
  cn,
  formatCompactCurrency,
  formatCurrency,
  formatDate,
} from "../../../lib/utils";
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
import { translateStatus } from "../ManageJobPage/ManageJobPage";
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
    "ALL" | "DRAFT" | "OPEN" | "IN_PROGRESS" | "CLOSED"
  >("ALL");

  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");

  const [restrictedActionNotices, setRestrictedActionNotices] = useState<
    Record<number, string>
  >({});

  const handleManageClick = (
    e: React.MouseEvent,
    jobId: number,
    status: string,
  ) => {
    if (status === "CLOSED") {
      e.preventDefault();
      setRestrictedActionNotices((prev) => ({
        ...prev,
        [jobId]:
          "Bài đăng đã bị gỡ xuống nên hệ thống không hỗ trợ tìm kiếm chuyên gia",
      }));
    } else if (status === "DRAFT") {
      e.preventDefault();
      setRestrictedActionNotices((prev) => ({
        ...prev,
        [jobId]:
          "Vui lòng đăng tải thông tin của dự án để hệ thống tìm kiếm chuyên gia phù hợp",
      }));
    }

    // Automatically scroll to the bottom of the card after the notice renders
    setTimeout(() => {
      document
        .getElementById(`job-card-${jobId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 50);
  };

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
    { value: "ALL", label: "Tất cả" },
    { value: "DRAFT", label: "Nháp" },
    { value: "OPEN", label: "Đang mở" },
    { value: "IN_PROGRESS", label: "Đang thực thi" },
    { value: "CLOSED", label: "Đã đóng" },
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

    const matchDate = (() => {
      if (!startDateFilter && !endDateFilter) return true;
      if (!job.createdAt) return false;

      const pDateStr = (() => {
        const pDate = new Date(job.createdAt);
        const year = pDate.getFullYear();
        const month = String(pDate.getMonth() + 1).padStart(2, "0");
        const day = String(pDate.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      })();

      if (startDateFilter && endDateFilter) {
        return pDateStr >= startDateFilter && pDateStr <= endDateFilter;
      } else if (startDateFilter) {
        return pDateStr >= startDateFilter;
      } else if (endDateFilter) {
        return pDateStr <= endDateFilter;
      }
      return true;
    })();

    return matchesQuery && matchesStatus && matchDate;
  });

  const updateStatus = async (jobId: number, status: string) => {
    const updated = await marketplaceApi.updateJobStatus(jobId, status);
    setJobs((items) =>
      items.map((item) => (item.jobId === jobId ? updated : item)),
    );
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          title="Dự án của doanh nghiệp"
          description="Tạo dự án mới, đăng tải, xem thông tin dự án và đánh giá proposal được gửi từ chuyên gia"
          actions={
            <LinkButton to="/app/jobs/new">
              <Plus className="h-4 w-4" />
              Tạo dự án mới
            </LinkButton>
          }
        />
      </div>
      <Card className="p-3">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
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
          <div className="flex flex-wrap items-center gap-2 px-2">
            <span className="text-sm font-semibold text-slate-500">
              Tìm kiếm dự án:
            </span>
            <div className="flex items-center gap-1">
              <Input
                type="date"
                value={startDateFilter}
                onChange={(e) => setStartDateFilter(e.target.value)}
                className="h-10 w-auto"
                placeholder="Từ ngày"
              />
              <span className="text-slate-400">-</span>
              <Input
                type="date"
                value={endDateFilter}
                onChange={(e) => setEndDateFilter(e.target.value)}
                className="h-10 w-auto"
                placeholder="Đến ngày"
              />
            </div>
            {(startDateFilter || endDateFilter) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStartDateFilter("");
                  setEndDateFilter("");
                }}
                className="text-slate-500"
              >
                Xoá bộ lọc
              </Button>
            )}
          </div>
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
        {filtered.map((job) => {
          const jobStatus = job.status.trim().toUpperCase();
          const isInProgress = jobStatus === "IN_PROGRESS";
          const canOpenJob = ["DRAFT", "CLOSED"].includes(jobStatus);
          const canCloseJob = jobStatus === "OPEN";
          return (
            <Card
              id={`job-card-${job.jobId}`}
              key={job.jobId}
              className="group flex h-full flex-col p-5"
            >
              <div className="flex min-h-9 items-start justify-between gap-3">
                <JobDomainBadge
                  label={jobDomainLabel(
                    jobDomainIdsByJobId[job.jobId] || [],
                    domains,
                  )}
                />
                <StatusBadge status={translateStatus(job.status)} />
              </div>
              <Link to={`/jobs/${job.jobId}`} className="group">
                <h3 className="mt-4 min-h-14 line-clamp-2 font-display text-lg font-extrabold leading-7 text-ink transition-all duration-200 group-hover:-translate-y-0.5 group-hover:text-brand-700">
                  {job.title}
                </h3>
              </Link>
              <p className="mt-2 min-h-[4.5rem] line-clamp-3 text-sm leading-6 text-slate-500">
                {job.structuredSow}
              </p>
              <p className="mt-2 text-xs font-bold text-slate-400">
                Ngày tạo: {formatDate(job.createdAt)}
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
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Link
                  to={`/app/jobs/${job.jobId}/detail`}
                  className="flex h-12 w-full items-center justify-center rounded-xl border-2 border-transparent bg-[#b30069] px-6 text-[15px] font-bold text-white transition-all hover:-translate-y-1 hover:border-[#b30069] hover:bg-white hover:text-[#b30069] hover:shadow-lg"
                >
                  Chi tiết dự án
                </Link>
                <Link
                  to={`/app/jobs/${job.jobId}/manage`}
                  onClick={(e) => handleManageClick(e, job.jobId, jobStatus)}
                  className="flex h-12 w-full items-center justify-center rounded-xl border-2 border-transparent bg-[#b30069] px-6 text-[15px] font-bold text-white transition-all hover:-translate-y-1 hover:border-[#b30069] hover:bg-white hover:text-[#b30069] hover:shadow-lg"
                >
                  Lựa chọn chuyên gia
                </Link>
              </div>
              {restrictedActionNotices[job.jobId] && (
                <Notice
                  tone="warning"
                  title="Không thể thực hiện"
                  className="mt-3"
                >
                  <p>{restrictedActionNotices[job.jobId]}</p>
                </Notice>
              )}

              <div className="mt-auto flex flex-wrap gap-2 pt-5">
                {isInProgress && <Badge tone="amber">Đang thực thi</Badge>}
                {canOpenJob && (
                  <Button
                    size="sm"
                    onClick={() => updateStatus(job.jobId, "OPEN")}
                    className="bg-green-600 text-white hover:bg-green-700 transition-all hover:-translate-y-1"
                  >
                    Mở dự án
                  </Button>
                )}
                {canCloseJob && (
                  <Button
                    size="sm"
                    onClick={() => updateStatus(job.jobId, "CLOSED")}
                    className="bg-red-600 text-white hover:bg-red-700 transition-all hover:-translate-y-1"
                  >
                    Đóng dự án
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

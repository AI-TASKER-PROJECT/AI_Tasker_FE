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
  Contract,
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
export function ProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [jobsById, setJobsById] = useState<Record<number, Job>>({});
  const [domains, setDomains] = useState<Domain[]>([]);
  const [jobDomainIdsByJobId, setJobDomainIdsByJobId] = useState<
    Record<number, number[]>
  >({});
  const [milestonesByJobId, setMilestonesByJobId] = useState<
    Record<number, Milestone[]>
  >({});
  const [contractsByProposalId, setContractsByProposalId] = useState<
    Record<number, Contract>
  >({});
  const [loading, setLoading] = useState(true);
  const [proposalStatusFilter, setProposalStatusFilter] = useState<
    "ALL" | "ACCEPTED" | "PENDING" | "REJECTED"
  >("ALL");

  useEffect(() => {
    let ignore = false;

    async function loadProposals() {
      setLoading(true);
      try {
        const items = await marketplaceApi.listMyProposals(); //api lấy về toàn bộ danh sách của expert tương ứng
        if (ignore) return;
        setProposals(items);
        const uniqueJobIds = Array.from(
          new Set(items.map((item) => item.jobId)),
        );
        const jobResults = await Promise.allSettled(
          uniqueJobIds.map((id) => marketplaceApi.getJob(id)), //api Lấy thông tin chi tiết của từng công việc
        );
        const [domainItems, jobDomainResults, milestoneResults, contractItems] =
          await Promise.all([
            catalogApi.listDomains(true).catch(() => []), // api lấy toàn bộ danh sách Lĩnh vực
            Promise.allSettled(
              uniqueJobIds.map((id) => catalogApi.listJobDomains(id)), //api Lấy danh sách các Lĩnh vực dựa trên JobId
            ),
            Promise.allSettled(
              uniqueJobIds.map((id) => contractApi.listJobMilestones(id)), //api Lấy danh sách tất cả các mốc tiến độ dựa trên id
            ),
            contractApi.listContracts().catch(() => []),
          ]);
        if (ignore) return;
        const map: Record<number, Job> = {};
        jobResults.forEach((result) => {
          if (result.status === "fulfilled") {
            map[result.value.jobId] = result.value;
          }
        });
        const domainMap: Record<number, number[]> = {};
        jobDomainResults.forEach((result, index) => {
          domainMap[uniqueJobIds[index]] =
            result.status === "fulfilled"
              ? result.value.map((item) => item.id.domainId)
              : [];
        });
        const milestoneMap: Record<number, Milestone[]> = {};
        milestoneResults.forEach((result, index) => {
          milestoneMap[uniqueJobIds[index]] =
            result.status === "fulfilled" ? result.value : [];
        });
        setJobsById(map);
        setDomains(domainItems);
        setJobDomainIdsByJobId(domainMap);
        setMilestonesByJobId(milestoneMap);
        setContractsByProposalId(
          Object.fromEntries(
            contractItems
              .filter((contract) => contract.proposalId)
              .map((contract) => [contract.proposalId as number, contract]),
          ),
        );
      } catch {
        if (!ignore) {
          setProposals([]);
          setJobsById({});
          setDomains([]);
          setJobDomainIdsByJobId({});
          setMilestonesByJobId({});
          setContractsByProposalId({});
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadProposals();
    return () => {
      ignore = true;
    };
  }, []);

  const proposalStatusTabs = [
    { value: "ALL", label: "All" },
    { value: "ACCEPTED", label: "Accepted" },
    { value: "PENDING", label: "Pending" },
    { value: "REJECTED", label: "Rejected" },
  ] as const;

  const normalizedProposalStatus = (status?: string) =>
    (status || "").trim().toUpperCase();

  const proposalStatusCounts = proposalStatusTabs.reduce(
    (counts, tab) => ({
      ...counts,
      [tab.value]:
        tab.value === "ALL"
          ? proposals.length
          : proposals.filter(
              (proposal) =>
                normalizedProposalStatus(proposal.status) === tab.value,
            ).length,
    }),
    {} as Record<(typeof proposalStatusTabs)[number]["value"], number>,
  );

  const filteredProposals = proposals.filter(
    (proposal) =>
      proposalStatusFilter === "ALL" ||
      normalizedProposalStatus(proposal.status) === proposalStatusFilter,
  );

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
        eyebrow="MATCH-02"
        title="Proposal của tôi"
        description="Theo dõi proposal đã gửi, trạng thái xét duyệt, bid amount và nội dung giải pháp đã nộp."
        actions={
          <LinkButton to="/app/opportunities" variant="secondary">
            <RefreshCw className="h-4 w-4" /> Tìm job mới
          </LinkButton>
        }
      />
      </div>
      <Card className="p-3">
        <div className="flex flex-wrap gap-2">
          {proposalStatusTabs.map((tab) => {
            const isActive = proposalStatusFilter === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setProposalStatusFilter(tab.value)}
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
                  {proposalStatusCounts[tab.value]}
                </span>
              </button>
            );
          })}
        </div>
      </Card>
      {loading && <Notice tone="info" title="Đang tải proposal..." />}
      <div className="grid gap-4">
        {filteredProposals.map((proposal) => {
          const job = jobsById[proposal.jobId];
          const milestones = milestonesByJobId[proposal.jobId] || [];
          const proposalMilestones = parseProposalMilestones(
            proposal.proposalMilestone,
          );
          const contract = contractsByProposalId[proposal.proposalId];
          return (
            <Card key={proposal.proposalId} className="overflow-hidden">
              <div className="grid gap-4 bg-[linear-gradient(135deg,#ffffff,#eef7ff)] p-5 lg:grid-cols-[1fr_240px]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <JobDomainBadge
                      label={jobDomainLabel(
                        jobDomainIdsByJobId[proposal.jobId] || [],
                        domains,
                      )}
                    />
                    <StatusBadge status={proposal.status} />
                  </div>
                  <h3 className="mt-3 font-display text-xl font-black text-ink">
                    {job?.title || `Job #${proposal.jobId}`}
                  </h3>
                  <p className="mt-2 line-clamp-2 max-w-3xl text-sm leading-6 text-slate-500">
                    {proposal.proposalDescription || proposal.technicalSolution}
                  </p>
                </div>
                <div className="rounded-3xl bg-white/85 px-5 py-4 text-left shadow-sm lg:text-right">
                  <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">
                    Bid amount
                  </p>
                  <p className="font-display text-2xl font-black text-brand-700">
                    {formatCompactCurrency(proposal.bidAmount)}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-400">
                    Proposal #{proposal.proposalId}
                  </p>
                </div>
              </div>
              <div className="grid gap-4 p-5">
                <div className="grid gap-3 lg:grid-cols-2">
                  <ProposalSnapshot title="Giải pháp công nghệ">
                    {proposal.technicalSolution}
                  </ProposalSnapshot>
                  <ProposalSnapshot title="Proposal description">
                    {proposal.proposalDescription || "Chưa có mô tả proposal."}
                  </ProposalSnapshot>
                </div>
                <div className="grid gap-3 md:grid-cols-[1fr_220px]">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">
                      Proposal milestone
                    </p>
                    {proposalMilestones.length > 0 ? (
                      <div className="mt-3 grid gap-2">
                        {proposalMilestones.map((item) => (
                          <div
                            key={item.milestoneId}
                            className="grid gap-3 rounded-xl bg-white px-3 py-3 text-sm md:grid-cols-[82px_1fr_auto] md:items-center"
                          >
                            <span className="font-extrabold text-brand-600">
                              {formatProposalMilestoneOrder(
                                item.milestoneId,
                                milestones,
                              )}
                            </span>
                            <span className="font-bold text-slate-600">
                              {formatProposalMilestoneTitle(
                                item.milestoneId,
                                milestones,
                              )}
                              <span className="mt-1 block text-xs font-semibold text-slate-400">
                                {formatProposalMilestoneStatus(
                                  item.milestoneId,
                                  milestones,
                                )}
                              </span>
                            </span>
                            <span className="font-extrabold text-ink">
                              {formatCompactCurrency(item.proposedBudget)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm font-semibold text-slate-400">
                        Chưa gửi ngân sách milestone riêng.
                      </p>
                    )}
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-white p-4">
                    <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-slate-400">
                      File đính kèm
                    </p>
                    <FirebaseFileLink
                      path={proposal.proposalFileUrl}
                      emptyText="Chưa có file proposal"
                      buttonText="Xem file"
                      showPath={false}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                  <p className="text-xs font-bold text-slate-400">
                    Gửi lúc: {proposal.createdAt || "Chưa có dữ liệu"}
                  </p>
                  {job && (
                    <LinkButton
                      to={`/jobs/${job.jobId}`}
                      variant="secondary"
                      size="sm"
                    >
                      Xem job
                    </LinkButton>
                  )}
                  {contract && (
                    <LinkButton
                      to={`/app/contracts/${contract.contractId}`}
                      size="sm"
                    >
                      Xem hợp đồng nháp
                    </LinkButton>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      {!loading && filteredProposals.length === 0 && (
        <EmptyState
          title="Chưa có proposal"
          description="Không có proposal phù hợp với trạng thái đang lọc."
        />
      )}
    </div>
  );
}

function ProposalSnapshot({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">
        {title}
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-700">
        {children || "Chưa có dữ liệu."}
      </p>
    </div>
  );
}

function parseProposalMilestones(value: unknown) {
  if (!value) return [];
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => ({
        milestoneId: Number(item.milestoneId),
        proposedBudget: Number(item.proposedBudget),
      }))
      .filter(
        (item) =>
          Number.isFinite(item.milestoneId) &&
          Number.isFinite(item.proposedBudget),
      );
  } catch {
    return [];
  }
}

function formatProposalMilestoneTitle(
  milestoneId: number,
  milestones: Milestone[],
) {
  const milestone = milestones.find((item) => item.milestoneId === milestoneId);
  if (!milestone) return `Milestone #${milestoneId}`;
  return milestone.milestoneName;
}

function formatProposalMilestoneOrder(
  milestoneId: number,
  milestones: Milestone[],
) {
  const milestone = milestones.find((item) => item.milestoneId === milestoneId);
  return milestone ? `Mốc ${milestone.orderIndex}` : "Milestone";
}

function formatProposalMilestoneStatus(
  milestoneId: number,
  milestones: Milestone[],
) {
  return (
    milestones.find((item) => item.milestoneId === milestoneId)?.status ||
    "Pending"
  );
}

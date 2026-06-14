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
export function ProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [jobsById, setJobsById] = useState<Record<number, Job>>({});
  const [domains, setDomains] = useState<Domain[]>([]);
  const [jobDomainIdsByJobId, setJobDomainIdsByJobId] = useState<
    Record<number, number[]>
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
        const items = await marketplaceApi.listMyProposals();
        if (ignore) return;
        setProposals(items);
        const uniqueJobIds = Array.from(
          new Set(items.map((item) => item.jobId)),
        );
        const jobResults = await Promise.allSettled(
          uniqueJobIds.map((id) => marketplaceApi.getJob(id)),
        );
        const [domainItems, jobDomainResults] = await Promise.all([
          catalogApi.listDomains(true).catch(() => []),
          Promise.allSettled(
            uniqueJobIds.map((id) => catalogApi.listJobDomains(id)),
          ),
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
        setJobsById(map);
        setDomains(domainItems);
        setJobDomainIdsByJobId(domainMap);
      } catch {
        if (!ignore) {
          setProposals([]);
          setJobsById({});
          setDomains([]);
          setJobDomainIdsByJobId({});
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
      <PageHeader
        eyebrow="MATCH-02"
        title="Proposal của tôi"
        description="Back-end chưa có API list proposal theo expert, UI giữ màn hình để nối khi endpoint bổ sung."
        actions={
          <LinkButton to="/app/opportunities" variant="secondary">
            <RefreshCw className="h-4 w-4" /> Tìm job mới
          </LinkButton>
        }
      />
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
          return (
            <Card key={proposal.proposalId} className="p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <JobDomainBadge
                      label={jobDomainLabel(
                        jobDomainIdsByJobId[proposal.jobId] || [],
                        domains,
                      )}
                    />
                    <StatusBadge status={proposal.status} />
                  </div>
                  <h3 className="mt-3 font-display text-lg font-extrabold text-ink">
                    {job?.title || `Job #${proposal.jobId}`}
                  </h3>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                    {proposal.technicalSolution}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
                  <p className="text-xs font-bold text-slate-400">Bid amount</p>
                  <p className="font-display text-xl font-black text-brand-700">
                    {formatCompactCurrency(proposal.bidAmount)}
                  </p>
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

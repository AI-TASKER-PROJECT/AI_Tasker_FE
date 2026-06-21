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
export function OpportunitiesPage() {
  const [query, setQuery] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    marketplaceApi
      .listJobs()
      .then(setJobs)
      .catch(() => setJobs([]));
  }, []);

  const filteredJobs = useMemo(
    () =>
      jobs.filter((job) =>
        `${job.title} ${job.rawRequirements} ${job.structuredSow || ""}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [jobs, query],
  );
  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
        eyebrow="MATCH-02"
        title="Cơ hội dành cho chuyên gia"
        description="Chuyên gia xem job công khai và nộp proposal chủ động."
      />
      </div>
      <Card className="p-4">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Tìm cơ hội theo kỹ năng..."
        />
      </Card>
      <div className="grid gap-4 lg:grid-cols-3">
        {filteredJobs.map((job) => (
          <JobCard key={job.jobId} job={job} />
        ))}
      </div>
      {filteredJobs.length === 0 && (
        <EmptyState
          title="Chưa có job mở"
          description="Dữ liệu được lấy trực tiếp từ backend `/api/v1/jobs`."
        />
      )}
    </div>
  );
}

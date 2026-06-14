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
import { useNavigate } from "react-router-dom";
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
function CompactMilestones({ milestones }: { milestones: Milestone[] }) {
  if (milestones.length === 0) {
    return (
      <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-400">
        Chưa có milestone.
      </div>
    );
  }

  return (
    <div className="mt-4 grid gap-2">
      {milestones
        .slice()
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((milestone) => (
          <div
            key={`${milestone.jobId}-${milestone.milestoneId}-${milestone.orderIndex}`}
            className="grid gap-2 rounded-2xl border border-slate-100 bg-white p-3 text-sm md:grid-cols-[56px_1fr_auto]"
          >
            <p className="text-xs font-extrabold uppercase tracking-wide text-brand-600">
              Mốc {milestone.orderIndex}
            </p>
            <div className="min-w-0">
              <p className="break-words font-extrabold text-ink">
                {milestone.milestoneName}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-400">
                {milestone.status || "Pending"}
              </p>
            </div>
            <p className="font-extrabold text-ink md:text-right">
              {formatCompactCurrency(milestone.fundsAllocated)}
            </p>
          </div>
        ))}
    </div>
  );
}

function MilestoneCount({ count }: { count: number }) {
  return (
    <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-3">
      <p className="text-xs font-bold text-slate-400">Milestone</p>
      <p className="mt-1 text-sm font-extrabold text-ink">{count} mốc</p>
    </div>
  );
}

function SkillCount({ count }: { count: number }) {
  return (
    <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-3">
      <p className="text-xs font-bold text-slate-400">Kỹ năng</p>
      <p className="mt-1 text-sm font-extrabold text-ink">
        {skillCountLabel(count)}
      </p>
    </div>
  );
}

export function SubmitProposalPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const session = useSession();
  const numericJobId = Number(jobId);
  const [job, setJob] = useState<Job | null>(null);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [jobDomainIds, setJobDomainIds] = useState<number[]>([]);
  const [jobSkillIds, setJobSkillIds] = useState<number[]>([]);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [savedProposal, setSavedProposal] = useState<Proposal | null>(null);
  const [form, setForm] = useState({
    bidAmount: "",
    technicalSolution: "",
    projectIntention: "",
    domainId: "",
    skillId: "",
  });

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        const [
          jobItem,
          domainItems,
          skillItems,
          jobDomainItems,
          jobSkillItems,
          portfolioResult,
        ] = await Promise.all([
          marketplaceApi.getJob(numericJobId),
          catalogApi.listDomains(true),
          catalogApi.listSkills(true),
          catalogApi.listJobDomains(numericJobId),
          catalogApi.listJobSkills(numericJobId),
          profileApi.getMyPortfolio().catch(() => null),
        ]);
        if (ignore) return;
        setJob(jobItem);
        setDomains(domainItems);
        setSkills(skillItems);
        setJobDomainIds(jobDomainItems.map((item) => item.id.domainId));
        setJobSkillIds(jobSkillItems.map((item) => item.id.skillId));
        setPortfolio(portfolioResult);
      } catch {
        if (!ignore) setJob(null);
      }
    }

    loadData();
    return () => {
      ignore = true;
    };
  }, [numericJobId]);

  const allowedDomainIds = useMemo(() => {
    const portfolioDomainIds = parseCatalogIdList(portfolio?.domainIds);
    return jobDomainIds.filter((id) => portfolioDomainIds.includes(id));
  }, [jobDomainIds, portfolio?.domainIds]);

  const allowedSkillIds = useMemo(() => {
    const portfolioSkillIds = parseCatalogIdList(portfolio?.skillIds);
    return jobSkillIds.filter((id) => portfolioSkillIds.includes(id));
  }, [jobSkillIds, portfolio?.skillIds]);

  useEffect(() => {
    queueMicrotask(() => {
      setForm((value) => ({
        ...value,
        domainId:
          value.domainId && allowedDomainIds.includes(Number(value.domainId))
            ? value.domainId
            : allowedDomainIds[0]
              ? String(allowedDomainIds[0])
              : "",
        skillId:
          value.skillId && allowedSkillIds.includes(Number(value.skillId))
            ? value.skillId
            : allowedSkillIds[0]
              ? String(allowedSkillIds[0])
              : "",
      }));
    });
  }, [allowedDomainIds, allowedSkillIds]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (session?.role !== "EXPERT") {
      setMessage("Chỉ tài khoản Chuyên gia mới có thể nộp báo giá dự thầu.");
      return;
    }
    const bidAmount = Number(form.bidAmount);
    if (!Number.isFinite(bidAmount) || bidAmount <= 0) {
      setMessage("bid_amount phải là số lớn hơn 0.");
      return;
    }
    if (!form.technicalSolution.trim()) {
      setMessage("technical_solution không được để trống.");
      return;
    }
    if (!form.domainId || !form.skillId) {
      setMessage(
        "Vui lòng chọn lĩnh vực và kỹ năng phù hợp với portfolio của bạn.",
      );
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const proposal = await marketplaceApi.submitProposal({
        jobId: numericJobId,
        domainId: Number(form.domainId),
        skillId: Number(form.skillId),
        bidAmount,
        technicalSolution: form.technicalSolution.trim(),
      });
      setSavedProposal(proposal);
      setMessage("Đã gửi proposal thành công.");
    } catch (error) {
      const apiError = error as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      setMessage(
        apiError.response?.data?.message ||
          apiError.message ||
          "Không thể gửi proposal.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!job) {
    return (
      <EmptyState
        title="Không tìm thấy dự án"
        description="Dữ liệu job được tải trực tiếp từ backend."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="MATCH-02"
        title="Nộp báo giá dự thầu"
        description={job.title}
        actions={
          <LinkButton to={`/jobs/${job.jobId}`} variant="secondary">
            Quay lại job
          </LinkButton>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card className="p-6">
          <form onSubmit={submit} className="grid gap-5">
            {message && (
              <Notice
                tone={savedProposal ? "success" : "warning"}
                title={message}
              />
            )}
            {session?.role !== "EXPERT" && (
              <Notice
                tone="danger"
                title="Tài khoản hiện tại không phải Chuyên gia"
              >
                Hãy đăng nhập bằng tài khoản Expert để gửi proposal cho dự án.
              </Notice>
            )}
            {session?.role === "EXPERT" &&
              (allowedDomainIds.length === 0 ||
                allowedSkillIds.length === 0) && (
                <Notice
                  tone="warning"
                  title="Portfolio chưa khớp domain/skill của job"
                >
                  Hãy cập nhật Portfolio AI để có lĩnh vực và kỹ năng trùng với
                  yêu cầu job trước khi gửi proposal.
                </Notice>
              )}
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Lĩnh vực dùng để nộp proposal">
                <select
                  value={form.domainId}
                  onChange={(event) =>
                    setForm((value) => ({
                      ...value,
                      domainId: event.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none"
                  required
                >
                  {allowedDomainIds.map((domainId) => (
                    <option key={domainId} value={domainId}>
                      {resolveDomainName(domainId, domains)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Kỹ năng dùng để nộp proposal">
                <select
                  value={form.skillId}
                  onChange={(event) =>
                    setForm((value) => ({
                      ...value,
                      skillId: event.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none"
                  required
                >
                  {allowedSkillIds.map((skillId) => (
                    <option key={skillId} value={skillId}>
                      {resolveSkillName(skillId, skills)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="bid_amount">
              <Input
                type="number"
                min={1}
                value={form.bidAmount}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    bidAmount: event.target.value,
                  }))
                }
                placeholder="Ví dụ: 165000000"
                required
              />
            </Field>
            <Field label="technical_solution">
              <Textarea
                value={form.technicalSolution}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    technicalSolution: event.target.value,
                  }))
                }
                placeholder="Mô tả kiến trúc, công nghệ, cách triển khai, mốc nghiệm thu và chỉ số cam kết."
                required
              />
            </Field>
            <Field label="Mô tả dự định của chuyên gia đối với dự án">
              <Textarea
                value={form.projectIntention}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    projectIntention: event.target.value,
                  }))
                }
                placeholder="Bạn sẽ tiếp cận dự án như thế nào, ưu tiên rủi ro nào, kế hoạch phối hợp với doanh nghiệp ra sao."
              />
            </Field>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate("/app/opportunities")}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                loading={loading}
                disabled={
                  session?.role !== "EXPERT" ||
                  allowedDomainIds.length === 0 ||
                  allowedSkillIds.length === 0
                }
              >
                <Save className="h-4 w-4" />
                Gửi proposal
              </Button>
            </div>
          </form>
        </Card>

        <aside className="space-y-4">
          <Card className="p-5">
            <div className="grid justify-items-start gap-3">
              <JobDomainBadge label={jobDomainLabel(jobDomainIds, domains)} />
              <SectionHeading title="Tóm tắt dự án" />
            </div>
            <div className="mt-5 grid gap-3 rounded-3xl bg-slate-50 p-4">
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-slate-500">Ngân sách</span>
                <span className="font-extrabold text-ink">
                  {formatCurrency(job.budget)}
                </span>
              </div>
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-slate-500">Lĩnh vực</span>
                <span className="text-right font-extrabold text-ink">
                  {jobDomainIds.length} lĩnh vực
                </span>
              </div>
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-slate-500">Kỹ năng</span>
                <span className="font-extrabold text-ink">
                  {skillCountLabel(jobSkillIds.length)}
                </span>
              </div>
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              {job.structuredSow || job.rawRequirements}
            </p>
          </Card>
          {savedProposal && (
            <Card className="p-5">
              <SectionHeading title="Proposal đã gửi" />
              <div className="mt-4 grid gap-2 text-sm text-slate-600">
                <p>
                  <span className="font-bold text-ink">bid_amount:</span>{" "}
                  {formatCurrency(savedProposal.bidAmount)}
                </p>
              </div>
              <div className="mt-4">
                <LinkButton to="/app/proposals" variant="secondary">
                  Xem proposal của tôi
                </LinkButton>
              </div>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}

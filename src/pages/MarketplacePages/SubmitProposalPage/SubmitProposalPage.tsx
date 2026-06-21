/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  CheckCircle2,
  Eye,
  FileCheck2,
  ListChecks,
  Paperclip,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Target,
  UploadCloud,
  WalletCards,
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
  userQuotaApi,
  type GeneratedSow,
  type GeneratedSowMilestone,
  type Domain,
  type JobSkill,
  type Skill,
  type Technology,
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
  UserQuota,
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
  resolveDomainName,
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

//nộp proposal
export function SubmitProposalPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const session = useSession();
  const numericJobId = Number(jobId);
  const [job, setJob] = useState<Job | null>(null);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [technologies, setTechnologies] = useState<Technology[]>([]);
  const [jobDomainIds, setJobDomainIds] = useState<number[]>([]);
  const [jobSkillIds, setJobSkillIds] = useState<number[]>([]);
  const [jobTechnologyIds, setJobTechnologyIds] = useState<number[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [proposalFile, setProposalFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [savedProposal, setSavedProposal] = useState<Proposal | null>(null);
  const [requestBudgetChange, setRequestBudgetChange] = useState(false);
  const [milestoneBudgets, setMilestoneBudgets] = useState<
    Record<number, string>
  >({});
  const [form, setForm] = useState({
    technicalSolution: "",
    proposalDescription: "",
    proposalFileUrl: "",
    domainId: "",
    skillId: "",
  });
  const [quota, setQuota] = useState<UserQuota | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        const [
          jobItem,
          domainItems,
          skillItems,
          technologyItems,
          jobDomainItems,
          jobSkillItems,
          jobTechnologyItems,
          milestoneItems,
          portfolioResult,
          quotaItem,
        ] = await Promise.all([ //api 
          marketplaceApi.getJob(numericJobId),
          catalogApi.listDomains(true),
          catalogApi.listSkills(true),
          catalogApi.listTechnologies(true),
          catalogApi.listJobDomains(numericJobId),
          catalogApi.listJobSkills(numericJobId),
          catalogApi.listJobTechnologies(numericJobId).catch(() => []),
          contractApi.listJobMilestones(numericJobId).catch(() => []),
          profileApi.getMyPortfolio().catch(() => null),
          userQuotaApi.getCurrent().catch(() => null),
        ]);
        if (ignore) return;
        setJob(jobItem);
        setDomains(domainItems);
        setSkills(skillItems);
        setTechnologies(technologyItems);
        setJobDomainIds(jobDomainItems.map((item) => item.id.domainId));
        setJobSkillIds(jobSkillItems.map((item) => item.id.skillId));
        setJobTechnologyIds(
          jobTechnologyItems.map((item) => item.id.technologyId),
        );
        setMilestones(milestoneItems);
        setMilestoneBudgets(
          Object.fromEntries(
            milestoneItems.map((item) => [
              item.milestoneId,
              String(item.fundsAllocated || ""),
            ]),
          ),
        );
        setPortfolio(portfolioResult);
        setQuota(quotaItem);
      } catch {
        if (!ignore) setJob(null);
      }
    }

    loadData();
    return () => {
      ignore = true;
    };
  }, [numericJobId]);

  useEffect(() => {
    queueMicrotask(() => {
      setForm((value) => ({
        ...value,
        domainId:
          value.domainId && jobDomainIds.includes(Number(value.domainId))
            ? value.domainId
            : jobDomainIds[0]
              ? String(jobDomainIds[0])
              : "",
        skillId:
          value.skillId && jobSkillIds.includes(Number(value.skillId))
            ? value.skillId
            : jobSkillIds[0]
              ? String(jobSkillIds[0])
              : "",
      }));
    });
  }, [jobDomainIds, jobSkillIds]);

  const proposalMilestoneTotal = useMemo(
    () =>
      milestones.reduce(
        (total, milestone) =>
          total + Number(milestoneBudgets[milestone.milestoneId] || 0),
        0,
      ),
    [milestoneBudgets, milestones],
  );

  const bidAmount = requestBudgetChange
    ? proposalMilestoneTotal
    : job?.budget || 0;
  const bidAmountDisplay = bidAmount > 0 ? String(bidAmount) : "";

  const submit = async (event: FormEvent) => { //submit proposal
    event.preventDefault();
    if (session?.role !== "EXPERT") {
      setMessage("Chỉ tài khoản Chuyên gia mới có thể nộp báo giá dự thầu.");
      return;
    }
    if (quota && (quota.proposalQuotaBalance ?? 0) <= 0) {
      setMessage("Bạn đã hết lượt gửi Proposal. Vui lòng mua thêm credit hoặc gói thành viên.");
      return;
    }
    if (!Number.isFinite(bidAmount) || bidAmount <= 0) {
      setMessage("bid_amount phải là số lớn hơn 0.");
      return;
    }
    if (!form.technicalSolution.trim()) {
      setMessage("technical_solution không được để trống.");
      return;
    }
    if (!form.proposalDescription.trim()) {
      setMessage("proposalDescription không được để trống.");
      return;
    }
    if (!form.domainId || !form.skillId) {
      setMessage(
        "Vui lòng chọn lĩnh vực và kỹ năng phù hợp với portfolio của bạn.",
      );
      return;
    }
    if (
      requestBudgetChange &&
      milestones.length > 0 &&
      proposalMilestoneTotal <= 0
    ) {
      setMessage("Vui lòng nhập ngân sách cho từng milestone trước khi gửi.");
      return;
    }
    if (
      requestBudgetChange &&
      milestones.length > 0 &&
      proposalMilestoneTotal > 0 &&
      proposalMilestoneTotal !== bidAmount
    ) {
      setMessage("Tổng ngân sách milestone đề xuất phải bằng bid_amount.");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      let proposalFileUrl = form.proposalFileUrl;
      if (proposalFile) {
        proposalFileUrl = await profileApi.uploadProposalFile(proposalFile); //api upload file đề xuất
      }
      const proposalMilestone =
        requestBudgetChange &&
        milestones.length > 0 &&
        proposalMilestoneTotal > 0
          ? milestones.map((milestone) => ({
              milestoneId: milestone.milestoneId,
              proposedBudget: Number(milestoneBudgets[milestone.milestoneId]),
            }))
          : undefined;
      const proposal = await marketplaceApi.submitProposal({ //api cập nhật thông tin
        jobId: numericJobId,
        domainId: Number(form.domainId),
        skillId: Number(form.skillId),
        bidAmount,
        technicalSolution: form.technicalSolution.trim(),
        proposalDescription: form.proposalDescription.trim(),
        proposalFileUrl,
        proposalMilestone,
      });
      setForm((value) => ({ ...value, proposalFileUrl }));
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
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
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
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <form onSubmit={submit} className="grid gap-5">
          <Card className="overflow-hidden">
            <div className="border-b border-slate-100 bg-[linear-gradient(135deg,#eef7ff,#effcf7)] p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <Badge tone="brand">Proposal packet</Badge>
                  <h2 className="mt-3 font-display text-2xl font-black text-ink">
                    Bản đề xuất
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                    Nhập đầy đủ yêu cầu giải pháp công nghệ, mô tả đề xuất và
                    mong muốn ngân sách, bạn có thể đề xuất lại ngân sách theo
                    từng mốc.
                  </p>
                </div>
              </div>
            </div>
            <div className="grid gap-6 p-6">
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
              <section className="grid gap-4 rounded-3xl border border-slate-100 bg-slate-50/70 p-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-brand-600 shadow-sm">
                    <Target className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-extrabold text-ink">
                      Yêu cầu công việc
                    </h3>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Lĩnh vực">
                    <div className="flex h-11 items-center rounded-2xl border border-slate-300 bg-slate-100 px-3 text-sm font-semibold text-slate-800 shadow-sm">
                      <span className="truncate">
                        {form.domainId
                          ? resolveDomainName(Number(form.domainId), domains)
                          : "Chưa chọn lĩnh vực"}
                      </span>
                    </div>
                  </Field>
                  <Field label="Công nghệ">
                    <div className="rounded-2xl border border-slate-300 bg-slate-50 p-3 shadow-sm">
                      <div className="flex flex-wrap gap-2">
                        {jobTechnologyIds.length > 0 ? (
                          jobTechnologyIds.map((technologyId) => (
                            <span
                              key={technologyId}
                              className="inline-flex items-center rounded-full border border-mint-200 bg-white px-3 py-1.5 text-sm font-semibold text-ink"
                            >
                              {technologies.find(
                                (technology) =>
                                  technology.technologyId === technologyId,
                              )?.technologyName ||
                                `Technology #${technologyId}`}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm font-semibold text-slate-400">
                            Chưa có công nghệ
                          </span>
                        )}
                      </div>
                    </div>
                  </Field>
                  <Field label="Kỹ năng" className="md:col-span-2">
                    <div className="rounded-2xl border border-slate-300 bg-slate-50 p-3 shadow-sm">
                      <div className="flex flex-wrap gap-2">
                        {jobSkillIds.map((skillId) => (
                          <span
                            key={skillId}
                            className="inline-flex items-center rounded-full border border-brand-200 bg-white px-3 py-1.5 text-sm font-semibold text-ink"
                          >
                            {skills.find((skill) => skill.skillId === skillId)
                              ?.skillName || `Skill #${skillId}`}
                          </span>
                        ))}
                      </div>
                    </div>
                  </Field>
                </div>
              </section>

              <section className="grid gap-4 rounded-3xl border border-slate-100 bg-white p-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-mint-50 text-mint-600">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-extrabold text-ink">
                      Giải pháp công nghệ
                    </h3>
                  </div>
                </div>
                <Field label="Giải pháp">
                  <Textarea
                    value={form.technicalSolution}
                    onChange={(event) =>
                      setForm((value) => ({
                        ...value,
                        technicalSolution: event.target.value,
                      }))
                    }
                    placeholder="Mô tả kiến trúc, công nghệ, cách triển khai, mốc nghiệm thu và chỉ số cam kết."
                    className="min-h-36"
                    required
                  />
                </Field>
                <Field label="Đề xuất">
                  <Textarea
                    value={form.proposalDescription}
                    onChange={(event) =>
                      setForm((value) => ({
                        ...value,
                        proposalDescription: event.target.value,
                      }))
                    }
                    placeholder="Bạn sẽ tiếp cận dự án như thế nào, ưu tiên rủi ro nào, kế hoạch phối hợp với doanh nghiệp ra sao."
                    className="min-h-32"
                    required
                  />
                </Field>
              </section>

              <section className="grid gap-4 rounded-3xl border border-slate-100 bg-white p-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-coral-50 text-coral-600">
                    <WalletCards className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-extrabold text-ink">
                      Ngân sách & tài liệu
                    </h3>
                    <p className="text-sm text-slate-500">
                      Đính kèm proposal file và chốt ngân sách tổng trước khi
                      gửi.
                    </p>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Ngân sách">
                    <Input
                      type="number"
                      min={1}
                      value={bidAmountDisplay}
                      readOnly
                      placeholder="Ví dụ: 165000000"
                      required
                    />
                  </Field>
                  <Field
                    label="Proposal file"
                    hint={
                      proposalFile?.name ||
                      form.proposalFileUrl ||
                      "PDF, DOC/DOCX hoặc ảnh minh chứng."
                    }
                  >
                    <Input
                      type="file"
                      accept="image/png,image/jpeg,application/pdf,.doc,.docx"
                      onChange={(event) =>
                        setProposalFile(event.target.files?.[0] || null)
                      }
                    />
                  </Field>
                </div>
              </section>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  checked={requestBudgetChange}
                  onChange={(event) =>
                    setRequestBudgetChange(event.target.checked)
                  }
                />
                <span>Chọn nếu muốn đề xuất thay đổi ngân sách dự án</span>
              </label>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-sm text-slate-600">
                <span className="font-semibold text-ink">
                  Ngân sách hiện tại:{" "}
                </span>
                {formatCurrency(job.budget)}
                {requestBudgetChange && (
                  <span className="ml-2 text-brand-600">
                    · Hãy nhập số tiền đề xuất từng milestone và ngân sách sẽ
                    cập nhật theo tổng milestone
                  </span>
                )}
              </div>

              {requestBudgetChange && milestones.length > 0 && (
                <section className="grid gap-4 rounded-3xl border border-slate-100 bg-white p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-50 text-amber-600">
                        <ListChecks className="h-4 w-4" />
                      </span>
                      <div>
                        <h3 className="font-display text-lg font-extrabold text-ink">
                          Proposal milestone
                        </h3>
                        <p className="text-sm text-slate-500">
                          Tổng milestone đề xuất phải bằng ngân sách đề xuất nếu
                          bạn muốn thay đổi.
                        </p>
                      </div>
                    </div>
                    <Badge
                      tone={
                        bidAmount === proposalMilestoneTotal ? "mint" : "amber"
                      }
                    >
                      {formatCompactCurrency(proposalMilestoneTotal)}
                    </Badge>
                  </div>
                  <div className="grid gap-3">
                    {milestones.map((milestone) => (
                      <div
                        key={milestone.milestoneId}
                        className="grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 md:grid-cols-[1fr_180px]"
                      >
                        <div>
                          <p className="font-extrabold text-ink">
                            {milestone.milestoneName}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-slate-500">
                            Mốc {milestone.orderIndex} · gốc{" "}
                            {formatCompactCurrency(milestone.fundsAllocated)}
                          </p>
                        </div>
                        <Input
                          type="number"
                          min={0}
                          value={milestoneBudgets[milestone.milestoneId] || ""}
                          onChange={(event) =>
                            setMilestoneBudgets((value) => ({
                              ...value,
                              [milestone.milestoneId]: event.target.value,
                            }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                </section>
              )}

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
                  disabled={session?.role !== "EXPERT"}
                >
                  <Save className="h-4 w-4" />
                  Gửi proposal
                </Button>
              </div>
            </div>
          </Card>
        </form>

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

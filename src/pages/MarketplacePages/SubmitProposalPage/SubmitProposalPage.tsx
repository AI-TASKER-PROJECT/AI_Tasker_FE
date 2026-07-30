/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Briefcase,
  CheckCircle2,
  Clock,
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
import { getJobSowSummary } from "../../../lib/jobSow";
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
//cmt1: Hiển thị tóm tắt các milestone của Job để chuyên gia tham chiếu khi lập proposal.
// Chức năng 1: Hiển thị tóm tắt milestone của Job cho chuyên gia khi lập proposal.
function CompactMilestones({ milestones }: { milestones: Milestone[] }) {
  if (milestones.length === 0) {
    return (
      <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-400">
        Chưa có mốc.
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

//cmt2: Hiển thị số lượng milestone của Job trong phần tóm tắt proposal.
// Chức năng 2: Hiển thị số lượng milestone liên quan đến proposal.
function MilestoneCount({ count }: { count: number }) {
  return (
    <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-3">
      <p className="text-xs font-bold text-slate-400">Mốc</p>
      <p className="mt-1 text-sm font-extrabold text-ink">{count} mốc</p>
    </div>
  );
}

//cmt3: Hiển thị số lượng skill liên quan đến Job trong phần tóm tắt proposal.
// Chức năng 3: Hiển thị số lượng skill liên quan đến Job.
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

//cmt4: Nộp proposal
// Chức năng 4: Hiển thị và xử lý toàn bộ form nộp proposal cho chuyên gia.
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

  // Tải toàn bộ dữ liệu cần để nộp proposal: Job, danh mục, milestone, portfolio và quota của chuyên gia.
  useEffect(() => {
    let ignore = false;

    // Gom nhiều API độc lập để form proposal có đủ ngữ cảnh trước khi chuyên gia nhập đề xuất.
    // Chức năng 5: Tải dữ liệu Job, catalog, milestone, portfolio và quota trước khi nộp proposal.
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
        ] = await Promise.all([
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

  // Tự chọn domain/skill đầu tiên của Job làm giá trị mặc định cho proposal nếu người dùng chưa chọn.
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

  // Tính tổng ngân sách chuyên gia đề xuất theo từng milestone khi muốn thay đổi ngân sách Job.
  const proposalMilestoneTotal = useMemo(
    () =>
      milestones.reduce(
        (total, milestone) =>
          total + Number(milestoneBudgets[milestone.milestoneId] || 0),
        0,
      ),
    [milestoneBudgets, milestones],
  );
  const originalMilestoneTotal = useMemo(
    () =>
      milestones.reduce(
        (total, milestone) => total + Number(milestone.fundsAllocated || 0),
        0,
      ),
    [milestones],
  );

  const bidAmount = requestBudgetChange
    ? proposalMilestoneTotal
    : job?.budget || 0;
  const bidAmountDisplay = bidAmount > 0 ? String(bidAmount) : "";

  // Validate form, upload file nếu có, build payload và gửi proposal lên backend.
  // Chức năng 6: Validate form, upload file đính kèm và gửi proposal lên backend.
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (session?.role !== "EXPERT") {
      setMessage("Chỉ tài khoản Chuyên gia mới có thể nộp báo giá dự thầu.");
      return;
    }
    if (quota && (quota.proposalQuotaBalance ?? 0) <= 0) {
      setMessage(
        "Bạn đã hết lượt gửi bản đề xuất. Vui lòng mua thêm credit hoặc gói thành viên.",
      );
      return;
    }
    if (!Number.isFinite(bidAmount) || bidAmount <= 0) {
      setMessage("Ngân sách đề xuất phải là số lớn hơn 0.");
      return;
    }
    if (!form.technicalSolution.trim()) {
      setMessage("Kĩ năng không được để trống.");
      return;
    }
    if (!form.proposalDescription.trim()) {
      setMessage("Mô tả đề xuất không được để trống.");
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
      setMessage("Vui lòng nhập ngân sách cho từng mốc trước khi gửi.");
      return;
    }
    if (
      requestBudgetChange &&
      milestones.length > 0 &&
      proposalMilestoneTotal > 0 &&
      proposalMilestoneTotal !== bidAmount
    ) {
      setMessage(
        "Tổng ngân sách các mốc đề xuất ít nhất phải bằng ngân sách.",
      );
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      let proposalFileUrl = form.proposalFileUrl;
      if (proposalFile) {
        proposalFileUrl = await profileApi.uploadProposalFile(proposalFile);
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
        //hàm submitProposal gửi proposal lên backend, bao gồm jobId, domainId, skillId, bidAmount, technicalSolution, proposalDescription, proposalFileUrl và proposalMilestone nếu có.
      const proposal = await marketplaceApi.submitProposal({
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
      setMessage("Đã gửi bản đề xuất thành công.");
    } catch (error) {
      const apiError = error as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      setMessage(
        apiError.response?.data?.message ||
          apiError.message ||
          "Không thể gửi bản đề xuất.",
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
        <PageHeader title="Nộp báo giá dự thầu" description={job.title} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <form onSubmit={submit} className="grid gap-5">
          <Card className="overflow-hidden">
            <div className="border-b border-slate-100 bg-[linear-gradient(135deg,#eef7ff,#effcf7)] p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <Badge tone="brand">Hồ sơ đề xuất</Badge>
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
              {session?.role !== "EXPERT" && (
                <Notice
                  tone="danger"
                  title="Tài khoản hiện tại không phải Chuyên gia"
                >
                  Hãy đăng nhập bằng tài khoản Expert để gửi bản đề xuất cho dự án.
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
                                "Công nghệ chưa có tên"}
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
                              ?.skillName || "Kỹ năng chưa có tên"}
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
                    placeholder="Mô tả kiến trúc, công nghệ, cách triển khai, mốc và chỉ số cam kết."
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
                      Đính kèm file bản đề xuất và chốt ngân sách dự án trước khi
                      gửi.
                    </p>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Ngân sách(VNĐ)">
                    <Input
                      type="text"
                      value={
                        bidAmount > 0 ? bidAmount.toLocaleString("vi-VN") : ""
                      }
                      readOnly
                      placeholder="Ví dụ: 165.000.000"
                      required
                    />
                  </Field>
                  <Field
                    label="File bản đề xuất"
                    hint={
                      proposalFile?.name ||
                      form.proposalFileUrl ||
                      "PDF, DOC/DOCX hoặc ảnh minh chứng."
                    }
                  >
                    <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm font-black text-brand-600 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-100 hover:bg-brand-50 hover:shadow-card">
                      <UploadCloud className="h-5 w-5" />
                    <span>Chọn tệp đề xuất</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,application/pdf,.doc,.docx"
                        className="sr-only"
                        onChange={(event) =>
                          setProposalFile(event.target.files?.[0] || null)
                        }
                      />
                    </label>
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
                <span>Tích chọn nếu muốn đề xuất thay đổi ngân sách dự án</span>
              </label>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-sm text-slate-600">
                <span className="font-semibold text-ink">
                  {requestBudgetChange
                    ? "Ngân sách đề xuất: "
                    : "Ngân sách hiện tại: "}
                </span>
                {formatCurrency(
                  requestBudgetChange ? proposalMilestoneTotal : job.budget,
                )}
                {requestBudgetChange && (
                  <span className="ml-2 text-brand-600">
                    · Hãy nhập số tiền đề xuất từng mốc và ngân sách sẽ
                    cập nhật theo tổng các mốc
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
                          Mốc trong đề xuất
                        </h3>
                        <p className="text-sm text-slate-500">
                          Tổng ngân sách các mốc đề xuất phải bằng ngân sách đề xuất nếu
                          bạn muốn thay đổi.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-3">
                    {milestones.map((milestone) => (
                      <div
                        key={milestone.milestoneId}
                        className="grid gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 md:grid-cols-[1fr_180px_180px]"
                      >
                        <div>
                          <p className="font-extrabold text-ink">
                            {milestone.milestoneName}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-slate-500">
                            Mốc {milestone.orderIndex} ·{" "}
                            {milestone.durationValue ?? milestone.duration ?? 0}{" "}
                            {milestone.durationUnit === "WEEK"
                              ? "TUẦN"
                              : milestone.durationUnit || "TUẦN"}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                            Ngân sách gốc(VNĐ)
                          </p>
                          <Input
                            type="text"
                            value={formatCurrency(milestone.fundsAllocated)}
                            readOnly
                            className="bg-slate-100/50 text-slate-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                            Ngân sách đề xuất(VNĐ)
                          </p>
                          <Input
                            type="text"
                            value={
                              milestoneBudgets[milestone.milestoneId]
                                ? Number(
                                    milestoneBudgets[milestone.milestoneId],
                                  ).toLocaleString("vi-VN")
                                : ""
                            }
                            onChange={(event) => {
                              const raw = event.target.value.replace(/\D/g, "");
                              setMilestoneBudgets((value) => ({
                                ...value,
                                [milestone.milestoneId]: raw,
                              }));
                            }}
                            placeholder="Nhập số tiền"
                          />
                        </div>
                      </div>
                    ))}
                    <div className="grid gap-4 rounded-2xl border border-slate-100 bg-white p-4 md:grid-cols-[1fr_180px_180px]">
                      <div className="flex items-center">
                        <p className="font-extrabold text-ink">
                          Tổng ngân sách
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wide">
                          Tổng ngân sách gốc
                        </p>
                        <p className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-extrabold text-rose-600">
                          {formatCurrency(originalMilestoneTotal)}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">
                          Tổng ngân sách đề xuất
                        </p>
                        <p className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-extrabold text-emerald-700">
                          {formatCurrency(proposalMilestoneTotal)}
                        </p>
                      </div>
                    </div>
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
                  disabled={session?.role !== "EXPERT" || !!savedProposal}
                >
                  <Save className="h-4 w-4" />
                  Gửi bản đề xuất
                </Button>
              </div>
              {message && (
                <Notice
                  tone={savedProposal ? "success" : "warning"}
                  title={message}
                />
              )}
            </div>
          </Card>
        </form>

        <aside className="space-y-4">
          <Card className="p-5">
            <div className="grid justify-items-start gap-3">
              <SectionHeading title="Tóm tắt dự án" />
            </div>
            <div className="mt-5 grid gap-3">
              <div className="flex items-center gap-4 rounded-3xl bg-slate-50 p-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white shadow-sm">
                  <WalletCards className="h-5 w-5 text-pink-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400">Ngân sách</p>
                  <p className="mt-1 text-sm font-extrabold text-ink">
                    {formatCurrency(job.budget)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-3xl bg-slate-50 p-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white shadow-sm">
                  <Clock className="h-5 w-5 text-pink-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400">Thời lượng</p>
                  <p className="mt-1 text-sm font-extrabold uppercase text-ink">
                    {job.plannedDurationValue || 0}{" "}
                    {job.plannedDurationUnit === "WEEK"
                      ? "TUẦN"
                      : job.plannedDurationUnit || "TUẦN"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-3xl bg-slate-50 p-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white shadow-sm">
                  <Target className="h-5 w-5 text-pink-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400">Lĩnh vực</p>
                  <p className="mt-1 text-sm font-extrabold text-ink">
                    {jobDomainIds.length > 0
                      ? resolveDomainName(jobDomainIds[0], domains)
                      : "Chưa cập nhật"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-3xl bg-slate-50 p-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white shadow-sm">
                  <Briefcase className="h-5 w-5 text-pink-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400">
                    Doanh nghiệp
                  </p>
                  <p className="mt-1 text-sm font-extrabold text-ink">
                    {job.companyName || "Chưa cập nhật"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-3xl bg-slate-50 p-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white shadow-sm">
                  <CheckCircle2 className="h-5 w-5 text-pink-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400">Mốc</p>
                  <p className="mt-1 text-sm font-extrabold text-ink">
                    {milestones.length} mốc
                  </p>
                </div>
              </div>
            </div>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-600">
              {getJobSowSummary(job) || job.rawRequirements}
            </p>
          </Card>
          {savedProposal && (
            <Card className="p-5">
              <SectionHeading title="Bản đề xuất đã gửi" />
              <div className="mt-4">
                <LinkButton to="/app/proposals" variant="secondary">
                  Xem bản đề xuất của tôi
                </LinkButton>
              </div>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}

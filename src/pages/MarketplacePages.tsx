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
import { useParams } from "react-router-dom";
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
} from "../lib/api";
import { formatCompactCurrency, formatCurrency } from "../lib/utils";
import { useSession } from "../lib/session";
import { FirebaseFileLink } from "../components/FirebaseFileLink";
import type {
  AcceptanceCriteria,
  ExpertProfile,
  Job,
  Milestone,
  Portfolio,
  Proposal,
} from "../types";
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
} from "../components/ui";
import { JobCard } from "./PublicPages";
import { useNavigate } from "react-router-dom";

type SkillAssignment = {
  skillId: number;
  isMandatory: boolean;
};

type MilestoneDraft = {
  milestoneName: string;
  description?: string;
  fundsAllocated: string;
  orderIndex: string;
  durationValue: string;
  criteriaIds: number[];
};

function renderListSection(title: string, values?: string[]) {
  if (!values || values.length === 0) return "";
  return `${title}:\n${values.map((item) => `- ${item}`).join("\n")}`;
}

function formatGeneratedSow(sow?: GeneratedSow) {
  if (!sow) return "";
  return [
    sow.title ? `Tiêu đề: ${sow.title}` : "",
    sow.overview ? `Tổng quan: ${sow.overview}` : "",
    renderListSection("Mục tiêu", sow.objectives),
    renderListSection("Phạm vi công việc", sow.scopeOfWork),
    renderListSection("Sản phẩm bàn giao", sow.deliverables),
    renderListSection("Giả định", sow.assumptions),
    renderListSection("Ngoài phạm vi", sow.outOfScope),
  ]
    .filter(Boolean)
    .join("\n\n");
}

function skillCountLabel(count: number) {
  return `${count} kỹ năng`;
}

function resolveSkillName(skillId: number, skills: Skill[]) {
  return (
    skills.find((skill) => skill.skillId === skillId)?.skillName ||
    `Skill #${skillId}`
  );
}

function resolveDomainName(domainId: number, domains: Domain[]) {
  return (
    domains.find((domain) => domain.domainId === domainId)?.domainName ||
    `Lĩnh vực #${domainId}`
  );
}

function parseCatalogIdList(value?: string) {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item));
}

export function MyJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [milestonesByJobId, setMilestonesByJobId] = useState<
    Record<number, Milestone[]>
  >({});
  const [jobSkillsByJobId, setJobSkillsByJobId] = useState<
    Record<number, JobSkill[]>
  >({});
  const [query, setQuery] = useState("");

  useEffect(() => {
    marketplaceApi
      .listMyJobs()
      .then(setJobs)
      .catch(() => setJobs([]));
  }, []);

  useEffect(() => {
    if (jobs.length === 0) {
      setMilestonesByJobId({});
      setJobSkillsByJobId({});
      return;
    }
    let ignore = false;

    async function loadJobCounts() {
      const [milestoneResults, skillResults] = await Promise.all([
        Promise.allSettled(
          jobs.map((job) => contractApi.listJobMilestones(job.jobId)),
        ),
        Promise.allSettled(
          jobs.map((job) => catalogApi.listJobSkills(job.jobId)),
        ),
      ]);
      if (ignore) return;
      const milestoneMap: Record<number, Milestone[]> = {};
      const skillMap: Record<number, JobSkill[]> = {};
      milestoneResults.forEach((result, index) => {
        milestoneMap[jobs[index].jobId] =
          result.status === "fulfilled" ? result.value : [];
      });
      skillResults.forEach((result, index) => {
        skillMap[jobs[index].jobId] =
          result.status === "fulfilled" ? result.value : [];
      });
      setMilestonesByJobId(milestoneMap);
      setJobSkillsByJobId(skillMap);
    }

    loadJobCounts();
    return () => {
      ignore = true;
    };
  }, [jobs]);

  const filtered = jobs.filter((job) =>
    `${job.title} ${job.rawRequirements} ${job.structuredSow || ""}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

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
      <Card className="p-4">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Tìm job của tôi..."
        />
      </Card>
      <div className="grid gap-4 lg:grid-cols-3">
        {filtered.map((job) => (
          <Card key={job.jobId} className="p-5">
            <div className="flex items-start justify-end">
              <StatusBadge status={job.status} />
            </div>
            <h3 className="mt-4 font-display text-lg font-extrabold leading-7 text-ink">
              {job.title}
            </h3>
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">
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
            <div className="mt-5 flex flex-wrap gap-2">
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
export function CreateJobPage() {
  const [form, setForm] = useState({
    title: "Xây dựng trợ lý AI chăm sóc khách hàng đa kênh",
    rawRequirements:
      "Cần chatbot trả lời sản phẩm, tra cứu đơn hàng và chuyển tiếp nhân viên khi cần.",
    structuredSow:
      "Thiết kế trợ lý hội thoại RAG hỗ trợ tiếng Việt, tích hợp dữ liệu sản phẩm và lịch sử đơn hàng, có cơ chế hand-off cho nhân viên.",
    budgetAmount: "180000000",
    plannedDurationValue: "10",
  });
  const [milestones, setMilestones] = useState<MilestoneDraft[]>([
    {
      milestoneName: "Discovery va solution design",
      description: "Discovery va solution design",
      fundsAllocated: "30000000",
      orderIndex: "1",
      durationValue: "2",
      criteriaIds: [],
    },
    {
      milestoneName: "MVP delivery",
      description: "MVP delivery",
      fundsAllocated: "90000000",
      orderIndex: "2",
      durationValue: "8",
      criteriaIds: [],
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [sowGeneratedLocked, setSowGeneratedLocked] = useState(false);
  const [generatedSow, setGeneratedSow] = useState<GeneratedSow | null>(null);
  const [savedJob, setSavedJob] = useState<Job | null>(null);
  const [createMessage, setCreateMessage] = useState("");
  const [domains, setDomains] = useState<Domain[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [acceptanceCriteria, setAcceptanceCriteria] = useState<
    AcceptanceCriteria[]
  >([]);
  const [selectedDomainIds, setSelectedDomainIds] = useState<number[]>([]);
  const [skillAssignments, setSkillAssignments] = useState<SkillAssignment[]>(
    [],
  );

  useEffect(() => {
    Promise.all([
      catalogApi.listDomains(true),
      catalogApi.listSkills(true),
      catalogApi.listAcceptanceCriteria(true).catch(() => []),
    ]).then(([domainItems, skillItems, criteriaItems]) => {
      setDomains(domainItems);
      setSkills(skillItems);
      setAcceptanceCriteria(criteriaItems);
      setSelectedDomainIds(
        domainItems.slice(0, 2).map((item) => item.domainId),
      );
      setSkillAssignments(
        skillItems.slice(0, 3).map((item) => ({
          skillId: item.skillId,
          isMandatory: true,
        })),
      );
    });
  }, []);

  const mapGeneratedMilestone = (
    milestone: GeneratedSowMilestone,
    index: number,
  ): MilestoneDraft => ({
    milestoneName: milestone.name || `Milestone ${index + 1}`,
    description: milestone.description,
    fundsAllocated:
      milestone.budget !== undefined && milestone.budget !== null
        ? String(milestone.budget)
        : "",
    orderIndex: String(index + 1),
    durationValue:
      milestone.duration !== undefined && milestone.duration !== null
        ? String(milestone.duration)
        : "",
    criteriaIds: milestones[index]?.criteriaIds || [],
  });

  const generateSow = async () => {
    setAiLoading(true);
    setCreateMessage("");
    try {
      const response = await sowApi.generate({
        projectTitle: form.title,
        rawRequirement: form.rawRequirements,
        budget: Number(form.budgetAmount),
        duration: Number(form.plannedDurationValue),
        durationUnit: "tuần",
        supportFields: selectedDomainIds.map((id) =>
          resolveDomainName(id, domains),
        ),
        requiredSkills: skillAssignments.map((assignment) =>
          resolveSkillName(assignment.skillId, skills),
        ),
      });

      const structuredSow = formatGeneratedSow(response.sow);
      setGeneratedSow(response.sow || null);
      setForm((value) => ({
        ...value,
        structuredSow: structuredSow || value.structuredSow,
      }));

      if (response.milestones && response.milestones.length > 0) {
        setMilestones(response.milestones.map(mapGeneratedMilestone));
      }

      const hasGeneratedContent = Boolean(
        structuredSow || (response.milestones && response.milestones.length > 0),
      );
      setSowGeneratedLocked(hasGeneratedContent);

      if (response.needMoreInfo) {
        setCreateMessage(
          response.questions && response.questions.length > 0
            ? `AI đã chuẩn hóa SoW nháp và cần bổ sung thông tin: ${response.questions.join(" ")}`
            : "AI đã chuẩn hóa SoW nháp nhưng cần bổ sung thêm thông tin.",
        );
        return;
      }

      setCreateMessage("AI đã chuẩn hóa SoW và cập nhật Project milestones.");
    } catch (error) {
      setSowGeneratedLocked(false);
      setGeneratedSow(null);
      setCreateMessage(
        `Không gọi được AI chuẩn hóa SoW: ${getApiErrorMessage(error)}`,
      );
    } finally {
      setAiLoading(false);
    }
  };

  const toggleSkill = (skillId: number) => {
    setSkillAssignments((items) =>
      items.some((item) => item.skillId === skillId)
        ? items.filter((item) => item.skillId !== skillId)
        : [...items, { skillId, isMandatory: true }],
    );
  };

  const updateSkillAssignment = (
    skillId: number,
    patch: Partial<SkillAssignment>,
  ) => {
    setSkillAssignments((items) =>
      items.map((item) =>
        item.skillId === skillId ? { ...item, ...patch } : item,
      ),
    );
  };

  const updateFormBudgetAmount = (amount: string) => {
    setForm((value) => ({
      ...value,
      budgetAmount: amount,
    }));
  };

  const updateMilestone = (index: number, patch: Partial<MilestoneDraft>) => {
    setMilestones((items) =>
      items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  };

  const updateMilestoneBudgetAmount = (index: number, amount: string) => {
    setMilestones((items) =>
      items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, fundsAllocated: amount } : item,
      ),
    );
  };

  const toggleMilestoneCriteria = (index: number, criteriaId: number) => {
    setMilestones((items) =>
      items.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              criteriaIds: item.criteriaIds.includes(criteriaId)
                ? item.criteriaIds.filter((id) => id !== criteriaId)
                : [...item.criteriaIds, criteriaId],
            }
          : item,
      ),
    );
  };

  const buildSowPayload = () => {
    if (!generatedSow) return undefined;
    const stringifyList = (values?: string[]) => JSON.stringify(values || []);

    return {
      title: generatedSow.title || form.title,
      overview: generatedSow.overview,
      objectives: stringifyList(generatedSow.objectives),
      scopeOfWork: stringifyList(generatedSow.scopeOfWork),
      deliverable: stringifyList(generatedSow.deliverables),
      assumptions: stringifyList(generatedSow.assumptions),
      outOfScope: stringifyList(generatedSow.outOfScope),
    };
  };

  const buildMilestoneDescription = (milestone: MilestoneDraft) => {
    const timeText = `Thời gian: ${milestone.durationValue || 0} tuần`;
    return milestone.description
      ? `${milestone.description}\n${timeText}`
      : timeText;
  };

  const buildMilestonePayload = () =>
    milestones
      .filter((milestone) => milestone.milestoneName.trim())
      .map((milestone, index) => ({
        milestoneName: milestone.milestoneName,
        description: buildMilestoneDescription(milestone),
        fundsAllocated: Number(milestone.fundsAllocated || 0),
        orderIndex: Number(milestone.orderIndex || index + 1),
        status: "Pending",
        criteriaIds: milestone.criteriaIds,
      }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setCreateMessage("");
    try {
      if (selectedDomainIds.length === 0) {
        setCreateMessage("Vui lòng chọn ít nhất một lĩnh vực cho job.");
        return;
      }
      if (skillAssignments.length === 0) {
        setCreateMessage("Vui lòng chọn ít nhất một kỹ năng cho job.");
        return;
      }
      const job = await marketplaceApi.createJob({
        title: form.title,
        rawRequirements: form.rawRequirements,
        structuredSow: form.structuredSow,
        sow: buildSowPayload(),
        milestones: buildMilestonePayload(),
        budget: Number(form.budgetAmount),
        plannedDurationValue: Number(form.plannedDurationValue),
        plannedDurationUnit: "tuần",
      });
      setSavedJob(job);
      setCreateMessage(
        "Job nháp đã được tạo. Bạn có thể kiểm tra, quản lý hoặc mở public job ngay bên dưới.",
      );

      try {
        await catalogApi.replaceJobDomains(job.jobId, selectedDomainIds);
        await catalogApi.replaceJobSkills(
          job.jobId,
          skillAssignments.map((assignment) => ({
            skillId: assignment.skillId,
            isMandatory: assignment.isMandatory,
          })),
        );
      } catch {
        setCreateMessage(
          "Job nháp đã được tạo, nhưng một phần domain/skill chưa lưu được. Bạn vẫn có thể vào quản lý job để kiểm tra.",
        );
      }
    } catch (error) {
      setCreateMessage(`Không lưu được job nháp: ${getApiErrorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const publishSavedJob = async () => {
    if (!savedJob) return;
    const updated = await marketplaceApi.updateJobStatus(
      savedJob.jobId,
      "OPEN",
    );
    setSavedJob(updated);
    setCreateMessage(
      "Job đã được mở public. Chuyên gia có thể nhìn thấy và gửi proposal.",
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="JOB-01"
        title="AI Job Assistant"
        description="Giao diện có đủ bước cho AI NLP service dù back-end hiện mới lưu structured_sow và ai_tag."
      />
      <div className="grid gap-6">
        <Card className="p-6">
          <form onSubmit={submit} className="grid gap-4">
            <Field label="Tiêu đề dự án">
              <Input
                value={form.title}
                onChange={(event) =>
                  setForm((value) => ({ ...value, title: event.target.value }))
                }
                required
              />
            </Field>
            <Field label="Yêu cầu dự án">
              <Textarea
                value={form.rawRequirements}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    rawRequirements: event.target.value,
                  }))
                }
                required
              />
            </Field>
            <div className="grid gap-6">
              <Field label="Lĩnh vực nền tảng (chọn 1)">
                <div className="max-h-56 overflow-y-auto rounded-2xl border border-outline-variant bg-surface p-3 shadow-sm">
                  <div className="grid gap-2 md:grid-cols-2">
                    {domains.map((domain) => {
                      const isSelected = selectedDomainIds.includes(
                        domain.domainId,
                      );
                      return (
                        <label
                          key={domain.domainId}
                          className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                            isSelected
                              ? "bg-primary-container/20 text-primary"
                              : "text-on-surface-variant hover:bg-surface-container-high"
                          }`}
                        >
                          <input
                            type="radio"
                            name="domain-select"
                            className="h-4 w-4 cursor-pointer text-primary focus:ring-primary"
                            checked={isSelected}
                            onChange={() =>
                              setSelectedDomainIds([domain.domainId])
                            }
                          />
                          <span className="min-w-0 break-words">
                            {domain.domainName}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </Field>

              <Field label="Kỹ năng yêu cầu">
                <div className="max-h-72 overflow-y-auto rounded-2xl border border-outline-variant bg-surface p-3 shadow-sm">
                  <div className="grid gap-3">
                    {skills.map((skill) => {
                      const assignment = skillAssignments.find(
                        (item) => item.skillId === skill.skillId,
                      );
                      const isSelected = Boolean(assignment);
                      return (
                        <div
                          key={skill.skillId}
                          className={`grid gap-3 rounded-xl border px-3 py-3 transition-colors md:grid-cols-[minmax(0,1fr)_120px] md:items-center ${
                            isSelected
                              ? "border-brand-100 bg-brand-50/50"
                              : "border-slate-100 bg-white"
                          }`}
                        >
                          <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-slate-700">
                            <input
                              type="checkbox"
                              className="h-4 w-4 cursor-pointer rounded border-outline-variant text-primary focus:ring-primary"
                              checked={isSelected}
                              onChange={() => toggleSkill(skill.skillId)}
                            />
                            <span className="min-w-0 break-words">
                              {skill.skillName}
                            </span>
                          </label>
                          <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                            <input
                              type="checkbox"
                              checked={
                                assignment ? !assignment.isMandatory : false
                              }
                              disabled={!isSelected}
                              onChange={(event) =>
                                updateSkillAssignment(skill.skillId, {
                                  isMandatory: !event.target.checked,
                                })
                              }
                            />
                            Optional
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Ngân sách">
                <Input
                  type="number"
                  min={0}
                  step="1"
                  value={form.budgetAmount}
                  onChange={(event) =>
                    updateFormBudgetAmount(event.target.value)
                  }
                  required
                />
              </Field>
              <Field label="Thời lượng">
                <Input
                  type="number"
                  value={form.plannedDurationValue}
                  onChange={(event) =>
                    setForm((value) => ({
                      ...value,
                      plannedDurationValue: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Đơn vị">
                <Input value="tuần" readOnly disabled />
              </Field>
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="secondary"
                loading={aiLoading}
                onClick={generateSow}
              >
                <Sparkles className="h-4 w-4" />
                Mô phỏng AI chuẩn hóa SoW
              </Button>
            </div>
            {createMessage && !savedJob && (
              <Notice
                tone={
                  createMessage.includes("Không gọi được") ? "warning" : "info"
                }
                title={createMessage}
              />
            )}
            <Field label="Structured SoW">
              <Textarea
                value={form.structuredSow}
                disabled={sowGeneratedLocked}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    structuredSow: event.target.value,
                  }))
                }
              />
            </Field>

            <div className="rounded-2xl bg-slate-50 p-4">
              <SectionHeading
                title="Project milestones"
                description="Milestones are attached to the job, then reused by the contract after proposal acceptance."
              />
              <div className="mt-4 hidden grid-cols-[minmax(180px,1fr)_190px_110px_190px_minmax(260px,1.2fr)] gap-3 px-3 text-xs font-extrabold uppercase tracking-wide text-slate-500 xl:grid">
                <span>Công việc</span>
                <span>Ngân sách</span>
                <span>Giai đoạn</span>
                <span>Thời gian</span>
                <span>Tiêu chí nghiệm thu</span>
              </div>
              <div className="mt-3 grid gap-3">
                {milestones.map((milestone, index) => (
                  <div
                    key={index}
                    className="grid gap-3 rounded-2xl bg-white p-3 xl:grid-cols-[minmax(180px,1fr)_190px_110px_190px_minmax(260px,1.2fr)]"
                  >
                    <Input
                      aria-label={`Công việc ${index + 1}`}
                      value={milestone.milestoneName}
                      placeholder="Milestone name"
                      disabled={sowGeneratedLocked}
                      onChange={(event) =>
                        updateMilestone(index, {
                          milestoneName: event.target.value,
                        })
                      }
                    />
                    <Input
                      aria-label={`Ngân sách ${index + 1}`}
                      type="number"
                      min={0}
                      step="1"
                      value={milestone.fundsAllocated}
                      placeholder="Budget"
                      disabled={sowGeneratedLocked}
                      onChange={(event) =>
                        updateMilestoneBudgetAmount(index, event.target.value)
                      }
                    />
                    <Input
                      aria-label={`Giai đoạn ${index + 1}`}
                      type="number"
                      min={1}
                      value={milestone.orderIndex}
                      placeholder="GĐ"
                      disabled={sowGeneratedLocked}
                      onChange={(event) =>
                        updateMilestone(index, {
                          orderIndex: event.target.value,
                        })
                      }
                    />
                    <div
                      className={`flex h-11 self-start rounded-2xl border border-slate-200 px-3 ${
                        sowGeneratedLocked ? "bg-slate-50" : "bg-white"
                      }`}
                    >
                      <Input
                        aria-label={`Thời gian ${index + 1}`}
                        type="number"
                        min={1}
                      value={milestone.durationValue}
                      placeholder="TL"
                      className="h-full border-0 px-0 shadow-none focus:ring-0"
                      disabled={sowGeneratedLocked}
                      onChange={(event) =>
                        updateMilestone(index, {
                          durationValue: event.target.value,
                          })
                        }
                      />
                      <span className="flex shrink-0 items-center pl-2 text-sm font-semibold text-slate-500">
                        tuần
                      </span>
                    </div>
                    <div>
                      <div className="max-h-40 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-2">
                        {acceptanceCriteria.length === 0 ? (
                          <p className="px-2 py-1 text-xs font-semibold text-slate-500">
                            Chưa tải được danh sách tiêu chí.
                          </p>
                        ) : (
                          <div className="grid gap-1.5">
                            {acceptanceCriteria.map((criteria) => (
                              <label
                                key={criteria.criteriaId}
                                className="flex cursor-pointer items-start gap-2 rounded-xl px-2 py-1.5 text-xs font-semibold text-slate-600 hover:bg-white"
                              >
                                <input
                                  type="checkbox"
                                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-outline-variant text-primary focus:ring-primary"
                                  checked={milestone.criteriaIds.includes(
                                    criteria.criteriaId,
                                  )}
                                  onChange={() =>
                                    toggleMilestoneCriteria(
                                      index,
                                      criteria.criteriaId,
                                    )
                                  }
                                />
                                <span className="min-w-0 break-words">
                                  {criteria.description}
                                </span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="submit" loading={loading}>
                <Save className="h-4 w-4" />
                Lưu job nháp
              </Button>
            </div>
          </form>
        </Card>

        {savedJob && (
          <Card className="p-5">
            <SectionHeading
              title="Quản lý job nháp"
              description={
                createMessage || "Job đã được lưu ở trạng thái nháp."
              }
            />
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-400">
                    #{savedJob.jobId}
                  </p>
                  <p className="mt-1 break-words font-extrabold text-ink">
                    {savedJob.title}
                  </p>
                </div>
                <StatusBadge status={savedJob.status} />
              </div>
              <div className="mt-4 grid gap-3 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Ngân sách</span>
                  <span className="break-words text-right font-extrabold text-ink">
                    {formatCurrency(savedJob.budget)}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Lĩnh vực</span>
                  <span className="break-words text-right font-extrabold text-ink">
                    {selectedDomainIds
                      .map((id) => resolveDomainName(id, domains))
                      .join(", ")}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Kỹ năng</span>
                  <span className="break-words text-right font-extrabold text-ink">
                    {skillCountLabel(skillAssignments.length)}
                  </span>
                </div>
              </div>
            </div>
            <CompactMilestones
              milestones={milestones
                .filter((milestone) => milestone.milestoneName.trim())
                .map((milestone, index) => ({
                  milestoneId: index + 1,
                  jobId: savedJob.jobId,
                  milestoneName: milestone.milestoneName,
                  fundsAllocated: Number(milestone.fundsAllocated || 0),
                  orderIndex: Number(milestone.orderIndex || index + 1),
                  status: "Pending",
                  criteriaIds: milestone.criteriaIds,
                }))}
            />
            <div className="mt-4 grid gap-2">
              <LinkButton
                to={`/app/jobs/${savedJob.jobId}/manage`}
                variant="secondary"
              >
                Quản lý job
              </LinkButton>
              {savedJob.status !== "OPEN" && (
                <Button
                  type="button"
                  variant="success"
                  onClick={publishSavedJob}
                >
                  Mở public job
                </Button>
              )}
              <LinkButton to="/app/jobs" variant="ghost">
                Xem tất cả job nháp
              </LinkButton>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

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
            <SectionHeading title="Tóm tắt dự án" />
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

export function ManageJobPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [jobDomains, setJobDomains] = useState<number[]>([]);
  const [jobSkills, setJobSkills] = useState<JobSkill[]>([]);
  const [proposalTab, setProposalTab] = useState<"ai" | "proposal">("proposal");
  const [contractModal, setContractModal] = useState<Proposal | null>(null);
  const [contractForm, setContractForm] = useState({
    technologyUsed: "Python, FastAPI, PostgreSQL",
    totalBudget: "",
    timelineDays: "60",
  });

  useEffect(() => {
    const id = Number(jobId);
    marketplaceApi.getJob(id).then(setJob);
    marketplaceApi.listProposals(id).then(setProposals);
    Promise.all([
      catalogApi.listDomains(true),
      catalogApi.listSkills(true),
      catalogApi.listJobDomains(id),
      catalogApi.listJobSkills(id),
    ])
      .then(([domainItems, skillItems, jobDomainItems, jobSkillItems]) => {
        setDomains(domainItems);
        setSkills(skillItems);
        setJobDomains(jobDomainItems.map((item) => item.id.domainId));
        setJobSkills(jobSkillItems);
      })
      .catch(() => {
        setDomains([]);
        setSkills([]);
        setJobDomains([]);
        setJobSkills([]);
      });
    contractApi
      .listJobMilestones(id)
      .then(setMilestones)
      .catch(() => setMilestones([]));
  }, [jobId]);

  if (!job) return <div>Đang tải job...</div>;

  const review = async (
    proposalId: number,
    status: "Accepted" | "Rejected",
  ) => {
    const updated = await marketplaceApi.reviewProposal(proposalId, status);
    setProposals((items) =>
      items.map((item) => (item.proposalId === proposalId ? updated : item)),
    );
  };

  const createContract = async () => {
    if (!contractModal) return;
    const contract = await contractApi.createFromProposal(
      contractModal.proposalId,
      {
        technologyUsed: contractForm.technologyUsed,
        totalBudget: Number(
          contractForm.totalBudget || contractModal.bidAmount,
        ),
        timelineDays: Number(contractForm.timelineDays),
      },
    );
    setContractModal(null);
    navigate(`/app/contracts/${contract.contractId}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="MATCH-01 / MATCH-02"
        title={job.title}
        description="Theo dõi job, milestone đã khai báo và proposal chuyên gia gửi cho doanh nghiệp."
        actions={
          <LinkButton to={`/jobs/${job.jobId}`} variant="secondary">
            Xem public detail
          </LinkButton>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card className="p-6">
          <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-100 pb-4">
            <Button
              variant={proposalTab === "ai" ? "primary" : "secondary"}
              onClick={() => setProposalTab("ai")}
            >
              <Sparkles className="h-4 w-4" />
              AI đề xuất chuyên gia
            </Button>
            <Button
              variant={proposalTab === "proposal" ? "primary" : "secondary"}
              onClick={() => setProposalTab("proposal")}
            >
              <FileCheck2 className="h-4 w-4" />
              Proposal của chuyên gia
            </Button>
          </div>
          {proposalTab === "ai" && (
            <div className="grid gap-4">
              <SectionHeading
                title="AI đề xuất chuyên gia"
                description="Khu vực giao diện chuẩn bị cho AI matching. Chức năng đề xuất tự động sẽ được nối sau."
              />
              <div className="grid gap-4 md:grid-cols-2">
                {[1, 2].map((item) => (
                  <div
                    key={item}
                    className="rounded-3xl border border-dashed border-brand-200 bg-brand-50/40 p-5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-brand-600">
                        <Sparkles className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="font-extrabold text-ink">
                          Chuyên gia đề xuất #{item}
                        </p>
                        <p className="text-sm font-semibold text-slate-500">
                          Đang chờ AI matching
                        </p>
                      </div>
                    </div>
                    <div className="mt-5 grid gap-2 text-sm">
                      <div className="flex justify-between gap-3">
                        <span className="text-slate-500">Phù hợp lĩnh vực</span>
                        <span className="font-bold text-slate-400">
                          Chưa có dữ liệu
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-slate-500">Skill khớp</span>
                        <span className="font-bold text-slate-400">
                          Chưa có dữ liệu
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-slate-500">Trạng thái</span>
                        <Badge tone="amber">Sắp tích hợp</Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Notice tone="info" title="AI matching chưa kích hoạt">
                Tab này giữ giao diện cho luồng AI đề xuất chuyên gia, chưa gọi
                API đề xuất thật.
              </Notice>
            </div>
          )}
          <div className={proposalTab === "proposal" ? "block" : "hidden"}>
            <SectionHeading
              title="Proposal của chuyên gia"
              description="Danh sách proposal được chuyên gia gửi trực tiếp cho job này."
            />
            <div className="mt-6 grid gap-4">
              {proposals.map((proposal) => (
                <ProposalCard
                  key={proposal.proposalId}
                  proposal={proposal}
                  onAccept={() => review(proposal.proposalId, "Accepted")}
                  onReject={() => review(proposal.proposalId, "Rejected")}
                  onContract={() => {
                    setContractModal(proposal);
                    setContractForm((value) => ({
                      ...value,
                      totalBudget: String(proposal.bidAmount),
                    }));
                  }}
                />
              ))}
              {proposals.length === 0 && (
                <EmptyState
                  title="Chưa có proposal"
                  description="Job này chưa có proposal từ chuyên gia."
                />
              )}
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <SectionHeading title="Tóm tắt SoW" />
          <p className="mt-4 break-words text-sm leading-7 text-slate-600">
            {job.structuredSow || job.rawRequirements}
          </p>
          <div className="mt-5 grid gap-3 rounded-3xl bg-slate-50 p-4">
            <div className="grid grid-cols-[96px_minmax(0,1fr)] items-start gap-3 text-sm">
              <span className="text-slate-500">Ngân sách</span>
              <span className="min-w-0 break-words text-right font-extrabold text-ink">
                {formatCurrency(job.budget)}
              </span>
            </div>
            <div className="grid grid-cols-[96px_minmax(0,1fr)] items-start gap-3 text-sm">
              <span className="text-slate-500">Lĩnh vực</span>
              <div className="flex min-w-0 flex-wrap justify-end gap-1">
                {jobDomains.map((domainId) => (
                  <Badge key={domainId} tone="brand">
                    <span className="max-w-[180px] break-words text-xs">
                      {resolveDomainName(domainId, domains)}
                    </span>
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex justify-between gap-3 text-sm">
              <span className="text-slate-500">Kỹ năng</span>
              <span className="font-extrabold text-ink">
                {skillCountLabel(jobSkills.length)}
              </span>
            </div>
            <div className="flex justify-between gap-3 text-sm">
              <span className="text-slate-500">Trạng thái</span>
              <StatusBadge status={job.status} />
            </div>
            <div className="flex justify-between gap-3 text-sm">
              <span className="text-slate-500">Milestone</span>
              <span className="font-extrabold text-ink">
                {milestones.length} mốc
              </span>
            </div>
          </div>
          <div className="mt-5">
            <SectionHeading title="Kỹ năng yêu cầu" />
            <div className="mt-4 grid gap-2">
              {jobSkills.map((item) => (
                <div
                  key={item.id.skillId}
                  className="rounded-2xl border border-slate-100 bg-white p-3 text-sm"
                >
                  <p className="font-extrabold text-ink">
                    {resolveSkillName(item.id.skillId, skills)}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {item.isMandatory ? "Bắt buộc" : "Optional"}
                  </p>
                </div>
              ))}
              {jobSkills.length === 0 && (
                <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-400">
                  Chưa có kỹ năng yêu cầu.
                </p>
              )}
            </div>
          </div>
          <div className="mt-5">
            <SectionHeading title="Milestone" />
            <CompactMilestones milestones={milestones} />
          </div>
        </Card>
      </div>

      <Modal
        open={Boolean(contractModal)}
        onClose={() => setContractModal(null)}
        title="Tạo hợp đồng nháp"
        description="Tạo draft contract từ proposal đã chọn."
        footer={
          <>
            <Button variant="secondary" onClick={() => setContractModal(null)}>
              Hủy
            </Button>
            <Button onClick={createContract}>Tạo Draft</Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Field label="Công nghệ sử dụng">
            <Input
              value={contractForm.technologyUsed}
              onChange={(event) =>
                setContractForm((value) => ({
                  ...value,
                  technologyUsed: event.target.value,
                }))
              }
            />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Tổng ngân sách">
              <Input
                type="number"
                value={contractForm.totalBudget}
                onChange={(event) =>
                  setContractForm((value) => ({
                    ...value,
                    totalBudget: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Timeline days">
              <Input
                type="number"
                value={contractForm.timelineDays}
                onChange={(event) =>
                  setContractForm((value) => ({
                    ...value,
                    timelineDays: event.target.value,
                  }))
                }
              />
            </Field>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ProposalCard({
  proposal,
  onAccept,
  onReject,
  onContract,
}: {
  proposal: Proposal;
  onAccept: () => void;
  onReject: () => void;
  onContract: () => void;
}) {
  const [expertOpen, setExpertOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailMessage, setDetailMessage] = useState("");
  const [expertProfile, setExpertProfile] = useState<ExpertProfile | null>(
    null,
  );
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);

  useEffect(() => {
    if (!expertOpen) return;
    let ignore = false;

    async function loadExpertDetail() {
      setDetailLoading(true);
      setDetailMessage("");
      const [expertsResult, portfoliosResult] = await Promise.allSettled([
        profileApi.listExperts(),
        profileApi.listPortfolios(),
      ]);
      const [domainsResult, skillsResult] = await Promise.allSettled([
        catalogApi.listDomains(true),
        catalogApi.listSkills(true),
      ]);

      if (ignore) return;

      const experts =
        expertsResult.status === "fulfilled" ? expertsResult.value : [];
      const portfolios =
        portfoliosResult.status === "fulfilled" ? portfoliosResult.value : [];
      const profile =
        experts.find((item) => item.expertId === proposal.expertId) || null;
      const matchedPortfolio =
        portfolios.find((item) => item.expertId === proposal.expertId) || null;

      setExpertProfile(profile);
      setPortfolio(matchedPortfolio);
      setDomains(
        domainsResult.status === "fulfilled" ? domainsResult.value : [],
      );
      setSkills(skillsResult.status === "fulfilled" ? skillsResult.value : []);
      setDetailLoading(false);

      if (
        expertsResult.status === "rejected" ||
        portfoliosResult.status === "rejected"
      ) {
        setDetailMessage("Một số thông tin chưa lấy được từ API hiện tại.");
      }
    }

    loadExpertDetail();
    return () => {
      ignore = true;
    };
  }, [expertOpen, proposal.expertId]);

  const expertName =
    expertProfile?.fullName ||
    proposal.expertName ||
    `Expert #${proposal.expertId}`;
  const domainNames = resolveCatalogNames(
    portfolio?.domainIds,
    domains,
    "domainId",
    "domainName",
  );
  const skillNames = resolveCatalogNames(
    portfolio?.skillIds,
    skills,
    "skillId",
    "skillName",
  );
  const expertPhone = expertProfile?.phone || "Chưa có dữ liệu";

  return (
    <div className="rounded-3xl border border-slate-100 p-4 transition hover:border-brand-100 hover:bg-brand-50/30">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex gap-3">
          <Avatar name={proposal.expertName} />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-extrabold text-ink">
                {proposal.expertName || `Expert #${proposal.expertId}`}
              </p>
              <StatusBadge status={proposal.status} />
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {proposal.expertTitle}
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              {proposal.technicalSolution}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-left md:text-right">
          <p className="font-display text-xl font-black text-ink">
            {formatCompactCurrency(proposal.bidAmount)}
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setExpertOpen(true)}
        >
          <Eye className="h-4 w-4" />
          Xem chi tiết
        </Button>
        <Button variant="success" size="sm" onClick={onAccept}>
          <CheckCircle2 className="h-4 w-4" />
          Accept
        </Button>
        <Button variant="danger" size="sm" onClick={onReject}>
          <XCircle className="h-4 w-4" />
          Reject
        </Button>
        <Button size="sm" onClick={onContract}>
          <FileCheck2 className="h-4 w-4" />
          Tạo contract
        </Button>
      </div>
      <Modal
        open={expertOpen}
        onClose={() => setExpertOpen(false)}
        title="Thông tin chuyên gia"
        description="Profile và portfolio của chuyên gia gửi proposal."
        size="lg"
      >
        <div className="grid gap-5">
          {detailMessage && <Notice tone="warning" title={detailMessage} />}
          <div className="flex items-start gap-4 rounded-3xl bg-slate-50 p-4">
            <Avatar name={expertName} size="xl" />
            <div className="min-w-0">
              <p className="font-display text-2xl font-black text-ink">
                {expertName}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {expertPhone}
              </p>
              {detailLoading && (
                <p className="mt-2 text-xs font-bold text-brand-600">
                  Đang tải hồ sơ...
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <ExpertInfoItem label="Tên chuyên gia" value={expertName} />
            <ExpertInfoItem label="Số điện thoại" value={expertPhone} />
          </div>

          <SectionHeading
            title="Portfolio"
            description="Các thuộc tính trong bảng portfolios của chuyên gia tương ứng."
          />
          <div className="grid gap-3">
            <ExpertInfoItem
              label="Lĩnh vực"
              value={domainNames || "Chưa có dữ liệu"}
              multiline
            />
            <ExpertInfoItem
              label="Skill"
              value={skillNames || "Chưa có dữ liệu"}
              multiline
            />
            <ExpertInfoItem
              label="Số năm kinh nghiệm"
              value={
                portfolio?.yearsExperience != null
                  ? `${portfolio.yearsExperience} năm`
                  : "Chưa có dữ liệu"
              }
            />
            <ExpertInfoBlock label="Chứng chỉ">
              <FirebaseFileLink
                path={portfolio?.certificates}
                emptyText="Chưa có chứng chỉ"
                buttonText="Xem chứng chỉ"
              />
            </ExpertInfoBlock>
            <ExpertInfoItem
              label="Mô tả bản thân"
              value={portfolio?.selfDescription || "Chưa có dữ liệu"}
              multiline
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

function resolveCatalogNames(
  ids: string | undefined,
  items: Array<Domain | Skill>,
  idKey: "domainId" | "skillId",
  nameKey: "domainName" | "skillName",
) {
  if (!ids) return "";
  const parsedIds = ids
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item));
  if (parsedIds.length === 0) return ids;
  const names = parsedIds.map((id) => {
    const item = items.find(
      (catalogItem) =>
        Number(catalogItem[idKey as keyof typeof catalogItem]) === id,
    );
    return item ? String(item[nameKey as keyof typeof item]) : String(id);
  });
  return names.join(", ");
}

function ExpertInfoItem({
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

function ExpertInfoBlock({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

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
      <PageHeader
        eyebrow="MATCH-02"
        title="Cơ hội dành cho chuyên gia"
        description="Chuyên gia xem job công khai và nộp proposal chủ động."
      />
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

export function ProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [jobsById, setJobsById] = useState<Record<number, Job>>({});
  const [loading, setLoading] = useState(true);

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
        if (ignore) return;
        const map: Record<number, Job> = {};
        jobResults.forEach((result) => {
          if (result.status === "fulfilled") {
            map[result.value.jobId] = result.value;
          }
        });
        setJobsById(map);
      } catch {
        if (!ignore) {
          setProposals([]);
          setJobsById({});
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
      {loading && <Notice tone="info" title="Đang tải proposal..." />}
      <div className="grid gap-4">
        {proposals.map((proposal) => {
          const job = jobsById[proposal.jobId];
          return (
            <Card key={proposal.proposalId} className="p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2">
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
      {!loading && proposals.length === 0 && (
        <EmptyState
          title="Chưa có proposal"
          description="Khi chuyên gia gửi proposal cho job public, dữ liệu sẽ xuất hiện tại đây."
        />
      )}
    </div>
  );
}

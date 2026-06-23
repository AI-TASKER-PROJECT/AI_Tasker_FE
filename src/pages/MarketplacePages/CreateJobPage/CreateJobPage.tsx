import {
  CheckCircle2,
  Eye,
  FileCheck2,
  HelpCircle,
  Save,
  Sparkles,
  Target,
  Unlock,
  XCircle,
} from "lucide-react";
import { FormEvent, useEffect, useState, type ReactNode } from "react";
import {
  catalogApi,
  getApiErrorMessage,
  marketplaceApi,
  sowApi,
  userQuotaApi,
  type GeneratedSow,
  type GeneratedSowMilestone,
  type Domain,
  type Skill,
  type Technology,
} from "../../../services";
import { cn, formatCurrency } from "../../../lib/utils";
import type { AcceptanceCriteria, Job, UserQuota } from "../../../types";
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  LinkButton,
  Notice,
  PageHeader,
  SectionHeading,
  StatusBadge,
  Textarea,
} from "../../../components/ui";
import { JobDomainBadge } from "../../PublicPages";
import {
  formatGeneratedSow,
  jobDomainLabel,
  resolveDomainName,
  resolveSkillName,
  skillCountLabel,
  type MilestoneDraft,
  type SkillAssignment,
} from "../marketplacePages.utils";
import { CompactMilestones } from "../marketplacePages.helpers";

// ─── Step Indicator ───────────────────────────────────────────────────────────
type WizardStep = 1 | 2 | 3 | 4;

function StepIndicator({ current }: { current: WizardStep }) {
  const steps: { id: WizardStep; label: string; icon: ReactNode }[] = [
    {
      id: 1,
      label: "Thông tin dự án",
      icon: <FileCheck2 className="h-4 w-4" />,
    },
    { id: 2, label: "AI tạo SoW", icon: <Sparkles className="h-4 w-4" /> },
    {
      id: 3,
      label: "Kiểm tra & diều chỉnh",
      icon: <Eye className="h-4 w-4" />,
    },
    { id: 4, label: "Lưu job", icon: <Save className="h-4 w-4" /> },
  ];

  return (
    <div className="mb-6 flex items-center gap-0">
      {steps.map((step, index) => {
        const isDone = current > step.id;
        const isActive = current === step.id;
        return (
          <div key={step.id} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "grid h-9 w-9 place-items-center rounded-full text-xs font-bold transition-all duration-300",
                  isDone
                    ? "bg-brand-600 text-white shadow-[0_4px_12px_rgba(23,103,242,.3)]"
                    : isActive
                      ? "bg-brand-100 text-brand-700 ring-2 ring-brand-300"
                      : "bg-slate-100 text-slate-400",
                )}
              >
                {isDone ? <CheckCircle2 className="h-4 w-4" /> : step.icon}
              </div>
              <span
                className={cn(
                  "hidden text-[10px] font-bold md:block",
                  isActive
                    ? "text-brand-700"
                    : isDone
                      ? "text-brand-500"
                      : "text-slate-400",
                )}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "mb-5 h-0.5 flex-1 transition-all duration-500",
                  isDone ? "bg-brand-400" : "bg-slate-200",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── SoW Section Card ─────────────────────────────────────────────────────────
function SowSectionCard({
  label,
  icon,
  items,
  tone = "brand",
}: {
  label: string;
  icon: ReactNode;
  items?: string[];
  tone?: "brand" | "mint" | "amber" | "violet" | "coral";
}) {
  if (!items || items.length === 0) return null;
  const tones = {
    brand: "bg-brand-50 border-brand-100 text-brand-700",
    mint: "bg-mint-50 border-mint-100 text-mint-700",
    amber: "bg-amber-50 border-amber-100 text-amber-700",
    violet: "bg-violet-50 border-violet-100 text-violet-700",
    coral: "bg-coral-50 border-coral-100 text-coral-700",
  };
  const dotColors = {
    brand: "bg-brand-400",
    mint: "bg-mint-500",
    amber: "bg-amber-400",
    violet: "bg-violet-400",
    coral: "bg-coral-400",
  };
  return (
    <div className={cn("rounded-2xl border p-4", tones[tone])}>
      <div className="mb-3 flex items-center gap-2">
        <span className="opacity-80">{icon}</span>
        <p className="text-xs font-extrabold uppercase tracking-wide opacity-80">
          {label}
        </p>
      </div>
      <ul className="grid gap-1.5">
        {items.map((item, i) => (
          <li
            key={i}
            className="flex items-start gap-2 text-sm font-medium leading-6 opacity-90"
          >
            <span
              className={cn(
                "mt-2 h-1.5 w-1.5 shrink-0 rounded-full",
                dotColors[tone],
              )}
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── SoW Preview Panel ────────────────────────────────────────────────────────
function SowPreviewPanel({ sow }: { sow: GeneratedSow }) {
  return (
    <div className="grid gap-3">
      {sow.overview && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="mb-1.5 text-xs font-extrabold uppercase tracking-wide text-slate-500">
            Tổng quan
          </p>
          <p className="text-sm leading-7 text-slate-700">{sow.overview}</p>
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        <SowSectionCard
          label="Mục tiêu"
          icon={<Target className="h-4 w-4" />}
          items={sow.objectives}
          tone="brand"
        />
        <SowSectionCard
          label="Phạm vi công việc"
          icon={<FileCheck2 className="h-4 w-4" />}
          items={sow.scopeOfWork}
          tone="mint"
        />
        <SowSectionCard
          label="Sản phẩm bàn giao"
          icon={<CheckCircle2 className="h-4 w-4" />}
          items={sow.deliverables}
          tone="violet"
        />
        <SowSectionCard
          label="Giả dịnh"
          icon={<HelpCircle className="h-4 w-4" />}
          items={sow.assumptions}
          tone="amber"
        />
      </div>
      {sow.outOfScope && sow.outOfScope.length > 0 && (
        <SowSectionCard
          label="Ngoài phạm vi"
          icon={<XCircle className="h-4 w-4" />}
          items={sow.outOfScope}
          tone="coral"
        />
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function CreateJobPage() {
  const [form, setForm] = useState({
    title: "",
    rawRequirements: "",
    structuredSow: "",
    budgetAmount: "",
    plannedDurationValue: "",
  });
  const [milestones, setMilestones] = useState<MilestoneDraft[]>([
    {
      milestoneName: "",
      description: "",
      fundsAllocated: "",
      orderIndex: "1",
      durationValue: "",
      criteriaIds: [],
      criteriaSearch: "",
    },
    {
      milestoneName: "",
      description: "",
      fundsAllocated: "",
      orderIndex: "2",
      durationValue: "",
      criteriaIds: [],
      criteriaSearch: "",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [sowGeneratedLocked, setSowGeneratedLocked] = useState(false);
  const [isOrderIndexLocked, setIsOrderIndexLocked] = useState(false);
  const [generatedSow, setGeneratedSow] = useState<GeneratedSow | null>(null);
  const [savedJob, setSavedJob] = useState<Job | null>(null);
  const [createMessage, setCreateMessage] = useState("");
  const [createMessageTone, setCreateMessageTone] = useState<
    "info" | "success" | "warning" | "danger"
  >("info");
  const [domains, setDomains] = useState<Domain[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [technologies, setTechnologies] = useState<Technology[]>([]);
  const [acceptanceCriteria, setAcceptanceCriteria] = useState<
    AcceptanceCriteria[]
  >([]);
  const [selectedDomainId, setSelectedDomainId] = useState<number | null>(null);
  const [selectedTechnologyIds, setSelectedTechnologyIds] = useState<number[]>(
    [],
  );
  const [skillAssignments, setSkillAssignments] = useState<SkillAssignment[]>(
    [],
  );
  const [quota, setQuota] = useState<UserQuota | null>(null);

  // ── AI NeedMoreInfo flow ──────────────────────────────────────────────────
  const [aiQuestions, setAiQuestions] = useState<string[]>([]);
  const [aiAdditionalInfo, setAiAdditionalInfo] = useState("");
  const [showAiReplyBox, setShowAiReplyBox] = useState(false);

  const [publishError, setPublishError] = useState("");

  // ── Step state (derives from form progress) ───────────────────────────────
  const wizardStep: WizardStep = savedJob ? 4 : generatedSow ? 3 : 1;

  useEffect(() => {
    Promise.all([
      catalogApi.listDomains(true),
      catalogApi.listSkills(true),
      catalogApi.listTechnologies(true),
      catalogApi.listAcceptanceCriteria(true).catch(() => []),
      userQuotaApi.getCurrent().catch(() => null),
    ]).then(
      ([
        domainItems,
        skillItems,
        technologyItems,
        criteriaItems,
        quotaItem,
      ]) => {
        setDomains(domainItems);
        setSkills(skillItems);
        setTechnologies(technologyItems);
        setAcceptanceCriteria(criteriaItems);
        setQuota(quotaItem);
      },
    );
  }, []);

  const selectedDomainIdList =
    selectedDomainId !== null ? [selectedDomainId] : [];

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
    criteriaSearch: "",
  });

  // ── Build AI payload — includes technology names ──────────────────────────
  const buildAiPayload = () => {
    const technologyNames = technologies
      .filter((t) => selectedTechnologyIds.includes(t.technologyId))
      .map((t) => t.technologyName);

    const rawRequirementWithExtra = aiAdditionalInfo.trim()
      ? `${form.rawRequirements}\n\nBổ sung thêm: ${aiAdditionalInfo.trim()}`
      : form.rawRequirements;

    return {
      projectTitle: form.title,
      rawRequirement: rawRequirementWithExtra,
      budget: Number(form.budgetAmount),
      duration: Number(form.plannedDurationValue),
      durationUnit: "WEEK",
      supportFields: selectedDomainIdList.map((id) =>
        resolveDomainName(id, domains),
      ),
      requiredSkills: [
        ...skillAssignments.map((assignment) =>
          resolveSkillName(assignment.skillId, skills),
        ),
        ...technologyNames,
      ],
    };
  };

  const generateSow = async () => {
    setAiLoading(true);
    setCreateMessage("");
    setAiQuestions([]);
    setShowAiReplyBox(false);
    try {
      const response = await sowApi.generate(buildAiPayload());

      const structuredSow = formatGeneratedSow(
        response.sow,
        response.milestones,
      );
      setGeneratedSow(response.sow || null);
      setForm((value) => ({
        ...value,
        structuredSow: structuredSow || value.structuredSow,
      }));

      if (response.milestones && response.milestones.length > 0) {
        const newMilestones = response.milestones.map(mapGeneratedMilestone);
        setMilestones(newMilestones);

        const newTotalBudget = newMilestones.reduce(
          (sum, m) => sum + (Number(m.fundsAllocated) || 0),
          0,
        );
        const newTotalDuration = newMilestones.reduce(
          (sum, m) => sum + (Number(m.durationValue) || 0),
          0,
        );

        setForm((value) => ({
          ...value,
          budgetAmount:
            newTotalBudget > 0 ? String(newTotalBudget) : value.budgetAmount,
          plannedDurationValue:
            newTotalDuration > 0
              ? String(newTotalDuration)
              : value.plannedDurationValue,
        }));
      }

      if (response.needMoreInfo) {
        const questions =
          response.questions && response.questions.length > 0
            ? response.questions
            : ["AI cần thêm thông tin dể tạo SoW chính xác hơn."];
        setAiQuestions(questions);
        setShowAiReplyBox(true);
        setCreateMessage(
          "AI cần bổ sung thêm thông tin trước khi tạo SoW dầy dủ.",
        );
        setCreateMessageTone("warning");
        setSowGeneratedLocked(false);
        return;
      }

      const hasGeneratedContent = Boolean(
        structuredSow ||
        (response.milestones && response.milestones.length > 0),
      );
      setSowGeneratedLocked(hasGeneratedContent);
      if (hasGeneratedContent) setIsOrderIndexLocked(true);
      setCreateMessage(
        "✓ AI đã tạo SoW và cập nhật Project milestones thành công.",
      );
      setCreateMessageTone("success");
    } catch (error) {
      setSowGeneratedLocked(false);
      setGeneratedSow(null);
      setCreateMessage(`Lỗi: ${getApiErrorMessage(error)}`);
      setCreateMessageTone("danger");
    } finally {
      setAiLoading(false);
    }
  };

  // ── Unlock form to allow re-editing after AI generate ─────────────────────
  const unlockForm = () => {
    setSowGeneratedLocked(false);
    setGeneratedSow(null);
    setAiQuestions([]);
    setShowAiReplyBox(false);
    setAiAdditionalInfo("");
    setCreateMessage("");
  };

  const toggleSkill = (skillId: number) => {
    setSkillAssignments((items) =>
      items.some((item) => item.skillId === skillId)
        ? items.filter((item) => item.skillId !== skillId)
        : [...items, { skillId, isMandatory: true }],
    );
  };

  const toggleTechnology = (technologyId: number) => {
    setSelectedTechnologyIds((items) =>
      items.includes(technologyId)
        ? items.filter((id) => id !== technologyId)
        : [...items, technologyId],
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
    setSavedJob((prev) => (prev ? { ...prev, budget: Number(amount) } : prev));
  };

  const updateMilestone = (index: number, patch: Partial<MilestoneDraft>) => {
    setMilestones((items) => {
      const newItems = items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      );
      if ("durationValue" in patch) {
        const newTotal = newItems.reduce(
          (acc, m) => acc + Number(m.durationValue || 0),
          0,
        );
        setForm((prev) => ({
          ...prev,
          plannedDurationValue: String(newTotal),
        }));
        setSavedJob((prev) =>
          prev ? { ...prev, plannedDurationValue: newTotal } : prev,
        );
      }
      return newItems;
    });
  };

  const updateMilestoneBudgetAmount = (index: number, amount: string) => {
    setMilestones((items) => {
      const newItems = items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, fundsAllocated: amount } : item,
      );
      const newTotal = newItems.reduce(
        (acc, m) => acc + Number(m.fundsAllocated || 0),
        0,
      );
      setForm((prev) => ({
        ...prev,
        budgetAmount: String(newTotal),
      }));
      setSavedJob((prev) => (prev ? { ...prev, budget: newTotal } : prev));
      return newItems;
    });
  };

  const updateMilestoneDurationValue = (index: number, newDuration: string) => {
    setMilestones((items) => {
      const newItems = items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, durationValue: newDuration } : item,
      );
      const newTotal = newItems.reduce(
        (sum, item) => sum + (Number(item.durationValue) || 0),
        0,
      );
      setForm((prev) => ({
        ...prev,
        plannedDurationValue: String(newTotal),
      }));
      setSavedJob((prev) =>
        prev ? { ...prev, plannedDurationValue: newTotal } : prev,
      );
      return newItems;
    });
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
    const stringifyList = (values?: string[]) => JSON.stringify(values || []);

    if (!generatedSow) {
      if (!form.structuredSow.trim() && !form.rawRequirements.trim())
        return undefined;
      return {
        title: form.title || "Tự định nghĩa SoW",
        overview: form.structuredSow || form.rawRequirements,
        objectives: stringifyList([]),
        scopeOfWork: stringifyList([]),
        deliverable: stringifyList([]),
        assumptions: stringifyList([]),
        outOfScope: stringifyList([]),
      };
    }

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

  const buildMilestonePayload = () =>
    milestones
      .filter((milestone) => milestone.milestoneName.trim())
      .map((milestone, index) => ({
        milestoneName: milestone.milestoneName,
        description: milestone.description || "",
        fundsAllocated: Number(milestone.fundsAllocated || 0),
        orderIndex: Number(milestone.orderIndex || index + 1),
        status: "PENDING",
        durationValue: Number(milestone.durationValue || 0),
        duration: Number(milestone.durationValue || 0),
        durationUnit: "WEEK",
        criteriaIds: milestone.criteriaIds,
      }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setCreateMessage("");
    setPublishError("");
    try {
      if (selectedDomainId === null) {
        setCreateMessage("Vui lòng chọn ít nhất một lĩnh vực cho job.");
        setCreateMessageTone("warning");
        return;
      }
      if (selectedTechnologyIds.length === 0) {
        setCreateMessage("Vui lòng chọn ít nhất một công nghệ cho job.");
        setCreateMessageTone("warning");
        return;
      }
      if (skillAssignments.length === 0) {
        setCreateMessage("Vui lòng chọn ít nhất một kỹ năng cho job.");
        setCreateMessageTone("warning");
        return;
      }
      const payload = {
        title: form.title,
        rawRequirements: form.rawRequirements,
        structuredSow: form.structuredSow,
        sow: buildSowPayload(),
        milestones: buildMilestonePayload(),
        budget: Number(form.budgetAmount),
        plannedDurationValue: Number(form.plannedDurationValue),
        technologyIds: selectedTechnologyIds,
        plannedDurationUnit: "WEEK",
      };

      let job: Job;
      if (savedJob) {
        job = await marketplaceApi.updateDraftJob(savedJob.jobId, payload);
        setCreateMessage("Yêu cầu nháp đã được cập nhật thành công.");
      } else {
        job = await marketplaceApi.createJob(payload);
        setCreateMessage(
          "Yêu cầu nháp đã được tạo. Bạn có thể kiểm tra, quản lý hoặc mở public job ngay bên dưới.",
        );
      }
      setSavedJob(job);
      setCreateMessageTone("success");

      try {
        await catalogApi.replaceJobDomains(job.jobId, selectedDomainIdList);
        await catalogApi.replaceJobSkills(
          job.jobId,
          skillAssignments.map((assignment) => ({
            skillId: assignment.skillId,
            isMandatory: assignment.isMandatory,
          })),
        );
      } catch {
        setCreateMessage(
          "Job nháp đã dược tạo, nhưng một phần domain/skill chưa lưu dược. Bạn vẫn có thể vào quản lý job dể kiểm tra.",
        );
        setCreateMessageTone("warning");
      }
    } catch (error) {
      setCreateMessage(`Không lưu dược job nháp: ${getApiErrorMessage(error)}`);
      setCreateMessageTone("danger");
    } finally {
      setLoading(false);
    }
  };

  const publishSavedJob = async () => {
    if (!savedJob) return;
    setPublishError("");
    if (quota && (quota.jobPostQuotaBalance ?? 0) <= 0) {
      setPublishError(
        "Bạn đã hết lượt đăng bài. Vui lòng mua thêm lượt đăng bài hoặc gói thành viên.",
      );
      return;
    }

    const sowPayload = buildSowPayload();
    if (!form.structuredSow.trim()) {
      setPublishError(
        "Không thể đăng bài vì SoW và Milestones chưa được mô tả.",
      );
      return;
    }

    setLoading(true);
    try {
      await marketplaceApi.updateDraftJob(savedJob.jobId, {
        title: form.title,
        rawRequirements: form.rawRequirements,
        structuredSow: form.structuredSow,
        sow: sowPayload,
        milestones: buildMilestonePayload(),
        budget: Number(form.budgetAmount),
        plannedDurationValue: Number(form.plannedDurationValue),
        technologyIds: selectedTechnologyIds,
        plannedDurationUnit: "WEEK",
      });

      const updated = await marketplaceApi.updateJobStatus(
        savedJob.jobId,
        "OPEN",
      );
      setSavedJob(updated);
      setCreateMessage(
        "Job đã dược mở public. Chuyên gia có thể nhìn thấy và gửi proposal.",
      );
      setCreateMessageTone("success");
    } catch (error) {
      setPublishError(`Không thể dăng bài: ${getApiErrorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  };

  // ─── Derived helpers ───────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          title="AI Job Assistant"
          description="Nhập thông tin dự án, dể AI hỗ trợ tạo Statement of Work và milestone."
        />
      </div>

      {/* Wizard Step Indicator */}
      <StepIndicator current={wizardStep} />

      <div className="grid gap-6">
        <Card className="p-6">
          <form onSubmit={submit} className="grid gap-6">
            {/* ── STEP 1: Project info ── */}
            <div className="grid gap-4">
              <SectionHeading
                title="Bước 1 — Thông tin dự án"
                description="Điền dầy dủ thông tin dể AI có thể tạo SoW chính xác nhất."
              />

              <Field label="Tiêu dề dự án">
                <Input
                  value={form.title}
                  onChange={(event) =>
                    setForm((value) => ({
                      ...value,
                      title: event.target.value,
                    }))
                  }
                  required
                />
              </Field>
              <Field
                label="Yêu cầu dự án"
                hint="Mô tả càng chi tiết, AI càng tạo SoW chính xác hơn."
              >
                <Textarea
                  value={form.rawRequirements}
                  autoResize
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
                        const isSelected = selectedDomainId === domain.domainId;
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
                                setSelectedDomainId(domain.domainId)
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

                <Field label="Công nghệ nền tảng">
                  <div className="max-h-72 overflow-y-auto rounded-2xl border border-outline-variant bg-surface p-3 shadow-sm">
                    <div className="grid gap-3">
                      {technologies.map((technology) => {
                        const isSelected = selectedTechnologyIds.includes(
                          technology.technologyId,
                        );
                        return (
                          <div
                            key={technology.technologyId}
                            className={`rounded-xl border px-3 py-3 transition-colors ${
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
                                onChange={() =>
                                  toggleTechnology(technology.technologyId)
                                }
                              />
                              <span className="min-w-0 break-words">
                                {technology.technologyName}
                              </span>
                            </label>
                          </div>
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
                <Field label="Ngân sách (VND)">
                  <Input
                    type="text"
                    value={
                      form.budgetAmount
                        ? new Intl.NumberFormat("vi-VN").format(
                            Number(form.budgetAmount),
                          )
                        : ""
                    }
                    onChange={(event) =>
                      updateFormBudgetAmount(
                        event.target.value.replace(/\D/g, ""),
                      )
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
                  <Input value="Week(tuần)" readOnly disabled />
                </Field>
              </div>
            </div>

            {/* ── STEP 2: AI Generate ── */}
            <div className="rounded-2xl border border-dashed border-brand-200 bg-gradient-to-br from-brand-50/60 to-indigo-50/40 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="flex items-center gap-2 text-sm font-extrabold text-brand-700">
                    <Sparkles className="h-4 w-4" />
                    Bước 2 — Để AI tạo Statement of Work
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    AI phân tích yêu cầu, tham chiếu và tự động chia milestone
                    và ngân sách.
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {sowGeneratedLocked && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={unlockForm}
                      title="Mở khóa dể chỉnh sửa lại"
                    >
                      <Unlock className="h-4 w-4" />
                      Chỉnh sửa lại
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="secondary"
                    loading={aiLoading}
                    onClick={generateSow}
                  >
                    <Sparkles className="h-4 w-4" />
                    {sowGeneratedLocked ? "Tạo lại SoW" : "Tạo SoW bằng AI"}
                  </Button>
                </div>
              </div>

              {/* AI Questions — needMoreInfo flow */}
              {showAiReplyBox && aiQuestions.length > 0 && (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="mb-3 flex items-center gap-2 text-sm font-bold text-amber-700">
                    <HelpCircle className="h-4 w-4 shrink-0" />
                    AI cần thêm thông tin
                  </p>
                  <ul className="mb-4 grid gap-2">
                    {aiQuestions.map((q, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-amber-800"
                      >
                        <span className="mt-1 shrink-0 text-amber-500">›</span>
                        {q}
                      </li>
                    ))}
                  </ul>
                  <Field label="Bổ sung câu trả lời cho AI">
                    <Textarea
                      value={aiAdditionalInfo}
                      placeholder="Nhập thêm thông tin dể AI có thể tạo SoW dầy dủ hơn..."
                      autoResize
                      onChange={(e) => setAiAdditionalInfo(e.target.value)}
                    />
                  </Field>
                  <div className="mt-3 flex justify-end">
                    <Button
                      type="button"
                      variant="secondary"
                      loading={aiLoading}
                      onClick={generateSow}
                      size="sm"
                    >
                      <Sparkles className="h-4 w-4" />
                      Gửi và tạo lại SoW
                    </Button>
                  </div>
                </div>
              )}

              {/* Message notice */}
              {createMessage && !savedJob && (
                <div className="mt-4">
                  <Notice tone={createMessageTone} title={createMessage} />
                </div>
              )}
            </div>

            {/* ── STEP 3: Review SoW & Milestones ── */}
            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <SectionHeading
                  title="Bước 3 — Kiểm tra & điều chỉnh SoW"
                  description={
                    sowGeneratedLocked
                      ? 'AI đã tạo SoW. Xem preview bên dưới. Nhấn "Chỉnh sửa lại" nếu cần sửa.'
                      : "SoW hiển thị ngay sau khi bạn sử dụng AI hoặc bạn có thể tự soạn theo mong muốn"
                  }
                />
                {sowGeneratedLocked && generatedSow && (
                  <Badge tone="mint">✓ AI đã tạo</Badge>
                )}
              </div>

              {/* SoW Preview Cards (when AI generated) */}
              {generatedSow && sowGeneratedLocked && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  {generatedSow.title && (
                    <p className="mb-4 font-display text-base font-extrabold text-ink">
                      {generatedSow.title}
                    </p>
                  )}
                  <SowPreviewPanel sow={generatedSow} />
                </div>
              )}

              {/* Structured SoW Text — editable when not locked */}
              <Field
                label={sowGeneratedLocked ? "SoW-(complete)" : "Structured SoW"}
              >
                <Textarea
                  value={form.structuredSow}
                  disabled={sowGeneratedLocked}
                  autoResize
                  onChange={(event) =>
                    setForm((value) => ({
                      ...value,
                      structuredSow: event.target.value,
                    }))
                  }
                  className={
                    sowGeneratedLocked ? "bg-slate-50 text-slate-500" : ""
                  }
                />
              </Field>

              {/* Project Milestones */}
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <SectionHeading
                    title="Project milestones"
                    description="Milestones dược dính kèm với job, dùng lại trong hợp đồng sau khi proposal dược chấp nhận."
                  />
                  {/* Budget indicator */}
                  {Number(form.budgetAmount) > 0 && (
                    <div className="shrink-0 text-right">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Ngân sách
                      </p>
                      <p className="text-sm font-extrabold text-brand-600">
                        {formatCurrency(Number(form.budgetAmount))}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-4 hidden grid-cols-[minmax(180px,1fr)_190px_110px_190px_minmax(260px,1.2fr)] gap-3 px-3 text-xs font-extrabold uppercase tracking-wide text-slate-500 xl:grid">
                  <span>Công việc</span>
                  <span>Ngân sách</span>
                  <span>Giai doạn</span>
                  <span>Thời gian</span>
                  <span>Tiêu chí nghiệm thu</span>
                </div>
                <div className="mt-3 grid gap-3">
                  {milestones.map((milestone, index) => (
                    <div
                      key={index}
                      className="grid gap-3 rounded-2xl bg-white p-3 xl:grid-cols-[minmax(180px,1fr)_190px_110px_190px_minmax(260px,1.2fr)]"
                    >
                      {/* Milestone name — always editable */}
                      <Input
                        aria-label={`Công việc ${index + 1}`}
                        value={milestone.milestoneName}
                        placeholder="Milestone name"
                        onChange={(event) =>
                          updateMilestone(index, {
                            milestoneName: event.target.value,
                          })
                        }
                      />
                      {/* Budget — editable only when not locked */}
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
                        aria-label={`Giai doạn ${index + 1}`}
                        type="number"
                        min={1}
                        value={milestone.orderIndex}
                        placeholder="GĐ"
                        disabled={sowGeneratedLocked || isOrderIndexLocked}
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
                            updateMilestoneDurationValue(
                              index,
                              event.target.value,
                            )
                          }
                        />
                        <span className="flex shrink-0 items-center pl-2 text-sm font-semibold text-slate-500">
                          WEEK
                        </span>
                      </div>

                      {/* Acceptance Criteria — always interactive */}
                      <div>
                        <div className="max-h-40 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-2">
                          {(() => {
                            const searchStr = (milestone.criteriaSearch || "")
                              .trim()
                              .toLowerCase();
                            const milestoneFilteredCriteria = searchStr
                              ? acceptanceCriteria.filter((c) =>
                                  c.description
                                    .toLowerCase()
                                    .includes(searchStr),
                                )
                              : acceptanceCriteria;

                            if (milestoneFilteredCriteria.length === 0) {
                              return (
                                <p className="px-2 py-1 text-xs font-semibold text-slate-500">
                                  {acceptanceCriteria.length === 0
                                    ? "Chưa tải dược danh sách tiêu chí."
                                    : "Không tìm thấy tiêu chí phù hợp."}
                                </p>
                              );
                            }

                            return (
                              <div className="grid gap-1.5">
                                {milestoneFilteredCriteria.map((criteria) => (
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
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── STEP 4: Submit ── */}
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div>
                <p className="text-sm font-bold text-slate-700">
                  Bước 4 — Lưu nháp
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Yêu cầu sẽ dược lưu ở trạng thái "Nháp". Bạn có thể diều chỉnh
                  lại hoặc dăng bài lên ngay.
                </p>
              </div>
              <Button type="submit" loading={loading}>
                <Save className="h-4 w-4" />
                Lưu nháp
              </Button>
            </div>
            {publishError && (
              <div className="mt-2">
                <Notice tone="danger" title={publishError} />
              </div>
            )}
          </form>
        </Card>

        {savedJob && (
          <Card className="p-5">
            <SectionHeading
              title="Quản lý yêu cầu nháp"
              description={
                createMessage || "Yêu cầu đã được lưu ở trạng thái nháp."
              }
            />
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <JobDomainBadge
                    label={jobDomainLabel(selectedDomainIdList, domains)}
                    className="mb-2"
                  />
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
                  <span className="text-slate-500">Thời lượng</span>
                  <span className="break-words text-right font-extrabold text-ink">
                    {savedJob.plannedDurationValue
                      ? `${savedJob.plannedDurationValue} ${savedJob.plannedDurationUnit || "Week"}`
                      : "Chưa xác dịnh"}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Lĩnh vực</span>
                  <span className="break-words text-right font-extrabold text-ink">
                    {selectedDomainIdList
                      .map((id) => resolveDomainName(id, domains))
                      .join(", ")}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Công nghệ</span>
                  <span className="break-words text-right font-extrabold text-ink">
                    {technologies
                      .filter((technology) =>
                        selectedTechnologyIds.includes(technology.technologyId),
                      )
                      .map((technology) => technology.technologyName)
                      .join(", ") || "Chưa chọn"}
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
                  durationValue: Number(milestone.durationValue || 0),
                  criteriaIds: milestone.criteriaIds,
                }))}
            />
            <div className="mt-4 grid gap-2">
              {publishError && <Notice tone="danger" title={publishError} />}
              <LinkButton
                to={`/app/jobs/${savedJob.jobId}/manage`}
                variant="secondary"
              >
                Quản lý bài dăng
              </LinkButton>
              {savedJob.status !== "OPEN" && (
                <Button
                  type="button"
                  variant="success"
                  onClick={publishSavedJob}
                >
                  Đăng bài
                </Button>
              )}
              <LinkButton to="/app/jobs" variant="ghost">
                Xem tất cả yêu cầu nháp
              </LinkButton>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

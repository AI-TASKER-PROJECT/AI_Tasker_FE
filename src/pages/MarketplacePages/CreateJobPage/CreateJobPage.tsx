import {
  CheckCircle2,
  Eye,
  FileCheck2,
  HelpCircle,
  Save,
  Sparkles,
  Target,
  Unlock,
  Plus,
  Minus,
  XCircle,
  Trash2,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Undo2,
} from "lucide-react";
import { FormEvent, useEffect, useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import {
  catalogApi,
  getApiErrorMessage,
  marketplaceApi,
  sowApi,
  userQuotaApi,
  type GeneratedSow,
  type GeneratedSowMilestone,
  type BudgetAssessment,
  type Domain,
  type Skill,
  type Technology,
} from "../../../services";
import { cn, formatCurrency } from "../../../lib/utils";
import type { Job, UserQuota } from "../../../types";
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  LinkButton,
  Modal,
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
import {
  applyManualMilestoneBudgetEdit,
  applyReallocationByMilestoneIndex,
  buildReallocateBudgetRequest,
  createInitialBudgetConfirmationState,
  isBelowAiEstimate,
  resolveAuthoritativeBudget,
  shouldLockBusinessBudgetInput,
  shouldPreserveMilestoneBudgetAllocation,
  shouldShowAiBudgetAssessment,
  validateBudgetIntegrity,
  type SowBudgetConfirmationState,
} from "./sowBudget";

// ─── Step Indicator ───────────────────────────────────────────────────────────
type WizardStep = 1 | 2 | 3 | 4;

// Chức năng 1: Hiển thị tiến trình các bước tạo Job.
function StepIndicator({ current }: { current: WizardStep }) {
  const steps: { id: WizardStep; label: string; icon: ReactNode }[] = [
    {
      id: 1,
      label: "Thông tin dự án",
      icon: <FileCheck2 className="h-4 w-4" />,
    },
    {
      id: 2,
      label: "AI tạo mô tả phạm vi dự án",
      icon: <Sparkles className="h-4 w-4" />,
    },
    {
      id: 3,
      label: "Kiểm tra & điều chỉnh",
      icon: <Eye className="h-4 w-4" />,
    },
    { id: 4, label: "Lưu", icon: <Save className="h-4 w-4" /> },
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
// Chức năng 2: Hiển thị bản xem trước SOW do AI hoặc form tạo ra.
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
// Chức năng 3: Hiển thị và điều phối toàn bộ luồng tạo hoặc chỉnh sửa Job.
function BudgetAssessmentCard({
  assessment,
  confirmation,
  loading,
  onKeepCurrent,
  onEditBudget,
  onCustomBudgetChange,
  onConfirmCustomBudget,
}: {
  assessment: BudgetAssessment;
  confirmation: SowBudgetConfirmationState;
  loading: boolean;
  onKeepCurrent: () => void;
  onEditBudget: () => void;
  onCustomBudgetChange: (value: string) => void;
  onConfirmCustomBudget: () => void;
}) {
  const statusPresentation = {
    TOO_LOW: {
      badge: "rose" as const,
      card: "border-rose-200 bg-rose-50/60",
      label: "Nên điều chỉnh",
      title: "Ngân sách hiện tại thấp hơn mức tham khảo",
    },
    LOW: {
      badge: "amber" as const,
      card: "border-amber-200 bg-amber-50/60",
      label: "Cần cân nhắc",
      title: "Ngân sách hiện tại hơi thấp",
    },
    SUITABLE: {
      badge: "mint" as const,
      card: "border-mint-200 bg-mint-50/50",
      label: "Phù hợp",
      title: "Ngân sách hiện tại phù hợp",
    },
    HIGH: {
      badge: "slate" as const,
      card: "border-slate-200 bg-slate-50",
      label: "Cao hơn tham khảo",
      title: "Ngân sách hiện tại cao hơn mức tham khảo",
    },
  }[assessment.status];
  const customBudget = Number(confirmation.customBudget);

  return (
    <section
      aria-label="Thông tin tham khảo ngân sách"
      className={cn("rounded-2xl border p-5", statusPresentation.card)}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-extrabold text-slate-800">
            {statusPresentation.title}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Bạn là người quyết định ngân sách cuối cùng. Mức tham khảo chỉ giúp
            bạn cân nhắc trước khi đăng dự án.
          </p>
        </div>
        <Badge tone={statusPresentation.badge}>
          {statusPresentation.label}
        </Badge>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-white/80 bg-white/80 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Ngân sách hiện tại
          </p>
          <p className="mt-1 text-sm font-extrabold text-slate-900">
            {formatCurrency(assessment.businessBudget)}
          </p>
        </div>
        <div className="rounded-xl border border-white/80 bg-white/80 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Khoảng ngân sách AI đề xuất
          </p>
          <p className="mt-1 text-sm font-extrabold text-slate-900">
            {formatCurrency(assessment.estimatedMin)} –{" "}
            {formatCurrency(assessment.estimatedMax)}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-xs leading-5 text-slate-700">
        {assessment.status === "TOO_LOW" &&
          Number(assessment.gapToMinimum) > 0 && (
            <p className="font-bold text-rose-700">
              Ngân sách hiện tại thấp hơn mức tham khảo tối thiểu:{" "}
              {formatCurrency(assessment.estimatedMin)}.
            </p>
          )}
        <p>
          Mức tham khảo được ước tính từ phạm vi công việc, kỹ năng yêu cầu và
          thời gian thực hiện. Bạn vẫn có thể tiếp tục với ngân sách hiện tại
          nếu phù hợp với kế hoạch.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          variant={
            confirmation.selection === "ORIGINAL" ? "success" : "secondary"
          }
          onClick={onKeepCurrent}
        >
          {confirmation.selection === "ORIGINAL"
            ? "Đã chọn ngân sách hiện tại"
            : "Tiếp tục với ngân sách này"}
        </Button>
        <Button
          type="button"
          variant={
            confirmation.selection === "CUSTOM" ? "primary" : "secondary"
          }
          onClick={onEditBudget}
        >
          Điều chỉnh ngân sách
        </Button>
      </div>

      {confirmation.selection === "CUSTOM" && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
          <Field label="Ngân sách mới (VND)">
            <Input
              aria-label="Ngân sách mới"
              type="text"
              inputMode="numeric"
              placeholder="Ví dụ: 100.000.000"
              value={
                confirmation.customBudget
                  ? new Intl.NumberFormat("vi-VN").format(customBudget)
                  : ""
              }
              onChange={(event) =>
                onCustomBudgetChange(event.target.value.replace(/\D/g, ""))
              }
            />
          </Field>
          {isBelowAiEstimate(customBudget, assessment) && customBudget > 0 && (
            <Notice
              className="mt-3"
              tone="warning"
              title="Mức này vẫn thấp hơn khoảng tham khảo. Bạn vẫn có thể sử dụng nếu phù hợp với kế hoạch."
            />
          )}
          {confirmation.error && (
            <Notice className="mt-3" tone="danger" title={confirmation.error} />
          )}
          {confirmation.allocation && !confirmation.error && (
            <Notice
              className="mt-3"
              tone="success"
              title="Đã cập nhật ngân sách cho các mốc."
            />
          )}
          <Button
            className="mt-3"
            type="button"
            loading={loading}
            onClick={onConfirmCustomBudget}
          >
            {confirmation.error ? "Thử cập nhật lại" : "Xác nhận ngân sách mới"}
          </Button>
        </div>
      )}
    </section>
  );
}

export function CreateJobPage() {
  const { jobId } = useParams();
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
      acceptanceCriteria: [""],
    },
    {
      milestoneName: "",
      description: "",
      fundsAllocated: "",
      orderIndex: "2",
      durationValue: "",
      acceptanceCriteria: [""],
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [budgetAllocationLoading, setBudgetAllocationLoading] = useState(false);
  const [budgetAssessment, setBudgetAssessment] =
    useState<BudgetAssessment | null>(null);
  const [budgetConfirmation, setBudgetConfirmation] =
    useState<SowBudgetConfirmationState>(createInitialBudgetConfirmationState);
  const [sowGeneratedLocked, setSowGeneratedLocked] = useState(false);
  const [isEditingAiMilestones, setIsEditingAiMilestones] = useState(false);
  const [generatedSow, setGeneratedSow] = useState<GeneratedSow | null>(null);
  const [savedJob, setSavedJob] = useState<Job | null>(null);
  const [publishSuccessOpen, setPublishSuccessOpen] = useState(false);
  const [createMessage, setCreateMessage] = useState<string | string[]>("");
  const [createMessageTone, setCreateMessageTone] = useState<
    "info" | "success" | "warning" | "danger"
  >("info");
  const [aiMessage, setAiMessage] = useState<string>("");
  const [aiMessageTone, setAiMessageTone] = useState<
    "info" | "success" | "warning" | "danger"
  >("info");
  const [milestoneEditMessage, setMilestoneEditMessage] = useState("");
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [technologies, setTechnologies] = useState<Technology[]>([]);
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
  const [aiAdditionalAnswers, setAiAdditionalAnswers] = useState<string[]>([]);
  const [showAiReplyBox, setShowAiReplyBox] = useState(false);

  const [isDeletingMilestones, setIsDeletingMilestones] = useState(false);
  const [isReorderingMilestones, setIsReorderingMilestones] = useState(false);
  const [milestonesHistory, setMilestonesHistory] = useState<
    MilestoneDraft[][]
  >([]);

  const [publishError, setPublishError] = useState("");
  const budgetAssessmentVisible = budgetAssessment
    ? shouldShowAiBudgetAssessment(budgetAssessment)
    : false;
  const businessBudgetInputLocked = shouldLockBusinessBudgetInput(
    budgetAssessment,
    sowGeneratedLocked,
  );

  // ── Step state (derives from form progress) ───────────────────────────────
  const wizardStep: WizardStep = savedJob ? 4 : generatedSow ? 3 : 1;

  //cmt1. Tải dữ liệu danh mục cần cho form tạo Job; nếu đang edit thì nạp lại Job, milestone, domain, skill và technology đã lưu.
  useEffect(() => {
    let isActive = true;
    const handleLoadError = (error: unknown) => {
      if (!isActive) return;
      setCreateMessage(
        `Không thể tải dữ liệu tạo job: ${getApiErrorMessage(error)}`,
      );
      setCreateMessageTone("danger");
    };

    Promise.all([
      catalogApi.listDomains(true),
      catalogApi.listSkills(true),
      catalogApi.listTechnologies(true),
      userQuotaApi.getCurrent().catch(() => null),
    ])
      .then(([domainItems, skillItems, technologyItems, quotaItem]) => {
        if (!isActive) return;
        setDomains(domainItems);
        setSkills(skillItems);
        setTechnologies(technologyItems);
        setQuota(quotaItem);

        if (jobId) {
          const id = Number(jobId);
          if (!Number.isSafeInteger(id) || id <= 0) {
            setCreateMessage("Mã job không hợp lệ.");
            setCreateMessageTone("danger");
            return;
          }
          marketplaceApi
            .getJob(id)
            .then((job) => {
              if (!isActive) return;
              setSavedJob(job);
              setForm((prev) => ({
                ...prev,
                title: job.title || "",
                rawRequirements: job.rawRequirements || "",
                structuredSow: job.structuredSow || "",
                budgetAmount: job.budget ? String(job.budget) : "",
                plannedDurationValue: job.plannedDurationValue
                  ? String(job.plannedDurationValue)
                  : "",
              }));
            })
            .catch(handleLoadError);

          import("../../../services")
            .then((mod) => {
              mod.contractApi
                .listJobMilestones(id)
                .then((ms) => {
                  if (!isActive) return;
                  if (ms.length > 0) {
                    setMilestones(
                      ms.map((m) => ({
                        milestoneName: m.milestoneName,
                        description: m.description || "",
                        fundsAllocated: m.fundsAllocated
                          ? String(m.fundsAllocated)
                          : "",
                        orderIndex: m.orderIndex ? String(m.orderIndex) : "1",
                        durationValue: m.durationValue
                          ? String(m.durationValue)
                          : m.duration
                            ? String(m.duration)
                            : "",
                        acceptanceCriteria:
                          m.acceptanceCriteria &&
                          m.acceptanceCriteria.length > 0
                            ? m.acceptanceCriteria
                            : m.criteria?.map(
                                (criteria) => criteria.description,
                              ) || [""],
                      })),
                    );
                  }
                })
                .catch(handleLoadError);
              mod.catalogApi
                .listJobDomains(id)
                .then((jds) => {
                  if (!isActive) return;
                  if (jds.length > 0) {
                    setSelectedDomainId(jds[0].id.domainId);
                  }
                })
                .catch(handleLoadError);
              mod.catalogApi
                .listJobSkills(id)
                .then((jss) => {
                  if (!isActive) return;
                  setSkillAssignments(
                    jss.map((js) => ({
                      skillId: js.id.skillId,
                      isMandatory: js.isMandatory,
                    })),
                  );
                })
                .catch(handleLoadError);
              mod.catalogApi
                .listJobTechnologies(id)
                .then((jts) => {
                  if (!isActive) return;
                  setSelectedTechnologyIds(jts.map((jt) => jt.id.technologyId));
                })
                .catch(handleLoadError);
            })
            .catch(handleLoadError);
        }
      })
      .catch(handleLoadError);

    return () => {
      isActive = false;
    };
  }, [jobId]);

  const selectedDomainIdList =
    selectedDomainId !== null ? [selectedDomainId] : [];

  //cmt2. Chuyển milestone do AI trả về sang cấu trúc draft mà form tạo Job đang dùng.
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
    businessBudget: milestone.budget,
    recommendedBudget: milestone.recommendedBudget,
    orderIndex: String(index + 1),
    durationValue:
      milestone.duration !== undefined && milestone.duration !== null
        ? String(milestone.duration)
        : "",
    acceptanceCriteria:
      milestone.acceptanceCriteria && milestone.acceptanceCriteria.length > 0
        ? milestone.acceptanceCriteria
        : milestones[index]?.acceptanceCriteria || [""],
  });

  // ── Build AI payload — includes technology names ──────────────────────────
  //cmt3. Tạo payload gửi cho AI sinh SoW từ thông tin Job, domain, skill, technology và các câu trả lời bổ sung.
  // Chức năng 4: Chuẩn hóa dữ liệu form thành payload gửi AI tạo SOW.
  const restoreBusinessBudgetAllocation = (assessment: BudgetAssessment) => {
    setForm((value) => ({
      ...value,
      budgetAmount: String(assessment.businessBudget),
    }));
    setMilestones((items) =>
      items.map((item) => ({
        ...item,
        fundsAllocated:
          item.businessBudget !== undefined
            ? String(item.businessBudget)
            : item.fundsAllocated,
      })),
    );
  };

  const clearBudgetConfirmation = () => {
    setBudgetConfirmation(createInitialBudgetConfirmationState());
  };

  const invalidateBudgetConfirmation = () => {
    if (!budgetAssessment) return;
    if (shouldPreserveMilestoneBudgetAllocation(budgetConfirmation)) {
      setBudgetConfirmation((current) => ({
        ...current,
        error: "",
      }));
      return;
    }
    clearBudgetConfirmation();
    restoreBusinessBudgetAllocation(budgetAssessment);
  };

  const keepCurrentBusinessBudget = () => {
    if (!budgetAssessment) return;
    restoreBusinessBudgetAllocation(budgetAssessment);
    setBudgetConfirmation({
      selection: "ORIGINAL",
      customBudget: "",
      allocation: null,
      error: "",
    });
  };

  const editBusinessBudget = () => {
    if (!budgetAssessment) return;
    restoreBusinessBudgetAllocation(budgetAssessment);
    setBudgetConfirmation({
      selection: "CUSTOM",
      customBudget: "",
      allocation: null,
      error: "",
    });
  };

  const updateCustomBudget = (value: string) => {
    if (budgetAssessment) {
      restoreBusinessBudgetAllocation(budgetAssessment);
    }
    setBudgetConfirmation((current) => ({
      ...current,
      selection: "CUSTOM",
      customBudget: value,
      allocation: null,
      error: "",
    }));
  };

  const confirmCustomBudget = async () => {
    if (!budgetAssessment) return;
    const selectedBudget = Number(budgetConfirmation.customBudget);
    try {
      if (milestones.length === 0) {
        throw new Error("Job phải có ít nhất một milestone.");
      }
      const request = buildReallocateBudgetRequest(selectedBudget, milestones);
      restoreBusinessBudgetAllocation(budgetAssessment);
      setBudgetAllocationLoading(true);
      setBudgetConfirmation((current) => ({
        ...current,
        allocation: null,
        error: "",
      }));
      const response = await sowApi.reallocateBudget(request);
      if (response.selectedBudget !== selectedBudget) {
        throw new Error(
          "Ngân sách được cập nhật không khớp với số tiền bạn đã xác nhận.",
        );
      }
      const reallocatedMilestones = applyReallocationByMilestoneIndex(
        milestones,
        response,
      );
      setMilestones(reallocatedMilestones);
      setForm((value) => ({
        ...value,
        budgetAmount: String(response.selectedBudget),
      }));
      setBudgetConfirmation((current) => ({
        ...current,
        allocation: response,
        error: "",
      }));
    } catch (error) {
      setBudgetConfirmation((current) => ({
        ...current,
        allocation: null,
        error: getApiErrorMessage(error),
      }));
    } finally {
      setBudgetAllocationLoading(false);
    }
  };

  const buildAiPayload = () => {
    const technologyNames = technologies
      .filter((t) => selectedTechnologyIds.includes(t.technologyId))
      .map((t) => t.technologyName);

    const languageInstruction =
      "Vui lòng xuất nội dung SOW và toàn bộ các mốc (Milestones) bằng tiếng Việt. Định dạng tất cả các số tiền tệ với dấu chấm phân cách hàng nghìn (ví dụ: 15.000 thay vì 15000).";

    const extraInfoStr = aiAdditionalAnswers
      .filter((a) => a.trim())
      .map((a, i) => `${i + 1}. ${a.trim()}`)
      .join("\n");
    const rawRequirementWithExtra = extraInfoStr
      ? `${form.rawRequirements}\n\nBổ sung thêm:\n${extraInfoStr}\n\n${languageInstruction}`
      : `${form.rawRequirements}\n\n${languageInstruction}`;

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
      clarificationAlreadyAsked: aiQuestions.length > 0,
    };
  };

  //cmt4. Gọi AI tạo SoW và milestone, sau đó cập nhật lại form để người dùng kiểm tra trước khi lưu Job.
  // Chức năng 5: Gửi yêu cầu AI tạo SOW và milestone gợi ý cho Job.
  const generateSow = async () => {
    const budget = Number(form.budgetAmount);
    const duration = Number(form.plannedDurationValue);
    if (
      !form.title.trim() ||
      !form.rawRequirements.trim() ||
      selectedDomainId === null ||
      selectedTechnologyIds.length === 0 ||
      skillAssignments.length === 0 ||
      !Number.isFinite(budget) ||
      budget <= 0 ||
      !Number.isFinite(duration) ||
      duration <= 0
    ) {
      setAttemptedSubmit(true);
      setAiMessage(
        "Vui lòng nhập tên dự án, yêu cầu thô, lĩnh vực dự án, công nghệ nền tảng, kỹ năng yêu cầu, ngân sách và thời lượng hợp lệ trước khi dùng AI tạo SoW.",
      );
      setAiMessageTone("warning");
      return;
    }

    const previousBudgetAssessment = budgetAssessment;
    if (previousBudgetAssessment) {
      restoreBusinessBudgetAllocation(previousBudgetAssessment);
    }
    setAiLoading(true);
    setBudgetAssessment(null);
    clearBudgetConfirmation();
    setAiMessage("");
    setMilestoneEditMessage("");
    setIsEditingAiMilestones(false);
    const isClarificationRetry = aiQuestions.length > 0;
    if (!isClarificationRetry) {
      setAiQuestions([]);
    }
    setShowAiReplyBox(false);
    try {
      const response = await sowApi.generate(buildAiPayload());

      const structuredSow = formatGeneratedSow(response.sow);
      setBudgetAssessment(response.budgetAssessment || null);
      setGeneratedSow(response.sow || null);
      setForm((value) => ({
        ...value,
        structuredSow: structuredSow || value.structuredSow,
      }));

      if (response.milestones && response.milestones.length > 0) {
        const newMilestones = response.milestones.map(mapGeneratedMilestone);
        setMilestones(newMilestones);

        const newTotalDuration = newMilestones.reduce(
          (sum, m) => sum + (Number(m.durationValue) || 0),
          0,
        );

        setForm((value) => ({
          ...value,
          budgetAmount: response.budgetAssessment
            ? String(response.budgetAssessment.businessBudget)
            : value.budgetAmount,
          plannedDurationValue:
            newTotalDuration > 0
              ? String(newTotalDuration)
              : value.plannedDurationValue,
        }));
      }

      const hasGeneratedContent = Boolean(
        structuredSow ||
        (response.milestones && response.milestones.length > 0),
      );

      if (response.needMoreInfo) {
        const questions =
          response.questions && response.questions.length > 0
            ? response.questions
            : ["AI cần thêm thông tin để tạo SoW chính xác hơn."];
        setAiQuestions(questions);
        setAiAdditionalAnswers(new Array(questions.length).fill(""));
        setShowAiReplyBox(true);
        setAiMessage(
          "AI đã tạo bản nháp SoW và các mốc. Bạn có thể trả lời thêm các câu hỏi bên dưới để AI tinh chỉnh chính xác hơn.",
        );
        setAiMessageTone("warning");
        setSowGeneratedLocked(hasGeneratedContent);
        setIsEditingAiMilestones(false);
        return;
      }

      setSowGeneratedLocked(hasGeneratedContent);
      setIsEditingAiMilestones(false);
      if (hasGeneratedContent)
        setAiMessage("✓ AI đã tạo SoW và cập nhật các mốc thành công.");
      setAiMessageTone("success");
    } catch (error) {
      setSowGeneratedLocked(false);
      setGeneratedSow(null);
      setBudgetAssessment(previousBudgetAssessment);
      clearBudgetConfirmation();
      setAiMessage(`Lỗi: ${getApiErrorMessage(error)}`);
      setAiMessageTone("danger");
    } finally {
      setAiLoading(false);
    }
  };

  // ── Unlock form to allow re-editing after AI generate ─────────────────────
  //cmt5 Mở khóa form sau khi AI đã sinh nội dung để người dùng chỉnh lại yêu cầu, SoW hoặc milestone.
  const unlockForm = () => {
    invalidateBudgetConfirmation();
    setSowGeneratedLocked(false);
    setIsEditingAiMilestones(false);
    setGeneratedSow(null);
    setAiMessage("");
    setMilestoneEditMessage("");
    setAiQuestions([]);
    setShowAiReplyBox(false);
    setAiAdditionalAnswers([]);
  };

  //cmt6 Cho phép chỉnh sửa riêng phần milestone đã được AI sinh ra.
  const startMilestoneEdit = () => {
    invalidateBudgetConfirmation();
    setSowGeneratedLocked(false);
    setIsEditingAiMilestones(true);
    setMilestoneEditMessage("");
  };

  //cmt7 Khóa lại milestone sau khi người dùng xác nhận chỉnh sửa xong.
  const confirmMilestoneEdit = () => {
    setSowGeneratedLocked(true);
    setIsEditingAiMilestones(false);
    setIsDeletingMilestones(false);
    setIsReorderingMilestones(false);
    setMilestoneEditMessage("Đã chỉnh sửa thành công Mốc của dự án.");
  };

  //cmt8 Lưu lịch sử milestone để hỗ trợ hoàn tác thao tác thêm, xóa hoặc sắp xếp.
  const saveMilestoneHistory = (currentMilestones: MilestoneDraft[]) => {
    setMilestonesHistory((prev) => [...prev, currentMilestones].slice(-10));
  };

  //cmt9 Hoàn tác thay đổi milestone gần nhất và đồng bộ lại tổng ngân sách/thời lượng của Job.
  const undoMilestoneAction = () => {
    if (milestonesHistory.length > 0) {
      invalidateBudgetConfirmation();
      const preserveAllocation =
        shouldPreserveMilestoneBudgetAllocation(budgetConfirmation);
      const previousState = milestonesHistory[milestonesHistory.length - 1].map(
        (item) => ({
          ...item,
          fundsAllocated:
            budgetAssessment &&
            !preserveAllocation &&
            item.businessBudget !== undefined
              ? String(item.businessBudget)
              : item.fundsAllocated,
        }),
      );
      setMilestones(previousState);
      setMilestonesHistory((prev) => prev.slice(0, -1));

      const newTotalDuration = previousState.reduce(
        (acc, m) => acc + Number(m.durationValue || 0),
        0,
      );
      const newTotalBudget = previousState.reduce(
        (acc, m) => acc + Number(m.fundsAllocated || 0),
        0,
      );
      setForm((prev) => ({
        ...prev,
        budgetAmount: budgetAssessment && !preserveAllocation
          ? String(budgetAssessment.businessBudget)
          : String(newTotalBudget),
        plannedDurationValue: String(newTotalDuration),
      }));
      if (budgetConfirmation.selection === "MANUAL") {
        setBudgetConfirmation((current) => ({
          ...current,
          customBudget: String(newTotalBudget),
          error: "",
        }));
      }
    }
  };

  //cmt10 Thêm một milestone rỗng vào bản nháp Job.
  const addMilestone = () => {
    invalidateBudgetConfirmation();
    saveMilestoneHistory(milestones);
    setMilestones((prev) => [
      ...prev,
      {
        milestoneName: "",
        description: "",
        fundsAllocated: "",
        orderIndex: String(prev.length + 1),
        durationValue: "",
        acceptanceCriteria: [""],
      },
    ]);
  };

  //cmt11 Xóa milestone khỏi bản nháp và đánh lại thứ tự cùng tổng ngân sách/thời lượng.
  const removeSpecificMilestone = async (indexToRemove: number) => {
    const newItems = milestones
      .filter((_, i) => i !== indexToRemove)
      .map((item, i) => ({
        ...item,
        orderIndex: String(i + 1),
      }));

    const newTotalDuration = newItems.reduce(
      (acc, m) => acc + Number(m.durationValue || 0),
      0,
    );

    if (
      budgetConfirmation.selection === "CUSTOM" &&
      budgetConfirmation.allocation
    ) {
      const selectedBudget = budgetConfirmation.allocation.selectedBudget;
      try {
        setBudgetAllocationLoading(true);
        const request = buildReallocateBudgetRequest(selectedBudget, newItems);
        const response = await sowApi.reallocateBudget(request);
        if (response.selectedBudget !== selectedBudget) {
          throw new Error(
            "Ngân sách phân bổ lại không khớp với ngân sách mới đã xác nhận.",
          );
        }
        const reallocatedMilestones = applyReallocationByMilestoneIndex(
          newItems,
          response,
        );
        saveMilestoneHistory(milestones);
        setMilestones(reallocatedMilestones);
        setForm((prev) => ({
          ...prev,
          budgetAmount: String(response.selectedBudget),
          plannedDurationValue: String(newTotalDuration),
        }));
        setSavedJob((prev) =>
          prev
            ? {
                ...prev,
                budget: response.selectedBudget,
                plannedDurationValue: newTotalDuration,
              }
            : prev,
        );
        setBudgetConfirmation((current) => ({
          ...current,
          selection: "CUSTOM",
          customBudget: String(response.selectedBudget),
          allocation: response,
          error: "",
        }));
      } catch (error) {
        setBudgetConfirmation((current) => ({
          ...current,
          error: getApiErrorMessage(error),
        }));
        return;
      } finally {
        setBudgetAllocationLoading(false);
      }
    } else {
      saveMilestoneHistory(milestones);
      setMilestones(newItems);
      const newTotalBudget = newItems.reduce(
        (acc, m) => acc + Number(m.fundsAllocated || 0),
        0,
      );
      setForm((prev) => ({
        ...prev,
        budgetAmount: String(newTotalBudget),
        plannedDurationValue: String(newTotalDuration),
      }));
      setSavedJob((prev) =>
        prev
          ? {
              ...prev,
              budget: newTotalBudget,
              plannedDurationValue: newTotalDuration,
            }
          : prev,
      );
      if (budgetAssessment) {
        setBudgetConfirmation({
          selection: "MANUAL",
          customBudget: String(newTotalBudget),
          allocation: null,
          error: "",
        });
      }
    }

    if (newItems.length <= 1) {
      setIsDeletingMilestones(false);
      setIsReorderingMilestones(false);
    }
  };

  //cmt12 Di chuyển milestone lên/xuống để thay đổi thứ tự thực hiện trong Job.
  const moveMilestone = (index: number, direction: "up" | "down") => {
    invalidateBudgetConfirmation();
    saveMilestoneHistory(milestones);
    const preserveAllocation =
      shouldPreserveMilestoneBudgetAllocation(budgetConfirmation);
    const newItems = milestones.map((item) => ({
      ...item,
      fundsAllocated:
        budgetAssessment &&
        !preserveAllocation &&
        item.businessBudget !== undefined
          ? String(item.businessBudget)
          : item.fundsAllocated,
    }));
    if (direction === "up" && index > 0) {
      const temp = newItems[index - 1];
      newItems[index - 1] = newItems[index];
      newItems[index] = temp;
    } else if (direction === "down" && index < newItems.length - 1) {
      const temp = newItems[index + 1];
      newItems[index + 1] = newItems[index];
      newItems[index] = temp;
    } else {
      return;
    }

    const reordered = newItems.map((item, i) => ({
      ...item,
      orderIndex: String(i + 1),
    }));
    setMilestones(reordered);
  };

  //cmt13 Chọn hoặc bỏ chọn skill yêu cầu cho Job.
  const toggleSkill = (skillId: number) => {
    invalidateBudgetConfirmation();
    setSkillAssignments((items) =>
      items.some((item) => item.skillId === skillId)
        ? items.filter((item) => item.skillId !== skillId)
        : [...items, { skillId, isMandatory: true }],
    );
  };

  //cmt14 Chọn hoặc bỏ chọn technology nền tảng cho Job.
  const toggleTechnology = (technologyId: number) => {
    invalidateBudgetConfirmation();
    setSelectedTechnologyIds((items) =>
      items.includes(technologyId)
        ? items.filter((id) => id !== technologyId)
        : [...items, technologyId],
    );
  };

  //cmt15 Cập nhật thuộc tính của skill đã chọn, ví dụ đánh dấu bắt buộc hay không.
  const updateSkillAssignment = (
    skillId: number,
    patch: Partial<SkillAssignment>,
  ) => {
    invalidateBudgetConfirmation();
    setSkillAssignments((items) =>
      items.map((item) =>
        item.skillId === skillId ? { ...item, ...patch } : item,
      ),
    );
  };

  //cmt16 Cập nhật ngân sách tổng của Job trong form và bản Job đã lưu nếu có.
  const updateFormBudgetAmount = (amount: string) => {
    const numericAmount = Number(amount);
    setForm((value) => ({
      ...value,
      budgetAmount: amount,
    }));
    setSavedJob((prev) => (prev ? { ...prev, budget: numericAmount } : prev));
    if (budgetAssessment && !shouldShowAiBudgetAssessment(budgetAssessment)) {
      setBudgetConfirmation({
        selection: "MANUAL",
        customBudget: amount,
        allocation: null,
        error: "",
      });
    }
  };

  //cmt17 Cập nhật một milestone theo patch và đồng bộ tổng thời lượng Job khi thời lượng milestone đổi.
  const updateMilestone = (index: number, patch: Partial<MilestoneDraft>) => {
    invalidateBudgetConfirmation();
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

  //cmt18 Cập nhật ngân sách milestone và tự tính lại ngân sách tổng của Job.
  const updateMilestoneBudgetAmount = (index: number, amount: string) => {
    setMilestones((items) => {
      const { milestones: newItems, totalBudget: newTotal } =
        applyManualMilestoneBudgetEdit(items, index, amount);
      setForm((prev) => ({
        ...prev,
        budgetAmount: String(newTotal),
      }));
      setSavedJob((prev) => (prev ? { ...prev, budget: newTotal } : prev));
      if (budgetAssessment) {
        setBudgetConfirmation({
          selection: "MANUAL",
          customBudget: String(newTotal),
          allocation: null,
          error: "",
        });
      }
      return newItems;
    });
  };

  //cmt19 Cập nhật thời lượng milestone và tự tính lại thời lượng tổng của Job.
  const updateMilestoneDurationValue = (index: number, newDuration: string) => {
    invalidateBudgetConfirmation();
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

  //cmt20 Cập nhật một tiêu chí nghiệm thu của milestone trong bản nháp Job.
  const updateMilestoneCriterion = (
    milestoneIndex: number,
    criterionIndex: number,
    value: string,
  ) => {
    invalidateBudgetConfirmation();
    setMilestones((items) =>
      items.map((item, itemIndex) =>
        itemIndex === milestoneIndex
          ? {
              ...item,
              acceptanceCriteria: item.acceptanceCriteria.map(
                (criterion, currentIndex) =>
                  currentIndex === criterionIndex ? value : criterion,
              ),
            }
          : item,
      ),
    );
  };

  //cmt21 Thêm tiêu chí nghiệm thu mới cho milestone.
  const addMilestoneCriterion = (milestoneIndex: number) => {
    invalidateBudgetConfirmation();
    setMilestones((items) =>
      items.map((item, itemIndex) =>
        itemIndex === milestoneIndex
          ? {
              ...item,
              acceptanceCriteria: [...item.acceptanceCriteria, ""],
            }
          : item,
      ),
    );
  };

  //cmt22 Xóa tiêu chí nghiệm thu khỏi milestone, luôn giữ lại ít nhất một dòng nhập.
  const removeMilestoneCriterion = (
    milestoneIndex: number,
    criterionIndex: number,
  ) => {
    invalidateBudgetConfirmation();
    setMilestones((items) =>
      items.map((item, itemIndex) => {
        if (itemIndex !== milestoneIndex) return item;
        const nextCriteria = item.acceptanceCriteria.filter(
          (_, currentIndex) => currentIndex !== criterionIndex,
        );
        return {
          ...item,
          acceptanceCriteria: nextCriteria.length > 0 ? nextCriteria : [""],
        };
      }),
    );
  };

  //cmt23 Chuẩn hóa SoW từ AI hoặc nội dung nhập tay thành payload backend nhận khi lưu Job.
  // Chức năng 6: Chuẩn hóa dữ liệu SOW để lưu kèm Job.
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

  //cmt24 Chuẩn hóa danh sách milestone từ form thành payload tạo/cập nhật Job.
  // Chức năng 7: Chuẩn hóa danh sách milestone để gửi backend khi lưu Job.
  const buildMilestonePayload = () =>
    milestones
      .filter((milestone) => milestone.milestoneName.trim())
      .map((milestone, index) => ({
        milestoneName: milestone.milestoneName,
        description: milestone.description || "",
        fundsAllocated: Number(milestone.fundsAllocated || 0),
        orderIndex: Number(milestone.orderIndex || index + 1),
        duration: Number(milestone.durationValue || 0),
        status: "PENDING",
        rejectCount: 0,
        durationValue: Number(milestone.durationValue || 0),
        durationUnit: "WEEK",
        acceptanceCriteria: milestone.acceptanceCriteria
          .map((criterion) => criterion.trim())
          .filter(Boolean),
      }));

  //cmt25 Lưu Job ở trạng thái nháp: validate form, tạo/cập nhật Job, rồi gắn domain và skill cho Job.
  // Chức năng 8: Validate form và tạo hoặc cập nhật Job nháp.
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setCreateMessage("");
    setPublishError("");
    try {
      const projectTimelineWeeks = Number(form.plannedDurationValue || 0);
      const totalMilestoneWeeks = milestones
        .filter((milestone) => milestone.milestoneName.trim())
        .reduce(
          (total, milestone) => total + Number(milestone.durationValue || 0),
          0,
        );

      const hasEmptyMilestone =
        milestones.length === 0 ||
        milestones.some(
          (m) =>
            !m.milestoneName.trim() ||
            !Number(m.durationValue) ||
            !Number(m.fundsAllocated) ||
            !m.acceptanceCriteria.some((criterion) => criterion.trim()),
        );

      if (
        selectedDomainId === null ||
        selectedTechnologyIds.length === 0 ||
        skillAssignments.length === 0 ||
        !form.title.trim() ||
        !form.rawRequirements.trim() ||
        !form.structuredSow.trim() ||
        hasEmptyMilestone ||
        !Number.isFinite(projectTimelineWeeks) ||
        projectTimelineWeeks < totalMilestoneWeeks
      ) {
        setLoading(false);
        return;
      }
      const milestonePayload = buildMilestonePayload();
      const authoritativeBudget = resolveAuthoritativeBudget(
        budgetAssessment,
        budgetConfirmation,
        Number(form.budgetAmount),
      );
      if (authoritativeBudget === null) {
        setCreateMessage(
          "Vui lòng chọn tiếp tục với ngân sách hiện tại hoặc xác nhận ngân sách mới trước khi lưu dự án.",
        );
        setCreateMessageTone("warning");
        return;
      }
      const budgetErrors = validateBudgetIntegrity(
        milestonePayload,
        authoritativeBudget,
      );
      if (budgetErrors.length > 0) {
        setCreateMessage(budgetErrors);
        setCreateMessageTone("danger");
        return;
      }
      const payload = {
        title: form.title,
        rawRequirements: form.rawRequirements,
        structuredSow: form.structuredSow,
        sow: buildSowPayload(),
        milestones: milestonePayload,
        budget: authoritativeBudget,
        plannedDurationValue: Number(form.plannedDurationValue),
        technologyIds: selectedTechnologyIds,
        plannedDurationUnit: "WEEK",
      };

      let job: Job;
      if (savedJob) {
        job = await marketplaceApi.updateDraftJob(savedJob.jobId, payload);
        setCreateMessage("Yêu cầu nháp đã được cập nhật thành công.");
      } else {
        //hàm createJob tạo Job mới ở trạng thái nháp, chưa hiển thị trên marketplace.
        job = await marketplaceApi.createJob(payload);
        setCreateMessage(
          "Dự án nháp đã được tạo. Bạn có thể xem chi tiết hoặc đăng bài ngay bên dưới.",
        );
      }
      setSavedJob(job);
      setCreateMessageTone("success");

      try {
        //hàm replaceJobDomains và replaceJobSkills gắn domain và skill cho Job vừa tạo/cập nhật.
        await catalogApi.replaceJobDomains(job.jobId, selectedDomainIdList);
        await catalogApi.replaceJobSkills(
          job.jobId,
          skillAssignments.map((assignment) => ({
            skillId: assignment.skillId,
            isMandatory: assignment.isMandatory,
          })),
        );
        await catalogApi.replaceJobTechnologies(
          job.jobId,
          selectedTechnologyIds,
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

  //cmt26 Đăng Job đã lưu nháp: kiểm tra quota, cập nhật nội dung mới nhất rồi đổi trạng thái sang OPEN.
  //bấm Đăng bài sẽ gọi API updateDraftJob để cập nhật nội dung mới nhất, sau đó gọi updateJobStatus để đổi trạng thái sang OPEN.
  // Chức năng 9: Publish Job nháp sang trạng thái OPEN để chuyên gia có thể nộp proposal.
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
    if (
      selectedDomainId === null ||
      selectedTechnologyIds.length === 0 ||
      skillAssignments.length === 0 ||
      !form.title.trim() ||
      !form.rawRequirements.trim() ||
      !form.structuredSow.trim()
    ) {
      setPublishError("Không thể đăng bài vì SoW và các mốc chưa được mô tả.");
      return;
    }
    const milestonePayload = buildMilestonePayload();
    const authoritativeBudget = resolveAuthoritativeBudget(
      budgetAssessment,
      budgetConfirmation,
      Number(form.budgetAmount),
    );
    if (authoritativeBudget === null) {
      setPublishError("Vui lòng xác nhận ngân sách trước khi đăng dự án.");
      return;
    }
    const budgetErrors = validateBudgetIntegrity(
      milestonePayload,
      authoritativeBudget,
    );
    if (budgetErrors.length > 0) {
      setPublishError(budgetErrors.join(" "));
      return;
    }

    setLoading(true);
    try {
      await marketplaceApi.updateDraftJob(savedJob.jobId, {
        title: form.title,
        rawRequirements: form.rawRequirements,
        structuredSow: form.structuredSow,
        sow: sowPayload,
        milestones: milestonePayload,
        budget: authoritativeBudget,
        plannedDurationValue: Number(form.plannedDurationValue),
        technologyIds: selectedTechnologyIds,
        plannedDurationUnit: "WEEK",
      });

      //hàm Cập nhật trạng thái Job sang OPEN để hiển thị trên marketplace.
      await catalogApi.replaceJobDomains(savedJob.jobId, selectedDomainIdList);
      await catalogApi.replaceJobSkills(
        savedJob.jobId,
        skillAssignments.map((assignment) => ({
          skillId: assignment.skillId,
          isMandatory: assignment.isMandatory,
        })),
      );
      await catalogApi.replaceJobTechnologies(
        savedJob.jobId,
        selectedTechnologyIds,
      );

      const updated = await marketplaceApi.updateJobStatus(
        savedJob.jobId,
        "OPEN",
      );
      setSavedJob(updated);
      const remainingQuota = quota
        ? Math.max(0, (quota.jobPostQuotaBalance ?? 0) - 1)
        : 0;
      setCreateMessage(
        `Đã đăng bài thành công. Tài khoản bạn còn lại ${remainingQuota} lần đăng bài.`,
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
          description="Nhập thông tin dự án, để AI hỗ trợ tạo Statement of Work và mốc."
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
                description="Điền đầy đủ thông tin để AI có thể hỗ trợ tạo mô tả phạm vi dự án chính xác nhất."
              />

              <Field label="Tên dự án">
                <Input
                  placeholder="Nhập tên dự án..."
                  value={form.title}
                  onChange={(event) => {
                    invalidateBudgetConfirmation();
                    setForm((value) => ({
                      ...value,
                      title: event.target.value,
                    }));
                  }}
                  required
                />
                {attemptedSubmit && !form.title.trim() && (
                  <p className="mt-1 text-xs text-rose-500">
                    Vui lòng nhập tên dự án.
                  </p>
                )}
              </Field>
              <Field label="Yêu cầu dự án">
                <Textarea
                  placeholder="Nhập mô tả yêu cầu dự án..."
                  value={form.rawRequirements}
                  autoResize
                  onChange={(event) => {
                    invalidateBudgetConfirmation();
                    setForm((value) => ({
                      ...value,
                      rawRequirements: event.target.value,
                    }));
                  }}
                  required
                />
                {attemptedSubmit && !form.rawRequirements.trim() && (
                  <p className="mt-1 text-xs text-rose-500">
                    Vui lòng nhập yêu cầu dự án.
                  </p>
                )}
              </Field>

              <div className="grid gap-6">
                <Field label="Lĩnh vực dự án">
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
                              onChange={() => {
                                invalidateBudgetConfirmation();
                                setSelectedDomainId(domain.domainId);
                              }}
                            />
                            <span className="min-w-0 break-words">
                              {domain.domainName}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  {attemptedSubmit && selectedDomainId === null && (
                    <p className="mt-1 text-xs text-rose-500">
                      Vui lòng chọn một lĩnh vực cho dự án.
                    </p>
                  )}
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
                  {attemptedSubmit && selectedTechnologyIds.length === 0 && (
                    <p className="mt-1 text-xs text-rose-500">
                      Vui lòng chọn ít nhất một công nghệ cho job.
                    </p>
                  )}
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
                  {attemptedSubmit && skillAssignments.length === 0 && (
                    <p className="mt-1 text-xs text-rose-500">
                      Vui lòng chọn ít nhất một kỹ năng cho job.
                    </p>
                  )}
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Ngân sách dự kiến(VNĐ)">
                  <Input
                    placeholder="VND"
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
                    disabled={businessBudgetInputLocked}
                    required
                  />
                  {attemptedSubmit && !form.budgetAmount && (
                    <p className="mt-1 text-xs text-rose-500">
                      Vui lòng nhập ngân sách dự án.
                    </p>
                  )}
                </Field>
                <Field label="Thời gian dự kiến">
                  <Input
                    placeholder="Thời gian hoàn thành dự án"
                    type="text"
                    value={form.plannedDurationValue}
                    onChange={(event) =>
                      setForm((value) => ({
                        ...value,
                        plannedDurationValue: event.target.value,
                      }))
                    }
                    disabled={sowGeneratedLocked}
                    required
                  />
                  {attemptedSubmit && !form.plannedDurationValue && (
                    <p className="mt-1 text-xs text-rose-500">
                      Vui lòng nhập thời lượng dự án.
                    </p>
                  )}
                </Field>
                <Field label="Đơn vị">
                  <Input value="TUẦN" readOnly disabled />
                </Field>
              </div>
            </div>

            {/* ── STEP 2: AI Generate ── */}
            {aiMessage && (
              <div className="mb-2">
                <Notice tone={aiMessageTone} title={aiMessage} />
              </div>
            )}
            <div className="rounded-2xl border border-dashed border-brand-200 bg-gradient-to-br from-brand-50/60 to-indigo-50/40 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="flex items-center gap-2 text-sm font-extrabold text-brand-700">
                    <Sparkles className="h-4 w-4" />
                    Bước 2 — Sử dụng AI hỗ trợ tạo bản mô tả phạm vi dự án
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    AI phân tích yêu cầu, gợi ý mốc và đưa khoảng ngân sách tham
                    khảo để bạn tự quyết định.
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {sowGeneratedLocked && !showAiReplyBox && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={unlockForm}
                      disabled={aiLoading}
                      title="Mở khóa để chỉnh sửa lại"
                    >
                      <Unlock className="h-4 w-4" />
                      Chỉnh sửa lại
                    </Button>
                  )}
                  {!showAiReplyBox && (
                    <Button
                      type="button"
                      variant="secondary"
                      loading={aiLoading}
                      onClick={generateSow}
                    >
                      <Sparkles className="h-4 w-4" />
                      {sowGeneratedLocked
                        ? "Tạo lại mô tả"
                        : "Tạo mô tả bằng AI"}
                    </Button>
                  )}
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
                        <span className="mt-0.5 shrink-0 font-bold text-amber-600">
                          {i + 1}.
                        </span>
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="grid gap-3">
                    <p className="text-sm font-bold text-slate-700">
                      Bổ sung câu trả lời cho AI
                    </p>
                    {aiQuestions.map((q, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="mt-2 text-sm font-bold text-slate-500">
                          {i + 1}.
                        </span>
                        <Textarea
                          value={aiAdditionalAnswers[i] || ""}
                          placeholder={`Nhập câu trả lời cho câu ${i + 1}...`}
                          autoResize
                          className="flex-1"
                          onChange={(e) => {
                            const newAnswers = [...aiAdditionalAnswers];
                            newAnswers[i] = e.target.value;
                            setAiAdditionalAnswers(newAnswers);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex justify-end gap-2">
                    {sowGeneratedLocked && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={unlockForm}
                        disabled={aiLoading}
                        title="Mở khóa để chỉnh sửa lại"
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
                      size="sm"
                    >
                      <Sparkles className="h-4 w-4" />
                      Gửi và tạo lại SoW
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* ── STEP 3: Review SoW & Milestones ── */}
            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <SectionHeading
                  title="Bước 3 — Kiểm tra & Điều chỉnh mô tả phạm vi dự án"
                  description={
                    sowGeneratedLocked
                      ? 'AI đã tạo SoW. Xem preview bên dưới. Nhấn "Chỉnh sửa lại" nếu cần sửa.'
                      : "Mô tả phạm vi dự án sẽ hiển thị ngay sau khi sử dụng AI hoặc có thể tự điều chỉnh theo mong muốn"
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

              {budgetAssessment && budgetAssessmentVisible && (
                <BudgetAssessmentCard
                  assessment={budgetAssessment}
                  confirmation={budgetConfirmation}
                  loading={budgetAllocationLoading}
                  onKeepCurrent={keepCurrentBusinessBudget}
                  onEditBudget={editBusinessBudget}
                  onCustomBudgetChange={updateCustomBudget}
                  onConfirmCustomBudget={confirmCustomBudget}
                />
              )}

              {/* Structured SoW Text — editable when not locked */}
              <Field
                label={
                  sowGeneratedLocked
                    ? "Mô tả phạm vi dự án(AI hỗ trợ)"
                    : "Mô tả phạm vi dự án"
                }
              >
                <Textarea
                  placeholder="Mô tả chi tiết dự án"
                  value={form.structuredSow}
                  disabled={sowGeneratedLocked}
                  autoResize
                  onChange={(event) => {
                    invalidateBudgetConfirmation();
                    setForm((value) => ({
                      ...value,
                      structuredSow: event.target.value,
                    }));
                  }}
                  className={
                    sowGeneratedLocked
                      ? "bg-slate-50 text-black font-bold disabled:opacity-100 disabled:text-black"
                      : ""
                  }
                />
                {attemptedSubmit && !form.structuredSow.trim() && (
                  <p className="mt-1 text-xs text-rose-500">
                    Vui lòng nhập Structured SoW.
                  </p>
                )}
              </Field>

              {/* Project Milestones */}
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <SectionHeading
                    title="Mốc nghiệm thu của dự án"
                    description="Mốc được đính kèm với dự án, có thể được sử dụng trong hợp đồng sau khi proposal được chấp nhận."
                  />
                  <div className="flex shrink-0 flex-col items-start gap-3 sm:flex-row sm:items-start md:justify-end">
                    {sowGeneratedLocked && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={startMilestoneEdit}
                        title="Mở khóa để chỉnh sửa lại mốc"
                        className="whitespace-nowrap"
                      >
                        <Unlock className="h-4 w-4" />
                        Chỉnh sửa lại
                      </Button>
                    )}
                    {isEditingAiMilestones && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={confirmMilestoneEdit}
                        title="Xác nhận chỉnh sửa mốc"
                        className="whitespace-nowrap"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Xác nhận
                      </Button>
                    )}
                    {/* Budget and Duration indicators */}
                    {(Number(form.budgetAmount) > 0 ||
                      Number(form.plannedDurationValue) > 0) && (
                      <div className="text-left sm:text-right">
                        {Number(form.budgetAmount) > 0 && (
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                              Ngân sách
                            </p>
                            <p className="text-sm font-extrabold text-brand-600">
                              {formatCurrency(Number(form.budgetAmount))}
                            </p>
                          </div>
                        )}
                        {Number(form.plannedDurationValue) > 0 && (
                          <div
                            className={
                              Number(form.budgetAmount) > 0 ? "mt-2" : ""
                            }
                          >
                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                              Thời gian
                            </p>
                            <p className="text-sm font-extrabold text-brand-600">
                              {form.plannedDurationValue} Tuần
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {milestoneEditMessage && (
                  <Notice
                    tone="success"
                    title={milestoneEditMessage}
                    className="mt-4"
                  />
                )}

                <div className="mt-4 hidden grid-cols-[minmax(180px,1fr)_190px_110px_190px_minmax(260px,1.2fr)] gap-3 px-3 text-xs font-extrabold uppercase tracking-wide text-slate-500 xl:grid">
                  <span>Công việc</span>
                  <span>Ngân sách(VNĐ)</span>
                  <span>Mốc</span>
                  <span>Thời gian</span>
                  <span>Tiêu chí nghiệm thu</span>
                </div>
                <div className="mt-3 grid gap-3">
                  {milestones.map((milestone, index) => (
                    <div
                      key={index}
                      className="grid gap-3 rounded-2xl bg-white p-3 xl:grid-cols-[minmax(180px,1fr)_190px_110px_190px_minmax(260px,1.2fr)]"
                    >
                      {(isDeletingMilestones || isReorderingMilestones) &&
                        !sowGeneratedLocked && (
                          <div className="xl:col-span-5 flex justify-end gap-2 p-1 bg-slate-50 rounded-lg">
                            {isReorderingMilestones && (
                              <>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => moveMilestone(index, "up")}
                                  disabled={index === 0}
                                >
                                  <ArrowUp className="h-4 w-4 mr-1" /> Lên
                                </Button>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => moveMilestone(index, "down")}
                                  disabled={index === milestones.length - 1}
                                >
                                  <ArrowDown className="h-4 w-4 mr-1" /> Xuống
                                </Button>
                              </>
                            )}
                            {isDeletingMilestones && (
                              <Button
                                type="button"
                                variant="ghost"
                                loading={budgetAllocationLoading}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 px-2"
                                onClick={() => removeSpecificMilestone(index)}
                              >
                                <Trash2 className="h-4 w-4 mr-1" /> Xóa mốc này
                              </Button>
                            )}
                          </div>
                        )}
                      {/* Milestone name — always editable */}
                      <Input
                        aria-label={`Công việc ${index + 1}`}
                        value={milestone.milestoneName}
                        placeholder="Chi tiết công việc"
                        disabled={sowGeneratedLocked}
                        className={
                          sowGeneratedLocked
                            ? "bg-slate-50 text-black font-bold disabled:opacity-100 disabled:text-black"
                            : ""
                        }
                        onChange={(event) =>
                          updateMilestone(index, {
                            milestoneName: event.target.value,
                          })
                        }
                      />
                      {/* Budget — editable only when not locked */}
                      <Input
                        aria-label={`Ngân sách ${index + 1}`}
                        type="text"
                        value={
                          milestone.fundsAllocated
                            ? new Intl.NumberFormat("vi-VN").format(
                                Number(milestone.fundsAllocated),
                              )
                            : ""
                        }
                        placeholder="VND"
                        disabled={
                          sowGeneratedLocked
                        }
                        className={
                          sowGeneratedLocked
                            ? "bg-slate-50 text-black font-bold disabled:opacity-100 disabled:text-black"
                            : ""
                        }
                        onChange={(event) =>
                          updateMilestoneBudgetAmount(
                            index,
                            event.target.value.replace(/\D/g, ""),
                          )
                        }
                      />
                      <Input
                        aria-label={`Mốc ${index + 1}`}
                        type="number"
                        min={1}
                        value={milestone.orderIndex}
                        placeholder="GĐ"
                        readOnly
                        disabled
                        className="bg-slate-50 text-black font-bold disabled:opacity-100 disabled:text-black"
                      />
                      <div
                        className={`flex h-11 self-start rounded-2xl border border-slate-200 px-3 ${
                          sowGeneratedLocked ? "bg-slate-50" : "bg-white"
                        }`}
                      >
                        <Input
                          aria-label={`Thời gian ${index + 1}`}
                          type="text"
                          min={1}
                          value={milestone.durationValue}
                          placeholder="Thời lượng"
                          className={`h-full border-0 px-0 shadow-none focus:ring-0 ${sowGeneratedLocked ? "bg-slate-50 text-black font-bold disabled:opacity-100 disabled:text-black" : ""}`}
                          disabled={sowGeneratedLocked}
                          onChange={(event) =>
                            updateMilestoneDurationValue(
                              index,
                              event.target.value,
                            )
                          }
                        />
                        <span className="flex shrink-0 items-center pl-2 text-sm font-semibold text-slate-500">
                          TUẦN
                        </span>
                      </div>

                      {/* Acceptance Criteria - milestone-owned text list */}
                      <div>
                        <div className="max-h-48 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-2">
                          <ul className="grid gap-2">
                            {milestone.acceptanceCriteria.map(
                              (criterion, criterionIndex) => (
                                <li
                                  key={criterionIndex}
                                  className="flex items-start gap-2 rounded-xl bg-white px-2 py-1.5"
                                >
                                  <span className="mt-1.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-50 text-[10px] font-extrabold text-brand-600">
                                    {criterionIndex + 1}
                                  </span>
                                  <div
                                    contentEditable={!sowGeneratedLocked}
                                    suppressContentEditableWarning
                                    aria-label={`Tieu chi nghiem thu ${criterionIndex + 1} cua moc ${index + 1}`}
                                    data-placeholder="Ví dụ: Bàn giao đúng tài liệu/API/demo đã thống nhất."
                                    className={`min-h-[32px] flex-1 min-w-0 border-0 bg-transparent px-1 py-1.5 text-xs shadow-none focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 empty:before:font-normal break-words ${sowGeneratedLocked ? "cursor-default text-black font-bold" : "cursor-text font-semibold"}`}
                                    onBlur={(event) =>
                                      updateMilestoneCriterion(
                                        index,
                                        criterionIndex,
                                        event.currentTarget.textContent || "",
                                      )
                                    }
                                  >
                                    {criterion}
                                  </div>
                                  {!sowGeneratedLocked && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      aria-label="Xóa tiêu chí nghiệm thu"
                                      title="Xóa tiêu chí"
                                      className="mt-1 h-8 w-10 shrink-0 rounded-md border border-red-600 bg-red-600 p-0 text-xs text-white transition-transform duration-200 hover:-translate-y-0.5 hover:bg-red-600 hover:text-white hover:border-red-600 active:scale-95"
                                      onClick={() =>
                                        removeMilestoneCriterion(
                                          index,
                                          criterionIndex,
                                        )
                                      }
                                    >
                                      X
                                    </Button>
                                  )}
                                </li>
                              ),
                            )}
                          </ul>
                          {!sowGeneratedLocked && (
                            <Button
                              type="button"
                              variant="secondary"
                              className="mt-2 h-9 w-full justify-center text-xs"
                              onClick={() => addMilestoneCriterion(index)}
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Thêm tiêu chí
                            </Button>
                          )}
                        </div>
                        {attemptedSubmit &&
                          !milestone.acceptanceCriteria.some((criterion) =>
                            criterion.trim(),
                          ) && (
                            <p className="mt-1 text-xs text-rose-500">
                              Vui long nhap it nhat mot tieu chi nghiem thu.
                            </p>
                          )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap justify-center gap-3">
                  <Button
                    type="button"
                    onClick={addMilestone}
                    disabled={sowGeneratedLocked}
                    className="bg-pink-500 text-white hover:bg-pink-600 border-none"
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Thêm mới mốc
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setIsDeletingMilestones((prev) => !prev);
                      setIsReorderingMilestones(false);
                    }}
                    disabled={sowGeneratedLocked || milestones.length <= 1}
                    className="bg-pink-500 text-white hover:bg-pink-600 border-none"
                  >
                    <Minus className="mr-1 h-4 w-4" />
                    {isDeletingMilestones ? "Hoàn tất xóa" : "Xóa bỏ mốc"}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setIsReorderingMilestones((prev) => !prev);
                      setIsDeletingMilestones(false);
                    }}
                    disabled={sowGeneratedLocked || milestones.length <= 1}
                    className="bg-pink-500 text-white hover:bg-pink-600 border-none"
                  >
                    <ArrowUpDown className="mr-1 h-4 w-4" />
                    {isReorderingMilestones
                      ? "Hoàn tất sắp xếp"
                      : "Chỉnh sửa thứ tự"}
                  </Button>
                  <Button
                    type="button"
                    onClick={undoMilestoneAction}
                    disabled={
                      sowGeneratedLocked || milestonesHistory.length === 0
                    }
                    className="bg-pink-500 text-white hover:bg-pink-600 border-none"
                  >
                    <Undo2 className="mr-1 h-4 w-4" />
                    Hoàn tác
                  </Button>
                </div>
                {attemptedSubmit &&
                  (() => {
                    const hasEmptyMilestone =
                      milestones.length === 0 ||
                      milestones.some(
                        (m) =>
                          !m.milestoneName.trim() ||
                          !Number(m.durationValue) ||
                          !Number(m.fundsAllocated) ||
                          !m.acceptanceCriteria.some((criterion) =>
                            criterion.trim(),
                          ),
                      );
                    if (hasEmptyMilestone) {
                      return (
                        <p className="mt-3 text-xs font-bold text-rose-500">
                          Vui lòng điền đầy đủ thông tin các mốc dự án (tên,
                          ngân sách, thời gian, tiêu chí).
                        </p>
                      );
                    }

                    const projectTimelineWeeks = Number(
                      form.plannedDurationValue || 0,
                    );
                    const totalMilestoneWeeks = milestones
                      .filter((milestone) => milestone.milestoneName.trim())
                      .reduce(
                        (total, milestone) =>
                          total + Number(milestone.durationValue || 0),
                        0,
                      );

                    if (
                      !Number.isFinite(projectTimelineWeeks) ||
                      projectTimelineWeeks < totalMilestoneWeeks
                    ) {
                      return (
                        <p className="mt-3 text-xs font-bold text-rose-500">
                          Tổng thời gian các mốc ({totalMilestoneWeeks} tuần)
                          không được vượt quá thời lượng dự án (
                          {projectTimelineWeeks} tuần).
                        </p>
                      );
                    }
                    return null;
                  })()}
              </div>
            </div>

            {/* ── STEP 4: Submit ── */}
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div>
                <p className="text-sm font-bold text-slate-700">
                  Bước 4 — Lưu dự án (nháp)
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Dự án sẽ được lưu ở trạng thái "Nháp". Có thể điều chỉnh lại
                  hoặc đăng bài lên ngay.
                </p>
              </div>
              <Button
                type="submit"
                loading={loading}
                onClick={() => setAttemptedSubmit(true)}
              >
                <Save className="h-4 w-4" />
                Lưu
              </Button>
            </div>
            {publishError && (
              <div className="mt-2">
                <Notice tone="danger" title={publishError} />
              </div>
            )}
            {createMessage &&
              (!savedJob ||
                (typeof createMessage === "string" &&
                  createMessage.includes("nháp"))) && (
                <div className="mt-4">
                  {Array.isArray(createMessage) ? (
                    <Notice
                      tone={createMessageTone}
                      title="Vui lòng kiểm tra lại thông tin:"
                    >
                      <ul className="mt-1 list-inside list-disc space-y-1 text-sm">
                        {createMessage.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </Notice>
                  ) : (
                    <Notice
                      tone={createMessageTone}
                      title={createMessage as string}
                    />
                  )}
                </div>
              )}
          </form>
        </Card>

        {savedJob && (
          <Card className="p-5">
            <SectionHeading
              title={
                savedJob.status === "OPEN"
                  ? "Quản lý bài đăng"
                  : "Quản lý dự án nháp"
              }
              description={
                !createMessage && savedJob.status !== "OPEN"
                  ? "Dự án đã được lưu ở trạng thái nháp."
                  : undefined
              }
            />
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <JobDomainBadge
                    label={jobDomainLabel(selectedDomainIdList, domains)}
                    className="mb-2"
                  />
                  <p className="mt-1 break-words font-extrabold text-ink">
                    {savedJob.title}
                  </p>
                </div>
                <StatusBadge
                  status={
                    savedJob.status === "DRAFT" ? "Nháp" : savedJob.status
                  }
                />
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
                      ? `${savedJob.plannedDurationValue} ${savedJob.plannedDurationUnit === "WEEK" ? "TUẦN" : savedJob.plannedDurationUnit || "TUẦN"}`
                      : "Chưa xác định"}
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
                  acceptanceCriteria: milestone.acceptanceCriteria
                    .map((criterion) => criterion.trim())
                    .filter(Boolean),
                  criteria: milestone.acceptanceCriteria
                    .map((criterion, criterionIndex) => ({
                      criteriaId: criterionIndex + 1,
                      description: criterion,
                      sortOrder: criterionIndex + 1,
                    }))
                    .filter((criterion) => criterion.description.trim()),
                }))}
            />
            <div className="mt-4 grid gap-2">
              {createMessage &&
                !(
                  typeof createMessage === "string" &&
                  createMessage.includes("nháp")
                ) &&
                (Array.isArray(createMessage) ? (
                  <Notice
                    tone={createMessageTone}
                    title="Vui lòng kiểm tra lại thông tin:"
                  >
                    <ul className="mt-1 list-inside list-disc space-y-1 text-sm">
                      {createMessage.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </Notice>
                ) : (
                  <Notice
                    tone={createMessageTone}
                    title={createMessage as string}
                  />
                ))}
              {publishError && <Notice tone="danger" title={publishError} />}
              <LinkButton
                to={`/app/jobs/${savedJob.jobId}/detail`}
                variant="secondary"
              >
                Xem chi tiết
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
                Xem tất cả dự án của tôi
              </LinkButton>
            </div>
          </Card>
        )}
      </div>
      <Modal
        open={publishSuccessOpen}
        onClose={() => setPublishSuccessOpen(false)}
        title="Mở public job thành công"
        description="Job đã hiển thị với chuyên gia và có thể nhận proposal mới."
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setPublishSuccessOpen(false)}
            >
              Đóng
            </Button>
            {savedJob && (
              <LinkButton to={`/app/jobs/${savedJob.jobId}/manage`}>
                Quản lý job
              </LinkButton>
            )}
          </>
        }
      >
        <Notice tone="success" title="Chuyên gia đã có thể nhìn thấy job này.">
          Bạn có thể vào màn quản lý để theo dõi proposal và tạo hợp đồng khi có
          chuyên gia phù hợp.
        </Notice>
      </Modal>
    </div>
  );
}

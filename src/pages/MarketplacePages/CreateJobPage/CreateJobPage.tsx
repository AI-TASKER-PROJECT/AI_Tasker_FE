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
import { CompactMilestones } from "../marketplacePages.helpers";
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
  const [selectedDomainId, setSelectedDomainId] = useState<number | null>(null);
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
      setSelectedDomainId(domainItems[0]?.domainId ?? null);
      setSkillAssignments(
        skillItems.slice(0, 3).map((item) => ({
          skillId: item.skillId,
          isMandatory: true,
        })),
      );
    });
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
        supportFields: selectedDomainIdList.map((id) =>
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
        structuredSow ||
        (response.milestones && response.milestones.length > 0),
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
      if (selectedDomainId === null) {
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
                  <span className="text-slate-500">Lĩnh vực</span>
                  <span className="break-words text-right font-extrabold text-ink">
                    {selectedDomainIdList
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

import { ListChecks, Sparkles, Target, FileCheck2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  catalogApi,
  contractApi,
  marketplaceApi,
  type Domain,
  type Skill,
  type Technology,
} from "../../../services";
import { formatCurrency } from "../../../lib/utils";
import { FirebaseFileLink } from "../../../components/FirebaseFileLink";
import type { Job, Milestone, Proposal } from "../../../types";
import {
  Field,
  Input,
  Textarea,
  PageHeader,
  EmptyState,
  StatusBadge,
} from "../../../components/ui";
import { resolveDomainName } from "../marketplacePages.utils";
import { useSession } from "../../../context/sessionContext";
import { Button, Notice } from "../../../components/ui";

export function ProposalDetailPage() {
  const { proposalId } = useParams();

  const [loading, setLoading] = useState(true);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [technologies, setTechnologies] = useState<Technology[]>([]);
  const [jobDomainIds, setJobDomainIds] = useState<number[]>([]);
  const [jobSkillIds, setJobSkillIds] = useState<number[]>([]);
  const [jobTechnologyIds, setJobTechnologyIds] = useState<number[]>([]);
  const session = useSession();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editMessage, setEditMessage] = useState("");
  const [draft, setDraft] = useState<Partial<Proposal>>({});
  const [proposalMilestoneText, setProposalMilestoneText] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      setLoading(true);
      try {
        const proposalsData = await marketplaceApi.listMyProposals();
        const foundProposal = proposalsData.find(
          (p) => p.proposalId === Number(proposalId),
        );

        if (ignore) return;

        if (!foundProposal) {
          setLoading(false);
          return;
        }

        setProposal(foundProposal);
        setDraft(foundProposal);
        setProposalMilestoneText(
          foundProposal.proposalMilestone
            ? JSON.stringify(foundProposal.proposalMilestone, null, 2)
            : "",
        );

        const [
          jobData,
          milestonesData,
          domainsData,
          skillsData,
          techData,
          jobDomainsData,
          jobSkillsData,
          jobTechsData,
        ] = await Promise.all([
          marketplaceApi.getJob(foundProposal.jobId).catch(() => null),
          contractApi.listJobMilestones(foundProposal.jobId).catch(() => []),
          catalogApi.listDomains(true).catch(() => []),
          catalogApi.listSkills(true).catch(() => []),
          catalogApi.listTechnologies(true).catch(() => []),
          catalogApi.listJobDomains(foundProposal.jobId).catch(() => []),
          catalogApi.listJobSkills(foundProposal.jobId).catch(() => []),
          catalogApi.listJobTechnologies(foundProposal.jobId).catch(() => []),
        ]);

        if (ignore) return;

        setJob(jobData);
        setMilestones(milestonesData);
        setDomains(domainsData);
        setSkills(skillsData);
        setTechnologies(techData);
        setJobDomainIds(jobDomainsData.map((d) => d.id.domainId));
        setJobSkillIds(jobSkillsData.map((s) => s.id.skillId));
        setJobTechnologyIds(jobTechsData.map((t) => t.id.technologyId));
      } catch {
        // error handling
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadData();

    return () => {
      ignore = true;
    };
  }, [proposalId]);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Đang tải...</div>;
  }

  if (!proposal || !job) {
    return (
      <EmptyState
        title="Không tìm thấy bản đề xuất"
        description="Bản đề xuất này không tồn tại hoặc bạn không có quyền xem."
      />
    );
  }

  const parsedMilestones = (() => {
    try {
      const parsed =
        typeof proposal.proposalMilestone === "string"
          ? JSON.parse(proposal.proposalMilestone)
          : proposal.proposalMilestone;
      if (!Array.isArray(parsed)) return [];
      return parsed.map((item) => ({
        milestoneId: Number(item.milestoneId),
        proposedBudget: Number(item.proposedBudget),
      }));
    } catch {
      return [];
    }
  })();
  const proposedBudgetByMilestoneId = new Map(
    parsedMilestones.map((item) => [item.milestoneId, item.proposedBudget]),
  );
  const totalOriginalBudget = milestones.reduce(
    (total, milestone) => total + Number(milestone.fundsAllocated || 0),
    0,
  );
  const totalProposedBudget = milestones.reduce((total, milestone) => {
    const proposedBudget = proposedBudgetByMilestoneId.get(
      Number(milestone.milestoneId),
    );
    return (
      total +
      Number(
        Number.isFinite(proposedBudget)
          ? proposedBudget
          : milestone.fundsAllocated || 0,
      )
    );
  }, 0);

  const bidAmountDisplay =
    Number(editing ? draft.bidAmount : proposal.bidAmount || 0) > 0
      ? Number(editing ? draft.bidAmount : proposal.bidAmount).toLocaleString(
          "vi-VN",
        )
      : "";
  const canEdit =
    session?.role === "EXPERT" &&
    ["PENDING", "ACCEPTED"].includes(proposal.status.toUpperCase()) &&
    job.status.toUpperCase() === "OPEN";
  const save = async () => {
    if (
      !draft.technicalSolution?.trim() ||
      !draft.proposalDescription?.trim() ||
      !draft.bidAmount
    ) {
      setEditMessage("Vui lòng điền giải pháp, mô tả và ngân sách.");
      return;
    }
    setSaving(true);
    setEditMessage("");
    try {
      const proposalMilestone = proposalMilestoneText.trim()
        ? JSON.parse(proposalMilestoneText)
        : undefined;
      const updated = await marketplaceApi.updateProposal(proposal.proposalId, {
        ...draft,
        proposalMilestone,
      });
      setProposal(updated);
      setDraft(updated);
      setEditing(false);
    } catch (error) {
      setEditMessage(
        error instanceof Error ? error.message : "Không thể cập nhật bản đề xuất.",
      );
    } finally {
      setSaving(false);
    }
  };

  const translateStatus = (status: string) => {
    switch ((status || "").trim().toUpperCase()) {
      case "ACCEPTED":
        return "Chấp nhận";
      case "PENDING":
        return "Chờ phản hồi";
      case "REJECTED":
        return "Từ chối";
      default:
        return status || "Chưa có trạng thái";
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex items-center gap-4">
        <h1 className="font-display text-2xl font-black text-ink">
          Bản đề xuất chi tiết
        </h1>
      </div>
      {canEdit && editing && (
        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              setEditing(false);
              setDraft(proposal);
            }}
          >
            Hủy
          </Button>
          <Button onClick={save} loading={saving}>
            Lưu thay đổi
          </Button>
        </div>
      )}
      {editMessage && (
        <Notice tone="danger" title="Không thể lưu bản đề xuất">
          {editMessage}
        </Notice>
      )}

      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          title={job.title}
          actions={<StatusBadge status={translateStatus(proposal.status)} />}
        />
      </div>

      <div className="grid gap-5">
        <section className="grid gap-4 rounded-3xl border border-slate-100 bg-slate-50/70 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-brand-600 shadow-sm">
              <Target className="h-4 w-4" />
            </span>
            <div>
              <h3 className="font-display text-lg font-extrabold text-ink">
                Yêu cầu công việc
              </h3>
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Field label="Lĩnh vực">
              <div className="flex h-11 items-center rounded-2xl border border-slate-300 bg-slate-100 px-3 text-sm font-semibold text-slate-800 shadow-sm">
                <span className="truncate">
                  {jobDomainIds.length > 0
                    ? resolveDomainName(jobDomainIds[0], domains)
                    : "Chưa chọn lĩnh vực"}
                </span>
              </div>
            </Field>
            <Field label="Công nghệ">
              <div className="rounded-2xl border border-slate-300 bg-slate-50 p-3 shadow-sm min-h-[3rem]">
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
                        )?.technologyName || "Công nghệ chưa có tên"}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm font-semibold text-slate-400 mt-1">
                      Chưa có công nghệ
                    </span>
                  )}
                </div>
              </div>
            </Field>
            <Field label="Kỹ năng" className="md:col-span-2">
              <div className="rounded-2xl border border-slate-300 bg-slate-50 p-3 shadow-sm min-h-[3rem]">
                <div className="flex flex-wrap gap-2">
                  {jobSkillIds.length > 0 ? (
                    jobSkillIds.map((skillId) => (
                      <span
                        key={skillId}
                        className="inline-flex items-center rounded-full border border-brand-200 bg-white px-3 py-1.5 text-sm font-semibold text-ink"
                      >
                        {skills.find((skill) => skill.skillId === skillId)
                          ?.skillName || "Kỹ năng chưa có tên"}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm font-semibold text-slate-400 mt-1">
                      Chưa có kỹ năng
                    </span>
                  )}
                </div>
              </div>
            </Field>
          </div>
        </section>

        <section className="grid gap-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
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
              value={
                editing
                  ? draft.technicalSolution || ""
                  : proposal.technicalSolution
              }
              readOnly={!editing}
              onChange={(event) =>
                setDraft((value) => ({
                  ...value,
                  technicalSolution: event.target.value,
                }))
              }
              className="min-h-36 bg-slate-50"
            />
          </Field>
          <Field label="Đề xuất">
            <Textarea
              value={
                editing
                  ? draft.proposalDescription || ""
                  : proposal.proposalDescription || ""
              }
              readOnly={!editing}
              onChange={(event) =>
                setDraft((value) => ({
                  ...value,
                  proposalDescription: event.target.value,
                }))
              }
              className="min-h-32 bg-slate-50"
            />
          </Field>
        </section>

        <section className="grid gap-4 rounded-3xl border border-slate-100 bg-slate-50/70 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-rose-500 shadow-sm">
              <FileCheck2 className="h-4 w-4" />
            </span>
            <div>
              <h3 className="font-display text-lg font-extrabold text-ink">
                Ngân sách
              </h3>
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Field label="Ngân sách">
              <Input
                type="text"
                value={bidAmountDisplay}
                readOnly={!editing}
                onChange={(event) =>
                  setDraft((value) => ({
                    ...value,
                    bidAmount:
                      Number(event.target.value.replace(/\D/g, "")) || 0,
                  }))
                }
              />
            </Field>
            <Field label="File bản đề xuất">
              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm h-11 flex items-center">
                <FirebaseFileLink
                  path={proposal.proposalFileUrl}
                  emptyText="Không có file đính kèm"
                  buttonText="Tải xuống / Xem file"
                  showPath={false}
                />
              </div>
            </Field>
            {editing && (
              <Field label="URL tệp đề xuất">
                <Input
                  value={draft.proposalFileUrl || ""}
                  onChange={(event) =>
                    setDraft((value) => ({
                      ...value,
                      proposalFileUrl: event.target.value,
                    }))
                  }
                  placeholder="Đường dẫn tệp đã tải lên"
                />
              </Field>
            )}
          </div>
        </section>

        {milestones.length > 0 && (
          <section className="grid gap-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4 mb-2">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-50 text-amber-600">
                  <ListChecks className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="font-display text-lg font-extrabold text-ink">
                    Mốc trong đề xuất
                  </h3>
                </div>
              </div>
            </div>
            <div className="grid gap-3">
              {editing && (
                <Field label="Mốc trong đề xuất (JSON)">
                  <Textarea
                    value={proposalMilestoneText}
                    onChange={(event) =>
                      setProposalMilestoneText(event.target.value)
                    }
                    placeholder='[{"milestoneId": 1, "proposedBudget": 1000000}]'
                    className="min-h-28 font-mono text-xs"
                  />
                </Field>
              )}
              {milestones.map((milestone) => {
                const proposedBudget = proposedBudgetByMilestoneId.get(
                  Number(milestone.milestoneId),
                );
                const proposedVal = Number.isFinite(proposedBudget)
                  ? proposedBudget
                  : milestone.fundsAllocated;
                return (
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
                        Ngân sách gốc
                      </p>
                      <Input
                        type="text"
                        value={formatCurrency(milestone.fundsAllocated)}
                        readOnly
                        className="bg-white font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                        Ngân sách đề xuất
                      </p>
                      <Input
                        type="text"
                        value={Number(proposedVal).toLocaleString("vi-VN")}
                        readOnly
                        className="bg-white font-bold text-[#c50073]"
                      />
                    </div>
                  </div>
                );
              })}
              <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_180px_180px]">
                <div className="flex items-center">
                  <p className="font-display text-base font-black uppercase text-ink">
                    Tổng ngân sách
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    Tổng ngân sách gốc
                  </p>
                  <Input
                    type="text"
                    value={formatCurrency(totalOriginalBudget)}
                    readOnly
                    className="bg-white font-extrabold"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    Tổng ngân sách đề xuất
                  </p>
                  <Input
                    type="text"
                    value={formatCurrency(totalProposedBudget)}
                    readOnly
                    className="bg-white font-extrabold text-[#c50073]"
                  />
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

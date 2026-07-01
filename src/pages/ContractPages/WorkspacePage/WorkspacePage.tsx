import { CheckCircle2, UploadCloud } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { contractApi, getApiErrorMessage } from "../../../lib/api";
import { useSession } from "../../../lib/session";
import { formatCurrency, formatDateTime } from "../../../lib/utils";
import type { AcceptanceCriteria, Contract, Deliverable, Milestone } from "../../../types";
import { Badge, Button, Card, EmptyState, Field, Input, Modal, Notice, PageHeader, StatusBadge, Textarea } from "../../../components/ui";
import { canBackendReviewMilestone, CreateDisputeInline, getContractMilestoneId, getMilestoneBudget, getMilestoneDurationLabel, getSourceMilestoneId, translateContractStatus } from "../ContractPages.shared";

export function WorkspacePage() {
  const { contractId } = useParams();
  const session = useSession();
  const [contract, setContract] = useState<Contract | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [criteriaByMilestone, setCriteriaByMilestone] = useState<
    Record<number, AcceptanceCriteria[]>
  >({});
  const [deliverablesByMilestone, setDeliverablesByMilestone] = useState<
    Record<number, Deliverable[]>
  >({});
  const [deliverableOpen, setDeliverableOpen] = useState<Milestone | null>(
    null,
  );
  const [deliverableForm, setDeliverableForm] = useState({
    sourceCodeUrl: "",
    demoLink: "",
    submissionNotes: "",
  });
  const [workspaceNotice, setWorkspaceNotice] = useState<{
    tone: "success" | "danger" | "info";
    title: string;
  } | null>(null);
  const [milestoneNotices, setMilestoneNotices] = useState<
    Record<number, { tone: "success" | "danger" | "info"; title: string }>
  >({});

  useEffect(() => {
    const id = Number(contractId);
    contractApi
      .listContracts()
      .then((items) =>
        setContract(items.find((item) => item.contractId === id) || null),
      )
      .catch(() => setContract(null));
    contractApi
      .listMilestones(id)
      .then(setMilestones)
      .catch(() => setMilestones([]));
  }, [contractId]);

  useEffect(() => {
    milestones.forEach((milestone) => {
      const sourceMilestoneId = getSourceMilestoneId(milestone);
      if (!sourceMilestoneId) return;
      contractApi
        .listCriteria(sourceMilestoneId)
        .then((items) => {
          setCriteriaByMilestone((current) => ({
            ...current,
            [sourceMilestoneId]: items,
          }));
        })
        .catch(() => undefined);
      contractApi
        .listDeliverables(sourceMilestoneId)
        .then((items) => {
          setDeliverablesByMilestone((current) => ({
            ...current,
            [sourceMilestoneId]: items,
          }));
        })
        .catch(() => undefined);
    });
  }, [milestones]);

  if (!contract)
    return (
      <EmptyState
        title="Không tìm thấy workspace"
        description="Dữ liệu workspace được lấy trực tiếp từ backend."
      />
    );

  const submitDeliverable = async () => {
    if (!deliverableOpen) return;
    const sourceMilestoneId = getSourceMilestoneId(deliverableOpen);
    if (!sourceMilestoneId) {
      setWorkspaceNotice({
        tone: "danger",
        title: "Không xác định được milestone gốc để nộp deliverable.",
      });
      return;
    }
    setWorkspaceNotice(null);
    try {
      await contractApi.submitDeliverable({
        milestoneId: sourceMilestoneId,
        ...deliverableForm,
      });
      const [updatedDeliverables, updatedMilestones] = await Promise.all([
        contractApi.listDeliverables(sourceMilestoneId),
        contractApi.listMilestones(contract.contractId),
      ]);
      setDeliverablesByMilestone((current) => ({
        ...current,
        [sourceMilestoneId]: updatedDeliverables,
      }));
      setMilestones(updatedMilestones);
      setDeliverableForm({
        sourceCodeUrl: "",
        demoLink: "",
        submissionNotes: "",
      });
      setDeliverableOpen(null);
      setMilestoneNotices((current) => ({
        ...current,
        [sourceMilestoneId]: {
          tone: "success",
          title:
            "Đã nộp deliverable. Trạng thái milestone lấy theo phản hồi từ backend.",
        },
      }));
    } catch (error) {
      setMilestoneNotices((current) => ({
        ...current,
        [sourceMilestoneId]: {
          tone: "danger",
          title: getApiErrorMessage(error),
        },
      }));
    }
  };

  const completeMilestone = async (milestone: Milestone) => {
    const sourceMilestoneId = getSourceMilestoneId(milestone);
    if (!sourceMilestoneId) {
      setWorkspaceNotice({
        tone: "danger",
        title: "Không xác định được milestone gốc để nghiệm thu.",
      });
      return;
    }
    setWorkspaceNotice(null);
    try {
      await contractApi.completeMilestone(sourceMilestoneId);
      setMilestones(await contractApi.listMilestones(contract.contractId));
      setMilestoneNotices((current) => ({
        ...current,
        [sourceMilestoneId]: {
          tone: "success",
          title: `Đã gửi nghiệm thu cho ${milestone.milestoneName}.`,
        },
      }));
    } catch (error) {
      setMilestoneNotices((current) => ({
        ...current,
        [sourceMilestoneId]: {
          tone: "danger",
          title: getApiErrorMessage(error),
        },
      }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          title={`Workspace: ${
            contract.contractTitle ||
            contract.title ||
            `Contract #${contract.contractId}`
          }`}
          description="Theo dõi milestone, acceptance criteria và deliverable từ backend."
        />
      </div>
      {workspaceNotice && (
        <Notice tone={workspaceNotice.tone} title={workspaceNotice.title} />
      )}
      <div className="grid gap-4">
        {milestones.map((milestone) => {
          const sourceMilestoneId = getSourceMilestoneId(milestone);
          const milestoneDeliverables = sourceMilestoneId
            ? deliverablesByMilestone[sourceMilestoneId] || []
            : [];
          const criteriaItems = sourceMilestoneId
            ? criteriaByMilestone[sourceMilestoneId] || []
            : [];
          const milestoneNotice = sourceMilestoneId
            ? milestoneNotices[sourceMilestoneId]
            : null;
          const canSubmitDeliverable = session?.role === "EXPERT";
          const reviewableByBackend = canBackendReviewMilestone(
            milestone.status,
          );
          const canCompleteMilestone =
            session?.role === "BUSINESS" &&
            milestoneDeliverables.length > 0 &&
            reviewableByBackend;

          return (
            <Card
              key={
                sourceMilestoneId ||
                getContractMilestoneId(milestone) ||
                milestone.orderIndex
              }
              className="p-5"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="brand">Mốc {milestone.orderIndex}</Badge>
                    <StatusBadge
                      status={translateContractStatus(milestone.status)}
                    />
                  </div>
                  <h3 className="mt-3 font-display text-xl font-extrabold text-ink">
                    {milestone.milestoneName}
                  </h3>
                  <p className="mt-2 text-sm text-slate-500">
                    Ký quỹ: {formatCurrency(getMilestoneBudget(milestone))}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Thời gian: {getMilestoneDurationLabel(milestone)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {canSubmitDeliverable && (
                    <Button
                      size="sm"
                      onClick={() => setDeliverableOpen(milestone)}
                    >
                      <UploadCloud className="h-4 w-4" /> Submit deliverable
                    </Button>
                  )}
                  {session?.role === "BUSINESS" && (
                    <Button
                      size="sm"
                      variant="success"
                      disabled={!canCompleteMilestone}
                      onClick={() => completeMilestone(milestone)}
                    >
                      <CheckCircle2 className="h-4 w-4" /> Nghiệm thu
                    </Button>
                  )}
                  <CreateDisputeInline
                    contractId={contract.contractId}
                    milestoneId={sourceMilestoneId}
                  />
                </div>
              </div>

              {milestoneNotice && (
                <div className="mt-4">
                  <Notice
                    tone={milestoneNotice.tone}
                    title={milestoneNotice.title}
                  />
                </div>
              )}

              {session?.role === "BUSINESS" &&
                milestoneDeliverables.length === 0 && (
                  <div className="mt-4">
                    <Notice
                      tone="info"
                      title="Chưa có deliverable từ backend nên chưa thể nghiệm thu milestone này."
                    />
                  </div>
                )}
              {session?.role === "BUSINESS" &&
                milestoneDeliverables.length > 0 &&
                !reviewableByBackend && (
                  <div className="mt-4">
                    <Notice
                      tone="warning"
                      title={`Backend đang trả milestone ở trạng thái ${milestone.status}; cần chuyển sang trạng thái chờ nghiệm thu trước khi gọi nghiệm thu.`}
                    />
                  </div>
                )}

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm font-extrabold text-ink">
                    Acceptance Criteria
                  </p>
                  <div className="mt-3 grid gap-2">
                    {criteriaItems.map((criteria) => (
                      <div
                        key={criteria.criteriaId}
                        className="flex items-center gap-2 text-sm text-slate-600"
                      >
                        {criteria.isPassed ? (
                          <CheckCircle2 className="h-4 w-4 text-mint-600" />
                        ) : (
                          <span className="h-4 w-4 rounded-full border border-slate-300" />
                        )}
                        {criteria.description}
                      </div>
                    ))}
                    {criteriaItems.length === 0 && (
                      <p className="rounded-xl border border-dashed border-slate-200 bg-white p-3 text-sm font-semibold text-slate-400">
                        Backend chưa trả acceptance criteria cho milestone này.
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-extrabold text-ink">
                      Deliverables
                    </p>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500">
                      {milestoneDeliverables.length} sản phẩm
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2">
                    {milestoneDeliverables.map((item) => (
                      <div
                        key={item.deliverableId}
                        className="rounded-xl bg-white p-3 text-sm text-slate-600 shadow-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-bold text-ink">
                            Deliverable #{item.deliverableId}
                          </p>
                          {item.createdAt && (
                            <span className="text-xs font-bold text-slate-400">
                              {formatDateTime(item.createdAt)}
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {item.sourceCodeUrl && (
                            <a
                              href={item.sourceCodeUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="font-bold text-brand-600 hover:text-brand-700"
                            >
                              Source code
                            </a>
                          )}
                          {item.demoLink && (
                            <a
                              href={item.demoLink}
                              target="_blank"
                              rel="noreferrer"
                              className="font-bold text-brand-600 hover:text-brand-700"
                            >
                              Demo
                            </a>
                          )}
                        </div>
                        {item.submissionNotes && (
                          <p className="mt-2 leading-6">
                            {item.submissionNotes}
                          </p>
                        )}
                      </div>
                    ))}
                    {milestoneDeliverables.length === 0 && (
                      <p className="rounded-xl border border-dashed border-slate-200 bg-white p-3 text-sm font-semibold text-slate-400">
                        Backend chưa có deliverable cho milestone này.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Modal
        open={Boolean(deliverableOpen)}
        onClose={() => setDeliverableOpen(null)}
        title="Nộp deliverable"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setDeliverableOpen(null)}
            >
              Hủy
            </Button>
            <Button onClick={submitDeliverable}>Nộp</Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Field label="Source code URL">
            <Input
              value={deliverableForm.sourceCodeUrl}
              onChange={(event) =>
                setDeliverableForm((value) => ({
                  ...value,
                  sourceCodeUrl: event.target.value,
                }))
              }
            />
          </Field>
          <Field label="Demo link">
            <Input
              value={deliverableForm.demoLink}
              onChange={(event) =>
                setDeliverableForm((value) => ({
                  ...value,
                  demoLink: event.target.value,
                }))
              }
            />
          </Field>
          <Field label="Ghi chú bàn giao">
            <Textarea
              value={deliverableForm.submissionNotes}
              onChange={(event) =>
                setDeliverableForm((value) => ({
                  ...value,
                  submissionNotes: event.target.value,
                }))
              }
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}

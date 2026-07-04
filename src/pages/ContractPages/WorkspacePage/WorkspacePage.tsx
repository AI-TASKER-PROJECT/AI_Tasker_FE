import {
  AlertTriangle,
  CheckCircle2,
  Gavel,
  Send,
  UploadCloud,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { contractApi, disputeApi, getApiErrorMessage } from "../../../lib/api";
import {
  canBusinessRequestStaffIntervention,
  canExpertInitiateDispute,
  canExpertResubmitDeliverable,
  canInitiatorCancelDispute,
  isActiveDisputeStatus,
  translateDisputeInitiationType,
  translateDisputeStatus,
} from "../../../lib/dispute";
import { useSession } from "../../../lib/session";
import { formatCurrency, formatDateTime } from "../../../lib/utils";
import type {
  AcceptanceCriteria,
  Contract,
  Deliverable,
  Dispute,
  DisputeInitiationType,
  Milestone,
} from "../../../types";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  Notice,
  PageHeader,
  Select,
  StatusBadge,
  Textarea,
} from "../../../components/ui";
import {
  canBackendReviewMilestone,
  getContractMilestoneId,
  getMilestoneBudget,
  getMilestoneDurationLabel,
  getSourceMilestoneId,
  translateContractStatus,
} from "../ContractPages.shared";

type NoticeState = {
  tone: "success" | "danger" | "info" | "warning";
  title: string;
};

type SubmitAction =
  | "submit-deliverable"
  | "approve-milestone"
  | "reject-milestone"
  | "initiate-dispute"
  | "request-intervention"
  | "cancel-dispute";

const expertInitiationTypes: Array<{
  value: DisputeInitiationType;
  label: string;
}> = [
  {
    value: "EXPERT_SCOPE_CONCERN",
    label: translateDisputeInitiationType("EXPERT_SCOPE_CONCERN") || "",
  },
  {
    value: "EXPERT_NO_REVIEW_RESPONSE",
    label: translateDisputeInitiationType("EXPERT_NO_REVIEW_RESPONSE") || "",
  },
  {
    value: "EXPERT_BAD_FAITH_REJECTION",
    label: translateDisputeInitiationType("EXPERT_BAD_FAITH_REJECTION") || "",
  },
  { value: "OTHER", label: translateDisputeInitiationType("OTHER") || "" },
];

export function WorkspacePage() {
  const { contractId } = useParams();
  const session = useSession();
  const [contract, setContract] = useState<Contract | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [criteriaByMilestone, setCriteriaByMilestone] = useState<
    Record<number, AcceptanceCriteria[]>
  >({});
  const [deliverablesByMilestone, setDeliverablesByMilestone] = useState<
    Record<number, Deliverable[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [deliverableOpen, setDeliverableOpen] = useState<Milestone | null>(
    null,
  );
  const [rejectOpen, setRejectOpen] = useState<Milestone | null>(null);
  const [expertDisputeOpen, setExpertDisputeOpen] =
    useState<Milestone | null>(null);
  const [interventionOpen, setInterventionOpen] = useState<Dispute | null>(
    null,
  );
  const [cancelOpen, setCancelOpen] = useState<Dispute | null>(null);
  const [deliverableForm, setDeliverableForm] = useState({
    sourceCodeUrl: "",
    demoLink: "",
    submissionNotes: "",
  });
  const [rejectReason, setRejectReason] = useState("");
  const [expertDisputeForm, setExpertDisputeForm] = useState<{
    initiationType: DisputeInitiationType;
  }>({
    initiationType: "EXPERT_SCOPE_CONCERN",
  });
  const [interventionForm, setInterventionForm] = useState({
    reason: "",
    evidenceFile: "",
  });
  const [cancelReason, setCancelReason] = useState("");
  const [submitting, setSubmitting] = useState<SubmitAction | null>(null);
  const [workspaceNotice, setWorkspaceNotice] = useState<NoticeState | null>(
    null,
  );
  const [milestoneNotices, setMilestoneNotices] = useState<
    Record<number, NoticeState>
  >({});

  const contractNumber = Number(contractId);

  const loadWorkspace = useCallback(async () => {
    if (!Number.isFinite(contractNumber) || contractNumber <= 0) {
      setContract(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError("");
    try {
      const [contractDetail, milestoneItems, disputeItems] = await Promise.all([
        contractApi.getContract(contractNumber),
        contractApi.listMilestones(contractNumber),
        disputeApi.listByContract(contractNumber),
      ]);
      setContract(contractDetail);
      setMilestones(milestoneItems);
      setDisputes(disputeItems);
    } catch (error) {
      setLoadError(getApiErrorMessage(error));
      setContract(null);
      setMilestones([]);
      setDisputes([]);
    } finally {
      setLoading(false);
    }
  }, [contractNumber]);

  useEffect(() => {
    const run = async () => {
      await loadWorkspace();
    };
    void run();
  }, [loadWorkspace]);

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

  const disputesByMilestone = useMemo(() => {
    return disputes.reduce<Record<number, Dispute[]>>((groups, dispute) => {
      if (!dispute.milestoneId) return groups;
      groups[dispute.milestoneId] = [
        ...(groups[dispute.milestoneId] || []),
        dispute,
      ];
      return groups;
    }, {});
  }, [disputes]);

  const refreshAfterAction = async (milestoneId?: number) => {
    await loadWorkspace();
    if (milestoneId) {
      const deliverables = await contractApi.listDeliverables(milestoneId);
      setDeliverablesByMilestone((current) => ({
        ...current,
        [milestoneId]: deliverables,
      }));
    }
  };

  const setMilestoneNotice = (
    milestoneId: number,
    notice: NoticeState,
  ) => {
    setMilestoneNotices((current) => ({ ...current, [milestoneId]: notice }));
  };

  const submitDeliverable = async () => {
    if (!deliverableOpen) return;
    const sourceMilestoneId = getSourceMilestoneId(deliverableOpen);
    if (!sourceMilestoneId) {
      setWorkspaceNotice({
        tone: "danger",
        title: "Không xác định được milestone để nộp sản phẩm bàn giao.",
      });
      return;
    }
    setSubmitting("submit-deliverable");
    setWorkspaceNotice(null);
    try {
      await contractApi.submitDeliverable({
        milestoneId: sourceMilestoneId,
        ...deliverableForm,
      });
      setDeliverableForm({
        sourceCodeUrl: "",
        demoLink: "",
        submissionNotes: "",
      });
      setDeliverableOpen(null);
      await refreshAfterAction(sourceMilestoneId);
      setMilestoneNotice(sourceMilestoneId, {
        tone: "success",
        title: "Đã nộp sản phẩm bàn giao. Trạng thái mới lấy từ backend.",
      });
    } catch (error) {
      setMilestoneNotice(sourceMilestoneId, {
        tone: "danger",
        title: getApiErrorMessage(error),
      });
      await refreshAfterAction(sourceMilestoneId);
    } finally {
      setSubmitting(null);
    }
  };

  const approveMilestone = async (milestone: Milestone) => {
    const sourceMilestoneId = getSourceMilestoneId(milestone);
    if (!sourceMilestoneId) return;
    setSubmitting("approve-milestone");
    try {
      await contractApi.approveMilestone(sourceMilestoneId);
      await refreshAfterAction(sourceMilestoneId);
      setMilestoneNotice(sourceMilestoneId, {
        tone: "success",
        title: `Đã nghiệm thu ${milestone.milestoneName}.`,
      });
    } catch (error) {
      setMilestoneNotice(sourceMilestoneId, {
        tone: "danger",
        title: getApiErrorMessage(error),
      });
      await refreshAfterAction(sourceMilestoneId);
    } finally {
      setSubmitting(null);
    }
  };

  const rejectMilestone = async () => {
    if (!rejectOpen) return;
    const sourceMilestoneId = getSourceMilestoneId(rejectOpen);
    if (!sourceMilestoneId) return;
    setSubmitting("reject-milestone");
    try {
      await contractApi.rejectMilestone(sourceMilestoneId, rejectReason);
      setRejectOpen(null);
      setRejectReason("");
      await refreshAfterAction(sourceMilestoneId);
      setMilestoneNotice(sourceMilestoneId, {
        tone: "success",
        title:
          "Đã từ chối sản phẩm bàn giao. Dispute được backend tạo hoặc cập nhật.",
      });
    } catch (error) {
      setMilestoneNotice(sourceMilestoneId, {
        tone: "danger",
        title: getApiErrorMessage(error),
      });
      await refreshAfterAction(sourceMilestoneId);
    } finally {
      setSubmitting(null);
    }
  };

  const initiateExpertDispute = async () => {
    if (!expertDisputeOpen || !contract) return;
    const sourceMilestoneId = getSourceMilestoneId(expertDisputeOpen);
    if (!sourceMilestoneId) return;
    setSubmitting("initiate-dispute");
    try {
      await disputeApi.initiateExpertDispute({
        contractId: contract.contractId,
        milestoneId: sourceMilestoneId,
        initiatedBy: "EXPERT",
        initiationType: expertDisputeForm.initiationType,
      });
      setExpertDisputeOpen(null);
      setExpertDisputeForm({
        initiationType: "EXPERT_SCOPE_CONCERN",
      });
      await refreshAfterAction(sourceMilestoneId);
      setMilestoneNotice(sourceMilestoneId, {
        tone: "success",
        title: "Đã tạo dispute theo phản hồi từ backend.",
      });
    } catch (error) {
      setMilestoneNotice(sourceMilestoneId, {
        tone: "danger",
        title: getApiErrorMessage(error),
      });
      await refreshAfterAction(sourceMilestoneId);
    } finally {
      setSubmitting(null);
    }
  };

  const requestStaffIntervention = async () => {
    if (!interventionOpen) return;
    setSubmitting("request-intervention");
    try {
      await disputeApi.requestStaffIntervention(interventionOpen.disputeId, {
        reason: interventionForm.reason,
        evidenceFile: interventionForm.evidenceFile,
      });
      setInterventionOpen(null);
      setInterventionForm({ reason: "", evidenceFile: "" });
      await refreshAfterAction(interventionOpen.milestoneId);
    } catch (error) {
      setWorkspaceNotice({ tone: "danger", title: getApiErrorMessage(error) });
      await refreshAfterAction(interventionOpen.milestoneId);
    } finally {
      setSubmitting(null);
    }
  };

  const cancelDispute = async () => {
    if (!cancelOpen) return;
    setSubmitting("cancel-dispute");
    try {
      await disputeApi.cancel(cancelOpen.disputeId, { reason: cancelReason });
      setCancelOpen(null);
      setCancelReason("");
      await refreshAfterAction(cancelOpen.milestoneId);
    } catch (error) {
      setWorkspaceNotice({ tone: "danger", title: getApiErrorMessage(error) });
      await refreshAfterAction(cancelOpen.milestoneId);
    } finally {
      setSubmitting(null);
    }
  };

  if (loading) {
    return (
      <EmptyState
        title="Đang tải workspace"
        description="Đang lấy contract, milestone và dispute từ backend."
      />
    );
  }

  if (!contract) {
    return (
      <EmptyState
        title="Không tìm thấy workspace"
        description={loadError || "Dữ liệu workspace được lấy trực tiếp từ backend."}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          title={`Workspace: ${
            contract.contractTitle ||
            contract.title ||
            "Hợp đồng đang thực hiện"
          }`}
          description="Theo dõi milestone, sản phẩm bàn giao và tranh chấp từ backend."
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
          const milestoneDisputes = sourceMilestoneId
            ? disputesByMilestone[sourceMilestoneId] || []
            : [];
          const activeDispute = milestoneDisputes.find((dispute) =>
            isActiveDisputeStatus(dispute.status),
          );
          const latestDispute = activeDispute || milestoneDisputes[0];
          const milestoneNotice = sourceMilestoneId
            ? milestoneNotices[sourceMilestoneId]
            : null;
          const role = session?.role;
          const reviewableByBackend = canBackendReviewMilestone(
            milestone.status,
          );
          const canApprove =
            role === "BUSINESS" &&
            milestoneDeliverables.length > 0 &&
            reviewableByBackend;
          const canReject =
            role === "BUSINESS" &&
            milestoneDeliverables.length > 0 &&
            reviewableByBackend;
          const canSubmitNormal =
            role === "EXPERT" && milestone.status === "IN_PROGRESS";
          const canResubmit =
            activeDispute &&
            canExpertResubmitDeliverable(
              role,
              activeDispute.status,
              milestone.status,
            );
          const canInitiate =
            !activeDispute &&
            canExpertInitiateDispute(role, milestone.status) &&
            Boolean(sourceMilestoneId);
          const canRequestIntervention =
            activeDispute &&
            activeDispute.status === "PENDING_SELF_RESOLVE" &&
            (canBusinessRequestStaffIntervention(role, activeDispute.status) ||
              role === "EXPERT");
          const canCancel =
            activeDispute &&
            canInitiatorCancelDispute(
              role,
              activeDispute,
              session?.accountId,
            );

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
                  {(canSubmitNormal || canResubmit) && (
                    <Button
                      size="sm"
                      onClick={() => setDeliverableOpen(milestone)}
                    >
                      <UploadCloud className="h-4 w-4" />
                      {canResubmit ? "Nộp lại" : "Nộp sản phẩm"}
                    </Button>
                  )}
                  {role === "BUSINESS" && (
                    <>
                      <Button
                        size="sm"
                        variant="success"
                        disabled={!canApprove}
                        loading={submitting === "approve-milestone"}
                        onClick={() => approveMilestone(milestone)}
                      >
                        <CheckCircle2 className="h-4 w-4" /> Nghiệm thu
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={!canReject}
                        onClick={() => setRejectOpen(milestone)}
                      >
                        <XCircle className="h-4 w-4" /> Từ chối
                      </Button>
                    </>
                  )}
                  {canInitiate && (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => setExpertDisputeOpen(milestone)}
                    >
                      <Gavel className="h-4 w-4" /> Khiếu nại
                    </Button>
                  )}
                  {canRequestIntervention && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setInterventionOpen(activeDispute)}
                    >
                      <Send className="h-4 w-4" /> Yêu cầu Staff
                    </Button>
                  )}
                  {canCancel && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setCancelOpen(activeDispute)}
                    >
                      Rút dispute
                    </Button>
                  )}
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

              <DisputeSection dispute={latestDispute} />

              {role === "BUSINESS" && milestoneDeliverables.length === 0 && (
                <div className="mt-4">
                  <Notice
                    tone="info"
                    title="Chưa có sản phẩm bàn giao từ backend nên chưa thể nghiệm thu milestone này."
                  />
                </div>
              )}
              {role === "BUSINESS" &&
                milestoneDeliverables.length > 0 &&
                !reviewableByBackend && (
                  <div className="mt-4">
                    <Notice
                      tone="warning"
                      title={`Backend đang trả milestone ở trạng thái ${milestone.status}; cần trạng thái UNDER_REVIEW trước khi nghiệm thu hoặc từ chối.`}
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
                      Sản phẩm bàn giao
                    </p>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500">
                      {milestoneDeliverables.length} mục
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
                            Sản phẩm bàn giao
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
                        Backend chưa có sản phẩm bàn giao cho milestone này.
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
        title="Nộp sản phẩm bàn giao"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setDeliverableOpen(null)}
              disabled={Boolean(submitting)}
            >
              Hủy
            </Button>
            <Button
              onClick={submitDeliverable}
              loading={submitting === "submit-deliverable"}
              disabled={Boolean(submitting)}
            >
              Nộp
            </Button>
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

      <Modal
        open={Boolean(rejectOpen)}
        onClose={() => setRejectOpen(null)}
        title="Từ chối sản phẩm bàn giao"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setRejectOpen(null)}
              disabled={Boolean(submitting)}
            >
              Hủy
            </Button>
            <Button
              variant="danger"
              onClick={rejectMilestone}
              loading={submitting === "reject-milestone"}
              disabled={Boolean(submitting)}
            >
              Từ chối
            </Button>
          </>
        }
      >
        <Field label="Lý do từ chối">
          <Textarea
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
          />
        </Field>
      </Modal>

      <Modal
        open={Boolean(expertDisputeOpen)}
        onClose={() => setExpertDisputeOpen(null)}
        title="Expert tạo dispute"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setExpertDisputeOpen(null)}
              disabled={Boolean(submitting)}
            >
              Hủy
            </Button>
            <Button
              variant="danger"
              onClick={initiateExpertDispute}
              loading={submitting === "initiate-dispute"}
              disabled={Boolean(submitting)}
            >
              Tạo dispute
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Field label="Loại tranh chấp">
            <Select
              value={expertDisputeForm.initiationType}
              onChange={(event) =>
                setExpertDisputeForm((value) => ({
                  ...value,
                  initiationType: event.target.value as DisputeInitiationType,
                }))
              }
            >
              {expertInitiationTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Modal>

      <Modal
        open={Boolean(interventionOpen)}
        onClose={() => setInterventionOpen(null)}
        title="Yêu cầu Staff can thiệp"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setInterventionOpen(null)}
              disabled={Boolean(submitting)}
            >
              Hủy
            </Button>
            <Button
              onClick={requestStaffIntervention}
              loading={submitting === "request-intervention"}
              disabled={Boolean(submitting)}
            >
              Gửi yêu cầu
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Field label="Lý do cần Staff can thiệp">
            <Textarea
              value={interventionForm.reason}
              onChange={(event) =>
                setInterventionForm((value) => ({
                  ...value,
                  reason: event.target.value,
                }))
              }
            />
          </Field>
          <Field label="Evidence/file URL">
            <Input
              value={interventionForm.evidenceFile}
              onChange={(event) =>
                setInterventionForm((value) => ({
                  ...value,
                  evidenceFile: event.target.value,
                }))
              }
            />
          </Field>
        </div>
      </Modal>

      <Modal
        open={Boolean(cancelOpen)}
        onClose={() => setCancelOpen(null)}
        title="Rút dispute"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setCancelOpen(null)}
              disabled={Boolean(submitting)}
            >
              Không
            </Button>
            <Button
              variant="danger"
              onClick={cancelDispute}
              loading={submitting === "cancel-dispute"}
              disabled={Boolean(submitting)}
            >
              Xác nhận rút
            </Button>
          </>
        }
      >
        <Notice tone="warning" title="Xác nhận rút dispute">
          Dispute chỉ có thể rút trước khi Staff bắt đầu xem xét.
        </Notice>
        <Field label="Lý do rút" className="mt-4">
          <Textarea
            value={cancelReason}
            onChange={(event) => setCancelReason(event.target.value)}
          />
        </Field>
      </Modal>
    </div>
  );
}

function DisputeSection({ dispute }: { dispute?: Dispute }) {
  if (!dispute) {
    return (
      <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-extrabold text-ink">Tranh chấp</p>
        <p className="mt-1 text-sm text-slate-500">
          Chưa có dispute nào cho milestone này.
        </p>
      </div>
    );
  }

  const reason =
    dispute.evidenceReport ||
    dispute.escalationReason ||
    dispute.staffDecisionNote ||
    dispute.cancellationReason;
  const evidenceFile = dispute.escalationEvidenceFile;
  const isResolved = dispute.status === "RESOLVED";
  const isStaffDecided = dispute.status === "STAFF_DECIDED";

  return (
    <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-2xl bg-white text-amber-700 shadow-sm">
          <AlertTriangle className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-ink">Tranh chấp</p>
          <p className="text-xs font-bold text-amber-800">
            {translateDisputeStatus(dispute.status)}
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 text-sm text-slate-700 md:grid-cols-2">
        <InfoLine
          label="Người khởi tạo"
          value={friendlyInitiator(dispute.initiatedBy)}
        />
        <InfoLine
          label="Loại tranh chấp"
          value={translateDisputeInitiationType(dispute.initiationType)}
        />
        <InfoLine label="Lý do" value={reason} wide />
        {evidenceFile && (
          <div className="md:col-span-2">
            <p className="text-xs font-bold text-slate-400">Evidence/file</p>
            <a
              href={evidenceFile}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex break-all text-sm font-bold text-brand-600 hover:text-brand-700"
            >
              Mở file bằng chứng
            </a>
          </div>
        )}
      </div>
      {isResolved && (
        <div className="mt-4 rounded-2xl bg-white p-4">
          <p className="text-sm font-extrabold text-ink">Kết quả settlement</p>
          <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
            <InfoLine
              label="Tỷ lệ Expert"
              value={
                dispute.staffDecisionPercentage !== undefined
                  ? `${dispute.staffDecisionPercentage}%`
                  : undefined
              }
            />
            <InfoLine
              label="Expert nhận"
              value={
                dispute.staffProposedExpertAmount !== undefined
                  ? formatCurrency(dispute.staffProposedExpertAmount)
                  : undefined
              }
            />
            <InfoLine
              label="Business hoàn"
              value={
                dispute.businessRefundAmount !== undefined
                  ? formatCurrency(dispute.businessRefundAmount)
                  : undefined
              }
            />
          </div>
          {dispute.staffReport && (
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {dispute.staffReport}
            </p>
          )}
        </div>
      )}
      {isStaffDecided && (
        <Notice
          tone="info"
          title="Staff đã ra quyết định. Settlement đang chờ backend xử lý."
          className="mt-4"
        />
      )}
    </div>
  );
}

function InfoLine({
  label,
  value,
  wide = false,
}: {
  label: string;
  value?: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "md:col-span-2" : undefined}>
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 break-words font-semibold text-slate-700">
        {value || "Chưa có dữ liệu từ backend"}
      </p>
    </div>
  );
}

function friendlyInitiator(initiator?: string) {
  if (initiator === "BUSINESS") return "Business";
  if (initiator === "EXPERT") return "Expert";
  return "Chưa xác định";
}

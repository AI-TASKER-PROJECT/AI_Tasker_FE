import {
  FileText,
  Scale,
  UserCheck,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { adminApi, disputeApi, getApiErrorMessage } from "../../../lib/api";
import {
  canAdminAssignStaff,
  canInitiatorCancelDispute,
  canStaffIssueDecision,
  canStaffRejectIntervention,
  translateDisputeInitiationType,
  translateDisputeStatus,
} from "../../../lib/dispute";
import { useSession } from "../../../lib/session";
import { formatCurrency, formatDateTime } from "../../../lib/utils";
import type { Dispute, Staff } from "../../../types";
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
  SectionHeading,
  Select,
  StatusBadge,
  Textarea,
} from "../../../components/ui";

type ActionName =
  | "assign"
  | "cancel"
  | "reject-intervention"
  | "staff-decision";

export function DisputeDetailPage({
  staffMode = false,
}: {
  staffMode?: boolean;
}) {
  const { disputeId } = useParams();
  const session = useSession();
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [assignOpen, setAssignOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [staffId, setStaffId] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [decision, setDecision] = useState({
    expertPercent: 50,
    staffReport: "",
    note: "",
  });
  const [submitting, setSubmitting] = useState<ActionName | null>(null);

  const numericDisputeId = Number(disputeId);

  const loadDispute = useCallback(async () => {
    if (!Number.isFinite(numericDisputeId) || numericDisputeId <= 0) {
      setDispute(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await disputeApi.get(numericDisputeId);
      setDispute(data);
      setStaffId(data.assignedStaffId ? String(data.assignedStaffId) : "");
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
      setDispute(null);
    } finally {
      setLoading(false);
    }
  }, [numericDisputeId]);

  useEffect(() => {
    const run = async () => {
      await loadDispute();
    };
    void run();
  }, [loadDispute]);

  useEffect(() => {
    if (session?.role !== "ADMIN") return;
    adminApi
      .listStaffs()
      .then(setStaffs)
      .catch(() => setStaffs([]));
  }, [session?.role]);

  const runAction = async (
    action: ActionName,
    handler: () => Promise<void>,
  ) => {
    setSubmitting(action);
    setError("");
    setNotice("");
    try {
      await handler();
      await loadDispute();
    } catch (actionError) {
      setError(getApiErrorMessage(actionError));
      await loadDispute();
    } finally {
      setSubmitting(null);
    }
  };

  const assign = async () => {
    if (!dispute || !staffId) return;
    await runAction("assign", async () => {
      await disputeApi.assignStaff(dispute.disputeId, {
        staffId: Number(staffId),
      });
      setAssignOpen(false);
      setNotice("Đã assign Staff theo phản hồi backend.");
    });
  };

  const cancelDispute = async () => {
    if (!dispute) return;
    await runAction("cancel", async () => {
      await disputeApi.cancel(dispute.disputeId, { reason: cancelReason });
      setCancelOpen(false);
      setCancelReason("");
      setNotice("Đã cancel dispute theo phản hồi backend.");
    });
  };

  const rejectIntervention = async () => {
    if (!dispute) return;
    await runAction("reject-intervention", async () => {
      await disputeApi.rejectIntervention(dispute.disputeId, {
        reason: rejectReason,
      });
      setRejectOpen(false);
      setRejectReason("");
      setNotice("Staff đã từ chối can thiệp. Trạng thái mới lấy từ backend.");
    });
  };

  const issueDecision = async () => {
    if (!dispute) return;
    await runAction("staff-decision", async () => {
      await disputeApi.issueStaffDecision(dispute.disputeId, {
        expertPercent: decision.expertPercent,
        staffReport: decision.staffReport,
        note: decision.note,
      });
      setDecisionOpen(false);
      setNotice("Staff đã gửi quyết định. Settlement sẽ do backend xử lý.");
    });
  };

  if (loading) {
    return (
      <EmptyState
        title="Đang tải dispute"
        description="Đang lấy chi tiết tranh chấp từ backend."
      />
    );
  }

  if (!dispute) {
    return (
      <EmptyState
        title="Không tìm thấy dispute"
        description={error || "Dữ liệu dispute được lấy trực tiếp từ backend."}
      />
    );
  }

  const role = session?.role;
  const canAssign = canAdminAssignStaff(role, dispute.status);
  const canCancel =
    role === "ADMIN" && canInitiatorCancelDispute("ADMIN", dispute);
  const canReject = canStaffRejectIntervention(
    role,
    dispute,
    session?.staffId,
  );
  const canDecide = canStaffIssueDecision(role, dispute, session?.staffId);

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          title={staffMode ? "Chi tiết ticket dispute" : "Chi tiết dispute"}
          description="Frontend chỉ gửi action nghiệp vụ; trạng thái và settlement luôn lấy lại từ backend."
          actions={
            <div className="flex flex-wrap gap-2">
              {canAssign && (
                <Button variant="secondary" onClick={() => setAssignOpen(true)}>
                  <UserCheck className="h-4 w-4" />
                  Assign Staff
                </Button>
              )}
              {canCancel && (
                <Button variant="danger" onClick={() => setCancelOpen(true)}>
                  <XCircle className="h-4 w-4" />
                  Cancel invalid
                </Button>
              )}
              {canReject && (
                <Button
                  variant="secondary"
                  onClick={() => setRejectOpen(true)}
                >
                  <XCircle className="h-4 w-4" />
                  Từ chối can thiệp
                </Button>
              )}
              {canDecide && (
                <Button onClick={() => setDecisionOpen(true)}>
                  <Scale className="h-4 w-4" />
                  Ra quyết định
                </Button>
              )}
            </div>
          }
        />
      </div>

      {error && <Notice tone="danger" title={error} />}
      {notice && <Notice tone="success" title={notice} />}

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <Card className="p-6">
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={translateDisputeStatus(dispute.status)} />
            <Badge tone="brand">{friendlyInitiator(dispute.initiatedBy)}</Badge>
            {dispute.assignedStaffId ? (
              <Badge tone="mint">Đã assign Staff</Badge>
            ) : (
              <Badge tone="amber">Chưa assign Staff</Badge>
            )}
          </div>

          <SectionHeading
            title="Thông tin dispute"
            description="Thông tin được render từ response backend hiện có."
          />
          <div className="mt-5 grid gap-4 rounded-3xl bg-slate-50 p-5 text-sm text-slate-700 md:grid-cols-2">
            <InfoLine
              label="Loại tranh chấp"
              value={translateDisputeInitiationType(dispute.initiationType)}
            />
            <InfoLine
              label="Trạng thái"
              value={translateDisputeStatus(dispute.status)}
            />
            <InfoLine
              label="Lý do ban đầu"
              value={dispute.evidenceReport}
              wide
            />
            <InfoLine
              label="Lý do yêu cầu Staff"
              value={dispute.escalationReason}
              wide
            />
            {dispute.escalationEvidenceFile && (
              <div className="md:col-span-2">
                <p className="text-xs font-bold text-slate-400">Evidence/file</p>
                <a
                  href={dispute.escalationEvidenceFile}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex break-all font-bold text-brand-600 hover:text-brand-700"
                >
                  Mở file bằng chứng
                </a>
              </div>
            )}
          </div>

          {dispute.status === "STAFF_REVIEWING" && role === "STAFF" && (
            <Notice
              tone="warning"
              title="Quyết định của Staff là bắt buộc và sẽ được backend xử lý settlement."
              className="mt-5"
            />
          )}
        </Card>

        <Card className="p-6">
          <SectionHeading title="Settlement result" />
          <div className="mt-5 grid gap-3">
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
            <InfoLine label="Decision reason" value={dispute.staffDecisionNote} />
            <InfoLine label="Staff report" value={dispute.staffReport} />
            <InfoLine
              label="Settlement executed"
              value={formatOptionalDateTime(dispute.settlementExecutedAt)}
            />
          </div>
          <Notice tone="info" title="Không xử lý ví ở frontend" className="mt-5">
            Frontend không tự chuyển tiền và không tự cập nhật ví; chỉ hiển thị
            kết quả settlement do backend trả về.
          </Notice>
          {dispute.status === "STAFF_DECIDED" && (
            <Notice
              tone="info"
              title="Staff đã ra quyết định. Settlement đang chờ backend xử lý."
              className="mt-3"
            />
          )}
        </Card>
      </div>

      <Modal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        title="Assign Staff"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setAssignOpen(false)}
              disabled={Boolean(submitting)}
            >
              Hủy
            </Button>
            <Button
              onClick={assign}
              loading={submitting === "assign"}
              disabled={Boolean(submitting) || !staffId}
            >
              Assign
            </Button>
          </>
        }
      >
        <Field label="Staff xử lý">
          <Select value={staffId} onChange={(event) => setStaffId(event.target.value)}>
            <option value="">Chọn Staff</option>
            {staffs.map((staff) => (
              <option key={staff.staffId} value={staff.staffId}>
                {staff.fullName || staff.email || "Staff"}
              </option>
            ))}
          </Select>
        </Field>
      </Modal>

      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel dispute invalid/duplicate"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setCancelOpen(false)}
              disabled={Boolean(submitting)}
            >
              Hủy
            </Button>
            <Button
              variant="danger"
              onClick={cancelDispute}
              loading={submitting === "cancel"}
              disabled={Boolean(submitting)}
            >
              Cancel dispute
            </Button>
          </>
        }
      >
        <Notice tone="warning" title="Admin chỉ cancel dispute không hợp lệ">
          Admin không nhập payout percentage và không ra quyết định chuyên môn.
        </Notice>
        <Field label="Lý do cancel" className="mt-4">
          <Textarea
            value={cancelReason}
            onChange={(event) => setCancelReason(event.target.value)}
          />
        </Field>
      </Modal>

      <Modal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Staff từ chối can thiệp"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setRejectOpen(false)}
              disabled={Boolean(submitting)}
            >
              Hủy
            </Button>
            <Button
              variant="danger"
              onClick={rejectIntervention}
              loading={submitting === "reject-intervention"}
              disabled={Boolean(submitting)}
            >
              Từ chối
            </Button>
          </>
        }
      >
        <Field label="Lý do từ chối can thiệp">
          <Textarea
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
          />
        </Field>
      </Modal>

      <Modal
        open={decisionOpen}
        onClose={() => setDecisionOpen(false)}
        title="Staff mandatory decision"
        description="Quyết định của Staff là bắt buộc và sẽ được backend xử lý settlement."
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setDecisionOpen(false)}
              disabled={Boolean(submitting)}
            >
              Hủy
            </Button>
            <Button
              onClick={issueDecision}
              loading={submitting === "staff-decision"}
              disabled={Boolean(submitting)}
            >
              Gửi quyết định
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Notice tone="warning" title="Quyết định của Staff là bắt buộc và sẽ được backend xử lý settlement." />
          <Field label="Payout percentage cho Expert">
            <Input
              type="number"
              min={0}
              max={100}
              value={decision.expertPercent}
              onChange={(event) =>
                setDecision((value) => ({
                  ...value,
                  expertPercent: clampPercent(Number(event.target.value)),
                }))
              }
            />
          </Field>
          <Field label="Decision reason">
            <Textarea
              value={decision.note}
              onChange={(event) =>
                setDecision((value) => ({ ...value, note: event.target.value }))
              }
            />
          </Field>
          <Field label="Staff report">
            <Textarea
              value={decision.staffReport}
              onChange={(event) =>
                setDecision((value) => ({
                  ...value,
                  staffReport: event.target.value,
                }))
              }
            />
          </Field>
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            <div className="flex gap-2">
              <FileText className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Backend hiện nhận payout percentage, staff report và decision
                reason. Evidence summary chưa có field riêng trong API hiện tại.
              </p>
            </div>
          </div>
        </div>
      </Modal>
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
  if (initiator === "BUSINESS") return "Business khởi tạo";
  if (initiator === "EXPERT") return "Expert khởi tạo";
  return "Người khởi tạo chưa xác định";
}

function formatOptionalDateTime(value?: string) {
  return value ? formatDateTime(value) : undefined;
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}



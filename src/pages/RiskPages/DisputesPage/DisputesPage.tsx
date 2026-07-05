import { Filter, UserCheck, XCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { adminApi, contractApi, disputeApi, getApiErrorMessage } from "../../../lib/api";
import {
  canAdminAssignStaff,
  canInitiatorCancelDispute,
  isActiveDisputeStatus,
  translateDisputeInitiationType,
  translateDisputeStatus,
} from "../../../lib/dispute";
import { useSession } from "../../../lib/session";
import type { Dispute, DisputeStatus, Staff } from "../../../types";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  LinkButton,
  Modal,
  Notice,
  PageHeader,
  SearchInput,
  Select,
  StatusBadge,
  Textarea,
} from "../../../components/ui";

const statusOptions: Array<{ value: "ALL" | DisputeStatus; label: string }> = [
  { value: "ALL", label: "Tất cả trạng thái" },
  { value: "PENDING_SELF_RESOLVE", label: translateDisputeStatus("PENDING_SELF_RESOLVE") || "" },
  { value: "ESCALATION_REQUESTED", label: translateDisputeStatus("ESCALATION_REQUESTED") || "" },
  { value: "STAFF_REVIEWING", label: translateDisputeStatus("STAFF_REVIEWING") || "" },
  { value: "INTERVENTION_REJECTED", label: translateDisputeStatus("INTERVENTION_REJECTED") || "" },
  { value: "STAFF_DECIDED", label: translateDisputeStatus("STAFF_DECIDED") || "" },
  { value: "RESOLVED", label: translateDisputeStatus("RESOLVED") || "" },
  { value: "CANCELLED", label: translateDisputeStatus("CANCELLED") || "" },
];

export function DisputesPage({ staffMode = false }: { staffMode?: boolean }) {
  const session = useSession();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"ALL" | DisputeStatus>(
    staffMode ? "STAFF_REVIEWING" : "ALL",
  );
  const [items, setItems] = useState<Dispute[]>([]);
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [assignOpen, setAssignOpen] = useState<Dispute | null>(null);
  const [cancelOpen, setCancelOpen] = useState<Dispute | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadDisputes = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const contracts = await contractApi.listContracts();
      const groups = await Promise.all(
        contracts.map((contract) =>
          disputeApi.listByContract(contract.contractId).catch(() => []),
        ),
      );
      setItems(groups.flat());
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const run = async () => {
      await loadDisputes();
    };
    void run();
  }, [loadDisputes]);

  useEffect(() => {
    if (session?.role !== "ADMIN") return;
    adminApi
      .listStaffs()
      .then(setStaffs)
      .catch(() => setStaffs([]));
  }, [session?.role]);

  const disputes = useMemo(() => {
    return items
      .filter((item) => {
        if (!staffMode || session?.role !== "STAFF") return true;
        return Boolean(
          session.staffId && item.assignedStaffId === session.staffId,
        );
      })
      .filter((item) => (status === "ALL" ? true : item.status === status))
      .filter((item) => {
        const haystack = [
          translateDisputeStatus(item.status),
          translateDisputeInitiationType(item.initiationType),
          item.evidenceReport,
          item.escalationReason,
          item.staffReport,
          item.cancellationReason,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(query.toLowerCase());
      });
  }, [items, query, session, staffMode, status]);

  const assignStaff = async () => {
    if (!assignOpen || !selectedStaffId) return;
    setSubmitting(true);
    setNotice("");
    try {
      await disputeApi.assignStaff(assignOpen.disputeId, {
        staffId: Number(selectedStaffId),
      });
      setAssignOpen(null);
      setSelectedStaffId("");
      await loadDisputes();
      setNotice("Đã assign Staff. Dữ liệu mới được lấy lại từ backend.");
    } catch (assignError) {
      setError(getApiErrorMessage(assignError));
      await loadDisputes();
    } finally {
      setSubmitting(false);
    }
  };

  const cancelDispute = async () => {
    if (!cancelOpen) return;
    setSubmitting(true);
    setNotice("");
    try {
      await disputeApi.cancel(cancelOpen.disputeId, { reason: cancelReason });
      setCancelOpen(null);
      setCancelReason("");
      await loadDisputes();
      setNotice("Đã cancel dispute theo phản hồi từ backend.");
    } catch (cancelError) {
      setError(getApiErrorMessage(cancelError));
      await loadDisputes();
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <EmptyState
        title="Đang tải dispute"
        description="Đang lấy danh sách tranh chấp từ backend."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          title={
            staffMode
              ? session?.role === "ADMIN"
                ? "Dispute cần xử lý"
                : "Dispute được assign"
              : "Tranh chấp của dự án"
          }
          description={
            staffMode
              ? "Admin assign Staff; Staff review và ra quyết định chuyên môn trong detail."
              : "Theo dõi dispute của các contract đang tham gia."
          }
        />
      </div>

      {error && <Notice tone="danger" title={error} />}
      {notice && <Notice tone="success" title={notice} />}

      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_260px]">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Tìm theo trạng thái, loại tranh chấp, nội dung..."
          />
          <div className="relative">
            <Filter className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as "ALL" | DisputeStatus)
              }
              className="pl-10"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Card>

      {disputes.length === 0 ? (
        <EmptyState
          title="Chưa có dispute phù hợp"
          description="Không có tranh chấp nào khớp filter hiện tại."
        />
      ) : (
        <div className="grid gap-4">
          {disputes.map((dispute) => {
            const canAssign = canAdminAssignStaff(session?.role, dispute.status);
            const canCancel =
              session?.role === "ADMIN" &&
              canInitiatorCancelDispute("ADMIN", dispute);
            return (
              <Card key={dispute.disputeId} className="p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge
                        status={translateDisputeStatus(dispute.status)}
                      />
                      <Badge tone={isActiveDisputeStatus(dispute.status) ? "amber" : "slate"}>
                        {friendlyInitiator(dispute.initiatedBy)}
                      </Badge>
                    </div>
                    <h3 className="mt-3 font-display text-lg font-extrabold text-ink">
                      {translateDisputeInitiationType(dispute.initiationType) ||
                        "Tranh chấp milestone"}
                    </h3>
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                      {dispute.escalationReason ||
                        dispute.evidenceReport ||
                        dispute.staffDecisionNote ||
                        "Backend chưa có mô tả chi tiết cho dispute này."}
                    </p>
                    {dispute.escalationEvidenceFile && (
                      <a
                        href={dispute.escalationEvidenceFile}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex text-sm font-bold text-brand-600 hover:text-brand-700"
                      >
                        Mở file bằng chứng
                      </a>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {canAssign && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setAssignOpen(dispute);
                          setSelectedStaffId("");
                        }}
                      >
                        <UserCheck className="h-4 w-4" />
                        Assign Staff
                      </Button>
                    )}
                    {canCancel && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setCancelOpen(dispute)}
                      >
                        <XCircle className="h-4 w-4" />
                        Cancel
                      </Button>
                    )}
                    <LinkButton
                      to={
                        staffMode
                          ? `/app/tickets/${dispute.disputeId}`
                          : `/app/disputes/${dispute.disputeId}`
                      }
                      variant="secondary"
                      size="sm"
                    >
                      Xem chi tiết
                    </LinkButton>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={Boolean(assignOpen)}
        onClose={() => setAssignOpen(null)}
        title="Assign Staff"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setAssignOpen(null)}
              disabled={submitting}
            >
              Hủy
            </Button>
            <Button
              onClick={assignStaff}
              loading={submitting}
              disabled={submitting || !selectedStaffId}
            >
              Assign
            </Button>
          </>
        }
      >
        <Field label="Staff xử lý">
          <Select
            value={selectedStaffId}
            onChange={(event) => setSelectedStaffId(event.target.value)}
          >
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
        open={Boolean(cancelOpen)}
        onClose={() => setCancelOpen(null)}
        title="Cancel dispute"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setCancelOpen(null)}
              disabled={submitting}
            >
              Hủy
            </Button>
            <Button
              variant="danger"
              onClick={cancelDispute}
              loading={submitting}
              disabled={submitting}
            >
              Cancel dispute
            </Button>
          </>
        }
      >
        <Notice tone="warning" title="Chỉ cancel dispute invalid/duplicate">
          Admin không ra quyết định chuyên môn và không nhập payout percentage.
        </Notice>
        <Field label="Lý do cancel" className="mt-4">
          <Textarea
            value={cancelReason}
            onChange={(event) => setCancelReason(event.target.value)}
          />
        </Field>
      </Modal>
    </div>
  );
}

function friendlyInitiator(initiator?: string) {
  if (initiator === "BUSINESS") return "Business khởi tạo";
  if (initiator === "EXPERT") return "Expert khởi tạo";
  return "Người khởi tạo chưa xác định";
}

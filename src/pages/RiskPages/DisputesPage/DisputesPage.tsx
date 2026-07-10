import {
  CheckCircle2,
  ClipboardList,
  Filter,
  Gavel,
  ReceiptText,
  Search,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  adminApi,
  contractApi,
  disputeApi,
  getApiErrorMessage,
} from "../../../lib/api";
import {
  canAdminAssignStaff,
  canInitiatorCancelDispute,
  isActiveDisputeStatus,
  translateDisputeInitiationType,
  translateDisputeStatus,
} from "../../../lib/dispute";
import { useSession } from "../../../lib/session";
import { formatCurrency } from "../../../lib/utils";
import type {
  Contract,
  Dispute,
  DisputeStatus,
  Staff,
  TerminationRequest,
} from "../../../types";
import {
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
  Select,
  StatusBadge,
  Tabs,
  Textarea,
} from "../../../components/ui";

const statusOptions: Array<{ value: "ALL" | DisputeStatus; label: string }> = [
  { value: "ALL", label: "Tất cả dispute" },
  { value: "PENDING_SELF_RESOLVE", label: translateDisputeStatus("PENDING_SELF_RESOLVE") || "" },
  { value: "ESCALATION_REQUESTED", label: translateDisputeStatus("ESCALATION_REQUESTED") || "" },
  { value: "STAFF_REVIEWING", label: translateDisputeStatus("STAFF_REVIEWING") || "" },
  { value: "STAFF_DECIDED", label: translateDisputeStatus("STAFF_DECIDED") || "" },
  { value: "RESOLVED", label: translateDisputeStatus("RESOLVED") || "" },
  { value: "CANCELLED", label: translateDisputeStatus("CANCELLED") || "" },
];

const terminationStatusLabels: Record<string, string> = {
  REQUESTED: "Chờ Admin gán Staff",
  STAFF_REVIEWING: "Staff đang xem xét",
  STAFF_APPROVED: "Staff đã duyệt",
  STAFF_REJECTED: "Staff từ chối",
  AWAITING_SETTLEMENT_EXECUTION: "Chờ execute settlement",
  AWAITING_DEPOSIT_REFUND: "Chờ hoàn cọc hợp đồng",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã hủy/rút",
};

function normalizeStatus(status?: string) {
  return (status || "").trim().replace(/[\s-]+/g, "_").toUpperCase();
}

function translateTerminationStatus(status?: string) {
  const normalized = normalizeStatus(status);
  return terminationStatusLabels[normalized] || status || "Chưa có trạng thái";
}

function isAssignedToCurrentStaff(
  assignedStaffId: number | undefined,
  currentStaffId: number | undefined,
) {
  if (!currentStaffId) return true;
  return assignedStaffId === currentStaffId;
}

function contractTitle(contract?: Contract) {
  return (
    contract?.contractTitle ||
    contract?.title ||
    (contract ? `Contract #${contract.contractId}` : "Contract")
  );
}

type WorkTab = "overview" | "disputes" | "terminations" | "settlement";

export function DisputesPage({ staffMode = false }: { staffMode?: boolean }) {
  const session = useSession();
  const [activeTab, setActiveTab] = useState<WorkTab>("overview");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"ALL" | DisputeStatus>("ALL");
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [terminations, setTerminations] = useState<TerminationRequest[]>([]);
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [modalError, setModalError] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [assignDisputeOpen, setAssignDisputeOpen] = useState<Dispute | null>(null);
  const [cancelDisputeOpen, setCancelDisputeOpen] = useState<Dispute | null>(null);
  const [executeDisputeOpen, setExecuteDisputeOpen] = useState<Dispute | null>(null);
  const [cancelDisputeReason, setCancelDisputeReason] = useState("");
  const [assignTerminationOpen, setAssignTerminationOpen] = useState<TerminationRequest | null>(null);
  const [rejectTerminationOpen, setRejectTerminationOpen] = useState<TerminationRequest | null>(null);
  const [approveTerminationOpen, setApproveTerminationOpen] = useState<TerminationRequest | null>(null);
  const [cancelTerminationOpen, setCancelTerminationOpen] = useState<TerminationRequest | null>(null);
  const [executeTerminationOpen, setExecuteTerminationOpen] = useState<TerminationRequest | null>(null);
  const [refundTerminationOpen, setRefundTerminationOpen] = useState<TerminationRequest | null>(null);
  const [terminationReason, setTerminationReason] = useState("");
  const [approveForm, setApproveForm] = useState({
    expertPayoutPercentage: "0",
    staffDecisionReason: "",
    staffReport: "",
    partialEvidenceRequired: false,
  });
  const [refundFull, setRefundFull] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const contractById = useMemo(
    () => new Map(contracts.map((contract) => [contract.contractId, contract])),
    [contracts],
  );

  const loadQueues = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const contractItems = await contractApi.listContracts();
      const [disputeGroups, terminationGroups] = await Promise.all([
        Promise.all(
          contractItems.map((contract) =>
            disputeApi.listByContract(contract.contractId).catch(() => []),
          ),
        ),
        Promise.all(
          contractItems.map((contract) =>
            contractApi.listTerminationRequests(contract.contractId).catch(() => []),
          ),
        ),
      ]);
      setContracts(contractItems);
      setDisputes(disputeGroups.flat());
      setTerminations(terminationGroups.flat());
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
      setContracts([]);
      setDisputes([]);
      setTerminations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadQueues();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadQueues]);

  useEffect(() => {
    if (session?.role !== "ADMIN") return;
    adminApi
      .listStaffs()
      .then(setStaffs)
      .catch(() => setStaffs([]));
  }, [session?.role]);

  const searchedDisputes = useMemo(() => {
    return disputes
      .filter((item) => {
        if (!staffMode || session?.role !== "STAFF") return true;
        return isAssignedToCurrentStaff(item.assignedStaffId, session.staffId);
      })
      .filter((item) =>
        status === "ALL" ? true : normalizeStatus(item.status) === status,
      )
      .filter((item) => {
        const haystack = [
          contractTitle(contractById.get(item.contractId)),
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
  }, [contractById, disputes, query, session, staffMode, status]);

  const searchedTerminations = useMemo(() => {
    return terminations
      .filter((item) => {
        if (session?.role === "ADMIN") {
          return [
            "REQUESTED",
            "AWAITING_SETTLEMENT_EXECUTION",
            "AWAITING_DEPOSIT_REFUND",
          ].includes(normalizeStatus(item.status));
        }
        if (session?.role === "STAFF") {
          return isAssignedToCurrentStaff(item.assignedStaffId, session.staffId);
        }
        return !staffMode;
      })
      .filter((item) => {
        const haystack = [
          contractTitle(contractById.get(item.contractId)),
          translateTerminationStatus(item.status),
          item.requestReason,
          item.staffDecisionReason,
          item.staffReport,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(query.toLowerCase());
      });
  }, [contractById, query, session, staffMode, terminations]);

  const adminBoard = useMemo(
    () => ({
      assignDisputes: searchedDisputes.filter(
        (item) => normalizeStatus(item.status) === "ESCALATION_REQUESTED",
      ),
      executeDisputes: searchedDisputes.filter(
        (item) => normalizeStatus(item.status) === "STAFF_DECIDED",
      ),
      assignTerminations: searchedTerminations.filter(
        (item) => normalizeStatus(item.status) === "REQUESTED",
      ),
      executeTerminations: searchedTerminations.filter(
        (item) => normalizeStatus(item.status) === "AWAITING_SETTLEMENT_EXECUTION",
      ),
      refundTerminations: searchedTerminations.filter(
        (item) => normalizeStatus(item.status) === "AWAITING_DEPOSIT_REFUND",
      ),
    }),
    [searchedDisputes, searchedTerminations],
  );

  const staffBoard = useMemo(
    () => ({
      disputeReviews: searchedDisputes.filter(
        (item) => normalizeStatus(item.status) === "STAFF_REVIEWING",
      ),
      terminationReviews: searchedTerminations.filter(
        (item) => normalizeStatus(item.status) === "STAFF_REVIEWING",
      ),
    }),
    [searchedDisputes, searchedTerminations],
  );

  const urgentCount =
    session?.role === "ADMIN"
      ? adminBoard.assignDisputes.length +
        adminBoard.assignTerminations.length +
        adminBoard.executeDisputes.length +
        adminBoard.executeTerminations.length +
        adminBoard.refundTerminations.length
      : staffBoard.disputeReviews.length + staffBoard.terminationReviews.length;

  async function runAction(handler: () => Promise<unknown>, success: string) {
    setSubmitting(true);
    setError("");
    setNotice("");
    setModalError("");
    try {
      await handler();
      closeModals();
      await loadQueues();
      setNotice(success);
    } catch (actionError) {
      const message = getApiErrorMessage(actionError);
      setError(message);
      setModalError(message);
      await loadQueues();
    } finally {
      setSubmitting(false);
    }
  }

  function closeModals() {
    setAssignDisputeOpen(null);
    setCancelDisputeOpen(null);
    setExecuteDisputeOpen(null);
    setAssignTerminationOpen(null);
    setRejectTerminationOpen(null);
    setApproveTerminationOpen(null);
    setCancelTerminationOpen(null);
    setExecuteTerminationOpen(null);
    setRefundTerminationOpen(null);
    setSelectedStaffId("");
    setModalError("");
    setCancelDisputeReason("");
    setTerminationReason("");
    setApproveForm({
      expertPayoutPercentage: "0",
      staffDecisionReason: "",
      staffReport: "",
      partialEvidenceRequired: false,
    });
    setRefundFull(true);
  }

  if (loading) {
    return (
      <EmptyState
        title="Đang tải work queue"
        description="Đang lấy dispute và termination request từ backend."
      />
    );
  }

  const isAdminBoard = staffMode && session?.role === "ADMIN";
  const isStaffBoard = staffMode && session?.role === "STAFF";

  return (
    <div className="space-y-6">
      <Card className="p-6 md:p-8">
        <PageHeader
          eyebrow={isAdminBoard ? "ADMIN OPERATIONS" : isStaffBoard ? "STAFF REVIEW" : "DISPUTES"}
          title={
            isAdminBoard
              ? "Bảng điều phối xử lý"
              : isStaffBoard
                ? "Hàng chờ review"
                : "Tranh chấp của dự án"
          }
          description={
            isAdminBoard
              ? "Tập trung vào việc cần Admin xử lý: gán Staff, execute settlement và hoàn cọc hợp đồng."
              : isStaffBoard
                ? "Chỉ hiển thị case được giao hoặc đang cần Staff ra quyết định."
                : "Theo dõi dispute của các contract đang tham gia."
          }
        />
      </Card>

      {error && <Notice tone="danger" title={error} />}
      {notice && <Notice tone="success" title={notice} />}
      {isStaffBoard && !session?.staffId && (
        <Notice tone="warning" title="Session hiện chưa có staffId">
          Frontend đang hiển thị các ticket Staff-review mà backend trả về. Khi
          session có staffId, danh sách sẽ tự lọc đúng ticket được assign cho
          Staff hiện tại.
        </Notice>
      )}

      {staffMode && (
        <div className="grid gap-4 md:grid-cols-4">
          <QueueMetric
            label="Cần xử lý"
            value={urgentCount}
            tone="brand"
            icon={<ClipboardList className="h-5 w-5" />}
          />
          <QueueMetric
            label="Dispute"
            value={
              isAdminBoard
                ? adminBoard.assignDisputes.length + adminBoard.executeDisputes.length
                : staffBoard.disputeReviews.length
            }
            tone="amber"
            icon={<Gavel className="h-5 w-5" />}
          />
          <QueueMetric
            label="Termination"
            value={
              isAdminBoard
                ? adminBoard.assignTerminations.length +
                  adminBoard.executeTerminations.length +
                  adminBoard.refundTerminations.length
                : staffBoard.terminationReviews.length
            }
            tone="mint"
            icon={<ShieldCheck className="h-5 w-5" />}
          />
          <QueueMetric
            label="Contracts quét"
            value={contracts.length}
            tone="slate"
            icon={<Search className="h-5 w-5" />}
          />
        </div>
      )}

      <Card className="p-4">
        <div className="grid gap-4 xl:grid-cols-[auto_1fr_260px] xl:items-center">
          {staffMode && (
            <Tabs
              active={activeTab}
              onChange={(value) => setActiveTab(value as WorkTab)}
              tabs={[
                { id: "overview", label: "Tổng quan", count: urgentCount },
                { id: "disputes", label: "Dispute", count: searchedDisputes.length },
                {
                  id: "terminations",
                  label: "Termination",
                  count: searchedTerminations.length,
                },
                ...(isAdminBoard
                  ? [
                      {
                        id: "settlement",
                        label: "Settlement",
                        count:
                          adminBoard.executeDisputes.length +
                          adminBoard.executeTerminations.length +
                          adminBoard.refundTerminations.length,
                      },
                    ]
                  : []),
              ]}
            />
          )}
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Tìm theo contract, trạng thái, nội dung..."
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

      {isAdminBoard && activeTab === "overview" && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <FlowGroup
            eyebrow="Ưu tiên hôm nay"
            title="Việc đang chờ Admin"
            description="Các bước có thể xử lý ngay, được sắp theo thứ tự vận hành."
          >
            <Lane
              icon={<UserCheck className="h-5 w-5" />}
              step="1"
              title="Gán Staff"
              description="Dispute/termination mới cần người review."
              count={adminBoard.assignDisputes.length + adminBoard.assignTerminations.length}
            >
              {adminBoard.assignDisputes.map((dispute) => (
                <DisputeCard
                  key={`d-${dispute.disputeId}`}
                  dispute={dispute}
                  contract={contractById.get(dispute.contractId)}
                  staffMode={staffMode}
                  actions={
                    <>
                      <Button size="sm" variant="secondary" onClick={() => setAssignDisputeOpen(dispute)}>
                        <UserCheck className="h-4 w-4" />
                        Gán Staff
                      </Button>
                      {canInitiatorCancelDispute("ADMIN", dispute) && (
                        <Button size="sm" variant="danger" onClick={() => setCancelDisputeOpen(dispute)}>
                          Cancel
                        </Button>
                      )}
                    </>
                  }
                />
              ))}
              {adminBoard.assignTerminations.map((request) => (
                <TerminationCard
                  key={`t-${request.terminationRequestId}`}
                  request={request}
                  contract={contractById.get(request.contractId)}
                  actions={
                    <>
                      <Button size="sm" variant="secondary" onClick={() => setAssignTerminationOpen(request)}>
                        <UserCheck className="h-4 w-4" />
                        Gán Staff
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => setCancelTerminationOpen(request)}>
                        Cancel
                      </Button>
                    </>
                  }
                />
              ))}
            </Lane>
            <Lane
              icon={<ReceiptText className="h-5 w-5" />}
              step="2"
              title="Execute"
              description="Staff đã quyết định, Admin xác nhận để backend xử lý."
              count={adminBoard.executeDisputes.length + adminBoard.executeTerminations.length}
            >
              {adminBoard.executeDisputes.map((dispute) => (
                <DisputeCard
                  key={dispute.disputeId}
                  dispute={dispute}
                  contract={contractById.get(dispute.contractId)}
                  staffMode={staffMode}
                  actions={
                    <Button size="sm" onClick={() => setExecuteDisputeOpen(dispute)}>
                      Execute
                    </Button>
                  }
                />
              ))}
              {adminBoard.executeTerminations.map((request) => (
                <TerminationCard
                  key={request.terminationRequestId}
                  request={request}
                  contract={contractById.get(request.contractId)}
                  actions={
                    <Button size="sm" onClick={() => setExecuteTerminationOpen(request)}>
                      Execute
                    </Button>
                  }
                />
              ))}
            </Lane>
            <Lane
              icon={<ShieldCheck className="h-5 w-5" />}
              step="3"
              title="Hoàn cọc"
              description="Contract deposit đang chờ quyết định hoàn/không hoàn."
              count={adminBoard.refundTerminations.length}
            >
              {adminBoard.refundTerminations.map((request) => (
                <TerminationCard
                  key={request.terminationRequestId}
                  request={request}
                  contract={contractById.get(request.contractId)}
                  actions={
                    <Button
                      size="sm"
                      onClick={() => {
                        setRefundFull(true);
                        setRefundTerminationOpen(request);
                      }}
                    >
                      Hoàn cọc
                    </Button>
                  }
                />
              ))}
            </Lane>
          </FlowGroup>
          <Card className="p-5">
            <SectionTitle
              title="Hướng xử lý"
              description="Admin điều phối và xác nhận settlement, không nhập payout chuyên môn."
            />
            <ol className="mt-5 grid gap-3 text-sm font-semibold text-slate-600">
              <ProcessStep number="1" title="Gán Staff" description="Chọn Staff phù hợp domain/skills để review case." />
              <ProcessStep number="2" title="Chờ Staff quyết định" description="Staff là người nhập report và payout percentage." />
              <ProcessStep number="3" title="Execute/refund" description="Admin xác nhận hành động tài chính khi backend cho phép." />
            </ol>
          </Card>
        </div>
      )}

      {isAdminBoard && activeTab === "disputes" && (
        <FlowGroup
          eyebrow="Flow 5"
          title="Dispute escalation"
          description="Tách riêng case cần gán Staff và case đã có Staff decision."
        >
          <Lane icon={<UserCheck className="h-5 w-5" />} step="1" title="Chờ gán Staff" description="Dispute đã yêu cầu Staff can thiệp." count={adminBoard.assignDisputes.length}>
            {adminBoard.assignDisputes.map((dispute) => (
              <DisputeCard
                key={dispute.disputeId}
                dispute={dispute}
                contract={contractById.get(dispute.contractId)}
                staffMode={staffMode}
                actions={
                  <>
                    {canAdminAssignStaff(session?.role, dispute.status) && (
                      <Button size="sm" variant="secondary" onClick={() => setAssignDisputeOpen(dispute)}>
                        Gán Staff
                      </Button>
                    )}
                    {canInitiatorCancelDispute("ADMIN", dispute) && (
                      <Button size="sm" variant="danger" onClick={() => setCancelDisputeOpen(dispute)}>
                        Cancel
                      </Button>
                    )}
                  </>
                }
              />
            ))}
          </Lane>
          <Lane icon={<ReceiptText className="h-5 w-5" />} step="2" title="Chờ execute settlement" description="Staff đã ra quyết định." count={adminBoard.executeDisputes.length}>
            {adminBoard.executeDisputes.map((dispute) => (
              <DisputeCard
                key={dispute.disputeId}
                dispute={dispute}
                contract={contractById.get(dispute.contractId)}
                staffMode={staffMode}
                actions={<Button size="sm" onClick={() => setExecuteDisputeOpen(dispute)}>Execute</Button>}
              />
            ))}
          </Lane>
        </FlowGroup>
      )}

      {isAdminBoard && activeTab === "terminations" && (
        <FlowGroup
          eyebrow="Flow 4"
          title="Termination requests"
          description="Admin gán Staff, execute settlement và xử lý cọc hợp đồng."
        >
          <Lane icon={<UserCheck className="h-5 w-5" />} step="1" title="Chờ gán Staff" description="Request mới cần Staff review." count={adminBoard.assignTerminations.length}>
            {adminBoard.assignTerminations.map((request) => (
              <TerminationCard
                key={request.terminationRequestId}
                request={request}
                contract={contractById.get(request.contractId)}
                actions={
                  <>
                    <Button size="sm" variant="secondary" onClick={() => setAssignTerminationOpen(request)}>Gán Staff</Button>
                    <Button size="sm" variant="danger" onClick={() => setCancelTerminationOpen(request)}>Cancel</Button>
                  </>
                }
              />
            ))}
          </Lane>
          <Lane icon={<ReceiptText className="h-5 w-5" />} step="2" title="Chờ execute settlement" description="Staff đã approve payout." count={adminBoard.executeTerminations.length}>
            {adminBoard.executeTerminations.map((request) => (
              <TerminationCard
                key={request.terminationRequestId}
                request={request}
                contract={contractById.get(request.contractId)}
                actions={<Button size="sm" onClick={() => setExecuteTerminationOpen(request)}>Execute</Button>}
              />
            ))}
          </Lane>
          <Lane icon={<ShieldCheck className="h-5 w-5" />} step="3" title="Chờ hoàn cọc" description="Contract security deposit 20%." count={adminBoard.refundTerminations.length}>
            {adminBoard.refundTerminations.map((request) => (
              <TerminationCard
                key={request.terminationRequestId}
                request={request}
                contract={contractById.get(request.contractId)}
                actions={
                  <Button
                    size="sm"
                    onClick={() => {
                      setRefundFull(true);
                      setRefundTerminationOpen(request);
                    }}
                  >
                    Hoàn cọc
                  </Button>
                }
              />
            ))}
          </Lane>
        </FlowGroup>
      )}

      {isAdminBoard && activeTab === "settlement" && (
        <FlowGroup
          eyebrow="Finance control"
          title="Settlement & deposit"
          description="Các hành động tài chính cần xác nhận rõ trước khi gửi backend."
        >
          <Lane icon={<ReceiptText className="h-5 w-5" />} title="Dispute settlement" description="Execute theo Staff decision." count={adminBoard.executeDisputes.length}>
            {adminBoard.executeDisputes.map((dispute) => (
              <DisputeCard
                key={dispute.disputeId}
                dispute={dispute}
                contract={contractById.get(dispute.contractId)}
                staffMode={staffMode}
                actions={<Button size="sm" onClick={() => setExecuteDisputeOpen(dispute)}>Xem & execute</Button>}
              />
            ))}
          </Lane>
          <Lane icon={<ReceiptText className="h-5 w-5" />} title="Termination settlement" description="Split milestone escrow." count={adminBoard.executeTerminations.length}>
            {adminBoard.executeTerminations.map((request) => (
              <TerminationCard
                key={request.terminationRequestId}
                request={request}
                contract={contractById.get(request.contractId)}
                actions={<Button size="sm" onClick={() => setExecuteTerminationOpen(request)}>Xem & execute</Button>}
              />
            ))}
          </Lane>
          <Lane icon={<ShieldCheck className="h-5 w-5" />} title="Contract deposit" description="Hoàn/không hoàn cọc 20%." count={adminBoard.refundTerminations.length}>
            {adminBoard.refundTerminations.map((request) => (
              <TerminationCard
                key={request.terminationRequestId}
                request={request}
                contract={contractById.get(request.contractId)}
                actions={<Button size="sm" onClick={() => setRefundTerminationOpen(request)}>Xử lý cọc</Button>}
              />
            ))}
          </Lane>
        </FlowGroup>
      )}

      {isStaffBoard && activeTab === "overview" && (
        <FlowGroup
          eyebrow="Ưu tiên review"
          title="Case cần Staff xử lý"
          description="Mở case, xem bằng chứng và ra quyết định theo chuyên môn."
        >
          <Lane icon={<Gavel className="h-5 w-5" />} step="1" title="Dispute review" description="Từ chối can thiệp hoặc ra quyết định bắt buộc." count={staffBoard.disputeReviews.length}>
            {staffBoard.disputeReviews.map((dispute) => (
              <DisputeCard
                key={dispute.disputeId}
                dispute={dispute}
                contract={contractById.get(dispute.contractId)}
                staffMode={staffMode}
                actions={<LinkButton to={`/app/tickets/${dispute.disputeId}`} size="sm">Review</LinkButton>}
              />
            ))}
          </Lane>
          <Lane icon={<ClipboardList className="h-5 w-5" />} step="2" title="Termination review" description="Approve/reject termination và payout percentage." count={staffBoard.terminationReviews.length}>
            {staffBoard.terminationReviews.map((request) => (
              <TerminationCard
                key={request.terminationRequestId}
                request={request}
                contract={contractById.get(request.contractId)}
                actions={
                  <>
                    <Button size="sm" onClick={() => setApproveTerminationOpen(request)}>
                      <CheckCircle2 className="h-4 w-4" />
                      Approve
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => setRejectTerminationOpen(request)}>
                      Reject
                    </Button>
                  </>
                }
              />
            ))}
          </Lane>
        </FlowGroup>
      )}

      {isStaffBoard && activeTab === "disputes" && (
        <FlowGroup eyebrow="Flow 5" title="Assigned disputes" description="Các dispute đang chờ Staff review.">
          <Lane icon={<Gavel className="h-5 w-5" />} title="Dispute review" description="Mở chi tiết để xem evidence và ra quyết định." count={staffBoard.disputeReviews.length}>
            {staffBoard.disputeReviews.map((dispute) => (
              <DisputeCard
                key={dispute.disputeId}
                dispute={dispute}
                contract={contractById.get(dispute.contractId)}
                staffMode={staffMode}
                actions={<LinkButton to={`/app/tickets/${dispute.disputeId}`} size="sm">Review</LinkButton>}
              />
            ))}
          </Lane>
        </FlowGroup>
      )}

      {isStaffBoard && activeTab === "terminations" && (
        <FlowGroup eyebrow="Flow 4" title="Assigned terminations" description="Các termination request đang chờ Staff quyết định.">
          <Lane icon={<ClipboardList className="h-5 w-5" />} title="Termination review" description="Đánh giá lý do, evidence và payout milestone escrow." count={staffBoard.terminationReviews.length}>
            {staffBoard.terminationReviews.map((request) => (
              <TerminationCard
                key={request.terminationRequestId}
                request={request}
                contract={contractById.get(request.contractId)}
                actions={
                  <>
                    <Button size="sm" onClick={() => setApproveTerminationOpen(request)}>Approve</Button>
                    <Button size="sm" variant="danger" onClick={() => setRejectTerminationOpen(request)}>Reject</Button>
                  </>
                }
              />
            ))}
          </Lane>
        </FlowGroup>
      )}

      {!staffMode && (
        <FlowGroup
          eyebrow="Project"
          title="Dispute tracking"
          description="Danh sách dispute của các contract mà tài khoản hiện tại đang tham gia."
        >
          <Lane
            icon={<Search className="h-5 w-5" />}
            title="All disputes"
            description="Theo dõi trạng thái và mở chi tiết khi cần."
            count={searchedDisputes.length}
          >
            {searchedDisputes.map((dispute) => (
              <DisputeCard
                key={dispute.disputeId}
                dispute={dispute}
                contract={contractById.get(dispute.contractId)}
                staffMode={staffMode}
                actions={
                  <LinkButton
                    to={`/app/disputes/${dispute.disputeId}`}
                    variant="secondary"
                    size="sm"
                  >
                    Chi tiết
                  </LinkButton>
                }
              />
            ))}
          </Lane>
        </FlowGroup>
      )}

      <Modal open={Boolean(assignDisputeOpen || assignTerminationOpen)} onClose={closeModals} title="Gán Staff" footer={<><Button variant="secondary" onClick={closeModals} disabled={submitting}>Hủy</Button><Button onClick={() => runAction(() => assignDisputeOpen ? disputeApi.assignStaff(assignDisputeOpen.disputeId, { staffId: Number(selectedStaffId) }) : contractApi.assignTerminationStaff(assignTerminationOpen!.terminationRequestId, Number(selectedStaffId)), "Đã gán Staff theo phản hồi backend.")} loading={submitting} disabled={submitting || !selectedStaffId}>Gán Staff</Button></>}>
        <Field label="Staff xử lý">
          <Select value={selectedStaffId} onChange={(event) => setSelectedStaffId(event.target.value)}>
            <option value="">Chọn Staff</option>
            {staffs.map((staff) => (
              <option key={staff.staffId} value={staff.staffId}>{staff.fullName || staff.email || "Staff"}</option>
            ))}
          </Select>
        </Field>
      </Modal>

      <Modal open={Boolean(cancelDisputeOpen)} onClose={closeModals} title="Cancel dispute" footer={<><Button variant="secondary" onClick={closeModals} disabled={submitting}>Hủy</Button><Button variant="danger" onClick={() => runAction(() => disputeApi.cancel(cancelDisputeOpen!.disputeId, { reason: cancelDisputeReason }), "Đã cancel dispute.")} loading={submitting} disabled={submitting}>Cancel dispute</Button></>}>
        <Notice tone="warning" title="Chỉ cancel dispute invalid/duplicate">Admin không ra quyết định chuyên môn và không nhập payout percentage.</Notice>
        <Field label="Lý do cancel" className="mt-4">
          <Textarea value={cancelDisputeReason} onChange={(event) => setCancelDisputeReason(event.target.value)} />
        </Field>
      </Modal>

      <Modal open={Boolean(executeDisputeOpen)} onClose={closeModals} title="Execute dispute settlement" footer={<><Button variant="secondary" onClick={closeModals} disabled={submitting}>Hủy</Button><Button onClick={() => runAction(() => disputeApi.executeSettlement(executeDisputeOpen!.disputeId), "Đã execute dispute settlement theo backend.")} loading={submitting} disabled={submitting}>Execute settlement</Button></>}>
        {executeDisputeOpen && <SettlementPreview percentage={executeDisputeOpen.staffDecisionPercentage} expertAmount={executeDisputeOpen.staffProposedExpertAmount} businessAmount={executeDisputeOpen.businessRefundAmount} reason={executeDisputeOpen.staffDecisionNote} report={executeDisputeOpen.staffReport} />}
      </Modal>

      <Modal open={Boolean(rejectTerminationOpen || cancelTerminationOpen)} onClose={closeModals} title={rejectTerminationOpen ? "Từ chối termination" : "Cancel termination"} footer={<><Button variant="secondary" onClick={closeModals} disabled={submitting}>Hủy</Button><Button variant="danger" onClick={() => runAction(() => rejectTerminationOpen ? contractApi.rejectTermination(rejectTerminationOpen.terminationRequestId, terminationReason) : contractApi.withdrawTermination(cancelTerminationOpen!.terminationRequestId, terminationReason), rejectTerminationOpen ? "Staff đã reject termination." : "Admin đã cancel termination.")} loading={submitting} disabled={submitting}>Xác nhận</Button></>}>
        <Field label="Lý do">
          <Textarea value={terminationReason} onChange={(event) => setTerminationReason(event.target.value)} />
        </Field>
      </Modal>

      <Modal open={Boolean(approveTerminationOpen)} onClose={closeModals} title="Staff duyệt termination" footer={<><Button variant="secondary" onClick={closeModals} disabled={submitting}>Hủy</Button><Button onClick={() => runAction(() => contractApi.approveTermination(approveTerminationOpen!.terminationRequestId, { expertPayoutPercentage: Number(approveForm.expertPayoutPercentage), staffDecisionReason: approveForm.staffDecisionReason, staffReport: approveForm.staffReport, partialEvidenceRequired: approveForm.partialEvidenceRequired }), "Staff đã approve termination.")} loading={submitting} disabled={submitting}>Approve</Button></>}>
        <div className="grid gap-4">
          <Notice tone="info" title="Sau khi approve, request sẽ chuyển sang bước Admin execute settlement." />
          <Field label="Expert payout percentage">
            <Input type="number" min={0} max={100} value={approveForm.expertPayoutPercentage} onChange={(event) => setApproveForm((value) => ({ ...value, expertPayoutPercentage: event.target.value }))} />
          </Field>
          <Field label="Decision reason">
            <Textarea value={approveForm.staffDecisionReason} onChange={(event) => setApproveForm((value) => ({ ...value, staffDecisionReason: event.target.value }))} />
          </Field>
          <Field label="Staff report">
            <Textarea value={approveForm.staffReport} onChange={(event) => setApproveForm((value) => ({ ...value, staffReport: event.target.value }))} />
          </Field>
          <label className="flex items-center gap-3 rounded-lg border border-slate-100 p-4 text-sm font-bold text-slate-600">
            <input type="checkbox" checked={approveForm.partialEvidenceRequired} onChange={(event) => setApproveForm((value) => ({ ...value, partialEvidenceRequired: event.target.checked }))} />
            Yêu cầu Expert nộp partial evidence trước settlement
          </label>
        </div>
      </Modal>

      <Modal open={Boolean(executeTerminationOpen)} onClose={closeModals} title="Execute termination settlement" footer={<><Button variant="secondary" onClick={closeModals} disabled={submitting}>Hủy</Button><Button onClick={() => runAction(() => contractApi.executeTerminationSettlement(executeTerminationOpen!.terminationRequestId), "Đã execute termination settlement.")} loading={submitting} disabled={submitting}>Execute settlement</Button></>}>
        {modalError && <Notice tone="danger" title={modalError} className="mb-4" />}
        {executeTerminationOpen && <SettlementPreview percentage={executeTerminationOpen.expertPayoutPercentage} expertAmount={executeTerminationOpen.expertPayoutAmount} businessAmount={executeTerminationOpen.businessRefundAmount} reason={executeTerminationOpen.staffDecisionReason} report={executeTerminationOpen.staffReport} />}
      </Modal>

      <Modal open={Boolean(refundTerminationOpen)} onClose={closeModals} title="Hoàn cọc hợp đồng" footer={<><Button variant="secondary" onClick={closeModals} disabled={submitting}>Hủy</Button><Button onClick={() => runAction(() => contractApi.refundDepositAfterTermination(refundTerminationOpen!.terminationRequestId, refundFull ? {} : { refundAmount: 0 }), "Đã xử lý refund contract deposit.")} loading={submitting} disabled={submitting}>Xác nhận</Button></>}>
        <Notice tone="warning" title="Contract security deposit chỉ được hoàn 100% hoặc không hoàn." />
        <Field label="Refund mode" className="mt-4">
          <Select value={refundFull ? "FULL" : "ZERO"} onChange={(event) => setRefundFull(event.target.value === "FULL")}>
            <option value="FULL">Hoàn 100% held amount</option>
            <option value="ZERO">Không hoàn, backend resolve held amount</option>
          </Select>
        </Field>
      </Modal>
    </div>
  );
}

function QueueMetric({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "brand" | "amber" | "mint" | "slate";
}) {
  const colors = {
    brand: "bg-brand-50 text-brand-700",
    amber: "bg-amber-50 text-amber-700",
    mint: "bg-mint-50 text-mint-700",
    slate: "bg-slate-50 text-slate-600",
  };
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
            {label}
          </p>
          <p className="mt-1 font-display text-2xl font-black text-ink">
            {value}
          </p>
        </div>
        <span className={`grid h-11 w-11 place-items-center rounded-2xl ${colors[tone]}`}>
          {icon}
        </span>
      </div>
    </Card>
  );
}

function FlowGroup({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-600">{eyebrow}</p>
        <h2 className="mt-1 font-display text-xl font-black text-ink">{title}</h2>
        <p className="mt-1 text-sm font-semibold text-slate-500">{description}</p>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">{children}</div>
    </section>
  );
}

function Lane({ icon, step, title, description, count, children }: { icon: React.ReactNode; step?: string; title: string; description: string; count: number; children: React.ReactNode }) {
  return (
    <Card className="flex min-h-[320px] flex-col p-4">
      <div className="flex gap-3 border-b border-slate-100 pb-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">{icon}</div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {step && <Badge tone="brand">Bước {step}</Badge>}
            <Badge tone={count ? "amber" : "slate"}>{count} việc</Badge>
          </div>
          <h3 className="mt-2 font-display text-base font-black text-ink">{title}</h3>
          <p className="mt-1 text-sm font-semibold leading-5 text-slate-500">{description}</p>
        </div>
      </div>
      <div className="mt-4 grid flex-1 content-start gap-3">
        {count === 0 ? (
          <div className="flex min-h-[150px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm font-bold text-slate-400">
            Không có việc ở bước này
          </div>
        ) : (
          children
        )}
      </div>
    </Card>
  );
}

function DisputeCard({ dispute, contract, staffMode, actions }: { dispute: Dispute; contract?: Contract; staffMode: boolean; actions: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap gap-2">
        <StatusBadge status={translateDisputeStatus(dispute.status)} />
        <Badge tone={isActiveDisputeStatus(dispute.status) ? "amber" : "slate"}>{friendlyInitiator(dispute.initiatedBy)}</Badge>
      </div>
      <h4 className="mt-3 line-clamp-2 font-display text-base font-extrabold text-ink">{contractTitle(contract)}</h4>
      <p className="mt-2 text-xs font-black uppercase tracking-[0.14em] text-slate-400">{translateDisputeInitiationType(dispute.initiationType) || "Milestone dispute"}</p>
      <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{dispute.escalationReason || dispute.evidenceReport || dispute.staffDecisionNote || "Backend chưa có mô tả chi tiết cho dispute này."}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {actions}
        <LinkButton to={staffMode ? `/app/tickets/${dispute.disputeId}` : `/app/disputes/${dispute.disputeId}`} variant="secondary" size="sm">Chi tiết</LinkButton>
      </div>
    </div>
  );
}

function TerminationCard({ request, contract, actions }: { request: TerminationRequest; contract?: Contract; actions: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap gap-2">
        <StatusBadge status={translateTerminationStatus(request.status)} />
        <Badge tone="brand">{request.requestedByRole}</Badge>
      </div>
      <h4 className="mt-3 line-clamp-2 font-display text-base font-extrabold text-ink">{contractTitle(contract)}</h4>
      <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{request.requestReason || "Backend chưa có lý do termination."}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <InfoFact label="Expert" value={request.expertPayoutAmount !== undefined ? formatCurrency(request.expertPayoutAmount) : undefined} />
        <InfoFact label="Business" value={request.businessRefundAmount !== undefined ? formatCurrency(request.businessRefundAmount) : undefined} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {actions}
        <LinkButton to={`/app/termination-requests/${request.terminationRequestId}`} variant="secondary" size="sm">Chi tiết</LinkButton>
      </div>
    </div>
  );
}

function SectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h3 className="font-display text-lg font-black text-ink">{title}</h3>
      <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">{description}</p>
    </div>
  );
}

function ProcessStep({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <li className="flex gap-3 rounded-2xl bg-slate-50 p-3">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-black text-white">{number}</span>
      <span>
        <span className="block font-extrabold text-ink">{title}</span>
        <span className="text-sm leading-6 text-slate-500">{description}</span>
      </span>
    </li>
  );
}

function SettlementPreview({ percentage, expertAmount, businessAmount, reason, report }: { percentage?: number; expertAmount?: number; businessAmount?: number; reason?: string; report?: string }) {
  return (
    <div className="grid gap-4">
      <Notice tone="warning" title="Hành động này xác nhận kết quả Staff đã quyết định.">Frontend chỉ gọi API execute; toàn bộ chuyển tiền, wallet và trạng thái cuối cùng do backend xử lý.</Notice>
      <div className="grid gap-3 md:grid-cols-3">
        <InfoFact label="Expert %" value={percentage !== undefined ? `${percentage}%` : undefined} />
        <InfoFact label="Expert nhận" value={expertAmount !== undefined ? formatCurrency(expertAmount) : undefined} />
        <InfoFact label="Business hoàn" value={businessAmount !== undefined ? formatCurrency(businessAmount) : undefined} />
      </div>
      <InfoBlock label="Decision reason" value={reason} />
      <InfoBlock label="Staff report" value={report} />
    </div>
  );
}

function friendlyInitiator(initiator?: string) {
  if (initiator === "BUSINESS") return "Business khởi tạo";
  if (initiator === "EXPERT") return "Expert khởi tạo";
  return "Người khởi tạo chưa xác định";
}

function InfoFact({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 break-words font-extrabold text-slate-700">{value || "Chưa có dữ liệu"}</p>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-700">{value || "Chưa có dữ liệu từ backend"}</p>
    </div>
  );
}

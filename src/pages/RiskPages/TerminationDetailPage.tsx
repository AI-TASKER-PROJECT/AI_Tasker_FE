import {
  CheckCircle2,
  FileText,
  ReceiptText,
  UserCheck,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  adminApi,
  contractApi,
  disputeApi,
  getApiErrorMessage,
} from "../../lib/api";
import {
  canAdminExecuteTerminationSettlement,
  canAdminRefundContractDeposit,
  canAssignStaffToTermination,
  canExpertSubmitPartialEvidence,
  canStaffDecideTermination,
  canWithdrawTermination,
  contractStatusLabel,
  isActiveDispute,
  terminationStatusLabel,
} from "../../lib/flowGuards";
import { useSession } from "../../lib/session";
import { formatCurrency, formatDateTime } from "../../lib/utils";
import type { Contract, Dispute, Staff, TerminationRequest } from "../../types";
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
} from "../../components/ui";

type ActionName =
  | "assign"
  | "reject"
  | "approve"
  | "withdraw"
  | "partial-evidence"
  | "execute"
  | "refund";

export function TerminationDetailPage() {
  const { terminationRequestId } = useParams();
  const session = useSession();
  const numericRequestId = Number(terminationRequestId);
  const [request, setRequest] = useState<TerminationRequest | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState<ActionName | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [partialEvidenceOpen, setPartialEvidenceOpen] = useState(false);
  const [executeOpen, setExecuteOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [staffId, setStaffId] = useState("");
  const [reason, setReason] = useState("");
  const [refundFull, setRefundFull] = useState(true);
  const [approveForm, setApproveForm] = useState({
    expertPayoutPercentage: "0",
    staffDecisionReason: "",
    staffReport: "",
    partialEvidenceRequired: false,
  });
  const [partialEvidenceForm, setPartialEvidenceForm] = useState({
    note: "",
    url: "",
  });

  const loadRequest = useCallback(async () => {
    if (!Number.isFinite(numericRequestId) || numericRequestId <= 0) {
      setRequest(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await contractApi.getTerminationRequest(numericRequestId);
      const [contractData, disputeItems] = await Promise.all([
        contractApi.getContract(data.contractId).catch(() => null),
        disputeApi.listByContract(data.contractId).catch(() => []),
      ]);
      setRequest(data);
      setContract(contractData);
      setDisputes(disputeItems);
      setStaffId(data.assignedStaffId ? String(data.assignedStaffId) : "");
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
      setRequest(null);
      setContract(null);
      setDisputes([]);
    } finally {
      setLoading(false);
    }
  }, [numericRequestId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRequest();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadRequest]);

  useEffect(() => {
    if (session?.role !== "ADMIN") return;
    adminApi
      .listStaffs()
      .then(setStaffs)
      .catch(() => setStaffs([]));
  }, [session?.role]);

  async function runAction(action: ActionName, handler: () => Promise<void>) {
    setSubmitting(action);
    setError("");
    setNotice("");
    try {
      await handler();
      closeModals();
      await loadRequest();
    } catch (actionError) {
      setError(getApiErrorMessage(actionError));
      await loadRequest();
    } finally {
      setSubmitting(null);
    }
  }

  function closeModals() {
    setAssignOpen(false);
    setRejectOpen(false);
    setApproveOpen(false);
    setWithdrawOpen(false);
    setPartialEvidenceOpen(false);
    setExecuteOpen(false);
    setRefundOpen(false);
    setReason("");
    setApproveForm({
      expertPayoutPercentage: "0",
      staffDecisionReason: "",
      staffReport: "",
      partialEvidenceRequired: false,
    });
    setPartialEvidenceForm({ note: "", url: "" });
    setRefundFull(true);
  }

  const activeCurrentMilestoneDispute = useMemo(() => {
    return disputes.find(
      (dispute) =>
        isActiveDispute(dispute.status) &&
        (!request?.currentMilestoneId ||
          dispute.milestoneId === request.currentMilestoneId),
    );
  }, [disputes, request?.currentMilestoneId]);

  const timeline = useMemo(() => {
    if (!request) return [];
    return [
      {
        label: "Tạo yêu cầu",
        at: request.createdAt,
        description: `${request.requestedByRole} gửi yêu cầu chấm dứt.`,
      },
      {
        label: "Gán Staff",
        at: request.staffReviewStartedAt,
        description: "Admin đã gán Staff và bắt đầu review.",
      },
      {
        label: "Staff quyết định",
        at: request.staffDecidedAt,
        description:
          request.staffDecisionReason || "Staff đã ghi nhận quyết định.",
      },
      {
        label: "Partial evidence",
        at: request.partialEvidenceSubmittedAt,
        description:
          request.partialEvidenceNote ||
          "Expert đã nộp bằng chứng công việc một phần.",
      },
      {
        label: "Execute settlement",
        at: request.settlementExecutedAt,
        description: "Backend đã xử lý settlement milestone escrow.",
      },
      {
        label: "Hoàn cọc hợp đồng",
        at: request.depositRefundedAt,
        description: "Admin đã xử lý contract security deposit.",
      },
    ];
  }, [request]);

  const assignStaff = async () => {
    if (!request || !staffId) return;
    await runAction("assign", async () => {
      await contractApi.assignTerminationStaff(
        request.terminationRequestId,
        Number(staffId),
      );
      setNotice("Đã gán Staff xử lý termination request.");
    });
  };

  const rejectTermination = async () => {
    if (!request || !reason.trim()) {
      setError("Vui lòng nhập lý do từ chối.");
      return;
    }
    await runAction("reject", async () => {
      await contractApi.rejectTermination(
        request.terminationRequestId,
        reason.trim(),
      );
      setNotice("Staff đã từ chối yêu cầu chấm dứt.");
    });
  };

  const approveTermination = async () => {
    if (!request) return;
    const percentage = Number(approveForm.expertPayoutPercentage);
    if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
      setError("Payout percentage phải nằm trong khoảng 0-100.");
      return;
    }
    if (!approveForm.staffDecisionReason.trim() || !approveForm.staffReport.trim()) {
      setError("Vui lòng nhập decision reason và Staff report.");
      return;
    }
    await runAction("approve", async () => {
      await contractApi.approveTermination(request.terminationRequestId, {
        expertPayoutPercentage: percentage,
        staffDecisionReason: approveForm.staffDecisionReason.trim(),
        staffReport: approveForm.staffReport.trim(),
        partialEvidenceRequired: approveForm.partialEvidenceRequired,
      });
      setNotice("Staff đã duyệt chấm dứt hợp đồng.");
    });
  };

  const withdrawTermination = async () => {
    if (!request || !reason.trim()) {
      setError("Vui lòng nhập lý do rút/cancel request.");
      return;
    }
    await runAction("withdraw", async () => {
      await contractApi.withdrawTermination(
        request.terminationRequestId,
        reason.trim(),
      );
      setNotice("Đã rút/cancel termination request.");
    });
  };

  const submitPartialEvidence = async () => {
    if (!request || !partialEvidenceForm.note.trim()) {
      setError("Vui lòng nhập ghi chú bằng chứng.");
      return;
    }
    await runAction("partial-evidence", async () => {
      await contractApi.submitPartialEvidence(request.terminationRequestId, {
        partialEvidenceNote: partialEvidenceForm.note.trim(),
        partialEvidenceUrl: partialEvidenceForm.url || undefined,
      });
      setNotice("Đã nộp bằng chứng công việc một phần.");
    });
  };

  const executeSettlement = async () => {
    if (!request) return;
    await runAction("execute", async () => {
      await contractApi.executeTerminationSettlement(
        request.terminationRequestId,
      );
      setNotice("Đã execute termination settlement.");
    });
  };

  const refundDeposit = async () => {
    if (!request) return;
    await runAction("refund", async () => {
      await contractApi.refundDepositAfterTermination(
        request.terminationRequestId,
        refundFull ? {} : { refundAmount: 0 },
      );
      setNotice("Đã xử lý hoàn cọc hợp đồng.");
    });
  };

  if (loading) {
    return (
      <EmptyState
        title="Đang tải termination request"
        description="Đang lấy chi tiết yêu cầu chấm dứt từ backend."
      />
    );
  }

  if (!request) {
    return (
      <EmptyState
        title="Không tìm thấy termination request"
        description={error || "Dữ liệu được lấy trực tiếp từ backend."}
      />
    );
  }

  const canAssign = canAssignStaffToTermination(session?.role, request);
  const canStaffDecide = canStaffDecideTermination(
    session?.role,
    request,
    session?.staffId,
  );
  const canWithdraw = canWithdrawTermination(
    session?.role,
    request,
    session?.accountId,
  );
  const canPartialEvidence = canExpertSubmitPartialEvidence(
    session?.role,
    request,
  );
  const canExecute =
    canAdminExecuteTerminationSettlement(session?.role, request) &&
    !activeCurrentMilestoneDispute;
  const canRefund = canAdminRefundContractDeposit(
    session?.role,
    contract,
    request,
  );

  return (
    <div className="space-y-6">
      <Card className="p-6 md:p-8">
        <PageHeader
          eyebrow="Termination detail"
          title="Chi tiết yêu cầu chấm dứt"
          description="Flow 4 termination review, settlement và hoàn cọc hợp đồng theo trạng thái backend."
          actions={
            <>
              {canAssign && (
                <Button variant="secondary" onClick={() => setAssignOpen(true)}>
                  <UserCheck className="h-4 w-4" />
                  Gán Staff
                </Button>
              )}
              {canStaffDecide && (
                <>
                  <Button onClick={() => setApproveOpen(true)}>
                    <CheckCircle2 className="h-4 w-4" />
                    Duyệt chấm dứt
                  </Button>
                  <Button variant="danger" onClick={() => setRejectOpen(true)}>
                    <XCircle className="h-4 w-4" />
                    Từ chối chấm dứt
                  </Button>
                </>
              )}
              {canPartialEvidence && (
                <Button onClick={() => setPartialEvidenceOpen(true)}>
                  <FileText className="h-4 w-4" />
                  Nộp bằng chứng một phần
                </Button>
              )}
              {canExecute && (
                <Button onClick={() => setExecuteOpen(true)}>
                  <ReceiptText className="h-4 w-4" />
                  Execute settlement
                </Button>
              )}
              {canRefund && (
                <Button onClick={() => setRefundOpen(true)}>
                  <ReceiptText className="h-4 w-4" />
                  Hoàn cọc hợp đồng
                </Button>
              )}
              {canWithdraw && (
                <Button variant="danger" onClick={() => setWithdrawOpen(true)}>
                  Rút/cancel request
                </Button>
              )}
            </>
          }
        />
      </Card>

      {error && <Notice tone="danger" title={error} />}
      {notice && <Notice tone="success" title={notice} />}
      {activeCurrentMilestoneDispute && (
        <Notice
          tone="warning"
          title="Milestone hiện tại đang có dispute active"
        >
          Theo SPEC, termination settlement không nên execute khi dispute active
          chưa được giải quyết. UI đã ẩn nút execute settlement cho đến khi
          dispute được backend resolve/cancel.
        </Notice>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <Card className="p-6">
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={terminationStatusLabel(request.status)} />
            <Badge tone="brand">{request.requestedByRole}</Badge>
            {request.assignedStaffId ? (
              <Badge tone="mint">Đã gán Staff</Badge>
            ) : (
              <Badge tone="amber">Chưa gán Staff</Badge>
            )}
          </div>
          <SectionHeading
            title="Thông tin yêu cầu"
            description="Hiển thị theo vai trò, không lộ accountId/walletId."
          />
          <div className="mt-5 grid gap-4 rounded-3xl bg-slate-50 p-5 md:grid-cols-2">
            <InfoLine label="Lý do yêu cầu" value={request.requestReason} wide />
            <InfoLine
              label="Contract"
              value={contract?.contractTitle || contract?.title || "Contract"}
            />
            <InfoLine
              label="Trạng thái contract"
              value={contractStatusLabel(contract?.status)}
            />
            <InfoLine
              label="Ngày tạo"
              value={request.createdAt ? formatDateTime(request.createdAt) : undefined}
            />
            <InfoLine
              label="Ngày Staff quyết định"
              value={
                request.staffDecidedAt
                  ? formatDateTime(request.staffDecidedAt)
                  : undefined
              }
            />
          </div>
        </Card>

        <Card className="p-6">
          <SectionHeading
            title="Settlement & deposit"
            description="Payout percentage chỉ áp dụng cho milestone escrow, không áp dụng cho cọc contract 20%."
          />
          <div className="mt-5 grid gap-3">
            <InfoLine
              label="Expert payout %"
              value={
                request.expertPayoutPercentage !== undefined
                  ? `${request.expertPayoutPercentage}%`
                  : undefined
              }
            />
            <InfoLine
              label="Expert nhận"
              value={
                request.expertPayoutAmount !== undefined
                  ? formatCurrency(request.expertPayoutAmount)
                  : undefined
              }
            />
            <InfoLine
              label="Business hoàn"
              value={
                request.businessRefundAmount !== undefined
                  ? formatCurrency(request.businessRefundAmount)
                  : undefined
              }
            />
            <InfoLine
              label="Settlement executed"
              value={
                request.settlementExecutedAt
                  ? formatDateTime(request.settlementExecutedAt)
                  : undefined
              }
            />
            <InfoLine
              label="Contract deposit refunded"
              value={
                request.depositRefundedAt
                  ? formatDateTime(request.depositRefundedAt)
                  : undefined
              }
            />
          </div>
          <Notice
            tone="warning"
            title="Cọc hợp đồng 20% chỉ hoàn 100% hoặc không hoàn."
            className="mt-5"
          />
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <Card className="p-6">
          <SectionHeading
            title="Evidence"
            description="Bằng chứng hiện có từ request, partial evidence và Staff report."
          />
          <div className="mt-5 grid gap-3">
            <EvidenceItem
              title="File yêu cầu chấm dứt"
              href={request.requestFileUrl}
              note={request.requestReason}
            />
            <EvidenceItem
              title="Partial evidence"
              href={request.partialEvidenceUrl}
              note={request.partialEvidenceNote}
              timestamp={request.partialEvidenceSubmittedAt}
            />
            <EvidenceItem
              title="Staff report"
              note={request.staffReport}
              timestamp={request.staffDecidedAt}
            />
          </div>
        </Card>

        <Card className="p-6">
          <SectionHeading
            title="Timeline"
            description="Dựng từ timestamp hiện có trong DTO backend."
          />
          <div className="mt-5 grid gap-3">
            {timeline.map((item) => (
              <TimelineItem
                key={item.label}
                label={item.label}
                at={item.at}
                description={item.description}
              />
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <SectionHeading title="Partial evidence & Staff decision" />
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="font-extrabold text-ink">Bằng chứng một phần</p>
            <div className="mt-3 grid gap-3">
              <InfoLine
                label="Yêu cầu partial evidence"
                value={request.partialEvidenceRequired ? "Có" : "Không"}
              />
              <InfoLine
                label="Đã nộp lúc"
                value={
                  request.partialEvidenceSubmittedAt
                    ? formatDateTime(request.partialEvidenceSubmittedAt)
                    : undefined
                }
              />
              <InfoLine label="Ghi chú" value={request.partialEvidenceNote} />
            </div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="font-extrabold text-ink">Staff decision</p>
            <div className="mt-3 grid gap-3">
              <InfoLine label="Decision reason" value={request.staffDecisionReason} />
              <InfoLine label="Staff report" value={request.staffReport} />
            </div>
          </div>
        </div>
      </Card>

      <Modal
        open={assignOpen}
        onClose={closeModals}
        title="Gán Staff"
        footer={
          <>
            <Button variant="secondary" onClick={closeModals} disabled={Boolean(submitting)}>
              Hủy
            </Button>
            <Button
              onClick={assignStaff}
              loading={submitting === "assign"}
              disabled={Boolean(submitting) || !staffId}
            >
              Gán Staff
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
        open={rejectOpen || withdrawOpen}
        onClose={closeModals}
        title={rejectOpen ? "Từ chối chấm dứt" : "Rút/cancel termination request"}
        footer={
          <>
            <Button variant="secondary" onClick={closeModals} disabled={Boolean(submitting)}>
              Hủy
            </Button>
            <Button
              variant="danger"
              onClick={rejectOpen ? rejectTermination : withdrawTermination}
              loading={submitting === "reject" || submitting === "withdraw"}
              disabled={Boolean(submitting)}
            >
              Xác nhận
            </Button>
          </>
        }
      >
        <Field label="Lý do">
          <Textarea value={reason} onChange={(event) => setReason(event.target.value)} />
        </Field>
      </Modal>

      <Modal
        open={approveOpen}
        onClose={closeModals}
        title="Duyệt chấm dứt"
        footer={
          <>
            <Button variant="secondary" onClick={closeModals} disabled={Boolean(submitting)}>
              Hủy
            </Button>
            <Button
              onClick={approveTermination}
              loading={submitting === "approve"}
              disabled={Boolean(submitting)}
            >
              Duyệt chấm dứt
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Notice
            tone="warning"
            title="Payout percentage chỉ split milestone escrow, không split cọc contract 20%."
          />
          <Field label="Expert payout percentage">
            <Input
              type="number"
              min={0}
              max={100}
              value={approveForm.expertPayoutPercentage}
              onChange={(event) =>
                setApproveForm((value) => ({
                  ...value,
                  expertPayoutPercentage: event.target.value,
                }))
              }
            />
          </Field>
          <Field label="Decision reason">
            <Textarea
              value={approveForm.staffDecisionReason}
              onChange={(event) =>
                setApproveForm((value) => ({
                  ...value,
                  staffDecisionReason: event.target.value,
                }))
              }
            />
          </Field>
          <Field label="Staff report">
            <Textarea
              value={approveForm.staffReport}
              onChange={(event) =>
                setApproveForm((value) => ({
                  ...value,
                  staffReport: event.target.value,
                }))
              }
            />
          </Field>
          <label className="flex items-center gap-3 rounded-2xl border border-slate-100 p-4 text-sm font-bold text-slate-600">
            <input
              type="checkbox"
              checked={approveForm.partialEvidenceRequired}
              onChange={(event) =>
                setApproveForm((value) => ({
                  ...value,
                  partialEvidenceRequired: event.target.checked,
                }))
              }
            />
            Yêu cầu Expert nộp bằng chứng công việc một phần
          </label>
        </div>
      </Modal>

      <Modal
        open={partialEvidenceOpen}
        onClose={closeModals}
        title="Nộp bằng chứng công việc một phần"
        footer={
          <>
            <Button variant="secondary" onClick={closeModals} disabled={Boolean(submitting)}>
              Hủy
            </Button>
            <Button
              onClick={submitPartialEvidence}
              loading={submitting === "partial-evidence"}
              disabled={Boolean(submitting)}
            >
              Nộp bằng chứng
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Field label="Ghi chú bằng chứng">
            <Textarea
              value={partialEvidenceForm.note}
              onChange={(event) =>
                setPartialEvidenceForm((value) => ({
                  ...value,
                  note: event.target.value,
                }))
              }
            />
          </Field>
          <Field label="Evidence/file URL">
            <Input
              value={partialEvidenceForm.url}
              onChange={(event) =>
                setPartialEvidenceForm((value) => ({
                  ...value,
                  url: event.target.value,
                }))
              }
            />
          </Field>
        </div>
      </Modal>

      <Modal
        open={executeOpen}
        onClose={closeModals}
        title="Execute termination settlement"
        footer={
          <>
            <Button variant="secondary" onClick={closeModals} disabled={Boolean(submitting)}>
              Hủy
            </Button>
            <Button
              onClick={executeSettlement}
              loading={submitting === "execute"}
              disabled={Boolean(submitting)}
            >
              Execute settlement
            </Button>
          </>
        }
      >
        <FinancialPreview request={request} />
      </Modal>

      <Modal
        open={refundOpen}
        onClose={closeModals}
        title="Hoàn cọc hợp đồng"
        footer={
          <>
            <Button variant="secondary" onClick={closeModals} disabled={Boolean(submitting)}>
              Hủy
            </Button>
            <Button
              onClick={refundDeposit}
              loading={submitting === "refund"}
              disabled={Boolean(submitting)}
            >
              Xác nhận hoàn cọc
            </Button>
          </>
        }
      >
        <Notice
          tone="warning"
          title="Contract security deposit chỉ hoàn 100% hoặc không hoàn."
        />
        <Field label="Refund mode" className="mt-4">
          <Select
            value={refundFull ? "FULL" : "ZERO"}
            onChange={(event) => setRefundFull(event.target.value === "FULL")}
          >
            <option value="FULL">Hoàn 100% held amount</option>
            <option value="ZERO">Không hoàn, backend resolve held amount</option>
          </Select>
        </Field>
      </Modal>
    </div>
  );
}

function FinancialPreview({ request }: { request: TerminationRequest }) {
  return (
    <div className="grid gap-4">
      <Notice
        tone="warning"
        title="Frontend chỉ gọi API execute; wallet và ledger do backend xử lý."
      />
      <div className="grid gap-3 md:grid-cols-3">
        <InfoLine
          label="Expert %"
          value={
            request.expertPayoutPercentage !== undefined
              ? `${request.expertPayoutPercentage}%`
              : undefined
          }
        />
        <InfoLine
          label="Expert nhận"
          value={
            request.expertPayoutAmount !== undefined
              ? formatCurrency(request.expertPayoutAmount)
              : undefined
          }
        />
        <InfoLine
          label="Business hoàn"
          value={
            request.businessRefundAmount !== undefined
              ? formatCurrency(request.businessRefundAmount)
              : undefined
          }
        />
      </div>
    </div>
  );
}

function EvidenceItem({
  title,
  href,
  note,
  timestamp,
}: {
  title: string;
  href?: string;
  note?: string;
  timestamp?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-white text-brand-600">
          <FileText className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="font-extrabold text-ink">{title}</p>
          {timestamp && (
            <p className="mt-0.5 text-xs font-bold text-slate-400">
              {formatDateTime(timestamp)}
            </p>
          )}
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
            {note || "Chưa có ghi chú từ backend"}
          </p>
          {href && (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex break-all text-sm font-bold text-brand-600"
            >
              Mở file bằng chứng
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function TimelineItem({
  label,
  at,
  description,
}: {
  label: string;
  at?: string;
  description: string;
}) {
  return (
    <div className="grid grid-cols-[16px_1fr] gap-3">
      <span className={at ? "mt-1 h-3 w-3 rounded-full bg-brand-600" : "mt-1 h-3 w-3 rounded-full bg-slate-200"} />
      <div className="rounded-2xl bg-slate-50 p-3">
        <p className="font-extrabold text-ink">{label}</p>
        <p className="mt-1 text-xs font-bold text-slate-400">
          {at ? formatDateTime(at) : "Chưa diễn ra"}
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      </div>
    </div>
  );
}

function InfoLine({
  label,
  value,
  wide = false,
}: {
  label: string;
  value?: string | number;
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

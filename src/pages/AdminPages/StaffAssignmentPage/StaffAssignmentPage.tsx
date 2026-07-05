import { CheckCircle2, RefreshCw, Search, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { disputeApi, getApiErrorMessage } from "../../../lib/api";
import type { Dispute, StaffAssignmentCandidate } from "../../../types";
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  Notice,
  PageHeader,
} from "../../../components/ui";

export function StaffAssignmentPage() {
  const [searchParams] = useSearchParams();
  const [disputeId, setDisputeId] = useState(searchParams.get("disputeId") || "");
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [items, setItems] = useState<StaffAssignmentCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "danger" | "info" | "warning"; title: string; message?: string } | null>(null);

  const load = async () => {
    const id = Number(disputeId);
    if (!Number.isFinite(id) || id <= 0) {
      setNotice({ tone: "warning", title: "Nhập Dispute ID để xem danh sách staff phù hợp." });
      return;
    }
    setLoading(true);
    try {
      const [disputeData, candidates] = await Promise.all([
        disputeApi.get(id),
        disputeApi.staffCandidates(id),
      ]);
      setDispute(disputeData);
      setItems(candidates);
      setNotice(null);
    } catch (error) {
      setNotice({ tone: "danger", title: getApiErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (disputeId) void load();
  }, []);

  const assign = async (staffId: number) => {
    if (!dispute) return;
    setAssigning(staffId);
    try {
      const saved = await disputeApi.assign(dispute.disputeId, staffId);
      setDispute(saved);
      await load();
      setNotice({
        tone: "success",
        title: `Đã gán dispute #${saved.disputeId} cho staff #${staffId}.`,
        message: "Staff sẽ có quyền Read & Execute tạm thời đến khi hết SLA xử lý tranh chấp.",
      });
    } catch (error) {
      setNotice({ tone: "danger", title: getApiErrorMessage(error) });
    } finally {
      setAssigning(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          title="Staff Assignment Dashboard"
          description="Admin xem workload, trạng thái rảnh/bận và override auto-routing tranh chấp theo chuyên môn."
          actions={
            <Button onClick={load} loading={loading}>
              <RefreshCw className="h-4 w-4" />
              Làm mới
            </Button>
          }
        />
      </div>

      <Card className="p-5">
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <Field label="Dispute ID">
            <Input
              value={disputeId}
              onChange={(event) => setDisputeId(event.target.value)}
              placeholder="Ví dụ: 12"
            />
          </Field>
          <Button variant="secondary" onClick={load} loading={loading}>
            <Search className="h-4 w-4" />
            Tìm staff
          </Button>
        </div>
      </Card>

      {notice && (
        <Notice tone={notice.tone} title={notice.title}>
          {notice.message}
        </Notice>
      )}

      {dispute && (
        <Card className="p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="brand">Dispute #{dispute.disputeId}</Badge>
            <Badge tone="slate">Contract #{dispute.contractId}</Badge>
            <Badge tone="amber">{dispute.status}</Badge>
            {dispute.assignedStaffId && (
              <Badge tone="mint">Đang gán staff #{dispute.assignedStaffId}</Badge>
            )}
          </div>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
            Evidence window: {dispute.evidenceCollectionDueAt || "Chưa có"} · Staff SLA: {dispute.staffSlaDueAt || "Chưa có"} · Access: {dispute.staffAccessScope || "Chưa cấp"}
          </p>
        </Card>
      )}

      <div className="grid gap-3">
        {items.map((staff) => (
          <Card key={staff.staffId} className="p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                    <Users className="h-4 w-4" />
                  </span>
                  <p className="font-extrabold text-ink">
                    {staff.fullName || `Staff #${staff.staffId}`}
                  </p>
                  <Badge tone={staff.availabilityStatus === "Idle" ? "mint" : "amber"}>
                    {staff.availabilityStatus}
                  </Badge>
                  {staff.matchedSpecialization && (
                    <Badge tone="brand">Matched specialization</Badge>
                  )}
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-500">
                  {staff.email || `Account #${staff.accountId}`}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {staff.specialization || "General"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Badge tone="slate">{staff.activeDisputeWorkload} active case</Badge>
                <Button
                  size="sm"
                  onClick={() => assign(staff.staffId)}
                  loading={assigning === staff.staffId}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Assign / Override
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

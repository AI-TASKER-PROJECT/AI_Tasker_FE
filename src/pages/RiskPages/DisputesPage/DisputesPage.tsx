import { useEffect, useMemo, useState } from "react";
import { contractApi, disputeApi } from "../../../lib/api";
import { useSession } from "../../../lib/session";
import type { Dispute } from "../../../types";
import {
  Badge,
  Card,
  LinkButton,
  Notice,
  PageHeader,
  SearchInput,
  StatusBadge,
} from "../../../components/ui";

function normalizeStatus(value?: string) {
  return (value || "").trim().toUpperCase();
}

export function DisputesPage({ staffMode = false }: { staffMode?: boolean }) {
  const session = useSession();
  const isAdmin = session?.role === "ADMIN";
  const detailPath = (disputeId: number) => {
    if (isAdmin) return `/app/disputes/${disputeId}`;
    if (staffMode) return `/app/tickets/${disputeId}`;
    return `/app/disputes/${disputeId}`;
  };
  const projectPath = (disputeId: number) => {
    if (staffMode) return `/app/tickets/${disputeId}/project`;
    return `/app/disputes/${disputeId}/project`;
  };
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [items, setItems] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchDisputes = async () => {
      setLoading(true);
      try {
        if (staffMode || isAdmin) {
          const data = await disputeApi.listAll();
          if (mounted) setItems(Array.isArray(data) ? data : []);
          return;
        }
        const contracts = await contractApi.listContracts();
        const groups = await Promise.all(
          contracts.map((contract) => disputeApi.listByContract(contract.contractId)),
        );
        if (mounted) setItems(groups.flat());
      } catch {
        if (mounted) setItems([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void fetchDisputes();
    return () => {
      mounted = false;
    };
  }, [staffMode, isAdmin]);

  const disputes = useMemo(
    () =>
      items.filter((item) => {
        const haystack = `${item.title || ""} ${item.jobTitle || ""} ${item.status || ""} ${item.staffName || ""}`.toLowerCase();
        if (query && !haystack.includes(query.toLowerCase())) return false;
        if (statusFilter !== "ALL" && normalizeStatus(item.status) !== statusFilter) return false;
        return true;
      }),
    [items, query, statusFilter],
  );

  const statusOptions = staffMode
    ? [
        { value: "ALL", label: "Moi trang thai" },
        { value: "ESCALATION_REQUESTED", label: "Cho xu ly" },
        { value: "STAFF_REVIEWING", label: "Dang staff review" },
        { value: "STAFF_DECIDED", label: "Staff da quyet dinh" },
        { value: "RESOLVED", label: "Da giai quyet" },
      ]
    : [{ value: "ALL", label: "Moi trang thai" }];

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          title={staffMode ? "Ticket tranh chap staff duoc giao" : "Tranh chap cua du an"}
          description={
            staffMode
              ? "Danh sach nay lay tu backend flow45 va chi hien cac dispute dang duoc giao cho staff hien tai."
              : "Doanh nghiep va chuyen gia theo doi cac dispute lien quan den contract."
          }
        />
      </div>

      {staffMode && (
        <Notice tone="info" title="Danh sach ticket cua staff">
          Staff khong tu nhan ticket o man nay nua. Backend flow45 chi cho admin hoac auto-routing gan tranh chap cho staff, sau do staff vao doc ho so project va xu ly.
        </Notice>
      )}

      <Card className="flex flex-col gap-4 p-4 sm:flex-row">
        <div className="flex-1">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder={staffMode ? "Tim theo ten contract, project, milestone..." : "Tim dispute theo project..."}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {loading ? (
        <div className="py-8 text-center text-slate-500">Dang tai...</div>
      ) : disputes.length === 0 ? (
        <div className="py-8 text-center text-slate-500">Khong tim thay du lieu.</div>
      ) : (
        <div className="grid gap-4">
          {disputes.map((dispute) => (
            <Card key={dispute.disputeId} className="p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone="brand">#{dispute.disputeId}</Badge>
                    <StatusBadge status={dispute.status} />
                    {dispute.staffName && <Badge tone="mint">Staff: {dispute.staffName}</Badge>}
                  </div>
                  <h3 className="mt-3 font-display text-lg font-extrabold text-ink">
                    {dispute.title || `Tranh chap #${dispute.disputeId}`}
                  </h3>
                  <p className="mt-2 text-sm text-slate-500">
                    {dispute.jobTitle || "Backend chua tra ten project"} 
                  </p>
                  {dispute.escalationReason && (
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                      <strong>Ly do tranh chap:</strong> {dispute.escalationReason}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge tone="slate">Nguoi tao: {dispute.raisedBy || dispute.initiatedBy || "Chua ro"}</Badge>
                    {dispute.createdAt && (
                      <Badge tone="slate">Ngay tao: {new Date(dispute.createdAt).toLocaleString()}</Badge>
                    )}
                    {dispute.staffSlaDueAt && (
                      <Badge tone="amber">Han report: {new Date(dispute.staffSlaDueAt).toLocaleString()}</Badge>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex flex-col gap-2 md:mt-0">
                  <LinkButton
                    to={projectPath(dispute.disputeId)}
                    variant="secondary"
                  >
                    Xem thong tin project
                  </LinkButton>
                  {isAdmin && !dispute.assignedStaffId && normalizeStatus(dispute.status) !== "RESOLVED" && (
                    <LinkButton
                      to={`/app/admin/staff-assignment?disputeId=${dispute.disputeId}`}
                      variant="secondary"
                    >
                      Gán staff phù hợp
                    </LinkButton>
                  )}
                  {isAdmin && normalizeStatus(dispute.status) === "STAFF_DECIDED" && (
                    <LinkButton to={`/app/disputes/${dispute.disputeId}`} variant="secondary">
                      Báo cáo staff / duyệt
                    </LinkButton>
                  )}
                  <LinkButton to={detailPath(dispute.disputeId)} variant="primary">
                    {staffMode || isAdmin ? "Mo ticket xu ly" : "Xem bao cao tranh chap"}
                  </LinkButton>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

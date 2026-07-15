import { useEffect, useMemo, useState } from "react";
import { Badge, Card, EmptyState, LinkButton, Notice, PageHeader, SearchInput } from "../../../components/ui";
import { contractApi, disputeApi } from "../../../lib/api";
import { useSession } from "../../../lib/session";
import { formatDateTime } from "../../../lib/utils";
import type { AdminDisputeListItem, Dispute, StaffDisputeListItem } from "../../../types";

type DisputeListItem = Dispute & {
  contractTitle?: string;
  jobDomains?: string[];
  jobSkills?: string[];
  matchedStaffDomains?: string[];
  matchedStaffSkills?: string[];
  staffDecisionMade?: boolean;
};

const ACTIVE_STATUSES = new Set([
  "PENDING_SELF_RESOLVE",
  "ESCALATION_REQUESTED",
  "STAFF_REVIEWING",
  "STAFF_DECIDED",
]);

// Chuẩn hóa status để so sánh trạng thái tranh chấp không phụ thuộc chữ hoa/thường.
function normalizeStatus(value?: string) {
  return (value || "").trim().toUpperCase();
}

// Đổi mã trạng thái tranh chấp từ backend sang nhãn tiếng Việt để hiển thị.
function formatDisputeStatus(status?: string) {
  switch (normalizeStatus(status)) {
    case "PENDING_SELF_RESOLVE":
      return "Tạo hồ sơ";
    case "ESCALATION_REQUESTED":
      return "Đã yêu cầu Staff";
    case "STAFF_REVIEWING":
      return "Cần xử lý";
    case "STAFF_DECIDED":
      return "Đã ra quyết định";
    case "RESOLVED":
      return "Đã xử lý xong";
    case "CANCELLED":
      return "Đã rút tranh chấp";
    default:
      return status || "Chưa cập nhật";
  }
}

// Đổi loại khởi tạo tranh chấp sang mô tả dễ hiểu cho Business/Expert/Staff.
function formatInitiationType(type?: string) {
  switch (normalizeStatus(type)) {
    case "BUSINESS_REJECTED_DELIVERABLE":
      return "Business phản đối kết quả bàn giao";
    case "EXPERT_SCOPE_CONCERN":
      return "Expert phản ánh yêu cầu ngoài phạm vi";
    case "EXPERT_NO_REVIEW_RESPONSE":
      return "Business chưa phản hồi nghiệm thu";
    case "EXPERT_BAD_FAITH_REJECTION":
      return "Từ chối không phù hợp tiêu chí";
    case "OTHER":
      return "Lý do khác";
    default:
      return type || "Chưa phân loại";
  }
}

// Lấy tên hồ sơ phù hợp cho danh sách ticket của Staff.
function displayCaseName(item: DisputeListItem) {
  return item.jobTitle || item.title || "Hồ sơ tranh chấp";
}

// Tạo tiêu đề tranh chấp cho danh sách của Business/Expert.
function disputeDisplayTitle(dispute: DisputeListItem) {
  return `Tranh chấp - ${dispute.contractTitle || dispute.title || "Hợp đồng đang tranh chấp"}`;
}

// Chuyển dữ liệu dispute dạng Admin API về format chung để render danh sách.
function mapAdminDispute(item: AdminDisputeListItem): DisputeListItem {
  return {
    disputeId: item.disputeId,
    contractId: item.contractId,
    milestoneId: item.milestoneId,
    assignedStaffId: item.assignedStaff?.staffId,
    status: item.status,
    initiatedBy: item.initiatedBy,
    initiationType: item.initiationType,
    createdAt: item.createdAt,
    staffDecidedAt: item.staffDecidedAt,
    staffDecisionPercentage: item.expertPayoutPercentage,
    staffProposedExpertAmount: item.expertPayoutAmount,
    businessRefundAmount: item.businessRefundAmount,
    settlementExecutedAt: item.settlementExecutedAt,
    settlementWalletTransactionId: item.settlementWalletTransactionId,
    staffName: item.assignedStaff?.displayName,
    title: "Hồ sơ tranh chấp",
  };
}

// Chuyển dữ liệu ticket Staff API về format chung, giữ thêm thông tin match domain/skill.
function mapStaffDispute(item: StaffDisputeListItem): DisputeListItem {
  return {
    disputeId: item.disputeId,
    contractId: item.contractId,
    milestoneId: item.milestoneId,
    status: item.status,
    initiatedBy: item.initiatedBy,
    initiationType: item.initiationType,
    escalationReason: item.reason,
    createdAt: item.createdAt,
    jobTitle: item.jobTitle,
    title: item.jobTitle || "Hồ sơ tranh chấp được giao",
    evidenceCollectionDueAt: item.evidenceCollectionDueAt,
    staffSlaDueAt: item.staffSlaDueAt,
    staffReviewStartedAt: item.staffReviewStartedAt,
    staffDecidedAt: item.staffDecidedAt,
    staffDecisionMade: item.staffDecisionMade,
    jobDomains: item.jobDomains || [],
    jobSkills: item.jobSkills || [],
    matchedStaffDomains: item.matchedStaffDomains || [],
    matchedStaffSkills: item.matchedStaffSkills || [],
  };
}

// Ghép danh sách nhãn domain/skill thành chuỗi ngắn để hiển thị.
function joinLabel(values?: string[]) {
  return values?.filter(Boolean).join(", ") || "";
}

// Kiểm tra một dispute có khớp bộ lọc trạng thái hiện tại hay không.
function matchesStatusFilter(status: string | undefined, filter: string, staffMode: boolean) {
  const normalized = normalizeStatus(status);
  if (filter === "ALL") return true;
  if (!staffMode && filter === "UNDER_REVIEW") {
    return ["ESCALATION_REQUESTED", "STAFF_REVIEWING"].includes(normalized);
  }
  return normalized === filter;
}

export function DisputesPage({ staffMode = false }: { staffMode?: boolean }) {
  const session = useSession();
  const isAdmin = session?.role === "ADMIN";
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [items, setItems] = useState<DisputeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState<number | null>(null);

  // Tạo đường dẫn màn chi tiết, Staff dùng route tickets còn user/admin dùng route disputes.
  const detailPath = (disputeId: number) =>
    staffMode ? `/app/tickets/${disputeId}` : `/app/disputes/${disputeId}`;

  // Tạo đường dẫn xem thông tin dự án liên quan đến dispute.
  const projectPath = (disputeId: number) =>
    staffMode
      ? `/app/tickets/${disputeId}/project`
      : `/app/disputes/${disputeId}/project`;

  useEffect(() => {
    let mounted = true;

    //Tải danh sách tranh chấp theo vai trò: Admin toàn hệ thống, Staff ticket được giao, user theo hợp đồng của mình.
    const fetchDisputes = async () => {
      setLoading(true);
      try {
        // Admin tải danh sách tranh chấp toàn hệ thống, có hỗ trợ lọc và phân trang.
        if (isAdmin) {
          const response = await disputeApi.listAdmin({
            page: 0,
            size: 100,
            status: statusFilter === "ALL" ? undefined : statusFilter,
            q: query.trim() || undefined,
          });
          if (mounted) {
            setItems(response.content.map(mapAdminDispute));
            setTotal(response.totalElements);
          }
          return;
        }

        if (staffMode) {
          //hàm Tải danh sách tranh chấp được phân công/phù hợp với Staff hiện tại.
          const response = await disputeApi.listStaff({
            page: 0,
            size: 100,
            status: statusFilter === "ALL" ? undefined : statusFilter,
          });
          if (mounted) {
            setItems(response.content.map(mapStaffDispute));
            setTotal(response.totalElements);
          }
          return;
        }

        const contracts = await contractApi.listContracts();
        const contractTitleById = new Map(
          contracts.map((contract) => [
            contract.contractId,
            contract.contractTitle || contract.title || "Hợp đồng đang tranh chấp",
          ]),
        );
        const groups = await Promise.all(
          contracts.map((contract) =>
            disputeApi
              .listByContract(contract.contractId)
              .catch(() => [] as Dispute[]),
          ),
        );
        if (mounted) {
          setItems(
            groups.flat().map((dispute) => ({
              ...dispute,
              contractTitle: contractTitleById.get(dispute.contractId),
            })),
          );
          setTotal(null);
        }
      } catch {
        if (mounted) {
          setItems([]);
          setTotal(isAdmin || staffMode ? 0 : null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void fetchDisputes();
    return () => {
      mounted = false;
    };
  }, [staffMode, isAdmin, query, statusFilter]);

  // Lọc danh sách dispute ở frontend theo từ khóa và trạng thái sau khi lấy dữ liệu.
  const disputes = useMemo(
    () =>
      isAdmin
        ? items
        : items.filter((item) => {
            const haystack = [
              item.title,
              item.jobTitle,
              item.status,
              item.initiationType,
              item.staffName,
              ...(item.jobDomains || []),
              ...(item.jobSkills || []),
              ...(item.matchedStaffDomains || []),
              ...(item.matchedStaffSkills || []),
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();
            if (query && !haystack.includes(query.toLowerCase())) return false;
            if (!matchesStatusFilter(item.status, statusFilter, staffMode)) {
              return false;
            }
            return true;
          }),
    [items, query, statusFilter, isAdmin, staffMode],
  );

  const statusOptions = staffMode
    ? [
        { value: "ALL", label: "Tất cả" },
        { value: "STAFF_REVIEWING", label: "Đang cần xử lý" },
        { value: "RESOLVED", label: "Đã hoàn tất xử lý" },
      ]
    : isAdmin
      ? [
          { value: "ALL", label: "Tất cả tranh chấp" },
          { value: "PENDING_SELF_RESOLVE", label: "Tạo hồ sơ" },
          { value: "STAFF_REVIEWING", label: "Nhân viên đang xem xét" },
          { value: "RESOLVED", label: "Nhân viên đã xử lý xong" },
        ]
      : [
          { value: "ALL", label: "Tất cả tranh chấp của tôi" },
          { value: "PENDING_SELF_RESOLVE", label: "Tạo hồ sơ" },
          { value: "UNDER_REVIEW", label: "Đang chờ xem xét" },
          { value: "RESOLVED", label: "Đã giải quyết xong" },
        ];

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          title={
            staffMode
              ? "Tranh chấp được giao"
              : isAdmin
                ? "Tranh chấp toàn hệ thống"
                : "Tranh chấp"
          }
          description={
            staffMode
              ? "Danh sách hồ sơ được phân công theo chuyên môn, lĩnh vực và kỹ năng của bạn."
              : isAdmin
                ? "Theo dõi toàn bộ hồ sơ tranh chấp, Staff phụ trách và kết quả quyết toán."
                : "Theo dõi các hồ sơ tranh chấp liên quan đến hợp đồng của bạn."
          }
        />
      </div>

      <Card className="flex flex-col gap-4 p-4 sm:flex-row">
        <div className="flex-1">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder={
              staffMode
                ? "Tìm theo hồ sơ, lĩnh vực, kỹ năng hoặc trạng thái..."
                : isAdmin
                  ? "Tìm theo hồ sơ hoặc hợp đồng..."
                  : "Tìm tranh chấp theo dự án, trạng thái..."
            }
          />
        </div>
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
      </Card>

      {isAdmin && total !== null && (
        <Notice tone="success" title="Danh sách tranh chấp toàn hệ thống">
          Đang hiển thị {items.length} trên tổng {total} hồ sơ tranh chấp theo bộ lọc hiện tại.
        </Notice>
      )}

      {staffMode && total !== null && (
        <Notice tone="success" title="Danh sách tranh chấp theo chuyên môn">
          Đang hiển thị {disputes.length} trên tổng {total} hồ sơ được giao cho bạn.
        </Notice>
      )}

      {loading ? (
        <div className="py-8 text-center text-slate-500">
          Đang tải danh sách tranh chấp...
        </div>
      ) : disputes.length === 0 ? (
        <EmptyState
          title="Chưa có hồ sơ tranh chấp"
          description={
            staffMode
              ? "Hiện chưa có hồ sơ nào được phân công cho chuyên môn của bạn theo bộ lọc hiện tại."
              : isAdmin
                ? "Không có hồ sơ tranh chấp nào khớp bộ lọc hiện tại."
                : "Các tranh chấp mới sẽ xuất hiện ở đây sau khi được mở từ workspace hợp đồng."
          }
        />
      ) : (
        <div className="grid gap-4">
          {disputes.map((dispute) => {
            const status = normalizeStatus(dispute.status);
            const matchedDomains = joinLabel(dispute.matchedStaffDomains);
            const matchedSkills = joinLabel(dispute.matchedStaffSkills);
            return (
              <Card key={dispute.disputeId} className="p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                      <Badge tone={status === "RESOLVED" ? "mint" : ACTIVE_STATUSES.has(status) ? "amber" : "slate"}>
                        {formatDisputeStatus(dispute.status)}
                      </Badge>
                      {dispute.initiationType && (
                        <Badge tone="brand">
                          {formatInitiationType(dispute.initiationType)}
                        </Badge>
                      )}
                      {staffMode && matchedDomains && (
                        <Badge tone="mint">Khớp lĩnh vực: {matchedDomains}</Badge>
                      )}
                      {staffMode && matchedSkills && (
                        <Badge tone="violet">Khớp kỹ năng: {matchedSkills}</Badge>
                      )}
                      {!staffMode && dispute.staffName && (
                        <Badge tone="violet">Staff: {dispute.staffName}</Badge>
                      )}
                    </div>
                    <h3 className="mt-3 font-display text-lg font-extrabold text-ink">
                      {isAdmin ? "Hợp đồng tranh chấp" : staffMode ? displayCaseName(dispute) : disputeDisplayTitle(dispute)}
                    </h3>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                      {dispute.escalationReason ||
                        "Hồ sơ đang chờ bổ sung thông tin hoặc quyết định theo trạng thái hiện tại."}
                    </p>
                    {staffMode && (
                      <div className="mt-4 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                        <div>
                          <span className="font-semibold text-ink">Lĩnh vực dự án: </span>
                          {joinLabel(dispute.jobDomains) || "Chưa cập nhật"}
                        </div>
                        <div>
                          <span className="font-semibold text-ink">Kỹ năng liên quan: </span>
                          {joinLabel(dispute.jobSkills) || "Chưa cập nhật"}
                        </div>
                      </div>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {dispute.createdAt && (
                        <Badge tone="slate">
                          Mở lúc {formatDateTime(dispute.createdAt)}
                        </Badge>
                      )}
                      {dispute.staffReviewStartedAt && (
                        <Badge tone="slate">
                          Nhận xử lý {formatDateTime(dispute.staffReviewStartedAt)}
                        </Badge>
                      )}
                      {dispute.staffDecidedAt && (
                        <Badge tone="mint">
                          Quyết định {formatDateTime(dispute.staffDecidedAt)}
                        </Badge>
                      )}
                      {dispute.settlementExecutedAt && (
                        <Badge tone="mint">
                          Đã quyết toán {formatDateTime(dispute.settlementExecutedAt)}
                        </Badge>
                      )}
                      {dispute.evidenceCollectionDueAt && (
                        <Badge tone="amber">
                          Hạn bằng chứng {formatDateTime(dispute.evidenceCollectionDueAt)}
                        </Badge>
                      )}
                      {dispute.staffSlaDueAt && (
                        <Badge tone={dispute.staffSlaEscalatedAt ? "rose" : "slate"}>
                          SLA Staff {formatDateTime(dispute.staffSlaDueAt)}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 md:min-w-52">
                    {!isAdmin && (
                      <LinkButton to={projectPath(dispute.disputeId)} variant="secondary">
                        Xem thông tin dự án
                      </LinkButton>
                    )}
                    <LinkButton to={detailPath(dispute.disputeId)} variant="primary">
                      {staffMode ? "Mở hồ sơ xử lý" : "Xem hồ sơ"}
                    </LinkButton>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

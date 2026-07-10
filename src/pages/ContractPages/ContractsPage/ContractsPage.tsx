import { useEffect, useState } from "react";
import type { Contract } from "../../../types";
import { contractApi } from "../../../lib/api";
import { formatCompactCurrency, formatDateTime } from "../../../lib/utils";
import { Badge, Button, Card, EmptyState, LinkButton, PageHeader, Progress, StatusBadge } from "../../../components/ui";
import { formatTimelineWeeks, normalizeContractStatus, translateContractStatus } from "../ContractPages.shared";

export function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [activeStatus, setActiveStatus] = useState<
    "ALL" | "DRAFT" | "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED"
  >("ALL");

  useEffect(() => {
    contractApi
      .listContracts()
      .then(setContracts)
      .catch(() => setContracts([]));
  }, []);

  const filteredContracts =
    activeStatus === "ALL"
      ? contracts
      : contracts.filter(
          (contract) =>
            normalizeContractStatus(contract.status) ===
            normalizeContractStatus(activeStatus),
        );
  const draftCount = contracts.filter(
    (contract) => normalizeContractStatus(contract.status) === "DRAFT",
  ).length;
  const pendingCount = contracts.filter(
    (contract) => normalizeContractStatus(contract.status) === "PENDING",
  ).length;
  const activeCount = contracts.filter(
    (contract) => normalizeContractStatus(contract.status) === "ACTIVE",
  ).length;
  const completedCount = contracts.filter(
    (contract) => normalizeContractStatus(contract.status) === "COMPLETED",
  ).length;
  const cancelledCount = contracts.filter(
    (contract) => normalizeContractStatus(contract.status) === "CANCELLED",
  ).length;

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          title="Hợp đồng"
          description="Danh sách hợp đồng để đi vào đàm phán, kí quỹ, nghiệm thu và quản lý tiến độ dự án."
        />
      </div>
      <Card className="p-4">
        <div className="flex flex-wrap gap-2">
          {[
            { id: "ALL", label: "Tất cả", count: contracts.length },
            { id: "DRAFT", label: "Nháp", count: draftCount },
            { id: "PENDING", label: "Chờ phản hồi", count: pendingCount },
            { id: "ACTIVE", label: "Đang hoạt động", count: activeCount },
            { id: "COMPLETED", label: "Hoàn thành", count: completedCount },
            { id: "CANCELLED", label: "Đã hủy", count: cancelledCount },
          ].map((item) => (
            <Button
              key={item.id}
              type="button"
              variant={activeStatus === item.id ? "primary" : "secondary"}
              size="sm"
              onClick={() => setActiveStatus(item.id as typeof activeStatus)}
            >
              {item.label}
              <Badge tone={activeStatus === item.id ? "mint" : "slate"}>
                {item.count}
              </Badge>
            </Button>
          ))}
        </div>
      </Card>
      <div className="grid gap-4 xl:grid-cols-3">
        {filteredContracts.map((contract, index) => (
          <Card key={contract.contractId} hover className="p-5">
            <div className="flex items-start justify-between gap-3">
              <Badge tone="brand">#{index + 1}</Badge>
              <StatusBadge status={translateContractStatus(contract.status)} />
            </div>
            <h3 className="mt-4 font-display text-lg font-extrabold leading-7 text-ink">
              {contract.contractTitle || contract.title || "Hợp đồng"}
            </h3>
            <p className="mt-2 text-xs font-bold text-slate-400">
              Ngày tạo: {formatDateTime(contract.createdAt)}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-3">
              <div>
                <p className="text-xs font-bold text-slate-400">Giá trị</p>
                <p className="mt-1 text-sm font-extrabold text-ink">
                  {formatCompactCurrency(contract.totalBudget)}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400">Timeline</p>
                <p className="mt-1 text-sm font-extrabold text-ink">
                  {formatTimelineWeeks(contract.timelineDays)}
                </p>
              </div>
            </div>
            <div className="mt-5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                <span>Tiến dộ</span>
                <span>{contract.progress || 0}%</span>
              </div>
              <Progress value={contract.progress || 0} className="mt-2" />
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <LinkButton
                to={`/app/contracts/${contract.contractId}`}
                variant="secondary"
                size="sm"
              >
                Chi tiết
              </LinkButton>
              <LinkButton
                to={`/app/contracts/${contract.contractId}/workspace`}
                size="sm"
              >
                Workspace
              </LinkButton>
            </div>
          </Card>
        ))}
      </div>
      {filteredContracts.length === 0 && (
        <EmptyState
          title={
            normalizeContractStatus(activeStatus) === "DRAFT"
              ? "Chưa có hợp đồng nháp"
              : "Chưa có hợp đồng"
          }
          description="Hợp đồng nháp sẽ xuất hiện sau khi doanh nghiệp accept proposal và bấm tạo contract từ màn hình quản lý job."
        />
      )}
    </div>
  );
}

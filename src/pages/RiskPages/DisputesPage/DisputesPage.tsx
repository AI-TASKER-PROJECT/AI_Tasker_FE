import { useEffect, useState } from "react";
import { contractApi, disputeApi } from "../../../lib/api";
import type { Dispute } from "../../../types";
import { Badge, Card, LinkButton, PageHeader, SearchInput, StatusBadge } from "../../../components/ui";

export function DisputesPage({ staffMode = false }: { staffMode?: boolean }) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Dispute[]>([]);

  useEffect(() => {
    contractApi
      .listContracts()
      .then((contracts) =>
        Promise.all(
          contracts.map((contract) =>
            disputeApi.listByContract(contract.contractId),
          ),
        ),
      )
      .then((groups) => setItems(groups.flat()))
      .catch(() => setItems([]));
  }, []);

  const disputes = items.filter((item) =>
    `${item.title} ${item.jobTitle} ${item.status}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          title={staffMode ? "Tranh chấp được giao" : "Tranh chấp của dự án"}
          description={
            staffMode
              ? "Staff tiếp nhận, demo testing, viết technical report và đề xuất xử lý."
              : "Doanh nghiệp/chuyên gia tạo dispute để khóa dòng tiền và yêu cầu can thiệp."
          }
        />
      </div>
      <Card className="p-4">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Tìm dispute theo job, trạng thái..."
        />
      </Card>
      <div className="grid gap-4">
        {disputes.map((dispute) => (
          <Card key={dispute.disputeId} className="p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone="brand">#{dispute.disputeId}</Badge>
                  <StatusBadge status={dispute.status} />
                </div>
                <h3 className="mt-3 font-display text-lg font-extrabold text-ink">
                  {dispute.title}
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  {dispute.jobTitle}
                </p>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                  {dispute.evidenceReport}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge tone="slate">Người tạo: {dispute.raisedBy}</Badge>
                  <Badge tone="mint">
                    Staff: {dispute.staffName || "Chưa gán"}
                  </Badge>
                </div>
              </div>
              <LinkButton
                to={
                  staffMode
                    ? `/app/tickets/${dispute.disputeId}`
                    : `/app/disputes/${dispute.disputeId}`
                }
                variant="secondary"
              >
                Xử lý
              </LinkButton>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

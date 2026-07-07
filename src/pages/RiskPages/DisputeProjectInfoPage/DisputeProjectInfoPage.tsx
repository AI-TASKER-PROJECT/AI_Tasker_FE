import { Gavel } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { contractApi, disputeApi } from "../../../lib/api";
import { useSession } from "../../../lib/session";
import { marketplaceApi } from "../../../services/marketplaceService";
import { formatCurrency, formatDateTime } from "../../../lib/utils";
import type { AcceptanceCriteria, Contract, Dispute, Job, Milestone } from "../../../types";
import {
  Badge,
  Card,
  EmptyState,
  LinkButton,
  Notice,
  PageHeader,
  SectionHeading,
  StatusBadge,
} from "../../../components/ui";

function getJobMilestoneId(milestone: Milestone) {
  return Number(
    (milestone as Milestone & { jobMilestoneId?: number }).jobMilestoneId ??
      milestone.milestoneId,
  );
}

export function DisputeProjectInfoPage() {
  const { disputeId } = useParams();
  const session = useSession();
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [criteriaByMilestone, setCriteriaByMilestone] = useState<Record<number, AcceptanceCriteria[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = Number(disputeId);
    if (!Number.isFinite(id) || id <= 0) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const disputeData = await disputeApi.get(id);
        setDispute(disputeData);
        const [contractData, milestoneData] = await Promise.all([
          contractApi.getContract(disputeData.contractId),
          contractApi.listMilestones(disputeData.contractId),
        ]);
        setContract(contractData);
        setMilestones(milestoneData);
        const jobData = await (contractData.jobId
          ? marketplaceApi.getJob(contractData.jobId).catch(() => null)
          : Promise.resolve(null));
        const criteriaEntries = await Promise.all(
          milestoneData.map(async (milestone) => {
            const jobMilestoneId = getJobMilestoneId(milestone);
            const criteriaData = await contractApi
              .listCriteria(jobMilestoneId)
              .catch(() => []);
            return [jobMilestoneId, criteriaData] as const;
          }),
        );
        setJob(jobData);
        setCriteriaByMilestone(Object.fromEntries(criteriaEntries));
      } catch {
        setDispute(null);
        setContract(null);
        setJob(null);
        setMilestones([]);
        setCriteriaByMilestone({});
      } finally {
        setLoading(false);
      }
    })();
  }, [disputeId]);

  if (loading) {
    return <div className="py-8 text-center text-slate-500">Dang tai thong tin project...</div>;
  }

  if (!dispute || !contract) {
    return (
      <EmptyState
        title="Khong mo duoc thong tin project"
        description="Chua lay duoc du lieu contract va cot moc tranh chap."
      />
    );
  }

  const businessDisplayName =
    contract.businessName?.trim() ||
    (contract.businessId ? `Business #${contract.businessId}` : "Business");
  const expertDisplayName =
    contract.expertName?.trim() ||
    (contract.expertId ? `Expert #${contract.expertId}` : "Expert");
  const sowText = job?.structuredSow?.trim() || job?.rawRequirements?.trim() || "Business chua cung cap de bai chi tiet.";
  const backTo = session?.role === "ADMIN"
    ? `/app/disputes/${dispute.disputeId}`
    : `/app/tickets/${dispute.disputeId}`;

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          title={contract.contractTitle || dispute.jobTitle || "Thong tin project"}
          description="Trang nay chi cung cap de bai business, SoW va cac cot moc cua du an de tham khao."
          actions={
            <LinkButton to={backTo} variant="secondary">
              <Gavel className="h-4 w-4" />
              Quay lai ticket
            </LinkButton>
          }
        />
      </div>

      <Notice tone="info" title="Trang thong tin">
        Day la trang chi doc. Dung man nay de xem de bai cua business va thong tin cot moc cua du an.
      </Notice>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <Card className="p-6">
          <SectionHeading
            title="De bai cua business / SoW"
            description="Noi dung staff can doc de hieu pham vi project va ky vong tu business."
          />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Ten contract
              </div>
              <div className="mt-2 text-lg font-bold text-ink">
                {contract.contractTitle || "Chua co ten contract"}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Trang thai
              </div>
              <div className="mt-2">
                <StatusBadge status={contract.status} />
              </div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Tong ngan sach
              </div>
              <div className="mt-2 text-base font-bold text-ink">
                {formatCurrency(contract.totalBudget)}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Timeline
              </div>
              <div className="mt-2 text-base font-bold text-ink">
                {contract.timelineDays} ngay
              </div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Business
              </div>
              <div className="mt-2 text-base font-bold text-ink">
                {businessDisplayName}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Expert
              </div>
              <div className="mt-2 text-base font-bold text-ink">
                {expertDisplayName}
              </div>
            </div>
          </div>
          <div className="mt-5 rounded-2xl border border-slate-100 bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Noi dung de bai
            </div>
            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-700">
              {sowText}
            </p>
          </div>
          {contract.technologyUsed && (
            <div className="mt-4 rounded-2xl border border-brand-100 bg-brand-50/60 p-4 text-sm text-slate-700">
              <strong>Cong nghe:</strong> {contract.technologyUsed}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <SectionHeading
            title="Cot moc cua du an"
            description="Toan bo cot moc va tieu chi nghiem thu cua du an."
          />
          {milestones.length === 0 ? (
            <EmptyState
              title="Chua co du lieu cot moc"
              description="Backend chua tra danh sach cot moc cua du an."
            />
          ) : (
            <div className="mt-5 grid gap-4">
              {milestones.map((milestone) => {
                const jobMilestoneId = getJobMilestoneId(milestone);
                const criteria = criteriaByMilestone[jobMilestoneId] || [];
                return (
                  <div key={jobMilestoneId} className="rounded-2xl border border-slate-100 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone="brand">Moc {milestone.orderIndex ?? "-"}</Badge>
                          <StatusBadge status={milestone.status} />
                        </div>
                        <div className="mt-2 text-base font-bold text-ink">
                          {milestone.milestoneName || "Cot moc cua du an"}
                        </div>
                      </div>
                      <div className="text-sm text-slate-500">
                        {formatCurrency(milestone.finalBudget || milestone.fundsAllocated)}
                      </div>
                    </div>
                    <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 text-sm text-slate-600">
                      <p>
                        {milestone.description ||
                          "Backend chua tra mo ta chi tiet cho cot moc nay."}
                      </p>
                      {milestone.deliverableExpectation && (
                        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                            Deliverable expectation
                          </div>
                          <p className="mt-2">{milestone.deliverableExpectation}</p>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {milestone.updatedAt && (
                          <Badge tone="slate">
                            Cap nhat: {formatDateTime(milestone.updatedAt)}
                          </Badge>
                        )}
                        {milestone.dueAt && (
                          <Badge tone="amber">
                            Han nop: {formatDateTime(milestone.dueAt)}
                          </Badge>
                        )}
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Tieu chi nghiem thu
                        </div>
                        {criteria.length === 0 ? (
                          <p className="mt-2">Backend chua tra acceptance criteria cho cot moc nay.</p>
                        ) : (
                          <div className="mt-3 space-y-2">
                            {criteria.map((item, index) => (
                              <div key={item.criteriaId || index} className="rounded-2xl border border-white bg-white p-3">
                                <div className="text-sm font-semibold text-ink">
                                  {item.category || `Tieu chi ${index + 1}`}
                                </div>
                                <p className="mt-1 text-sm text-slate-600">{item.description}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

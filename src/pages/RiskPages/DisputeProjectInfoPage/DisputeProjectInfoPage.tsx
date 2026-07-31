import { Gavel } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { contractApi, disputeApi, profileApi } from "../../../lib/api";
import { useSession } from "../../../lib/session";
import { formatCurrency, formatDateTime } from "../../../lib/utils";
import type {
  AcceptanceCriteria,
  Contract,
  Dispute,
  Milestone,
} from "../../../types";
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

// Lấy id milestone gốc của Job để truy vấn tiêu chí nghiệm thu đúng với hồ sơ tranh chấp.
function getJobMilestoneId(milestone: Milestone) {
  return Number(
    (milestone as Milestone & { jobMilestoneId?: number }).jobMilestoneId ??
      milestone.milestoneId,
  );
}

async function resolveParticipantNames(contract: Contract) {
  const [businessResult, expertResult] = await Promise.allSettled([
    contract.businessName
      ? Promise.resolve(null)
      : profileApi.getBusinessById(contract.businessId),
    contract.expertName
      ? Promise.resolve(null)
      : profileApi.getExpertById(contract.expertId),
  ]);

  return {
    businessName:
      contract.businessName?.trim() ||
      (businessResult.status === "fulfilled"
        ? businessResult.value?.companyName
        : undefined),
    expertName:
      contract.expertName?.trim() ||
      (expertResult.status === "fulfilled"
        ? expertResult.value?.fullName
        : undefined),
  };
}

export function DisputeProjectInfoPage() {
  const { disputeId } = useParams();
  const session = useSession();
  // Chuyển disputeId từ route sang số để gọi API chi tiết tranh chấp.
  const parsedDisputeId = useMemo(() => Number(disputeId), [disputeId]);
  const hasValidDisputeId =
    Number.isFinite(parsedDisputeId) && parsedDisputeId > 0;
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [participantNames, setParticipantNames] = useState<{
    businessName?: string;
    expertName?: string;
  }>({});
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [criteriaByMilestone, setCriteriaByMilestone] = useState<
    Record<number, AcceptanceCriteria[]>
  >({});
  const [loading, setLoading] = useState(true);

  // Tải bối cảnh dự án của tranh chấp: dispute, contract, job, milestone và criteria cho Staff tham khảo.
  useEffect(() => {
    let mounted = true;
    if (!hasValidDisputeId) {
      return () => {
        mounted = false;
      };
    }

    (async () => {
      try {
        const disputeData = await disputeApi.get(parsedDisputeId);
        if (!mounted) return;
        setDispute(disputeData);
        const [contractData, milestoneData] = await Promise.all([
          contractApi.getContract(disputeData.contractId),
          contractApi.listMilestones(disputeData.contractId),
        ]);
        if (!mounted) return;
        setContract(contractData);
        setMilestones(milestoneData);
        const names = await resolveParticipantNames(contractData);
        if (!mounted) return;
        setParticipantNames(names);
        const criteriaEntries = await Promise.all(
          milestoneData.map(async (milestone) => {
            const jobMilestoneId = getJobMilestoneId(milestone);
            const criteriaData = await contractApi
              .listCriteria(jobMilestoneId)
              .catch(() => []);
            return [jobMilestoneId, criteriaData] as const;
          }),
        );
        if (!mounted) return;
        setCriteriaByMilestone(Object.fromEntries(criteriaEntries));
      } catch {
        if (!mounted) return;
        setDispute(null);
        setContract(null);
        setParticipantNames({});
        setMilestones([]);
        setCriteriaByMilestone({});
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [hasValidDisputeId, parsedDisputeId]);

  if (!hasValidDisputeId) {
    return (
      <EmptyState
        title="Không mở được thông tin dự án"
        description="Mã hồ sơ tranh chấp không hợp lệ."
      />
    );
  }

  if (loading) {
    return (
      <div className="py-8 text-center text-slate-500">
        Đang tải thông tin dự án...
      </div>
    );
  }

  if (!dispute || !contract) {
    return (
      <EmptyState
        title="Không mở được thông tin dự án"
        description="Chưa lấy được dữ liệu hợp đồng và mốc tranh chấp."
      />
    );
  }

  const businessDisplayName =
    participantNames.businessName ||
    contract.businessName?.trim() ||
    "Doanh nghiệp";
  const expertDisplayName =
    participantNames.expertName || contract.expertName?.trim() || "Chuyên gia";
  const backTo =
    session?.role === "ADMIN"
      ? `/app/disputes/${dispute.disputeId}`
      : `/app/tickets/${dispute.disputeId}`;

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          title={
            contract.contractTitle || dispute.jobTitle || "Thông tin dự án"
          }
          description="Trang này chỉ cung cấp đề bài doanh nghiệp, SoW và các mốc của dự án để tham khảo."
          actions={
            <LinkButton to={backTo} variant="secondary">
              <Gavel className="h-4 w-4" />
              Quay lại hồ sơ
            </LinkButton>
          }
        />
      </div>

      <Notice tone="success" title="Trang thông tin">
        Đây là trang chỉ đọc. Dùng màn này để xem đề bài của doanh nghiệp và
        thông tin mốc của dự án.
      </Notice>

      <div className="grid gap-6">
        <Card className="p-6">
          <SectionHeading
            title="Thông tin dự án"
            description="Nội dung nhân viên cần đọc để hiểu phạm vi dự án và kỳ vọng từ doanh nghiệp."
          />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Tên hợp đồng
              </div>
              <div className="mt-2 text-lg font-bold text-ink">
                {contract.contractTitle || "Chưa có tên hợp đồng"}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Trạng thái
              </div>
              <div className="mt-2">
                <StatusBadge status={contract.status} />
              </div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Tổng ngân sách
              </div>
              <div className="mt-2 text-base font-bold text-ink">
                {formatCurrency(contract.totalBudget)}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Thời gian
              </div>
              <div className="mt-2 text-base font-bold text-ink">
                {contract.timelineDays} ngày
              </div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Doanh nghiệp
              </div>
              <div className="mt-2 text-base font-bold text-ink">
                {businessDisplayName}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Chuyên gia
              </div>
              <div className="mt-2 text-base font-bold text-ink">
                {expertDisplayName}
              </div>
            </div>
          </div>
          {contract.technologyUsed && (
            <div className="mt-4 rounded-2xl border border-brand-100 bg-brand-50/60 p-4 text-sm text-slate-700">
              <strong>Công nghệ:</strong> {contract.technologyUsed}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <SectionHeading
            title="Mốc của dự án"
            description="Toàn bộ mốc và tiêu chí nghiệm thu của dự án."
          />
          {milestones.length === 0 ? (
            <EmptyState
              title="Chưa có dữ liệu cột mốc"
              description="Máy chủ chưa trả danh sách cột mốc của dự án."
            />
          ) : (
            <div className="mt-5 grid gap-4">
              {milestones.map((milestone) => {
                const jobMilestoneId = getJobMilestoneId(milestone);
                const criteria = criteriaByMilestone[jobMilestoneId] || [];
                return (
                  <div
                    key={jobMilestoneId}
                    className="rounded-2xl border border-slate-100 bg-white p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone="brand">
                            Mốc {milestone.orderIndex ?? "-"}
                          </Badge>
                          <StatusBadge status={milestone.status} />
                        </div>
                        <div className="mt-2 text-base font-bold text-ink">
                          {milestone.milestoneName || "Mốc của dự án"}
                        </div>
                      </div>
                      <div className="text-sm text-slate-500">
                        {formatCurrency(
                          milestone.finalBudget || milestone.fundsAllocated,
                        )}
                      </div>
                    </div>
                    <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 text-sm text-slate-600">
                      <p>
                        {milestone.description ||
                          "Máy chủ chưa trả mô tả chi tiết cho cột mốc này."}
                      </p>
                      {milestone.deliverableExpectation && (
                        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                            Kỳ vọng sản phẩm bàn giao
                          </div>
                          <p className="mt-2">
                            {milestone.deliverableExpectation}
                          </p>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {milestone.updatedAt && (
                          <Badge tone="slate">
                            Cập nhật: {formatDateTime(milestone.updatedAt)}
                          </Badge>
                        )}
                        {milestone.dueAt && (
                          <Badge tone="amber">
                            Hạn nộp: {formatDateTime(milestone.dueAt)}
                          </Badge>
                        )}
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Tiêu chí nghiệm thu
                        </div>
                        {criteria.length === 0 ? (
                          <p className="mt-2">
                            Máy chủ chưa trả tiêu chí nghiệm thu cho cột mốc
                            này.
                          </p>
                        ) : (
                          <div className="mt-3 space-y-2">
                            {criteria.map((item, index) => (
                              <div
                                key={item.criteriaId || index}
                                className="rounded-2xl border border-white bg-white p-3"
                              >
                                <div className="text-sm font-semibold text-ink">
                                  {item.category || `Tiêu chí ${index + 1}`}
                                </div>
                                <p className="mt-1 text-sm text-slate-600">
                                  {item.description}
                                </p>
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

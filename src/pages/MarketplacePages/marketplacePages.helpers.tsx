import { formatCurrency } from "../../lib/utils";
import type { Milestone } from "../../types";
import { skillCountLabel } from "./marketplacePages.utils";

export function CompactMilestones({ milestones }: { milestones: Milestone[] }) {
  if (milestones.length === 0) {
    return (
      <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-400">
        Chưa có milestone.
      </div>
    );
  }

  return (
    <div className="mt-4 grid gap-2">
      {milestones
        .slice()
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((milestone) => (
          <div
            key={`${milestone.jobId}-${milestone.milestoneId}-${milestone.orderIndex}`}
            className="grid gap-2 rounded-2xl border border-slate-100 bg-white p-3 text-sm md:grid-cols-[56px_1fr_auto]"
          >
            <p className="text-xs font-extrabold uppercase tracking-wide text-brand-600">
              Mốc {milestone.orderIndex}
            </p>
            <div className="min-w-0">
              <p className="break-words font-extrabold text-ink">
                {milestone.milestoneName}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-400">
                <span>{milestone.status || "Pending"}</span>
                <span className="flex items-center gap-1">
                  • {(() => {
                    const dVal = milestone.durationValue ?? (milestone as any).duration;
                    return dVal && dVal > 0 ? `${dVal} ${milestone.durationUnit || "WEEK"}` : "Chưa xác định";
                  })()}
                </span>
              </div>
            </div>
            <p className="font-extrabold text-ink md:text-right">
              {formatCurrency(milestone.fundsAllocated)}
            </p>
          </div>
        ))}
    </div>
  );
}

export function MilestoneCount({ count }: { count: number }) {
  return (
    <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-3">
      <p className="text-xs font-bold text-slate-400">Milestone</p>
      <p className="mt-1 text-sm font-extrabold text-ink">{count} mốc</p>
    </div>
  );
}

export function SkillCount({ count }: { count: number }) {
  return (
    <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-3">
      <p className="text-xs font-bold text-slate-400">Kỹ năng</p>
      <p className="mt-1 text-sm font-extrabold text-ink">
        {skillCountLabel(count)}
      </p>
    </div>
  );
}

import { CheckCircle2 } from "lucide-react";
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
                <span className="flex items-center gap-1">
                  {(() => {
                    const dVal = milestone.durationValue ?? (milestone as any).duration;
                    const unit = milestone.durationUnit === "WEEK" ? "TUẦN" : (milestone.durationUnit || "TUẦN");
                    return dVal && dVal > 0 ? `${dVal} ${unit}` : "Chưa xác định";
                  })()}
                </span>
              </div>
              {milestone.criteria && milestone.criteria.length > 0 && (
                <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Tiêu chí nghiệm thu
                  </p>
                  <ul className="grid gap-1.5">
                    {milestone.criteria.map((c, i) => (
                      <li
                        key={c.criteriaId || i}
                        className="flex items-start gap-2 text-sm text-slate-600"
                      >
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        <span>{c.description}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
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
      <p className="text-xs font-bold text-slate-400">Mốc công việc</p>
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

import type { Job } from "../types";
import { cn } from "../lib/utils";
import { resolveJobSow } from "../lib/jobSow";

interface JobSowContentProps {
  job: Partial<Pick<Job, "sow" | "structuredSow" | "rawRequirements">>;
  className?: string;
  emptyMessage?: string;
}

export function JobSowContent({
  job,
  className,
  emptyMessage = "Chưa có nội dung SoW.",
}: JobSowContentProps) {
  const display = resolveJobSow(job);

  if (display.plainText) {
    return (
      <p className={cn("whitespace-pre-wrap text-sm leading-7 text-slate-700", className)}>
        {display.plainText}
      </p>
    );
  }

  if (!display.overview && display.sections.length === 0) {
    return <p className={cn("text-sm text-slate-500", className)}>{emptyMessage}</p>;
  }

  return (
    <div className={cn("space-y-5 text-sm leading-7 text-slate-700", className)}>
      {display.title && (
        <h3 className="font-display text-base font-extrabold text-ink">
          {display.title}
        </h3>
      )}
      {display.overview && (
        <section>
          <h4 className="font-bold text-ink">Tổng quan</h4>
          <p className="mt-1 whitespace-pre-wrap">{display.overview}</p>
        </section>
      )}
      {display.sections.map((section) => (
        <section key={section.key}>
          <h4 className="font-bold text-ink">{section.title}</h4>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {section.items.map((item, index) => (
              <li key={`${section.key}-${index}`}>{item}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

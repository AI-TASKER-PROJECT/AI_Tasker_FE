import { Link } from "react-router-dom";
import { cn } from "../../lib/utils";

export function Logo({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <Link to="/" className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl shadow-glow">
        <img
          src="/logo.jpg"
          alt="AITasker Logo"
          className="h-full w-full object-cover"
        />
      </span>
      {!compact && (
        <span className="font-display text-xl font-extrabold tracking-[-0.04em] text-ink">
          AI<span className="text-brand-600">TASKER</span>
        </span>
      )}
    </Link>
  );
}

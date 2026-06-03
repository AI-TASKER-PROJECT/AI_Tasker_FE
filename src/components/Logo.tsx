import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <Link to="/" className={cn('inline-flex items-center gap-2.5', className)}>
      <span className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 via-brand-600 to-indigo-600 text-white shadow-glow">
        <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,.65),transparent_34%)]" />
        <Sparkles className="relative h-5 w-5" strokeWidth={2.3} />
      </span>
      {!compact && (
        <span className="font-display text-xl font-extrabold tracking-[-0.04em] text-ink">
          AI<span className="text-brand-600">TASKER</span>
        </span>
      )}
    </Link>
  );
}

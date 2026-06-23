import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Inbox,
  LoaderCircle,
  Search,
  X,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { Link } from 'react-router-dom';
import { cn, initials } from '../lib/utils';

function buttonClasses({
  variant = 'primary',
  size = 'md',
  className,
}: {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  className?: string;
}) {
  const variants = {
    primary:
      'bg-brand-600 text-white shadow-[0_8px_20px_rgba(23,103,242,.22)] hover:bg-brand-700 hover:-translate-y-0.5',
    secondary:
      'border border-brand-100 bg-white text-brand-700 shadow-sm hover:border-brand-200 hover:bg-brand-50',
    ghost: 'text-slate-600 hover:bg-slate-100 hover:text-ink',
    danger: 'bg-rose-50 text-rose-700 hover:bg-rose-100',
    success: 'bg-mint-50 text-mint-600 hover:bg-mint-100',
  };
  const sizes = {
    sm: 'h-9 rounded-xl px-3.5 text-sm',
    md: 'h-11 rounded-2xl px-4 text-sm',
    lg: 'h-12 rounded-2xl px-5 text-sm',
    icon: 'h-10 w-10 rounded-2xl',
  };
  return cn(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-brand-100 disabled:pointer-events-none disabled:opacity-50',
    variants[variant],
    sizes[size],
    className,
  );
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  loading,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
}) {
  return (
    <button className={buttonClasses({ variant, size, className })} {...props}>
      {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export function LinkButton({
  to,
  variant = 'primary',
  size = 'md',
  className,
  children,
}: {
  to: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link to={to} className={buttonClasses({ variant, size, className })}>
      {children}
    </Link>
  );
}

export function Card({
  className,
  children,
  hover = false,
  id,
}: {
  className?: string;
  children: ReactNode;
  hover?: boolean;
  id?: string;
}) {
  return (
    <motion.div
      id={id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className={cn(
        'rounded-3xl border border-slate-100 bg-white shadow-card',
        hover && 'transition-all duration-300 hover:-translate-y-1 hover:shadow-soft',
        className,
      )}
    >
      {children}
    </motion.div>
  );
}

export function Badge({
  children,
  tone = 'slate',
  className,
}: {
  children: ReactNode;
  tone?: 'brand' | 'mint' | 'coral' | 'amber' | 'slate' | 'rose' | 'violet';
  className?: string;
}) {
  const tones = {
    brand: 'bg-brand-50 text-brand-700 ring-brand-100',
    mint: 'bg-mint-50 text-mint-600 ring-mint-100',
    coral: 'bg-coral-50 text-coral-600 ring-coral-100',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
    slate: 'bg-slate-50 text-slate-600 ring-slate-100',
    rose: 'bg-rose-50 text-rose-700 ring-rose-100',
    violet: 'bg-violet-50 text-violet-700 ring-violet-100',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status?: string }) {
  const normalized = (status || '').toLowerCase().replaceAll(' ', '');
  const tone =
    normalized.includes('approved') ||
    normalized.includes('accepted') ||
    normalized.includes('active') ||
    normalized.includes('success') ||
    normalized.includes('released') ||
    normalized.includes('completed') ||
    normalized.includes('dãduyệt') ||
    normalized.includes('thànhcông')
      ? 'mint'
      : normalized.includes('rejected') ||
          normalized.includes('failed') ||
          normalized.includes('terminated') ||
          normalized.includes('cancelled') ||
          normalized.includes('bịtừchối') ||
          normalized.includes('thấtbại') ||
          normalized.includes('dãhủy')
        ? 'rose'
        : normalized.includes('pending') ||
            normalized.includes('draft') ||
            normalized.includes('underreview') ||
            normalized.includes('open') ||
            normalized.includes('dangchờ')
          ? 'amber'
          : normalized.includes('escalated')
            ? 'violet'
            : 'slate';
  return <Badge tone={tone}>{status || 'Chưa cập nhật'}</Badge>;
}

export function Avatar({
  name,
  size = 'md',
  className,
}: {
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const sizes = {
    sm: 'h-8 w-8 text-xs rounded-xl',
    md: 'h-10 w-10 text-sm rounded-2xl',
    lg: 'h-12 w-12 text-sm rounded-2xl',
    xl: 'h-16 w-16 text-lg rounded-3xl',
  };
  return (
    <span
      className={cn(
        'inline-grid shrink-0 place-items-center bg-gradient-to-br from-brand-100 to-indigo-100 font-extrabold text-brand-700 ring-1 ring-brand-100',
        sizes[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

export function Progress({
  value,
  className,
  color = 'brand',
}: {
  value: number;
  className?: string;
  color?: 'brand' | 'mint' | 'coral';
}) {
  const colors = {
    brand: 'from-brand-500 to-indigo-500',
    mint: 'from-mint-500 to-emerald-400',
    coral: 'from-coral-500 to-amber-400',
  };
  return (
    <div className={cn('h-2 overflow-hidden rounded-full bg-slate-100', className)}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className={cn('h-full rounded-full bg-gradient-to-r', colors[color])}
      />
    </div>
  );
}

export function MetricCard({
  label,
  value,
  helper,
  icon,
  tone = 'brand',
}: {
  label: string;
  value: string | number;
  helper?: string;
  icon: ReactNode;
  tone?: 'brand' | 'mint' | 'coral' | 'amber';
}) {
  const tones = {
    brand: 'bg-brand-50 text-brand-600',
    mint: 'bg-mint-50 text-mint-600',
    coral: 'bg-coral-50 text-coral-600',
    amber: 'bg-amber-50 text-amber-600',
  };
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 font-display text-2xl font-extrabold tracking-tight text-ink">
            {value}
          </p>
          {helper && <p className="mt-1 text-xs font-medium text-slate-400">{helper}</p>}
        </div>
        <span className={cn('grid h-11 w-11 place-items-center rounded-2xl', tones[tone])}>
          {icon}
        </span>
      </div>
    </Card>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow && (
          <p className="mb-1 text-xs font-extrabold uppercase tracking-[0.18em] text-brand-600">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-2xl font-extrabold tracking-[-0.035em] text-ink md:text-3xl">
          {title}
        </h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="font-display text-lg font-extrabold tracking-tight text-ink">{title}</h2>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-11 w-full rounded-2xl border border-slate-200 bg-white px-3.5 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-brand-300 focus:ring-4 focus:ring-brand-50',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  autoResize?: boolean;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ autoResize = false, className, defaultValue, onInput, value, ...props }, ref) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const resizeToContent = useCallback(() => {
      const textarea = textareaRef.current;
      if (!textarea || !autoResize) {
        return;
      }

      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }, [autoResize]);

    useImperativeHandle(ref, () => textareaRef.current as HTMLTextAreaElement);

    useLayoutEffect(() => {
      resizeToContent();
    }, [resizeToContent, defaultValue, value]);

    return (
      <textarea
        ref={textareaRef}
        className={cn(
          'min-h-28 w-full resize-y rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm leading-6 text-ink outline-none transition placeholder:text-slate-400 focus:border-brand-300 focus:ring-4 focus:ring-brand-50',
          autoResize && 'resize-none overflow-hidden',
          className,
        )}
        defaultValue={defaultValue}
        value={value}
        onInput={(event) => {
          resizeToContent();
          onInput?.(event);
        }}
        {...props}
      />
    );
  },
);
Textarea.displayName = 'Textarea';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'h-11 w-full rounded-2xl border border-slate-200 bg-white px-3.5 text-sm text-ink outline-none transition focus:border-brand-300 focus:ring-4 focus:ring-brand-50',
        className,
      )}
      {...props}
    />
  ),
);
Select.displayName = 'Select';

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 block text-sm font-bold text-slate-700">{label}</span>
      {children}
      {(hint || error) && (
        <span className={cn('mt-1.5 block text-xs', error ? 'text-rose-600' : 'text-slate-400')}>
          {error || hint}
        </span>
      )}
    </label>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Tìm kiếm...',
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="pl-10"
      />
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}) {
  if (!open) return null;
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl',
    '2xl': 'max-w-7xl',
  };
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <motion.button
        type="button"
        aria-label="Đóng"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClose}
        className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className={cn('relative z-10 w-full rounded-3xl bg-white shadow-soft', sizes[size])}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <h3 className="font-display text-xl font-extrabold tracking-tight text-ink">{title}</h3>
            {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">{footer}</div>}
      </motion.div>
    </div>
  );
}

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: Array<{ id: string; label: string; count?: number }>;
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="inline-flex rounded-2xl bg-slate-100 p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            'rounded-xl px-3.5 py-2 text-sm font-bold transition-all',
            active === tab.id
              ? 'bg-white text-brand-700 shadow-sm'
              : 'text-slate-500 hover:text-ink',
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px]">
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="grid place-items-center rounded-3xl border border-dashed border-slate-200 bg-slate-50/70 px-6 py-12 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-slate-400 shadow-sm">
        <Inbox className="h-5 w-5" />
      </span>
      <h3 className="mt-4 font-display text-base font-extrabold text-ink">{title}</h3>
      <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Notice({
  tone = 'info',
  title,
  children,
  className,
}: {
  tone?: 'info' | 'success' | 'warning' | 'danger';
  title: string;
  children?: ReactNode;
  className?: string;
}) {
  const styles = {
    info: 'border-brand-100 bg-brand-50 text-brand-800',
    success: 'border-mint-100 bg-mint-50 text-emerald-800',
    warning: 'border-amber-100 bg-amber-50 text-amber-800',
    danger: 'border-rose-100 bg-rose-50 text-rose-800',
  };
  const Icon = tone === 'success' ? CheckCircle2 : AlertCircle;
  return (
    <div className={cn('flex gap-3 rounded-2xl border p-4 text-sm', styles[tone], className)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="font-bold">{title}</p>
        {children && <div className="mt-1 leading-6 opacity-80">{children}</div>}
      </div>
    </div>
  );
}

export function ListLink({
  to,
  title,
  description,
  leading,
  trailing,
  descriptionClassName,
}: {
  to: string;
  title: string;
  description?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  descriptionClassName?: string;
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-2xl px-3 py-3 transition hover:bg-slate-50"
    >
      {leading}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-ink">{title}</p>
        {description && (
          <p
            className={cn(
              "mt-0.5 text-xs text-slate-500",
              descriptionClassName || "truncate",
            )}
          >
            {description}
          </p>
        )}
      </div>
      {trailing || <ChevronRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500" />}
    </Link>
  );
}

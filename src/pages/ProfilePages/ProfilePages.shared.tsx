import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { Badge } from "../../components/ui";
import type { AccountStatus } from "../../types";

export function TogglePill({
  checked,
  label,
  description,
  onChange,
  compact = false,
}: {
  checked: boolean;
  label: string;
  description?: string;
  onChange: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`group flex min-h-[72px] w-full items-start gap-3 rounded-2xl border p-3 text-left transition ${
        checked
          ? "border-brand-300 bg-white shadow-sm"
          : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50"
      } ${compact ? "min-h-[60px]" : ""}`}
    >
      <span
        className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border text-[10px] font-black ${
          checked
            ? "border-brand-600 bg-brand-600 text-white"
            : "border-slate-200 bg-white text-transparent"
        }`}
      >
        <Check className="h-3 w-3" />
      </span>
      <span className="min-w-0">
        <span className="block break-words text-sm font-extrabold text-ink">
          {label}
        </span>
        {description && (
          <span className="mt-1 line-clamp-2 block text-xs leading-5 text-slate-500">
            {description}
          </span>
        )}
      </span>
    </button>
  );
}

export function PreviewGroup({
  icon,
  title,
  items,
  emptyText,
  tone,
}: {
  icon: ReactNode;
  title: string;
  items: string[];
  emptyText: string;
  tone: "brand" | "mint" | "coral";
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-sm font-extrabold text-ink">
        {icon}
        {title}
      </div>
      {items.length ? (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <Badge key={item} tone={tone}>
              {item}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-400">
          {emptyText}
        </p>
      )}
    </div>
  );
}

export function ProfileRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
      <span className="font-bold text-slate-500">{label}</span>
      <span className="text-right font-extrabold text-ink">{value}</span>
    </div>
  );
}

export function ProfileDetailRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-start gap-4">
      <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500">
        {icon}
      </span>
      <div>
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        <div className="mt-1 text-sm font-bold text-ink">{value}</div>
      </div>
    </div>
  );
}

export function EmptyProfileBlock({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white text-slate-400 shadow-sm">
        {icon}
      </span>
      <h3 className="mt-4 font-display text-lg font-extrabold text-ink">
        {title}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

export function resolveCatalogNames<T extends object>(
  items: T[],
  ids: number[],
  idKey: keyof T,
  nameKey: keyof T,
) {
  return items
    .filter((item) => ids.includes(Number(item[idKey] as unknown)))
    .map((item) => String(item[nameKey] as unknown));
}

export function readApiError(error: unknown, fallback: string) {
  const apiError = error as {
    response?: { data?: { message?: string } };
    message?: string;
  };
  return apiError.response?.data?.message || apiError.message || fallback;
}

export function parseCatalogIds(ids?: string) {
  if (!ids) return [];
  return ids
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item));
}

export function normalizeAccountStatus(status?: string): AccountStatus {
  return status === "Approved" || status === "Rejected" || status === "Lock"
    ? status
    : "Pending";
}

import { type ReactNode } from "react";
import { type Domain } from "../../lib/api";
import { formatDate, formatTime } from "../../lib/utils";
import { Card, Progress } from "../../components/ui";
import type { AccountStatus, Role } from "../../types";

export function AdminMetric({
  label,
  value,
  icon,
  tone = "brand",
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  tone?: "brand" | "mint" | "coral" | "amber";
}) {
  const tones = {
    brand: "bg-brand-50 text-brand-600",
    mint: "bg-mint-50 text-mint-600",
    coral: "bg-coral-50 text-coral-600",
    amber: "bg-amber-50 text-amber-700",
  };
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-bold text-slate-500">{label}</p>
          <p className="mt-2 font-display text-2xl font-black text-ink">
            {value}
          </p>
        </div>
        <span
          className={`grid h-11 w-11 place-items-center rounded-2xl ${tones[tone]}`}
        >
          {icon}
        </span>
      </div>
    </Card>
  );
}

export function DateTimeCell({ value }: { value?: string }) {
  return (
    <span className="grid gap-1 text-center font-bold text-slate-500">
      <span>{formatDate(value)}</span>
      {value && (
        <span className="text-xs font-semibold text-slate-400">
          {formatTime(value)}
        </span>
      )}
    </span>
  );
}

export function Funnel({
  label,
  value,
  max,
  color = "brand",
}: {
  label: string;
  value: number;
  max: number;
  color?: "brand" | "mint" | "coral" | "amber";
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-bold text-slate-600">{label}</span>
        <span className="font-extrabold text-ink">{value}</span>
      </div>
      <Progress
        value={(value / max) * 100}
        color={color === "amber" ? "coral" : color}
      />
    </div>
  );
}

export function WalletFact({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string | number;
  tone?: "slate" | "brand" | "mint" | "coral" | "amber";
}) {
  const tones = {
    slate: "bg-slate-50 text-slate-400",
    brand: "bg-brand-50 text-brand-600",
    mint: "bg-mint-50 text-mint-600",
    coral: "bg-coral-50 text-coral-600",
    amber: "bg-amber-50 text-amber-600",
  };
  return (
    <div
      className={`rounded-2xl p-4 ${tone === "slate" ? "bg-slate-50" : tones[tone].split(" ")[0]}`}
    >
      <p
        className={`text-xs font-extrabold uppercase tracking-wide ${tone === "slate" ? "text-slate-400" : tones[tone].split(" ")[1]}`}
      >
        {label}
      </p>
      <p className="mt-2 text-lg font-black text-ink">{value}</p>
    </div>
  );
}

export const internalRoles: Role[] = ["ADMIN", "STAFF"];
export const externalRoles: Role[] = ["BUSINESS", "EXPERT"];
export const accountStatuses: AccountStatus[] = [
  "Pending",
  "Approved",
  "Rejected",
  "Lock",
];

export function specializationFromDomains(domainIds: number[], domains: Domain[]) {
  return domains
    .filter((domain) => domainIds.includes(domain.domainId))
    .map((domain) => domain.domainName)
    .join(", ");
}

export function selectedDomainIdsFromSpecialization(
  specialization: string | undefined,
  domains: Domain[],
) {
  const tokens = (specialization || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return domains
    .filter(
      (domain) =>
        tokens.includes(domain.domainName.toLowerCase()) ||
        tokens.includes(domain.domainCode.toLowerCase()),
    )
    .map((domain) => domain.domainId);
}

export function formatAuditTimestamp(value?: string) {
  if (!value) return { date: "Chưa cập nhật", time: "" };
  const date = new Date(value);
  return {
    date: new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date),
    time: new Intl.DateTimeFormat("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(date),
  };
}

export function SpecializationSelector({
  domains,
  selectedIds,
  onChange,
}: {
  domains: Domain[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}) {
  const toggle = (domainId: number) => {
    onChange(
      selectedIds.includes(domainId)
        ? selectedIds.filter((id) => id !== domainId)
        : [...selectedIds, domainId],
    );
  };

  return (
    <div className="grid max-h-56 gap-2 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 md:grid-cols-2">
      {domains.map((domain) => (
        <label
          key={domain.domainId}
          className="flex cursor-pointer items-center gap-2 rounded-xl px-2 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <input
            type="checkbox"
            checked={selectedIds.includes(domain.domainId)}
            onChange={() => toggle(domain.domainId)}
            className="h-4 w-4 rounded border-slate-300 text-brand-600"
          />
          <span>{domain.domainName}</span>
        </label>
      ))}
    </div>
  );
}

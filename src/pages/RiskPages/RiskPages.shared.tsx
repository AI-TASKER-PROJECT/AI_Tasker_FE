import type { ReactNode } from "react";

export const businessRejectionReasons = [
  "Mã số thuế không chính xác",
  "Địa chỉ không chính xác",
  "Tên doanh nghiệp không chính xác",
  "Không xác minh được Giấy phép kinh doanh",
];

export const expertRejectionReasons = [
  "Số CCCD không chính xác",
  "Không xác minh được Portfolio",
];

export function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-extrabold text-ink">
        {value}
      </p>
    </div>
  );
}

export function FileInfo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

export function TaxCheckRow({
  label,
  provided,
  lookup,
}: {
  label: string;
  provided?: string | null;
  lookup?: string | null;
}) {
  return (
    <tr className="border-t border-slate-100 align-top">
      <th className="px-4 py-4 text-left text-sm font-bold text-slate-500">
        {label}
      </th>
      <td className="px-4 py-4 text-sm font-extrabold text-ink">
        {provided || "Chưa có"}
      </td>
      <td className="px-4 py-4 text-sm font-extrabold text-ink">
        {lookup || "Chưa có"}
      </td>
    </tr>
  );
}

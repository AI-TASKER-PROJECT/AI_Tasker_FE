import { ArrowRight, Landmark, ReceiptText, WalletCards } from "lucide-react";
import { formatCurrency, formatDateTime } from "../lib/utils";
import type { WalletTransaction } from "../types";
import { Badge, Modal } from "./ui";

function hasValue(value: unknown): value is string | number {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function DetailRow({ label, value }: { label: string; value?: string | number }) {
  if (!hasValue(value)) return null;
  return (
    <div className="grid gap-1 py-2 sm:grid-cols-[160px_minmax(0,1fr)] sm:gap-4">
      <dt className="text-sm font-semibold text-slate-500">{label}</dt>
      <dd className="break-words text-sm font-bold text-slate-700">{value}</dd>
    </div>
  );
}

function Party({
  label,
  name,
  account,
  role,
}: {
  label: string;
  name?: string;
  account?: string;
  role?: string;
}) {
  return (
    <div className="min-w-0 flex-1 py-2">
      <p className="text-xs font-extrabold uppercase text-slate-400">{label}</p>
      <p className="mt-1 break-words text-base font-extrabold text-ink">
        {name || "Chưa có thông tin"}
      </p>
      {account && (
        <p className="mt-1 break-all text-sm font-semibold text-slate-500">
          {account}
        </p>
      )}
      {role && <p className="mt-1 text-xs font-bold text-brand-600">{role}</p>}
    </div>
  );
}

function amountSign(tx: WalletTransaction) {
  return ["CREDIT", "RELEASE"].includes(String(tx.direction).toUpperCase())
    ? "+"
    : "−";
}

export function WalletTransactionDetailModal({
  transaction,
  onClose,
}: {
  transaction: WalletTransaction | null;
  onClose: () => void;
}) {
  if (!transaction) return null;
  const tx = transaction;
  const hasPayment = [
    tx.paymentProvider,
    tx.providerOrderCode,
    tx.providerTransactionNo,
    tx.providerPaymentLinkId,
  ].some(hasValue);
  const hasBank = [
    tx.bankName,
    tx.bankAccountHolder,
    tx.bankAccountNumberMasked,
    tx.bankAccountNumber,
  ].some(hasValue);
  const hasContext = [
    tx.packageName,
    tx.jobTitle,
    tx.contractTitle,
    tx.milestoneName,
  ].some(hasValue);

  return (
    <Modal
      open
      onClose={onClose}
      title="Chi tiết giao dịch"
      description={tx.title || tx.transactionTypeLabel || "Giao dịch ví"}
      size="lg"
    >
      <div className="space-y-5">
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="brand">{tx.transactionTypeLabel || "Giao dịch ví"}</Badge>
            {tx.statusLabel && <Badge tone="slate">{tx.statusLabel}</Badge>}
          </div>
          <p className="text-2xl font-black text-ink">
            {amountSign(tx)}{formatCurrency(Math.abs(tx.amount))}
          </p>
        </div>

        <section>
          <div className="mb-2 flex items-center gap-2 text-sm font-extrabold text-ink">
            <WalletCards className="h-4 w-4 text-brand-600" />
            Dòng tiền
          </div>
          <div className="flex flex-col gap-2 border-y border-slate-100 sm:flex-row sm:items-center sm:gap-5">
            <Party
              label="Người gửi / Tài khoản"
              name={tx.senderName}
              account={tx.senderAccount}
              role={tx.senderRoleLabel}
            />
            <ArrowRight className="h-5 w-5 shrink-0 rotate-90 self-center text-slate-300 sm:rotate-0" />
            <Party
              label="Người nhận / Tài khoản"
              name={tx.receiverName}
              account={tx.receiverAccount}
              role={tx.receiverRoleLabel}
            />
          </div>
        </section>

        <section>
          <div className="mb-1 flex items-center gap-2 text-sm font-extrabold text-ink">
            <ReceiptText className="h-4 w-4 text-brand-600" />
            Thông tin giao dịch
          </div>
          <dl className="divide-y divide-slate-100">
            <DetailRow label="Thời gian" value={formatDateTime(tx.createdAt)} />
            <DetailRow label="Trạng thái" value={tx.statusLabel} />
            <DetailRow label="Hướng giao dịch" value={tx.directionLabel} />
            <DetailRow label="Loại số dư" value={tx.balanceTypeLabel} />
            <DetailRow label="Số dư trước" value={formatCurrency(tx.availableBalanceBefore ?? tx.balanceBefore)} />
            <DetailRow label="Số dư sau" value={formatCurrency(tx.availableBalanceAfter ?? tx.balanceAfter)} />
            {hasValue(tx.feeAmount) && Number(tx.feeAmount) > 0 && (
              <DetailRow label="Phí giao dịch" value={formatCurrency(tx.feeAmount)} />
            )}
            <DetailRow label="Nội dung" value={tx.description} />
          </dl>
        </section>

        {hasContext && (
          <section>
            <h4 className="mb-1 text-sm font-extrabold text-ink">Thông tin liên quan</h4>
            <dl className="divide-y divide-slate-100">
              <DetailRow label="Gói thành viên" value={tx.packageName} />
              <DetailRow label="Công việc" value={tx.jobTitle} />
              <DetailRow label="Hợp đồng" value={tx.contractTitle} />
              <DetailRow label="Giai đoạn" value={tx.milestoneName} />
            </dl>
          </section>
        )}

        {(hasPayment || hasBank) && (
          <section>
            <div className="mb-1 flex items-center gap-2 text-sm font-extrabold text-ink">
              <Landmark className="h-4 w-4 text-brand-600" />
              Thanh toán và đối soát
            </div>
            <dl className="divide-y divide-slate-100">
              <DetailRow label="Cổng thanh toán" value={tx.paymentProvider} />
              <DetailRow label="Mã thanh toán" value={tx.providerOrderCode} />
              <DetailRow label="Mã giao dịch ngân hàng" value={tx.providerTransactionNo} />
              <DetailRow label="Ngân hàng" value={tx.bankName} />
              <DetailRow label="Chủ tài khoản" value={tx.bankAccountHolder} />
              <DetailRow label="Số tài khoản" value={tx.bankAccountNumberMasked || tx.bankAccountNumber} />
            </dl>
          </section>
        )}

        {tx.adminNote && (
          <section className="border-t border-slate-100 pt-4">
            <DetailRow label="Ghi chú xử lý" value={tx.adminNote} />
          </section>
        )}
      </div>
    </Modal>
  );
}

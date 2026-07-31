import { useEffect, useMemo, useState } from "react";
import { contractApi, walletApi, walletTransactionApi } from "../../../lib/api";
import { useSession } from "../../../lib/session";
import { formatCurrency, walletTypeLabel } from "../../../lib/utils";
import type { Contract, SystemWallet, WalletTransaction } from "../../../types";
import {
  Badge,
  Card,
  EmptyState,
  Notice,
  PageHeader,
  StatusBadge,
} from "../../../components/ui";
import { translateContractStatus } from "../ContractPages.shared";

function transactionIdOf(tx: WalletTransaction) {
  return tx.transactionId ?? tx.id ?? `${tx.referenceType || "tx"}-${tx.referenceId || tx.createdAt}`;
}

function walletTransactionDisplayLabel(tx: WalletTransaction, role?: string) {
  const type = (tx.transactionType || "").toUpperCase();
  const direction = (tx.direction || "").toUpperCase();
  const balanceType = (tx.balanceType || "").toUpperCase();
  const isExpert = role === "EXPERT";

  if (type === "TOPUP") return "Nạp tiền vào ví";
  if (type === "MEMBERSHIP_PURCHASE") return "Thanh toán gói thành viên";
  if (type === "CREDIT_PURCHASE") return "Mua lượt sử dụng";
  if (type === "CONTRACT_SECURITY_DEPOSIT_HOLD") {
    return isExpert ? "Giữ ký quỹ bảo đảm hợp đồng" : "Giữ tiền ký quỹ dự án";
  }
  if (type === "DEPOSIT_REFUND") {
    return isExpert ? "Hoàn ký quỹ bảo đảm" : "Hoàn tiền ký quỹ dự án";
  }
  if (type === "WITHDRAW_HOLD") return "Tạm giữ tiền chờ rút";
  if (type === "WITHDRAW_APPROVED") return "Rút tiền về ngân hàng";
  if (type === "WITHDRAW_REJECTED") return "Hoàn tiền do rút bị từ chối";

  if (direction === "CREDIT") return "Tiền cộng vào ví";
  if (direction === "DEBIT") return "Tiền trừ khỏi ví";
  if (direction === "HOLD") {
    if (balanceType === "ESCROW") return "Tiền đang được giữ ký quỹ";
    if (balanceType === "HOLDING") return "Tiền đang chờ xử lý";
    if (balanceType === "DISPUTE") return "Tiền đang bị giữ do tranh chấp";
    return "Tiền đang được tạm giữ";
  }
  if (direction === "RELEASE") return "Tiền được giải ngân/hoàn lại";

  return tx.title || tx.description || "Giao dịch ví";
}

function walletTransactionExtra(tx: WalletTransaction) {
  return tx as WalletTransaction & {
    milestoneNumber?: number | string;
    milestoneOrderIndex?: number | string;
    milestoneName?: string;
  };
}

function walletTransactionMilestoneText(tx: WalletTransaction) {
  const extra = walletTransactionExtra(tx);
  const value =
    extra.milestoneNumber ??
    extra.milestoneOrderIndex;
  return value ? String(value) : "";
}

function walletTransactionPartyText(value: string | undefined, fallback: string) {
  return value?.trim() || fallback;
}

function walletTransactionDisplayDescription(tx: WalletTransaction, role?: string) {
  const text = `${tx.title || ""} ${tx.description || ""} ${tx.rawDescription || ""}`.toLowerCase();
  const businessName = walletTransactionPartyText(tx.businessName, "Doanh nghiệp");
  const expertName = walletTransactionPartyText(tx.expertName, "Chuyên gia");
  const contractTitle = walletTransactionPartyText(tx.contractTitle, "hợp đồng chưa có tên");
  const milestoneText = walletTransactionMilestoneText(tx);
  const milestonePhrase = milestoneText ? `mốc ${milestoneText}` : "mốc tương ứng";

  if (text.includes("deposit milestone escrow")) {
    return `${businessName} đã ký quỹ ${milestonePhrase} cho hợp đồng "${contractTitle}" với chuyên gia ${expertName}.`;
  }
  if (text.includes("dispute business refund")) {
    return `${businessName} đã nhận tiền hoàn từ quyết toán tranh chấp ${milestonePhrase} của hợp đồng "${contractTitle}" với chuyên gia ${expertName}.`;
  }
  if (text.includes("dispute settlement debit")) {
    return role === "EXPERT"
      ? `${expertName} đã nhận tiền quyết toán tranh chấp ${milestonePhrase} từ hợp đồng "${contractTitle}" với doanh nghiệp ${businessName}.`
      : `${businessName} đã được quyết toán tranh chấp ${milestonePhrase} của hợp đồng "${contractTitle}" với chuyên gia ${expertName}.`;
  }

  return tx.contractTitle || tx.jobTitle || tx.rawDescription || "Giao dịch ví";
}

function contractStatus(contract: Contract) {
  return (contract.status || "").trim().toUpperCase();
}

function isCompletedContract(contract: Contract) {
  const status = contractStatus(contract);
  return (
    ["COMPLETED", "RELEASED"].includes(status) ||
    (status === "CLOSED" && !contract.terminationReason && !contract.terminatedAt)
  );
}

function isFinanceContract(contract: Contract) {
  return (
    ["ACTIVE", "IN_PROGRESS"].includes(contractStatus(contract)) ||
    isCompletedContract(contract)
  );
}

export function FinancePage() {
  const session = useSession();
  const isAdmin = session?.role === "ADMIN";

  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [wallet, setWallet] = useState<SystemWallet | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    walletApi
      .current()
      .then(setWallet)
      .catch(() => setWallet(null));

    contractApi
      .listContracts()
      .then((list) => {
        setContracts(list.filter(isFinanceContract));
      })
      .catch(() => setContracts([]));

    if (isAdmin) {
      walletTransactionApi
        .list()
        .then(setTransactions)
        .catch(() => {
          setTransactions([]);
          setMessage(
      "Máy chủ hiện chỉ cung cấp lịch sử giao dịch ví; chưa có dịch vụ giao dịch cũ theo cột mốc.",
          );
        });
    }
  }, [isAdmin]);

  const successfulTransactions = useMemo(
    () => transactions.filter((item) => (item.status || "").toUpperCase() === "SUCCESS"),
    [transactions],
  );
  const completedContracts = useMemo(
    () => contracts.filter(isCompletedContract),
    [contracts],
  );
  const expertCompletedRevenue = useMemo(
    () => completedContracts.reduce((sum, item) => sum + item.totalBudget, 0),
    [completedContracts],
  );
  const businessContractBudget = useMemo(
    () => contracts.reduce((sum, item) => sum + item.totalBudget, 0),
    [contracts],
  );

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          title={
            session?.role === "EXPERT"
              ? "Quản lý doanh thu hợp đồng"
              : "Quản lý quỹ và chi phí dự án"
          }
          description={
            isAdmin
              ? "Theo dõi lịch sử biến động ví từ dữ liệu giao dịch của máy chủ."
              : session?.role === "EXPERT"
                ? "Theo dõi doanh thu từ các dự án và số tiền đang chờ nghiệm thu."
                : "Theo dõi ngân sách, ký quỹ và các hợp đồng đang thực thi."
          }
          actions={null}
        />
      </div>

      <Card className="p-5">
        {wallet && (
          <div className="mb-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">
                Số dư khả dụng
              </p>
              <p className="mt-2 font-display text-2xl font-black text-ink">
                {formatCurrency(wallet.availableBalance)}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">
                {session?.role === "EXPERT" ? "Chờ nghiệm thu" : "Số tiền ký quỹ"}
              </p>
              <p className="mt-2 font-display text-2xl font-black text-amber-700">
                {formatCurrency(wallet.escrowBalance)}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">
                Ví
              </p>
              <p className="mt-2 font-display text-2xl font-black text-brand-700">
                {walletTypeLabel(wallet.walletType)}
              </p>
            </div>
          </div>
        )}
        {isAdmin && (
          <Notice tone="info" title="Đã tắt luồng giao dịch cũ">
            Máy chủ hiện không cung cấp thao tác tạo giao dịch hoặc cập nhật trạng thái theo cột mốc tại màn hình này. Dữ liệu bên dưới là lịch sử giao dịch ví thực tế.
          </Notice>
        )}
        {message && <Notice tone="danger" title={message} className="mt-4" />}
      </Card>

      {isAdmin && (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="p-5">
              <p className="text-sm font-bold text-slate-500">Tổng giao dịch thành công</p>
              <p className="mt-2 font-display text-3xl font-black text-ink">
                {formatCurrency(
                  successfulTransactions.reduce((sum, item) => sum + item.amount, 0),
                )}
              </p>
            </Card>
            <Card className="p-5">
              <p className="text-sm font-bold text-slate-500">Tổng giao dịch</p>
              <p className="mt-2 font-display text-3xl font-black text-mint-600">
                {transactions.length}
              </p>
            </Card>
            <Card className="p-5">
              <p className="text-sm font-bold text-slate-500">Đang chờ xử lý</p>
              <p className="mt-2 font-display text-3xl font-black text-coral-600">
                {transactions.filter((item) => (item.status || "").toUpperCase() === "PENDING").length}
              </p>
            </Card>
          </div>

          <Card className="overflow-hidden">
            <div className="hidden border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-extrabold uppercase tracking-wide text-slate-400 md:grid md:grid-cols-[1fr_160px_140px_150px]">
              <span>Giao dịch</span>
              <span>Nội dung</span>
              <span>Số tiền</span>
              <span>Trạng thái</span>
            </div>
            {transactions.map((tx) => (
              <div
                key={String(transactionIdOf(tx))}
                className="grid gap-3 border-b border-slate-100 px-5 py-4 text-sm md:grid-cols-[1fr_160px_140px_150px] md:items-center"
              >
                <div>
                  <p className="font-extrabold text-ink">
                    {tx.title || tx.description || "Giao dịch ví"}
                  </p>
                  <p className="mt-1 text-slate-500">
                    {walletTransactionDisplayDescription(tx, session?.role)}
                  </p>
                </div>
                <Badge tone="brand">{walletTransactionDisplayLabel(tx, session?.role)}</Badge>
                <span className="font-extrabold text-ink">
                  {formatCurrency(tx.amount)}
                </span>
                <StatusBadge status={tx.status} />
              </div>
            ))}
            {transactions.length === 0 && (
              <EmptyState
                title="Chưa có giao dịch"
          description="Máy chủ chưa trả dữ liệu giao dịch ví cho tài khoản hiện tại."
              />
            )}
          </Card>
        </>
      )}

      {!isAdmin && (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="p-5">
              <p className="text-sm font-bold text-slate-500">
                {session?.role === "EXPERT" ? "Tổng doanh thu" : "Tổng ngân sách cho hợp đồng"}
              </p>
              <p className="mt-2 font-display text-3xl font-black text-ink">
                {formatCurrency(
                  session?.role === "EXPERT"
                    ? expertCompletedRevenue
                    : businessContractBudget,
                )}
              </p>
            </Card>
            <Card className="p-5">
              <p className="text-sm font-bold text-slate-500">Dự án đang thực thi</p>
              <p className="mt-2 font-display text-3xl font-black text-mint-600">
                {
                  contracts.filter((c) =>
                    ["ACTIVE", "IN_PROGRESS"].includes(
                      contractStatus(c),
                    ),
                  ).length
                }
              </p>
            </Card>
            <Card className="p-5">
              <p className="text-sm font-bold text-slate-500">Dự án đã hoàn thành</p>
              <p className="mt-2 font-display text-3xl font-black text-coral-600">
                {
                  completedContracts.length
                }
              </p>
            </Card>
          </div>
          <Card className="overflow-hidden">
            <div className="hidden border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-extrabold uppercase tracking-wide text-slate-400 md:grid md:grid-cols-[1fr_150px_150px_150px]">
              <span>Dự án</span>
              <span>{session?.role === "EXPERT" ? "Doanh thu" : "Ngân sách"}</span>
              <span>Thời gian</span>
              <span>Trạng thái</span>
            </div>
            {contracts.map((contract) => (
              <div
                key={contract.contractId}
                className="grid gap-3 border-b border-slate-100 px-5 py-4 text-sm md:grid-cols-[1fr_150px_150px_150px] md:items-center"
              >
                <div>
                  <p className="font-extrabold text-ink">
                    {contract.contractTitle ||
                      contract.title ||
                      "Hợp đồng chưa có tên"}
                  </p>
                </div>
                <span className="font-extrabold text-brand-700">
                  {formatCurrency(contract.totalBudget)}
                </span>
                <span className="text-slate-600">
                  {contract.timelineDays} ngày
                </span>
                <StatusBadge status={translateContractStatus(contract.status)} />
              </div>
            ))}
            {contracts.length === 0 && (
              <EmptyState
                title="Chưa có dự án"
                description="Chưa có hợp đồng nào được cọc hoặc thực thi."
              />
            )}
          </Card>
        </>
      )}
    </div>
  );
}

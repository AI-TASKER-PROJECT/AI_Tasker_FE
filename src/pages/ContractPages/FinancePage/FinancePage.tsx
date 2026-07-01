import { useEffect, useState } from "react";
import { financeApi, walletApi, contractApi } from "../../../lib/api";
import { useSession } from "../../../lib/session";
import { formatCurrency } from "../../../lib/utils";
import type { Contract, SystemWallet, Transaction } from "../../../types";
import { Badge, Button, Card, EmptyState, Field, Input, Modal, Notice, PageHeader, StatusBadge } from "../../../components/ui";
import { translateContractStatus } from "../ContractPages.shared";

export function FinancePage() {
  const session = useSession();
  const isAdmin = session?.role === "ADMIN";

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [wallet, setWallet] = useState<SystemWallet | null>(null);
  const [lookupMilestoneId, setLookupMilestoneId] = useState("");
  const [transactionOpen, setTransactionOpen] = useState(false);
  const [form, setForm] = useState({
    milestoneId: "",
    amount: "",
    commissionFee: "0",
    transactionType: "Deposit",
    status: "Pending",
  });
  const [message, setMessage] = useState("");

  useEffect(() => {
    walletApi
      .current()
      .then(setWallet)
      .catch(() => setWallet(null));

    contractApi
      .listContracts()
      .then((list) => {
        setContracts(
          list.filter((c) =>
            ["ACTIVE", "IN_PROGRESS", "COMPLETED", "RELEASED"].includes(
              (c.status || "").toUpperCase(),
            ),
          ),
        );
      })
      .catch(() => setContracts([]));
  }, []);

  const loadTransactions = async (milestoneIdValue = lookupMilestoneId) => {
    const milestoneId = Number(milestoneIdValue);
    if (!Number.isFinite(milestoneId) || milestoneId <= 0) {
      setMessage("Nhập Milestone ID hợp lệ từ database để tải giao dịch.");
      return;
    }
    setMessage("");
    setTransactions(await financeApi.listTransactions(milestoneId));
  };

  const createTransaction = async () => {
    const milestoneId = Number(form.milestoneId);
    const amount = Number(form.amount);
    const commissionFee = Number(form.commissionFee || 0);
    if (
      !Number.isFinite(milestoneId) ||
      milestoneId <= 0 ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !Number.isFinite(commissionFee) ||
      commissionFee < 0
    ) {
      setMessage("Milestone ID, amount và commission fee phải là số hợp lệ.");
      return;
    }
    const tx = await financeApi.createTransaction({
      milestoneId,
      amount,
      commissionFee,
      transactionType: form.transactionType as "Deposit",
      status: form.status,
    });
    setLookupMilestoneId(String(tx.milestoneId));
    await loadTransactions(String(tx.milestoneId));
    setTransactionOpen(false);
  };
  const webhook = async (transactionId: number) => {
    const updated = await financeApi.paymentWebhook(transactionId, "Success");
    setTransactions((items) =>
      items.map((item) =>
        item.transactionId === transactionId
          ? { ...item, status: updated.status }
          : item,
      ),
    );
  };
  const updateStatus = async (transactionId: number, status: string) => {
    const updated = await financeApi.updateTransactionStatus(
      transactionId,
      status,
    );
    setTransactions((items) =>
      items.map((item) =>
        item.transactionId === transactionId
          ? { ...item, status: updated.status }
          : item,
      ),
    );
  };
  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          title={
            session?.role === "EXPERT"
              ? "Quản lý doanh thu hợp đồng"
              : "Quản lý quỹ & chi phí dự án"
          }
          description={
            session?.role === "EXPERT"
              ? "Theo dõi doanh thu từ các dự án và số tiền đang được chờ nghiệm thu."
              : "Nạp số dư để sử dụng những tính năng của nền tảng và theo dõi giao dịch ký quỹ theo từng giai đoạn."
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
                {session?.role === "EXPERT"
                  ? "Chờ nghiệm thu"
                  : "Số tiền kí quỹ"}
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
                {wallet.walletType}
              </p>
            </div>
          </div>
        )}
        {isAdmin && (
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <Field label="Tải giao dịch theo Milestone ID">
              <Input
                type="number"
                min={1}
                value={lookupMilestoneId}
                onChange={(event) => setLookupMilestoneId(event.target.value)}
              />
            </Field>
            <Button
              type="button"
              variant="secondary"
              onClick={() => loadTransactions()}
            >
              Tải từ API
            </Button>
          </div>
        )}
        {message && <Notice tone="danger" title={message} className="mt-4" />}
      </Card>
      {isAdmin && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="p-5">
            <p className="text-sm font-bold text-slate-500">Tổng lưu chuyển</p>
            <p className="mt-2 font-display text-3xl font-black text-ink">
              {formatCurrency(
                transactions.reduce((sum, item) => sum + item.amount, 0),
              )}
            </p>
          </Card>
          <Card className="p-5">
            <p className="text-sm font-bold text-slate-500">Phí nền tảng</p>
            <p className="mt-2 font-display text-3xl font-black text-mint-600">
              {formatCurrency(
                transactions.reduce((sum, item) => sum + item.commissionFee, 0),
              )}
            </p>
          </Card>
          <Card className="p-5">
            <p className="text-sm font-bold text-slate-500">
              Giao dịch pending
            </p>
            <p className="mt-2 font-display text-3xl font-black text-coral-600">
              {transactions.filter((item) => item.status === "Pending").length}
            </p>
          </Card>
        </div>
      )}

      {isAdmin && (
        <Card className="overflow-hidden">
          <div className="grid border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-extrabold uppercase tracking-wide text-slate-400 md:grid-cols-[1fr_120px_120px_130px_260px]">
            <span>Milestone</span>
            <span>Loại</span>
            <span>Số tiền</span>
            <span>Status</span>
            <span>Action</span>
          </div>
          {transactions.map((tx) => (
            <div
              key={tx.transactionId}
              className="grid gap-3 border-b border-slate-100 px-5 py-4 text-sm md:grid-cols-[1fr_120px_120px_130px_260px] md:items-center"
            >
              <div>
                <p className="font-extrabold text-ink">#{tx.transactionId}</p>
                <p className="mt-1 text-slate-500">
                  {tx.milestoneName || `Milestone #${tx.milestoneId}`}
                </p>
              </div>
              <Badge tone="brand">{tx.transactionType}</Badge>
              <span className="font-extrabold text-ink">
                {formatCurrency(tx.amount)}
              </span>
              <StatusBadge status={translateContractStatus(tx.status)} />
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="success"
                  onClick={() => webhook(tx.transactionId)}
                >
                  Webhook
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => updateStatus(tx.transactionId, "Failed")}
                >
                  Fail
                </Button>
              </div>
            </div>
          ))}
          {transactions.length === 0 && (
            <EmptyState
              title="Chưa có giao dịch"
              description="Nhập Milestone ID thật để tải transaction từ back-end."
            />
          )}
        </Card>
      )}

      {!isAdmin && (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="p-5">
              <p className="text-sm font-bold text-slate-500">
                {session?.role === "EXPERT"
                  ? "Tổng doanh thu"
                  : "Tổng ngân sách đã cọc"}
              </p>
              <p className="mt-2 font-display text-3xl font-black text-ink">
                {formatCurrency(
                  contracts.reduce((sum, item) => sum + item.totalBudget, 0),
                )}
              </p>
            </Card>
            <Card className="p-5">
              <p className="text-sm font-bold text-slate-500">
                Dự án đang thực thi
              </p>
              <p className="mt-2 font-display text-3xl font-black text-mint-600">
                {
                  contracts.filter((c) =>
                    ["ACTIVE", "IN_PROGRESS"].includes(
                      (c.status || "").toUpperCase(),
                    ),
                  ).length
                }
              </p>
            </Card>
            <Card className="p-5">
              <p className="text-sm font-bold text-slate-500">
                Dự án đã hoàn thành
              </p>
              <p className="mt-2 font-display text-3xl font-black text-coral-600">
                {
                  contracts.filter((c) =>
                    ["COMPLETED", "RELEASED"].includes(
                      (c.status || "").toUpperCase(),
                    ),
                  ).length
                }
              </p>
            </Card>
          </div>
          <Card className="overflow-hidden">
            <div className="grid border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-extrabold uppercase tracking-wide text-slate-400 md:grid-cols-[1fr_150px_150px_150px]">
              <span>Dự án</span>
              <span>
                {session?.role === "EXPERT" ? "Doanh thu" : "Ngân sách"}
              </span>
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
                      `Hợp đồng #${contract.contractId}`}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Hợp đồng ID: {contract.contractId}
                  </p>
                </div>
                <span className="font-extrabold text-brand-700">
                  {formatCurrency(contract.totalBudget)}
                </span>
                <span className="text-slate-600">
                  {contract.timelineDays} ngày
                </span>
                <StatusBadge
                  status={translateContractStatus(contract.status)}
                />
              </div>
            ))}
            {contracts.length === 0 && (
              <EmptyState
                title="Chưa có dự án"
                description="Chưa có dự án nào được cọc."
              />
            )}
          </Card>
        </>
      )}

      <Modal
        open={transactionOpen}
        onClose={() => setTransactionOpen(false)}
        title="Tạo transaction"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setTransactionOpen(false)}
            >
              Hủy
            </Button>
            <Button onClick={createTransaction}>Tạo</Button>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Milestone ID">
            <Input
              type="number"
              min={1}
              value={form.milestoneId}
              onChange={(event) =>
                setForm((value) => ({
                  ...value,
                  milestoneId: event.target.value,
                }))
              }
            />
          </Field>
          <Field label="Amount">
            <Input
              type="number"
              min={1}
              value={form.amount}
              onChange={(event) =>
                setForm((value) => ({ ...value, amount: event.target.value }))
              }
            />
          </Field>
          <Field label="Commission fee">
            <Input
              type="number"
              min={0}
              value={form.commissionFee}
              onChange={(event) =>
                setForm((value) => ({
                  ...value,
                  commissionFee: event.target.value,
                }))
              }
            />
          </Field>
          <Field label="Transaction type">
            <Input
              value={form.transactionType}
              onChange={(event) =>
                setForm((value) => ({
                  ...value,
                  transactionType: event.target.value,
                }))
              }
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}

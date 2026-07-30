import {
  Building,
  CheckCircle2,
  Clock,
  Eye,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { adminApi, getApiErrorMessage, withdrawalApi } from "../../../services";
import { cn, formatCurrency, formatDateTime, maskSensitiveValue } from "../../../lib/utils";
import type { AdminAccount, WithdrawalRequest } from "../../../types";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Modal,
  Notice,
  PageHeader,
  SearchInput,
  SectionHeading,
  Tabs,
} from "../../../components/ui";
import { AdminPagination } from "../AdminPages.shared";

const WITHDRAWALS_PER_PAGE = 8;

function withdrawalStatusLabel(status: string) {
  const map: Record<string, string> = {
    PENDING: "Chờ duyệt",
    APPROVED: "Đã duyệt",
    REJECTED: "Từ chối",
  };
  return map[status] ?? status;
}

function statusTone(status: string): "amber" | "mint" | "rose" | "slate" {
  if (status === "PENDING") return "amber";
  if (status === "APPROVED") return "mint";
  if (status === "REJECTED") return "rose";
  return "slate";
}

function accountDisplayName(
  withdrawal: WithdrawalRequest,
  accounts: AdminAccount[],
) {
  const account = accounts.find(
    (item) => item.accountId === withdrawal.accountId,
  );
  if (account?.fullName) return account.fullName;
  if (account?.email) return account.email;
  return "Tài khoản người dùng";
}

function accountSubLabel(
  withdrawal: WithdrawalRequest,
  accounts: AdminAccount[],
) {
  const account = accounts.find(
    (item) => item.accountId === withdrawal.accountId,
  );
  if (account?.email && account.fullName) return account.email;
  return "Tài khoản người dùng";
}

function DateCell({ value }: { value?: string }) {
  if (!value) {
    return (
      <div className="flex w-28 flex-col items-end text-xs font-semibold text-slate-300">
        <span>--</span>
      </div>
    );
  }

  const [time, date] = formatDateTime(value).split(" ");
  return (
    <div className="flex w-28 flex-col items-end text-xs font-semibold text-slate-400">
      <span>{time}</span>
      <span>{date}</span>
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value?: string | number | null;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-slate-100 bg-white p-3 sm:flex-row sm:items-start sm:justify-between">
      <span className="text-xs font-extrabold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <span
        className={cn(
          "break-all text-sm font-bold text-ink sm:max-w-[65%] sm:text-right",
          mono && "font-mono",
        )}
      >
        {value || "Chưa có"}
      </span>
    </div>
  );
}

function ReviewModal({
  open,
  withdrawal,
  action,
  accounts,
  onClose,
  onDone,
}: {
  open: boolean;
  withdrawal: WithdrawalRequest | null;
  action: "approve" | "reject" | null;
  accounts: AdminAccount[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [adminNote, setAdminNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{
    tone: "success" | "danger";
    msg: string;
  } | null>(null);

  const handleClose = () => {
    setAdminNote("");
    setNotice(null);
    onClose();
  };

  const submit = async () => {
    if (!withdrawal || !action) return;
    setLoading(true);
    setNotice(null);
    try {
      if (action === "approve") {
        await withdrawalApi.approve(
          withdrawal.withdrawalId,
          adminNote.trim() || undefined,
        );
        setNotice({
          tone: "success",
          msg: "Đã duyệt yêu cầu rút tiền thành công.",
        });
      } else {
        await withdrawalApi.reject(
          withdrawal.withdrawalId,
          adminNote.trim() || undefined,
        );
        setNotice({
          tone: "success",
          msg: "Đã từ chối yêu cầu rút tiền.",
        });
      }
      onDone();
    } catch (err) {
      setNotice({ tone: "danger", msg: getApiErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  };

  if (!withdrawal || !action) return null;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={
        action === "approve"
          ? "Duyệt yêu cầu rút tiền"
          : "Từ chối yêu cầu rút tiền"
      }
      description={
        action === "approve"
          ? "Xác nhận sau khi đã chuyển khoản thủ công ra ngân hàng người dùng."
          : "Số tiền sẽ được hoàn trả về available balance của người dùng."
      }
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            Hủy
          </Button>
          <Button
            variant={action === "approve" ? "success" : "danger"}
            onClick={submit}
            loading={loading}
            disabled={
              loading || (!!notice?.tone === true && notice.tone === "success")
            }
          >
            {action === "approve" ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Xác nhận duyệt
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4" />
                Xác nhận từ chối
              </>
            )}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {notice && <Notice tone={notice.tone} title={notice.msg} />}
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div className="grid gap-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="font-semibold text-slate-500">Người dùng</span>
              <span className="text-right font-bold text-ink">
                {accountDisplayName(withdrawal, accounts)}
                <span className="block text-xs font-semibold text-slate-400">
                  {accountSubLabel(withdrawal, accounts)}
                </span>
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="font-semibold text-slate-500">Số tiền</span>
              <span className="font-extrabold text-brand-700">
                {formatCurrency(withdrawal.amount)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="font-semibold text-slate-500">Ngân hàng</span>
              <span className="font-bold text-ink">{withdrawal.bankName}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="font-semibold text-slate-500">Số TK</span>
              <span className="font-mono font-bold text-ink">
                {maskSensitiveValue(withdrawal.bankAccountNumber)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="font-semibold text-slate-500">Chủ TK</span>
              <span className="font-bold text-ink">
                {withdrawal.bankAccountHolder}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="font-semibold text-slate-500">Ngày tạo</span>
              <span className="font-semibold text-slate-700">
                {formatDateTime(withdrawal.requestedAt ?? withdrawal.createdAt)}
              </span>
            </div>
            {withdrawal.reviewedAt && (
              <div className="flex justify-between gap-4">
                <span className="font-semibold text-slate-500">Ngày xử lý</span>
                <span className="font-semibold text-slate-700">
                  {formatDateTime(withdrawal.reviewedAt)}
                </span>
              </div>
            )}
          </div>
        </div>

        {action === "approve" && (
          <Notice tone="warning" title="Lưu ý trước khi duyệt">
            Chỉ click Duyệt sau khi đã chuyển khoản thủ công thành công.
            Hành động này không thể hoàn tác.
          </Notice>
        )}

        <Field label="Ghi chú quản trị viên">
          <textarea
            className="min-h-[80px] w-full resize-y rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-brand-300 focus:ring-4 focus:ring-brand-50"
            placeholder={
              action === "approve"
                ? "VD: Đã chuyển khoản lúc 14:30 ngày 20/06/2026..."
                : "VD: Thông tin ngân hàng không hợp lệ..."
            }
            value={adminNote}
            onChange={(event) => setAdminNote(event.target.value)}
          />
        </Field>
      </div>
    </Modal>
  );
}

function ViewDetailsModal({
  open,
  withdrawal,
  accounts,
  onClose,
}: {
  open: boolean;
  withdrawal: WithdrawalRequest | null;
  accounts: AdminAccount[];
  onClose: () => void;
}) {
  if (!withdrawal) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Chi tiết giao dịch"
      size="lg"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Đóng
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div className="mb-4 grid gap-3 md:grid-cols-2">
            <DetailRow
              label="Người yêu cầu"
              value={accountDisplayName(withdrawal, accounts)}
            />
            <DetailRow
            label="Tài khoản"
              value={accountSubLabel(withdrawal, accounts)}
            />
            <DetailRow label="Số tiền" value={formatCurrency(withdrawal.amount)} />
            <DetailRow
              label="Trạng thái"
              value={withdrawalStatusLabel(withdrawal.status)}
            />
            <DetailRow label="Ngân hàng" value={withdrawal.bankName} />
            <DetailRow
              label="Số tài khoản"
              value={maskSensitiveValue(withdrawal.bankAccountNumber)}
              mono
            />
            <DetailRow
              label="Chủ tài khoản"
              value={withdrawal.bankAccountHolder}
            />
            <DetailRow
              label="Ngày tạo"
              value={formatDateTime(withdrawal.requestedAt ?? withdrawal.createdAt)}
            />
            <DetailRow
              label="Ngày xử lý"
              value={
                withdrawal.reviewedAt
                  ? formatDateTime(withdrawal.reviewedAt)
                  : undefined
              }
            />
            <DetailRow
              label="Cập nhật lần cuối"
              value={
                withdrawal.updatedAt
                  ? formatDateTime(withdrawal.updatedAt)
                  : undefined
              }
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-slate-500">
              Ghi chú của quản trị viên
            </span>
            <div className="mt-1 max-h-[60vh] overflow-y-auto whitespace-pre-wrap break-all rounded-xl border border-slate-200 bg-white p-3 text-ink">
              {withdrawal.adminNote || "Không có ghi chú"}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export function AdminWithdrawalPage() {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">(
    "PENDING",
  );
  const [selected, setSelected] = useState<WithdrawalRequest | null>(null);
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewSelected, setViewSelected] = useState<WithdrawalRequest | null>(
    null,
  );
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, accountItems] = await Promise.all([
        withdrawalApi.listAll(),
        adminApi.listAccounts().catch(() => []),
      ]);
      setWithdrawals(data);
      setAccounts(accountItems);
    } catch {
      setWithdrawals([]);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const openReview = (wr: WithdrawalRequest, act: "approve" | "reject") => {
    setSelected(wr);
    setAction(act);
    setModalOpen(true);
  };

  const openViewDetails = (wr: WithdrawalRequest) => {
    setViewSelected(wr);
    setViewModalOpen(true);
  };

  const handleDone = () => {
    void load();
    setModalOpen(false);
  };

  const filtered = withdrawals.filter((wr) => {
    const matchTab = tab === "ALL" || wr.status === tab;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      String(wr.accountId).includes(q) ||
      accountDisplayName(wr, accounts).toLowerCase().includes(q) ||
      accountSubLabel(wr, accounts).toLowerCase().includes(q) ||
      wr.bankName.toLowerCase().includes(q) ||
      wr.bankAccountNumber.includes(q) ||
      wr.bankAccountHolder.toLowerCase().includes(q);
    return matchTab && matchSearch;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / WITHDRAWALS_PER_PAGE));
  const effectivePage = Math.min(currentPage, totalPages);
  const paginatedWithdrawals = filtered.slice(
    (effectivePage - 1) * WITHDRAWALS_PER_PAGE,
    effectivePage * WITHDRAWALS_PER_PAGE,
  );

  const counts = {
    ALL: withdrawals.length,
    PENDING: withdrawals.filter((w) => w.status === "PENDING").length,
    APPROVED: withdrawals.filter((w) => w.status === "APPROVED").length,
    REJECTED: withdrawals.filter((w) => w.status === "REJECTED").length,
  };

  const totalPending = withdrawals
    .filter((w) => w.status === "PENDING")
    .reduce((sum, w) => sum + w.amount, 0);

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          title="Quản lý yêu cầu rút tiền"
          description="Duyệt hoặc từ chối các yêu cầu rút tiền. Hãy chuyển khoản thủ công trước khi nhấn Duyệt."
          actions={
            <Button variant="secondary" onClick={load} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              Làm mới
            </Button>
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-50 text-amber-600">
              <Clock className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-slate-500">Đang chờ duyệt</p>
              <p className="font-display text-2xl font-black text-ink">
                {counts.PENDING}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-50 text-amber-600">
              <Building className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-slate-500">
                Tổng cần chuyển
              </p>
              <p className="font-display text-2xl font-black text-amber-700">
                {formatCurrency(totalPending)}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-mint-50 text-mint-600">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-slate-500">Đã duyệt</p>
              <p className="font-display text-2xl font-black text-ink">
                {counts.APPROVED}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <SectionHeading title="Danh sách yêu cầu" />
          <div className="flex flex-wrap items-center gap-3">
            <SearchInput
              value={search}
              onChange={(value) => {
                setSearch(value);
                setCurrentPage(1);
              }}
              placeholder="Tìm theo tên, email, số TK..."
            />
            <Tabs
              tabs={[
                { id: "ALL", label: "Tất cả", count: counts.ALL },
                { id: "PENDING", label: "Chờ duyệt", count: counts.PENDING },
                { id: "APPROVED", label: "Đã duyệt", count: counts.APPROVED },
                { id: "REJECTED", label: "Từ chối", count: counts.REJECTED },
              ]}
              active={tab}
              onChange={(id) => {
                setTab(id as typeof tab);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm font-semibold text-slate-400">
            Đang tải dữ liệu...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="Không có yêu cầu nào"
              description="Chưa có yêu cầu rút tiền phù hợp với bộ lọc hiện tại."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="grid min-w-[980px] grid-cols-[1fr_auto_auto_auto_auto_auto] gap-3 bg-slate-50 px-5 py-3 text-xs font-extrabold uppercase tracking-wide text-slate-400">
              <span>Thông tin ngân hàng</span>
              <span className="text-right">Số tiền</span>
              <span className="w-24 text-center">Trạng thái</span>
              <span className="w-28 text-right">Ngày tạo</span>
              <span className="w-28 text-right">Ngày xử lý</span>
              <span className="w-44 text-center">Hành động</span>
            </div>

            <div className="divide-y divide-slate-50">
              {paginatedWithdrawals.map((wr) => (
                <div
                  key={wr.withdrawalId}
                  className="grid min-w-[980px] grid-cols-[1fr_auto_auto_auto_auto_auto] items-center gap-3 px-5 py-4 transition hover:bg-slate-50/50"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-500">
                      <Building className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-ink">
                        {wr.bankName} ·{" "}
                        <span className="font-mono">
                          {maskSensitiveValue(wr.bankAccountNumber)}
                        </span>
                      </p>
                      <p className="text-xs font-bold text-slate-600">
                        {accountDisplayName(wr, accounts)}
                      </p>
                      <p className="text-xs text-slate-400">
                        {wr.bankAccountHolder} · {accountSubLabel(wr, accounts)}
                      </p>
                    </div>
                  </div>

                  <span className="text-right font-extrabold text-ink">
                    {formatCurrency(wr.amount)}
                  </span>

                  <span className="w-24 text-center">
                    <Badge tone={statusTone(wr.status)}>
                      {withdrawalStatusLabel(wr.status)}
                    </Badge>
                  </span>

                  <DateCell value={wr.requestedAt ?? wr.createdAt} />
                  <DateCell value={wr.reviewedAt} />

                  <div className="flex w-44 items-center justify-center rounded-2xl bg-slate-50 p-1 [&_button]:min-w-[92px] [&_button]:justify-center">
                    {wr.status === "PENDING" ? (
                      <>
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => openReview(wr, "approve")}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Duyệt
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => openReview(wr, "reject")}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Từ chối
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openViewDetails(wr)}
                        className="min-w-[92px] justify-center rounded-2xl text-slate-500 hover:bg-brand-50 hover:text-brand-600"
                        title="Xem chi tiết"
                      >
                        <Eye className="h-4 w-4" />
                        Chi tiết
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {!loading && (
          <AdminPagination
            currentPage={effectivePage}
            pageSize={WITHDRAWALS_PER_PAGE}
            totalItems={filtered.length}
            itemLabel="yêu cầu rút tiền"
            onPageChange={setCurrentPage}
          />
        )}
      </Card>

      <ReviewModal
        open={modalOpen}
        withdrawal={selected}
        action={action}
        accounts={accounts}
        onClose={() => setModalOpen(false)}
        onDone={handleDone}
      />
      <ViewDetailsModal
        open={viewModalOpen}
        withdrawal={viewSelected}
        accounts={accounts}
        onClose={() => setViewModalOpen(false)}
      />
    </div>
  );
}

export function WithdrawalPage() {
  return <AdminWithdrawalPage />;
}

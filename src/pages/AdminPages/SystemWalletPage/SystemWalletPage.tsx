import {
  RefreshCw,
  ShieldAlert,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { adminApi, walletTransactionApi } from "../../../lib/api";
import { formatCurrency, formatDateTime } from "../../../lib/utils";
import {
  Badge,
  Button,
  Card,
  PageHeader,
  SectionHeading,
} from "../../../components/ui";
import { AdminMetric, WalletFact } from "../AdminPages.shared";
import type { AdminAccount, SystemWallet, WalletTransaction } from "../../../types";

export function SystemWalletPage() {
  const [wallet, setWallet] = useState<SystemWallet | null>(null);
  const [history, setHistory] = useState<WalletTransaction[]>([]);
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (sync = false) => {
    setLoading(true);
    try {
      const [w, h, accs] = await Promise.all([
        sync
          ? adminApi.syncSystemWallet()
          : adminApi.getSystemWallet(),
        walletTransactionApi.list(),
        adminApi.listAccounts(),
      ]);
      setWallet(w);
      setHistory(h);
      setAccounts(accs);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          title="Quản lý ví"
          description="Dữ liệu được cập nhật tự động từ hệ thống mỗi khi có giao dịch hoặc biến động tranh chấp."
          actions={
            <Button onClick={() => load(true)} disabled={loading}>
              <RefreshCw className="h-4 w-4" /> Đồng bộ
            </Button>
          }
        />
      </div>
      {wallet && (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <AdminMetric
              label="Số dư hiện tại"
              value={formatCurrency(wallet.currentBalance)}
              icon={<WalletCards className="h-5 w-5" />}
              tone="mint"
            />
            <AdminMetric
              label="Số dư ký quỹ"
              value={formatCurrency(wallet.escrowBalance)}
              icon={<ShieldAlert className="h-5 w-5" />}
              tone="amber"
            />
            <AdminMetric
              label="Tổng doanh thu"
              value={formatCurrency(wallet.totalRevenue)}
              icon={<TrendingUp className="h-5 w-5" />}
            />
            <AdminMetric
              label="Số dư tranh chấp"
              value={formatCurrency(wallet.disputedBalance)}
              icon={<ShieldAlert className="h-5 w-5" />}
              tone="coral"
            />
          </div>
          <div className="grid gap-6">
            <Card className="p-6">
              <SectionHeading
                title="Thông tin tổng quan"
                description="Các số liệu chung của sổ cái."
              />
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <WalletFact label="Loại ví" value={wallet.walletType} />
                <WalletFact
                  label="Khả dụng"
                  value={formatCurrency(wallet.availableBalance)}
                  tone="mint"
                />
                <WalletFact
                  label="Doanh nghiệp ký quỹ"
                  value={wallet.depositedBusinessCount}
                  tone="brand"
                />
                <WalletFact
                  label="Giao dịch thành công"
                  value={wallet.successfulDepositCount}
                  tone="mint"
                />
              </div>
            </Card>

            <Card className="p-6">
              <SectionHeading
                title="Lịch sử ký quỹ"
                description="Lịch sử các giao dịch ký quỹ của hệ thống."
              />
              <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-100">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-bold text-slate-500">
                        Mã giao dịch
                      </th>
                      <th className="px-4 py-3 text-left font-bold text-slate-500">
                        Ngày giờ
                      </th>
                      <th className="px-4 py-3 text-left font-bold text-slate-500">
                        Tài khoản
                      </th>
                      <th className="px-4 py-3 text-left font-bold text-slate-500">
                        Số tiền
                      </th>
                      <th className="px-4 py-3 text-left font-bold text-slate-500">
                        Trạng thái
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {history.map((t) => (
                      <tr key={t.id}>
                        <td className="px-4 py-3 font-semibold text-slate-700">
                          #{t.id}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col font-medium text-slate-500">
                            {(() => {
                              const dt = formatDateTime(t.createdAt);
                              const [time, date] = dt.split(" ");
                              return (
                                <>
                                  <span>{time}</span>
                                  <span>{date}</span>
                                </>
                              );
                            })()}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {t.accountId ? (accounts.find(a => a.accountId === t.accountId)?.fullName ?? `#${t.accountId}`) : "-"}
                        </td>
                        <td className="px-4 py-3 font-bold text-brand-600">
                          {formatCurrency(t.amount)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            tone={
                              t.status === "SUCCESS"
                                ? "mint"
                                : t.status === "PENDING"
                                  ? "amber"
                                  : "coral"
                            }
                          >
                            {t.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                    {history.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-8 text-center text-slate-400"
                        >
                          Chưa có lịch sử ký quỹ.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

import {
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Gavel,
  WalletCards,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { contractApi, disputeApi, marketplaceApi, notificationApi } from "../../services";
import { roleLabel, useSession } from "../../context/sessionContext";
import { connectNotificationSocket } from "../../lib/notificationSocket";
import { cn, formatCompactCurrency } from "../../lib/utils";
import {
  formatNotificationTime,
  mergeNotification,
  notificationHref,
  notificationTone,
} from "../../lib/notifications";
import type { Contract, Dispute, Job, NotificationItem } from "../../types";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  LinkButton,
  ListLink,
  MetricCard,
  Notice,
  PageHeader,
  SectionHeading,
  StatusBadge,
} from "../../components/ui";

export function DashboardPage() {
  const session = useSession();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    marketplaceApi
      .listJobs()
      .then(setJobs)
      .catch(() => setJobs([]));
    contractApi
      .listContracts()
      .then(async (items) => {
        setContracts(items);
        const disputeGroups = await Promise.all(
          items.map((contract) =>
            disputeApi.listByContract(contract.contractId).catch(() => []),
          ),
        );
        setDisputes(disputeGroups.flat());
      })
      .catch(() => {
        setContracts([]);
        setDisputes([]);
      });
    notificationApi
      .list()
      .then(setNotifications)
      .catch(() => setNotifications([]));
  }, []);

  if (!session) return null;

  const roleActions = {
    BUSINESS: [
      ["Tạo job bằng AI", "/app/jobs/new", "Chuẩn hóa yêu cầu thô thành SoW"],
      [
        "Quản lý proposal",
        "/app/jobs",
        "Chọn job thật để xem đề xuất và báo giá",
      ],
      ["Theo dõi escrow", "/app/finance", "Ký quỹ, VNPay sandbox, webhook"],
    ],
    EXPERT: [
      ["Tìm cơ hội", "/app/opportunities", "Nộp proposal cho job phù hợp"],
      [
        "Cập nhật portfolio",
        "/app/expert/portfolio",
        "4 thành phần năng lực AI",
      ],
      [
        "Bàn giao milestone",
        "/app/contracts",
        "Chọn hợp đồng thật để mở workspace",
      ],
    ],
    STAFF: [
      ["Duyệt hồ sơ", "/app/verifications", "KYC/KYB pending"],
      [
        "Demo testing",
        "/app/tickets",
        "Chọn dispute thật để kiểm thử và ghi nhận kết quả",
      ],
      ["Viết technical report", "/app/tickets", "Đề xuất phương án xử lý"],
    ],
    ADMIN: [
      ["Analytics", "/app/admin/analytics", "Doanh thu và tỷ lệ thành công"],
      ["Phân công dispute", "/app/tickets", "Assign staff và resolve"],
      ["System settings", "/app/admin/settings", "SLA, phí sàn, auto-routing"],
    ],
  }[session.role];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={roleLabel(session.role)}
        title={`Xin chào, ${session.fullName}`}
        description="Dashboard tổng hợp các điểm cần xử lý theo vai trò và luồng nghiệp vụ hiện tại."
        actions={
          <LinkButton to="/app/notifications" variant="secondary">
            <Bell className="h-4 w-4" />
            Thông báo
          </LinkButton>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Job đang mở"
          value={jobs.filter((job) => job.status === "OPEN").length}
          helper="Từ marketplace"
          icon={<BriefcaseBusiness className="h-5 w-5" />}
        />
        <MetricCard
          label="Hợp đồng active"
          value={
            contracts.filter((contract) => contract.status === "Active").length
          }
          helper="Đang thực thi"
          icon={<FileCheck2 className="h-5 w-5" />}
          tone="mint"
        />
        <MetricCard
          label="Giá trị hợp đồng"
          value={formatCompactCurrency(
            contracts.reduce(
              (total, contract) => total + Number(contract.totalBudget || 0),
              0,
            ),
          )}
          helper="Từ contract API"
          icon={<WalletCards className="h-5 w-5" />}
          tone="coral"
        />
        <MetricCard
          label="Dispute mở"
          value={
            disputes.filter(
              (dispute) =>
                !["Resolved", "Closed", "Rejected"].includes(dispute.status),
            ).length
          }
          helper="Cần xử lý"
          icon={<Gavel className="h-5 w-5" />}
          tone="amber"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_.9fr]">
        <Card className="p-6">
          <SectionHeading
            title="Việc cần làm tiếp theo"
            description="Các action dùng cùng pattern: tiêu đề, mô tả, nút đi tiếp ở cạnh phải."
          />
          <div className="mt-5 grid gap-3">
            {roleActions.map(([title, href, description], index) => (
              <Link
                key={title}
                to={href}
                className="group flex items-center gap-4 rounded-3xl border border-slate-100 p-4 transition hover:border-brand-100 hover:bg-brand-50/40"
              >
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white font-display text-lg font-black text-brand-600 shadow-sm">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold text-ink">{title}</p>
                  <p className="mt-1 text-sm text-slate-500">{description}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-brand-600" />
              </Link>
            ))}
          </div>
        </Card>

        <Card className="overflow-hidden p-6">
          <SectionHeading
            title="Tín hiệu hệ thống"
            description="Dữ liệu realtime sẽ hiển thị khi back-end có API hoặc WebSocket tương ứng."
          />
          <div className="mt-5 space-y-4">
            <Notice tone="info" title="Kết nối back-end thật">
              App gọi trực tiếp API back-end. Với endpoint chưa có, giao diện
              hiển thị trạng thái trống hoặc thông báo cần bổ sung API.
            </Notice>
            <div className="rounded-3xl bg-gradient-to-br from-brand-600 to-indigo-700 p-5 text-white">
              <p className="font-extrabold">Dữ liệu đang tải từ API</p>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-2xl bg-white/10 p-3">
                  <p className="text-2xl font-black">{jobs.length}</p>
                  <p className="text-xs text-blue-50">Job</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-3">
                  <p className="text-2xl font-black">{contracts.length}</p>
                  <p className="text-xs text-blue-50">Contract</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-3">
                  <p className="text-2xl font-black">{disputes.length}</p>
                  <p className="text-xs text-blue-50">Dispute</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="p-6 xl:col-span-2">
          <SectionHeading
            title="Hợp đồng gần đây"
            action={
              <LinkButton to="/app/contracts" variant="secondary" size="sm">
                Xem tất cả
              </LinkButton>
            }
          />
          <div className="mt-5 grid gap-3">
            {contracts.map((contract) => (
              <ListLink
                key={contract.contractId}
                to={`/app/contracts/${contract.contractId}`}
                title={contract.title || `Contract #${contract.contractId}`}
                description={`${contract.businessName} • ${contract.expertName} • ${formatCompactCurrency(contract.totalBudget)}`}
                leading={<FileCheck2 className="h-5 w-5 text-brand-500" />}
                trailing={<StatusBadge status={contract.status} />}
              />
            ))}
          </div>
        </Card>
        <Card className="p-6">
          <SectionHeading title="Thông báo mới" />
          <div className="mt-5 grid gap-3">
            {notifications.slice(0, 3).map((item) => (
              <ListLink
                key={item.notificationId}
                to={`/app/notifications?notificationId=${item.notificationId}`}
                title={item.title}
                description={`${formatNotificationTime(item.createdAt)} - ${item.message}`}
                leading={
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                    <Bell className="h-4 w-4" />
                  </span>
                }
              />
            ))}
            {notifications.length === 0 && (
              <p className="rounded-2xl bg-slate-50 px-4 py-5 text-sm font-semibold text-slate-400">
                Chua co thong bao moi.
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

export function NotificationsPage() {
  const session = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const selectedNotificationId = new URLSearchParams(location.search).get("notificationId");

  const refresh = () => {
    setLoading(true);
    notificationApi
      .list()
      .then(setNotifications)
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, []);

  useEffect(() => {
    if (!session?.accessToken) return;

    const stream = connectNotificationSocket({
      token: session.accessToken,
      onNotification: (notification) => {
        setNotifications((items) => mergeNotification(items, notification));
      },
    });

    return () => {
      stream.close();
    };
  }, [session?.accessToken]);

  const selectedNotification = useMemo(
    () =>
      selectedNotificationId
        ? notifications.find(
            (item) => String(item.notificationId) === selectedNotificationId,
          ) ?? null
        : null,
    [notifications, selectedNotificationId],
  );

  const openNotification = (notification: NotificationItem) => {
    navigate(`/app/notifications?notificationId=${notification.notificationId}`, { replace: true });
    if (!notification.isRead) {
      const readAt = new Date().toISOString();
      setNotifications((items) =>
        items.map((item) =>
          item.notificationId === notification.notificationId
            ? { ...item, isRead: true, readAt }
            : item,
        ),
      );
      notificationApi.markRead(notification.notificationId).catch(refresh);
    }
  };

  const markAllRead = () => {
    setNotifications((items) => items.map((item) => ({ ...item, isRead: true })));
    notificationApi.markAllRead().then(setNotifications).catch(refresh);
  };

  const unreadCount = notifications.filter((item) => !item.isRead).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Realtime Center"
        title="Trung tam thong bao"
        description="Theo doi tat ca thong bao he thong va trang thai da doc."
        actions={
          unreadCount > 0 ? (
            <Button variant="secondary" onClick={markAllRead}>
              Doc tat ca
            </Button>
          ) : undefined
        }
      />
      <div className="grid gap-4">
        {loading ? (
          <Card className="p-8 text-center text-sm font-semibold text-slate-400">
            Dang tai thong bao...
          </Card>
        ) : notifications.length === 0 ? (
          <EmptyState
            title="Chua co thong bao"
            description="Khi backend tao thong bao moi, danh sach se hien thi tai day."
          />
        ) : (
          notifications.map((item) => {
            const tone = notificationTone(item);
            const isSelected = selectedNotification?.notificationId === item.notificationId;
            const targetHref = item.targetUrl ? notificationHref(item.targetUrl) : null;

            return (
              <Card
                key={item.notificationId}
                className={cn(
                  "p-5 transition-all duration-200",
                  isSelected && "border-brand-200 bg-brand-50/30 shadow-sm",
                )}
              >
                <div className="flex w-full items-start gap-4">
                  <span
                    className={cn(
                      "grid h-12 w-12 shrink-0 place-items-center rounded-2xl",
                      tone === "success"
                        ? "bg-mint-50 text-mint-600"
                        : tone === "warning"
                          ? "bg-amber-50 text-amber-600"
                          : "bg-brand-50 text-brand-600",
                    )}
                  >
                    {tone === "success" ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : tone === "warning" ? (
                      <Clock3 className="h-5 w-5" />
                    ) : (
                      <Bell className="h-5 w-5" />
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-lg font-extrabold text-ink">
                        {item.title}
                      </h3>
                      {!item.isRead && <Badge tone="coral">Moi</Badge>}
                    </div>
                    <p
                      className={cn(
                        "mt-1 text-sm leading-6 text-slate-500 transition-all",
                        isSelected ? "whitespace-pre-line text-slate-700" : "line-clamp-2",
                      )}
                    >
                      {item.message}
                    </p>

                    {isSelected && (
                      <div className="mt-4 space-y-4 border-t border-slate-200/60 pt-4">
                        {item.metadata?.reason && (
                          <div className="rounded-xl border border-rose-100 bg-rose-50 p-3">
                            <p className="mb-1 text-sm font-semibold text-rose-800">Ly do tu choi:</p>
                            <p className="text-sm text-rose-700">{item.metadata.reason}</p>
                          </div>
                        )}
                        <div className="grid gap-2 text-xs font-semibold text-slate-500 sm:grid-cols-2">
                          <span>Loai: {item.type}</span>
                          <span>Trang thai: {item.isRead ? "Da doc" : "Chua doc"}</span>
                        </div>
                        <div className="flex flex-wrap justify-end gap-2 pt-1">
                          {targetHref && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={(event) => {
                                event.stopPropagation();
                                navigate(targetHref);
                              }}
                            >
                              Mo lien ket
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(event) => {
                              event.stopPropagation();
                              navigate("/app/notifications", { replace: true });
                            }}
                          >
                            Dong chi tiet
                          </Button>
                        </div>
                      </div>
                    )}

                    <p className="mt-2 text-xs font-bold text-slate-400">
                      {formatNotificationTime(item.createdAt)}
                    </p>
                  </div>

                  {!isSelected && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="shrink-0"
                      onClick={() => openNotification(item)}
                    >
                      Chi tiet
                    </Button>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
export function ProfilePagesHint() {
  return (
    <Notice tone="info" title="Luồng xác minh">
      Hồ sơ mặc định ở trạng thái Pending. Admin hoặc Staff chuyển sang Approved
      để mở khóa giao dịch.
    </Notice>
  );
}

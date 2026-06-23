import {
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Gavel,
  IdCard,
  Layers3,
  WalletCards,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import {
  catalogApi,
  contractApi,
  disputeApi,
  marketplaceApi,
  notificationApi,
  profileApi,
} from "../../services";
import { roleLabel, useSession } from "../../context/sessionContext";
import { connectNotificationSocket } from "../../lib/notificationSocket";
import { cn, formatCompactCurrency } from "../../lib/utils";
import {
  formatNotificationTime,
  mergeNotification,
  notificationHref,
  notificationTone,
} from "../../lib/notifications";
import type {
  Contract,
  Dispute,
  Job,
  NotificationItem,
  Proposal,
} from "../../types";
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
  const [pendingVerifications, setPendingVerifications] = useState(0);
  const [domainsCount, setDomainsCount] = useState(0);
  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [myProposals, setMyProposals] = useState<Proposal[]>([]);

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

    if (session?.role === "STAFF") {
      Promise.all([profileApi.listBusinesses(), profileApi.listExperts()])
        .then(([businesses, experts]) => {
          const pendingB = businesses.filter(
            (b) => b.kybStatus === "Pending",
          ).length;
          const pendingE = experts.filter(
            (e) => e.kycStatus === "Pending",
          ).length;
          setPendingVerifications(pendingB + pendingE);
        })
        .catch(() => setPendingVerifications(0));

      catalogApi
        .listDomains()
        .then((domains) => setDomainsCount(domains.length))
        .catch(() => setDomainsCount(0));
    }

    if (session?.role === "BUSINESS") {
      marketplaceApi
        .listMyJobs()
        .then(setMyJobs)
        .catch(() => setMyJobs([]));
    }

    if (session?.role === "EXPERT") {
      marketplaceApi
        .listMyProposals()
        .then(setMyProposals)
        .catch(() => setMyProposals([]));
    }
  }, [session?.role]);

  if (!session) return null;

  const roleActions = {
    BUSINESS: [
      [
        "Tạo yêu cầu bằng AI",
        "/app/jobs/new",
        "Chuẩn hóa yêu cầu thô thành SoW",
      ],
      ["Quản lý dự án", "/app/jobs", "Xem dề xuất và báo giá"],
      ["Theo dõi escrow", "/app/finance", "Ký quỹ, PayOS"],
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
        "Chọn hợp đồng thật dể mở workspace",
      ],
    ],
    STAFF: [
      ["Duyệt hồ sơ", "/app/verifications", "KYC/KYB pending"],
      [
        "Demo testing",
        "/app/tickets",
        "Chọn dispute thật dể kiểm thử và ghi nhận kết quả",
      ],
      ["Viết technical report", "/app/tickets", "Đề xuất phương án xử lý"],
    ],
    ADMIN: [
      ["Analytics", "/app/admin/analytics", "Doanh thu và tỷ lệ thành công"],
      ["Phân công dispute", "/app/tickets", "Assign staff và resolve"],
      ["System settings", "/app/admin/settings", "SLA, phí sàn, auto-routing"],
    ],
  }[session.role];

  const descriptionText =
    session.role === "BUSINESS"
      ? "Tổng hợp chung của doanh nghiệp"
      : session.role === "EXPERT"
        ? "Tổng hợp chung của chuyên gia"
        : session.role === "ADMIN"
          ? "Tổng hợp chung của hệ thống"
          : "Tổng hợp chung các thông tin của nhân viên";

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          eyebrow={roleLabel(session.role)}
          title={`Xin chào, ${session.fullName}`}
          description={descriptionText}
          actions={
            <LinkButton to="/app/notifications" variant="secondary">
              <Bell className="h-4 w-4" />
              Thông báo
            </LinkButton>
          }
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {session?.role === "STAFF" ? (
          <MetricCard
            label="Số hồ sơ cần duyệt"
            value={pendingVerifications}
            helper="KYC/KYB Pending"
            icon={<IdCard className="h-5 w-5" />}
          />
        ) : (
          <MetricCard
            label="Số bài đăng hiện có"
            value={jobs.filter((job) => job.status === "OPEN").length}
            helper="Từ thị trường"
            icon={<BriefcaseBusiness className="h-5 w-5" />}
          />
        )}
        {session?.role === "BUSINESS" ? (
          <MetricCard
            label="Số proposal đã nhận"
            value={myJobs.reduce(
              (sum, job) => sum + (job.proposalsCount || 0),
              0,
            )}
            helper="Từ các chuyên gia"
            icon={<FileCheck2 className="h-5 w-5" />}
            tone="mint"
          />
        ) : session?.role === "EXPERT" ? (
          <MetricCard
            label="Số proposal đã gửi"
            value={myProposals.length}
            helper="Đến doanh nghiệp"
            icon={<FileCheck2 className="h-5 w-5" />}
            tone="mint"
          />
        ) : (
          <MetricCard
            label="Báo cáo kĩ thuật"
            value={
              contracts.filter((contract) => contract.status === "Active")
                .length
            }
            helper="Đang thực thi"
            icon={<FileCheck2 className="h-5 w-5" />}
            tone="mint"
          />
        )}
        {session.role !== "STAFF" && (
          <MetricCard
            label={
              session.role === "EXPERT"
                ? "Doanh thu cá nhân"
                : session.role === "BUSINESS"
                  ? "Tổng chi dự án"
                  : "Tổng chi các dự án"
            }
            value={formatCompactCurrency(
              contracts.reduce(
                (total, contract) => total + Number(contract.totalBudget || 0),
                0,
              ),
            )}
            helper="Từ hợp đồng"
            icon={<WalletCards className="h-5 w-5" />}
            tone="coral"
          />
        )}
        <MetricCard
          label="Tranh chấp hiện có"
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
        {session?.role === "STAFF" && (
          <MetricCard
            label="Lĩnh vực chuyên môn"
            value={domainsCount}
            helper="Trên hệ thống"
            icon={<Layers3 className="h-5 w-5" />}
            tone="brand"
          />
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_.9fr]">
        <Card className="p-6">
          <SectionHeading title="Việc cần làm tiếp theo" />
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

        <Card className="p-6">
          <SectionHeading title="Thông báo mới" />
          <div className="mt-5 grid gap-3">
            {notifications.slice(0, 3).map((item) => (
              <ListLink
                key={item.notificationId}
                to={`/app/notifications?notificationId=${item.notificationId}`}
                title={item.title}
                description={`${formatNotificationTime(item.createdAt)} - ${item.message}`}
                descriptionClassName="line-clamp-2 whitespace-normal break-words leading-5"
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

      <div className="grid gap-6">
        <Card className="p-6">
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
  const selectedNotificationId = new URLSearchParams(location.search).get(
    "notificationId",
  );

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
        ? (notifications.find(
            (item) => String(item.notificationId) === selectedNotificationId,
          ) ?? null)
        : null,
    [notifications, selectedNotificationId],
  );

  const openNotification = (notification: NotificationItem) => {
    navigate(
      `/app/notifications?notificationId=${notification.notificationId}`,
      { replace: true },
    );
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
    setNotifications((items) =>
      items.map((item) => ({ ...item, isRead: true })),
    );
    notificationApi.markAllRead().then(setNotifications).catch(refresh);
  };

  const unreadCount = notifications.filter((item) => !item.isRead).length;

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          eyebrow="Realtime Center"
          title="Trung tâm thông báo"
          description="Theo dõi tất cả thông báo hệ thống và trạng thái đã đọc."
          actions={
            unreadCount > 0 ? (
              <Button variant="secondary" onClick={markAllRead}>
                Đọc tất cả
              </Button>
            ) : undefined
          }
        />
      </div>
      <div className="grid gap-4">
        {loading ? (
          <Card className="p-8 text-center text-sm font-semibold text-slate-400">
            Đang tải thông báo...
          </Card>
        ) : notifications.length === 0 ? (
          <EmptyState
            title="Chua co thong bao"
            description=""
          />
        ) : (
          notifications.map((item) => {
            const tone = notificationTone(item);
            const isSelected = selectedNotification?.notificationId === item.notificationId;
            const targetHref = notificationHref(item.targetUrl, item);

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
                        isSelected
                          ? "whitespace-pre-line text-slate-700"
                          : "line-clamp-2",
                      )}
                    >
                      {item.message}
                    </p>

                    {isSelected && (
                      <div className="mt-4 space-y-4 border-t border-slate-200/60 pt-4">
                        {item.metadata?.reason && (
                          <div className="rounded-xl border border-rose-100 bg-rose-50 p-3">
                            <p className="mb-1 text-sm font-semibold text-rose-800">
                              Lý do từ chối:
                            </p>
                            <p className="text-sm text-rose-700">
                              {item.metadata.reason}
                            </p>
                          </div>
                        )}
                        <div className="grid gap-2 text-xs font-semibold text-slate-500 sm:grid-cols-2">
                          <span>Loại: {item.type}</span>
                          <span>
                            Trạng thái: {item.isRead ? "Đã đọc" : "Chưa đọc"}
                          </span>
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
                              Mở liên kết
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
                            Đóng chi tiết
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
                      Chi tiết
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

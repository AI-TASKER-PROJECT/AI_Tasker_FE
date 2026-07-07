import { Bell, CheckCircle2, Clock3 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { notificationApi } from "../../../services";
import { useSession } from "../../../context/sessionContext";
import { connectNotificationSocket } from "../../../lib/notificationSocket";
import { cn } from "../../../lib/utils";
import {
  formatNotificationTime,
  mergeNotification,
  notificationHref,
  notificationTone,
} from "../../../lib/notifications";
import type { NotificationItem } from "../../../types";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
} from "../../../components/ui";

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
          <EmptyState title="Chua co thong bao" description="" />
        ) : (
          notifications.map((item) => {
            const tone = notificationTone(item);
            const isSelected =
              selectedNotification?.notificationId === item.notificationId;
            const targetHref = notificationHref(item.targetUrl, item, session?.role);

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

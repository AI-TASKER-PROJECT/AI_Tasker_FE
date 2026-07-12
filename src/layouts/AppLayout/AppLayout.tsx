import {
  ArrowLeft,
  BadgeCheck,
  BarChart3,
  Bell,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  FileText,
  Gavel,
  IdCard,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  ReceiptText,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { connectNotificationSocket } from "../../lib/notificationSocket";
import {
  formatNotificationTime,
  mergeNotification,
  notificationTone,
} from "../../lib/notifications";
import { Logo } from "../../components/Logo";
import { ChatBox } from "../../components/ChatBox";
import QRCode from "qrcode";
import type {
  CreatePayOSPaymentResponse,
  NotificationItem,
  Role,
  SystemWallet,
  UserQuota,
} from "../../types";
import {
  authApi,
  getApiErrorMessage,
  paymentApi,
  userQuotaApi,
  walletApi,
  notificationApi,
} from "../../services";
import { cn, formatCurrency } from "../../lib/utils";

import {
  clearSession,
  getSession,
  roleLabel,
  saveSession,
  useSession,
} from "../../context/sessionContext";
import { notifyProfileReviewSync } from "../../lib/profileReviewSync";
import {
  Avatar,
  Badge,
  Button,
  Field,
  Input,
  Modal,
  Notice,
} from "../../components/ui";

type NavItem = { label: string; to: string; icon: ReactNode };

type PackageLabel = "Basic" | "Standard" | "Plus" | "Premium";
type PackageTone = "slate" | "violet" | "brand" | "amber";

const packageConfig: Record<
  PackageLabel,
  {
    tone: PackageTone;
    dotClass: string;
  }
> = {
  Basic: {
    tone: "slate",
    dotClass: "bg-slate-500",
  },
  Standard: {
    tone: "violet",
    dotClass: "bg-violet-500",
  },
  Plus: {
    tone: "brand",
    dotClass: "bg-brand-500",
  },
  Premium: {
    tone: "amber",
    dotClass: "bg-amber-500",
  },
};

function hasActiveMembership(quota: UserQuota | null): boolean {
  return resolveActivePackageTier(quota) !== "Basic";
}

function resolveActivePackageTier(quota: UserQuota | null): PackageLabel {
  const packageCode = quota?.activePackageCode?.toUpperCase();
  if (packageCode?.includes("STANDARD")) return "Standard";
  if (packageCode?.includes("PLUS")) return "Plus";
  if (packageCode?.includes("PREMIUM")) return "Premium";
  return "Basic";
}

function getBadgeRemainingDays(expiredAt?: string): number | null {
  if (!expiredAt) return null;
  const ms = new Date(expiredAt).getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / 86400000);
}

const commonNav: NavItem[] = [
  {
    label: "Tổng quan",
    to: "/app",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
];

const roleNav: Record<Role, NavItem[]> = {
  BUSINESS: [
    {
      label: "Trang chủ",
      to: "/home",
      icon: <Building2 className="h-4 w-4" />,
    },
    {
      label: "Dự án của tôi",
      to: "/app/jobs",
      icon: <BriefcaseBusiness className="h-4 w-4" />,
    },
    {
      label: "Hợp đồng",
      to: "/app/contracts",
      icon: <FileCheck2 className="h-4 w-4" />,
    },
    {
      label: "Tài chính",
      to: "/app/finance",
      icon: <WalletCards className="h-4 w-4" />,
    },
    {
      label: "Ví & Thanh toán",
      to: "/app/wallet",
      icon: <WalletCards className="h-4 w-4" />,
    },
    {
      label: "Tranh chấp",
      to: "/app/disputes",
      icon: <Gavel className="h-4 w-4" />,
    },
    {
      label: "Gói thành viên",
      to: "/app/membership",
      icon: <Star className="h-4 w-4" />,
    },
    {
      label: "Đánh giá",
      to: "/app/reviews",
      icon: <Star className="h-4 w-4" />,
    },
    {
      label: "Hồ sơ KYB",
      to: "/app/business/profile",
      icon: <Building2 className="h-4 w-4" />,
    },
  ],
  EXPERT: [
    {
      label: "Trang chủ",
      to: "/home",
      icon: <IdCard className="h-4 w-4" />,
    },
    {
      label: "Cơ hội dự án",
      to: "/app/opportunities",
      icon: <Sparkles className="h-4 w-4" />,
    },
    {
      label: "Proposal của tôi",
      to: "/app/proposals",
      icon: <FileText className="h-4 w-4" />,
    },
    {
      label: "Hợp đồng",
      to: "/app/contracts",
      icon: <FileCheck2 className="h-4 w-4" />,
    },
    {
      label: "Tài chính",
      to: "/app/finance",
      icon: <WalletCards className="h-4 w-4" />,
    },
    {
      label: "Ví & Thanh toán",
      to: "/app/wallet",
      icon: <WalletCards className="h-4 w-4" />,
    },
    {
      label: "Tranh chấp",
      to: "/app/disputes",
      icon: <Gavel className="h-4 w-4" />,
    },
    {
      label: "Gói thành viên",
      to: "/app/membership",
      icon: <Star className="h-4 w-4" />,
    },
    {
      label: "Đánh giá",
      to: "/app/reviews",
      icon: <Star className="h-4 w-4" />,
    },
    {
      label: "Hồ sơ KYC",
      to: "/app/expert/profile",
      icon: <IdCard className="h-4 w-4" />,
    },
    {
      label: "Portfolio AI",
      to: "/app/expert/portfolio",
      icon: <ClipboardCheck className="h-4 w-4" />,
    },
  ],
  STAFF: [
    {
      label: "Duyệt hồ sơ",
      to: "/app/verifications",
      icon: <ShieldCheck className="h-4 w-4" />,
    },
    {
      label: "Tranh chấp",
      to: "/app/tickets",
      icon: <Gavel className="h-4 w-4" />,
    },
    {
      label: "Analytics",
      to: "/app/admin/analytics",
      icon: <BarChart3 className="h-4 w-4" />,
    },
    {
      label: "System Settings",
      to: "/app/admin/settings",
      icon: <Settings2 className="h-4 w-4" />,
    },
  ],
  ADMIN: [
    {
      label: "Ví nền tảng",
      to: "/app/admin/wallet",
      icon: <WalletCards className="h-4 w-4" />,
    },
    {
      label: "Rút tiền",
      to: "/app/admin/withdrawals",
      icon: <ReceiptText className="h-4 w-4" />,
    },
    {
      label: "Tài khoản",
      to: "/app/admin/accounts",
      icon: <Users className="h-4 w-4" />,
    },
    {
      label: "Phân tích",
      to: "/app/admin/analytics",
      icon: <BarChart3 className="h-4 w-4" />,
    },
    {
      label: "Duyệt hồ sơ",
      to: "/app/verifications",
      icon: <ShieldCheck className="h-4 w-4" />,
    },
    {
      label: "Tranh chấp",
      to: "/app/disputes",
      icon: <Gavel className="h-4 w-4" />,
    },

    {
      label: "Quản lý nhân viên",
      to: "/app/admin/staff",
      icon: <Users className="h-4 w-4" />,
    },
    {
      label: "Dữ liệu nền tảng",
      to: "/app/admin/master-data",
      icon: <BriefcaseBusiness className="h-4 w-4" />,
    },
    {
      label: "Nhật ký hệ thống",
      to: "/app/admin/audit-logs",
      icon: <ReceiptText className="h-4 w-4" />,
    },
    {
      label: "Báo cáo",
      to: "/app/admin/reports",
      icon: <FileText className="h-4 w-4" />,
    },
    {
      label: "Cấu hình hệ thống",
      to: "/app/admin/settings",
      icon: <Settings2 className="h-4 w-4" />,
    },
  ],
};

//nạp tiền
export function AppShell() {
  const session = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [wallet, setWallet] = useState<SystemWallet | null>(null);
  const [quota, setQuota] = useState<UserQuota | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [topupOpen, setTopupOpen] = useState(false);
  const [topupLoading, setTopupLoading] = useState(false);
  const [topupForm, setTopupForm] = useState({ amount: "", description: "" });
  const [topupNotice, setTopupNotice] = useState<{
    tone: "info" | "success" | "warning" | "danger";
    title: string;
  } | null>(null);
  const [topupPayment, setTopupPayment] =
    useState<CreatePayOSPaymentResponse | null>(null);
  const [topupQrDataUrl, setTopupQrDataUrl] = useState("");

  const topupQrBoxRef = useRef<HTMLDivElement | null>(null);

  const role = session?.role;
  const showBackButton = location.pathname !== "/app";
  const accountStatus = session?.accountStatus || "Approved";
  const needsVerification =
    !!session &&
    (session.role === "BUSINESS" || session.role === "EXPERT") &&
    accountStatus !== "Approved";
  const verificationPath =
    session?.role === "BUSINESS"
      ? "/app/business/profile"
      : "/app/expert/profile";
  const verificationAllowedPaths = useMemo(() => {
    if (!session) return [];
    return [verificationPath, "/app/notifications"];
  }, [session, verificationPath]);
  const navItems = useMemo(() => {
    if (!role) return [];
    if (needsVerification) {
      return roleNav[role].filter((item) =>
        verificationAllowedPaths.includes(item.to),
      );
    }
    return [...commonNav, ...roleNav[role]].filter((item) => {
      if (role === "STAFF") return !item.to.startsWith("/app/admin");
      if (role === "ADMIN") return item.to !== "/app/verifications";
      return true;
    });
  }, [needsVerification, role, verificationAllowedPaths]);

  const defaultTopupDescription = useMemo(() => {
    const payerName = session?.fullName || "AITasker";
    return `${payerName} chuyen khoan`;
  }, [session?.fullName]);

  useEffect(() => {
    if (!topupPayment || !topupQrDataUrl) return;
    window.setTimeout(() => {
      topupQrBoxRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 120);
  }, [topupPayment, topupQrDataUrl]);

  const loadWallet = useCallback(async () => {
    if (!session?.accessToken) return;
    setWalletLoading(true);
    try {
      const isExternal =
        session.role === "BUSINESS" || session.role === "EXPERT";
      const [walletRes, quotaRes] = await Promise.allSettled([
        walletApi.current(),
        isExternal ? userQuotaApi.getCurrent() : Promise.reject(),
      ]);
      setWallet(walletRes.status === "fulfilled" ? walletRes.value : null);
      setQuota(quotaRes.status === "fulfilled" ? quotaRes.value : null);
    } catch {
      setWallet(null);
      setQuota(null);
    } finally {
      setWalletLoading(false);
    }
  }, [session]);

  useEffect(() => {
    void Promise.resolve().then(loadWallet);
  }, [loadWallet]);

  useEffect(() => {
    if (!roleOpen) return;
    void Promise.resolve().then(loadWallet);
  }, [loadWallet, roleOpen]);

  const logout = () => {
    clearSession();
    navigate("/login");
  };

  const openTopup = useCallback(
    (event?: Event) => {
      const detail = (
        event as
          | CustomEvent<{ amount?: number; description?: string }>
          | undefined
      )?.detail;
      setTopupNotice(null);
      setTopupPayment(null);
      setTopupQrDataUrl("");
      setTopupForm((value) => ({
        amount:
          detail?.amount && Number.isFinite(detail.amount)
            ? String(Math.ceil(detail.amount))
            : value.amount,
        description:
          detail?.description ||
          value.description.trim() ||
          defaultTopupDescription,
      }));
      setTopupOpen(true);
      setRoleOpen(false);
    },
    [defaultTopupDescription],
  );

  useEffect(() => {
    window.addEventListener("aitasker:open-wallet-topup", openTopup);
    window.addEventListener("aitasker:reload-wallet", loadWallet);
    return () => {
      window.removeEventListener("aitasker:open-wallet-topup", openTopup);
      window.removeEventListener("aitasker:reload-wallet", loadWallet);
    };
  }, [openTopup, loadWallet]);

  const syncTopupStatus = useCallback(
    async (orderCode: number, showPending = true) => {
      try {
        const paymentOrder = await paymentApi.syncWalletTopup(orderCode); //api cập nhật số dư
        if (paymentOrder.status === "PAID") {
          setTopupNotice({
            tone: "success",
            title: "Thanh toán thành công. Số dư ví dã dược cập nhật.",
          });
          await loadWallet();
          window.dispatchEvent(new Event("aitasker:reload-wallet"));
          setTimeout(() => {
            setTopupOpen(false);
          }, 1500);
          return true;
        }

        if (
          paymentOrder.status === "FAILED" ||
          paymentOrder.status === "CANCELLED" ||
          paymentOrder.status === "EXPIRED"
        ) {
          setTopupNotice({
            tone: "danger",
            title: "Thanh toán không thành công, dã hủy hoặc dã hết hạn.",
          });
          return true;
        }

        if (showPending) {
          setTopupNotice({
            tone: "info",
            title:
              "Thanh toán đang chờ payOS xác nhận. Vui lòng thử lại sau vài giây.",
          });
        }
        return false;
      } catch (error) {
        setTopupNotice({
          tone: "danger",
          title: getApiErrorMessage(error),
        });
        return true;
      }
    },
    [loadWallet],
  );

  useEffect(() => {
    if (!topupOpen || !topupPayment || topupPayment.status !== "PENDING")
      return;
    let stopped = false;
    let attempts = 0;

    const timer = window.setInterval(async () => {
      attempts += 1;
      const done = await syncTopupStatus(topupPayment.orderCode, attempts >= 3);
      if (stopped || !done) return;
      window.clearInterval(timer);
    }, 4000);

    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [syncTopupStatus, topupOpen, topupPayment]);

  const submitTopup = async (event: FormEvent) => {
    //bấm submit
    event.preventDefault();
    const amount = Number(topupForm.amount);
    if (!Number.isInteger(amount) || amount < 2000) {
      setTopupNotice({
        tone: "danger",
        title: "Số tiền nạp phải là số nguyên VND lớn hơn 2.000.",
      });
      return;
    }

    setTopupLoading(true);
    setTopupNotice(null);
    setTopupPayment(null);
    setTopupQrDataUrl("");

    try {
      const payment = await paymentApi.createWalletTopup({
        //api tạo link nạp
        amount,
        description: topupForm.description.trim() || defaultTopupDescription,
      });
      setTopupPayment(payment);

      if (payment.qrCode) {
        setTopupQrDataUrl(
          await QRCode.toDataURL(payment.qrCode, {
            margin: 1,
            scale: 8,
            color: {
              dark: "#0f172a",
              light: "#ffffff",
            },
          }),
        );
      }

      setTopupNotice({
        tone: "info",
        title: "Đã tạo mã thanh toán. Quét QR hoặc mở link payOS dể nạp tiền.",
      });
    } catch (error) {
      setTopupNotice({
        tone: "danger",
        title: getApiErrorMessage(error),
      });
    } finally {
      setTopupLoading(false);
    }
  };

  const refreshSession = useCallback(async () => {
    const currentSession = getSession();
    if (!currentSession?.accessToken) return;

    const freshSession = currentSession.refreshToken
      ? await authApi.refresh(currentSession.refreshToken)
      : await authApi.me();
    saveSession({
      ...currentSession,
      ...freshSession,
      accessToken: freshSession.accessToken || currentSession.accessToken,
      refreshToken: freshSession.refreshToken || currentSession.refreshToken,
    });
  }, []);

  useEffect(() => {
    if (!session?.accessToken) return;
    let ignore = false;

    refreshSession()
      .then(() => {
        if (ignore) return;
      })
      .catch(() => undefined);

    return () => {
      ignore = true;
    };
  }, [location.pathname, refreshSession, session?.accessToken]);

  // Thay thế doạn useEffect cũ bằng doạn này:
  useEffect(() => {
    if (!session) return;
    const canOpenWhileVerifying = verificationAllowedPaths.some((path) =>
      location.pathname.startsWith(path),
    );
    if (needsVerification && !canOpenWhileVerifying) {
      navigate(verificationPath, { replace: true });
    }
  }, [
    location.pathname,
    navigate,
    needsVerification,
    session,
    verificationAllowedPaths,
    verificationPath,
  ]);

  const refreshNotifications = useCallback(async () => {
    setNotificationLoading(true);
    try {
      const [items, unread] = await Promise.all([
        notificationApi.list(),
        notificationApi.unreadCount(),
      ]);
      setNotifications(items);
      setUnreadCount(unread.unreadCount);
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setNotificationLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!session?.accessToken) return;

    void Promise.resolve().then(refreshNotifications);
    const stream = connectNotificationSocket({
      token: session.accessToken,
      onStatus: setRealtimeConnected,
      onNotification: (notification) => {
        setNotifications((items) => mergeNotification(items, notification));
        if (!notification.isRead) {
          setUnreadCount((count) => count + 1);
        }
        if (notification.type === "PROFILE_REVIEWED") {
          refreshSession().catch(() => undefined);
          notifyProfileReviewSync();
        }
      },
    });

    return () => {
      stream.close();
    };
  }, [refreshNotifications, refreshSession, session?.accessToken]);

  useEffect(() => {
    void Promise.resolve().then(() => setNotificationOpen(false));
  }, [location.pathname]);

  if (!session) return null;

  const isNavItemActive = (item: NavItem, isActive: boolean) =>
    isActive ||
    (session?.role === "EXPERT" &&
      item.to === "/app/opportunities" &&
      /^\/app\/jobs\/[^/]+\/proposal$/.test(location.pathname));

  const openNotificationPanel = () => {
    setNotificationOpen((open) => {
      const next = !open;
      if (next) refreshNotifications();
      return next;
    });
  };

  const openNotificationInCenter = async (notification: NotificationItem) => {
    if (!notification.isRead) {
      const readAt = new Date().toISOString();
      setNotifications((items) =>
        items.map((item) =>
          item.notificationId === notification.notificationId
            ? { ...item, isRead: true, readAt }
            : item,
        ),
      );
      setUnreadCount((count) => Math.max(0, count - 1));
      notificationApi
        .markRead(notification.notificationId)
        .catch(() => refreshNotifications());
    }
    setNotificationOpen(false);
    navigate(
      `/app/notifications?notificationId=${notification.notificationId}`,
    );
  };

  const markAllNotificationsRead = async () => {
    setNotifications((items) =>
      items.map((item) => ({ ...item, isRead: true })),
    );
    setUnreadCount(0);
    notificationApi
      .markAllRead()
      .then(setNotifications)
      .catch(() => refreshNotifications());
  };

  const renderNotificationIcon = (notification: NotificationItem) => {
    const tone = notificationTone(notification);
    if (tone === "success") return <CheckCircle2 className="h-4 w-4" />;
    if (tone === "warning") return <Clock3 className="h-4 w-4" />;
    return <Bell className="h-4 w-4" />;
  };

  const activePackageTier = resolveActivePackageTier(quota);
  const activePackage = packageConfig[activePackageTier];
  const activePackageName = quota?.activePackageName || activePackageTier;

  return (
    <div className="relative min-h-screen bg-[#f7faff] text-ink">
      <div className="pointer-events-none fixed inset-0 z-0 opacity-10 [background-image:radial-gradient(#df0e84_1px,transparent_1px)] [background-size:32px_32px]" />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden border-r border-slate-100 bg-white transition-all duration-300 lg:flex lg:flex-col",
          sidebarCollapsed ? "w-24" : "w-64",
        )}
      >
        <button
          type="button"
          aria-label={
            sidebarCollapsed
              ? "Mở rộng thanh diều hướng"
              : "Thu gọn thanh diều hướng"
          }
          title={sidebarCollapsed ? "Mở rộng" : "Thu gọn"}
          onClick={() => setSidebarCollapsed((value) => !value)}
          className="absolute -right-3 top-24 z-10 grid h-7 w-7 place-items-center rounded-full border border-brand-100 bg-white text-brand-600 shadow-card transition hover:-translate-y-0.5 hover:bg-brand-50"
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>

        <div
          className={cn(
            "flex h-20 items-center px-5",
            sidebarCollapsed && "justify-center px-0",
          )}
        >
          <Logo compact={sidebarCollapsed} />
        </div>
        <div className={cn("px-4", sidebarCollapsed && "hidden")}>
          <div className="rounded-2xl bg-gradient-to-br from-brand-50 to-indigo-50 p-3 ring-1 ring-brand-100">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-brand-500">
              Không gian làm việc
            </p>
            <p className="mt-1 text-sm font-extrabold text-ink">
              {roleLabel(session?.role || "BUSINESS")}
            </p>
            {needsVerification && (
              <p className="mt-1 text-xs font-bold text-amber-700">
                Status: {accountStatus}
              </p>
            )}
          </div>
        </div>
        <nav
          className={cn(
            "mt-5 flex-1 space-y-1 overflow-y-auto px-3 pb-4",
            sidebarCollapsed && "px-3",
          )}
        >
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/app"}
              title={sidebarCollapsed ? item.label : undefined}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all",
                  sidebarCollapsed && "justify-center px-0",
                  isNavItemActive(item, isActive)
                    ? "bg-brand-50 text-brand-700 shadow-sm"
                    : "text-slate-500 hover:bg-slate-50 hover:text-ink",
                )
              }
            >
              <span className="shrink-0">{item.icon}</span>
              {!sidebarCollapsed && (
                <span className="truncate">{item.label}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-100 p-3">
          <button
            type="button"
            onClick={logout}
            title={sidebarCollapsed ? "Đăng xuất" : undefined}
            className={cn(
              "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-rose-50 hover:text-rose-600",
              sidebarCollapsed && "justify-center px-0",
            )}
          >
            <LogOut className="h-4 w-4" />
            {!sidebarCollapsed && "Đăng xuất"}
          </button>
        </div>
      </aside>

      <div
        className={cn(
          "transition-[padding] duration-300",
          sidebarCollapsed ? "lg:pl-24" : "lg:pl-64",
        )}
      >
        <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/85 backdrop-blur-xl">
          <div className="flex h-20 items-center gap-3 px-4 md:px-6">
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-50 text-slate-600 lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="relative hidden max-w-md flex-1 md:block">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                placeholder="Tìm dự án, hợp đồng, chuyên gia..."
                className="h-11 w-full rounded-2xl border border-slate-100 bg-slate-50 pl-10 pr-4 text-sm outline-none transition focus:border-brand-200 focus:bg-white focus:ring-4 focus:ring-brand-50"
              />
            </div>
            <div className="ml-auto flex items-center gap-2">
              {(session?.role === "BUSINESS" || session?.role === "EXPERT") &&
                quota && (
                  <Badge
                    tone={activePackage.tone}
                    className="hidden sm:inline-flex text-sm px-3 py-1.5"
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        activePackage.dotClass,
                      )}
                    />
                    {activePackageName}
                  </Badge>
                )}
              <div className="relative">
                <button
                  type="button"
                  aria-label="Thông báo"
                  onClick={openNotificationPanel}
                  className={cn(
                    "relative grid h-10 w-10 place-items-center rounded-2xl bg-slate-50 text-slate-500 transition hover:bg-brand-50 hover:text-brand-600",
                    notificationOpen && "bg-brand-50 text-brand-600",
                  )}
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-coral-500 px-1 text-[10px] font-black text-white ring-2 ring-white">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>
                {notificationOpen && (
                  <div className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-soft">
                    <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                      <div>
                        <p className="text-sm font-extrabold text-ink">
                          Thông báo
                        </p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              realtimeConnected
                                ? "bg-mint-500"
                                : "bg-slate-300",
                            )}
                          />
                          {realtimeConnected
                            ? "Realtime đang bật"
                            : "Đang kết nối realtime"}
                        </p>
                      </div>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={markAllNotificationsRead}
                          className="text-xs font-bold text-brand-600 hover:text-brand-700"
                        >
                          Đọc tất cả
                        </button>
                      )}
                    </div>
                    <div className="max-h-96 overflow-y-auto p-2">
                      {notificationLoading && notifications.length === 0 ? (
                        <div className="px-3 py-8 text-center text-sm font-semibold text-slate-400">
                          Đang tải thông báo...
                        </div>
                      ) : notifications.length === 0 ? (
                        <div className="px-3 py-8 text-center text-sm font-semibold text-slate-400">
                          Chưa có thông báo nào.
                        </div>
                      ) : (
                        notifications.slice(0, 5).map((notification) => (
                          <button
                            key={notification.notificationId}
                            type="button"
                            onClick={() =>
                              openNotificationInCenter(notification)
                            }
                            className="flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-slate-50"
                          >
                            <span
                              className={cn(
                                "mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-2xl",
                                notification.isRead
                                  ? "bg-slate-50 text-slate-400"
                                  : "bg-brand-50 text-brand-600",
                              )}
                            >
                              {renderNotificationIcon(notification)}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-start gap-2">
                                <span className="line-clamp-1 flex-1 text-sm font-extrabold text-ink">
                                  {notification.title}
                                </span>
                                {!notification.isRead && (
                                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-coral-500" />
                                )}
                              </span>
                              <span className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                                {notification.message}
                              </span>
                              <span className="mt-1 block text-[11px] font-bold text-slate-400">
                                {formatNotificationTime(notification.createdAt)}
                              </span>
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                    <div className="border-t border-slate-100 p-2">
                      <button
                        type="button"
                        onClick={() => navigate("/app/notifications")}
                        className="flex h-10 w-full items-center justify-center rounded-2xl text-sm font-extrabold text-brand-600 transition hover:bg-brand-50"
                      >
                        Xem tất cả thông báo
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="relative">
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-2xl p-1.5 transition hover:bg-slate-50"
                  onClick={() => setRoleOpen((value) => !value)}
                >
                  <Avatar name={session?.fullName} />
                  <div className="hidden text-left xl:block">
                    <div className="flex items-center gap-1">
                      <p className="max-w-36 truncate text-sm font-extrabold text-ink">
                        {session?.fullName}
                      </p>
                      {hasActiveMembership(quota) && (
                        <BadgeCheck className="h-4 w-4 shrink-0 text-green-500" />
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      {roleLabel(session?.role || "BUSINESS")}
                    </p>
                  </div>
                  <ChevronDown className="hidden h-4 w-4 text-slate-400 xl:block" />
                </button>
                {roleOpen && (
                  <div className="absolute right-0 top-14 w-80 rounded-3xl border border-slate-100 bg-white p-2 shadow-soft">
                    <p className="px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
                      Tài khoản hiện tại
                    </p>
                    <div className="rounded-2xl bg-brand-50 px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-extrabold text-brand-700">
                          {session?.fullName ||
                            roleLabel(session?.role || "BUSINESS")}
                        </p>
                        {hasActiveMembership(quota) && (
                          <>
                            <BadgeCheck className="h-4 w-4 shrink-0 text-green-500" />
                            {quota?.badgeExpiredAt && (
                              <span className="text-[10px] font-bold text-green-600">
                                {getBadgeRemainingDays(quota.badgeExpiredAt)}{" "}
                                ngày
                              </span>
                            )}
                          </>
                        )}
                      </div>
                      <p className="mt-1 text-xs font-semibold text-brand-600/80">
                        {roleLabel(session?.role || "BUSINESS")}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {session?.email}
                      </p>
                    </div>
                    {session?.role !== "STAFF" && (
                      <div className="mt-2 rounded-2xl border border-slate-100 bg-white px-3 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-400">
                            Số dư
                          </p>
                          <button
                            type="button"
                            onClick={loadWallet}
                            className="text-xs font-bold text-brand-600 hover:text-brand-700"
                          >
                            {walletLoading ? "Đang tải..." : "Làm mới"}
                          </button>
                        </div>
                        <div className="mt-3 grid gap-2 grid-cols-1">
                          <div className="rounded-2xl bg-slate-50 p-3">
                            <p className="text-[11px] font-bold text-slate-400">
                              {session?.role === "ADMIN"
                                ? "Tổng doanh thu"
                                : "Khả dụng"}
                            </p>
                            <p className="mt-1 truncate text-sm font-black text-ink">
                              {wallet
                                ? formatCurrency(wallet.availableBalance)
                                : "--"}
                            </p>
                          </div>
                        </div>

                        {session?.role !== "ADMIN" && quota && (
                          <div className="mt-3 space-y-2 rounded-2xl bg-slate-50 p-3">
                            {session?.role !== "EXPERT" && (
                              <div className="flex items-center justify-between">
                                <p className="text-[11px] font-bold text-slate-400">
                                  Lượt đăng Job
                                </p>
                                <p className="text-sm font-black text-ink">
                                  {quota.jobPostQuotaBalance ?? 0}
                                </p>
                              </div>
                            )}
                            {session?.role !== "BUSINESS" && (
                              <div className="flex items-center justify-between">
                                <p className="text-[11px] font-bold text-slate-400">
                                  Lượt nộp Proposal
                                </p>
                                <p className="text-sm font-black text-ink">
                                  {quota.proposalQuotaBalance ?? 0}
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {session?.role !== "ADMIN" && (
                          <Button
                            type="button"
                            size="sm"
                            className="mt-3 w-full"
                            onClick={() => openTopup()}
                          >
                            <Plus className="h-4 w-4" />
                            Nạp tiền
                          </Button>
                        )}
                      </div>
                    )}
                    <div className="my-2 border-t border-slate-100" />
                    <button
                      type="button"
                      onClick={logout}
                      className="flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                    >
                      <LogOut className="h-4 w-4" />
                      Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
        <main className="px-4 py-6 md:px-6 md:py-8">
          <div className="mx-auto max-w-[1440px]">
            {showBackButton && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mb-5"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="h-4 w-4" />
                Quay lại
              </Button>
            )}
            {needsVerification && (
              <div className="mb-5 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                Tài khoản đang ở trạng thái {accountStatus}. Hãy hoàn thiện hồ
                sơ xác minh và đợi nhân viên duyệt để mở khóa chức năng
              </div>
            )}
            <Outlet />
          </div>
        </main>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Đóng menu"
            className="absolute inset-0 bg-ink/25 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-72 bg-white p-4 shadow-soft">
            <div className="flex items-center justify-between">
              <Logo />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <nav className="mt-6 space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/app"}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold",
                      isNavItemActive(item, isActive)
                        ? "bg-brand-50 text-brand-700"
                        : "text-slate-500",
                    )
                  }
                >
                  {item.icon}
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      )}
      <Modal
        open={topupOpen}
        onClose={() => !topupLoading && setTopupOpen(false)}
        title="Nạp tiền vào ví"
        description="Nhập số tiền cần nạp, tạo QR payOS rồi quét chuyển khoản hoặc mở link thanh toán."
        size="lg"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setTopupOpen(false)}
              disabled={topupLoading}
            >
              Hủy
            </Button>

            <Button
              type="submit"
              form="wallet-topup-form"
              loading={topupLoading}
            >
              {topupPayment ? "Tạo lại QR" : "Tạo QR thanh toán"}
            </Button>
          </>
        }
      >
        <form
          id="wallet-topup-form"
          className="grid gap-4"
          onSubmit={submitTopup}
        >
          <div className="rounded-2xl bg-gradient-to-br from-brand-50 to-indigo-50 p-4 ring-1 ring-brand-100">
            <div>
              <p className="text-xs font-bold text-brand-700 uppercase tracking-wide">
                Số dư khả dụng
              </p>
              <p className="mt-1 text-lg font-black text-brand-700">
                {wallet ? formatCurrency(wallet.availableBalance) : "--"}
              </p>
            </div>
          </div>
          <Field label="Số tiền nạp" hint="Yêu cầu số tiền ít nhất 2.000 VNĐ.">
            <Input
              type="text"
              value={
                topupForm.amount
                  ? Number(topupForm.amount).toLocaleString("vi-VN")
                  : ""
              }
              onChange={(event) => {
                setTopupPayment(null);
                setTopupQrDataUrl("");
                const rawValue = event.target.value.replace(/\D/g, "");
                setTopupForm((value) => ({
                  ...value,
                  amount: rawValue,
                }));
              }}
              placeholder="Ví dụ: 500.000"
              required
            />
          </Field>
          <Field label="Nội dung chuyển khoản">
            <Input
              value={topupForm.description}
              onChange={(event) => {
                setTopupPayment(null);
                setTopupQrDataUrl("");
                setTopupForm((value) => ({
                  ...value,
                  description: event.target.value,
                }));
              }}
              maxLength={25}
              placeholder={defaultTopupDescription}
              required
            />
          </Field>
          {topupPayment && (
            <div
              ref={topupQrBoxRef}
              className="rounded-3xl border border-brand-100 bg-brand-50/60 p-5"
            >
              <div className="grid gap-5 md:grid-cols-[260px_1fr] md:items-center">
                <div className="rounded-2xl bg-white p-3 shadow-sm">
                  {topupQrDataUrl ? (
                    <img
                      src={topupQrDataUrl}
                      alt={`QR thanh toán payOS dơn ${topupPayment.orderCode}`}
                      className="h-auto w-full rounded-xl"
                    />
                  ) : (
                    <div className="grid aspect-square place-items-center rounded-xl bg-slate-50 text-center text-sm font-semibold text-slate-500">
                      Chưa có QR
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-500">
                      Quét QR dể nạp ví
                    </p>
                    <p className="mt-1 text-2xl font-black text-ink">
                      {formatCurrency(topupPayment.amount)}
                    </p>
                  </div>
                  <div className="grid gap-2 text-sm">
                    <PaymentFact
                      label="Mã dơn"
                      value={`#${topupPayment.orderCode}`}
                    />
                    <PaymentFact
                      label="Trạng thái"
                      value={topupPayment.status}
                    />
                    <PaymentFact
                      label="Nội dung"
                      value={topupForm.description}
                    />
                    {topupPayment.accountName && (
                      <PaymentFact
                        label="Chủ tài khoản"
                        value={topupPayment.accountName}
                      />
                    )}
                    {topupPayment.accountNumber && (
                      <PaymentFact
                        label="Số tài khoản"
                        value={topupPayment.accountNumber}
                      />
                    )}
                  </div>
                  {topupPayment.checkoutUrl && (
                    <a
                      href={topupPayment.checkoutUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center rounded-2xl border border-brand-100 bg-white px-4 py-2 text-sm font-bold text-brand-700 shadow-sm transition hover:bg-brand-50"
                    >
                      Mở trang payOS
                    </a>
                  )}
                  <p className="text-xs leading-5 text-slate-500">
                    Sau khi thanh toán, hệ thống sẽ tự đồng bộ trạng thái với
                    payOS và cập nhật số dư ví.
                  </p>
                </div>
              </div>
            </div>
          )}
          {topupNotice && (
            <Notice tone={topupNotice.tone} title={topupNotice.title} />
          )}
        </form>
      </Modal>
      <ChatBox />
    </div>
  );
}

function PaymentFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 rounded-2xl bg-white px-3 py-2 sm:grid-cols-[120px_1fr] sm:items-center">
      <span className="text-xs font-bold text-slate-400">{label}</span>
      <span className="break-words text-sm font-extrabold text-ink">
        {value}
      </span>
    </div>
  );
}

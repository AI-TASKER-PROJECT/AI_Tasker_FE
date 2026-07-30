import { ArrowLeft, ChevronDown, LogOut, Menu, X, Plus } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { getPublicStartPath, getWorkspacePath } from "../../lib/roleExperience";
import {
  clearSession,
  roleLabel,
  useSession,
} from "../../context/sessionContext";
import { cn, formatCurrency } from "../../lib/utils";
import { Logo } from "../../components/Logo";
import { Avatar, Button, LinkButton } from "../../components/ui";
import { walletApi, userQuotaApi } from "../../services";
import type { SystemWallet, UserQuota } from "../../types";

const nav = [
  { label: "Trang chủ", to: "/home" },
  { label: "Doanh nghiệp", to: "/business" },
  { label: "Chuyên gia", to: "/experts" },
  { label: "Về AITASKER", to: "/about" },
];

export function PublicShell() {
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const session = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const startPath = getPublicStartPath(session);
  const workspacePath = getWorkspacePath(session);

  const [wallet, setWallet] = useState<SystemWallet | null>(null);
  const [quota, setQuota] = useState<UserQuota | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);

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
    if (!accountOpen) return;
    void Promise.resolve().then(loadWallet);
  }, [loadWallet, accountOpen]);
  const publicNav = nav;
  const showBackButton = !["/", "/home", "/business", "/experts"].includes(
    location.pathname,
  );
  const logout = () => {
    clearSession();
    setAccountOpen(false);
    setOpen(false);
    navigate("/");
  };

  return (
    <div className="relative min-h-screen bg-[#fff8f8] pt-14 text-ink">
      <div className="pointer-events-none fixed inset-0 z-0 opacity-10 [background-image:radial-gradient(#df0e84_1px,transparent_1px)] [background-size:32px_32px]" />
      <header className="fixed inset-x-0 top-0 z-40 border-b border-[#f0dbe4]/80 bg-[#fff8f8]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 py-2 md:px-6">
          <Logo />
          <nav className="hidden items-center gap-5 md:flex">
            {publicNav.map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "rounded-lg px-2 py-2 text-sm font-medium transition",
                    isActive
                      ? "text-[#b30069]"
                      : "text-[#594048] hover:text-[#b30069]",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            {session ? (
              <>
                <LinkButton
                  to={startPath}
                  className="h-10 rounded-lg bg-[#b30069] px-4 text-sm font-semibold shadow-sm hover:bg-[#b8006c]"
                >
                  Vào không gian làm việc
                </LinkButton>
                <div className="relative">
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-2xl px-1.5 py-1 transition hover:bg-[#fff0f3]"
                    onClick={() => setAccountOpen((value) => !value)}
                  >
                    <Avatar name={session.fullName} size="lg" />
                    <div className="min-w-0 text-left">
                      <p className="max-w-32 truncate text-sm font-extrabold text-ink">
                        {session.fullName}
                      </p>
                      <p className="text-xs font-medium text-slate-400">
                        {roleLabel(session.role)}
                      </p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  </button>
                  {accountOpen && (
                    <div className="absolute right-0 top-14 w-64 rounded-3xl border border-[#f0dbe4] bg-white p-2 shadow-soft">
                      <div className="rounded-2xl bg-[#fde8f3] px-3 py-2.5">
                        <p className="truncate text-sm font-extrabold text-[#b8006c]">
                          {session.fullName}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-[#b8006c]/80">
                          {roleLabel(session.role)}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {session.email}
                        </p>
                      </div>
                      <div className="my-2 border-t border-slate-100" />
                      
                      {session?.role !== "STAFF" && (
                        <div className="mt-2 rounded-2xl border border-slate-100 bg-white px-3 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-400">
                              Số dư
                            </p>
                            <button
                              type="button"
                              onClick={loadWallet}
                              className="text-xs font-bold text-[#b8006c] hover:text-[#8a0050]"
                            >
                              {walletLoading ? "Đang tải..." : "Làm mới"}
                            </button>
                          </div>
                          <div className="mt-3 grid gap-2 grid-cols-1">
                            <div className="rounded-2xl bg-[#fff8fb] p-3">
                              <p className="text-[11px] font-bold text-slate-400">
                                {session?.role === "ADMIN" ? "Tổng doanh thu" : "Khả dụng"}
                              </p>
                              <p className="mt-1 truncate text-sm font-black text-ink">
                                {wallet
                                  ? formatCurrency(
                                      session?.role === "ADMIN"
                                        ? wallet.totalRevenue
                                        : wallet.availableBalance,
                                    )
                                  : "--"}
                              </p>
                            </div>
                          </div>

                          {session?.role !== "ADMIN" && quota && (
                            <div className="mt-3 space-y-2 rounded-2xl bg-[#fff8fb] p-3">
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
                                    Lượt nộp bản đề xuất
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
                              className="mt-3 w-full bg-[#b30069] text-white hover:bg-[#b8006c]"
                              onClick={() => {
                                setAccountOpen(false);
                                navigate("/app/wallet");
                              }}
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
              </>
            ) : (
              <>
                <LinkButton
                  to="/login"
                  variant="secondary"
                  className="h-10 rounded-lg border-[#b30069] px-4 text-sm font-semibold text-[#b30069] shadow-none hover:bg-[#fff0f3]"
                >
                  Đăng nhập
                </LinkButton>
                <LinkButton
                  to="/register"
                  className="h-10 rounded-lg bg-[#b30069] px-4 text-sm font-semibold shadow-sm hover:bg-[#b8006c]"
                >
                  Bắt đầu dự án
                </LinkButton>
              </>
            )}
          </div>
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-lg bg-[#fff0f3] text-slate-600 md:hidden"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {open && (
          <div className="border-t border-[#f0dbe4] bg-[#fff8f8] px-4 py-4 md:hidden">
            <div className="grid gap-1">
              {publicNav.map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-[#594048] hover:bg-[#fff0f3]"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              {session ? (
                <div className="mt-3 grid gap-2">
                  <Link
                    to={startPath}
                    className="inline-flex h-11 items-center justify-center rounded-lg bg-[#b30069] px-4 text-sm font-semibold text-white shadow-sm"
                    onClick={() => setOpen(false)}
                  >
                    Vào không gian làm việc
                  </Link>
                  <Link
                    to={workspacePath}
                    className="flex items-center gap-3 rounded-2xl border border-[#f0dbe4] bg-[#fff8fb] p-3"
                    onClick={() => setOpen(false)}
                  >
                    <Avatar name={session.fullName} size="lg" />
                    <div className="min-w-0 text-left">
                      <p className="truncate text-sm font-extrabold text-ink">
                        {session.fullName}
                      </p>
                      <p className="mt-0.5 text-xs font-semibold text-slate-600">
                        {roleLabel(session.role)}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {session.email}
                      </p>
                    </div>
                    <ChevronDown className="ml-auto h-4 w-4 text-slate-400" />
                  </Link>
                  <button
                    type="button"
                    className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-rose-50 text-sm font-semibold text-rose-600"
                    onClick={logout}
                  >
                    <LogOut className="h-4 w-4" />
                    Đăng xuất
                  </button>
                </div>
              ) : (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <LinkButton
                    to="/login"
                    variant="secondary"
                    className="rounded-lg border-[#b30069] text-[#b30069] hover:bg-[#fff0f3]"
                  >
                    Đăng nhập
                  </LinkButton>
                  <LinkButton
                    to="/register"
                    className="rounded-lg bg-[#b30069] shadow-sm hover:bg-[#b8006c]"
                  >
                    Bắt đầu dự án
                  </LinkButton>
                </div>
              )}
            </div>
          </div>
        )}
      </header>
      {showBackButton && (
        <div className="mx-auto max-w-7xl px-4 pt-5 md:px-6">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </Button>
        </div>
      )}
      <Outlet />
      <footer id="about" className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:px-6">
          <div>
            <Logo className="opacity-80" />
            <p className="mt-4 max-w-xs text-sm leading-7 text-[#594048]">
              © 2026 AITASKER. Nền tảng kết nối AI hàng đầu.
            </p>

            <div className="mt-4 flex items-center gap-4 text-[#594048]">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-current text-[10px]">
                G
              </span>
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-sm border border-current text-[10px]">
                M
              </span>
            </div>
          </div>

          <FooterColumn
            title="Về chúng tôi"
            links={[{ label: "Về chúng tôi" }, { label: "Liên hệ" }]}
          />

          <FooterColumn
            title="Hỗ trợ"
            links={[
              { label: "Câu hỏi thường gặp" },
              { label: "Hướng dẫn sử dụng" },
            ]}
          />

          <FooterColumn
            title="Pháp lý"
            links={[
              { label: "Điều khoản sử dụng" },
              { label: "Chính sách bảo mật" },
            ]}
          />
        </div>
      </footer>
    </div>
  );
}

type FooterColumnProps = {
  title: string;
  links: {
    label: string;
  }[];
};

function FooterColumn({ title, links }: FooterColumnProps) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-[#3f2a32]">{title}</h3>

      <div className="mt-4 space-y-3">
        {links.map((item) => (
          <p key={item.label} className="text-sm text-[#594048]">
            {item.label}
          </p>
        ))}
      </div>
    </div>
  );
}

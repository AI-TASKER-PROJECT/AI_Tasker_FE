import { ChevronDown, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Logo } from "../../components/Logo";
import { Avatar, LinkButton } from "../../components/ui";
import {
  clearSession,
  roleLabel,
  useSession,
} from "../../context/sessionContext";
import { getPublicStartPath, getWorkspacePath } from "../../lib/roleExperience";
import { cn } from "../../lib/utils";

const nav = [
  { label: "Trang chủ", to: "/home" },
  { label: "Doanh nghiệp", to: "/jobs" },
  { label: "Chuyên gia", to: "/experts" },
  { label: "Về AITASKER", to: "/about" },
];

export function PublicShell() {
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const session = useSession();
  const navigate = useNavigate();
  const startPath = getPublicStartPath(session);
  const workspacePath = getWorkspacePath(session);
  const publicNav = nav;

  const logout = () => {
    clearSession();
    setAccountOpen(false);
    setOpen(false);
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-[#fff8f8] text-ink">
      <header className="sticky top-0 z-40 border-b border-[#f0dbe4]/80 bg-[#fff8f8]/95 backdrop-blur-xl">
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
                        <p className="mt-1 text-xs text-slate-500">
                          {roleLabel(session.role)}
                        </p>
                      </div>
                      <div className="my-2 border-t border-slate-100" />
                      <Link
                        to={workspacePath}
                        className="block rounded-2xl px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-[#faf3f8] hover:text-ink"
                        onClick={() => setAccountOpen(false)}
                      >
                        Vào không gian làm việc
                      </Link>
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
                  Bắt dầu dự án
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
                      <p className="text-xs font-medium text-slate-400">
                        {roleLabel(session.role)}
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
                    Bắt dầu dự án
                  </LinkButton>
                </div>
              )}
            </div>
          </div>
        )}
      </header>
      <Outlet />
      <footer id="about" className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:px-6">
          <div>
            <Logo className="opacity-80" />
            <p className="mt-4 max-w-xs text-sm leading-7 text-[#594048]">
              © 2026 AITASKER. Nền tảng kết nối AI hàng dầu.
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
            links={[
              { label: "Về chúng tôi", to: "/about" },
              { label: "Liên hệ" },
            ]}
          />
          <FooterColumn
            title="Hỗ trợ"
            links={[
              { label: "Câu hỏi thường gặp" },
              { label: "Hướng dẫn sử dụng", to: "/how-it-works" },
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

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: Array<{ label: string; to?: string }>;
}) {
  return (
    <div>
      <h3 className="mb-4 text-sm font-extrabold uppercase tracking-wider text-ink">
        {title}
      </h3>
      <div className="grid gap-3">
        {links.map((link) =>
          link.to ? (
            <Link
              key={link.label}
              to={link.to}
              className="text-sm text-[#594048] underline opacity-80 transition-opacity hover:text-[#0059bb] hover:opacity-100"
            >
              {link.label}
            </Link>
          ) : (
            <span
              key={link.label}
              className="text-sm text-[#594048] underline opacity-80"
            >
              {link.label}
            </span>
          ),
        )}
      </div>
    </div>
  );
}

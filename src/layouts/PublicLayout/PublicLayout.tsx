import { ChevronDown, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { getPublicStartPath, getWorkspacePath } from '../../lib/roleExperience';
import { clearSession, roleLabel, useSession } from '../../context/sessionContext';
import { cn } from '../../lib/utils';
import { Logo } from '../../components/Logo';
import { Avatar, LinkButton } from '../../components/ui';

const nav = [
  { label: 'Cơ hội dự án', to: '/jobs' },
  { label: 'Chuyên gia AI', to: '/experts' },
  { label: 'Quy trình', to: '/#how-it-works' },
  { label: 'Về AITASKER', to: '/#about' },
];

export function PublicShell() {
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const session = useSession();
  const navigate = useNavigate();
  const startPath = getPublicStartPath(session);
  const workspacePath = getWorkspacePath(session);
  const publicNav = nav.filter((item) => {
    if (session?.role === 'EXPERT') return item.to !== '/experts';
    if (session?.role === 'BUSINESS') return item.to !== '/jobs';
    return true;
  });

  const logout = () => {
    clearSession();
    setAccountOpen(false);
    setOpen(false);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#fbfdff] text-ink">
      <header className="sticky top-0 z-40 border-b border-white/80 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 py-3 md:px-6">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            {publicNav.map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'rounded-xl px-3 py-2 text-sm font-semibold transition',
                    isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-ink',
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
                <LinkButton to={startPath}>Bắt đầu ngay</LinkButton>
                <div className="relative">
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-2xl px-1.5 py-1 transition hover:bg-slate-50"
                    onClick={() => setAccountOpen((value) => !value)}
                  >
                    <Avatar name={session.fullName} size="lg" />
                    <div className="min-w-0 text-left">
                      <p className="max-w-32 truncate text-sm font-extrabold text-ink">{session.fullName}</p>
                      <p className="text-xs font-medium text-slate-400">{roleLabel(session.role)}</p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  </button>
                  {accountOpen && (
                    <div className="absolute right-0 top-14 w-64 rounded-3xl border border-slate-100 bg-white p-2 shadow-soft">
                      <div className="rounded-2xl bg-brand-50 px-3 py-2.5">
                        <p className="truncate text-sm font-extrabold text-brand-700">{session.fullName}</p>
                        <p className="mt-1 text-xs text-slate-500">{roleLabel(session.role)}</p>
                      </div>
                      <div className="my-2 border-t border-slate-100" />
                      <Link
                        to={workspacePath}
                        className="block rounded-2xl px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-ink"
                        onClick={() => setAccountOpen(false)}
                      >
                        Vào workspace
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
                <LinkButton to="/login" variant="ghost">
                  Đăng nhập
                </LinkButton>
                <LinkButton to="/register">Bắt đầu ngay</LinkButton>
              </>
            )}
          </div>
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-50 text-slate-600 md:hidden"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {open && (
          <div className="border-t border-slate-100 bg-white px-4 py-4 md:hidden">
            <div className="grid gap-1">
              {publicNav.map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              {session ? (
                <div className="mt-3 grid gap-2">
                  <Link
                    to={startPath}
                    className="inline-flex h-11 items-center justify-center rounded-2xl bg-brand-600 px-4 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(23,103,242,.22)]"
                    onClick={() => setOpen(false)}
                  >
                    Bắt đầu ngay
                  </Link>
                  <Link
                    to={workspacePath}
                    className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3"
                    onClick={() => setOpen(false)}
                  >
                    <Avatar name={session.fullName} size="lg" />
                    <div className="min-w-0 text-left">
                      <p className="truncate text-sm font-extrabold text-ink">{session.fullName}</p>
                      <p className="text-xs font-medium text-slate-400">{roleLabel(session.role)}</p>
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
                  <LinkButton to="/login" variant="secondary">
                    Đăng nhập
                  </LinkButton>
                  <LinkButton to="/register">Đăng ký</LinkButton>
                </div>
              )}
            </div>
          </div>
        )}
      </header>
      <Outlet />
      <footer className="border-t border-slate-100 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:px-6">
          <div>
            <Logo />
            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-500">
              Nền tảng kết nối doanh nghiệp với chuyên gia AI, quản lý hợp đồng, nghiệm thu và dòng tiền minh bạch.
            </p>
          </div>
          <FooterColumn title="Nền tảng" links={['Cơ hội dự án', 'Chuyên gia AI', 'Quy trình làm việc']} />
          <FooterColumn title="Hỗ trợ" links={['Trung tâm trợ giúp', 'Điều khoản sử dụng', 'Chính sách bảo mật']} />
          <FooterColumn title="Liên hệ" links={['hello@aitasker.vn', 'TP. Hồ Chí Minh', 'Thứ 2 - Thứ 6']} />
        </div>
        <div className="border-t border-slate-100 py-4 text-center text-xs text-slate-400">
          © 2026 AITASKER. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

function FooterColumn({ title, links }: { title: string; links: string[] }) {
  return (
    <div>
      <h3 className="text-sm font-extrabold text-ink">{title}</h3>
      <div className="mt-3 grid gap-2">
        {links.map((link) => (
          <span key={link} className="text-sm text-slate-500">
            {link}
          </span>
        ))}
      </div>
    </div>
  );
}

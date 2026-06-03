import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  Building2,
  ChevronDown,
  ClipboardCheck,
  FileCheck2,
  FileText,
  Gavel,
  LayoutDashboard,
  LogOut,
  Menu,
  ReceiptText,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  WalletCards,
  X,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import type { Role } from '../types';
import { clearSession, createDemoSession, roleLabel, useSession } from '../lib/session';
import { cn } from '../lib/utils';
import { Logo } from './Logo';
import { Avatar, Badge, Button } from './ui';

type NavItem = { label: string; to: string; icon: ReactNode };

const commonNav: NavItem[] = [
  { label: 'Tổng quan', to: '/app', icon: <LayoutDashboard className="h-4 w-4" /> },
];

const roleNav: Record<Role, NavItem[]> = {
  BUSINESS: [
    { label: 'Dự án của tôi', to: '/app/jobs', icon: <BriefcaseBusiness className="h-4 w-4" /> },
    { label: 'Hợp đồng', to: '/app/contracts', icon: <FileCheck2 className="h-4 w-4" /> },
    { label: 'Tài chính', to: '/app/finance', icon: <WalletCards className="h-4 w-4" /> },
    { label: 'Tranh chấp', to: '/app/disputes', icon: <Gavel className="h-4 w-4" /> },
    { label: 'Đánh giá', to: '/app/reviews', icon: <Star className="h-4 w-4" /> },
    { label: 'Hồ sơ KYB', to: '/app/business/profile', icon: <Building2 className="h-4 w-4" /> },
  ],
  EXPERT: [
    { label: 'Cơ hội dự án', to: '/app/opportunities', icon: <Sparkles className="h-4 w-4" /> },
    { label: 'Proposal của tôi', to: '/app/proposals', icon: <FileText className="h-4 w-4" /> },
    { label: 'Hợp đồng', to: '/app/contracts', icon: <FileCheck2 className="h-4 w-4" /> },
    { label: 'Tài chính', to: '/app/finance', icon: <WalletCards className="h-4 w-4" /> },
    { label: 'Tranh chấp', to: '/app/disputes', icon: <Gavel className="h-4 w-4" /> },
    { label: 'Portfolio AI', to: '/app/expert/portfolio', icon: <ClipboardCheck className="h-4 w-4" /> },
  ],
  STAFF: [
    { label: 'Duyệt hồ sơ', to: '/app/verifications', icon: <ShieldCheck className="h-4 w-4" /> },
    { label: 'Ticket được giao', to: '/app/tickets', icon: <Gavel className="h-4 w-4" /> },
    { label: 'Analytics', to: '/app/admin/analytics', icon: <BarChart3 className="h-4 w-4" /> },
    { label: 'System Settings', to: '/app/admin/settings', icon: <Settings2 className="h-4 w-4" /> },
  ],
  ADMIN: [
    { label: 'Analytics', to: '/app/admin/analytics', icon: <BarChart3 className="h-4 w-4" /> },
    { label: 'Duyệt hồ sơ', to: '/app/verifications', icon: <ShieldCheck className="h-4 w-4" /> },
    { label: 'Tranh chấp', to: '/app/tickets', icon: <Gavel className="h-4 w-4" /> },
    { label: 'Quản lý Staff', to: '/app/admin/staff', icon: <Users className="h-4 w-4" /> },
    { label: 'Master Data', to: '/app/admin/master-data', icon: <BriefcaseBusiness className="h-4 w-4" /> },
    { label: 'Audit Logs', to: '/app/admin/audit-logs', icon: <ReceiptText className="h-4 w-4" /> },
    { label: 'Báo cáo', to: '/app/admin/reports', icon: <FileText className="h-4 w-4" /> },
    { label: 'System Settings', to: '/app/admin/settings', icon: <Settings2 className="h-4 w-4" /> },
  ],
};

export function AppShell() {
  const session = useSession();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [dataMode, setDataMode] = useState(localStorage.getItem('aitasker.data-mode') || 'demo');

  useEffect(() => {
    const sync = () => setDataMode(localStorage.getItem('aitasker.data-mode') || 'demo');
    window.addEventListener('aitasker:data-mode-change', sync);
    return () => window.removeEventListener('aitasker:data-mode-change', sync);
  }, []);

  if (!session) return null;
  const navItems = [...commonNav, ...roleNav[session.role]];

  const switchRole = (role: Role) => {
    createDemoSession(role);
    setRoleOpen(false);
    navigate('/app');
  };

  const logout = () => {
    clearSession();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#f7faff] text-ink">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-slate-100 bg-white lg:flex lg:flex-col">
        <div className="flex h-20 items-center px-5">
          <Logo />
        </div>
        <div className="px-4">
          <div className="rounded-2xl bg-gradient-to-br from-brand-50 to-indigo-50 p-3 ring-1 ring-brand-100">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-brand-500">
              Không gian làm việc
            </p>
            <p className="mt-1 text-sm font-extrabold text-ink">{roleLabel(session.role)}</p>
          </div>
        </div>
        <nav className="mt-5 flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/app'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all',
                  isActive
                    ? 'bg-brand-50 text-brand-700 shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-ink',
                )
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-100 p-3">
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
          >
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
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
              <Badge tone={dataMode === 'live' ? 'mint' : 'amber'} className="hidden sm:inline-flex">
                <span className={cn('h-1.5 w-1.5 rounded-full', dataMode === 'live' ? 'bg-mint-500' : 'bg-amber-500')} />
                {dataMode === 'live' ? 'API trực tiếp' : 'Dữ liệu demo'}
              </Badge>
              <NavLink
                to="/app/notifications"
                className="relative grid h-10 w-10 place-items-center rounded-2xl bg-slate-50 text-slate-500 transition hover:bg-brand-50 hover:text-brand-600"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-coral-500 ring-2 ring-white" />
              </NavLink>
              <div className="relative">
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-2xl p-1.5 transition hover:bg-slate-50"
                  onClick={() => setRoleOpen((value) => !value)}
                >
                  <Avatar name={session.fullName} />
                  <div className="hidden text-left xl:block">
                    <p className="max-w-36 truncate text-sm font-extrabold text-ink">{session.fullName}</p>
                    <p className="text-xs text-slate-400">{roleLabel(session.role)}</p>
                  </div>
                  <ChevronDown className="hidden h-4 w-4 text-slate-400 xl:block" />
                </button>
                {roleOpen && (
                  <div className="absolute right-0 top-14 w-64 rounded-3xl border border-slate-100 bg-white p-2 shadow-soft">
                    <p className="px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
                      Chuyển vai trò demo
                    </p>
                    {(['BUSINESS', 'EXPERT', 'STAFF', 'ADMIN'] as Role[]).map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => switchRole(role)}
                        className={cn(
                          'flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-sm font-semibold transition',
                          role === session.role
                            ? 'bg-brand-50 text-brand-700'
                            : 'text-slate-600 hover:bg-slate-50',
                        )}
                      >
                        {roleLabel(role)}
                        {role === session.role && <span className="h-2 w-2 rounded-full bg-brand-500" />}
                      </button>
                    ))}
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
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <nav className="mt-6 space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/app'}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold',
                      isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-500',
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
    </div>
  );
}

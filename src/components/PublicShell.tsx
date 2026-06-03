import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { cn } from '../lib/utils';
import { Logo } from './Logo';
import { LinkButton } from './ui';

const nav = [
  { label: 'Cơ hội dự án', to: '/jobs' },
  { label: 'Chuyên gia AI', to: '/experts' },
  { label: 'Quy trình', to: '/#how-it-works' },
  { label: 'Về AITASKER', to: '/#about' },
];

export function PublicShell() {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-[#fbfdff] text-ink">
      <header className="sticky top-0 z-40 border-b border-white/80 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 py-3 md:px-6">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((item) => (
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
            <LinkButton to="/login" variant="ghost">
              Đăng nhập
            </LinkButton>
            <LinkButton to="/register">Bắt đầu ngay</LinkButton>
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
              {nav.map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <LinkButton to="/login" variant="secondary">
                  Đăng nhập
                </LinkButton>
                <LinkButton to="/register">Đăng ký</LinkButton>
              </div>
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

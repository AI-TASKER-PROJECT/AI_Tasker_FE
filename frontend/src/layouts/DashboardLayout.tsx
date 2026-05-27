import { Outlet, Link } from 'react-router-dom';

export default function DashboardLayout() {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <h2 className="font-display font-bold text-lg">AI Network</h2>
        </div>
        <nav className="flex flex-col gap-2 p-4 mt-2">
          <Link
            to="/dashboard"
            className="px-4 py-2 rounded text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            Tổng quan
          </Link>
          <Link
            to="/jobs"
            className="px-4 py-2 rounded text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            Dự án B2B
          </Link>
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-end px-8 shadow-lvl1 z-10 shrink-0">
          <span className="text-sm font-medium">
            Xin chào,{' '}
            <strong className="text-primary-container font-display">
              Enterprise User
            </strong>
          </span>
        </header>

        {/* Nội dung trang */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="max-w-[1440px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

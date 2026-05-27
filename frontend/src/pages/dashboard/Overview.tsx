export default function Overview() {
  return (
    <div className="space-y-8">
      {/* Tiêu đề trang */}
      <div>
        <h1 className="font-display font-bold text-3xl tracking-tight text-slate-900">
          Tổng quan
        </h1>
        <p className="text-on-surface-variant mt-1">
          Cập nhật trạng thái và các chuyên gia phù hợp mới nhất.
        </p>
      </div>

      {/* Status Banner */}
      <div className="flex items-center w-full bg-warning/10 border-l-[4px] border-warning px-4 py-3 rounded-r-md">
        <svg
          className="w-5 h-5 text-warning mr-3 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <span className="text-slate-900 font-medium">
          Hồ sơ của bạn đang chờ hệ thống AI xét duyệt (Dự kiến 24h).
        </span>
      </div>

      {/* Expert Profile List */}
      <section className="space-y-4">
        <h2 className="font-display font-semibold text-xl tracking-tight">
          Chuyên gia đề xuất
        </h2>

        <div className="bg-white rounded-lg border border-slate-200 shadow-lvl1 p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:shadow-lvl2 transition-all">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-slate-200 shrink-0 overflow-hidden">
              <img
                src="https://i.pravatar.cc/150?img=68"
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h4 className="font-display font-semibold text-lg text-slate-900">
                Dr. Elena Rostova
              </h4>
              <p className="text-sm text-on-surface-variant">
                Senior NLP Engineer
              </p>
            </div>
          </div>

          <div className="hidden md:block w-px h-10 bg-slate-200 shrink-0"></div>

          <div className="flex flex-col">
            <span className="font-display text-xs text-slate-500 uppercase tracking-label">
              Kinh nghiệm
            </span>
            <span className="font-medium text-slate-900">
              8 năm (Enterprise)
            </span>
          </div>

          <div className="hidden md:block w-px h-10 bg-slate-200 shrink-0"></div>

          <div className="flex flex-col">
            <span className="font-display text-xs text-slate-500 uppercase tracking-label">
              Chuyên môn
            </span>
            <div className="flex gap-2 mt-1">
              <span className="px-2 py-0.5 bg-surface-dim rounded-full text-xs font-medium text-on-surface">
                LLMs
              </span>
              <span className="px-2 py-0.5 bg-surface-dim rounded-full text-xs font-medium text-on-surface">
                RAG
              </span>
            </div>
          </div>

          <div className="hidden md:block w-px h-10 bg-slate-200 shrink-0"></div>

          <div>
            <button className="text-primary-container font-display font-semibold text-sm hover:text-primary transition-colors">
              Xem chi tiết &rarr;
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

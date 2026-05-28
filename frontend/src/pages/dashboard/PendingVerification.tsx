import React from 'react';
import { Link } from 'react-router-dom';

const PendingVerification: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col font-body-md text-body-md bg-background">
      {/* TopNavBar */}
      <nav className="fixed top-0 left-0 w-full z-50 flex justify-between items-center h-16 px-margin-desktop max-w-7xl mx-auto bg-surface border-b border-outline-variant shadow-sm transition-all duration-300">
        <div className="flex items-center gap-md">
          <span className="font-headline-md text-headline-md font-bold text-primary cursor-pointer transition-transform hover:scale-105 active:scale-95 duration-100">
            AIFlow Connect
          </span>
          <div className="hidden md:flex gap-sm ml-lg">
            <a className="text-on-surface-variant hover:text-primary transition-colors font-label-md text-label-md py-2 px-1" href="#">Solutions</a>
            <a className="text-on-surface-variant hover:text-primary transition-colors font-label-md text-label-md py-2 px-1" href="#">Pricing</a>
            <a className="text-on-surface-variant hover:text-primary transition-colors font-label-md text-label-md py-2 px-1" href="#">Experts</a>
            <a className="text-on-surface-variant hover:text-primary transition-colors font-label-md text-label-md py-2 px-1" href="#">Resources</a>
          </div>
        </div>
        <div className="flex items-center gap-sm">
          {/* Vì đang ở trong Dashboard, thay vì nút Login/Get Started, thực tế ở đây sẽ là Avatar/Menu người dùng. 
              Mình giữ nguyên theo thiết kế HTML gốc của bạn */}
          <button className="hidden md:block font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors py-2 px-4 rounded-lg">
            Hồ sơ
          </button>
          <button className="md:hidden text-on-surface p-2">
            <span className="material-symbols-outlined">menu</span>
          </button>
        </div>
      </nav>

      {/* Main Layout */}
      <div className="flex pt-16 flex-1 w-full max-w-7xl mx-auto">
        {/* Sidebar Navigation (Desktop) */}
        <aside className="hidden md:flex flex-col w-64 bg-surface-container-low border-r border-outline-variant min-h-[calc(100vh-64px)] p-md gap-sm">
          <div className="mb-md">
            <p className="font-label-sm text-label-sm text-secondary uppercase tracking-wider mb-xs">Bảng điều khiển</p>
            <nav className="flex flex-col gap-1">
              <Link to="/dashboard/pending" className="flex items-center gap-xs px-3 py-2 bg-primary-container text-on-primary-container rounded-lg font-label-md text-label-md transition-colors shadow-sm">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>dashboard</span>
                Tổng quan
              </Link>
              <div className="flex items-center gap-xs px-3 py-2 text-on-surface-variant hover:bg-surface-variant hover:text-on-surface rounded-lg font-label-md text-label-md transition-colors cursor-not-allowed opacity-60">
                <span className="material-symbols-outlined">work</span>
                Công việc
                <span className="ml-auto material-symbols-outlined text-[16px]">lock</span>
              </div>
              <div className="flex items-center gap-xs px-3 py-2 text-on-surface-variant hover:bg-surface-variant hover:text-on-surface rounded-lg font-label-md text-label-md transition-colors cursor-not-allowed opacity-60">
                <span className="material-symbols-outlined">groups</span>
                Chuyên gia
                <span className="ml-auto material-symbols-outlined text-[16px]">lock</span>
              </div>
            </nav>
          </div>
          <div className="mt-auto pt-md border-t border-outline-variant">
            <a className="flex items-center gap-xs px-3 py-2 text-on-surface-variant hover:bg-surface-variant hover:text-on-surface rounded-lg font-label-md text-label-md transition-colors" href="#">
              <span className="material-symbols-outlined">settings</span>
              Cài đặt
            </a>
            <a className="flex items-center gap-xs px-3 py-2 text-on-surface-variant hover:bg-surface-variant hover:text-on-surface rounded-lg font-label-md text-label-md transition-colors" href="#">
              <span className="material-symbols-outlined">help</span>
              Trung tâm trợ giúp
            </a>
          </div>
        </aside>

        {/* Main Content Canvas */}
        <main className="flex-1 p-margin-mobile md:p-margin-desktop overflow-y-auto bg-surface-bright">
          
          {/* Pending Verification Banner */}
          <div className="w-full bg-surface-container-high border-l-4 border-primary rounded-r-lg p-md mb-xl flex items-start gap-md shadow-sm">
            <span className="material-symbols-outlined text-primary text-[32px] mt-1">hourglass_empty</span>
            <div className="flex-1">
              <h2 className="font-headline-md text-headline-md text-on-surface mb-xs">Hồ sơ đang chờ xác minh</h2>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Chúng tôi đang xem xét thông tin doanh nghiệp của bạn. Quá trình này thường mất 24-48 giờ. Trong thời gian này, tính năng đăng tuyển và liên hệ chuyên gia tạm thời bị khóa.
              </p>
            </div>
            <button className="bg-surface text-primary border border-primary font-label-md text-label-md py-2 px-4 rounded-lg shadow-sm hover:bg-primary-fixed transition-colors whitespace-nowrap hidden md:block">
              Liên hệ hỗ trợ
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-xl">
            {/* Left Column (Overview & Checklist) */}
            <div className="lg:col-span-2 flex flex-col gap-xl">
              
              {/* Overview Metrics (Empty States) */}
              <section>
                <h3 className="font-headline-md text-headline-md text-on-surface mb-md">Tổng quan</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
                  <div className="bg-surface border border-outline-variant rounded-xl p-md shadow-sm opacity-70">
                    <p className="font-label-md text-label-md text-secondary mb-xs">Công việc đang mở</p>
                    <p className="font-display-lg text-display-lg text-on-surface-variant">0</p>
                    <p className="font-label-sm text-label-sm text-outline mt-sm flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">info</span>
                      Chờ xác minh để đăng
                    </p>
                  </div>
                  <div className="bg-surface border border-outline-variant rounded-xl p-md shadow-sm opacity-70">
                    <p className="font-label-md text-label-md text-secondary mb-xs">Tổng chi tiêu</p>
                    <p className="font-display-lg text-display-lg text-on-surface-variant">$0</p>
                    <p className="font-label-sm text-label-sm text-outline mt-sm flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">info</span>
                      Chưa có giao dịch
                    </p>
                  </div>
                  <div className="bg-surface border border-outline-variant rounded-xl p-md shadow-sm opacity-70">
                    <p className="font-label-md text-label-md text-secondary mb-xs">Chuyên gia đã thuê</p>
                    <p className="font-display-lg text-display-lg text-on-surface-variant">0</p>
                    <p className="font-label-sm text-label-sm text-outline mt-sm flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">info</span>
                      Chưa có ai
                    </p>
                  </div>
                </div>
              </section>

              {/* Getting Started Checklist */}
              <section className="bg-surface border border-outline-variant rounded-xl p-lg shadow-sm">
                <h3 className="font-headline-md text-headline-md text-on-surface mb-md">Các bước tiếp theo</h3>
                <div className="flex flex-col gap-sm">
                  <div className="flex items-center gap-md p-md bg-surface-container rounded-lg">
                    <span className="material-symbols-outlined text-primary text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    <div className="flex-1">
                      <p className="font-label-md text-label-md text-on-surface">Đăng ký tài khoản</p>
                      <p className="font-label-sm text-label-sm text-secondary">Đã hoàn tất</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-md p-md bg-surface-container-high rounded-lg border border-primary-fixed">
                    <span className="material-symbols-outlined text-outline text-[28px]">radio_button_unchecked</span>
                    <div className="flex-1">
                      <p className="font-label-md text-label-md text-on-surface">Hoàn thiện hồ sơ công ty</p>
                      <p className="font-label-sm text-label-sm text-secondary">Thêm logo, mô tả và website để thu hút chuyên gia.</p>
                    </div>
                    <button className="text-primary font-label-md text-label-md hover:underline">Cập nhật</button>
                  </div>
                  <div className="flex items-center gap-md p-md bg-surface border border-outline-variant rounded-lg opacity-60">
                    <span className="material-symbols-outlined text-outline text-[28px]">radio_button_unchecked</span>
                    <div className="flex-1">
                      <p className="font-label-md text-label-md text-on-surface">Thêm phương thức thanh toán</p>
                      <p className="font-label-sm text-label-sm text-secondary">Cần thiết để bắt đầu thuê chuyên gia.</p>
                    </div>
                    <span className="material-symbols-outlined text-outline">lock</span>
                  </div>
                </div>
              </section>
            </div>

            {/* Right Column (Disabled Talent Discovery) */}
            <div className="lg:col-span-1">
              <section className="bg-surface border border-outline-variant rounded-xl p-md shadow-sm h-full flex flex-col">
                <div className="flex justify-between items-center mb-md">
                  <h3 className="font-headline-md text-headline-md text-on-surface">Khám phá chuyên gia</h3>
                  <span className="material-symbols-outlined text-outline">lock</span>
                </div>
                <p className="font-label-sm text-label-sm text-secondary mb-md">Xem trước các chuyên gia AI hàng đầu trong mạng lưới của chúng tôi.</p>
                <div className="flex flex-col gap-md flex-1">
                  
                  {/* Expert Preview Cards */}
                  <div className="flex items-start gap-sm p-sm border border-outline-variant rounded-lg bg-surface-bright grayscale opacity-80 pointer-events-none">
                    <div className="w-12 h-12 bg-surface-container rounded-full flex-shrink-0"></div>
                    <div className="flex-1">
                      <p className="font-label-md text-label-md text-on-surface">Dr. Elena Rostova</p>
                      <p className="font-label-sm text-label-sm text-secondary">Kỹ sư Machine Learning, OpenAI</p>
                      <div className="mt-2 text-center">
                        <button className="w-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm py-1 rounded cursor-not-allowed">Yêu cầu xác minh</button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-sm p-sm border border-outline-variant rounded-lg bg-surface-bright grayscale opacity-80 pointer-events-none">
                    <div className="w-12 h-12 bg-surface-container rounded-full flex-shrink-0"></div>
                    <div className="flex-1">
                      <p className="font-label-md text-label-md text-on-surface">Marcus Chen</p>
                      <p className="font-label-sm text-label-sm text-secondary">Chuyên gia NLP &amp; LLM</p>
                      <div className="mt-2 text-center">
                        <button className="w-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm py-1 rounded cursor-not-allowed">Yêu cầu xác minh</button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-md pt-md border-t border-outline-variant text-center">
                  <span className="text-outline font-label-md text-label-md cursor-not-allowed">Xem tất cả chuyên gia</span>
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="w-full py-md px-margin-desktop flex flex-col md:flex-row justify-between items-center gap-sm bg-surface-container-low border-t border-outline-variant">
        <span className="font-headline-md text-headline-md font-bold text-on-surface">AIFlow Connect</span>
        <div className="flex gap-md">
          <a className="font-label-sm text-label-sm text-secondary hover:text-primary transition-colors" href="#">Privacy Policy</a>
          <a className="font-label-sm text-label-sm text-secondary hover:text-primary transition-colors" href="#">Terms of Service</a>
          <a className="font-label-sm text-label-sm text-secondary hover:text-primary transition-colors" href="#">Cookie Policy</a>
          <a className="font-label-sm text-label-sm text-secondary hover:text-primary transition-colors" href="#">Security</a>
        </div>
        <span className="font-label-sm text-label-sm text-secondary text-center md:text-right">© 2024 AIFlow Connect. Precision Outsourcing for Enterprise.</span>
      </footer>
    </div>
  );
};

export default PendingVerification;
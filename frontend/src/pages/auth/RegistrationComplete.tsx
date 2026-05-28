import React from 'react';
import { useNavigate } from 'react-router-dom';

const RegistrationComplete: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col font-body-md antialiased">
      {/* Header tối giản */}
      <header className="w-full py-md px-margin-mobile md:px-margin-desktop flex items-center justify-between border-b border-outline-variant/30 bg-surface-container-lowest/80 backdrop-blur-md fixed top-0 z-50">
        <div className="flex items-center gap-xs">
          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>architecture</span>
          <span className="font-headline-md text-headline-md font-bold tracking-tight text-on-surface">AIFlow Connect</span>
        </div>
        <div className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-xs">
          <span className="material-symbols-outlined text-outline text-[16px]">help</span>
          <span className="hidden md:inline">Trợ giúp &amp; Hỗ trợ</span>
        </div>
      </header>

      {/* Nội dung chính */}
      <main className="flex-grow flex flex-col items-center justify-center px-margin-mobile md:px-margin-desktop pt-[100px] pb-xl w-full max-w-[800px] mx-auto">
        
        {/* Stepper ngang 3 bước */}
        <div className="w-full flex items-center justify-between mb-lg relative slide-up-enter">
          <div className="absolute top-1/2 left-0 w-full h-[2px] bg-surface-container-high -z-10 -translate-y-1/2"></div>
          <div className="absolute top-1/2 left-0 w-full h-[2px] bg-primary -z-10 -translate-y-1/2"></div>
          
          <div className="flex flex-col items-center gap-xs bg-background px-2">
            <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
            </div>
            <span className="font-label-sm text-label-sm text-primary hidden md:block">Thông tin</span>
          </div>
          
          <div className="flex flex-col items-center gap-xs bg-background px-2">
            <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
            </div>
            <span className="font-label-sm text-label-sm text-primary hidden md:block">Tài liệu</span>
          </div>
          
          <div className="flex flex-col items-center gap-xs bg-background px-2">
            <div className="w-8 h-8 rounded-full bg-primary-container text-primary flex items-center justify-center border-2 border-primary shadow-sm relative">
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>shield_person</span>
              <span className="absolute inset-0 rounded-full border border-primary animate-ping opacity-75"></span>
            </div>
            <span className="font-label-sm text-label-sm text-primary font-bold hidden md:block">Hoàn tất</span>
          </div>
        </div>

        {/* Icon trạng thái Pending */}
        <div className="w-24 h-24 rounded-xl bg-surface-container-low border border-primary/20 flex items-center justify-center mb-md slide-up-enter delay-100 shadow-sm relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent"></div>
          <span className="material-symbols-outlined text-primary text-[48px] relative z-10" style={{ fontVariationSettings: "'FILL' 1" }}>pending_actions</span>
        </div>

        {/* Tiêu đề & Lời nhắn */}
        <div className="text-center mb-lg max-w-[600px] slide-up-enter delay-200">
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-sm">
            Hồ sơ doanh nghiệp đang được thẩm định
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Cảm ơn bạn đã lựa chọn AIFlow Connect. Chúng tôi sẽ xử lý yêu cầu xác thực pháp nhân của bạn trong vòng <strong className="text-on-surface">24-48 giờ làm việc</strong>.
          </p>
        </div>

        {/* Thẻ thông tin doanh nghiệp */}
        <div className="w-full bg-surface-container-lowest rounded-xl p-md ambient-shadow-sm mb-lg flex flex-col sm:flex-row items-center justify-between gap-md slide-up-enter delay-300">
          <div className="flex items-center gap-sm w-full sm:w-auto">
            <div className="w-12 h-12 rounded-lg bg-surface-container-low flex items-center justify-center border border-outline-variant/50">
              <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>storefront</span>
            </div>
            <div>
              <div className="font-label-sm text-label-sm text-on-surface-variant mb-1 uppercase">Doanh nghiệp đăng ký</div>
              <div className="font-label-md text-label-md text-on-surface">CÔNG TY CỔ PHẦN CÔNG NGHỆ NEXTGEN AI (Mẫu)</div>
            </div>
          </div>
          <div className="flex items-center gap-xs px-sm py-xs rounded-full bg-secondary-container/50 border border-secondary/20 w-full sm:w-auto justify-center sm:justify-start">
            <span className="material-symbols-outlined text-secondary text-[16px] animate-pulse" style={{ fontVariationSettings: "'FILL' 1" }}>schedule</span>
            <span className="font-label-sm text-label-sm text-on-secondary-container font-medium">Trạng thái: Đang chờ xử lý</span>
          </div>
        </div>

        {/* Nút hành động */}
        <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-sm slide-up-enter delay-400">
          <button 
            onClick={() => navigate('/dashboard/overview')}
            className="w-full sm:w-auto px-lg py-3 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-primary/90 btn-physical flex items-center justify-center gap-xs"
          >
            <span className="material-symbols-outlined text-[20px]">home</span>
            Về trang chủ
          </button>
          <button className="w-full sm:w-auto px-lg py-3 rounded-lg bg-surface-container-lowest text-on-surface border border-outline-variant hover:bg-surface-container-low font-label-md text-label-md transition-colors flex items-center justify-center gap-xs">
            <span className="material-symbols-outlined text-[20px]">menu_book</span>
            Xem hướng dẫn cho doanh nghiệp
          </button>
        </div>

        {/* Mục hỗ trợ */}
        <div className="mt-xl text-center slide-up-enter delay-400 opacity-80">
          <p className="font-label-sm text-label-sm text-outline">
            Bạn cần hỗ trợ ngay? <a className="text-primary hover:underline font-medium" href="#">Liên hệ bộ phận chăm sóc khách hàng doanh nghiệp</a>
          </p>
        </div>
      </main>
    </div>
  );
};

export default RegistrationComplete;
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const BusinessVerification: React.FC = () => {
  const navigate = useNavigate();

  // State quản lý dữ liệu form
  const [businessName, setBusinessName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [industry, setIndustry] = useState('');
  const [companySize, setCompanySize] = useState('');

  // Xử lý khi nhấn nút "Quay lại"
  const handleBack = () => {
    navigate(-1); // Quay lại trang trước đó
  };

  // Xử lý khi nhấn nút "Lưu và Tiếp tục"
  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    // Ở đây bạn sẽ gọi API để lưu thông tin doanh nghiệp
    console.log({ businessName, taxId, regNumber, industry, companySize });
    
    // Sau khi lưu thành công, chuyển sang bước 3 (Hoàn tất) hoặc Dashboard
    // navigate('/auth/registration-complete'); 
  };

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col font-body-md antialiased pt-[72px]">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-md border-b border-outline-variant/30 shadow-sm">
        <div className="flex items-center justify-between px-margin-mobile md:px-margin-desktop py-4 max-w-[1440px] mx-auto">
          <div className="font-headline-md text-headline-md font-bold text-primary">AIFlow Connect</div>
          <div className="flex items-center gap-xs">
            <button className="p-xs text-on-surface-variant hover:bg-surface-container-low rounded-full transition-all duration-200 active:scale-95">
              <span className="material-symbols-outlined">help</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center py-lg px-margin-mobile md:px-margin-desktop">
        <div className="w-full max-w-3xl slide-up">
          {/* Stepper */}
          <div className="mb-lg">
            <div className="flex items-center justify-between relative">
              <div className="absolute top-1/2 left-0 w-full h-[2px] bg-surface-container-high -z-10 transform -translate-y-1/2"></div>
              <div className="absolute top-1/2 left-0 w-1/2 h-[2px] bg-primary -z-10 transform -translate-y-1/2 transition-all duration-500"></div>
              
              {/* Step 1: Completed */}
              <div className="flex flex-col items-center gap-xs bg-background px-sm">
                <div className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-sm border-2 border-primary">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                </div>
                <span className="font-label-sm text-label-sm text-on-surface">Thông tin cơ bản</span>
              </div>
              
              {/* Step 2: Active */}
              <div className="flex flex-col items-center gap-xs bg-background px-sm">
                <div className="w-10 h-10 rounded-full bg-surface-container-lowest text-primary flex items-center justify-center shadow-md border-2 border-primary">
                  <span className="font-label-md text-label-md">2</span>
                </div>
                <span className="font-label-sm text-label-sm text-primary font-bold">Xác minh doanh nghiệp</span>
              </div>
              
              {/* Step 3: Pending */}
              <div className="flex flex-col items-center gap-xs bg-background px-sm">
                <div className="w-10 h-10 rounded-full bg-surface-container-lowest text-outline flex items-center justify-center border-2 border-outline-variant">
                  <span className="font-label-md text-label-md">3</span>
                </div>
                <span className="font-label-sm text-label-sm text-outline">Hoàn tất</span>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="bg-surface-container-lowest border border-outline-variant/50 rounded-xl shadow-[0_4px_24px_rgba(0,82,255,0.05)] p-md md:p-lg slide-up-delay-1">
            <div className="mb-md">
              <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-xs">Thông tin pháp lý</h1>
              <p className="font-body-md text-body-md text-on-surface-variant">Cung cấp thông tin đăng ký kinh doanh để AIFlow Connect xác thực tài khoản doanh nghiệp của bạn.</p>
            </div>
            
            <form onSubmit={handleNext} className="space-y-md">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                <div className="space-y-xs col-span-1 md:col-span-2">
                  <label className="font-label-sm text-label-sm text-on-surface" htmlFor="businessName">Tên doanh nghiệp đầy đủ (Theo Giấy DKKD)</label>
                  <input 
                    id="businessName" type="text" required
                    value={businessName} onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="VD: Công ty TNHH Công nghệ AIFlow" 
                    className="w-full bg-surface border border-outline-variant rounded-lg px-sm py-[10px] text-body-md focus:border-primary focus:ring-1 focus:ring-primary transition-colors outline-none" 
                  />
                </div>
                <div className="space-y-xs">
                  <label className="font-label-sm text-label-sm text-on-surface" htmlFor="taxId">Mã số thuế</label>
                  <input 
                    id="taxId" type="text" required
                    value={taxId} onChange={(e) => setTaxId(e.target.value)}
                    placeholder="VD: 0101234567" 
                    className="w-full bg-surface border border-outline-variant rounded-lg px-sm py-[10px] text-body-md focus:border-primary focus:ring-1 focus:ring-primary transition-colors outline-none" 
                  />
                </div>
                <div className="space-y-xs">
                  <label className="font-label-sm text-label-sm text-on-surface" htmlFor="regNumber">Số đăng ký kinh doanh</label>
                  <input 
                    id="regNumber" type="text" 
                    value={regNumber} onChange={(e) => setRegNumber(e.target.value)}
                    placeholder="Nếu khác Mã số thuế" 
                    className="w-full bg-surface border border-outline-variant rounded-lg px-sm py-[10px] text-body-md focus:border-primary focus:ring-1 focus:ring-primary transition-colors outline-none" 
                  />
                </div>
                <div className="space-y-xs">
                  <label className="font-label-sm text-label-sm text-on-surface" htmlFor="industry">Ngành nghề kinh doanh chính</label>
                  <div className="relative">
                    <select 
                      id="industry" required
                      value={industry} onChange={(e) => setIndustry(e.target.value)}
                      className="w-full bg-surface border border-outline-variant rounded-lg px-sm py-[10px] text-body-md appearance-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors outline-none"
                    >
                      <option disabled value="">Chọn ngành nghề</option>
                      <option value="tech">Công nghệ thông tin</option>
                      <option value="finance">Tài chính - Ngân hàng</option>
                      <option value="healthcare">Y tế</option>
                      <option value="manufacturing">Sản xuất</option>
                      <option value="other">Khác</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-sm top-1/2 transform -translate-y-1/2 text-on-surface-variant pointer-events-none">expand_more</span>
                  </div>
                </div>
                <div className="space-y-xs">
                  <label className="font-label-sm text-label-sm text-on-surface" htmlFor="companySize">Quy mô công ty</label>
                  <div className="relative">
                    <select 
                      id="companySize" required
                      value={companySize} onChange={(e) => setCompanySize(e.target.value)}
                      className="w-full bg-surface border border-outline-variant rounded-lg px-sm py-[10px] text-body-md appearance-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors outline-none"
                    >
                      <option disabled value="">Chọn quy mô</option>
                      <option value="1-10">1-10 nhân viên</option>
                      <option value="11-50">11-50 nhân viên</option>
                      <option value="51-200">51-200 nhân viên</option>
                      <option value="201-500">201-500 nhân viên</option>
                      <option value="500+">Hơn 500 nhân viên</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-sm top-1/2 transform -translate-y-1/2 text-on-surface-variant pointer-events-none">expand_more</span>
                  </div>
                </div>
              </div>

              <div className="h-px w-full bg-outline-variant/30 my-md"></div>

              {/* File Uploads */}
              <div className="space-y-md">
                <h2 className="font-headline-md text-headline-md text-on-surface">Tài liệu xác minh</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                  <div className="border-2 border-dashed border-outline-variant rounded-xl p-md flex flex-col items-center justify-center text-center bg-surface hover:border-primary hover:bg-surface-container-low transition-colors cursor-pointer group">
                    <span className="material-symbols-outlined text-4xl text-outline mb-xs group-hover:text-primary transition-colors" style={{ fontVariationSettings: "'FILL' 1" }}>description</span>
                    <span className="font-label-md text-label-md text-on-surface mb-base">Giấy phép kinh doanh</span>
                    <span className="font-body-md text-[13px] text-on-surface-variant">Tải lên bản PDF, JPG hoặc PNG (Tối đa 5MB)</span>
                  </div>
                  <div className="border-2 border-dashed border-outline-variant rounded-xl p-md flex flex-col items-center justify-center text-center bg-surface hover:border-primary hover:bg-surface-container-low transition-colors cursor-pointer group">
                    <span className="material-symbols-outlined text-4xl text-outline mb-xs group-hover:text-primary transition-colors" style={{ fontVariationSettings: "'FILL' 1" }}>draw</span>
                    <span className="font-label-md text-label-md text-on-surface mb-base">Mẫu dấu / Chữ ký ĐDPL</span>
                    <span className="font-body-md text-[13px] text-on-surface-variant">Tải lên bản PDF, JPG hoặc PNG (Tối đa 5MB)</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-md mt-lg border-t border-outline-variant/30 slide-up-delay-2">
                <button 
                  type="button" 
                  onClick={handleBack}
                  className="font-label-md text-label-md text-on-surface-variant hover:text-on-surface px-sm py-2 flex items-center gap-xs transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">arrow_back</span> Quay lại
                </button>
                <button 
                  type="submit"
                  className="bg-primary text-on-primary font-label-md text-label-md px-md py-3 rounded-lg shadow-sm border-b-2 border-on-primary-fixed-variant hover:bg-primary/90 hover:shadow-md active:translate-y-[1px] active:border-b-0 active:shadow-none transition-all flex items-center gap-xs"
                >
                  Lưu và Tiếp tục <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-surface-container-lowest py-xl border-t border-outline-variant/50 w-full mt-auto">
        <div className="flex flex-col md:flex-row justify-between items-center px-margin-mobile md:px-margin-desktop max-w-[1440px] mx-auto gap-md">
          <div className="font-headline-md text-headline-md font-bold text-on-surface">AIFlow Connect</div>
          <div className="flex flex-wrap justify-center gap-md">
            <a className="font-label-sm text-label-sm text-on-secondary-container hover:text-primary transition-colors opacity-80 hover:opacity-100" href="#">Terms of Service</a>
            <a className="font-label-sm text-label-sm text-on-secondary-container hover:text-primary transition-colors opacity-80 hover:opacity-100" href="#">Privacy Policy</a>
            <a className="font-label-sm text-label-sm text-on-secondary-container hover:text-primary transition-colors opacity-80 hover:opacity-100" href="#">Support Center</a>
            <a className="font-label-sm text-label-sm text-on-secondary-container hover:text-primary transition-colors opacity-80 hover:opacity-100" href="#">API Documentation</a>
          </div>
          <div className="font-body-md text-body-md text-secondary">© 2024 AIFlow Connect. Precision Intelligence.</div>
        </div>
      </footer>
    </div>
  );
};

export default BusinessVerification;
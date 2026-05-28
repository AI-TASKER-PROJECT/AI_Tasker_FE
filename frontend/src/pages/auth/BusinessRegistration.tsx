import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';

const BusinessRegistration: React.FC = () => {
  const navigate = useNavigate();

  // State cho form
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // State quản lý UI
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Xử lý Đăng ký bằng Email/Mật khẩu
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Validate cơ bản
    if (password !== confirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không khớp.');
      return;
    }
    if (!agreeTerms) {
      setErrorMsg('Bạn phải đồng ý với Điều khoản & Thỏa thuận.');
      return;
    }

    setIsLoading(true);

    try {
      // Thay đổi URL theo cấu hình Backend Node.js của bạn
      const response = await fetch('http://localhost:8080/api/auth/register-business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Đăng ký thất bại.');
      }

      // Xử lý thành công (ví dụ: tự động đăng nhập hoặc chuyển đến trang xác minh)
      if (data.token) {
        localStorage.setItem('accessToken', data.token);
        navigate('/auth/verify-business');
      } else {
        // Hoặc chuyển đến bước tiếp theo trong luồng (ví dụ: xác minh email)
        navigate('/auth/verify-email');
      }
    } catch (error: any) {
      setErrorMsg(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Xử lý Đăng ký bằng Google
  const handleGoogleSignup = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setIsLoading(true);
        setErrorMsg('');
        
        console.log("Token Google cấp:", tokenResponse.access_token);

        // Gửi token lên Backend Node.js để tạo tài khoản
        const response = await fetch('http://localhost:8080/api/auth/google-signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            token: tokenResponse.access_token,
            accountType: 'business' // Phân biệt loại tài khoản nếu cần
          }),
        });

        const data = await response.json();

        if (!response.ok) {
           throw new Error(data.message || 'Đăng ký bằng Google thất bại.');
        }

        if (data.token) {
           localStorage.setItem('accessToken', data.token);
           navigate('/dashboard/overview');
        }
      } catch (error: any) {
        setErrorMsg(error.message);
      } finally {
        setIsLoading(false);
      }
    },
    onError: () => {
      setErrorMsg('Bạn đã hủy thao tác hoặc có lỗi từ Google.');
    }
  });

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col font-body-md text-body-md antialiased selection:bg-primary-container selection:text-on-primary-container">
      {/* Header */}
      <header className="bg-surface/80 dark:bg-surface-dim/80 backdrop-blur-md fixed top-0 w-full z-50 border-b border-outline-variant/30 shadow-sm dark:shadow-none">
        <div className="flex items-center justify-between px-margin-mobile md:px-margin-desktop py-4 max-w-[1440px] mx-auto">
          <div className="flex items-center gap-md">
            <a className="font-headline-md text-headline-md font-bold text-primary dark:text-primary-fixed-dim tracking-tight" href="#">
              AIFlow Connect
            </a>
            <div className="hidden lg:flex items-center bg-surface-container-lowest border border-outline-variant/50 rounded-full px-4 py-2 ml-md">
              <span className="material-symbols-outlined text-outline mr-2 text-[20px]">search</span>
              <input className="bg-transparent border-none p-0 focus:ring-0 text-sm w-48 text-on-surface-variant font-body-md text-body-md placeholder:text-outline/70" placeholder="Search..." type="text"/>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-lg">
            <a className="text-on-surface-variant dark:text-outline hover:text-primary transition-colors font-label-md text-label-md" href="#">Jobs</a>
            <a className="text-on-surface-variant dark:text-outline hover:text-primary transition-colors font-label-md text-label-md" href="#">Experts</a>
            <a className="text-on-surface-variant dark:text-outline hover:text-primary transition-colors font-label-md text-label-md" href="#">Dashboard</a>
          </nav>
          <div className="flex items-center gap-sm">
            <button aria-label="Notifications" className="hidden md:flex p-2 text-on-surface-variant hover:bg-surface-container-low rounded-full transition-colors"><span className="material-symbols-outlined">notifications</span></button>
            <button aria-label="Account" className="hidden md:flex p-2 text-on-surface-variant hover:bg-surface-container-low rounded-full transition-colors"><span className="material-symbols-outlined">account_circle</span></button>
            <button className="bg-primary text-on-primary px-6 py-2.5 rounded-lg font-label-md text-label-md btn-physical border-primary-fixed-dim hover:bg-primary/90 active:scale-95 transition-transform duration-100 hidden md:block">Get Started</button>
            <button className="md:hidden p-2 text-on-surface-variant"><span className="material-symbols-outlined">menu</span></button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center justify-center pt-[120px] pb-xl px-margin-mobile md:px-margin-desktop w-full relative">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary-fixed/20 rounded-full blur-[100px] pointer-events-none z-0"></div>
        <div className="w-full max-w-[560px] z-10 flex flex-col items-center">
          
          <div className="text-center mb-lg w-full animate-entrance" style={{animationDelay: '0.1s'}}>
            <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-2">Đăng ký doanh nghiệp</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">Tham gia mạng lưới AI hàng đầu để tìm kiếm chuyên gia.</p>
          </div>

          {/* Stepper */}
          <div className="w-full mb-lg animate-entrance" style={{animationDelay: '0.2s'}}>
            <div className="flex items-center justify-between relative">
              <div className="absolute top-1/2 left-0 w-full h-[2px] bg-surface-container-high -translate-y-1/2 z-0"></div>
              <div className="absolute top-1/2 left-0 w-0 h-[2px] bg-primary -translate-y-1/2 z-0 transition-all duration-500"></div>
              <div className="relative z-10 flex flex-col items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-label-md text-label-md ambient-shadow-sm border-2 border-primary">1</div>
                <span className="font-label-sm text-label-sm text-primary absolute -bottom-6 whitespace-nowrap">Thông tin tài khoản</span>
              </div>
              <div className="relative z-10 flex flex-col items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-surface-container-lowest text-outline border-2 border-outline-variant flex items-center justify-center font-label-md text-label-md bg-surface-container-lowest">2</div>
                <span className="font-label-sm text-label-sm text-outline absolute -bottom-6 whitespace-nowrap">Xác minh doanh nghiệp</span>
              </div>
              <div className="relative z-10 flex flex-col items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-surface-container-lowest text-outline border-2 border-outline-variant flex items-center justify-center font-label-md text-label-md bg-surface-container-lowest">3</div>
                <span className="font-label-sm text-label-sm text-outline absolute -bottom-6 whitespace-nowrap">Hoàn tất</span>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl p-md md:p-lg ambient-shadow-sm animate-entrance" style={{animationDelay: '0.3s'}}>
            {errorMsg && (
                <div className="mb-4 p-3 bg-error-container text-on-error-container rounded-lg text-sm text-center font-medium">
                  {errorMsg}
                </div>
            )}
            
            <form onSubmit={handleRegister} className="flex flex-col gap-md">
              <div className="flex flex-col gap-xs">
                <label className="font-label-md text-label-md text-on-surface" htmlFor="fullName">Họ và tên <span className="text-error">*</span></label>
                <input 
                  id="fullName" type="text" required
                  value={fullName} onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nhập họ và tên của bạn" 
                  className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-3 font-body-md text-body-md text-on-surface placeholder:text-outline/70 focus:border-primary focus:border-2 transition-all outline-none" 
                />
              </div>

              <div className="flex flex-col gap-xs">
                <label className="font-label-md text-label-md text-on-surface" htmlFor="email">Email doanh nghiệp <span className="text-error">*</span></label>
                <input 
                  id="email" type="email" required
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com" 
                  className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-3 font-body-md text-body-md text-on-surface placeholder:text-outline/70 focus:border-primary focus:border-2 transition-all outline-none" 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                <div className="flex flex-col gap-xs">
                  <label className="font-label-md text-label-md text-on-surface" htmlFor="password">Mật khẩu <span className="text-error">*</span></label>
                  <div className="relative">
                    <input 
                      id="password" type={showPassword ? "text" : "password"} required minLength={8}
                      value={password} onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••" 
                      className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-3 font-body-md text-body-md text-on-surface placeholder:text-outline/70 focus:border-primary focus:border-2 transition-all outline-none pr-10" 
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface-variant transition-colors"
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {showPassword ? "visibility" : "visibility_off"}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-xs">
                  <label className="font-label-md text-label-md text-on-surface" htmlFor="confirmPassword">Xác nhận mật khẩu <span className="text-error">*</span></label>
                  <input 
                    id="confirmPassword" type={showPassword ? "text" : "password"} required
                    value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••" 
                    className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-3 font-body-md text-body-md text-on-surface placeholder:text-outline/70 focus:border-primary focus:border-2 transition-all outline-none" 
                  />
                </div>
              </div>

              <div className="flex items-start gap-3 mt-sm">
                <div className="flex items-center h-6">
                  <input 
                    id="terms" type="checkbox" required
                    checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary focus:ring-offset-surface-container-lowest bg-surface cursor-pointer" 
                  />
                </div>
                <label className="font-body-md text-body-md text-on-surface-variant cursor-pointer select-none" htmlFor="terms">
                  Tôi đồng ý với các <a className="text-primary hover:underline font-medium" href="#">Điều khoản &amp; Thỏa thuận</a> và <a className="text-primary hover:underline font-medium" href="#">Chính sách bảo mật</a> của AIFlow Connect.
                </label>
              </div>

              <div className="flex flex-col gap-sm mt-sm">
                <button 
                  type="submit" disabled={isLoading}
                  className={`w-full text-on-primary py-3.5 rounded-lg font-label-md text-label-md btn-physical flex justify-center items-center gap-2 ${isLoading ? 'bg-secondary cursor-not-allowed' : 'bg-primary border-primary-fixed-dim hover:bg-primary/95'}`}
                >
                  {isLoading ? 'Đang xử lý...' : 'Tiếp tục'} {!isLoading && <span className="material-symbols-outlined text-[18px]">arrow_forward</span>}
                </button>

                <div className="relative flex items-center py-sm">
                  <div className="flex-grow border-t border-outline-variant/30"></div>
                  <span className="flex-shrink-0 mx-4 font-label-sm text-label-sm text-outline uppercase tracking-wider">Hoặc</span>
                  <div className="flex-grow border-t border-outline-variant/30"></div>
                </div>

                <button 
                  type="button" 
                  onClick={() => handleGoogleSignup()}
                  disabled={isLoading}
                  className={`w-full bg-surface-container-lowest border border-outline-variant/50 text-on-surface py-3.5 rounded-lg font-label-md text-label-md transition-colors flex justify-center items-center gap-3 ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-surface-container-low'}`}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path></svg>
                  Đăng ký với Google
                </button>
              </div>
            </form>
          </div>

          <p className="mt-lg font-body-md text-body-md text-on-surface-variant animate-entrance" style={{animationDelay: '0.4s'}}>
            Đã có tài khoản? <button onClick={() => navigate('/login')} className="text-primary font-medium hover:underline">Đăng nhập</button>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-surface-container-lowest dark:bg-surface-dim w-full py-xl border-t border-outline-variant/50">
        <div className="flex flex-col md:flex-row justify-between items-center px-margin-mobile md:px-margin-desktop max-w-[1440px] mx-auto gap-lg md:gap-0">
          <div className="flex flex-col items-center md:items-start gap-2">
            <span className="font-headline-md text-headline-md font-bold text-on-surface dark:text-on-surface-variant">AIFlow Connect</span>
            <span className="text-secondary dark:text-secondary-fixed font-body-md text-body-md">© 2024 AIFlow Connect. Precision Intelligence.</span>
          </div>
          <nav className="flex flex-wrap justify-center gap-x-md gap-y-sm">
            <a className="text-on-secondary-container dark:text-on-secondary-fixed-variant hover:text-primary dark:hover:text-primary-fixed-dim transition-colors font-label-sm text-label-sm opacity-80 hover:opacity-100 transition-opacity" href="#">Terms of Service</a>
            <a className="text-on-secondary-container dark:text-on-secondary-fixed-variant hover:text-primary dark:hover:text-primary-fixed-dim transition-colors font-label-sm text-label-sm opacity-80 hover:opacity-100 transition-opacity" href="#">Privacy Policy</a>
            <a className="text-on-secondary-container dark:text-on-secondary-fixed-variant hover:text-primary dark:hover:text-primary-fixed-dim transition-colors font-label-sm text-label-sm opacity-80 hover:opacity-100 transition-opacity" href="#">Support Center</a>
            <a className="text-on-secondary-container dark:text-on-secondary-fixed-variant hover:text-primary dark:hover:text-primary-fixed-dim transition-colors font-label-sm text-label-sm opacity-80 hover:opacity-100 transition-opacity" href="#">API Documentation</a>
          </nav>
        </div>
      </footer>
    </div>
  );
};

export default BusinessRegistration;
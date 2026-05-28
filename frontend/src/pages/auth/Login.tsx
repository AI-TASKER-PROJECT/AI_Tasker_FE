import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// BẮT BUỘC: Import hook từ thư viện Google
import { useGoogleLogin } from '@react-oauth/google';

const Login: React.FC = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Xử lý đăng nhập bằng Email/Password
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8080/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại!',
        );
      }

      if (data.token) {
        localStorage.setItem('accessToken', data.token);
        navigate('/dashboard/overview');
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        setErrorMsg(error.message);
      } else {
        setErrorMsg('Đã có lỗi không xác định xảy ra.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Xử lý đăng nhập bằng Google (Đã nâng cấp)
  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setIsLoading(true);
        setErrorMsg('');

        // Console log ra để bạn xem thử token Google cấp trông như thế nào
        console.log('Token Google cấp:', tokenResponse.access_token);

        // Gửi token này xuống Backend Java (nhớ thay đổi URL cho đúng API của bạn)
        const response = await fetch('http://localhost:8080/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: tokenResponse.access_token }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || 'Xác thực Google với máy chủ thất bại.',
          );
        }

        // Lưu Token của hệ thống và vào Dashboard
        if (data.token) {
          localStorage.setItem('accessToken', data.token);
          navigate('/dashboard/overview');
        }
      } catch (error: unknown) {
        if (error instanceof Error) {
          setErrorMsg(error.message);
        } else {
          setErrorMsg('Đã có lỗi không xác định xảy ra.');
        }
      } finally {
        setIsLoading(false);
      }
    },
    onError: () => {
      setErrorMsg('Bạn đã hủy đăng nhập hoặc có lỗi từ Google.');
    },
  });

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="font-headline-lg text-headline-md text-on-surface mb-2">
          Welcome Back
        </h1>
        <p className="font-body-md text-body-md text-secondary">
          Sign in to your account to continue.
        </p>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 bg-error-container text-on-error-container rounded-lg text-sm text-center font-medium">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        {/* Email */}
        <div>
          <label
            className="block font-label-md text-label-md text-on-surface mb-1"
            htmlFor="email"
          >
            Email Address
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-secondary pointer-events-none">
              <span className="material-symbols-outlined text-sm">mail</span>
            </span>
            <input
              type="email"
              id="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg pl-10 pr-4 py-2 font-body-md text-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              placeholder="you@example.com"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label
              className="block font-label-md text-label-md text-on-surface"
              htmlFor="password"
            >
              Password
            </label>
            <a
              href="#"
              className="font-label-sm text-label-sm text-primary hover:underline"
            >
              Forgot password?
            </a>
          </div>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-secondary pointer-events-none">
              <span className="material-symbols-outlined text-sm">lock</span>
            </span>
            <input
              type="password"
              id="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg pl-10 pr-4 py-2 font-body-md text-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              placeholder="••••••••"
            />
          </div>
        </div>

        {/* Remember Me */}
        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="remember"
            className="rounded border-outline-variant text-primary focus:ring-primary h-4 w-4"
          />
          <label
            htmlFor="remember"
            className="font-body-md text-body-md text-secondary cursor-pointer"
          >
            Remember me for 30 days
          </label>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full text-on-primary font-label-md text-label-md py-3 rounded-lg mt-6 tactile-btn transition-colors flex justify-center items-center gap-2 
            ${isLoading ? 'bg-secondary cursor-not-allowed' : 'bg-primary hover:bg-on-primary-fixed-variant'}`}
        >
          {isLoading ? 'Signing In...' : 'Sign In'}
          {!isLoading && (
            <span className="material-symbols-outlined text-sm">login</span>
          )}
        </button>
      </form>

      {/* Social Login Divider */}
      <div className="mt-6 flex items-center justify-between">
        <hr className="w-full border-outline-variant" />
        <span className="p-2 font-label-sm text-label-sm text-secondary bg-surface-container-lowest">
          OR
        </span>
        <hr className="w-full border-outline-variant" />
      </div>

      {/* Nút Sign in with Google */}
      {/* Lưu ý: Không truyền tham số event (e) vào handleGoogleLogin() nữa, 
         chỉ cần gọi tên hàm là thư viện tự xử lý
      */}
      <button
        type="button"
        onClick={() => handleGoogleLogin()}
        disabled={isLoading}
        className={`w-full bg-surface text-on-surface border border-outline-variant font-label-md text-label-md py-3 rounded-lg mt-2 tactile-btn hover:bg-surface-container-low transition-colors flex justify-center items-center gap-3 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        Continue with Google
      </button>

      <p className="mt-8 text-center font-body-md text-body-md text-secondary">
        Don't have an account?{' '}
        <a href="#" className="text-primary font-bold hover:underline">
          Sign up
        </a>
      </p>
    </div>
  );
};

export default Login;

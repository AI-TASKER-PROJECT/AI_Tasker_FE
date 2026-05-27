import React from 'react';
// 1. Import useNavigate
//gitimport { useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
  // 2. Khai báo biến navigate
  //const navigate = useNavigate();

  // const handleLogin = () => {
  //   // Thêm logic gọi API đăng nhập ở đây sau này...
  //   // Tạm thời cho phép chuyển thẳng sang trang Overview
  //   navigate('/dashboard/overview');
  // };
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

      <form className="space-y-4">
        {/* Email Input */}
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
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg pl-10 pr-4 py-2 font-body-md text-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              placeholder="you@example.com"
            />
          </div>
        </div>

        {/* Password Input */}
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

        {/* Submit Button */}
        <button
          type="button"
          className="w-full bg-primary text-on-primary font-label-md text-label-md py-3 rounded-lg mt-6 tactile-btn hover:bg-on-primary-fixed-variant transition-colors flex justify-center items-center gap-2"
        >
          Sign In{' '}
          <span className="material-symbols-outlined text-sm">login</span>
        </button>
      </form>

      {/* Social Login Divider */}
      <div className="mt-8 flex items-center justify-between">
        <hr className="w-full border-outline-variant" />
        <span className="p-2 font-label-sm text-label-sm text-secondary bg-surface-container-lowest">
          OR
        </span>
        <hr className="w-full border-outline-variant" />
      </div>

      {/* Create Account Link */}
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

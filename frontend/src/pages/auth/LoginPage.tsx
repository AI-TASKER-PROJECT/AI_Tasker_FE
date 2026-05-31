import React from 'react';
import { Link } from 'react-router-dom';
import { ROUTE_PATHS } from '@/app/routes/routePaths';
import { useLogin } from '@/features/auth/login/model/useLogin';

const LoginPage: React.FC = () => {
  const {
    email,
    setEmail,
    password,
    setPassword,
    selectedRole,
    setSelectedRole,
    isLoading,
    errorMsg,
    handleLogin,
    handleGoogleLogin,
  } = useLogin();

  const roles = ['Business', 'Expert', 'Admin', 'Staff'];

  return (
    <div className="flex flex-col items-center animate-fade-in w-full max-w-md mx-auto">
      <h2 className="font-display-lg-mobile text-[28px] font-bold text-on-surface mb-2">
        Welcome Back
      </h2>
      <p className="font-body-md text-body-md text-secondary mb-8 text-center">
        Sign in to your account to continue.
      </p>

      {errorMsg && (
        <div className="w-full bg-error-container text-on-error-container text-sm p-3 rounded-lg mb-6 flex items-center gap-2 font-medium">
          <span className="material-symbols-outlined text-sm">error</span>
          {errorMsg}
        </div>
      )}

      <form className="w-full space-y-5" onSubmit={handleLogin}>
        <div className="flex flex-col gap-2">
          <label className="font-label-md text-label-md text-on-surface">
            Email Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-secondary text-[20px]">
                mail
              </span>
            </div>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              className="w-full bg-surface border border-outline-variant rounded-lg pl-10 pr-4 py-3 font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <label className="font-label-md text-label-md text-on-surface">
              Password
            </label>
            <Link
              to="#"
              className="font-label-sm text-sm text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-secondary text-[20px]">
                lock
              </span>
            </div>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-surface border border-outline-variant rounded-lg pl-10 pr-4 py-3 font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <label className="font-label-md text-label-md text-on-surface">
            Select Your Role
          </label>
          <div className="flex flex-wrap gap-4">
            {roles.map((role) => (
              <label
                key={role}
                className="flex items-center gap-2 cursor-pointer select-none"
              >
                <input
                  type="radio"
                  name="roleGroup"
                  value={role}
                  checked={selectedRole === role}
                  onChange={(event) => setSelectedRole(event.target.value)}
                  className="w-4 h-4 text-primary focus:ring-primary border-outline-variant cursor-pointer"
                />
                <span className="font-body-md text-body-md text-secondary">
                  {role}
                </span>
              </label>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full font-label-md text-label-md py-3 rounded-lg flex items-center justify-center gap-2 mt-4 tactile-btn transition-colors
            ${
              isLoading
                ? 'bg-primary-fixed-dim text-on-primary-fixed cursor-not-allowed'
                : 'bg-primary text-on-primary hover:bg-on-primary-fixed-variant'
            }`}
        >
          {isLoading ? 'Signing In...' : 'Sign In'}
          {!isLoading && (
            <span className="material-symbols-outlined text-[20px]">login</span>
          )}
        </button>
      </form>

      <div className="w-full mt-6 flex items-center justify-between">
        <hr className="w-full border-outline-variant" />
        <span className="px-3 font-label-sm text-label-sm text-secondary uppercase tracking-widest bg-surface-container-lowest">
          OR
        </span>
        <hr className="w-full border-outline-variant" />
      </div>

      <button
        type="button"
        onClick={() => handleGoogleLogin()}
        disabled={isLoading}
        className={`w-full bg-surface text-on-surface border border-outline-variant font-label-md text-label-md py-3 rounded-lg mt-6 tactile-btn hover:bg-surface-container-low transition-colors flex justify-center items-center gap-3
          ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
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
        <Link to={ROUTE_PATHS.register} className="text-primary font-bold hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
};

export default LoginPage;

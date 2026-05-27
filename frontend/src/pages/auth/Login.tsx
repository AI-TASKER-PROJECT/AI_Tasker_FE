import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/app/dashboard');
  };

  return (
    <div>
      <h2 className="font-headline-lg text-headline-lg mb-2 text-on-surface">
        Đăng nhập
      </h2>
      <p className="font-body-md text-body-md text-secondary mb-8">
        Chào mừng trở lại hệ thống AIFlow.
      </p>

      <form className="space-y-6" onSubmit={handleLogin}>
        <div className="flex flex-col gap-2">
          <label className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface">
            Email công ty
          </label>
          <input
            type="email"
            placeholder="name@enterprise.com"
            className="bg-transparent border border-outline-variant rounded-lg px-4 py-3 font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface">
            Mật khẩu
          </label>
          <input
            type="password"
            placeholder="••••••••"
            className="bg-transparent border border-outline-variant rounded-lg px-4 py-3 font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-primary text-on-primary font-label-md text-label-md py-3 rounded-lg tactile-btn hover:bg-on-primary-fixed-variant"
        >
          Đăng nhập Hệ thống
        </button>
      </form>

      <p className="mt-6 text-cente font-body-md text-body-md text-secondary">
        Chưa có tài khoản?{' '}
        <Link to="#" className="text-primary hover:underline font-label-md">
          Đăng ký ngay
        </Link>
      </p>
    </div>
  );
}

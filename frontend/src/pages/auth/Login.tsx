import { useNavigate } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/dashboard');
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-lvl1 border border-slate-200">
      <h2 className="font-display font-semibold text-2xl tracking-tight mb-6 text-slate-900">
        Đăng nhập Hệ thống
      </h2>

      <form className="space-y-6" onSubmit={handleLogin}>
        <div className="flex flex-col gap-2">
          <label className="font-display font-semibold text-xs tracking-label uppercase text-slate-900">
            Email công ty
          </label>
          <input
            type="email"
            placeholder="name@enterprise.com"
            className="border border-slate-300 rounded px-4 py-2.5 text-base text-slate-900 focus:outline-none focus:border-[2px] focus:border-primary-container transition-colors"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-display font-semibold text-xs tracking-label uppercase text-slate-900">
            Mật khẩu
          </label>
          <input
            type="password"
            placeholder="••••••••"
            className="border border-slate-300 rounded px-4 py-2.5 text-base text-slate-900 focus:outline-none focus:border-[2px] focus:border-primary-container transition-colors"
          />
        </div>

        <button
          type="submit"
          className="btn-tactile w-full bg-primary-container text-white font-display font-semibold text-sm px-6 py-3 rounded border-b-[3px] border-primary hover:bg-primary hover:shadow-lvl2"
        >
          Đăng nhập Hệ thống
        </button>
      </form>
    </div>
  );
}

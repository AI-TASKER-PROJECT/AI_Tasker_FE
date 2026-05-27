import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Branding (Ẩn trên mobile, hiện trên màn hình lớn) */}
      <div className="hidden lg:flex flex-1 bg-primary-container text-white p-16 flex-col justify-center">
        <h1 className="font-display font-bold text-5xl mb-4">
          Precision Tactility
        </h1>
        <p className="text-xl opacity-90 max-w-md">
          Hệ thống kết nối Chuyên gia AI và Doanh nghiệp Enterprise.
        </p>
      </div>

      {/* Vùng chứa Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

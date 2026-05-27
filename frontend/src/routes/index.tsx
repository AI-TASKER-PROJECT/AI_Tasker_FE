import { createBrowserRouter } from 'react-router-dom';

// Import các Layouts
import AuthLayout from '../layouts/AuthLayout';
import DashboardLayout from '../layouts/DashboardLayout';

// Import các Pages
import Login from '../pages/auth/Login';
import Overview from '../pages/dashboard/Overview';

export const router = createBrowserRouter([
  {
    // Nhóm 1: Dành cho xác thực (Login, Register...)
    path: '/auth',
    element: <AuthLayout />,
    children: [
      {
        path: 'login', // Sẽ ghép thành: /auth/login
        element: <Login />,
      },
    ],
  },
  {
    // Nhóm 2: Dành cho hệ thống bên trong (Cần đăng nhập)
    path: '/',
    element: <DashboardLayout />,
    children: [
      {
        path: 'dashboard', // Sẽ ghép thành: /dashboard
        element: <Overview />,
      },
      // Chỗ này để sẵn cho các task sau:
      // { path: "jobs", element: <Jobs /> },
      // { path: "contracts", element: <Contracts /> },
    ],
  },
  {
    // Bắt lỗi 404 cho TẤT CẢ các đường dẫn gõ sai
    path: '*',
    element: (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <h1 className="text-2xl font-bold text-slate-900">
          404 - Không tìm thấy trang
        </h1>
      </div>
    ),
  },
]);

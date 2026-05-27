import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout';
import Overview from '../pages/dashboard/Overview';
import AuthLayout from '../layouts/AuthLayout';
import Login from '../pages/auth/Login';
// Lưu ý: Nếu bạn sử dụng React Router v6+, cấu trúc này sẽ giúp bọc Layout bên ngoài Page một cách sạch sẽ.
const AppRoutes: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* Route của phân hệ Dashboard */}
        <Route
          path="/dashboard/overview"
          element={
            <DashboardLayout>
              <Overview />
            </DashboardLayout>
          }
        />
  {/* THÊM MỚI: Route của trang Login */}
        <Route 
          path="/login" 
          element={
            <AuthLayout>
              <Login />
            </AuthLayout>
            /* Lưu ý: Nếu bạn chưa code AuthLayout, chỉ cần viết gọn là: element={<Login />} */
          } 
        />
        {/* Bạn có thể thêm các route khác tại đây (ví dụ LandingPage, Login) */}
      </Routes>
    </Router>
  );
};

export default AppRoutes;

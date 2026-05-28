import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout';
import Overview from '../pages/dashboard/Overview';
import AuthLayout from '../layouts/AuthLayout';
import Login from '../pages/auth/Login';
import BusinessRegistration from '../pages/auth/BusinessRegistration';
import BusinessVerification from '../pages/auth/BusinessVerification';
import RegistrationComplete from '../pages/auth/RegistrationComplete';
import PendingVerification from '../pages/dashboard/PendingVerification';
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
          }
        />

        <Route
          path="/auth/register-business"
          element={<BusinessRegistration />}
        />
        <Route
          path="/auth/verify-business"
          element={<BusinessVerification />}
        />

        <Route
          path="/auth/registration-complete"
          element={<RegistrationComplete />}
        />
        <Route 
          path="/dashboard/pending" 
          element={<PendingVerification />} />
      </Routes>
    </Router>
  );
};

export default AppRoutes;

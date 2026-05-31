import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from '@/pages/auth/LoginPage';
import ChooseRolePage from '@/pages/auth/ChooseRolePage';
import HomePage from '@/pages/home/HomePage';
import BusinessHomePage from '@/pages/business/BusinessHomePage';
import AuthLayout from '@/widgets/layouts/AuthLayout';
import DashboardLayout from '@/widgets/layouts/DashboardLayout';
import { ROUTE_PATHS } from './routePaths';

const AppRoutes: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route index element={<HomePage />} />
          <Route path="dashboard/overview" element={<HomePage />} />
        </Route>

        <Route element={<AuthLayout />}>
          <Route path="login" element={<LoginPage />} />
        </Route>

        <Route path="register" element={<ChooseRolePage />} />
        <Route path="business" element={<BusinessHomePage />} />
        <Route
          path="bussiness"
          element={<Navigate replace to={ROUTE_PATHS.business} />}
        />
        <Route path="*" element={<Navigate replace to={ROUTE_PATHS.home} />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;

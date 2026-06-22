import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { AppShell } from "../layouts/AppLayout";
import { PublicShell } from "../layouts/PublicLayout";
import { getSession } from "../context/sessionContext";
import { LoginPage, RegisterPage } from "../pages/AuthPages";
import {
  AccountsPage,
  AdminWithdrawalPage,
  AnalyticsPage,
  AuditLogsPage,
  MasterDataPage,
  ReportsPage,
  SettingsPage,
  StaffPage,
  SystemWalletPage,
} from "../pages/AdminPages";
import { DashboardPage, NotificationsPage } from "../pages/DashboardPages";
import { WalletPage, MembershipPage } from "../pages/PaymentPages";
import {
  ContractDetailPage,
  ContractsPage,
  FinancePage,
  ReviewsPage,
  WorkspacePage,
} from "../pages/ContractPages";
import {
  CreateJobPage,
  ManageJobPage,
  MyJobsPage,
  OpportunitiesPage,
  ProposalsPage,
  SubmitProposalPage,
} from "../pages/MarketplacePages";
import {
  ExpertPortfolioPage,
  MyPublicBusinessProfilePage,
  MyPublicExpertProfilePage,
  PublicBusinessProfilePage,
  PublicExpertProfilePage,
} from "../pages/ProfilePages";
import {
  BusinessVerificationProfilePage,
  ExpertVerificationProfilePage,
} from "../pages/ProfilePages/VerificationProfilePages";
import {
  ExpertDirectoryPage,
  JobDetailPage,
  JobsPage,
  LandingPage,
} from "../pages/PublicPages";
import {
  DisputeDetailPage,
  DisputesPage,
  NewDisputePage,
  VerificationDetailPage,
  VerificationsPage,
} from "../pages/RiskPages";
import { Card, LinkButton } from "../components/ui";

function ProtectedRoute() {
  if (!getSession()) return <Navigate to="/login" replace />;
  return <AppShell />;
}

function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.22 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicShell />}>
        <Route index element={<LandingPage />} />
        <Route path="home" element={<LandingPage />} />
        <Route path="how-it-works" element={<LandingPage />} />
        <Route path="about" element={<LandingPage />} />
        <Route path="jobs" element={<JobsPage />} />
        <Route path="jobs/:jobId" element={<JobDetailPage />} />
        <Route path="experts" element={<ExpertDirectoryPage />} />
        <Route
          path="business-profile/:businessId"
          element={
            <PageTransition>
              <PublicBusinessProfilePage />
            </PageTransition>
          }
        />
        <Route
          path="expert-profile/:expertId"
          element={
            <PageTransition>
              <PublicExpertProfilePage />
            </PageTransition>
          }
        />
      </Route>
      <Route path="login" element={<LoginPage />} />
      <Route path="register" element={<RegisterPage />} />

      <Route path="app" element={<ProtectedRoute />}>
        <Route
          index
          element={
            <PageTransition>
              <DashboardPage />
            </PageTransition>
          }
        />
        <Route
          path="notifications"
          element={
            <PageTransition>
              <NotificationsPage />
            </PageTransition>
          }
        />

        {/* Jobs */}
        <Route
          path="jobs"
          element={
            <PageTransition>
              <MyJobsPage />
            </PageTransition>
          }
        />
        <Route
          path="jobs/new"
          element={
            <PageTransition>
              <CreateJobPage />
            </PageTransition>
          }
        />
        <Route
          path="jobs/:jobId/manage"
          element={
            <PageTransition>
              <ManageJobPage />
            </PageTransition>
          }
        />
        <Route
          path="jobs/:jobId/proposal"
          element={
            <PageTransition>
              <SubmitProposalPage />
            </PageTransition>
          }
        />
        <Route
          path="business/profile"
          element={
            <PageTransition>
              <BusinessVerificationProfilePage />
            </PageTransition>
          }
        />
        <Route
          path="business/public-profile"
          element={
            <PageTransition>
              <MyPublicBusinessProfilePage />
            </PageTransition>
          }
        />
        <Route
          path="businesses/:businessId"
          element={
            <PageTransition>
              <PublicBusinessProfilePage />
            </PageTransition>
          }
        />

        {/* Expert */}
        <Route
          path="opportunities"
          element={
            <PageTransition>
              <OpportunitiesPage />
            </PageTransition>
          }
        />
        <Route
          path="proposals"
          element={
            <PageTransition>
              <ProposalsPage />
            </PageTransition>
          }
        />
        <Route
          path="expert/profile"
          element={
            <PageTransition>
              <ExpertVerificationProfilePage />
            </PageTransition>
          }
        />
        <Route
          path="expert/public-profile"
          element={
            <PageTransition>
              <MyPublicExpertProfilePage />
            </PageTransition>
          }
        />
        <Route
          path="expert/portfolio"
          element={
            <PageTransition>
              <ExpertPortfolioPage />
            </PageTransition>
          }
        />
        <Route
          path="experts/:expertId"
          element={
            <PageTransition>
              <PublicExpertProfilePage />
            </PageTransition>
          }
        />

        {/* Contracts */}
        <Route
          path="contracts"
          element={
            <PageTransition>
              <ContractsPage />
            </PageTransition>
          }
        />
        <Route
          path="contracts/:contractId"
          element={
            <PageTransition>
              <ContractDetailPage />
            </PageTransition>
          }
        />
        <Route
          path="contracts/:contractId/workspace"
          element={
            <PageTransition>
              <WorkspacePage />
            </PageTransition>
          }
        />
        <Route
          path="finance"
          element={
            <PageTransition>
              <FinancePage />
            </PageTransition>
          }
        />
        <Route
          path="reviews"
          element={
            <PageTransition>
              <ReviewsPage />
            </PageTransition>
          }
        />

        {/* Payment */}
        <Route
          path="wallet"
          element={
            <PageTransition>
              <WalletPage />
            </PageTransition>
          }
        />
        <Route
          path="membership"
          element={
            <PageTransition>
              <MembershipPage />
            </PageTransition>
          }
        />

        {/* Disputes */}
        <Route
          path="disputes"
          element={
            <PageTransition>
              <DisputesPage />
            </PageTransition>
          }
        />
        <Route
          path="disputes/new"
          element={
            <PageTransition>
              <NewDisputePage />
            </PageTransition>
          }
        />
        <Route
          path="disputes/:disputeId"
          element={
            <PageTransition>
              <DisputeDetailPage />
            </PageTransition>
          }
        />

        {/* Staff */}
        <Route
          path="tickets"
          element={
            <PageTransition>
              <DisputesPage staffMode />
            </PageTransition>
          }
        />
        <Route
          path="tickets/:disputeId"
          element={
            <PageTransition>
              <DisputeDetailPage staffMode />
            </PageTransition>
          }
        />
        <Route
          path="verifications"
          element={
            <PageTransition>
              <VerificationsPage />
            </PageTransition>
          }
        />
        <Route
          path="verifications/:type/:id"
          element={
            <PageTransition>
              <VerificationDetailPage />
            </PageTransition>
          }
        />

        {/* Admin */}
        <Route
          path="admin/analytics"
          element={
            <PageTransition>
              <AnalyticsPage />
            </PageTransition>
          }
        />
        <Route
          path="admin/wallet"
          element={
            <PageTransition>
              <SystemWalletPage />
            </PageTransition>
          }
        />
        <Route
          path="admin/withdrawals"
          element={
            <PageTransition>
              <AdminWithdrawalPage />
            </PageTransition>
          }
        />
        <Route
          path="admin/accounts"
          element={
            <PageTransition>
              <AccountsPage />
            </PageTransition>
          }
        />
        <Route
          path="admin/staff"
          element={
            <PageTransition>
              <StaffPage />
            </PageTransition>
          }
        />
        <Route
          path="admin/settings"
          element={
            <PageTransition>
              <SettingsPage />
            </PageTransition>
          }
        />
        <Route
          path="admin/master-data"
          element={
            <PageTransition>
              <MasterDataPage />
            </PageTransition>
          }
        />
        <Route
          path="admin/audit-logs"
          element={
            <PageTransition>
              <AuditLogsPage />
            </PageTransition>
          }
        />
        <Route
          path="admin/reports"
          element={
            <PageTransition>
              <ReportsPage />
            </PageTransition>
          }
        />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f7faff] px-4">
      <Card className="max-w-lg p-8 text-center">
        <p className="font-display text-6xl font-black text-brand-600">404</p>
        <h1 className="mt-4 font-display text-2xl font-black text-ink">
          Không tìm thấy giao diện
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Route này chưa được định nghĩa. Tất cả màn hình chính đều có trong
          navigation theo role.
        </p>
        <div className="mt-6">
          <LinkButton to="/">Về trang chủ</LinkButton>
        </div>
      </Card>
    </main>
  );
}

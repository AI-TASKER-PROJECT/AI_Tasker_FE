# Screen Map

Tài liệu này tổng hợp các màn hình đang được khai báo trong router của frontend tại [src/routes/index.tsx](src/routes/index.tsx) và đối chiếu với layout/navigation hiện tại.

## Tổng quan

- Tổng số route entries trong router: `48`
- Tổng số screen components unique đang được dùng bởi router: `43`
- Layout public: [src/layouts/PublicLayout/PublicLayout.tsx](D:/Projesct-tong/be-project/AI_Tasker_FE/src/layouts/PublicLayout/PublicLayout.tsx)
- Layout sau đăng nhập: [src/layouts/AppLayout/AppLayout.tsx](D:/Projesct-tong/be-project/AI_Tasker_FE/src/layouts/AppLayout/AppLayout.tsx)
- Guard đăng nhập: `ProtectedRoute`
- Màn hình fallback: `* -> NotFoundPage`

## Quy ước đọc tài liệu

- `Shell`: layout bao ngoài của màn hình
- `Access`: nhóm người dùng có thể vào màn hình theo router/navigation hiện tại
- `Shared`: nhiều route cùng render một component

## 1. Public routes

| Route | Screen | Component | Shell | Access | Ghi chú |
|---|---|---|---|---|---|
| `/` | Landing page | `LandingPage` | `PublicShell` | Public | Trang chủ marketing |
| `/how-it-works` | Landing page | `LandingPage` | `PublicShell` | Public | Shared với `/` |
| `/about` | Landing page | `LandingPage` | `PublicShell` | Public | Shared với `/` |
| `/jobs` | Jobs page | `JobsPage` | `PublicShell` | Public | Danh sách job công khai |
| `/jobs/:jobId` | Job detail | `JobDetailPage` | `PublicShell` | Public | Chi tiết job công khai |
| `/experts` | Expert directory | `ExpertDirectoryPage` | `PublicShell` | Public | Danh bạ chuyên gia AI |
| `/business-profile/:businessId` | Public business profile | `PublicBusinessProfilePage` | `PublicShell` | Public | Hồ sơ doanh nghiệp công khai |
| `/expert-profile/:expertId` | Public expert profile | `PublicExpertProfilePage` | `PublicShell` | Public | Hồ sơ chuyên gia công khai |
| `/login` | Login | `LoginPage` | none | Public | Đăng nhập, có luồng Google auth |
| `/register` | Register | `RegisterPage` | none | Public | Đăng ký Business/Expert |

## 2. App routes sau đăng nhập

Tất cả route dưới `/app` đi qua `ProtectedRoute` và render trong `AppShell`.

| Route | Screen | Component | Access | Ghi chú |
|---|---|---|---|---|
| `/app` | Dashboard | `DashboardPage` | All authenticated roles | Màn tổng quan theo role |
| `/app/notifications` | Notifications center | `NotificationsPage` | All authenticated roles | Trung tâm thông báo |

### Business

| Route | Screen | Component | Access | Ghi chú |
|---|---|---|---|---|
| `/app/jobs` | My jobs | `MyJobsPage` | Business | Danh sách job của tôi |
| `/app/jobs/new` | Create job | `CreateJobPage` | Business | AI Job Assistant tạo job |
| `/app/jobs/:jobId/manage` | Manage job | `ManageJobPage` | Business | Quản lý job, proposal, gợi ý AI |
| `/app/business/profile` | Business verification profile | `BusinessVerificationProfilePage` | Business | Hồ sơ KYB |
| `/app/business/public-profile` | My public business profile | `MyPublicBusinessProfilePage` | Business | Trang public profile của chính tôi |
| `/app/businesses/:businessId` | Public business profile | `PublicBusinessProfilePage` | Authenticated | Bản xem trong app của hồ sơ doanh nghiệp |

### Expert

| Route | Screen | Component | Access | Ghi chú |
|---|---|---|---|---|
| `/app/opportunities` | Opportunities | `OpportunitiesPage` | Expert | Cơ hội dự án cho chuyên gia |
| `/app/jobs/:jobId/proposal` | Submit proposal | `SubmitProposalPage` | Expert | Nộp báo giá cho job |
| `/app/proposals` | My proposals | `ProposalsPage` | Expert | Danh sách proposal đã gửi |
| `/app/expert/profile` | Expert verification profile | `ExpertVerificationProfilePage` | Expert | Hồ sơ KYC |
| `/app/expert/public-profile` | My public expert profile | `MyPublicExpertProfilePage` | Expert | Trang public profile của chính tôi |
| `/app/expert/portfolio` | Expert portfolio | `ExpertPortfolioPage` | Expert | Portfolio năng lực AI |
| `/app/experts/:expertId` | Public expert profile | `PublicExpertProfilePage` | Authenticated | Bản xem trong app của hồ sơ chuyên gia |

### Contracts, finance, disputes

| Route | Screen | Component | Access | Ghi chú |
|---|---|---|---|---|
| `/app/contracts` | Contracts | `ContractsPage` | Business, Expert | Danh sách hợp đồng |
| `/app/contracts/:contractId` | Contract detail | `ContractDetailPage` | Business, Expert | Chi tiết vòng đời contract |
| `/app/contracts/:contractId/workspace` | Workspace | `WorkspacePage` | Business, Expert | Milestone, deliverable, execution |
| `/app/finance` | Finance | `FinancePage` | Business, Expert | Tài chính/escrow/invoice |
| `/app/reviews` | Reviews | `ReviewsPage` | Business, Expert | Đánh giá chéo |
| `/app/wallet` | Wallet | `WalletPage` | Business, Expert | Ví, lịch sử giao dịch, rút tiền |
| `/app/membership` | Membership | `MembershipPage` | Business, Expert | Gói thành viên và credit |
| `/app/disputes` | Disputes | `DisputesPage` | Business, Expert | Danh sách tranh chấp |
| `/app/disputes/new` | New dispute | `NewDisputePage` | Business, Expert | Tạo tranh chấp mới |
| `/app/disputes/:disputeId` | Dispute detail | `DisputeDetailPage` | Business, Expert | Chi tiết tranh chấp |

### Staff

| Route | Screen | Component | Access | Ghi chú |
|---|---|---|---|---|
| `/app/tickets` | Tickets | `DisputesPage` | Staff, Admin | Shared component với disputes, bật `staffMode` |
| `/app/tickets/:disputeId` | Ticket detail | `DisputeDetailPage` | Staff, Admin | Shared component với dispute detail, bật `staffMode` |
| `/app/verifications` | Verifications | `VerificationsPage` | Staff, Admin | Danh sách duyệt KYC/KYB |
| `/app/verifications/:type/:id` | Verification detail | `VerificationDetailPage` | Staff, Admin | Chi tiết xử lý hồ sơ xác minh |

### Admin

| Route | Screen | Component | Access | Ghi chú |
|---|---|---|---|---|
| `/app/admin/analytics` | Analytics | `AnalyticsPage` | Admin, Staff | Staff cũng thấy qua navigation |
| `/app/admin/wallet` | System wallet | `SystemWalletPage` | Admin | Ví hệ thống |
| `/app/admin/withdrawals` | Withdrawal management | `AdminWithdrawalPage` | Admin | Duyệt/từ chối yêu cầu rút tiền |
| `/app/admin/accounts` | Account management | `AccountsPage` | Admin | CRUD tài khoản |
| `/app/admin/staff` | Staff management | `StaffPage` | Admin | Quản lý staff |
| `/app/admin/settings` | System settings | `SettingsPage` | Admin, Staff | Staff cũng thấy qua navigation |
| `/app/admin/master-data` | Catalog management | `MasterDataPage` | Admin | Domain, skill, acceptance criteria |
| `/app/admin/audit-logs` | Audit logs | `AuditLogsPage` | Admin | Nhật ký audit |
| `/app/admin/reports` | Reports & export | `ReportsPage` | Admin | Bộ lọc và preview báo cáo |

## 3. Route fallback

| Route | Screen | Component | Access | Ghi chú |
|---|---|---|---|---|
| `*` | Not found | `NotFoundPage` | Public | Trang 404 nội bộ |

## 4. Map theo file page

| File | Exports liên quan đến màn hình |
|---|---|
| [src/pages/PublicPages/PublicPages.helpers.tsx](D:/Projesct-tong/be-project/AI_Tasker_FE/src/pages/PublicPages/PublicPages.helpers.tsx) | `LandingPage`, `JobsPage`, `JobDetailPage`, `ExpertDirectoryPage` |
| [src/pages/AuthPages/AuthPages.helpers.tsx](D:/Projesct-tong/be-project/AI_Tasker_FE/src/pages/AuthPages/AuthPages.helpers.tsx) | `LoginPage`, `RegisterPage` |
| [src/pages/DashboardPages/DashboardPages.helpers.tsx](D:/Projesct-tong/be-project/AI_Tasker_FE/src/pages/DashboardPages/DashboardPages.helpers.tsx) | `DashboardPage`, `NotificationsPage` |
| [src/pages/ProfilePages/VerificationProfilePages.tsx](D:/Projesct-tong/be-project/AI_Tasker_FE/src/pages/ProfilePages/VerificationProfilePages.tsx) | `BusinessVerificationProfilePage`, `ExpertVerificationProfilePage` |
| [src/pages/ProfilePages/ProfilePages.helpers.tsx](D:/Projesct-tong/be-project/AI_Tasker_FE/src/pages/ProfilePages/ProfilePages.helpers.tsx) | `BusinessProfilePage`, `ExpertProfilePage`, `ExpertPortfolioPage`, `MyPublicBusinessProfilePage`, `MyPublicExpertProfilePage`, `PublicBusinessProfilePage`, `PublicExpertProfilePage` |
| [src/pages/MarketplacePages/MyJobsPage/MyJobsPage.tsx](D:/Projesct-tong/be-project/AI_Tasker_FE/src/pages/MarketplacePages/MyJobsPage/MyJobsPage.tsx) | `MyJobsPage` |
| [src/pages/MarketplacePages/CreateJobPage/CreateJobPage.tsx](D:/Projesct-tong/be-project/AI_Tasker_FE/src/pages/MarketplacePages/CreateJobPage/CreateJobPage.tsx) | `CreateJobPage` |
| [src/pages/MarketplacePages/ManageJobPage/ManageJobPage.tsx](D:/Projesct-tong/be-project/AI_Tasker_FE/src/pages/MarketplacePages/ManageJobPage/ManageJobPage.tsx) | `ManageJobPage` |
| [src/pages/MarketplacePages/OpportunitiesPage/OpportunitiesPage.tsx](D:/Projesct-tong/be-project/AI_Tasker_FE/src/pages/MarketplacePages/OpportunitiesPage/OpportunitiesPage.tsx) | `OpportunitiesPage` |
| [src/pages/MarketplacePages/SubmitProposalPage/SubmitProposalPage.tsx](D:/Projesct-tong/be-project/AI_Tasker_FE/src/pages/MarketplacePages/SubmitProposalPage/SubmitProposalPage.tsx) | `SubmitProposalPage` |
| [src/pages/MarketplacePages/ProposalsPage/ProposalsPage.tsx](D:/Projesct-tong/be-project/AI_Tasker_FE/src/pages/MarketplacePages/ProposalsPage/ProposalsPage.tsx) | `ProposalsPage` |
| [src/pages/ContractPages/ContractPages.helpers.tsx](D:/Projesct-tong/be-project/AI_Tasker_FE/src/pages/ContractPages/ContractPages.helpers.tsx) | `ContractsPage`, `ContractDetailPage`, `WorkspacePage`, `FinancePage`, `ReviewsPage` |
| [src/pages/PaymentPages/WalletPage/WalletPage.tsx](D:/Projesct-tong/be-project/AI_Tasker_FE/src/pages/PaymentPages/WalletPage/WalletPage.tsx) | `WalletPage` |
| [src/pages/PaymentPages/MembershipPage/MembershipPage.tsx](D:/Projesct-tong/be-project/AI_Tasker_FE/src/pages/PaymentPages/MembershipPage/MembershipPage.tsx) | `MembershipPage` |
| [src/pages/RiskPages/RiskPages.helpers.tsx](D:/Projesct-tong/be-project/AI_Tasker_FE/src/pages/RiskPages/RiskPages.helpers.tsx) | `DisputesPage`, `DisputeDetailPage`, `VerificationsPage`, `VerificationDetailPage`, `NewDisputePage` |
| [src/pages/AdminPages/AdminPages.helpers.tsx](D:/Projesct-tong/be-project/AI_Tasker_FE/src/pages/AdminPages/AdminPages.helpers.tsx) | `AnalyticsPage`, `SystemWalletPage`, `AccountsPage`, `StaffPage`, `SettingsPage`, `MasterDataPage`, `AuditLogsPage`, `ReportsPage` |
| [src/pages/AdminPages/WithdrawalPage/WithdrawalPage.tsx](D:/Projesct-tong/be-project/AI_Tasker_FE/src/pages/AdminPages/WithdrawalPage/WithdrawalPage.tsx) | `AdminWithdrawalPage` |

## 5. Ghi chú quan trọng

- `LandingPage` đang được dùng cho cả `/`, `/how-it-works`, và `/about`, nghĩa là hiện chưa tách thành ba màn hình nội dung riêng.
- `DisputesPage` và `DisputeDetailPage` được tái sử dụng cho cả user flow và staff flow thông qua prop `staffMode`.
- Router không có guard role tường minh cho từng route; việc giới hạn truy cập chủ yếu đang diễn ra ở navigation, session hiện tại và logic trong từng page.
- Trong `AppShell`, tài khoản `BUSINESS` và `EXPERT` chưa được `Approved` sẽ bị ép về route xác minh tương ứng, ngoại trừ `/app/notifications`.

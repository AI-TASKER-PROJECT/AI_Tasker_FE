# Frontend Functional Requirements

Nguon phan tich: `src/routes/index.tsx`, `src/pages/**`, `src/services/**`, `src/layouts/**`.

## Feature: Public Website & Discovery

### Function: Xem landing page
- **Function Trigger:** Nguoi dung truy cap `/`, `/home`, `/how-it-works`, `/about`.
- **Function Description:** Hien thi trang gioi thieu AITASKER, CTA dang nhap/dang ky, quy trinh, FAQ va dieu huong cong khai.
- **Screen Layout:** Chup giao dien `LandingPage` tai route `/home`.
- **Function Details:** Public shell co header, nav public, footer; CTA dua nguoi dung toi `/login`, `/register`, danh sach job public hoac expert directory.

### Function: Xem danh sach job public
- **Function Trigger:** Chon menu "Doanh nghiep" hoac truy cap `/business`.
- **Function Description:** Hien thi cac job dang mo cho khach hoac user xem co hoi du an.
- **Screen Layout:** Chup giao dien `JobsPage` tai route `/business`.
- **Function Details:** Goi `marketplaceApi.listJobs`, lay domain/skill/technology va milestone de hien thi card job, badge linh vuc, ngan sach, thoi gian va link xem chi tiet.

### Function: Xem chi tiet job public
- **Function Trigger:** Bam card job hoac truy cap `/jobs/:jobId`.
- **Function Description:** Hien thi thong tin job, domain, skill, technology, milestone, thong tin doanh nghiep va CTA nop proposal.
- **Screen Layout:** Chup giao dien `JobDetailPage` tai route `/jobs/{jobId}`.
- **Function Details:** Goi `marketplaceApi.getJob`, `catalogApi.listJobDomains/listJobSkills/listJobTechnologies`, `contractApi.listJobMilestones`, `profileApi.getBusinessByJob`; neu la expert co the di toi `/app/jobs/:jobId/proposal`, khach thi duoc dan toi login.

### Function: Xem danh ba chuyen gia
- **Function Trigger:** Chon menu "Chuyen gia" hoac truy cap `/experts`.
- **Function Description:** Trang gioi thieu danh ba expert va CTA bat dau dang du an.
- **Screen Layout:** Chup giao dien `ExpertDirectoryPage` tai route `/experts`.
- **Function Details:** Hien thi noi dung public, CTA tao du an/dieu huong quy trinh.

### Function: Xem profile public cua doanh nghiep/chuyen gia
- **Function Trigger:** Truy cap `/business-profile/:businessId`, `/expert-profile/:expertId`, hoac link trong app `/app/businesses/:businessId`, `/app/experts/:expertId`.
- **Function Description:** Cho phep xem thong tin cong khai, portfolio, viec dang tuyen hoac nang luc cua doi tac.
- **Screen Layout:** Chup `PublicBusinessProfilePage` va `PublicExpertProfilePage`.
- **Function Details:** Business profile lay `profileApi.getBusinessById` va job cua business; expert profile lay `profileApi.getExpertById`, portfolio, catalog domain/skill/technology.

## Feature: Authentication & Session

### Function: Dang nhap bang email/password
- **Function Trigger:** Submit form tai `/login`.
- **Function Description:** Xac thuc user, luu session va dieu huong vao workspace.
- **Screen Layout:** Chup `LoginPage` tai route `/login`.
- **Function Details:** Goi `authApi.login`; validate email/password; sau thanh cong `saveSession` va `navigate('/app')`.

### Function: Dang nhap/dang ky bang Google
- **Function Trigger:** Bam Google auth button tai `/login` hoac `/register`.
- **Function Description:** Xac thuc Google; neu can bo sung role/phone thi hien form hoan tat thong tin.
- **Screen Layout:** Chup modal/form Google signup trong `LoginPage` hoac `RegisterPage`.
- **Function Details:** Goi `authApi.googleLogin` hoac `authApi.googleSignup`; user chon role BUSINESS/EXPERT va nhap phone khi dang ky moi.

### Function: Dang ky tai khoan va xac thuc OTP
- **Function Trigger:** Submit form `/register`, sau do nhap OTP.
- **Function Description:** Tao tai khoan BUSINESS/EXPERT, gui OTP email va xac minh truoc khi vao app.
- **Screen Layout:** Chup `RegisterPage` buoc form dang ky va buoc OTP.
- **Function Details:** Goi `authApi.checkEmail`, `authApi.sendOtp`, `authApi.verifyOtp`, `authApi.register`; co chuc nang gui lai OTP.

### Function: Quen mat khau / dat lai mat khau
- **Function Trigger:** Submit email tai `/forgot-password`, hoac submit mat khau moi tai `/reset-password?token=...`.
- **Function Description:** Gui yeu cau reset password va cap nhat mat khau moi bang token.
- **Screen Layout:** Chup `ForgotPasswordPage` va `ResetPasswordPage`.
- **Function Details:** Goi `authApi.forgotPassword` va `authApi.resetPassword`; reset thanh cong dieu huong ve login.

### Function: Bao ve route theo role va trang thai duyet
- **Function Trigger:** Truy cap cac route `/app/**`.
- **Function Description:** Chan user chua login, chan role khong hop le, va bat BUSINESS/EXPERT chua Approved quay ve man ho so.
- **Screen Layout:** Chup AppShell khi user dang nhap va case profile pending/rejected.
- **Function Details:** `ProtectedRoute`, `RoleProtectedRoute`, `AppShell` kiem tra session, role va `accountStatus`; nav thay doi theo role.

## Feature: App Shell, Navigation, Notification & Chat

### Function: Dieu huong workspace theo role
- **Function Trigger:** Dang nhap va vao `/app`.
- **Function Description:** Hien sidebar menu khac nhau cho BUSINESS, EXPERT, STAFF, ADMIN.
- **Screen Layout:** Chup `AppShell` dashboard voi sidebar.
- **Function Details:** BUSINESS co ho so, du an, hop dong, tai chinh, vi, tranh chap, membership, danh gia; EXPERT co co hoi, proposals, portfolio; STAFF co duyet ho so/ticket; ADMIN co wallet, withdrawals, accounts, analytics, master data, audit logs.

### Function: Xem va xu ly thong bao
- **Function Trigger:** Bam icon notification tren AppShell hoac truy cap `/app/notifications`.
- **Function Description:** Hien danh sach notification, unread count, mark read, mark all read, mo notification center.
- **Screen Layout:** Chup notification dropdown va `NotificationsPage`.
- **Function Details:** Goi `notificationApi.list`, `unreadCount`, `markRead`, `markAllRead`; ket noi realtime qua `connectNotificationSocket`.

### Function: Chatbot ho tro
- **Function Trigger:** Su dung `ChatBox` trong AppShell.
- **Function Description:** Cho phep nguoi dung hoi dap nhanh voi chatbot.
- **Screen Layout:** Chup widget `ChatBox` trong bat ky man `/app`.
- **Function Details:** Goi `chatbotService` toi `/api/chatbot/ask` de nhan cau tra loi.

### Function: Nap tien nhanh tu header/app shell
- **Function Trigger:** Bam "Nap tien" trong user menu hoac event `aitasker:open-wallet-topup`.
- **Function Description:** Tao ma thanh toan payOS, hien QR/link checkout, tu dong sync trang thai.
- **Screen Layout:** Chup modal top-up trong `AppShell`.
- **Function Details:** Goi `paymentApi.createWalletTopup`, tao QR bang `qrcode`, poll `paymentApi.syncWalletTopup`, reload wallet/quota khi PAID.

## Feature: Dashboard

### Function: Xem tong quan workspace
- **Function Trigger:** Truy cap `/app`.
- **Function Description:** Hien cac chi so va danh sach gan day tuy theo role.
- **Screen Layout:** Chup `DashboardPage`.
- **Function Details:** Lay jobs, contracts, notifications, profile, staff verification/dispute/proposal tuy role; hien quick links den notification, contracts va workflow lien quan.

## Feature: Business Job Management

### Function: Xem danh sach du an cua toi
- **Function Trigger:** BUSINESS chon `/app/jobs`.
- **Function Description:** Hien danh sach job cua doanh nghiep, filter/search/pagination va thao tac status.
- **Screen Layout:** Chup `MyJobsPage`.
- **Function Details:** Goi `marketplaceApi.listMyJobs`, `catalogApi.listDomains`, `catalogApi.listJobDomains`; cho mo/tri hoan/dong job bang `marketplaceApi.updateJobStatus`.

### Function: Tao hoac sua job bang wizard
- **Function Trigger:** Bam "Tao du an" `/app/jobs/new` hoac sua `/app/jobs/:jobId/edit`.
- **Function Description:** BUSINESS nhap thong tin job, domain/skill/technology, tao SoW bang AI, chinh milestone/criteria, luu draft hoac publish.
- **Screen Layout:** Chup `CreateJobPage` tai cac buoc wizard: thong tin job, SoW preview, milestones.
- **Function Details:** Goi catalog APIs, `userQuotaApi.getCurrent`, `sowService.generateSow`, `marketplaceApi.createJob/updateDraftJob/updateJobStatus`, `catalogApi.replaceJobDomains/replaceJobSkills`, `contractApi.createMilestone/createCriteria`; co undo milestone, reorder, validate budget/quota.

### Function: Xem chi tiet job cua business
- **Function Trigger:** Mo `/app/jobs/:jobId/detail`.
- **Function Description:** Hien thong tin job, domain/skill/technology, milestone va trang thai.
- **Screen Layout:** Chup `MyJobDetailPage`.
- **Function Details:** Goi `marketplaceApi.getJob`, catalog job assignments, `contractApi.listJobMilestones`; co thao tac doi status neu hop le.

### Function: Quan ly proposal cho job
- **Function Trigger:** Mo `/app/jobs/:jobId/manage`.
- **Function Description:** BUSINESS xem danh sach proposal, duyet/tu choi proposal, tao draft contract va xem de xuat expert recommendation.
- **Screen Layout:** Chup `ManageJobPage` gom proposal list, proposal detail modal va recommendation cards.
- **Function Details:** Goi `marketplaceApi.getJob/listProposals/reviewProposal`, `contractApi.createFromProposal`, `expertRecommendationApi.generate/get/select`, `profileApi.getExpertById/listPortfolios`, catalog APIs; co modal xem profile, proposal details va action accept/reject/contract.

## Feature: Expert Marketplace & Proposal

### Function: Tim co hoi du an
- **Function Trigger:** EXPERT truy cap `/app/opportunities`.
- **Function Description:** Hien job open, filter theo domain/skill/technology, pagination va link nop proposal.
- **Screen Layout:** Chup `OpportunitiesPage`.
- **Function Details:** Goi `marketplaceApi.listJobs`, catalog APIs; UI co MultiSelect filter, search/sort va JobCard.

### Function: Nop proposal
- **Function Trigger:** EXPERT bam nop proposal tren job, route `/app/jobs/:jobId/proposal`.
- **Function Description:** Expert tao proposal cho job, xem thong tin job/milestone/quota/portfolio va gui de xuat.
- **Screen Layout:** Chup `SubmitProposalPage`.
- **Function Details:** Goi `marketplaceApi.getJob/submitProposal`, catalog job APIs, `contractApi.listJobMilestones`, `profileApi.getMyPortfolio`, `userQuotaApi.getCurrent`, `profileApi.uploadProposalFile`; validate quota va noi dung proposal.

### Function: Quan ly proposal cua toi
- **Function Trigger:** EXPERT truy cap `/app/proposals`.
- **Function Description:** Hien danh sach proposal da nop, filter status/date, xem job lien quan va hop dong lien quan.
- **Screen Layout:** Chup `ProposalsPage`.
- **Function Details:** Goi `marketplaceApi.listMyProposals`, `marketplaceApi.getJob`, catalog APIs, `contractApi.listJobMilestones/listContracts`; co pagination va link detail.

### Function: Xem chi tiet proposal
- **Function Trigger:** Mo `/app/proposals/:proposalId`.
- **Function Description:** Hien noi dung proposal, job, milestone, trang thai va hop dong neu co.
- **Screen Layout:** Chup `ProposalDetailPage`.
- **Function Details:** Doc proposal tu danh sach proposal cua expert, ghep job/contract/catalog/milestone de hien thi full context.

## Feature: Profile & Verification

### Function: Cap nhat ho so doanh nghiep
- **Function Trigger:** BUSINESS mo `/app/business/profile` va submit form.
- **Function Description:** Tao/cap nhat profile doanh nghiep, upload GPKD, xem trang public va trang thai duyet.
- **Screen Layout:** Chup `BusinessProfilePage` tab overview/edit va modal xac nhan submit.
- **Function Details:** Goi `profileApi.getMyBusiness`, `profileApi.upsertBusiness`, `profileApi.uploadBusinessLicense`; neu account chua Approved thi UI han che navigation.

### Function: Cap nhat ho so chuyen gia
- **Function Trigger:** EXPERT mo `/app/expert/profile` va submit form.
- **Function Description:** Tao/cap nhat profile expert, thong tin lien he, chuyen mon va trang thai duyet.
- **Screen Layout:** Chup `ExpertProfilePage`.
- **Function Details:** Goi `profileApi.getMyExpert`, `profileApi.getMyPortfolio`, catalog APIs, `profileApi.upsertExpert`; co confirm modal truoc khi gui duyet.

### Function: Quan ly portfolio AI cua expert
- **Function Trigger:** EXPERT mo `/app/expert/portfolio`.
- **Function Description:** Nhap kinh nghiem, domain/skill/technology, upload chung chi va luu portfolio.
- **Screen Layout:** Chup `ExpertPortfolioPage`.
- **Function Details:** Goi `catalogApi.listDomains/listSkills/listTechnologies`, `profileApi.getMyPortfolio/getMyExpert`, `profileApi.uploadExpertCertificate`, `profileApi.upsertPortfolio`.

### Function: Xem profile public cua minh
- **Function Trigger:** BUSINESS mo `/app/business/public-profile`, EXPERT mo `/app/expert/public-profile`.
- **Function Description:** Dieu huong hoac render profile public cua user hien tai.
- **Screen Layout:** Chup `MyPublicBusinessProfilePage` va `MyPublicExpertProfilePage`.
- **Function Details:** Lay profile cua current user roi hien bang public profile component.

### Function: Duyet ho so business/expert
- **Function Trigger:** STAFF/ADMIN mo `/app/verifications` va `/app/verifications/:type/:id`.
- **Function Description:** Xem danh sach ho so cho duyet, chi tiet ho so, approve/reject kem ly do.
- **Screen Layout:** Chup `VerificationsPage` va `VerificationDetailPage`.
- **Function Details:** Goi `profileApi.listBusinesses/listExperts`, `profileApi.approve`, `profileApi.getFileViewUrl`; support status pending/approved/rejected.

### Function: Kiem tra ma so thue doanh nghiep
- **Function Trigger:** Trong business verification/profile form bam kiem tra MST.
- **Function Description:** Preview thong tin ma so thue de ho tro xac minh doanh nghiep.
- **Screen Layout:** Chup `BusinessVerificationProfilePage` neu route/module duoc dung.
- **Function Details:** Goi `profileApi.checkTaxCode`; hien ket qua, validate duplicate tax code.

## Feature: Contract Lifecycle

### Function: Xem danh sach hop dong
- **Function Trigger:** BUSINESS/EXPERT/ADMIN truy cap `/app/contracts`.
- **Function Description:** Hien hop dong theo status, progress va link chi tiet/workspace.
- **Screen Layout:** Chup `ContractsPage`.
- **Function Details:** Goi `contractApi.listContracts`; filter theo status; moi card co link detail va workspace.

### Function: Xem va xu ly chi tiet hop dong
- **Function Trigger:** Mo `/app/contracts/:contractId`.
- **Function Description:** Hien thong tin hop dong, party info, milestone, payment/deposit, action ky/reject/cancel/NDA/deposit.
- **Screen Layout:** Chup `ContractDetailPage`.
- **Function Details:** Goi `contractApi.getContract`, `listJobMilestones`, `listMilestones`, `disputeApi.listByContract`, profile participant APIs; actions gom `sign`, `signNda`, `rejectContract`, `cancelDraft`, `payDeposit/payExpertDeposit`; co polling sau deposit.

### Function: Lam viec tren workspace hop dong
- **Function Trigger:** Mo `/app/contracts/:contractId/workspace`.
- **Function Description:** Quan ly milestone execution: deposit milestone, start/complete/approve/reject, submit deliverable, progress report, dispute va termination.
- **Screen Layout:** Chup `WorkspacePage`, dac biet khu milestone, submission/progress report, modal deliverable/dispute/termination.
- **Function Details:** Goi `contractApi.listMilestones/listCriteria/listDeliverables/listProgressReports`, `depositMilestoneEscrow`, `startMilestone`, `completeMilestone`, `approveMilestone`, `rejectMilestone`, `submitDeliverable`, `submitProgressReport`, `requestProgressReport`, `acknowledgeProgressReport`, `feedbackProgressReport`, `checkOverdueMilestones`, `autoApproveReviewSla`; tao dispute qua `disputeApi.create/escalate`; termination qua cac API request/accept/dispute/approve/reject/settlement/refund.

### Function: Quan ly danh gia sau hop dong
- **Function Trigger:** BUSINESS/EXPERT mo `/app/reviews`.
- **Function Description:** Xem hop dong co the danh gia va tao/xem review theo contract.
- **Screen Layout:** Chup `ReviewsPage`.
- **Function Details:** Goi `contractApi.listContracts`, `contractApi.listReviews`, `contractApi.createReview`; hien rating/comment va trang thai da review.

### Function: Xem tai chinh hop dong
- **Function Trigger:** Mo `/app/finance`.
- **Function Description:** Tong hop hop dong va lich su giao dich vi lien quan tai chinh.
- **Screen Layout:** Chup `FinancePage`.
- **Function Details:** Goi `contractApi.listContracts` va `walletTransactionApi.list`; format giao dich theo role, loai giao dich, trang thai va so tien.

## Feature: Payment, Wallet, Membership & Withdrawal

### Function: Xem vi va lich su giao dich
- **Function Trigger:** Mo `/app/wallet`.
- **Function Description:** Hien so du, lich su giao dich, withdrawal history va action nap/rut.
- **Screen Layout:** Chup `WalletPage`.
- **Function Details:** Goi `walletTransactionApi.list`, `withdrawalApi.listMy`; enrich transaction bang contract/dispute/profile APIs; hien label giao dich, amount, status, datetime.

### Function: Nap tien vao vi
- **Function Trigger:** Bam "Nap tien" trong `WalletPage` hoac AppShell.
- **Function Description:** Mo modal topup, tao QR payOS, sync trang thai thanh toan.
- **Screen Layout:** Chup modal topup trong `WalletPage`/`AppShell`.
- **Function Details:** Goi `paymentApi.createWalletTopup` va `syncWalletTopup`; reload wallet khi thanh toan PAID.

### Function: Gui yeu cau rut tien
- **Function Trigger:** Bam "Rut tien" trong `/app/wallet`.
- **Function Description:** User nhap so tien va thong tin ngan hang de gui withdrawal request.
- **Screen Layout:** Chup `WithdrawalModal` trong `WalletPage`.
- **Function Details:** Goi `withdrawalApi.create`; validate amount/bankName/bankAccountNumber/bankAccountHolder; cap nhat list withdrawal.

### Function: Mua goi thanh vien
- **Function Trigger:** Mo `/app/membership` va bam mua package.
- **Function Description:** Hien danh sach package va mua bang vi/quota/payment action.
- **Screen Layout:** Chup `MembershipPage`.
- **Function Details:** Goi `membershipApi.listPackages`, `membershipApi.purchasePackage`; hien package, quyen loi, gia va trang thai mua.

### Function: Mua credit dang job/proposal
- **Function Trigger:** Khi het quota trong flow tao job/nop proposal va user chon mua them.
- **Function Description:** Mua luot dang job hoac nop proposal bang credit service.
- **Screen Layout:** Chup khu quota trong `CreateJobPage` hoac `SubmitProposalPage`.
- **Function Details:** Service co `creditApi.purchaseJobPost` va `creditApi.purchaseProposal`; UI hien quota tu `userQuotaApi.getCurrent`.

## Feature: Dispute & Risk Handling

### Function: Xem danh sach tranh chap/ticket
- **Function Trigger:** BUSINESS/EXPERT/ADMIN mo `/app/disputes`; STAFF mo `/app/tickets`.
- **Function Description:** Hien dispute theo role, filter status/search/pagination.
- **Screen Layout:** Chup `DisputesPage` o mode thuong va `staffMode`.
- **Function Details:** Goi `disputeApi.listAdmin`, `disputeApi.listStaff`, hoac lay dispute qua contract context; hien status, milestone, assignee, SLA.

### Function: Tao tranh chap moi
- **Function Trigger:** Mo `/app/disputes/new` hoac action trong workspace.
- **Function Description:** Tao dispute cho contract/milestone voi reason/evidence.
- **Screen Layout:** Chup `NewDisputePage` va modal tao dispute trong `WorkspacePage`.
- **Function Details:** Goi `disputeApi.create`; yeu cau `contractId`, `milestoneId`, `initiatedBy`, `initiationType`, reason.

### Function: Xem va xu ly chi tiet tranh chap
- **Function Trigger:** Mo `/app/disputes/:disputeId` hoac `/app/tickets/:disputeId`.
- **Function Description:** Hien timeline, evidence, contract/milestone context, escalation, staff routing, staff decision, cancel/continue.
- **Screen Layout:** Chup `DisputeDetailPage`.
- **Function Details:** Goi `disputeApi.get`, `listEvidence`, `contractApi.getContract/listMilestones/listCriteria/listDeliverables/listProgressReports`; action gom `disputeApi.escalate`, `routeStaff`, `staffDecision`, `executeSettlement`, `cancel`, `createEvidence`.

### Function: Xem thong tin du an trong dispute
- **Function Trigger:** Bam xem project info trong dispute, route `/app/disputes/:disputeId/project` hoac `/app/tickets/:disputeId/project`.
- **Function Description:** Hien contract, job, milestone, acceptance criteria lien quan den dispute.
- **Screen Layout:** Chup `DisputeProjectInfoPage`.
- **Function Details:** Goi `disputeApi.get`, `contractApi.getContract/listMilestones/listCriteria`, `marketplaceApi.getJob`; hien scope cong viec va criteria.

## Feature: Admin Operations

### Function: Xem analytics
- **Function Trigger:** ADMIN mo `/app/admin/analytics`.
- **Function Description:** Hien KPI, funnel va export CSV.
- **Screen Layout:** Chup `AnalyticsPage`.
- **Function Details:** Goi `adminApi.analyticsOverview`; action refresh va download CSV.

### Function: Bao cao quan tri
- **Function Trigger:** ADMIN mo `/app/admin/reports`.
- **Function Description:** Hien report theo range ngay va export CSV.
- **Screen Layout:** Chup `ReportsPage`.
- **Function Details:** Goi `adminApi.analyticsOverview`; filter date range local, download CSV.

### Function: Quan ly vi nen tang
- **Function Trigger:** ADMIN mo `/app/admin/wallet`.
- **Function Description:** Xem so du vi he thong, giao dich platform va sync wallet.
- **Screen Layout:** Chup `SystemWalletPage`.
- **Function Details:** Goi `adminApi.getSystemWallet`, `syncSystemWallet`, `listPlatformWalletTransactions`, `listAccounts`; co pagination lich su.

### Function: Duyet yeu cau rut tien
- **Function Trigger:** ADMIN mo `/app/admin/withdrawals`.
- **Function Description:** Xem withdrawal requests, approve/reject kem ghi chu, xem chi tiet.
- **Screen Layout:** Chup `AdminWithdrawalPage`.
- **Function Details:** Goi `withdrawalApi.listAll`, `adminApi.listAccounts`, `withdrawalApi.approve/reject`; modal review va detail.

### Function: Quan ly tai khoan
- **Function Trigger:** ADMIN mo `/app/admin/accounts`.
- **Function Description:** Tao/sua account internal/external, cap nhat status/active, tao staff khi can.
- **Screen Layout:** Chup `AccountsPage`.
- **Function Details:** Goi `adminApi.listAccounts`, `createAccount`, `updateAccount`, `setAccountStatus`, `setAccountActive`, `createStaff`; co tab internal/external va selector domain cho staff.

### Function: Quan ly nhan vien
- **Function Trigger:** ADMIN mo `/app/admin/staff`.
- **Function Description:** Xem va cap nhat staff specialization/domain assignment.
- **Screen Layout:** Chup `StaffPage`.
- **Function Details:** Goi `adminApi.listStaffs`, `catalogApi.listDomains`, `adminApi.updateStaff`; modal edit staff.

### Function: Quan ly master data
- **Function Trigger:** ADMIN mo `/app/admin/master-data`.
- **Function Description:** Quan ly domains, skills va acceptance criteria placeholder.
- **Screen Layout:** Chup `MasterDataPage`.
- **Function Details:** Goi `catalogApi.listDomains/listSkills`, `createDomain/updateDomain`, `createSkill/updateSkill`; criteria hien tu `listAcceptanceCriteria` hien dang resolve empty list o frontend.

### Function: Quan ly cau hinh he thong
- **Function Trigger:** ADMIN/STAFF mo `/app/admin/settings`.
- **Function Description:** Xem/sua setting value va bat/tat setting.
- **Screen Layout:** Chup `SettingsPage`.
- **Function Details:** Goi `adminApi.listSettings`, `adminApi.updateSetting`; co modal edit va toggle active.

### Function: Xem audit logs
- **Function Trigger:** ADMIN mo `/app/admin/audit-logs`.
- **Function Description:** Xem log he thong theo nhom INTERNAL/EXTERNAL.
- **Screen Layout:** Chup `AuditLogsPage`.
- **Function Details:** Goi `adminApi.auditLogs(actorGroup)`; tab internal/external va refresh.

## Feature: Catalog & Supporting Data

### Function: Lay catalog domain/skill/technology
- **Function Trigger:** Cac man tao job, nop proposal, profile, public job, admin master data load.
- **Function Description:** Cung cap du lieu nen de gan linh vuc, ky nang, cong nghe.
- **Screen Layout:** Chup cac man co selector: `CreateJobPage`, `SubmitProposalPage`, `ExpertPortfolioPage`, `MasterDataPage`.
- **Function Details:** Goi `catalogApi.listDomains/listSkills/listTechnologies`; job-specific assignment dung `listJobDomains/listJobSkills/listJobTechnologies`, replace dung `replaceJobDomains/replaceJobSkills`.

## Feature: Error, Empty State & Access Control

### Function: Hien thi 404
- **Function Trigger:** Truy cap route khong ton tai.
- **Function Description:** Hien trang khong tim thay va nut ve trang chu.
- **Screen Layout:** Chup `NotFoundPage`.
- **Function Details:** Route `*` trong `AppRoutes`; dung `Card` va `LinkButton`.

### Function: Hien empty/loading/error states
- **Function Trigger:** API dang load, khong co du lieu, hoac request fail.
- **Function Description:** Thong bao trang thai cho nguoi dung.
- **Screen Layout:** Chup bat ky page co `EmptyState`, `Notice`, loading button.
- **Function Details:** Cac page dung `Notice`, `EmptyState`, button loading va try/catch de hien loi tu `getApiErrorMessage`.


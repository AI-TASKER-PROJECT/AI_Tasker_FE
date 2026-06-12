# Bao cao tong hop AITASKER FE/BE - 12/06/2026

## 1. Tong quan du an

AITASKER la nen tang ket noi doanh nghiep voi chuyen gia AI, ho tro dang job, nop proposal, quan ly hop dong, milestone, thanh toan escrow, tranh chap, danh gia va quan tri he thong.

Kien truc hien tai gom:

- Front-end: React, TypeScript, Vite, TailwindCSS.
- Back-end: Spring Boot, Java 21, Spring Security JWT, JPA, Flyway, PostgreSQL.
- Tich hop: Google Identity, Firebase Storage, email OTP, Redis, OpenAI chatbot.
- Moi truong dev: FE chay `localhost:5173`, BE chay `localhost:8080`, Vite proxy `/api` sang BE.

## 2. Phan Front-end da co

FE hien dang chay theo che do live-only, uu tien goi API that tu backend thay vi dung du lieu gia. Cac module chinh da duoc tach theo page va role:

- Public: landing page, marketplace cong khai, chi tiet job, danh ba expert.
- Auth: dang nhap, dang ky theo role, OTP email, Google signup/login flow.
- Business: dashboard, tao job, quan ly job, profile KYB, hop dong, tai chinh, tranh chap, review.
- Expert: co hoi du an, nop proposal, proposal cua toi, profile KYC, portfolio, hop dong, tai chinh, tranh chap.
- Staff: duyet ho so, xu ly ticket tranh chap, demo testing, technical report.
- Admin: analytics, system wallet, account management, staff management, settings, master data, audit logs, reports.

Dieu huong FE da co:

- Protected route cho khu vuc `/app`.
- Navigation rieng theo 4 role: `BUSINESS`, `EXPERT`, `STAFF`, `ADMIN`.
- Tu dong gioi han man hinh neu account Business/Expert chua duoc approve.
- Tu dong goi `/api/auth/me` de cap nhat trang thai tai khoan theo JWT.
- Chatbox global hien trong AppShell va goi backend qua `/api/chatbot/ask`.

## 3. Phan Back-end da co

BE da co cac nhom API core:

- Auth: register, login, current session, check email, Google register.
- Email OTP: gui OTP va verify OTP truoc khi dang ky tai khoan local.
- Profile/KYC-KYB: tao profile Business/Expert, portfolio, upload file, approve/reject profile.
- Marketplace: tao job, list job, my jobs, job detail, submit proposal, list proposal, update status, matching.
- Contract execution: tao contract tu proposal, change request, activate, NDA sign, terminate.
- Milestone/deliverable: tao milestone, criteria, deliverable, lay danh sach theo contract/job/milestone.
- Finance: tao transaction, update status, webhook mo phong payment, system wallet.
- Dispute/Risk: tao dispute, assign staff, resolve, demo testing, technical report.
- Admin: reviews, settings, staffs, analytics, wallet, account management.
- Chatbot: RAG tu knowledge files noi bo va goi OpenAI API de tra loi.

Theo file coverage cua BE, 23/23 business rules week 1-8 da duoc cover o muc MVP backend, co endpoint/logic/test co ban.

## 4. Trang thai tich hop FE-BE

FE hien da map voi phan lon endpoint BE thong qua `src/lib/api.ts`:

- `authApi`: login, me, checkEmail, sendOtp, verifyOtp, register, googleSignup.
- `profileApi`: business/expert profile, portfolio, upload license/certificate, approve profile, tax check.
- `catalogApi`: domains, skills, job domains, job skills.
- `marketplaceApi`: jobs, proposals, matching.
- `contractApi`: contracts, milestones, criteria, deliverables, SLA auto approve.
- `financeApi`: transactions, payment webhook mo phong.
- `walletApi`: current wallet.
- `disputeApi`: create, list, get, assign, resolve, demo testing, technical report.
- `adminApi`: reviews, settings, staffs, analytics, wallet, accounts.
- `chatbotApi`: ask chatbot.

Co the bao cao la project da co end-to-end flow muc MVP cho:

- Dang ky/dang nhap theo role.
- Business tao job va quan ly proposal.
- Expert nop proposal.
- Tao contract tu proposal.
- Tao milestone, criteria, deliverable.
- Thanh toan/transaction mo phong.
- Tao va xu ly tranh chap.
- Duyet profile KYC/KYB.
- Quan tri account, staff, setting, analytics.
- Chatbot hoi dap noi bo theo knowledge base.

## 5. Diem can luu y khi bao cao/demo

Can noi ro cac phan dang o muc MVP/mock hoac can config:

- Chatbot phu thuoc `OPENAI_API_KEY`; neu key sai hoac het quyen thi endpoint da dung nhung OpenAI se tra loi.
- Payment hien la webhook mo phong, chua phai cong thanh toan that nhu VNPay/IPN production.
- Mot so tinh nang admin nhu reports/export, audit logs co UI nhung can tiep tuc hoan thien API/du lieu.
- Google register/login flow da co code FE va BE endpoint `/api/auth/google/register`, nhung can dam bao `google.client-id` o BE va `VITE_GOOGLE_CLIENT_ID` o FE khop nhau.
- Luong `check-email` can kiem tra lai semantics truoc demo dang ky: FE dang ky dang hieu `true = email available`, trong khi ten service BE hien tai la `validateEmailNotExists` nhung logic goi repository `existsByEmailIgnoreCase`.

## 6. Cau bao cao ngan gon

Hom nay project AITASKER da co FE React/Vite ket noi live voi BE Spring Boot. FE da chia man hinh theo 4 role Business, Expert, Staff, Admin va goi truc tiep cac API backend. BE da cover 23/23 business rules muc MVP cho auth, profile, marketplace, contract execution, finance, dispute, review va admin. Cac luong cot loi da co the demo end-to-end, con cac phan can hoan thien tiep la config OpenAI/Google, payment that, report/export va kiem tra lai check-email truoc khi demo dang ky.

## 7. File/code tham chieu nhanh

- FE routes: `src/App.tsx`
- FE role navigation: `src/components/AppShell.tsx`
- FE API client: `src/lib/api.ts`
- FE auth pages: `src/pages/AuthPages.tsx`
- FE chatbot: `src/components/ChatBox.tsx`
- BE auth controller: `AI_Tasker_BE/src/main/java/com/aitasker/be/controller/auth/AuthController.java`
- BE OTP controller: `AI_Tasker_BE/src/main/java/com/aitasker/be/controller/auth/EmailOtpController.java`
- BE marketplace controller: `AI_Tasker_BE/src/main/java/com/aitasker/be/controller/core/MarketplaceController.java`
- BE contract/dispute/finance controller: `AI_Tasker_BE/src/main/java/com/aitasker/be/controller/core/ContractExecutionController.java`
- BE profile controller: `AI_Tasker_BE/src/main/java/com/aitasker/be/controller/core/ProfileController.java`
- BE admin controller: `AI_Tasker_BE/src/main/java/com/aitasker/be/controller/core/AdminController.java`
- BE chatbot controller: `AI_Tasker_BE/src/main/java/com/aitasker/be/controller/core/ChatbotController.java`
- BE business rule coverage: `AI_Tasker_BE/BR_COVERAGE_WEEK1_8.md`

# AI Tasker Frontend

Giao diện web cho nền tảng **AI Tasker** — nơi kết nối doanh nghiệp có nhu cầu triển khai dự án AI với chuyên gia AI. Ứng dụng hỗ trợ đầy đủ luồng từ đăng ký, xác minh hồ sơ, đăng tuyển/ứng tuyển, ký kết và thực hiện hợp đồng, đến thanh toán, giải quyết tranh chấp và quản trị hệ thống.

## Công nghệ

- React 19 + TypeScript
- Vite 7
- React Router 7
- Tailwind CSS 3
- Axios
- Framer Motion
- Lucide React

## Yêu cầu môi trường

- Node.js `>= 22.12.0 < 25`
- npm `>= 10 < 12`
- Backend AI Tasker chạy mặc định tại `http://localhost:8080`

## Cài đặt và chạy dự án

```bash
git clone <repository-url>
cd AI_Tasker_FE
npm install
```

Tạo file `.env.local` ở thư mục gốc nếu cần thay đổi cấu hình mặc định:

```env
# Để trống khi chạy Vite proxy đến http://localhost:8080
VITE_API_BASE_URL=

# Client ID của Google Identity Services
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

Chạy ứng dụng ở môi trường phát triển:

```bash
npm run dev
```

Mở [http://localhost:5173](http://localhost:5173). Trong lúc phát triển, Vite chuyển tiếp các request `/api` và WebSocket `/ws` đến backend `http://localhost:8080`.

## Các lệnh hữu ích

```bash
# Kiểm tra lint
npm run lint

# Chạy test
npm test

# Kiểm tra kiểu dữ liệu và build production
npm run build

# Xem bản build production ở local
npm run preview
```

## Vai trò người dùng

| Vai trò | Chức năng chính |
|---|---|
| `BUSINESS` | Tạo và quản lý job, chọn chuyên gia, quản lý hợp đồng, ký quỹ, theo dõi tiến độ và đánh giá. |
| `EXPERT` | Hoàn thiện hồ sơ/KYC, tìm cơ hội, gửi proposal, thực hiện milestone, nhận thanh toán và đánh giá. |
| `STAFF` | Duyệt KYC/KYB, tiếp nhận và xử lý ticket tranh chấp. |
| `ADMIN` | Quản lý tài khoản, nhân sự, ví hệ thống, rút tiền, danh mục, cấu hình, audit log và báo cáo. |

## Các module chính

| Module | Nội dung |
|---|---|
| `AuthPages` | Đăng nhập, đăng ký, xác thực OTP email, quên và đặt lại mật khẩu, Google Sign-In. |
| `ProfilePages` | Hồ sơ Business/Expert, KYC/KYB, portfolio và public profile. |
| `MarketplacePages` | Tạo và quản lý job, gợi ý chuyên gia, cơ hội việc làm và proposal. |
| `ContractPages` | Danh sách/chi tiết hợp đồng, đàm phán, workspace, milestone, tiến độ, tài chính và đánh giá. |
| `PaymentPages` | Ví, lịch sử giao dịch, nạp/rút tiền, membership và credit. |
| `RiskPages` | Tạo và theo dõi tranh chấp, ticket xử lý của Staff, duyệt hồ sơ xác minh. |
| `AdminPages` | Analytics, tài khoản, nhân sự, system wallet, cấu hình, master data, audit log và báo cáo. |
| `DashboardPages` | Dashboard theo vai trò và trung tâm thông báo. |
| `PublicPages` | Landing page, danh sách job công khai, chi tiết job và danh bạ chuyên gia. |

## Luồng nghiệp vụ tổng quát

```text
Đăng ký / Đăng nhập
        ↓
Hoàn thiện hồ sơ và KYC/KYB
        ↓
Business tạo job ←→ Expert tìm job và gửi proposal
        ↓
Business chọn proposal → tạo/đàm phán hợp đồng
        ↓
Ký quỹ → thực hiện milestone → nộp và nghiệm thu deliverable
        ↓
Thanh toán / đánh giá  hoặc  tạo tranh chấp khi phát sinh vấn đề
```

## Cấu trúc thư mục

```text
src/
├── components/       # Component tái sử dụng
├── config/           # Biến cấu hình ứng dụng
├── constants/        # Hằng số và route dùng chung
├── context/          # Session và trạng thái dùng chung
├── layouts/          # Public, App và Admin layouts
├── lib/              # Tiện ích, session, socket và xử lý nghiệp vụ nhỏ
├── pages/            # Các màn hình theo module nghiệp vụ
├── redux/            # Redux store và session slice
├── routes/           # Route, animation và role guard
├── services/         # API client và service theo domain
├── types/            # Kiểu dữ liệu TypeScript dùng chung
└── utils/            # Utility functions
```

## Kết nối API và xác thực

- Axios được cấu hình tại `src/services/apiClient.ts`.
- Access token được lấy từ session và tự đính kèm theo chuẩn `Authorization: Bearer <token>`.
- Khi backend trả về `401`, ứng dụng xóa session và chuyển người dùng về trang đăng nhập.
- Các route trong `/app` yêu cầu đăng nhập; những chức năng chuyên biệt còn được giới hạn theo role.
- API base URL dùng `VITE_API_BASE_URL`. Nếu biến này trống, frontend sử dụng Vite proxy để gọi backend local.

## Tài liệu liên quan

- [Bản đồ màn hình và route](docs/screen-map.md)
- [Danh sách UI, role, business rule và API](docs/UI_COVERAGE.md)
- [Yêu cầu chức năng frontend](docs/functional-requirements-frontend.md)
- [Quyết định thiết kế](docs/design-decisions.md)

## Lưu ý phát triển

- Không commit `.env`, `.env.local` hoặc khóa dịch vụ Firebase.
- Ưu tiên gọi API thật; khi endpoint chưa sẵn sàng, giao diện hiển thị empty/error state thay vì dữ liệu giả.
- Trước khi tạo pull request, chạy tối thiểu `npm run lint`, `npm test` và `npm run build`.

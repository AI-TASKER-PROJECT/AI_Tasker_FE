# AITASKER UI Coverage

## 1. Nguồn phân tích

- Back-end Spring Boot tại `D:\SU26\SWP391\AITASKER-BE\AITASKER-BE`.
- OpenAPI `docs/openapi/openapi-v1.json`.
- Service logic, entity, Flyway migration và Postman checklist.
- File nghiệp vụ `SWP391_Group1 BR_DB.xlsx`, gồm `Business Rules New`, `Database Description`, `Task List`.

## 2. Nguyên tắc thiết kế

- Một app shell, một hệ thống component, trạng thái và hành vi nút thống nhất cho bốn vai trò.
- Màu sáng, nền trắng/xanh rất nhạt, điểm nhấn xanh dương, mint và coral.
- Mọi màn hình chi tiết đều có đường quay lại hoặc liên kết từ màn hình danh sách.
- Endpoint back-end được gọi trước. Dữ liệu demo chỉ dùng khi endpoint đọc chưa tồn tại hoặc back-end chưa chạy.
- Các chức năng nghiệp vụ chưa có API vẫn có giao diện để không thiếu flow khi back-end hoàn thiện sau.

## 3. Danh sách giao diện

| Nhóm | Giao diện | Vai trò | Business rule / API |
|---|---|---|---|
| Public | Landing page | Tất cả | Giới thiệu nền tảng |
| Public | Marketplace công khai | Tất cả | `GET /api/v1/jobs` |
| Public | Chi tiết Job + nộp proposal | Expert | MATCH-02, `GET /jobs/{id}`, `POST /proposals` |
| Public | Danh bạ chuyên gia | Business | MATCH-01, REV-01, UI chờ API public profile |
| Auth | Đăng nhập | Tất cả | AUTH-01, `POST /api/auth/login` |
| Auth | Đăng ký chọn vai trò | Business, Expert | REG-01, `POST /api/auth/register` |
| Common | Dashboard theo vai trò | Đã đăng nhập | Điều hướng theo JWT role |
| Common | Trung tâm thông báo | Đã đăng nhập | CON-01, REV-01, UI chờ WebSocket |
| Business | Hồ sơ KYB | Business | REG-02, `POST /profiles/business` |
| Expert | Hồ sơ KYC | Expert | REG-02, `POST /profiles/expert` |
| Expert | Portfolio 4 thành phần | Expert | PRF-01, `POST /profiles/portfolio` |
| Business | Danh sách Job của tôi | Business | JOB-01, `GET /jobs`, `PATCH /jobs/{id}/status` |
| Business | AI Job Assistant tạo Job | Business | JOB-01, `POST /jobs`, UI chờ AI NLP |
| Business | Quản lý Job: AI đề xuất / Proposals | Business | MATCH-01, MATCH-02, `GET /matching`, `GET /proposals` |
| Expert | Cơ hội việc làm | Expert | MATCH-02, `GET /jobs` |
| Expert | Proposal của tôi | Expert | MATCH-02, UI chờ API list proposal theo expert |
| Common | Danh sách hợp đồng | Business, Expert | CON-01, `GET /contracts` |
| Common | Chi tiết và đàm phán hợp đồng | Business, Expert | CON-01, CON-02, create/change/activate/NDA/terminate APIs |
| Common | Workspace thực thi | Business, Expert | EXEC-01, EXEC-02, milestone/criteria/deliverable APIs |
| Common | Tài chính & Escrow | Business, Expert, Admin, Staff | FIN-01, transaction/webhook/invoice APIs |
| Common | Đánh giá chéo | Business, Expert | REV-01, review APIs |
| Common | Tranh chấp | Business, Expert | RSK-01, RSK-02, `POST /disputes` |
| Staff/Admin | Danh sách duyệt KYC/KYB | Staff, Admin | REG-02, `GET /profiles/*` |
| Staff/Admin | Chi tiết duyệt hồ sơ | Staff, Admin | `POST /profiles/approve/{type}/{id}` |
| Staff/Admin | Ticket tranh chấp | Staff, Admin | STF-02, UI chờ API list dispute |
| Staff/Admin | Demo testing & technical report | Staff, Admin | STF-03, STF-04, dispute testing/report APIs |
| Admin/Staff | Analytics | Admin, Staff | ADM-02, `GET /admin/analytics/overview` |
| Admin | Quản lý Staff | Admin | STF-01, `GET/POST /admin/staffs` |
| Admin | System Settings | Admin | ADM-03, `GET/PATCH /admin/settings` |
| Admin | Master Data | Admin | ADM-01, UI chờ CRUD account/job/contract/review |
| Admin | Audit Logs | Admin | ADM-01, UI chờ API audit log |
| Admin | Reports & Export | Admin | ADM-02, UI chờ API lọc chu kỳ / export |

## 4. Khoảng trống back-end được thể hiện bằng UI

- Chưa có AI service chuẩn hóa SoW thật.
- Chưa có API đọc deliverable, transaction, invoice, dispute, change request theo danh sách/chi tiết.
- Chưa có API public expert profile, danh sách proposal theo expert, notification, account CRUD, audit log, reports filter/export.
- Chưa có endpoint cập nhật acceptance criteria, approve/reject milestone hoặc snapshot termination.
- Chưa có upload Firebase, VNPay QR/IPN thật, WebSocket và sinh NDA PDF.

Các phần trên được đánh dấu trong giao diện là tính năng đang chờ tích hợp, không bị bỏ khỏi luồng điều hướng.

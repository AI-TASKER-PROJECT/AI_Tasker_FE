# Đặc tả thiết kế lại giao diện Dispute Flow

**Phạm vi:** Frontend dispute flow cho Business, Expert, Staff và Admin fallback.  
**Nguồn nghiệp vụ:** `AI_Tasker_BE/docs/flows/dispute-flow.md` v2.3.  
**Mục tiêu:** Đồng bộ UI với backend hiện tại, tách rõ self-resolve, Staff review và settlement tự động.

---

## 1. Nguyên tắc bắt buộc

### 1.1 Không hiển thị dữ liệu nhạy cảm

Giao diện người dùng cuối **không được hiển thị raw database ID** hoặc dữ liệu kỹ thuật nội bộ, bao gồm:

- `contractId`
- `milestoneId`
- `disputeId`
- `jobId`
- `accountId`
- `businessId`
- `expertId`
- `staffId`
- `walletTransactionId`
- `settlementWalletTransactionId`
- các mã entity nội bộ khác nếu không cần thiết cho người dùng

Thay vào đó, UI phải dùng nhãn thân thiện:

- “Hồ sơ tranh chấp”
- “Cột mốc đang tranh chấp”
- “Hợp đồng”
- “Doanh nghiệp”
- “Chuyên gia”
- “Nhân sự phụ trách”
- “Giao dịch quyết toán”

Nếu cần mã tham chiếu cho hỗ trợ khách hàng, chỉ dùng mã public được tạo riêng ở frontend hoặc backend, ví dụ:

- `DSP-2026-0008`
- `CASE-0008`
- `Mốc 2 - Kiểm thử nghiệm thu`

Không được render trực tiếp `#${disputeId}` trong UI production. Raw ID chỉ được phép xuất hiện trong dev log, network request, hoặc màn debug nội bộ được bảo vệ.

### 1.2 Tuyệt đối không lỗi tiếng Việt

Toàn bộ text hiển thị phải dùng tiếng Việt có dấu chuẩn UTF-8.

Không được để bất kỳ chuỗi nào bị lỗi encoding, ví dụ chữ bị biến thành ký tự lạ, mất dấu, hoặc lẫn các cụm ký tự không phải tiếng Việt tự nhiên.

Quy định kỹ thuật:

- Tất cả file `.tsx`, `.ts`, `.md`, `.json` chứa text tiếng Việt phải lưu bằng UTF-8.
- Không copy text từ terminal/log bị mojibake.
- Không hardcode text tiếng Việt trong nhiều nơi nếu có thể gom vào helper hoặc dictionary.
- Khi sửa UI, phải kiểm tra màn hình thật để chắc chắn chữ tiếng Việt hiển thị đúng.
- Các text trạng thái phải được map từ enum sang tiếng Việt qua helper, không hiển thị enum thô cho người dùng cuối.

Ví dụ đúng:

- `Đang tự thương lượng`
- `Đã yêu cầu Staff can thiệp`
- `Staff đang xem xét`
- `Đã giải quyết`
- `Đã rút tranh chấp`

---

## 2. State machine hiển thị

Backend dùng các trạng thái chính:

| Trạng thái backend | Nhãn UI | Ý nghĩa hiển thị |
|---|---|---|
| `PENDING_SELF_RESOLVE` | Đang tự thương lượng | Hai bên đang tự xử lý trước khi mời Staff |
| `ESCALATION_REQUESTED` | Đã yêu cầu Staff | Yêu cầu can thiệp đã được gửi, hệ thống đang route |
| `STAFF_REVIEWING` | Staff đang xem xét | Staff đã được gán và đang kiểm tra hồ sơ |
| `STAFF_DECIDED` | Staff đã quyết định | Trạng thái trung gian rất ngắn trước settlement |
| `RESOLVED` | Đã giải quyết | Dispute đã có kết quả cuối cùng |
| `CANCELLED` | Đã rút tranh chấp | Người khởi tạo đã rút case trước Staff routing |

UI không được dùng các nhãn cũ:

- “Staff gửi báo cáo cho Admin”
- “Chờ Admin duyệt quyết toán”
- “Staff từ chối can thiệp”
- “Admin gán Staff” trong flow chính

Lý do: spec v2.3 quy định Staff quyết định trực tiếp và settlement tự động chạy sau quyết định.

---

## 3. Route đề xuất

Giữ route hiện có nhưng đổi ý nghĩa hiển thị:

| Route | Người dùng | Vai trò |
|---|---|---|
| `/app/contracts/:contractId/workspace` | Business, Expert | Điểm bắt đầu tạo dispute từ cột mốc |
| `/app/disputes` | Business, Expert | Danh sách tranh chấp của các hợp đồng người dùng tham gia |
| `/app/disputes/new` | Business, Expert | Fallback wizard, không phải flow chính |
| `/app/disputes/:disputeId` | Business, Expert | Không gian hồ sơ tranh chấp |
| `/app/disputes/:disputeId/project` | Business, Expert | Thông tin dự án liên quan |
| `/app/tickets` | Staff | Danh sách case Staff cần xử lý |
| `/app/tickets/:disputeId` | Staff | Màn Staff review và ra quyết định |
| `/app/tickets/:disputeId/project` | Staff | Thông tin dự án liên quan |

Lưu ý: route có thể chứa raw ID vì routing nội bộ cần định danh bản ghi. Tuy nhiên nội dung render trên màn hình không được hiển thị raw ID.

---

## 4. Workspace cột mốc

File trọng tâm: `src/pages/ContractPages/WorkspacePage/WorkspacePage.tsx`.

### 4.1 Mục tiêu

Workspace là nơi Business/Expert đang làm việc với milestone. Đây là nơi phù hợp nhất để mở tranh chấp vì người dùng đã có ngữ cảnh cột mốc, deliverable, feedback và acceptance criteria.

### 4.2 Entry point theo trạng thái

Nút dispute chỉ hiển thị khi milestone ở một trong các trạng thái:

- `IN_PROGRESS`
- `OVERDUE`
- `UNDER_REVIEW`

Không hiển thị nút tạo dispute khi milestone:

- `PENDING`
- `DEPOSITED`
- `DISPUTED`
- `COMPLETED`
- `CANCELLED`

Nếu milestone đã `DISPUTED`, hiển thị panel trạng thái dispute và CTA “Xem hồ sơ tranh chấp”.

### 4.3 Tách rõ hai hành động

Hiện tại frontend đang tạo dispute rồi escalation ngay. Cần tách thành:

#### Hành động 1: Mở tranh chấp

Gọi:

```http
POST /api/v1/milestones/{milestoneId}/disputes
```

Params:

- `contractId`
- `initiationType`

Kết quả kỳ vọng:

- dispute status = `PENDING_SELF_RESOLVE`
- milestone status = `DISPUTED`
- UI chuyển sang phase “Đang tự thương lượng”

#### Hành động 2: Yêu cầu Staff can thiệp

Chỉ hiển thị khi dispute đang `PENDING_SELF_RESOLVE`.

Gọi:

```http
POST /api/v1/disputes/{disputeId}/escalation-request
```

Params bắt buộc:

- `reason`
- `evidenceFile`

Kết quả kỳ vọng:

- backend tự route Staff
- dispute thường chuyển thẳng sang `STAFF_REVIEWING`
- UI hiển thị countdown evidence deadline nếu có `evidenceCollectionDueAt`

### 4.4 Modal mở tranh chấp

Modal phải có:

- Tên cột mốc
- Trạng thái cột mốc
- Loại tranh chấp
- Cảnh báo: “Reject deliverable không tự tạo tranh chấp. Đây là hồ sơ tranh chấp chính thức.”

Loại tranh chấp theo role:

Business:

- `BUSINESS_REJECTED_DELIVERABLE`
- `OTHER`

Expert:

- `EXPERT_SCOPE_CONCERN`
- `EXPERT_NO_REVIEW_RESPONSE`
- `EXPERT_BAD_FAITH_REJECTION`
- `OTHER`

Không hiển thị enum thô. Dùng nhãn:

- “Phản đối kết quả bàn giao”
- “Yêu cầu ngoài phạm vi”
- “Business chưa phản hồi nghiệm thu”
- “Từ chối không phù hợp tiêu chí”
- “Lý do khác”

### 4.5 Modal yêu cầu Staff can thiệp

Modal phải có:

- Lý do cần Staff can thiệp
- File/link bằng chứng bắt buộc
- Ghi chú rằng hệ thống sẽ tự gán Staff phù hợp

Không cho submit nếu thiếu lý do hoặc bằng chứng.

---

## 5. Dispute detail cho Business/Expert

File trọng tâm: `src/pages/RiskPages/DisputeDetailPage/DisputeDetailPage.tsx`.

### 5.1 Mục tiêu

Màn này là “phòng hồ sơ tranh chấp” cho hai bên. Người dùng phải hiểu:

- Case đang ở bước nào
- Ai cần làm gì tiếp theo
- Bằng chứng nào đã gửi
- Deadline nào đang chạy
- Kết quả settlement là gì nếu đã resolved

### 5.2 Layout đề xuất

#### Header

Hiển thị:

- Tên hợp đồng hoặc tên dự án
- Tên cột mốc
- Trạng thái dispute
- Người khởi tạo: “Doanh nghiệp” hoặc “Chuyên gia”
- Loại tranh chấp bằng nhãn tiếng Việt

Không hiển thị:

- mã dispute
- mã contract
- mã milestone
- mã account
- mã staff

#### Progress stepper

Các bước:

1. Mở tranh chấp
2. Tự thương lượng
3. Staff xem xét
4. Quyết định
5. Hoàn tất

Stepper phải dựa trên status backend.

#### Evidence panel

Hiển thị:

- Lý do escalation nếu có
- File escalation nếu có
- Danh sách case attachments
- Deliverable liên quan
- Progress report liên quan
- Feedback/rejection gần nhất

Business/Expert được thêm evidence khi:

- `PENDING_SELF_RESOLVE`
- `STAFF_REVIEWING`

#### Action panel

Theo status:

`PENDING_SELF_RESOLVE`:

- Initiator có thể “Rút tranh chấp”
- Cả hai bên có thể “Yêu cầu Staff can thiệp”
- Business vẫn có thể approve milestone thông qua workspace nếu hai bên đã tự xử lý xong

`STAFF_REVIEWING`:

- Cho phép bổ sung evidence trong evidence window
- Không cho rút tranh chấp
- Hiển thị Staff đang xem xét nhưng không hiện Staff ID

`RESOLVED`:

- Hiển thị kết quả:
  - tỷ lệ Expert nhận
  - số tiền Expert nhận
  - số tiền Business được hoàn
  - thời điểm quyết toán
- Không hiển thị wallet transaction ID

`CANCELLED`:

- Hiển thị lý do rút nếu có
- Hiển thị “Tranh chấp đã được rút trước khi Staff xử lý”

---

## 6. Staff ticket queue

File trọng tâm: `src/pages/RiskPages/DisputesPage/DisputesPage.tsx`.

### 6.1 Mục tiêu

Staff cần thấy các hồ sơ được giao thay vì một danh sách rỗng.

Backend hiện chưa có list-all dispute riêng cho Staff. Tạm thời frontend có thể load:

1. `GET /api/v1/contracts`
2. Với mỗi contract, gọi `GET /api/v1/contracts/{contractId}/disputes`
3. Filter các dispute liên quan đến Staff hoặc dispute đang ở trạng thái Staff xử lý

Khi backend có endpoint riêng, đổi service sau.

### 6.2 Nội dung card

Mỗi card ticket hiển thị:

- Tên hợp đồng/dự án nếu có
- Tên cột mốc nếu có
- Trạng thái
- Loại tranh chấp
- Hạn bổ sung evidence
- Hạn SLA Staff
- Trạng thái quá hạn nếu có

Không hiển thị:

- Dispute ID
- Staff ID
- Contract ID
- Account ID

CTA:

- “Mở hồ sơ xử lý”
- “Xem thông tin dự án”

---

## 7. Staff review và quyết định

File trọng tâm: `src/pages/RiskPages/DisputeDetailPage/DisputeDetailPage.tsx` ở `staffMode`.

### 7.1 Quyền Staff

Staff chỉ quyết định khi dispute status = `STAFF_REVIEWING`.

Staff không được:

- reject intervention
- chuyển case về self-resolve
- yêu cầu Admin duyệt thay

### 7.2 Decision panel

Panel quyết định gồm:

- Báo cáo Staff
- Ghi chú quyết định
- Tỷ lệ Expert nhận từ 0 đến 100
- Preview số tiền Expert nhận
- Preview số tiền Business được hoàn
- Cảnh báo settlement tự động

Nút submit:

- “Ra quyết định”

Sau khi submit thành công:

- backend tự settlement
- UI refresh dispute
- nếu status trả về `RESOLVED`, hiển thị kết quả cuối cùng

Không dùng text “Gửi báo cáo cho Admin”.

### 7.3 Evidence deadline

`evidenceCollectionDueAt` là hạn bổ sung bằng chứng, không phải điều kiện khóa Staff.

UI phải hiển thị:

- “Hạn bổ sung bằng chứng”
- “Staff có thể ra quyết định trước hạn nếu hồ sơ đã đủ rõ”

Không hiển thị:

- “Chờ hết 48 giờ”
- “Chưa hết 48 giờ nên chưa thể quyết định”

---

## 8. Admin fallback

Admin không phải người xử lý chính trong dispute flow v2.3.

Admin có thể có màn fallback để:

- xem dispute đã quá SLA
- retry settlement nếu dispute kẹt ở `STAFF_DECIDED`
- xem audit/log nếu cần

Admin không được có CTA chính:

- gán Staff trong flow chính
- cancel dispute
- chỉnh tỷ lệ settlement
- reject intervention

Nếu vẫn giữ màn `StaffAssignmentPage`, phải đổi thành:

- Staff-only fallback routing, hoặc
- read-only diagnostics cho Admin

Không gọi endpoint cũ `/assign-staff`.

---

## 9. Service/API cần chỉnh

File: `src/services/disputeService.ts`.

### 9.1 Sửa endpoint route Staff

Thay:

```http
POST /api/v1/disputes/{disputeId}/assign-staff
```

Bằng:

```http
POST /api/v1/disputes/{disputeId}/route-staff
```

Params:

- `staffId` optional

### 9.2 Xóa reject intervention

Không dùng:

```http
POST /api/v1/disputes/{disputeId}/reject-intervention
```

Xóa khỏi service hoặc đánh dấu deprecated và không gọi từ UI.

### 9.3 Giữ execute settlement như fallback

Giữ:

```http
POST /api/v1/disputes/{disputeId}/execute-settlement
```

Nhưng chỉ dùng cho Admin retry khi dispute kẹt ở `STAFF_DECIDED`.

### 9.4 Candidate type phải khớp backend

Backend trả:

- `staffId`
- `displayName`
- `specializationMatch`
- `technologyMatchSummary`
- `availability`
- `activeDisputeWorkloadCount`
- `conflictEligible`

UI production không hiển thị `staffId`, chỉ dùng nội bộ khi gọi API.

---

## 10. Type/UI helper cần thêm

Nên tạo helper:

- `formatDisputeStatus(status)`
- `formatDisputeInitiationType(type)`
- `formatResolutionType(type)`
- `canCreateDispute(role, milestoneStatus)`
- `canRequestStaffIntervention(dispute, role)`
- `canCancelDispute(dispute, session)`
- `canStaffDecide(dispute, session)`

Các helper này giúp tránh lặp enum và tránh hiển thị enum thô.

---

## 11. Kiểm thử giao diện bắt buộc

Trước khi coi flow hoàn tất, phải kiểm tra các scenario:

1. Business mở dispute từ milestone `UNDER_REVIEW`.
2. Expert mở dispute từ milestone `IN_PROGRESS`.
3. Dispute mới vào `PENDING_SELF_RESOLVE`, không tự escalation.
4. Initiator rút dispute trước Staff routing.
5. Hai bên yêu cầu Staff can thiệp với đủ reason và evidence file.
6. Dispute chuyển sang `STAFF_REVIEWING`.
7. Business/Expert bổ sung evidence.
8. Staff ra quyết định trước evidence deadline.
9. Settlement trả về `RESOLVED`.
10. UI kết quả không hiển thị raw ID.
11. Toàn bộ text tiếng Việt hiển thị đúng dấu.
12. Không còn nút “Reject intervention”.
13. Không còn flow Admin gán Staff trong luồng chính.
14. Không còn text “chờ Admin duyệt quyết toán”.

---

## 12. Checklist chống lộ ID

Trước khi merge, tìm trong UI các pattern sau:

- `#{`
- `ID`
- `Id`
- `contractId`
- `milestoneId`
- `disputeId`
- `accountId`
- `staffId`
- `walletTransactionId`

Nếu xuất hiện trong text render cho người dùng, phải thay bằng nhãn thân thiện.

Ngoại lệ:

- biến TypeScript
- params API
- route params
- test/dev-only panel

---

## 13. Checklist chống lỗi tiếng Việt

Trước khi merge:

- Chạy script kiểm tra encoding để phát hiện ký tự lạ hoặc chuỗi không phải tiếng Việt tự nhiên.
- Không đưa trực tiếp các mẫu lỗi encoding vào tài liệu hoặc UI text.
- Mở các màn chính bằng browser:
  - Workspace
  - Dispute list
  - Dispute detail
  - Staff tickets
  - Staff decision modal
- Kiểm tra các toast/notice/modal/error message.
- Không dùng text lấy từ spec bị mojibake nếu chưa sửa lại thủ công.

---

## 14. Thứ tự triển khai đề xuất

1. Sửa service API và type candidate.
2. Sửa helper mapping status/type tiếng Việt.
3. Sửa Workspace: tách “Mở tranh chấp” và “Yêu cầu Staff can thiệp”.
4. Sửa DisputeDetail participant view.
5. Sửa DisputeDetail staff view.
6. Sửa Staff ticket queue.
7. Gỡ flow Admin assignment khỏi luồng chính.
8. Chạy checklist chống lộ ID và chống lỗi tiếng Việt.

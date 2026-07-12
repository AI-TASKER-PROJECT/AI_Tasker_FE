# Dispute Self-Resolve UI Spec

**Mục tiêu:** Thiết kế giao diện cho giai đoạn `PENDING_SELF_RESOLVE`, nơi Business và Expert tự thương lượng trước khi yêu cầu Staff can thiệp.

Spec backend đầy đủ nằm tại:

```text
AI_Tasker_BE/docs/flows/dispute-self-resolve-negotiation-spec.md
```

---

## 1. Nguyên tắc UI

- Không hiển thị ID kỹ thuật như dispute id, contract id, milestone id, account id, staff id.
- Hiển thị "mốc 1", "mốc 2", không hiển thị `milestoneId`.
- Tất cả trạng thái, loại phản hồi và hành động phải Việt hóa.
- Không để lỗi tiếng Việt/mojibake.
- Khi dispute đang `PENDING_SELF_RESOLVE`, không mô tả là Staff đang xử lý.
- Luôn cho người dùng thấy bước tiếp theo rõ ràng: phản hồi, chấp nhận thỏa hiệp, hoặc yêu cầu Staff.

---

## 2. Màn cần chỉnh

### 2.1. `DisputeDetailPage.tsx`

Khi `dispute.status === "PENDING_SELF_RESOLVE"`:

Hiển thị các khối:

1. Header hồ sơ tranh chấp.
2. Stepper trạng thái.
3. Notice tự thương lượng.
4. Card yêu cầu tranh chấp ban đầu.
5. Card trao đổi thỏa hiệp.
6. Card hành động theo vai trò.

Notice:

```text
Hồ sơ đang ở giai đoạn tự thương lượng. Hai bên có thể phản hồi và thống nhất phương án xử lý trước khi yêu cầu Staff can thiệp.
```

### 2.2. `WorkspacePage.tsx`

Khi người dùng quay lại Workspace sau khi chấp nhận thỏa hiệp:

```text
Tranh chấp của mốc {số mốc} đã được giải quyết. Hãy tiếp tục tiến hành các mốc tiếp theo của dự án.
```

Nếu có thanh toán:

```text
Khoản thanh toán theo thỏa thuận đã được ghi nhận. Vui lòng kiểm tra ở lịch sử Ví & Thanh toán.
```

---

## 3. Vai trò và hành động

### 3.1. Bên bị tranh chấp

Điều kiện:

- Người xem là Business hoặc Expert thuộc contract.
- Người xem không phải bên mở tranh chấp.
- Dispute đang `PENDING_SELF_RESOLVE`.

Hiển thị form:

```text
Phản hồi yêu cầu tranh chấp
```

Field:

- Phương án phản hồi.
- Hành động đề xuất.
- Nội dung phản hồi.
- Thời hạn thực hiện nếu có.

Phương án phản hồi:

```text
Chấp nhận yêu cầu của đối phương
Đề xuất phương án thỏa hiệp
Không đồng ý, yêu cầu Staff can thiệp
```

Hành động đề xuất:

```text
Tiếp tục chỉnh sửa mốc này
Chấp nhận nghiệm thu deliverable
Tiếp tục sang mốc tiếp theo
Khác
```

CTA:

```text
Gửi phản hồi
```

Nếu chọn "Không đồng ý, yêu cầu Staff can thiệp":

```text
Yêu cầu Staff can thiệp
```

### 3.2. Bên mở tranh chấp

Nếu đối phương đã phản hồi:

```text
Đối phương đã phản hồi yêu cầu tranh chấp.
```

CTA:

```text
Chấp nhận thỏa hiệp và tiếp tục dự án
Yêu cầu điều chỉnh lại phản hồi
Yêu cầu Staff can thiệp
```

Khi bấm "Chấp nhận thỏa hiệp và tiếp tục dự án", mở modal xác nhận.

Modal phải giải thích hệ quả:

- Nếu tiếp tục chỉnh sửa: mốc hiện tại được mở lại.
- Nếu chấp nhận nghiệm thu/đi tiếp mốc sau: mốc hiện tại được hoàn tất và có thể phát sinh thanh toán.

---

## 4. Timeline phản hồi

Hiển thị trong card "Trao đổi thỏa hiệp".

Mỗi item:

```text
{Vai trò} phản hồi
{Loại phản hồi}
{Hành động đề xuất}
{Nội dung}
{Thời hạn nếu có}
{Thời gian gửi}
```

Ví dụ:

```text
Chuyên gia phản hồi
Đề xuất phương án thỏa hiệp
Tiếp tục chỉnh sửa mốc này
Tôi đồng ý chỉnh sửa phần export Excel trong 2 ngày.
Thời hạn đề xuất: 15/07/2026 18:00
```

Không hiển thị:

- `replyId`
- `disputeId`
- `actorAccountId`

---

## 5. Mapping text tiếng Việt

### 5.1. Reply type

| Code | Text |
| --- | --- |
| `ACCEPT_REQUEST` | Chấp nhận yêu cầu |
| `COUNTER_PROPOSAL` | Đề xuất phương án thỏa hiệp |
| `REQUEST_ADJUSTMENT` | Yêu cầu điều chỉnh |
| `REQUEST_STAFF` | Yêu cầu Staff can thiệp |
| `ACCEPT_PROPOSAL` | Đã chấp nhận thỏa hiệp |

### 5.2. Proposed action

| Code | Text |
| --- | --- |
| `CONTINUE_REVISION` | Tiếp tục chỉnh sửa mốc này |
| `ACCEPT_DELIVERABLE` | Chấp nhận nghiệm thu deliverable |
| `CONTINUE_NEXT_MILESTONE` | Tiếp tục sang mốc tiếp theo |
| `PARTIAL_REFUND` | Hoàn tiền một phần |
| `OTHER` | Phương án khác |

---

## 6. Validation frontend

Khi gửi phản hồi:

- `message` bắt buộc.
- `message.trim().length > 0`.
- Nếu chọn `OTHER`, nội dung phải mô tả rõ phương án.
- Nếu có `proposedDueAt`, thời hạn không được ở quá khứ.
- Nếu chọn yêu cầu Staff, phải nhập lý do rõ ràng.

Khi chấp nhận thỏa hiệp:

- Phải có phản hồi mới nhất từ đối phương.
- Phải mở modal xác nhận trước khi gọi API.
- Không cho chấp nhận phản hồi do chính mình gửi.

---

## 7. API service cần thêm

Trong `disputeService.ts`:

```ts
listSelfResolveReplies(disputeId: number)
createSelfResolveReply(disputeId: number, payload)
acceptSelfResolveAgreement(disputeId: number, payload)
```

Endpoint:

```http
GET /api/v1/disputes/{disputeId}/self-resolve-replies
POST /api/v1/disputes/{disputeId}/self-resolve-replies
POST /api/v1/disputes/{disputeId}/self-resolve-agreement
```

Nếu backend chưa có các endpoint này, frontend phải để trạng thái disabled hoặc hiển thị notice:

```text
Chức năng phản hồi thỏa hiệp đang chờ backend hỗ trợ.
```

---

## 8. Acceptance checklist UI

- Business/Expert thấy được yêu cầu tranh chấp ban đầu.
- Bên bị tranh chấp gửi được phản hồi.
- Bên mở tranh chấp thấy phản hồi mới nhất.
- Bên mở tranh chấp chấp nhận được thỏa hiệp.
- Có thể yêu cầu Staff nếu không thống nhất.
- Sau khi dispute resolved, có nút "Tiếp tục dự án".
- Không lộ ID kỹ thuật.
- Không lỗi tiếng Việt.


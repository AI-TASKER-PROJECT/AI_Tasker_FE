# Password Reset Implementation Task

## Mục tiêu

Triển khai đầy đủ luồng quên mật khẩu, đặt lại mật khẩu và UX lockout đăng nhập cho frontend.

Frontend phải hỗ trợ link backend gửi theo dạng:

```text
<APP_FRONTEND_URL>/reset-password?token=<token>
```

Route `/reset-password` phải tồn tại và đọc token từ query string `token`.

## Phạm vi triển khai

- Forgot password page.
- Reset password page.
- Tích hợp API auth liên quan.
- Cập nhật UX login lockout.
- Chặn double submit trong flow reset password.
- Không làm lộ thông tin email hoặc token reset.

## API cần gọi

### Forgot password

```http
POST /api/auth/forgot-password
```

Body đề xuất:

```json
{
  "email": "user@example.com"
}
```

Sau khi submit, luôn hiển thị message trung tính:

```text
Nếu email tồn tại, hướng dẫn đặt lại mật khẩu sẽ được gửi
```

Không hiển thị hoặc suy luận email có tồn tại trong hệ thống hay không.

### Reset password

```http
POST /api/auth/reset-password
```

Body:

```json
{
  "token": "<token-from-url>",
  "newPassword": "<new-password>"
}
```

Token lấy trực tiếp từ URL `/reset-password?token=...`, chỉ giữ trong memory lúc submit.

## Forgot Password Page

### Route

Thêm route public cho trang quên mật khẩu, ví dụ:

```text
/forgot-password
```

### Form

Form gồm:

- Email input.
- Submit button.
- Link quay lại login.

### Hành vi

- Validate email không được rỗng trước khi gọi API.
- Gọi `POST /api/auth/forgot-password`.
- Dù API trả thành công hay lỗi liên quan tới email không tồn tại, UI vẫn hiển thị message trung tính:

```text
Nếu email tồn tại, hướng dẫn đặt lại mật khẩu sẽ được gửi
```

- Không hiển thị các message kiểu:
  - Email không tồn tại.
  - Tài khoản chưa đăng ký.
  - Email hợp lệ / không hợp lệ trong hệ thống.

## Reset Password Page

### Route

Thêm route public:

```text
/reset-password?token=....
```

Frontend phải đọc token từ query param `token`.

### Form

Form gồm:

- New password input.
- Confirm password input.
- Submit button.
- CTA gửi lại link đặt mật khẩu.

### Validate trước khi gọi API

- `newPassword` tối thiểu 8 ký tự.
- `confirmPassword` phải trùng `newPassword`.
- Nếu thiếu token trong URL, không gọi API và hiển thị:

```text
Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn
```

### Submit thành công

- Gọi `POST /api/auth/reset-password`.
- Disable submit button trong lúc request đang chạy.
- Nếu thành công:
  - Redirect về `/login`.
  - Hiển thị thông báo đổi mật khẩu thành công ở login page.

Gợi ý truyền thông báo qua router state thay vì query param nếu project đang dùng React Router:

```ts
navigate('/login', {
  state: { successMessage: 'Đổi mật khẩu thành công' },
});
```

### Token hết hạn, không hợp lệ hoặc đã dùng

Nếu backend trả lỗi token hết hạn, không hợp lệ hoặc đã dùng, hiển thị:

```text
Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn
```

Cho user bấm:

```text
Gửi lại link đặt mật khẩu
```

CTA này điều hướng về `/forgot-password`.

## Xử lý race / double submit

- Disable nút submit khi đang gọi `POST /api/auth/reset-password`.
- Không gửi thêm request nếu đang trong trạng thái loading.
- Nếu user double-click hoặc mở cùng link ở 2 tab:
  - Chỉ một request có thể thành công.
  - Request/tab còn lại phải hiển thị:

```text
Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn
```

Frontend không cần tự enforce token dùng một lần; backend chịu trách nhiệm. Frontend chỉ cần xử lý response đúng và không retry tự động.

## Login Lockout UX

Cập nhật trang login để xử lý các lỗi backend trả về.

### Tạm khóa 5 phút

Nếu login trả lỗi có nội dung:

```text
Tài khoản đang bị tạm khóa…
```

UI hiển thị thông báo user cần chờ 5 phút trước khi thử lại.

Không tự retry login liên tục khi gặp lỗi này.

### Khóa và yêu cầu đặt lại mật khẩu

Nếu login trả lỗi:

```text
Tài khoản đã bị khóa, vui lòng đặt lại mật khẩu
```

UI hiển thị lỗi này kèm CTA đi tới `/forgot-password`.

CTA đề xuất:

```text
Đặt lại mật khẩu
```

Không tự retry login liên tục khi gặp lỗi này.

## Security Requirements

- Không log token reset ra console.
- Không lưu token vào `localStorage`.
- Không lưu token vào `sessionStorage`.
- Không đưa token vào URL mới khi redirect.
- Không gửi token sang bất kỳ endpoint nào ngoài `POST /api/auth/reset-password`.
- Chỉ đọc token từ query param và giữ trong state/memory đủ để submit.
- Không hiển thị email có tồn tại hay không trong forgot password flow.

## Acceptance Criteria

- User vào `/forgot-password`, nhập email và submit được.
- Sau submit forgot password, UI luôn hiển thị:

```text
Nếu email tồn tại, hướng dẫn đặt lại mật khẩu sẽ được gửi
```

- User vào `/reset-password?token=abc`, nhập mật khẩu mới hợp lệ và submit được.
- Password dưới 8 ký tự bị chặn trước khi gọi API.
- Confirm password khác new password bị chặn trước khi gọi API.
- Submit reset password đang loading thì button bị disable.
- Reset password thành công redirect về login và báo:

```text
Đổi mật khẩu thành công
```

- Token thiếu, hết hạn, không hợp lệ hoặc đã dùng hiển thị:

```text
Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn
```

- Có CTA `Gửi lại link đặt mật khẩu` về `/forgot-password`.
- Login lockout 5 phút hiển thị thông báo chờ 5 phút.
- Login locked yêu cầu reset hiển thị CTA về forgot password.
- Không có `console.log` token.
- Không có code lưu reset token vào storage.

## Gợi ý vị trí code cần kiểm tra

Tùy cấu trúc hiện tại của repo, ưu tiên tìm và cập nhật các khu vực sau:

- Router public trong `src/routes`.
- Login page trong `src/pages` hoặc khu vực auth tương ứng.
- API client auth trong `src/lib`, `src/services`, hoặc file tương tự.
- Component form/input/button dùng chung nếu project đã có sẵn.

Giữ style UI theo các trang auth hiện có. Không tạo layout/visual style mới nếu đã có pattern login/register.

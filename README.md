# AITASKER Front-end

Front-end React + TypeScript + TailwindCSS cho nền tảng kết nối doanh nghiệp với chuyên gia AI.

## Chạy local

```bash
npm install
npm run dev
```

Back-end mặc định chạy tại `http://localhost:8080`. Vite proxy toàn bộ `/api` sang back-end.

Tạo `.env.local` từ `.env.example` khi cần đổi địa chỉ API:

```env
VITE_API_BASE_URL=http://localhost:8080
VITE_GOOGLE_CLIENT_ID=565106811175-f1s40beb8ft5djorhl98co67gaseach6.apps.googleusercontent.com
```

Front-end hiện chạy theo chế độ live-only: mọi dữ liệu nghiệp vụ được lấy từ back-end thật. Khi back-end chưa chạy hoặc chưa có endpoint tương ứng, màn hình sẽ hiển thị trạng thái trống/thông báo lỗi thay vì dùng dữ liệu giả.

## Google Sign-In

Login/Register đã tích hợp Google Identity Services với `VITE_GOOGLE_CLIENT_ID`.

Back-end hiện chưa có endpoint OAuth Google, nên front-end chặn luồng Google và báo lỗi rõ ràng. Khi back-end có endpoint OAuth thật, chỉ cần thay logic trong `src/lib/api.ts` tại `authApi.googleLogin` và `authApi.googleRegister`.

## Tài liệu

- `docs/UI_COVERAGE.md`: danh sách giao diện, vai trò, business rule và API tương ứng.
- `public/images/hero-collaboration.png`, `public/images/ai-job-assistant.png`: asset minh họa được tạo riêng cho dự án.

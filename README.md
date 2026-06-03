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
VITE_ENABLE_MOCK_FALLBACK=true
VITE_GOOGLE_CLIENT_ID=565106811175-f1s40beb8ft5djorhl98co67gaseach6.apps.googleusercontent.com
```

`VITE_ENABLE_MOCK_FALLBACK=true` giúp các màn hình vẫn hiển thị dữ liệu demo khi API chưa có endpoint đọc dữ liệu hoặc back-end chưa chạy. Mọi endpoint đã có trong back-end vẫn được gọi trước.

## Google Sign-In

Login/Register đã tích hợp Google Identity Services với `VITE_GOOGLE_CLIENT_ID`.

Back-end hiện chưa có endpoint OAuth Google, nên front-end decode Google ID token để lấy email/họ tên và tạo session tương thích với app. Khi back-end có endpoint OAuth thật, chỉ cần thay logic trong `src/lib/api.ts` tại `authApi.googleLogin` và `authApi.googleRegister`.

## Tài liệu

- `docs/UI_COVERAGE.md`: danh sách giao diện, vai trò, business rule và API tương ứng.
- `public/images/hero-collaboration.png`, `public/images/ai-job-assistant.png`: asset minh họa được tạo riêng cho dự án.

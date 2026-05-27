import { createBrowserRouter } from "react-router-dom";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <div>Trang chủ / Skeleton đang xây dựng...</div>,
  },
  {
    path: "/login",
    element: <div>Trang Đăng nhập (Mock)</div>,
  },
  {
    path: "*",
    element: <div>404 - Không tìm thấy trang</div>,
  },
]);

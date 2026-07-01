import { Notice } from "../../../components/ui";

export function ProfilePagesHint() {
  return (
    <Notice tone="info" title="Luồng xác minh">
      Hồ sơ mặc định ở trạng thái Pending. Admin hoặc Staff chuyển sang Approved
      để mở khóa giao dịch.
    </Notice>
  );
}

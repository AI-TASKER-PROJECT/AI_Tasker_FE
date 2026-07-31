import type { Role, SessionUser } from "../types";

export type PublicExperience = {
  badge: string;
  heroTitle: string;
  heroDescription: string;
  primaryLabel: string;
  primaryPath: string;
  secondaryLabel: string;
  secondaryPath: string;
};

const workspacePathByRole: Record<Role, string> = {
  BUSINESS: "/app/jobs",
  EXPERT: "/app/opportunities",
  STAFF: "/app/verifications",
  ADMIN: "/app/admin/analytics",
};

const guestExperience: PublicExperience = {
  badge: "Sàn dự án AI",
  heroTitle:
    "Thuê chuyên gia AI, quản lý dự án và tiền ký quỹ trên một nền tảng minh bạch.",
  heroDescription:
    "AITASKER giúp doanh nghiệp chuẩn hóa bài toán bằng trợ lý AI, nhận đề xuất, ký hợp đồng, chia cột mốc, nghiệm thu và xử lý dòng tiền minh bạch.",
  primaryLabel: "Bắt đầu dự án",
  primaryPath: "/register",
  secondaryLabel: "Xem cơ hội",
  secondaryPath: "/experts",
};

const roleExperience: Record<Role, PublicExperience> = {
  BUSINESS: {
    badge: "Không gian doanh nghiệp",
    heroTitle:
      "Tạo dự án AI, nhận bản đề xuất và theo dõi hợp đồng của doanh nghiệp.",
    heroDescription:
      "Bạn có thể bắt đầu dự án mới, quản lý công việc đang mở, theo dõi cột mốc, ký quỹ và tranh chấp trong không gian làm việc của doanh nghiệp.",
    primaryLabel: "Tạo dự án mới",
    primaryPath: "/app/jobs",
    secondaryLabel: "Dự án của tôi",
    secondaryPath: "/app/jobs",
  },
  EXPERT: {
    badge: "Không gian chuyên gia",
    heroTitle: "Tìm cơ hội AI phù hợp và quản lý bản đề xuất trong một không gian làm việc.",
    heroDescription:
      "Bạn có thể xem dự án đang mở, nộp bản đề xuất, cập nhật hồ sơ năng lực AI và theo dõi hợp đồng hoặc dòng tiền sau khi được chọn.",
    primaryLabel: "Tìm cơ hội phù hợp",
    primaryPath: "/app/opportunities",
    secondaryLabel: "Bản đề xuất của tôi",
    secondaryPath: "/app/proposals",
  },
  STAFF: {
    badge: "Không gian nhân viên",
    heroTitle: "Duyệt hồ sơ, theo dõi vụ việc và hỗ trợ xử lý rủi ro.",
    heroDescription:
      "Bạn có thể kiểm tra hồ sơ xác minh, tiếp nhận tranh chấp, ghi nhận kết quả kiểm thử và chuẩn bị báo cáo kỹ thuật cho từng vụ việc.",
    primaryLabel: "Duyệt hồ sơ",
    primaryPath: "/app/verifications",
    secondaryLabel: "Tranh chấp được giao",
    secondaryPath: "/app/tickets",
  },
  ADMIN: {
    badge: "Không gian quản trị viên",
    heroTitle: "Điều phối tài khoản, ví hệ thống và số liệu vận hành AITASKER.",
    heroDescription:
      "Bạn có thể quản lý tài khoản theo vai trò, xem số liệu phân tích, đồng bộ ví hệ thống, cấu hình dữ liệu danh mục và theo dõi nhật ký kiểm toán.",
    primaryLabel: "Mở quản trị",
    primaryPath: "/app/admin/analytics",
    secondaryLabel: "Quản lý tài khoản",
    secondaryPath: "/app/admin/accounts",
  },
};

export function getVerificationPath(role: Role) {
  return role === "BUSINESS" ? "/app/business/kyb" : "/app/expert/kyc";
}

export function needsVerification(session?: SessionUser | null) {
  if (!session || (session.role !== "BUSINESS" && session.role !== "EXPERT"))
    return false;
  return (session.accountStatus || "Approved") !== "Approved";
}

export function getPublicExperience(
  session?: SessionUser | null,
): PublicExperience {
  if (!session) return guestExperience;

  const experience = roleExperience[session.role];
  if (!needsVerification(session)) return experience;

  return {
    ...experience,
    primaryLabel: "Hoàn thiện hồ sơ",
    primaryPath: getVerificationPath(session.role),
  };
}

export function getPublicStartPath(session?: SessionUser | null) {
  return getPublicExperience(session).primaryPath;
}

export function getWorkspacePath(session?: SessionUser | null) {
  if (!session) return "/login";
  if (needsVerification(session)) return getVerificationPath(session.role);
  return workspacePathByRole[session.role];
}

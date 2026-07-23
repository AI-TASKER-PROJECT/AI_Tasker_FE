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
  badge: "AI Project Marketplace",
  heroTitle:
    "Thuê chuyên gia AI, quản lý dự án và escrow trong một nền tảng sáng rõ.",
  heroDescription:
    "AITASKER giúp doanh nghiệp chuẩn hóa bài toán bằng AI Job Assistant, nhận đề xuất, ký hợp đồng, chia mốc, nghiệm thu và xử lý dòng tiền minh bạch.",
  primaryLabel: "Bắt dầu dự án",
  primaryPath: "/register",
  secondaryLabel: "Xem cơ hội",
  secondaryPath: "/experts",
};

const roleExperience: Record<Role, PublicExperience> = {
  BUSINESS: {
    badge: "Không gian Business",
    heroTitle:
      "Tạo job AI, nhận proposal và theo dõi hợp đồng của doanh nghiệp.",
    heroDescription:
      "Bạn có thể bắt đầu một dự án mới, quản lý công việc đang mở, theo dõi mốc, ký quỹ và các tranh chấp trong không gian làm việc của Doanh nghiệp.",
    primaryLabel: "Tạo dự án mới",
    primaryPath: "/app/jobs",
    secondaryLabel: "Dự án của tôi",
    secondaryPath: "/app/jobs",
  },
  EXPERT: {
    badge: "Không gian Expert",
    heroTitle: "Tìm cơ hội AI phù hợp và quản lý proposal trong một workspace.",
    heroDescription:
      "Bạn có thể xem job đang mở, nộp proposal, cập nhật portfolio AI và theo dõi hợp đồng hoặc dòng tiền sau khi dược chọn.",
    primaryLabel: "Tìm cơ hội phù hợp",
    primaryPath: "/app/opportunities",
    secondaryLabel: "Proposal của tôi",
    secondaryPath: "/app/proposals",
  },
  STAFF: {
    badge: "Không gian Staff",
    heroTitle: "Duyệt hồ sơ, theo dõi ticket và hỗ trợ xử lý rủi ro.",
    heroDescription:
      "Bạn có thể kiểm tra hồ sơ KYB/KYC, tiếp nhận dispute, ghi nhận demo testing và chuẩn bị technical report cho từng ticket.",
    primaryLabel: "Duyệt hồ sơ",
    primaryPath: "/app/verifications",
    secondaryLabel: "Tranh chấp được giao",
    secondaryPath: "/app/tickets",
  },
  ADMIN: {
    badge: "Không gian Admin",
    heroTitle: "Điều phối tài khoản, ví hệ thống và số liệu vận hành AITASKER.",
    heroDescription:
      "Bạn có thể quản lý account theo role, xem analytics, đồng bộ system wallet, cấu hình master data và theo dõi audit log.",
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

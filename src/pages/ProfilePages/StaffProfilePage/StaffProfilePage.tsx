import {
  ClipboardCheck,
  Gavel,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Badge,
  Card,
  Notice,
  SectionHeading,
} from "../../../components/ui";
import { useSession } from "../../../context/sessionContext";
import { getApiErrorMessage, staffApi } from "../../../services";

const PROFILE_REVIEW_DOMAIN_CODE = "PROFILE_REVIEW";

export function StaffProfilePage() {
  const session = useSession();
  const [domainCodes, setDomainCodes] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (session?.role !== "STAFF") return;

    let ignore = false;
    staffApi
      .current()
      .then((staff) => {
        if (ignore) return;
        setDomainCodes(
          staff.domains?.map((domain) => domain.domainCode || "") || [],
        );
        setNotice(null);
      })
      .catch((error) => {
        if (!ignore) setNotice(getApiErrorMessage(error));
      });

    return () => {
      ignore = true;
    };
  }, [session?.role]);

  const isProfileReviewStaff = useMemo(
    () => domainCodes.includes(PROFILE_REVIEW_DOMAIN_CODE),
    [domainCodes],
  );

  if (!session) {
    return <Notice tone="danger" title="Không tìm thấy phiên đăng nhập." />;
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-slate-100">
        <div className="bg-[radial-gradient(circle_at_top_left,#ede9fe,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef2ff_55%,#f5f3ff_100%)] p-6 md:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <Avatar name={session.fullName} size="xl" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-600">
                Hồ sơ cá nhân nhân viên
              </p>
              <h1 className="mt-2 text-3xl font-black text-ink md:text-4xl">
                {session.fullName || "Nhân viên thẩm định"}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                <span className="inline-flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-violet-600" />
                  Nhân viên thẩm định
                </span>
                <Badge tone={session.accountStatus === "Approved" ? "mint" : "slate"}>
                  {session.accountStatus || "Đang hoạt động"}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="p-6">
          <SectionHeading
            title="Thông tin tài khoản"
            description="Thông tin nhân viên hiện được lấy từ phiên đăng nhập."
          />
          <div className="mt-5 grid gap-3">
            <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
              <Mail className="h-5 w-5 text-violet-600" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Email
                </p>
                <p className="mt-1 font-bold text-ink">
                  {session.email || "Chưa cập nhật"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
              <UserRound className="h-5 w-5 text-violet-600" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Số điện thoại
                </p>
                <p className="mt-1 font-bold text-ink">
                  {session.phone || "Chưa cập nhật"}
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <SectionHeading title="Phạm vi công việc" />
          <div className="mt-5 space-y-3">
            {isProfileReviewStaff ? (
              <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-4">
                <ClipboardCheck className="h-5 w-5 text-emerald-600" />
                <span className="font-bold text-slate-700">
                  Duyệt hồ sơ KYC/KYB
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-2xl bg-violet-50 p-4">
                <Gavel className="h-5 w-5 text-violet-600" />
                <span className="font-bold text-slate-700">
                  Xử lý tranh chấp
                </span>
              </div>
            )}
          </div>
          {notice && (
            <div className="mt-4">
              <Notice tone="warning" title={notice} />
            </div>
          )}
        </Card>
      </div>

      <Notice tone="info" title="Chế độ chỉ xem">
        Hồ sơ nhân viên hiện chưa có dịch vụ cập nhật thông tin cá nhân từ phía nhân viên.
      </Notice>
    </div>
  );
}

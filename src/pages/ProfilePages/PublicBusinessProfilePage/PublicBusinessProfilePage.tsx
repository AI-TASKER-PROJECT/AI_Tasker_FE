import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BriefcaseBusiness, ExternalLink, IdCard, Layers3, MapPin, Users } from "lucide-react";
import { profileApi } from "../../../lib/api";
import { getSession } from "../../../lib/session";
import { Avatar, Badge, Button, Card, LinkButton, Notice, SectionHeading, Tabs } from "../../../components/ui";
import type { BusinessProfile, Job } from "../../../types";
import { EmptyProfileBlock, ProfileDetailRow, readApiError } from "../ProfilePages.shared";

export function PublicBusinessProfilePage() {
  const { businessId } = useParams();
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("home");
  const session = getSession();
  const numericBusinessId = Number(businessId);

  useEffect(() => {
    if (!Number.isFinite(numericBusinessId)) return;
    Promise.all([
      profileApi.getBusinessById(numericBusinessId),
      profileApi.listBusinessJobs(numericBusinessId).catch(() => []),
    ])
      .then(([businessProfile, businessJobs]) => {
        setProfile(businessProfile);
        setJobs(businessJobs);
      })
      .catch((loadError) =>
        setError(readApiError(loadError, "Không thể tải hồ sơ doanh nghiệp.")),
      );
  }, [numericBusinessId]);

  if (!Number.isFinite(numericBusinessId))
    return <Notice tone="danger" title="Không tìm thấy doanh nghiệp." />;
  if (error) return <Notice tone="danger" title={error} />;
  if (!profile) return <Notice title="Đang tải hồ sơ doanh nghiệp..." />;

  const canEdit =
    session?.role === "BUSINESS" && profile.accountId === session.accountId;
  const logoLabel = profile.companyName || "Doanh nghiệp";

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#f7faff] py-8">
      <div className="mx-auto max-w-5xl px-4 md:px-6 space-y-8">
        <Card className="relative overflow-hidden border-none shadow-sm">
          {/* Header Cover Background */}
          <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top_left,#ffe6f0,transparent_40%),linear-gradient(135deg,#ffffff_0%,#fdf2f6_100%)] sm:h-40" />
          <div className="absolute left-[-10rem] top-[-5rem] h-64 w-64 rounded-full bg-[#ffb0cc]/20 blur-3xl" />
          <div className="absolute right-[-10rem] top-[-5rem] h-64 w-64 rounded-full bg-[#d8e2ff]/30 blur-3xl" />

          <div className="relative z-10 px-6 pb-6 pt-20 sm:pt-28">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
                {profile.logoUrl ? (
                  <img
                    src={profile.logoUrl}
                    alt={logoLabel}
                    className="h-24 w-24 shrink-0 rounded-[1.25rem] bg-white object-contain p-2 shadow-[0_8px_30px_rgba(197,0,112,0.12)] ring-4 ring-white"
                  />
                ) : (
                  <Avatar
                    name={logoLabel}
                    size="xl"
                    className="h-24 w-24 shrink-0 shadow-[0_8px_30px_rgba(197,0,112,0.12)] ring-4 ring-white bg-[#ffe6f0] text-[#C50070] text-3xl"
                  />
                )}
                <div className="mb-1">
                  <p className="text-[11px] font-extrabold uppercase tracking-widest text-[#C50070]">
                    Trang cá nhân doanh nghiệp
                  </p>
                  <h1 className="mt-1 font-display text-2xl font-black text-ink md:text-3xl">
                    {profile.companyName || "Doanh nghiệp"}
                  </h1>
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-sm font-semibold text-slate-500">
                    {profile.website && (
                      <a
                        className="inline-flex items-center gap-1.5 transition-colors hover:text-[#0B7AEA]"
                        href={profile.website}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                        {profile.website}
                      </a>
                    )}
                    {profile.followersCount != null && (
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="h-4 w-4 text-slate-400" />
                        {profile.followersCount} người theo dõi
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-3 pb-1">
                {canEdit ? (
                  <LinkButton
                    to="/app/business/profile"
                    variant="secondary"
                    className="shadow-sm"
                  >
                    Chỉnh sửa trang
                  </LinkButton>
                ) : (
                  <Button
                    type="button"
                    className="bg-[#0B7AEA] text-white hover:bg-[#0966c4] border-transparent shadow-md"
                  >
                    Theo dõi công ty
                  </Button>
                )}
              </div>
            </div>

            <div className="mt-8 border-b border-slate-100">
              <Tabs
                tabs={[
                  { id: "home", label: "Trang chủ" },
                  {
                    id: "jobs",
                    label: "Tin tuyển dụng",
                    count: jobs.filter((j) => j.status === "OPEN").length,
                  },
                ]}
                active={activeTab}
                onChange={setActiveTab}
              />
            </div>
          </div>
        </Card>

        {activeTab === "home" && (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <Card className="p-6">
              <SectionHeading title="Giới thiệu công ty" />
              <p className="mt-5 text-sm leading-7 text-slate-600">
                {profile.description ||
                  "Doanh nghiệp chưa cập nhật phần giới thiệu."}
              </p>
            </Card>
            <Card className="p-6">
              <SectionHeading title="Thông tin chung" />
              <div className="mt-5 space-y-4">
                <ProfileDetailRow
                  icon={<IdCard className="h-4 w-4" />}
                  label="Mã số thuế"
                  value={profile.taxCode || "Chưa cập nhật"}
                />
                <ProfileDetailRow
                  icon={<Layers3 className="h-4 w-4" />}
                  label="Lĩnh vực hoạt dộng"
                  value={profile.industry || "Chưa cập nhật"}
                />
                <ProfileDetailRow
                  icon={<MapPin className="h-4 w-4" />}
                  label="Địa chỉ"
                  value={profile.address || "Chưa cập nhật"}
                />
              </div>
            </Card>
          </div>
        )}

        {activeTab === "jobs" && (
          <Card className="p-6">
            <SectionHeading title="Tin tuyển dụng / dự án đã đăng" />
            <div className="mt-5 grid gap-4">
              {jobs.filter((job) => job.status === "OPEN").length ? (
                jobs
                  .filter((job) => job.status === "OPEN")
                  .map((job) => (
                    <Link
                      key={job.jobId}
                      to={`/jobs/${job.jobId}`}
                      className="group rounded-3xl border border-slate-100 bg-slate-50 p-4 transition hover:border-brand-200 hover:bg-white hover:shadow-soft"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="font-display text-lg font-extrabold text-ink group-hover:text-brand-700">
                            {job.title}
                          </h3>
                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
                            {job.rawRequirements || "Chưa có mô tả yêu cầu."}
                          </p>
                        </div>
                        <Badge tone="mint">{job.status}</Badge>
                      </div>
                    </Link>
                  ))
              ) : (
                <EmptyProfileBlock
                  icon={<BriefcaseBusiness className="h-5 w-5" />}
                  title="Chưa có tin tuyển dụng nào"
                  description="Doanh nghiệp hiện tại không có tin tuyển dụng OPEN."
                />
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

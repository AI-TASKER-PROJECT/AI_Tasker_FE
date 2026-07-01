import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Award, BrainCircuit, BriefcaseBusiness, Cpu, FileText, Layers3, Users } from "lucide-react";
import { catalogApi, profileApi, type Domain, type Skill, type Technology } from "../../../lib/api";
import { getSession } from "../../../lib/session";
import { FirebaseFileLink } from "../../../components/FirebaseFileLink";
import { Avatar, Button, Card, LinkButton, Notice, SectionHeading, Tabs } from "../../../components/ui";
import type { ExpertProfile, Portfolio } from "../../../types";
import { EmptyProfileBlock, parseCatalogIds, ProfileDetailRow, readApiError, resolveCatalogNames } from "../ProfilePages.shared";

export function PublicExpertProfilePage() {
  const { expertId } = useParams();
  const [profile, setProfile] = useState<ExpertProfile | null>(null);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [technologies, setTechnologies] = useState<Technology[]>([]);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("home");
  const session = getSession();
  const numericExpertId = Number(expertId);

  useEffect(() => {
    if (!Number.isFinite(numericExpertId)) return;
    Promise.all([
      profileApi.getExpertById(numericExpertId),
      profileApi.getPortfolioByExpert(numericExpertId).catch(() => null),
      catalogApi.listDomains(true),
      catalogApi.listSkills(true),
      catalogApi.listTechnologies(true),
    ])
      .then(
        ([
          expertProfile,
          expertPortfolio,
          domainItems,
          skillItems,
          technologyItems,
        ]) => {
          setProfile(expertProfile);
          setPortfolio(expertPortfolio);
          setDomains(domainItems);
          setSkills(skillItems);
          setTechnologies(technologyItems);
        },
      )
      .catch((loadError) =>
        setError(readApiError(loadError, "Không thể tải hồ sơ chuyên gia.")),
      );
  }, [numericExpertId]);

  const canEdit =
    session?.role === "EXPERT" && profile?.accountId === session.accountId;
  const selectedDomains = resolveCatalogNames(
    domains,
    parseCatalogIds(portfolio?.domainIds),
    "domainId",
    "domainName",
  );
  const selectedSkills = resolveCatalogNames(
    skills,
    parseCatalogIds(portfolio?.skillIds),
    "skillId",
    "skillName",
  );
  const selectedTechnologies = resolveCatalogNames(
    technologies,
    parseCatalogIds(portfolio?.technologyIds),
    "technologyId",
    "technologyName",
  );

  if (!Number.isFinite(numericExpertId))
    return <Notice tone="danger" title="Không tìm thấy chuyên gia." />;
  if (error) return <Notice tone="danger" title={error} />;
  if (!profile) return <Notice title="Đang tải hồ sơ chuyên gia..." />;

  const displayName = profile.fullName || "Chuyên gia";
  const introText =
    portfolio?.selfDescription ||
    profile.description ||
    "Chuyên gia chưa cập nhật phần giới thiệu.";

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#f7faff] py-8">
      <div className="mx-auto max-w-5xl px-4 md:px-6 space-y-8">
        <Card className="relative overflow-hidden border-none shadow-sm">
          {/* Header Cover Background */}
          <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top_left,#e6f0ff,transparent_40%),linear-gradient(135deg,#ffffff_0%,#f2f7ff_100%)] sm:h-40" />
          <div className="absolute left-[-10rem] top-[-5rem] h-64 w-64 rounded-full bg-[#d8e2ff]/40 blur-3xl" />
          <div className="absolute right-[-10rem] top-[-5rem] h-64 w-64 rounded-full bg-[#e6f0ff]/50 blur-3xl" />

          <div className="relative z-10 px-6 pb-6 pt-20 sm:pt-28">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
                <Avatar
                  name={displayName}
                  size="xl"
                  className="h-24 w-24 shrink-0 shadow-[0_8px_30px_rgba(11,122,234,0.12)] ring-4 ring-white bg-[#e6f0ff] text-[#0B7AEA] text-3xl"
                />
                <div className="mb-1">
                  <p className="text-[11px] font-extrabold uppercase tracking-widest text-[#0B7AEA]">
                    Trang cá nhân chuyên gia
                  </p>
                  <h1 className="mt-1 font-display text-2xl font-black text-ink md:text-3xl">
                    {displayName}
                  </h1>
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-sm font-semibold text-slate-500">
                    {profile.title && (
                      <span className="inline-flex items-center gap-1.5">
                        <BriefcaseBusiness className="h-4 w-4 text-slate-400" />
                        {profile.title}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5">
                      <Award className="h-4 w-4 text-slate-400" />
                      {portfolio?.yearsExperience ??
                        profile.yearsOfExperience ??
                        0}{" "}
                      năm kinh nghiệm
                    </span>
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
                    to="/app/expert/profile"
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
                    Theo dõi
                  </Button>
                )}
              </div>
            </div>

            <div className="mt-8 border-b border-slate-100">
              <Tabs
                tabs={[
                  { id: "home", label: "Trang chủ" },
                  { id: "projects", label: "Dự án đã làm" },
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
              <SectionHeading title="Mô tả bản thân" />
              <p className="mt-5 text-sm leading-7 text-slate-600">
                {introText}
              </p>
            </Card>
            <Card className="p-6">
              <SectionHeading title="Thông tin chung" />
              <div className="mt-5 space-y-4">
                <ProfileDetailRow
                  icon={<Layers3 className="h-4 w-4" />}
                  label="Lĩnh vực"
                  value={
                    selectedDomains.length
                      ? selectedDomains.join(", ")
                      : "Chưa cập nhật"
                  }
                />
                <ProfileDetailRow
                  icon={<BrainCircuit className="h-4 w-4" />}
                  label="Kỹ năng"
                  value={
                    selectedSkills.length
                      ? selectedSkills.join(", ")
                      : "Chưa cập nhật"
                  }
                />
                <ProfileDetailRow
                  icon={<Cpu className="h-4 w-4" />}
                  label="Công nghệ"
                  value={
                    selectedTechnologies.length
                      ? selectedTechnologies.join(", ")
                      : "Chưa cập nhật"
                  }
                />
                <ProfileDetailRow
                  icon={<Award className="h-4 w-4" />}
                  label="Số năm kinh nghiệm"
                  value={`${portfolio?.yearsExperience ?? profile.yearsOfExperience ?? 0} năm`}
                />
                <ProfileDetailRow
                  icon={<FileText className="h-4 w-4" />}
                  label="Chứng chỉ"
                  value={
                    <FirebaseFileLink
                      path={portfolio?.certificates || profile.portfolioUrl}
                      emptyText="Chưa có chứng chỉ"
                      buttonText="Xem chứng chỉ"
                      showPath={false}
                    />
                  }
                />
              </div>
            </Card>
          </div>
        )}

        {activeTab === "projects" && (
          <Card className="p-6">
            <SectionHeading
              title="Dự án đã làm"
              description="Những dự án đã hoàn thành trên nền tảng."
            />
            <div className="mt-5">
              {profile.completedProjects && profile.completedProjects > 0 ? (
                <div className="grid h-32 place-items-center rounded-3xl border border-dashed border-brand-200 bg-brand-50/50">
                  <p className="text-sm font-bold text-brand-700">
                    Chuyên gia đã hoàn thành {profile.completedProjects} dự án.
                  </p>
                </div>
              ) : (
                <EmptyProfileBlock
                  icon={<BriefcaseBusiness className="h-5 w-5" />}
                  title="Chưa có dự án hoàn thành"
                  description="Chuyên gia này chưa hoàn thành dự án nào trên nền tảng."
                />
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

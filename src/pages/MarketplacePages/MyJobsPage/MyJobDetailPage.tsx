import { useEffect, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import {
  catalogApi,
  contractApi,
  marketplaceApi,
  type Domain,
  type JobSkill,
  type JobTechnology,
  type Skill,
  type Technology,
} from "../../../services";
import type { Job, Milestone } from "../../../types";
import { formatCurrency } from "../../../lib/utils";
import {
  Button,
  Card,
  LinkButton,
  Notice,
  PageHeader,
  SectionHeading,
  StatusBadge,
} from "../../../components/ui";
import { CheckCircle2, Clock3, Edit, Target, WalletCards } from "lucide-react";
import { MilestoneList } from "../../PublicPages/PublicPages.helpers";

export function MyJobDetailPage() {
  const { jobId } = useParams();
  const [job, setJob] = useState<Job | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [technologies, setTechnologies] = useState<Technology[]>([]);
  const [jobDomainIds, setJobDomainIds] = useState<number[]>([]);
  const [jobSkills, setJobSkills] = useState<JobSkill[]>([]);
  const [jobTechnologies, setJobTechnologies] = useState<JobTechnology[]>([]);
  const [showNotice, setShowNotice] = useState(false);

  useEffect(() => {
    const id = Number(jobId);
    marketplaceApi.getJob(id).then(setJob).catch(console.error);

    Promise.all([
      catalogApi.listDomains(true),
      catalogApi.listSkills(true),
      catalogApi.listTechnologies(true),
    ])
      .then(([d, s, t]) => {
        setDomains(d);
        setSkills(s);
        setTechnologies(t);
      })
      .catch(console.error);

    catalogApi
      .listJobDomains(id)
      .then((jds) => setJobDomainIds(jds.map((jd) => jd.id.domainId)))
      .catch(console.error);
    catalogApi.listJobSkills(id).then(setJobSkills).catch(console.error);
    catalogApi
      .listJobTechnologies(id)
      .then(setJobTechnologies)
      .catch(console.error);
    contractApi.listJobMilestones(id).then(setMilestones).catch(console.error);
  }, [jobId]);

  if (!job) {
    return (
      <div className="p-8 text-center text-slate-500">
        Đang tải thông tin dự án...
      </div>
    );
  }

  const isDraft = job.status.trim().toUpperCase() === "DRAFT";
  const canEdit = ["DRAFT", "OPEN"].includes(job.status.trim().toUpperCase());

  const updateStatus = async (jobId: number, status: string) => {
    try {
      const updated = await marketplaceApi.updateJobStatus(jobId, status);
      setJob(updated);
    } catch (error) {
      console.error(error);
    }
  };

  const handleRestrictedAction = (e: React.MouseEvent) => {
    if (isDraft) {
      e.preventDefault();
      setShowNotice(true);
    }
  };

  const translateStatus = (status: string) => {
    switch (status) {
      case "OPEN":
        return "Đang mở";
      case "IN_PROGRESS":
        return "Đang thực hiện";
      case "DRAFT":
        return "Nháp";
      case "CLOSED":
        return "Đã đóng";
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          title={job.title}
          description="Chi tiết công việc bạn đã đăng tải."
          actions={
            <div className="flex gap-2">
              {canEdit && (
                <LinkButton
                  to={`/app/jobs/${job.jobId}/edit`}
                  variant="secondary"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Chỉnh sửa
                </LinkButton>
              )}
            </div>
          }
        />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <StatusBadge status={translateStatus(job.status)} />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card className="p-6">
            <SectionHeading
              title="Yêu cầu dự án"
              description="Nội dung SOW và mô tả chi tiết."
            />
            <div className="prose prose-slate mt-4 max-w-none prose-p:leading-relaxed prose-a:text-brand-600">
              <div
                dangerouslySetInnerHTML={{
                  __html: (job.structuredSow || job.rawRequirements).replace(
                    /\n/g,
                    "<br/>",
                  ),
                }}
              />
            </div>
          </Card>

          <Card className="p-6">
            <SectionHeading title="Kỹ năng & Công nghệ yêu cầu" />
            <div className="mt-4">
              {jobSkills.length > 0 || jobTechnologies.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {jobSkills.map((js) => {
                    const skill = skills.find(
                      (s) => s.skillId === js.id.skillId,
                    );
                    if (!skill) return null;
                    return (
                      <span
                        key={`skill-${skill.skillId}`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-100 bg-indigo-50/50 px-3 py-1.5 text-sm font-semibold text-indigo-700"
                      >
                        {skill.skillName}
                        {js.isMandatory && (
                          <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-black uppercase text-indigo-800">
                            Bắt buộc
                          </span>
                        )}
                      </span>
                    );
                  })}
                  {jobTechnologies.map((jt) => {
                    const tech = technologies.find(
                      (t) => t.technologyId === jt.id.technologyId,
                    );
                    if (!tech) return null;
                    return (
                      <span
                        key={`tech-${tech.technologyId}`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-1.5 text-sm font-semibold text-emerald-700"
                      >
                        {tech.technologyName}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  Chưa khai báo kỹ năng & công nghệ.
                </p>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <SectionHeading
              title="Milestone dự án"
              description="Các mốc công việc doanh nghiệp đã khai báo khi tạo job."
            />
            <MilestoneList milestones={milestones} />
          </Card>
        </div>

        <aside className="space-y-4">
          <Card className="p-5">
            <SectionHeading title="Tóm tắt dự án" />
            <div className="mt-5 grid gap-3">
              <InfoRow
                icon={<WalletCards className="h-4 w-4" />}
                label="Ngân sách"
                value={formatCurrency(job.budget)}
              />
              <InfoRow
                icon={<Clock3 className="h-4 w-4" />}
                label="Thời lượng"
                value={`${job.plannedDurationValue || 0} ${job.plannedDurationUnit === "WEEK" ? "TUẦN" : (job.plannedDurationUnit || "TUẦN")}`}
              />
              <InfoRow
                icon={<Target className="h-4 w-4" />}
                label="Lĩnh vực"
                value={
                  domains
                    .filter((d) => jobDomainIds.includes(d.domainId))
                    .map((d) => d.domainName)
                    .join(", ") || "Chưa cập nhật"
                }
              />
              <InfoRow
                icon={<CheckCircle2 className="h-4 w-4" />}
                label="Milestone"
                value={`${milestones.length} mốc`}
              />
            </div>

            <Link
              to={`/app/jobs/${job.jobId}/manage`}
              onClick={handleRestrictedAction}
              className="mt-5 flex h-12 w-full items-center justify-center rounded-xl border-2 border-transparent bg-[#b30069] px-6 text-[15px] font-bold text-white transition-all hover:-translate-y-1 hover:border-[#b30069] hover:bg-white hover:text-[#b30069] hover:shadow-lg"
            >
              Lựa chọn chuyên gia
            </Link>

            <Link
              to={`/jobs/${job.jobId}`}
              onClick={handleRestrictedAction}
              className="mt-3 flex h-12 w-full items-center justify-center rounded-xl border-2 border-transparent bg-[#b30069] px-6 text-[15px] font-bold text-white transition-all hover:-translate-y-1 hover:border-[#b30069] hover:bg-white hover:text-[#b30069] hover:shadow-lg"
            >
              Xem trang Public
            </Link>

            {showNotice && isDraft && (
              <Notice
                tone="warning"
                title="Dự án chưa được mở"
                className="mt-5"
              >
                <p>
                  Vui lòng đăng tải thông tin của dự án để sử dụng các tính năng
                  trên.
                </p>
                <Button
                  onClick={() => {
                    updateStatus(job.jobId, "OPEN");
                    setShowNotice(false);
                  }}
                  size="sm"
                  className="mt-3 w-full bg-green-600 text-white transition-all hover:-translate-y-1 hover:bg-green-700"
                >
                  Mở dự án
                </Button>
              </Notice>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-brand-600 shadow-sm">
        {icon}
      </span>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </p>
        <p className="mt-0.5 text-sm font-black text-ink">{value}</p>
      </div>
    </div>
  );
}

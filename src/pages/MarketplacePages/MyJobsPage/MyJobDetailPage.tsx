import { useEffect, useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import {
  catalogApi,
  contractApi,
  marketplaceApi,
  type Domain,
  type JobSkill,
  type Skill,
} from "../../../services";
import type { Job, Milestone } from "../../../types";
import { formatCurrency } from "../../../lib/utils";
import {
  Card,
  LinkButton,
  PageHeader,
  SectionHeading,
  StatusBadge,
} from "../../../components/ui";
import {
  CheckCircle2,
  Clock3,
  Edit,
  Target,
  WalletCards,
} from "lucide-react";
import { MilestoneList } from "../../PublicPages/PublicPages.helpers";

export function MyJobDetailPage() {
  const { jobId } = useParams();
  const [job, setJob] = useState<Job | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [jobDomainIds, setJobDomainIds] = useState<number[]>([]);
  const [jobSkills, setJobSkills] = useState<JobSkill[]>([]);

  useEffect(() => {
    const id = Number(jobId);
    marketplaceApi.getJob(id).then(setJob).catch(console.error);
    
    Promise.all([
      catalogApi.listDomains(true),
      catalogApi.listSkills(true),
    ]).then(([d, s]) => {
      setDomains(d);
      setSkills(s);
    }).catch(console.error);

    catalogApi.listJobDomains(id).then((jds) => setJobDomainIds(jds.map((jd) => jd.id.domainId))).catch(console.error);
    catalogApi.listJobSkills(id).then(setJobSkills).catch(console.error);
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

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          title={job.title}
          description="Chi tiết công việc bạn đã đăng tải."
          actions={
            <div className="flex gap-2">
              {isDraft && (
                <LinkButton to={`/app/jobs/${job.jobId}/edit`} variant="secondary">
                  <Edit className="mr-2 h-4 w-4" />
                  Chỉnh sửa job
                </LinkButton>
              )}
            </div>
          }
        />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <StatusBadge status={job.status} />
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
              {jobSkills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {jobSkills.map((js) => {
                    const skill = skills.find((s) => s.skillId === js.id.skillId);
                    if (!skill) return null;
                    return (
                      <span
                        key={skill.skillId}
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
                </div>
              ) : (
                <p className="text-sm text-slate-500">Chưa khai báo kỹ năng.</p>
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
                value={`${job.plannedDurationValue || 0} ${job.plannedDurationUnit || "tuần"}`}
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
            
            <LinkButton
              to={`/app/jobs/${job.jobId}/manage`}
              className="mt-5 w-full"
            >
              Quản lý dự án
            </LinkButton>
            
            <LinkButton
              to={`/jobs/${job.jobId}`}
              variant="secondary"
              className="mt-3 w-full"
            >
              Xem trang Public
            </LinkButton>
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

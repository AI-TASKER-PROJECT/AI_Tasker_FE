import {
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  Star,
  Target,
  WalletCards,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  catalogApi,
  contractApi,
  marketplaceApi,
  profileApi,
  type Domain,
  type JobSkill,
  type JobTechnology,
  type Skill,
  type Technology,
} from "../../../lib/api";
import { useSession } from "../../../lib/session";
import { formatCurrency, maskSensitiveValue } from "../../../lib/utils";
import type { BusinessProfile, Job, Milestone } from "../../../types";
import {
  Button,
  Card,
  LinkButton,
  Modal,
  Notice,
  SectionHeading,
} from "../../../components/ui";
import {
  ChipRow,
  BusinessInfoItem,
  InfoRow,
  MilestoneList,
  resolveSkillName,
  resolveTechnologyName,
} from "../PublicPages.shared";

export function JobDetailPage() {
  const { jobId } = useParams();
  const session = useSession();
  const [job, setJob] = useState<Job | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [technologies, setTechnologies] = useState<Technology[]>([]);
  const [jobDomainIds, setJobDomainIds] = useState<number[]>([]);
  const [jobSkills, setJobSkills] = useState<JobSkill[]>([]);
  const [jobTechnologies, setJobTechnologies] = useState<JobTechnology[]>([]);
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [businessOpen, setBusinessOpen] = useState(false);
  const [businessLoading, setBusinessLoading] = useState(false);

  //cmt1: Tải chi tiết Job, domain/skill/technology và milestone để chuyên gia xem trước khi nộp proposal.
  useEffect(() => {
    const id = Number(jobId);
    marketplaceApi.getJob(id).then(setJob);
    Promise.all([
      catalogApi.listDomains(true),
      catalogApi.listSkills(true),
      catalogApi.listTechnologies(true),
      catalogApi.listJobDomains(id),
      catalogApi.listJobSkills(id),
      catalogApi.listJobTechnologies(id).catch(() => []),
    ])
      .then(
        ([
          domainItems,
          skillItems,
          technologyItems,
          jobDomainItems,
          jobSkillItems,
          jobTechnologyItems,
        ]) => {
          setDomains(domainItems);
          setSkills(skillItems);
          setTechnologies(technologyItems);
          setJobDomainIds(jobDomainItems.map((item) => item.id.domainId));
          setJobSkills(jobSkillItems);
          setJobTechnologies(jobTechnologyItems);
        },
      )
      .catch(() => {
        setDomains([]);
        setSkills([]);
        setTechnologies([]);
        setJobDomainIds([]);
        setJobSkills([]);
        setJobTechnologies([]);
      });
    contractApi
      .listJobMilestones(id)
      .then(setMilestones)
      .catch(() => setMilestones([]));
  }, [jobId]);

  //cmt2: Tải hồ sơ doanh nghiệp đăng Job để chuyên gia đánh giá độ tin cậy trước khi gửi proposal.
  useEffect(() => {
    if (!job) return;
    let ignore = false;
    const currentJobId = job.jobId;

    // Lấy thông tin doanh nghiệp theo Job hiện tại và cập nhật modal chi tiết doanh nghiệp.
    async function loadBusiness() {
      setBusinessLoading(true);
      try {
        const profile = await profileApi.getBusinessByJob(currentJobId);
        if (!ignore) setBusiness(profile);
      } catch {
        if (!ignore) setBusiness(null);
      } finally {
        if (!ignore) setBusinessLoading(false);
      }
    }

    loadBusiness();
    return () => {
      ignore = true;
    };
  }, [job]);

  if (!job) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        Đang tải job...
      </main>
    );
  }

  //cmt3: Chỉ cho phép chuyên gia nộp proposal khi Job đang ở trạng thái OPEN.
  const isOpenJob = job.status === "OPEN";
  const canSubmitProposal = session?.role === "EXPERT" && isOpenJob;

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 md:px-6">
      <div className="mb-8">
        <h1 className="mt-5 font-display text-4xl font-black tracking-[-0.045em] text-ink">
          {job.title}
        </h1>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          <Card className="p-6">
            <SectionHeading title="Thông tin dự án" />
            <div className="mt-5 whitespace-pre-wrap rounded-3xl bg-gradient-to-br from-brand-50 to-indigo-50 p-5 text-sm leading-7 text-slate-700">
              {job.structuredSow ||
                "Chưa có SoW. Doanh nghiệp có thể cập nhật bằng AI Job Assistant."}
            </div>
            <div className="mt-6 grid gap-4 border-t border-slate-100 pt-5">
              <ChipRow
                label="Kĩ năng:"
                items={jobSkills.map((item) =>
                  resolveSkillName(item.id.skillId, skills),
                )}
              />
              <ChipRow
                label="Công nghệ:"
                items={jobTechnologies.map((item) =>
                  resolveTechnologyName(item.id.technologyId, technologies),
                )}
              />
            </div>
          </Card>
          <Card className="mt-6 p-6">
            <SectionHeading
              title="Milestone dự án"
              description="Các mốc công việc doanh nghiệp dã khai báo khi tạo job."
            />
            <MilestoneList milestones={milestones} />
            {(canSubmitProposal || !session) && (
              <div className="mt-8 flex justify-center border-t border-slate-100 pt-6">
                <LinkButton
                  to={session ? `/app/jobs/${job.jobId}/proposal` : "/login"}
                  size="lg"
                  className="px-8"
                >
                  Nộp proposal ngay
                </LinkButton>
              </div>
            )}
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
                value={`${job.plannedDurationValue || 0} ${job.plannedDurationUnit === "WEEK" ? "TUẦN" : job.plannedDurationUnit || "TUẦN"}`}
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
                icon={<BriefcaseBusiness className="h-4 w-4" />}
                label="Doanh nghiệp"
                value={
                  business?.companyName || job.companyName || "Đang cập nhật"
                }
              />
              <InfoRow
                icon={<CheckCircle2 className="h-4 w-4" />}
                label="Milestone"
                value={`${milestones.length} mốc`}
              />
            </div>
            {business && (
              <Button
                onClick={() => setBusinessOpen(true)}
                className="mt-5 w-full"
              >
                Chi tiết doanh nghiệp
              </Button>
            )}
            {canSubmitProposal && (
              <LinkButton
                to={`/app/jobs/${job.jobId}/proposal`}
                className="mt-5 w-full"
              >
                Nộp Proposal ngay
              </LinkButton>
            )}
            {!session && (
              <LinkButton to="/login" className="mt-5 w-full">
                Nộp Proposal ngay
              </LinkButton>
            )}

            {session?.role === "EXPERT" && !isOpenJob && (
              <>
                <Button className="mt-5 w-full" disabled>
                  Nộp báo giá dự thầu
                </Button>
                <p className="mt-2 text-xs font-semibold text-slate-400">
                  Dự án cần ở trạng thái OPEN dể nhận proposal.
                </p>
              </>
            )}
          </Card>
        </aside>
      </div>
      <Modal
        open={businessOpen}
        onClose={() => setBusinessOpen(false)}
        title="Thông tin doanh nghiệp"
        description="Dữ liệu hồ sơ KYB của doanh nghiệp dăng job."
        size="lg"
      >
        <div className="grid gap-4">
          {businessLoading && (
            <Notice tone="info" title="Đang tải hồ sơ doanh nghiệp..." />
          )}
          {!businessLoading && !business && (
            <Notice
              tone="warning"
              title="Chưa lấy dược hồ sơ doanh nghiệp từ API hiện tại."
            />
          )}
          <div className="grid gap-3 md:grid-cols-2">
            <BusinessInfoItem
              label="Tên doanh nghiệp"
              value={
                business?.companyName || job.companyName || "Chưa có dữ liệu"
              }
            />
            <BusinessInfoItem
              label="Mã số thuế"
              value={maskSensitiveValue(business?.taxCode)}
            />
            <BusinessInfoItem
              label="Trạng thái KYB"
              value={business?.kybStatus || "Chưa có dữ liệu"}
            />
            <BusinessInfoItem
              label="Địa chỉ"
              value={business?.address || "Chưa có dữ liệu"}
              multiline
            />
          </div>
          <ProfileRating value={business?.averageRating} />
        </div>
      </Modal>
    </main>
  );
}

function ProfileRating({ value }: { value?: number }) {
  const rating = Number(value);
  const hasRating = Number.isFinite(rating) && rating > 0;

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">
        Điểm đánh giá trung bình
      </p>
      {hasRating ? (
        <div className="mt-2 flex items-center gap-3">
          <span className="text-2xl font-black text-amber-500">
            {rating.toFixed(1)}/5
          </span>
          <div
            className="flex items-center gap-1"
            aria-label={`${rating.toFixed(1)} trên 5 sao`}
          >
            {Array.from({ length: 5 }, (_, index) => (
              <Star
                key={index}
                className="h-5 w-5 fill-amber-400 text-amber-400"
              />
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-2 text-sm font-semibold text-slate-400">
          Chưa có đánh giá
        </p>
      )}
    </div>
  );
}

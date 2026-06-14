/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  CheckCircle2,
  Eye,
  FileCheck2,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  XCircle,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import {
  catalogApi,
  contractApi,
  getApiErrorMessage,
  marketplaceApi,
  profileApi,
  sowApi,
  type GeneratedSow,
  type GeneratedSowMilestone,
  type Domain,
  type JobSkill,
  type Skill,
} from "../../../services";
import { cn, formatCompactCurrency, formatCurrency } from "../../../lib/utils";
import { useSession } from "../../../context/sessionContext";
import { FirebaseFileLink } from "../../../components/FirebaseFileLink";
import type {
  AcceptanceCriteria,
  ExpertProfile,
  Job,
  Milestone,
  Portfolio,
  Proposal,
} from "../../../types";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  LinkButton,
  Modal,
  Notice,
  PageHeader,
  SearchInput,
  SectionHeading,
  StatusBadge,
  Textarea,
} from "../../../components/ui";
import { JobCard, JobDomainBadge } from "../../PublicPages";
import {
  formatGeneratedSow,
  jobDomainLabel,
  parseCatalogIdList,
  resolveDomainName,
  resolveSkillName,
  skillCountLabel,
  type MilestoneDraft,
  type SkillAssignment,
} from "../marketplacePages.utils";
import { CompactMilestones } from "../marketplacePages.helpers";
export function ManageJobPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [jobDomains, setJobDomains] = useState<number[]>([]);
  const [jobSkills, setJobSkills] = useState<JobSkill[]>([]);
  const [proposalTab, setProposalTab] = useState<"ai" | "proposal">("proposal");
  const [contractModal, setContractModal] = useState<Proposal | null>(null);
  const [contractForm, setContractForm] = useState({
    technologyUsed: "Python, FastAPI, PostgreSQL",
    totalBudget: "",
    timelineDays: "60",
  });

  useEffect(() => {
    const id = Number(jobId);
    marketplaceApi.getJob(id).then(setJob);
    marketplaceApi.listProposals(id).then(setProposals);
    Promise.all([
      catalogApi.listDomains(true),
      catalogApi.listSkills(true),
      catalogApi.listJobDomains(id),
      catalogApi.listJobSkills(id),
    ])
      .then(([domainItems, skillItems, jobDomainItems, jobSkillItems]) => {
        setDomains(domainItems);
        setSkills(skillItems);
        setJobDomains(jobDomainItems.map((item) => item.id.domainId));
        setJobSkills(jobSkillItems);
      })
      .catch(() => {
        setDomains([]);
        setSkills([]);
        setJobDomains([]);
        setJobSkills([]);
      });
    contractApi
      .listJobMilestones(id)
      .then(setMilestones)
      .catch(() => setMilestones([]));
  }, [jobId]);

  if (!job) return <div>Đang tải job...</div>;

  const review = async (
    proposalId: number,
    status: "Accepted" | "Rejected",
  ) => {
    const updated = await marketplaceApi.reviewProposal(proposalId, status);
    setProposals((items) =>
      items.map((item) => (item.proposalId === proposalId ? updated : item)),
    );
  };

  const createContract = async () => {
    if (!contractModal) return;
    const contract = await contractApi.createFromProposal(
      contractModal.proposalId,
      {
        technologyUsed: contractForm.technologyUsed,
        totalBudget: Number(
          contractForm.totalBudget || contractModal.bidAmount,
        ),
        timelineDays: Number(contractForm.timelineDays),
      },
    );
    setContractModal(null);
    navigate(`/app/contracts/${contract.contractId}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="MATCH-01 / MATCH-02"
        title={job.title}
        description="Theo dõi job, milestone đã khai báo và proposal chuyên gia gửi cho doanh nghiệp."
        actions={
          <LinkButton to={`/jobs/${job.jobId}`} variant="secondary">
            Xem public detail
          </LinkButton>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card className="p-6">
          <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-100 pb-4">
            <Button
              variant={proposalTab === "ai" ? "primary" : "secondary"}
              onClick={() => setProposalTab("ai")}
            >
              <Sparkles className="h-4 w-4" />
              AI đề xuất chuyên gia
            </Button>
            <Button
              variant={proposalTab === "proposal" ? "primary" : "secondary"}
              onClick={() => setProposalTab("proposal")}
            >
              <FileCheck2 className="h-4 w-4" />
              Proposal của chuyên gia
            </Button>
          </div>
          {proposalTab === "ai" && (
            <div className="grid gap-4">
              <SectionHeading
                title="AI đề xuất chuyên gia"
                description="Khu vực giao diện chuẩn bị cho AI matching. Chức năng đề xuất tự động sẽ được nối sau."
              />
              <div className="grid gap-4 md:grid-cols-2">
                {[1, 2].map((item) => (
                  <div
                    key={item}
                    className="rounded-3xl border border-dashed border-brand-200 bg-brand-50/40 p-5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-brand-600">
                        <Sparkles className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="font-extrabold text-ink">
                          Chuyên gia đề xuất #{item}
                        </p>
                        <p className="text-sm font-semibold text-slate-500">
                          Đang chờ AI matching
                        </p>
                      </div>
                    </div>
                    <div className="mt-5 grid gap-2 text-sm">
                      <div className="flex justify-between gap-3">
                        <span className="text-slate-500">Phù hợp lĩnh vực</span>
                        <span className="font-bold text-slate-400">
                          Chưa có dữ liệu
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-slate-500">Skill khớp</span>
                        <span className="font-bold text-slate-400">
                          Chưa có dữ liệu
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-slate-500">Trạng thái</span>
                        <Badge tone="amber">Sắp tích hợp</Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Notice tone="info" title="AI matching chưa kích hoạt">
                Tab này giữ giao diện cho luồng AI đề xuất chuyên gia, chưa gọi
                API đề xuất thật.
              </Notice>
            </div>
          )}
          <div className={proposalTab === "proposal" ? "block" : "hidden"}>
            <SectionHeading
              title="Proposal của chuyên gia"
              description="Danh sách proposal được chuyên gia gửi trực tiếp cho job này."
            />
            <div className="mt-6 grid gap-4">
              {proposals.map((proposal) => (
                <ProposalCard
                  key={proposal.proposalId}
                  proposal={proposal}
                  onAccept={() => review(proposal.proposalId, "Accepted")}
                  onReject={() => review(proposal.proposalId, "Rejected")}
                  onContract={() => {
                    setContractModal(proposal);
                    setContractForm((value) => ({
                      ...value,
                      totalBudget: String(proposal.bidAmount),
                    }));
                  }}
                />
              ))}
              {proposals.length === 0 && (
                <EmptyState
                  title="Chưa có proposal"
                  description="Job này chưa có proposal từ chuyên gia."
                />
              )}
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="grid justify-items-start gap-3">
            <JobDomainBadge label={jobDomainLabel(jobDomains, domains)} />
            <SectionHeading title="Tóm tắt SoW" />
          </div>
          <p className="mt-4 break-words text-sm leading-7 text-slate-600">
            {job.structuredSow || job.rawRequirements}
          </p>
          <div className="mt-5 grid gap-3 rounded-3xl bg-slate-50 p-4">
            <div className="grid grid-cols-[96px_minmax(0,1fr)] items-start gap-3 text-sm">
              <span className="text-slate-500">Ngân sách</span>
              <span className="min-w-0 break-words text-right font-extrabold text-ink">
                {formatCurrency(job.budget)}
              </span>
            </div>
            <div className="grid grid-cols-[96px_minmax(0,1fr)] items-start gap-3 text-sm">
              <span className="text-slate-500">Lĩnh vực</span>
              <div className="flex min-w-0 flex-wrap justify-end gap-1">
                {jobDomains.map((domainId) => (
                  <Badge key={domainId} tone="brand">
                    <span className="max-w-[180px] break-words text-xs">
                      {resolveDomainName(domainId, domains)}
                    </span>
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex justify-between gap-3 text-sm">
              <span className="text-slate-500">Kỹ năng</span>
              <span className="font-extrabold text-ink">
                {skillCountLabel(jobSkills.length)}
              </span>
            </div>
            <div className="flex justify-between gap-3 text-sm">
              <span className="text-slate-500">Trạng thái</span>
              <StatusBadge status={job.status} />
            </div>
            <div className="flex justify-between gap-3 text-sm">
              <span className="text-slate-500">Milestone</span>
              <span className="font-extrabold text-ink">
                {milestones.length} mốc
              </span>
            </div>
          </div>
          <div className="mt-5">
            <SectionHeading title="Kỹ năng yêu cầu" />
            <div className="mt-4 grid gap-2">
              {jobSkills.map((item) => (
                <div
                  key={item.id.skillId}
                  className="rounded-2xl border border-slate-100 bg-white p-3 text-sm"
                >
                  <p className="font-extrabold text-ink">
                    {resolveSkillName(item.id.skillId, skills)}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {item.isMandatory ? "Bắt buộc" : "Optional"}
                  </p>
                </div>
              ))}
              {jobSkills.length === 0 && (
                <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-400">
                  Chưa có kỹ năng yêu cầu.
                </p>
              )}
            </div>
          </div>
          <div className="mt-5">
            <SectionHeading title="Milestone" />
            <CompactMilestones milestones={milestones} />
          </div>
        </Card>
      </div>

      <Modal
        open={Boolean(contractModal)}
        onClose={() => setContractModal(null)}
        title="Tạo hợp đồng nháp"
        description="Tạo draft contract từ proposal đã chọn."
        footer={
          <>
            <Button variant="secondary" onClick={() => setContractModal(null)}>
              Hủy
            </Button>
            <Button onClick={createContract}>Tạo Draft</Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Field label="Công nghệ sử dụng">
            <Input
              value={contractForm.technologyUsed}
              onChange={(event) =>
                setContractForm((value) => ({
                  ...value,
                  technologyUsed: event.target.value,
                }))
              }
            />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Tổng ngân sách">
              <Input
                type="number"
                value={contractForm.totalBudget}
                onChange={(event) =>
                  setContractForm((value) => ({
                    ...value,
                    totalBudget: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Timeline days">
              <Input
                type="number"
                value={contractForm.timelineDays}
                onChange={(event) =>
                  setContractForm((value) => ({
                    ...value,
                    timelineDays: event.target.value,
                  }))
                }
              />
            </Field>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ProposalCard({
  proposal,
  onAccept,
  onReject,
  onContract,
}: {
  proposal: Proposal;
  onAccept: () => void;
  onReject: () => void;
  onContract: () => void;
}) {
  const [expertOpen, setExpertOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailMessage, setDetailMessage] = useState("");
  const [expertProfile, setExpertProfile] = useState<ExpertProfile | null>(
    null,
  );
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);

  useEffect(() => {
    if (!expertOpen) return;
    let ignore = false;

    async function loadExpertDetail() {
      setDetailLoading(true);
      setDetailMessage("");
      const [expertsResult, portfoliosResult] = await Promise.allSettled([
        profileApi.listExperts(),
        profileApi.listPortfolios(),
      ]);
      const [domainsResult, skillsResult] = await Promise.allSettled([
        catalogApi.listDomains(true),
        catalogApi.listSkills(true),
      ]);

      if (ignore) return;

      const experts =
        expertsResult.status === "fulfilled" ? expertsResult.value : [];
      const portfolios =
        portfoliosResult.status === "fulfilled" ? portfoliosResult.value : [];
      const profile =
        experts.find((item) => item.expertId === proposal.expertId) || null;
      const matchedPortfolio =
        portfolios.find((item) => item.expertId === proposal.expertId) || null;

      setExpertProfile(profile);
      setPortfolio(matchedPortfolio);
      setDomains(
        domainsResult.status === "fulfilled" ? domainsResult.value : [],
      );
      setSkills(skillsResult.status === "fulfilled" ? skillsResult.value : []);
      setDetailLoading(false);

      if (
        expertsResult.status === "rejected" ||
        portfoliosResult.status === "rejected"
      ) {
        setDetailMessage("Một số thông tin chưa lấy được từ API hiện tại.");
      }
    }

    loadExpertDetail();
    return () => {
      ignore = true;
    };
  }, [expertOpen, proposal.expertId]);

  const expertName =
    expertProfile?.fullName ||
    proposal.expertName ||
    `Expert #${proposal.expertId}`;
  const domainNames = resolveCatalogNames(
    portfolio?.domainIds,
    domains,
    "domainId",
    "domainName",
  );
  const skillNames = resolveCatalogNames(
    portfolio?.skillIds,
    skills,
    "skillId",
    "skillName",
  );
  const expertPhone = expertProfile?.phone || "Chưa có dữ liệu";

  return (
    <div className="rounded-3xl border border-slate-100 p-4 transition hover:border-brand-100 hover:bg-brand-50/30">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex gap-3">
          <Avatar name={proposal.expertName} />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-extrabold text-ink">
                {proposal.expertName || `Expert #${proposal.expertId}`}
              </p>
              <StatusBadge status={proposal.status} />
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {proposal.expertTitle}
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              {proposal.technicalSolution}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-left md:text-right">
          <p className="font-display text-xl font-black text-ink">
            {formatCompactCurrency(proposal.bidAmount)}
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setExpertOpen(true)}
        >
          <Eye className="h-4 w-4" />
          Xem chi tiết
        </Button>
        <Button variant="success" size="sm" onClick={onAccept}>
          <CheckCircle2 className="h-4 w-4" />
          Accept
        </Button>
        <Button variant="danger" size="sm" onClick={onReject}>
          <XCircle className="h-4 w-4" />
          Reject
        </Button>
        <Button size="sm" onClick={onContract}>
          <FileCheck2 className="h-4 w-4" />
          Tạo contract
        </Button>
      </div>
      <Modal
        open={expertOpen}
        onClose={() => setExpertOpen(false)}
        title="Thông tin chuyên gia"
        description="Profile và portfolio của chuyên gia gửi proposal."
        size="lg"
      >
        <div className="grid gap-5">
          {detailMessage && <Notice tone="warning" title={detailMessage} />}
          <div className="flex items-start gap-4 rounded-3xl bg-slate-50 p-4">
            <Avatar name={expertName} size="xl" />
            <div className="min-w-0">
              <p className="font-display text-2xl font-black text-ink">
                {expertName}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {expertPhone}
              </p>
              {detailLoading && (
                <p className="mt-2 text-xs font-bold text-brand-600">
                  Đang tải hồ sơ...
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <ExpertInfoItem label="Tên chuyên gia" value={expertName} />
            <ExpertInfoItem label="Số điện thoại" value={expertPhone} />
          </div>

          <SectionHeading
            title="Portfolio"
            description="Các thuộc tính trong bảng portfolios của chuyên gia tương ứng."
          />
          <div className="grid gap-3">
            <ExpertInfoItem
              label="Lĩnh vực"
              value={domainNames || "Chưa có dữ liệu"}
              multiline
            />
            <ExpertInfoItem
              label="Skill"
              value={skillNames || "Chưa có dữ liệu"}
              multiline
            />
            <ExpertInfoItem
              label="Số năm kinh nghiệm"
              value={
                portfolio?.yearsExperience != null
                  ? `${portfolio.yearsExperience} năm`
                  : "Chưa có dữ liệu"
              }
            />
            <ExpertInfoBlock label="Chứng chỉ">
              <FirebaseFileLink
                path={portfolio?.certificates}
                emptyText="Chưa có chứng chỉ"
                buttonText="Xem chứng chỉ"
              />
            </ExpertInfoBlock>
            <ExpertInfoItem
              label="Mô tả bản thân"
              value={portfolio?.selfDescription || "Chưa có dữ liệu"}
              multiline
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

function resolveCatalogNames(
  ids: string | undefined,
  items: Array<Domain | Skill>,
  idKey: "domainId" | "skillId",
  nameKey: "domainName" | "skillName",
) {
  if (!ids) return "";
  const parsedIds = ids
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item));
  if (parsedIds.length === 0) return ids;
  const names = parsedIds.map((id) => {
    const item = items.find(
      (catalogItem) =>
        Number(catalogItem[idKey as keyof typeof catalogItem]) === id,
    );
    return item ? String(item[nameKey as keyof typeof item]) : String(id);
  });
  return names.join(", ");
}

function ExpertInfoItem({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p
        className={
          multiline
            ? "mt-2 text-sm leading-6 text-slate-700"
            : "mt-2 break-words text-sm font-extrabold text-ink"
        }
      >
        {value}
      </p>
    </div>
  );
}

function ExpertInfoBlock({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

import {
  Award,
  BrainCircuit,
  CheckCircle2,
  Eye,
  FileCheck2,
  Sparkles,
  Star,
  XCircle,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  catalogApi,
  contractApi,
  expertRecommendationApi,
  getApiErrorMessage,
  marketplaceApi,
  profileApi,
  type Domain,
  type ExpertRecommendationListResponse,
  type ExpertRecommendationResponse,
  type JobSkill,
  type Skill,
} from "../../../services";
import { cn, formatCompactCurrency, formatCurrency } from "../../../lib/utils";
import { FirebaseFileLink } from "../../../components/FirebaseFileLink";
import type {
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
  Progress,
  SectionHeading,
  StatusBadge,
} from "../../../components/ui";
import { JobDomainBadge } from "../../PublicPages";
import {
  jobDomainLabel,
  resolveDomainName,
  resolveSkillName,
  skillCountLabel,
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

  // ── AI Expert Recommendations ──────────────────────────────────────────────
  const [recommendationResult, setRecommendationResult] =
    useState<ExpertRecommendationListResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState("");
  const [aiMessageTone, setAiMessageTone] = useState<
    "info" | "success" | "warning" | "danger"
  >("info");

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
    // Load saved AI recommendations silently
    expertRecommendationApi
      .get(id)
      .then((result) => {
        if (result.recommendations?.length > 0) {
          setRecommendationResult(result);
        }
      })
      .catch(() => {});
  }, [jobId]);

  const generateRecommendations = async () => {
    const id = Number(jobId);
    setAiLoading(true);
    setAiMessage("");
    try {
      const result = await expertRecommendationApi.generate(id);
      setRecommendationResult(result);
      if (result.recommendations?.length === 0) {
        setAiMessage(
          result.message ||
            "AI không tìm thấy chuyên gia phù hợp trong hệ thống.",
        );
        setAiMessageTone("warning");
      } else {
        setAiMessage(
          result.generatedByAi
            ? "AI đã phân tích SoW và chọn top chuyên gia phù hợp nhất."
            : (result.message ??
                "Đề xuất được tạo bằng rule-based ranking (AI không khả dụng)."),
        );
        setAiMessageTone(result.generatedByAi ? "success" : "warning");
      }
    } catch (error) {
      setAiMessage(`Không gọi được AI: ${getApiErrorMessage(error)}`);
      setAiMessageTone("danger");
    } finally {
      setAiLoading(false);
    }
  };

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
            <div className="grid gap-5">
              {/* Header row */}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <SectionHeading
                  title="AI đề xuất chuyên gia"
                  description="Backend lọc top 20 candidate theo skill/domain/kinh nghiệm, sau đó OpenAI chọn top 5 phù hợp nhất với SoW của job."
                />
                <div className="flex gap-2">
                  {recommendationResult && (
                    <Badge
                      tone={
                        recommendationResult.generatedByAi ? "mint" : "amber"
                      }
                    >
                      {recommendationResult.generatedByAi
                        ? "✦ AI generated"
                        : "Rule-based"}
                    </Badge>
                  )}
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    loading={aiLoading}
                    onClick={generateRecommendations}
                  >
                    <BrainCircuit className="h-4 w-4" />
                    {recommendationResult
                      ? "Tạo lại đề xuất"
                      : "Sinh đề xuất AI"}
                  </Button>
                </div>
              </div>

              {/* Notice after generate */}
              {aiMessage && <Notice tone={aiMessageTone} title={aiMessage} />}

              {/* Empty / loading state */}
              {!recommendationResult && !aiLoading && (
                <div className="rounded-3xl border border-dashed border-brand-200 bg-gradient-to-br from-brand-50/60 to-indigo-50/40 px-6 py-12 text-center">
                  <span className="grid h-14 w-14 place-items-center rounded-3xl bg-white text-brand-500 shadow-sm mx-auto">
                    <BrainCircuit className="h-6 w-6" />
                  </span>
                  <p className="mt-4 font-extrabold text-ink">
                    Chưa có đề xuất nào
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Nhấn "Sinh đề xuất AI" để backend phân tích SoW và matching
                    chuyên gia.
                  </p>
                </div>
              )}

              {/* Skeleton while loading */}
              {aiLoading && (
                <div className="grid gap-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-36 animate-pulse rounded-3xl border border-slate-100 bg-slate-100"
                    />
                  ))}
                  <p className="text-center text-sm font-semibold text-brand-600">
                    AI đang phân tích SoW và lọc chuyên gia phù hợp...
                  </p>
                </div>
              )}

              {/* Recommendation cards */}
              {!aiLoading &&
                recommendationResult?.recommendations?.map((rec) => (
                  <ExpertRecommendationCard key={rec.expertId} rec={rec} />
                ))}
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
                  milestones={milestones}
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
  milestones,
  onAccept,
  onReject,
  onContract,
}: {
  proposal: Proposal;
  milestones: Milestone[];
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
  const proposalMilestones = parseProposalMilestones(
    proposal.proposalMilestone,
  );

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white transition hover:border-brand-100 hover:shadow-card">
      <div className="grid gap-4 bg-[linear-gradient(135deg,#f8fbff,#effcf7)] p-5 lg:grid-cols-[1fr_220px]">
        <div className="flex gap-3">
          <Avatar name={proposal.expertName} size="lg" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="break-words font-display text-lg font-black text-ink">
                {proposal.expertName || `Expert #${proposal.expertId}`}
              </p>
              <StatusBadge status={proposal.status} />
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {proposal.expertTitle || "Chuyên gia AI"}
            </p>
            <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
              {proposal.proposalDescription || proposal.technicalSolution}
            </p>
          </div>
        </div>
        <div className="rounded-3xl bg-white/85 p-4 text-left shadow-sm lg:text-right">
          <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">
            Bid amount
          </p>
          <p className="mt-1 font-display text-2xl font-black text-brand-700">
            {formatCompactCurrency(proposal.bidAmount)}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            Proposal #{proposal.proposalId}
          </p>
        </div>
      </div>

      <div className="grid gap-4 p-5">
        <div className="grid gap-3 lg:grid-cols-2">
          <ProposalInfoBlock title="Technical solution">
            {proposal.technicalSolution}
          </ProposalInfoBlock>
          <ProposalInfoBlock title="Proposal description">
            {proposal.proposalDescription || "Chưa có mô tả proposal."}
          </ProposalInfoBlock>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">
              Proposal milestone
            </p>
            {proposalMilestones.length > 0 ? (
              <div className="mt-3 grid gap-2">
                {proposalMilestones.map((item) => (
                  <div
                    key={item.milestoneId}
                    className="grid gap-3 rounded-xl bg-white px-3 py-3 text-sm md:grid-cols-[82px_1fr_auto] md:items-center"
                  >
                    <span className="font-extrabold text-brand-600">
                      {formatProposalMilestoneOrder(
                        item.milestoneId,
                        milestones,
                      )}
                    </span>
                    <span className="font-bold text-slate-600">
                      {formatProposalMilestoneTitle(
                        item.milestoneId,
                        milestones,
                      )}
                      <span className="mt-1 block text-xs font-semibold text-slate-400">
                        {formatProposalMilestoneStatus(
                          item.milestoneId,
                          milestones,
                        )}
                      </span>
                    </span>
                    <span className="font-extrabold text-ink">
                      {formatCompactCurrency(item.proposedBudget)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm font-semibold text-slate-400">
                Chuyên gia giữ ngân sách milestone mặc định hoặc chưa gửi đề
                xuất chi tiết.
              </p>
            )}
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-4">
            <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-slate-400">
              File đính kèm
            </p>
            <FirebaseFileLink
              path={proposal.proposalFileUrl}
              emptyText="Chưa có file proposal"
              buttonText="Xem file"
              showPath={false}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setExpertOpen(true)}
          >
            <Eye className="h-4 w-4" />
            Xem chuyên gia
          </Button>
          <div className="flex flex-wrap gap-2">
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
        </div>
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

function ProposalInfoBlock({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">
        {title}
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-700">
        {children || "Chưa có dữ liệu."}
      </p>
    </div>
  );
}

function parseProposalMilestones(value: unknown) {
  if (!value) return [];
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => ({
        milestoneId: Number(item.milestoneId),
        proposedBudget: Number(item.proposedBudget),
      }))
      .filter(
        (item) =>
          Number.isFinite(item.milestoneId) &&
          Number.isFinite(item.proposedBudget),
      );
  } catch {
    return [];
  }
}

function formatProposalMilestoneTitle(
  milestoneId: number,
  milestones: Milestone[],
) {
  const milestone = milestones.find((item) => item.milestoneId === milestoneId);
  if (!milestone) return `Milestone #${milestoneId}`;
  return milestone.milestoneName;
}

function formatProposalMilestoneOrder(
  milestoneId: number,
  milestones: Milestone[],
) {
  const milestone = milestones.find((item) => item.milestoneId === milestoneId);
  return milestone ? `Mốc ${milestone.orderIndex}` : "Milestone";
}

function formatProposalMilestoneStatus(
  milestoneId: number,
  milestones: Milestone[],
) {
  return (
    milestones.find((item) => item.milestoneId === milestoneId)?.status ||
    "Pending"
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

// ─── Expert Recommendation Card ───────────────────────────────────────────────
function ExpertRecommendationCard({
  rec,
}: {
  rec: ExpertRecommendationResponse;
}) {
  const rankColors = [
    "from-amber-400 to-yellow-300", // #1 gold
    "from-slate-400 to-slate-300", // #2 silver
    "from-orange-400 to-amber-300", // #3 bronze
    "from-brand-400 to-indigo-400", // #4
    "from-brand-300 to-violet-300", // #5
  ];
  const gradientClass =
    rankColors[(rec.rankPosition ?? 1) - 1] ?? rankColors[4];
  const score = rec.matchScore ?? 0;

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition hover:border-brand-100 hover:shadow-card">
      {/* Header */}
      <div className="grid gap-4 bg-gradient-to-r from-slate-50 to-brand-50/30 p-5 md:grid-cols-[56px_1fr_160px]">
        {/* Rank badge */}
        <div
          className={`grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${gradientClass} text-white shadow`}
        >
          <span className="text-xl font-black">#{rec.rankPosition}</span>
        </div>

        {/* Expert info */}
        <div className="min-w-0">
          <p className="font-display text-base font-extrabold text-ink">
            Expert #{rec.expertId}
          </p>
          <p className="mt-0.5 text-xs font-semibold text-slate-400">
            Expert ID: {rec.expertId}
            {rec.portfolioId ? ` · Portfolio ID: ${rec.portfolioId}` : ""}
          </p>
        </div>

        {/* Match score */}
        <div className="text-right">
          <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">
            Match score
          </p>
          <p
            className={cn(
              "mt-1 font-display text-3xl font-black",
              score >= 80
                ? "text-mint-600"
                : score >= 50
                  ? "text-amber-500"
                  : "text-slate-400",
            )}
          >
            {score.toFixed(1)}
            <span className="text-base font-bold opacity-60">%</span>
          </p>
          <Progress
            value={score}
            color={score >= 80 ? "mint" : score >= 50 ? "coral" : "brand"}
            className="mt-2"
          />
        </div>
      </div>

      {/* Body */}
      <div className="grid gap-4 p-5 pt-4">
        {/* Skills & Domains */}
        <div className="grid gap-3 md:grid-cols-2">
          {(rec.matchedSkills?.length ?? 0) > 0 && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-slate-400">
                <Star className="h-3.5 w-3.5" />
                Kỹ năng khớp
              </p>
              <div className="flex flex-wrap gap-1.5">
                {rec.matchedSkills!.map((skill) => (
                  <Badge key={skill} tone="brand">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {(rec.matchedDomains?.length ?? 0) > 0 && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-slate-400">
                <Award className="h-3.5 w-3.5" />
                Lĩnh vực khớp
              </p>
              <div className="flex flex-wrap gap-1.5">
                {rec.matchedDomains!.map((domain) => (
                  <Badge key={domain} tone="mint">
                    {domain}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* AI reasoning */}
        {rec.reason && (
          <div className="rounded-2xl border border-brand-100 bg-brand-50/50 p-4">
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-brand-600">
              <BrainCircuit className="h-3.5 w-3.5" />
              Lý do AI đề xuất
            </p>
            <p className="text-sm leading-6 text-slate-700">{rec.reason}</p>
          </div>
        )}
      </div>
    </div>
  );
}

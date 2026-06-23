import {
  Award,
  BrainCircuit,
  CheckCircle2,
  Eye,
  FileCheck2,
  Sparkles,
  Star,
  XCircle,
  Heart,
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
import {
  cn,
  formatCompactCurrency,
  formatCurrency,
  formatDate,
} from "../../../lib/utils";
import { FirebaseFileLink } from "../../../components/FirebaseFileLink";
import type {
  ExpertProfile,
  Job,
  Milestone,
  Portfolio,
  Proposal,
  Contract,
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
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [jobDomains, setJobDomains] = useState<number[]>([]);
  const [jobSkills, setJobSkills] = useState<JobSkill[]>([]);
  const [proposalTab, setProposalTab] = useState<"ai" | "proposal">("proposal");
  const [contractModal, setContractModal] = useState<Proposal | null>(null);
  const [contractForm, setContractForm] = useState({
    contractTitle: "",
    timelineDays: "60",
  });
  const [contractError, setContractError] = useState("");
  const [contractLoading, setContractLoading] = useState(false);

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
    contractApi
      .listContracts()
      .then(setContracts)
      .catch(() => setContracts([]));
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
                "Đề xuất dược tạo bằng rule-based ranking (AI không khả dụng)."),
        );
        setAiMessageTone(result.generatedByAi ? "success" : "warning");
      }
    } catch (error) {
      setAiMessage(
        `Tài khoản chưa dăng kí prenium: ${getApiErrorMessage(error)}`,
      );
      setAiMessageTone("danger");
    } finally {
      setAiLoading(false);
    }
  };

  if (!job) return <div>Đang tải job...</div>;

  const jobStatus = job.status.trim().toUpperCase();
  const jobInProgress = jobStatus === "IN_PROGRESS";
  const contractTimelineDays = Math.max(
    1,
    Number(contractForm.timelineDays) || 1,
  );
  const contractStartDate = new Date();
  const contractEndDate = new Date(contractStartDate);
  contractEndDate.setDate(contractEndDate.getDate() + contractTimelineDays);

  const review = async (
    proposalId: number,
    status: "Accepted" | "Rejected",
  ) => {
    if (jobInProgress) return;
    const updated = await marketplaceApi.reviewProposal(proposalId, status);
    setProposals((items) =>
      items.map((item) => (item.proposalId === proposalId ? updated : item)),
    );
  };

  const createContract = async () => {
    if (!contractModal) return;
    if (jobInProgress) {
      setContractError(
        "Job đang IN_PROGRESS nên không thể tạo hoặc thay dổi hợp đồng.",
      );
      return;
    }
    if (contractModal.status !== "Accepted") {
      setContractError("Chỉ tạo contract draft sau khi proposal đã Accepted.");
      return;
    }
    if (milestones.length === 0) {
      setContractError(
        "Job cần có ít nhất một milestone dể tạo contract draft.",
      );
      return;
    }
    setContractError("");
    setContractLoading(true);
    try {
      const contract = await contractApi.createFromProposal(
        contractModal.proposalId,
        {
          contractTitle:
            contractForm.contractTitle.trim() || `Contract - ${job.title}`,
          timelineDays: Number(contractForm.timelineDays),
        },
      );
      setContracts((items) => [contract, ...items]);
      setContractModal(null);
      navigate(`/app/contracts/${contract.contractId}`);
    } catch (error) {
      setContractError(getApiErrorMessage(error));
    } finally {
      setContractLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          title={job.title}
          description="Theo dõi job, milestone đã khai báo và proposal chuyên gia gửi cho doanh nghiệp."
          actions={
            <LinkButton to={`/jobs/${job.jobId}`} variant="secondary">
              Xem public detail
            </LinkButton>
          }
        />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card className="p-6">
          <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-100 pb-4">
            <Button
              variant={proposalTab === "ai" ? "primary" : "secondary"}
              onClick={() => {
                setProposalTab("ai");
                if (!recommendationResult && !aiLoading) {
                  generateRecommendations();
                }
              }}
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
                  description="Top 5 chuyên gia phù hợp nhất với yêu cầu của dự án"
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
                </div>
              </div>

              {/* Notice after generate */}
              {aiMessage && <Notice tone={aiMessageTone} title={aiMessage} />}

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
              {!aiLoading && (
                <div className="grid gap-4">
                  {recommendationResult?.recommendations?.map((rec) => (
                    <ExpertRecommendationCard
                      key={rec.expertId}
                      rec={rec}
                      jobId={job.jobId}
                      onRefresh={() => {
                        setRecommendationResult((prev) => {
                          if (!prev) return prev;
                          return {
                            ...prev,
                            recommendations: prev.recommendations.map((r) =>
                              r.expertId === rec.expertId
                                ? { ...r, businessSelected: true }
                                : r,
                            ),
                          };
                        });
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
          <div className={proposalTab === "proposal" ? "block" : "hidden"}>
            <SectionHeading
              title="Proposal của chuyên gia"
              description="Danh sách proposal dược chuyên gia gửi cho dự án này."
            />
            {jobInProgress && (
              <Notice
                tone="info"
                title="Job đang IN_PROGRESS, các thao tác dổi proposal và tạo hợp đồng đã bị khóa."
                className="mt-4"
              />
            )}
            <div className="mt-6 grid gap-4">
              {proposals.map((proposal) => (
                <ProposalCard
                  key={proposal.proposalId}
                  proposal={proposal}
                  milestones={milestones}
                  contract={contracts.find(
                    (contract) => contract.proposalId === proposal.proposalId,
                  )}
                  onAccept={() => review(proposal.proposalId, "Accepted")}
                  onReject={() => review(proposal.proposalId, "Rejected")}
                  statusLocked={jobInProgress}
                  onContract={() => {
                    setContractError("");
                    setContractModal(proposal);
                    setContractForm((value) => ({
                      ...value,
                      contractTitle: `Contract - ${job.title}`,
                      timelineDays: String(proposal.deliveryDays || 60),
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
            <SectionHeading title="Tóm tắt dự án" />
          </div>
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
              <span className="text-slate-500">Ngày tạo job</span>
              <span className="font-extrabold text-ink">
                {formatDate(job.createdAt)}
              </span>
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
            <Button
              variant="secondary"
              onClick={() => setContractModal(null)}
              disabled={contractLoading}
            >
              Hủy
            </Button>
            <Button
              onClick={createContract}
              loading={contractLoading}
              disabled={
                contractLoading ||
                jobInProgress ||
                contractModal?.status !== "Accepted" ||
                milestones.length === 0
              }
            >
              Tạo Draft
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          {contractError && <Notice tone="danger" title={contractError} />}
          {contractModal?.status !== "Accepted" && (
            <Notice
              tone="warning"
              title="Proposal cần dược Accepted trước khi tạo contract draft."
            />
          )}
          {milestones.length === 0 && (
            <Notice
              tone="warning"
              title="Job chưa có milestone nên backend chưa thể tạo contract draft."
            />
          )}
          <Field label="Tiêu đề contract">
            <Input
              value={contractForm.contractTitle}
              onChange={(event) =>
                setContractForm((value) => ({
                  ...value,
                  contractTitle: event.target.value,
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
          <div className="grid gap-3 rounded-3xl border border-brand-100 bg-brand-50/50 p-4 md:grid-cols-3">
            <ContractPreviewMetric
              label="Ngay bat dau du kien"
              value={formatDate(contractStartDate.toISOString())}
            />
            <ContractPreviewMetric
              label="Ngay ket thuc du kien"
              value={formatDate(contractEndDate.toISOString())}
            />
            <ContractPreviewMetric
              label="Tong thoi gian"
              value={`${contractTimelineDays} ngay`}
            />
          </div>
          <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
            <SectionHeading
              title="Ngân sách sẽ dưa vào hợp đồng"
              description="Backend lấy milestone gốc của job và ghi dè bằng ngân sách proposal nếu chuyên gia có đề xuất thay dổi."
            />
            <div className="mt-4 grid gap-2">
              {milestones
                .slice()
                .sort((a, b) => a.orderIndex - b.orderIndex)
                .map((milestone) => {
                  const proposalMilestone = parseProposalMilestones(
                    contractModal?.proposalMilestone,
                  ).find((item) => item.milestoneId === milestone.milestoneId);
                  const finalBudget =
                    proposalMilestone?.proposedBudget ??
                    milestone.fundsAllocated;
                  const changed = finalBudget !== milestone.fundsAllocated;
                  return (
                    <div
                      key={`${milestone.jobId}-${milestone.milestoneId}-${milestone.orderIndex}`}
                      className="grid gap-3 rounded-2xl border border-slate-100 bg-white p-4 text-sm md:grid-cols-[72px_1fr_150px_150px] md:items-center"
                    >
                      <Badge tone={changed ? "amber" : "brand"}>
                        Mốc {milestone.orderIndex}
                      </Badge>
                      <div className="min-w-0">
                        <p className="break-words font-extrabold text-ink">
                          {milestone.milestoneName}
                        </p>
                        {milestone.description && (
                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            {milestone.description}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400">
                          Ngân sách job
                        </p>
                        <p className="font-extrabold text-slate-700">
                          {formatCurrency(milestone.fundsAllocated)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400">
                          Chốt contract
                        </p>
                        <p className="font-extrabold text-ink">
                          {formatCurrency(finalBudget)}
                        </p>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ContractPreviewMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-3">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 font-extrabold text-ink">{value}</p>
    </div>
  );
}

function ProposalCard({
  proposal,
  milestones,
  contract,
  onAccept,
  onReject,
  statusLocked,
  onContract,
}: {
  proposal: Proposal;
  milestones: Milestone[];
  contract?: Contract;
  onAccept: () => void;
  onReject: () => void;
  statusLocked?: boolean;
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
        setDetailMessage("Một số thông tin chưa lấy dược từ API hiện tại.");
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
  const canCreateContract =
    proposal.status === "Accepted" && !contract && !statusLocked;

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
                Chuyên gia giữ ngân sách milestone mặc dịnh hoặc chưa gửi đề
                xuất chi tiết.
              </p>
            )}
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-4">
            <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-slate-400">
              File dính kèm
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
            <Button
              variant="success"
              size="sm"
              onClick={onAccept}
              disabled={
                statusLocked ||
                proposal.status === "Accepted" ||
                Boolean(contract)
              }
            >
              <CheckCircle2 className="h-4 w-4" />
              Accept
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={onReject}
              disabled={
                statusLocked ||
                proposal.status === "Rejected" ||
                Boolean(contract)
              }
            >
              <XCircle className="h-4 w-4" />
              Reject
            </Button>
            {contract ? (
              <LinkButton
                to={`/app/contracts/${contract.contractId}`}
                size="sm"
                variant="secondary"
              >
                <FileCheck2 className="h-4 w-4" />
                Xem hợp đồng
              </LinkButton>
            ) : (
              <Button
                size="sm"
                onClick={onContract}
                disabled={!canCreateContract}
                title={
                  canCreateContract
                    ? "Tạo contract draft"
                    : statusLocked
                      ? "Job đang IN_PROGRESS nên không thể thay dổi"
                      : "Chỉ tạo contract sau khi proposal dược Accepted"
                }
              >
                <FileCheck2 className="h-4 w-4" />
                Tạo hợp đồng
              </Button>
            )}
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
            <ExpertInfoItem label="Số diện thoại" value={expertPhone} />
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
  jobId,
  onRefresh,
}: {
  rec: ExpertRecommendationResponse;
  jobId: number;
  onRefresh: () => void;
}) {
  const [selecting, setSelecting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [expert, setExpert] = useState<ExpertProfile | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    let ignore = false;
    profileApi
      .getExpertById(rec.expertId)
      .then((data) => {
        if (!ignore) setExpert(data);
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, [rec.expertId]);

  const handleSelect = async () => {
    try {
      setSelecting(true);
      setError("");
      setSuccessMessage("");
      await expertRecommendationApi.select(jobId, rec.expertId);
      setSuccessMessage("Đã gửi lời mời đến với chuyên gia!");
      onRefresh();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSelecting(false);
    }
  };

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
            {expert?.fullName || `Expert #${rec.expertId}`}
          </p>
          <p className="mt-0.5 text-xs font-semibold text-slate-400">
            {expert?.yearsOfExperience
              ? `${expert.yearsOfExperience} năm kinh nghiệm`
              : `Expert ID: ${rec.expertId}${
                  rec.portfolioId ? ` · Portfolio ID: ${rec.portfolioId}` : ""
                }`}
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

        {/* Notifications */}
        {error && <Notice tone="danger" title={error} />}
        {successMessage && <Notice tone="success" title={successMessage} />}
      </div>

      {/* Footer / Actions */}
      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-5 py-4">
        <p className="text-xs font-semibold text-slate-500">
          {rec.businessSelected
            ? "Bạn đã gửi lời mời đến chuyên gia này. Hệ thống sẽ thông báo cho họ."
            : "Yêu thích chuyên gia này nếu bạn thấy phù hợp với yêu cầu."}
        </p>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setModalOpen(true)}
          >
            Xem chi tiết
          </Button>
          <button
            type="button"
            onClick={handleSelect}
            disabled={rec.businessSelected || selecting}
            className={cn(
              "rounded-full p-1.5 transition-all hover:bg-pink-50 active:scale-95 disabled:opacity-75 disabled:hover:bg-transparent",
              selecting && "animate-pulse",
            )}
            title={rec.businessSelected ? "Đã chọn" : "Chọn chuyên gia"}
          >
            <Heart
              className={cn(
                "h-7 w-7 text-pink-500 transition-all",
                rec.businessSelected && "fill-pink-500",
              )}
            />
          </button>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Chi tiết chuyên gia"
        description="Thông tin hồ sơ chuyên gia được AI đề xuất"
      >
        <div className="grid gap-4">
          <div className="flex items-center gap-4">
            <Avatar
              name={expert?.fullName || ""}
              size="xl"
            />
            <div>
              <p className="text-lg font-bold text-ink">
                {expert?.fullName || `Expert #${rec.expertId}`}
              </p>
              <p className="text-sm font-medium text-slate-500">
                {expert?.title || "Chuyên gia AI"}
              </p>
            </div>
          </div>
          <div className="grid gap-2 text-sm text-slate-600">
            <p>
              <strong>Kinh nghiệm:</strong>{" "}
              {expert?.yearsOfExperience
                ? `${expert.yearsOfExperience} năm`
                : "Chưa cập nhật"}
            </p>
            <p>
              <strong>Kỹ năng:</strong>{" "}
              {expert?.skills?.join(", ") || "Chưa cập nhật"}
            </p>
            <p>
              <strong>Mô tả:</strong> {expert?.description || "Chưa cập nhật"}
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}

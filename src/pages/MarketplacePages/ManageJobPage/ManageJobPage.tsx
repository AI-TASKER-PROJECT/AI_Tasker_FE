import {
  Award,
  BrainCircuit,
  ChevronDown,
  CheckCircle2,
  Cpu,
  Eye,
  FileCheck2,
  Sparkles,
  Star,
  XCircle,
  Heart,
  Layers,
  BadgeCheck,
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
  type Technology,
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

export function translateStatus(status: string) {
  switch (status.trim().toUpperCase()) {
    case "PENDING":
      return "Đang chờ";
    case "UNDER_REVIEW":
    case "UNDERREVIEW":
      return "Chờ phản hồi";
    case "ACCEPTED":
      return "Chấp nhận";
    case "REJECTED":
      return "Bị từ chối";
    case "DRAFT":
      return "Nháp";
    case "OPEN":
      return "Đang mở";
    case "IN_PROGRESS":
      return "Đang thực hiện";
    case "CLOSED":
      return "Đã đóng";
    case "CANCELLED":
      return "Đã hủy";
    default:
      return status;
  }
}

function translateRecommendationMessage(message?: string | null) {
  const normalized = (message || "").trim();
  if (!normalized) return "";
  const lower = normalized.toLowerCase();

  if (lower.includes("job") && lower.includes("not found")) {
    return "Không tìm thấy bài đăng cần đề xuất chuyên gia.";
  }
  if (lower.includes("expert") && lower.includes("not found")) {
    return "Không tìm thấy chuyên gia này.";
  }
  if (
    lower.includes("ai recommendation failed") ||
    lower.includes("fallback to rule-based ranking") ||
    lower.includes("rule-based")
  ) {
    return "AI chưa khả dụng nên hệ thống đã chuyển sang xếp hạng theo quy tắc.";
  }
  if (
    lower.includes("no expert") ||
    lower.includes("no suitable") ||
    lower.includes("not found")
  ) {
    return "Không tìm thấy chuyên gia phù hợp trong hệ thống.";
  }
  if (lower.includes("already selected") || lower.includes("selected")) {
    return "Bạn đã gửi lời mời đến chuyên gia này.";
  }
  if (lower.includes("not allowed") || lower.includes("forbidden")) {
    return "Bạn không có quyền thực hiện thao tác này.";
  }
  if (lower.includes("network")) {
    return "Không thể kết nối đến máy chủ. Vui lòng thử lại.";
  }

  return normalized;
}

function recommendationErrorMessage(error: unknown, fallback: string) {
  return translateRecommendationMessage(getApiErrorMessage(error)) || fallback;
}

const CONTRACT_TERM_SECTIONS = [
  {
    title: "Điều khoản công việc",
    content:
  "Hợp đồng được thực hiện dựa trên phạm vi công việc, cột mốc, ngân sách và thời gian đã thống nhất trong dự án và bản đề xuất được chấp nhận.",
  },
  {
    title: "Phạm vi trách nhiệm",
    content:
      "Doanh nghiệp cung cấp yêu cầu, tài liệu, phản hồi nghiệm thu đúng hạn. Chuyên gia chịu trách nhiệm triển khai, bàn giao và phản hồi các yêu cầu chỉnh sửa trong phạm vi đã cam kết.",
  },
  {
    title: "Điều khoản thanh toán",
    content:
      "Ngân sách được phân bổ theo mốc. Doanh nghiệp thực hiện ký quỹ theo tỷ lệ nền tảng quy định, hệ thống giữ tiền trong escrow và giải ngân theo kết quả nghiệm thu.",
  },
  {
    title: "Điều khoản bảo mật",
    content:
      "Hai bên không được tiết lộ dữ liệu, tài liệu, mã nguồn, thông tin kinh doanh hoặc thông tin người dùng phát sinh trong quá trình thực hiện hợp đồng khi chưa có sự đồng ý của bên còn lại.",
  },
  {
    title: "Điều khoản chấm dứt",
    content:
      "Hợp đồng có thể bị chấm dứt khi một bên vi phạm cam kết, không phản hồi trong thời hạn hợp lý, hoặc hai bên thống nhất dừng dự án. Phần công việc đã nghiệm thu được xử lý theo trạng thái mốc thực tế.",
  },
  {
    title: "Điều khoản tranh chấp",
    content:
      "Tranh chấp được ghi nhận qua hệ thống dispute. Hai bên cần cung cấp bằng chứng, nội dung trao đổi và tài liệu bàn giao để nền tảng hỗ trợ xử lý.",
  },
  {
    title: "Quyền và nghĩa vụ hai bên",
    content:
      "Hai bên có quyền theo dõi tiến độ, yêu cầu làm rõ, xác nhận nghiệm thu và phản hồi chất lượng. Hai bên có nghĩa vụ hợp tác trung thực, tuân thủ quy trình nền tảng và chịu trách nhiệm với thông tin đã cung cấp.",
  },
];

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
  });
  const [contractTermsOpen, setContractTermsOpen] = useState(false);
  const [contractError, setContractError] = useState("");
  const [contractLoading, setContractLoading] = useState(false);
  const [reviewMessage, setReviewMessage] = useState("");
  const [reviewMessageTone, setReviewMessageTone] = useState<
    "success" | "danger"
  >("success");

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
          translateRecommendationMessage(result.message) ||
            "AI không tìm thấy chuyên gia phù hợp trong hệ thống.",
        );
        setAiMessageTone("warning");
      } else {
        setAiMessage(
          result.generatedByAi
            ? "AI đã phân tích thông tin dự án và chọn top chuyên gia phù hợp nhất."
            : translateRecommendationMessage(result.message) ||
              "AI chưa khả dụng nên hệ thống đã chuyển sang xếp hạng theo quy tắc.",
        );
        setAiMessageTone(result.generatedByAi ? "success" : "warning");
      }
    } catch (error) {
      setAiMessage(
        recommendationErrorMessage(
          error,
          "Không thể tạo đề xuất chuyên gia. Vui lòng thử lại.",
        ),
      );
      setAiMessageTone("danger");
    } finally {
      setAiLoading(false);
    }
  };

  if (!job) return <div>Đang tải dự án...</div>;

  const jobStatus = job.status.trim().toUpperCase();
  const jobInProgress = jobStatus === "IN_PROGRESS";
  const totalMilestoneDays = milestones.reduce((total, milestone) => {
    const duration = Number(milestone.durationValue ?? milestone.duration ?? 0);
    const unit = (milestone.durationUnit || "WEEK").toUpperCase();
    if (!Number.isFinite(duration) || duration <= 0) return total;
    if (unit.includes("DAY")) return total + duration;
    if (unit.includes("MONTH")) return total + duration * 30;
    return total + duration * 7;
  }, 0);
  const contractTimelineDays = Math.max(1, totalMilestoneDays);
  const contractTimelineWeeks = Math.ceil(contractTimelineDays / 7);
  const totalMilestoneWeeks = contractTimelineWeeks;
  const contractStartDate = new Date();
  const contractEndDate = new Date(contractStartDate);
  contractEndDate.setDate(contractEndDate.getDate() + contractTimelineDays);
  const contractProposalMilestones = parseProposalMilestones(
    contractModal?.proposalMilestone,
  );
  const originalProjectBudget = milestones.reduce(
    (total, milestone) => total + Number(milestone.fundsAllocated || 0),
    0,
  );
  const finalProjectBudget = milestones.reduce((total, milestone) => {
    const proposalMilestone = contractProposalMilestones.find(
      (item) => item.milestoneId === milestone.milestoneId,
    );
    return total + (proposalMilestone?.proposedBudget ?? milestone.fundsAllocated ?? 0);
  }, 0);

  const review = async (
    proposalId: number,
    status: "Accepted" | "Rejected",
  ) => {
    if (jobInProgress) return;
    setReviewMessage("");
    try {
      const updated = await marketplaceApi.reviewProposal(proposalId, status);
      setProposals((items) =>
        items.map((item) => (item.proposalId === proposalId ? updated : item)),
      );
      setReviewMessageTone(status === "Accepted" ? "success" : "danger");
      setReviewMessage(
        status === "Accepted"
          ? "Đã chấp nhận bản đề xuất thành công!"
          : "Đã từ chối bản đề xuất thành công!",
      );
    } catch (error) {
      setReviewMessageTone("danger");
      setReviewMessage(getApiErrorMessage(error));
    }
  };

  const createContract = async () => {
    if (!contractModal) return;
    if (jobInProgress) {
      setContractError(
        "Dự án đang thực hiện nên không thể tạo hoặc thay đổi hợp đồng.",
      );
      return;
    }
    if (contractModal.status !== "Accepted") {
      setContractError("Chỉ tạo hợp đồng nháp sau khi bản đề xuất đã được chấp nhận.");
      return;
    }
    if (milestones.length === 0) {
      setContractError(
        "Dự án cần có ít nhất một cột mốc để tạo hợp đồng nháp.",
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
            contractForm.contractTitle.trim() || `Hợp đồng - ${job.title}`,
          timelineDays: contractTimelineDays,
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
          description="Theo dõi dự án, cột mốc đã khai báo và bản đề xuất chuyên gia gửi cho doanh nghiệp."
          actions={
            <LinkButton to={`/jobs/${job.jobId}`} variant="secondary">
              Xem bài đăng công khai
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
              Bản đề xuất của chuyên gia
            </Button>
          </div>
          {proposalTab === "ai" && (
            <div className="grid gap-5">
              {/* Header row */}
              {/* Header row */}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <SectionHeading
                  title="AI đề xuất chuyên gia"
                  description="Top 5 chuyên gia phù hợp nhất với yêu cầu của dự án"
                />

                <div className="flex flex-wrap items-center gap-2">
                  {recommendationResult && (
                    <Badge
                      tone={
                        recommendationResult.generatedByAi ? "mint" : "amber"
                      }
                    >
                      {recommendationResult.generatedByAi
                        ? "AI đã tạo"
                        : "Xếp hạng theo quy tắc"}
                    </Badge>
                  )}

                  {recommendationResult && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={generateRecommendations}
                      disabled={aiLoading}
                    >
                      <Sparkles className="h-4 w-4" />
                      Tạo lại đề xuất
                    </Button>
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
                    AI đang phân tích và tìm kiếm chuyên gia phù hợp...
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
              title="Bản đề xuất của chuyên gia"
              description="Danh sách bản đề xuất được chuyên gia gửi cho dự án này."
            />
            {jobInProgress && (
              <Notice
                tone="info"
                  title="Dự án đã tạo hợp đồng; các thao tác với bản đề xuất và tạo hợp đồng mới sẽ không có hiệu lực."
                className="mt-4"
              />
            )}
            {reviewMessage && (
              <Notice
                tone={reviewMessageTone}
                title={reviewMessage}
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
                    setContractTermsOpen(false);
                    setContractModal(proposal);
                    setContractForm((value) => ({
                      ...value,
                      contractTitle: `Hợp đồng - ${job.title}`,
                    }));
                  }}
                />
              ))}
              {proposals.length === 0 && (
                <EmptyState
                  title="Chưa có bản đề xuất"
                  description="Dự án này chưa có bản đề xuất từ chuyên gia."
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
              <span className="text-slate-500">Thời lượng</span>
              <span className="min-w-0 break-words text-right font-extrabold text-ink">
                {job.plannedDurationValue || 0}{" "}
                {job.plannedDurationUnit === "WEEK"
                  ? "TUẦN"
                  : job.plannedDurationUnit || "TUẦN"}
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
                  <span className="text-slate-500">Ngày tạo dự án</span>
              <span className="font-extrabold text-ink">
                {formatDate(job.createdAt)}
              </span>
            </div>
            <div className="flex justify-between gap-3 text-sm">
              <span className="text-slate-500">Mốc</span>
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
                  Chưa có kỹ nĒng yêu cầu.
                </p>
              )}
            </div>
          </div>
          <div className="mt-5">
            <SectionHeading title="Mốc" />
            <CompactMilestones milestones={milestones} />
          </div>
        </Card>
      </div>

      <Modal
        open={Boolean(contractModal)}
        onClose={() => setContractModal(null)}
        title="Tạo hợp đồng nháp"
        description="Tạo hợp đồng nháp từ bản đề xuất đã chọn."
        size="2xl"
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
              Tạo hợp đồng nháp
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          {contractError && <Notice tone="danger" title={contractError} />}
          {contractModal?.status !== "Accepted" && (
            <Notice
              tone="warning"
              title="Bản đề xuất cần được chấp nhận trước khi tạo hợp đồng nháp."
            />
          )}
          {milestones.length === 0 && (
            <Notice
              tone="warning"
              title="Dự án chưa có cột mốc nên máy chủ chưa thể tạo hợp đồng nháp."
            />
          )}
          <Field label="Tên hợp đồng">
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
          <div className="grid gap-3 rounded-3xl border border-brand-100 bg-brand-50/50 p-4 md:grid-cols-3">
            <ContractPreviewMetric
              label="Tổng thời gian mốc"
              value={`${totalMilestoneWeeks} tuần (${totalMilestoneDays} ngày)`}
            />
            <ContractPreviewMetric
              label="Ngày bắt đầu dự kiến"
              value={formatDate(contractStartDate.toISOString())}
            />
            <ContractPreviewMetric
              label="Ngày kết thúc dự kiến"
              value={formatDate(contractEndDate.toISOString())}
            />
          </div>
          <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
            <SectionHeading
              title="Ngân sách theo mốc hợp đồng"
              description="So sánh ngân sách ban đầu với ngân sách được chốt cho từng mốc."
              // Backend lấy milestone gốc của job và ghi đè bằng ngân sách proposal nếu chuyên gia có đề xuất thay đổi.
            />
            <div className="mt-4 grid gap-3">
              <div className="hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:grid lg:grid-cols-[120px_minmax(320px,1fr)_170px_170px] lg:items-center lg:gap-4">
                <div className="col-span-2 px-2">
                  <p className="text-sm font-extrabold text-ink">Phân bổ theo từng mốc</p>
                  <p className="mt-1 text-xs font-semibold text-slate-400">Ngân sách cuối cùng có thể thay đổi theo đề xuất đã chọn.</p>
                </div>
                <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5 text-right">
                  <p className="text-xs font-bold text-rose-700">Tổng ngân sách gốc</p>
                  <p className="mt-1 text-lg font-black text-rose-700">{formatCurrency(originalProjectBudget)}</p>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-right">
                  <p className="text-xs font-bold text-emerald-700">Tổng ngân sách cuối cùng</p>
                  <p className="mt-1 text-lg font-black text-emerald-700">{formatCurrency(finalProjectBudget)}</p>
                </div>
              </div>
              {milestones
                .slice()
                .sort((a, b) => a.orderIndex - b.orderIndex)
                .map((milestone) => {
                  const proposalMilestone = contractProposalMilestones.find(
                    (item) => item.milestoneId === milestone.milestoneId,
                  );
                  const finalBudget =
                    proposalMilestone?.proposedBudget ??
                    milestone.fundsAllocated;
                  const changed = finalBudget !== milestone.fundsAllocated;
                  return (
                    <div
                      key={`${milestone.jobId}-${milestone.milestoneId}-${milestone.orderIndex}`}
                      className="grid gap-4 rounded-2xl border border-slate-100 bg-white p-4 text-sm lg:grid-cols-[120px_minmax(320px,1fr)_170px_170px] lg:items-start"
                    >
                      <Badge tone={changed ? "amber" : "brand"}>
                        Mốc {milestone.orderIndex}
                      </Badge>
                      <div className="min-w-0">
                        <p className="break-words font-extrabold leading-6 text-ink">
                          {milestone.milestoneName}
                        </p>
                        {milestone.description && (
                          <p className="mt-1 break-words text-sm leading-6 text-slate-500">
                            {milestone.description}
                          </p>
                        )}
                        <p className="mt-2 text-xs font-bold text-slate-400">
                          Thời gian:{" "}
                          {milestone.duration
                            ? `${milestone.duration} ${milestone.durationUnit || "tuần"}`
                            : "Chưa có thời gian"}
                        </p>
                      </div>
                      <div className="rounded-xl border border-rose-100 bg-rose-50/70 px-3 py-2 lg:text-right">
                        <p className="text-xs font-bold text-slate-400 lg:hidden">
                          Ngân sách gốc
                        </p>
                        <p className="font-extrabold text-rose-700">
                          {formatCurrency(milestone.fundsAllocated)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2 lg:text-right">
                        <p className="text-xs font-bold text-slate-400 lg:hidden">
                          Ngân sách cuối cùng
                        </p>
                        <p className="font-extrabold text-emerald-700">
                          {formatCurrency(finalBudget)}
                        </p>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
          <div className="rounded-3xl border border-slate-100 bg-white p-4">
            <button
              type="button"
              onClick={() => setContractTermsOpen((open) => !open)}
              className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-left transition hover:bg-slate-100"
            >
              <span>
                <span className="block font-extrabold text-ink">
                  Điều khoản hợp đồng
                </span>
                <span className="mt-1 block text-sm font-semibold text-slate-500">
                  Bấm để {contractTermsOpen ? "thu gọn" : "xem"} điều khoản mẫu
                </span>
              </span>
              <ChevronDown
                className={cn(
                  "h-5 w-5 shrink-0 text-slate-500 transition-transform",
                  contractTermsOpen && "rotate-180",
                )}
              />
            </button>
            {contractTermsOpen && (
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {CONTRACT_TERM_SECTIONS.map((section) => (
                  <div
                    key={section.title}
                    className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                  >
                    <p className="font-extrabold text-ink">{section.title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {section.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
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
  const [proposalDetailOpen, setProposalDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailMessage, setDetailMessage] = useState("");
  const [expertProfile, setExpertProfile] = useState<ExpertProfile | null>(
    null,
  );
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [technologies, setTechnologies] = useState<Technology[]>([]);

  useEffect(() => {
    let ignore = false;

    profileApi
      .getExpertById(proposal.expertId)
      .then((data) => {
        if (!ignore) {
          setExpertProfile(data);
        }
      })
      .catch(() => {});

    return () => {
      ignore = true;
    };
  }, [proposal.expertId]);

  useEffect(() => {
    if (!expertOpen) return;
    let ignore = false;

    async function loadExpertDetail() {
      setDetailLoading(true);
      setDetailMessage("");
      const [expertResult, portfoliosResult] = await Promise.allSettled([
        profileApi.getExpertById(proposal.expertId),
        profileApi.listPortfolios(),
      ]);
      const [domainsResult, skillsResult, technologiesResult] =
        await Promise.allSettled([
          catalogApi.listDomains(true),
          catalogApi.listSkills(true),
          catalogApi.listTechnologies(true),
        ]);

      if (ignore) return;

      const portfolios =
        portfoliosResult.status === "fulfilled" ? portfoliosResult.value : [];
      const matchedPortfolio =
        portfolios.find((item) => item.expertId === proposal.expertId) || null;

      if (expertResult.status === "fulfilled") {
        setExpertProfile(expertResult.value);
      }

      setPortfolio(matchedPortfolio);
      setDomains(
        domainsResult.status === "fulfilled" ? domainsResult.value : [],
      );
      setSkills(skillsResult.status === "fulfilled" ? skillsResult.value : []);
      setTechnologies(
        technologiesResult.status === "fulfilled"
          ? technologiesResult.value
          : [],
      );
      setDetailLoading(false);

      if (
        expertResult.status === "rejected" ||
        portfoliosResult.status === "rejected"
      ) {
        setDetailMessage("Một số thông tin chưa lấy được từ máy chủ hiện tại.");
      }
    }

    loadExpertDetail();
    return () => {
      ignore = true;
    };
  }, [expertOpen, proposal.expertId]);

  const expertName =
    expertProfile?.fullName || proposal.expertName || "Chuyên gia chưa có tên";

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

  const portfolioDomainList = resolveCatalogNameList(
    portfolio?.domainIds,
    domains,
    "domainId",
    "domainName",
  );
  const portfolioSkillList = resolveCatalogNameList(
    portfolio?.skillIds,
    skills,
    "skillId",
    "skillName",
  );
  const portfolioTechnologyList = resolveCatalogNameList(
    portfolio?.technologyIds,
    technologies,
    "technologyId",
    "technologyName",
  );

  const proposalMilestones = parseProposalMilestones(
    proposal.proposalMilestone,
  );

  const canCreateContract =
    proposal.status === "Accepted" && !contract && !statusLocked;

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white transition hover:border-brand-100 hover:shadow-card">
      <div className="grid gap-4 bg-[linear-gradient(135deg,#f8fbff,#effcf7)] p-5 lg:grid-cols-[1fr_220px]">
        <div className="flex gap-3">
          <Avatar name={expertName} size="lg" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="break-words font-display text-lg font-black text-ink">
                {expertName}
              </p>
              <StatusBadge status={translateStatus(proposal.status)} />
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
            Ngân sách
          </p>
          <p className="mt-1 font-display text-2xl font-black text-brand-700">
            {formatCompactCurrency(proposal.bidAmount)}
          </p>
        </div>
      </div>

      <div className="grid gap-4 p-5">
        <div className="rounded-2xl border border-slate-100 bg-white p-4">
          <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-slate-400">
            File dính kèm
          </p>
          <FirebaseFileLink
            path={proposal.proposalFileUrl}
              emptyText="Chưa có tệp bản đề xuất"
            buttonText="Xem file"
            showPath={false}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setExpertOpen(true)}
            >
              <Eye className="h-4 w-4" />
              Xem chuyên gia
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setProposalDetailOpen(true)}
            >
              <FileCheck2 className="h-4 w-4" />
              Xem chi tiết
            </Button>
          </div>

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
              Chấp nhận
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
              Từ chối
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
                    ? "Tạo hợp đồng nháp"
                    : statusLocked
              ? "Dự án đang thực hiện nên không thể thay đổi"
              : "Chỉ tạo hợp đồng sau khi bản đề xuất được chấp nhận"
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
        open={proposalDetailOpen}
        onClose={() => setProposalDetailOpen(false)}
        title="Chi tiết bản đề xuất"
        description="Thông tin đầy đủ về đề xuất của chuyên gia."
        size="2xl"
      >
        <div className="grid gap-5">
          <div className="flex items-start gap-4 rounded-3xl bg-slate-50 p-4">
            <Avatar name={expertName} size="xl" />
            <div className="min-w-0">
              <p className="font-display text-2xl font-black text-ink">
                {expertName}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {proposal.expertTitle || "Chuyên gia AI"}
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <ExpertInfoItem label="Tên chuyên gia" value={expertName} />
            <ExpertInfoItem
              label="Ngân sách đề xuất"
              value={formatCurrency(proposal.bidAmount)}
            />
          </div>

          <div className="grid gap-3">
            <ProposalInfoBlock title="Technical solution">
              {proposal.technicalSolution}
            </ProposalInfoBlock>

            <ProposalInfoBlock title="Mô tả bản đề xuất">
              {proposal.proposalDescription || "Chưa có mô tả bản đề xuất."}
            </ProposalInfoBlock>

            <div className="grid gap-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">
                  Mốc đề xuất
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Ngân sách đề xuất của chuyên gia theo từng mốc.
                </p>
              </div>

              {milestones.length > 0 ? (
                <div className="grid gap-4">
                  {milestones
                    .slice()
                    .sort((a, b) => a.orderIndex - b.orderIndex)
                    .map((milestone) => {
                      const proposalMilestone = proposalMilestones.find(
                        (item) => item.milestoneId === milestone.milestoneId,
                      );

                      const proposedBudget =
                        proposalMilestone?.proposedBudget ??
                        milestone.fundsAllocated;

                      return (
                        <div
                          key={`${milestone.jobId}-${milestone.milestoneId}-${milestone.orderIndex}`}
                          className="grid gap-5 rounded-3xl border border-slate-100 bg-slate-50/80 p-5 lg:grid-cols-[minmax(0,1fr)_270px_270px] lg:items-center"
                        >
                          <div className="min-w-0">
                            <p className="break-words font-display text-xl font-black leading-7 text-ink">
                              {milestone.milestoneName}
                            </p>

                            <p className="mt-2 text-sm font-bold uppercase tracking-wide text-slate-500">
                              Mốc {milestone.orderIndex} ·{" "}
                              {milestone.durationValue ??
                                milestone.duration ??
                                0}{" "}
                              {milestone.durationUnit === "WEEK"
                                ? "TUẦN"
                                : milestone.durationUnit || "TUẦN"}
                            </p>
                          </div>

                          <div>
                            <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-slate-400">
                              Ngân sách gốc
                            </p>
                            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-base font-semibold text-slate-500">
                              {formatCurrency(milestone.fundsAllocated)}
                            </div>
                          </div>

                          <div>
                            <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-slate-400">
                              Ngân sách đề xuất
                            </p>
                            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-base font-bold text-ink">
                              {Number(proposedBudget).toLocaleString("vi-VN")}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-400">
                  Dự án chưa có cột mốc để hiển thị.
                </p>
              )}
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={expertOpen}
        onClose={() => setExpertOpen(false)}
        title="Thông tin chuyên gia"
        description="Hồ sơ và hồ sơ năng lực của chuyên gia gửi bản đề xuất."
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

          <ProfileRating
            value={expertProfile?.averageRating ?? expertProfile?.rating}
          />

          <SectionHeading title="Hồ sơ năng lực" />

          <div className="grid gap-6">
            <PortfolioChipSection
              icon={<Layers className="h-5 w-5" />}
              title="Lĩnh vực"
              items={portfolioDomainList}
              tone="mint"
            />

            <PortfolioChipSection
              icon={<Sparkles className="h-5 w-5" />}
              title="Kỹ năng nổi bật"
              items={portfolioSkillList}
              tone="brand"
            />

            <PortfolioChipSection
              icon={<Cpu className="h-5 w-5" />}
              title="Nhóm công nghệ"
              items={portfolioTechnologyList}
              tone="coral"
            />

            <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
              <h4 className="flex items-center gap-2 font-display text-lg font-black text-ink">
                <BadgeCheck className="h-5 w-5 text-amber-500" />
                Chứng chỉ
              </h4>
              <div className="mt-4 text-sm font-bold text-slate-400">
                <FirebaseFileLink
                  path={portfolio?.certificates}
                  emptyText="Chưa có chứng chỉ"
                  buttonText="Xem chứng chỉ"
                />
              </div>
            </div>
          </div>

          <div className="hidden">
            <ExpertInfoItem
              label="Lĩnh vực"
              value={domainNames || "Chưa có dữ liệu"}
              multiline
            />

            <ExpertInfoItem
              label="Kỹ năng"
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

function resolveCatalogNames(
  ids: string | undefined,
  items: Array<Domain | Skill | Technology>,
  idKey: "domainId" | "skillId" | "technologyId",
  nameKey: "domainName" | "skillName" | "technologyName",
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

function resolveCatalogNameList(
  ids: string | undefined,
  items: Array<Domain | Skill | Technology>,
  idKey: "domainId" | "skillId" | "technologyId",
  nameKey: "domainName" | "skillName" | "technologyName",
) {
  const names = resolveCatalogNames(ids, items, idKey, nameKey);
  return names
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function PortfolioChipSection({
  icon,
  title,
  items,
  tone,
  emptyText = "Chưa có dữ liệu",
}: {
  icon: ReactNode;
  title: string;
  items: string[];
  tone: "mint" | "brand" | "coral";
  emptyText?: string;
}) {
  const toneClass = {
    mint: "border-emerald-100 bg-emerald-50 text-emerald-700",
    brand: "border-pink-100 bg-pink-50 text-pink-700",
    coral: "border-orange-100 bg-orange-50 text-orange-600",
  }[tone];

  return (
    <section className="grid gap-3">
      <h4 className="flex items-center gap-2 font-display text-lg font-black text-ink">
        <span className="text-ink">{icon}</span>
        {title}
      </h4>
      {items.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <span
              key={item}
              className={`rounded-full border px-3 py-1.5 text-sm font-extrabold ${toneClass}`}
            >
              {item}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm font-bold text-slate-400">{emptyText}</p>
      )}
    </section>
  );
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

// Expert Recommendation Card
// Expert Recommendation Card
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
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailMessage, setDetailMessage] = useState("");
  const [expertProfile, setExpertProfile] = useState<ExpertProfile | null>(
    null,
  );
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [technologies, setTechnologies] = useState<Technology[]>([]);

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

  useEffect(() => {
    if (!modalOpen) return;
    let ignore = false;

    async function loadExpertDetail() {
      setDetailLoading(true);
      setDetailMessage("");

      const [expertResult, portfoliosResult] = await Promise.allSettled([
        profileApi.getExpertById(rec.expertId),
        profileApi.listPortfolios(),
      ]);
      const [domainsResult, skillsResult, technologiesResult] =
        await Promise.allSettled([
          catalogApi.listDomains(true),
          catalogApi.listSkills(true),
          catalogApi.listTechnologies(true),
        ]);

      if (ignore) return;

      const portfolios =
        portfoliosResult.status === "fulfilled" ? portfoliosResult.value : [];
      const matchedPortfolio =
        portfolios.find((item) => item.expertId === rec.expertId) || null;

      if (expertResult.status === "fulfilled") {
        setExpertProfile(expertResult.value);
        setExpert(expertResult.value);
      }

      setPortfolio(matchedPortfolio);
      setDomains(
        domainsResult.status === "fulfilled" ? domainsResult.value : [],
      );
      setSkills(skillsResult.status === "fulfilled" ? skillsResult.value : []);
      setTechnologies(
        technologiesResult.status === "fulfilled"
          ? technologiesResult.value
          : [],
      );
      setDetailLoading(false);

      if (
        expertResult.status === "rejected" ||
        portfoliosResult.status === "rejected"
      ) {
        setDetailMessage("Một số thông tin chưa lấy được từ máy chủ hiện tại.");
      }
    }

    loadExpertDetail();
    return () => {
      ignore = true;
    };
  }, [modalOpen, rec.expertId]);

  const handleSelect = async () => {
    try {
      setSelecting(true);
      setError("");
      setSuccessMessage("");
      await expertRecommendationApi.select(jobId, rec.expertId);
      setSuccessMessage("Đã gửi lời mời đến với chuyên gia!");
      onRefresh();
    } catch (err) {
      setError(
        recommendationErrorMessage(
          err,
          "Không thể gửi lời mời đến chuyên gia. Vui lòng thử lại.",
        ),
      );
    } finally {
      setSelecting(false);
    }
  };

  const rankColors = [
    "from-amber-400 to-yellow-300",
    "from-slate-400 to-slate-300",
    "from-orange-400 to-amber-300",
    "from-brand-400 to-indigo-400",
    "from-brand-300 to-violet-300",
  ];

  const gradientClass =
    rankColors[(rec.rankPosition ?? 1) - 1] ?? rankColors[4];

  const expertName =
    expertProfile?.fullName || expert?.fullName || "Chuyên gia chưa có tên";

  const expertPhone =
    expertProfile?.phone || expert?.phone || "Chưa có dữ liệu";

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
  const portfolioDomainList = resolveCatalogNameList(
    portfolio?.domainIds,
    domains,
    "domainId",
    "domainName",
  );
  const portfolioSkillList = resolveCatalogNameList(
    portfolio?.skillIds,
    skills,
    "skillId",
    "skillName",
  );
  const portfolioTechnologyList = resolveCatalogNameList(
    portfolio?.technologyIds,
    technologies,
    "technologyId",
    "technologyName",
  );

  const yearsExperience =
    portfolio?.yearsExperience ??
    expertProfile?.yearsOfExperience ??
    expert?.yearsOfExperience;

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition hover:border-brand-100 hover:shadow-card">
      {/* Header */}
      <div className="grid gap-4 bg-gradient-to-r from-slate-50 to-brand-50/30 p-5 md:grid-cols-[56px_1fr]">
        <div
          className={`grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${gradientClass} text-white shadow`}
        >
          <span className="text-xl font-black">#{rec.rankPosition}</span>
        </div>

        <div className="min-w-0">
          <p className="font-display text-base font-extrabold text-ink">
            {expert?.fullName || "Chuyên gia chưa có tên"}
          </p>
          <p className="mt-0.5 text-xs font-semibold text-slate-400">
            {expert?.yearsOfExperience
              ? `${expert.yearsOfExperience} năm kinh nghiệm`
              : "Chưa có thông tin kinh nghiệm"}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="grid gap-4 p-5 pt-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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
          {(rec.matchedTechnologies?.length ?? 0) > 0 && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-slate-400">
                <Cpu className="h-3.5 w-3.5" />
                Công nghệ khớp
              </p>
              <div className="flex flex-wrap gap-1.5">
                {rec.matchedTechnologies!.map((technology) => (
                  <Badge key={technology} tone="violet">
                    {technology}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {rec.reason && (
          <div className="rounded-2xl border border-brand-100 bg-brand-50/50 p-4">
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-brand-600">
              <BrainCircuit className="h-3.5 w-3.5" />
              Lý do AI đề xuất
            </p>
            <p className="text-sm leading-6 text-slate-700">{rec.reason}</p>
          </div>
        )}

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
            onClick={() => {
              setExpertProfile(expert);
              setModalOpen(true);
            }}
          >
            <Eye className="h-4 w-4" />
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
        title="Thông tin chuyên gia"
        description="Hồ sơ và hồ sơ năng lực của chuyên gia gửi bản đề xuất."
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

          <ProfileRating
            value={expertProfile?.averageRating ?? expertProfile?.rating}
          />

          <SectionHeading title="Hồ sơ năng lực" />

          <div className="grid gap-6">
            <PortfolioChipSection
              icon={<Layers className="h-5 w-5" />}
              title="Lĩnh vực"
              items={portfolioDomainList}
              tone="mint"
            />

            <PortfolioChipSection
              icon={<Sparkles className="h-5 w-5" />}
              title="Kỹ năng nổi bật"
              items={portfolioSkillList}
              tone="brand"
            />

            <PortfolioChipSection
              icon={<Cpu className="h-5 w-5" />}
              title="Nhóm công nghệ"
              items={portfolioTechnologyList}
              tone="coral"
            />

            <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
              <h4 className="flex items-center gap-2 font-display text-lg font-black text-ink">
                <BadgeCheck className="h-5 w-5 text-amber-500" />
                Chứng chỉ
              </h4>
              <div className="mt-4 text-sm font-bold text-slate-400">
                <FirebaseFileLink
                  path={portfolio?.certificates}
                  emptyText="Chưa có chứng chỉ"
                  buttonText="Xem chứng chỉ"
                />
              </div>
            </div>
          </div>

          <div className="hidden">
            <ExpertInfoItem
              label="Lĩnh vực"
              value={domainNames || "Chưa có dữ liệu"}
              multiline
            />

            <ExpertInfoItem
              label="Kỹ năng"
              value={skillNames || "Chưa có dữ liệu"}
              multiline
            />

            <ExpertInfoItem
              label="Số năm kinh nghiệm"
              value={
                yearsExperience != null
                  ? `${yearsExperience} năm`
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

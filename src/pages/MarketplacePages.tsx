import {
  CalendarDays,
  CheckCircle2,
  FileCheck2,
  Lightbulb,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Star,
  XCircle,
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { catalogApi, contractApi, marketplaceApi, type Domain, type Skill } from '../lib/api';
import { formatCompactCurrency, formatCurrency } from '../lib/utils';
import type { Job, Proposal } from '../types';
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
  Tabs,
  Textarea,
} from '../components/ui';
import { JobCard } from './PublicPages';

export function MyJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    marketplaceApi.listJobs().then(setJobs);
  }, []);

  const filtered = jobs.filter((job) => `${job.title} ${job.aiTag}`.toLowerCase().includes(query.toLowerCase()));

  const updateStatus = async (jobId: number, status: string) => {
    const updated = await marketplaceApi.updateJobStatus(jobId, status);
    setJobs((items) => items.map((item) => (item.jobId === jobId ? updated : item)));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="JOB-01 / MATCH-01"
        title="Dự án của doanh nghiệp"
        description="Tạo job, mở/đóng job và đi vào màn hình dual-flow AI đề xuất / Proposals."
        actions={
          <LinkButton to="/app/jobs/new">
            <Plus className="h-4 w-4" />
            Tạo job mới
          </LinkButton>
        }
      />
      <Card className="p-4">
        <SearchInput value={query} onChange={setQuery} placeholder="Tìm job của tôi..." />
      </Card>
      <div className="grid gap-4 lg:grid-cols-3">
        {filtered.map((job) => (
          <Card key={job.jobId} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <Badge tone={job.isHot ? 'coral' : 'brand'}>{job.aiTag || 'AI Project'}</Badge>
              <StatusBadge status={job.status} />
            </div>
            <h3 className="mt-4 font-display text-lg font-extrabold leading-7 text-ink">{job.title}</h3>
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">{job.structuredSow}</p>
            <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-3">
              <div>
                <p className="text-xs font-bold text-slate-400">Ngân sách</p>
                <p className="mt-1 text-sm font-extrabold text-ink">{formatCompactCurrency(job.budget)}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400">Proposal</p>
                <p className="mt-1 text-sm font-extrabold text-ink">{job.proposalsCount || 0}</p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <LinkButton to={`/app/jobs/${job.jobId}/manage`} variant="secondary" size="sm">
                Quản lý
              </LinkButton>
              {job.status !== 'OPEN' && (
                <Button variant="success" size="sm" onClick={() => updateStatus(job.jobId, 'OPEN')}>
                  Mở job
                </Button>
              )}
              {job.status === 'OPEN' && (
                <Button variant="ghost" size="sm" onClick={() => updateStatus(job.jobId, 'CLOSED')}>
                  Đóng job
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function CreateJobPage() {
  const [form, setForm] = useState({
    title: 'Xây dựng trợ lý AI chăm sóc khách hàng đa kênh',
    rawRequirements:
      'Cần chatbot trả lời sản phẩm, tra cứu đơn hàng và chuyển tiếp nhân viên khi cần.',
    structuredSow:
      'Thiết kế trợ lý hội thoại RAG hỗ trợ tiếng Việt, tích hợp dữ liệu sản phẩm và lịch sử đơn hàng, có cơ chế hand-off cho nhân viên.',
    aiTag: 'NLP',
    budget: '180000000',
    plannedDurationValue: '10',
    plannedDurationUnit: 'tuần',
    status: 'DRAFT',
  });
  const [milestones, setMilestones] = useState([
    { milestoneName: 'Discovery va solution design', fundsAllocated: '30000000', orderIndex: '1' },
    { milestoneName: 'MVP delivery', fundsAllocated: '90000000', orderIndex: '2' },
  ]);
  const [loading, setLoading] = useState(false);
  const [savedJob, setSavedJob] = useState<Job | null>(null);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedDomainIds, setSelectedDomainIds] = useState<number[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<number[]>([]);

  useEffect(() => {
    Promise.all([catalogApi.listDomains(true), catalogApi.listSkills(true)]).then(([domainItems, skillItems]) => {
      setDomains(domainItems);
      setSkills(skillItems);
      setSelectedDomainIds(domainItems.slice(0, 2).map((item) => item.domainId));
      setSelectedSkillIds(skillItems.slice(0, 3).map((item) => item.skillId));
    });
  }, []);

  const generateSow = () => {
    setForm((value) => ({
      ...value,
      structuredSow:
        'AI đề xuất SoW: xây dựng trợ lý hội thoại tiếng Việt có RAG, quản trị tri thức, kiểm soát câu trả lời, dashboard chất lượng và quy trình hand-off cho nhân viên CSKH.',
      aiTag: domains.filter((domain) => selectedDomainIds.includes(domain.domainId)).map((domain) => domain.domainCode).join(',') || 'NLP',
    }));
  };

  const toggleDomain = (domainId: number) => {
    setSelectedDomainIds((items) => items.includes(domainId) ? items.filter((id) => id !== domainId) : [...items, domainId]);
  };

  const toggleSkill = (skillId: number) => {
    setSelectedSkillIds((items) => items.includes(skillId) ? items.filter((id) => id !== skillId) : [...items, skillId]);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    const aiTag = domains.filter((domain) => selectedDomainIds.includes(domain.domainId)).map((domain) => domain.domainCode).join(',');
    const job = await marketplaceApi.createJob({
      title: form.title,
      rawRequirements: form.rawRequirements,
      structuredSow: form.structuredSow,
      aiTag: aiTag || form.aiTag,
      budget: Number(form.budget),
      plannedDurationValue: Number(form.plannedDurationValue),
      plannedDurationUnit: form.plannedDurationUnit,
      status: form.status,
    });
    await catalogApi.replaceJobDomains(job.jobId, selectedDomainIds);
    await catalogApi.replaceJobSkills(job.jobId, selectedSkillIds.map((skillId) => ({
      skillId,
      requiredLevel: 'Intermediate',
      isMandatory: true,
      minYearsExperience: 1,
    })));
    for (const milestone of milestones) {
      if (!milestone.milestoneName.trim()) continue;
      await contractApi.createMilestone({
        jobId: job.jobId,
        milestoneName: milestone.milestoneName,
        fundsAllocated: Number(milestone.fundsAllocated || 0),
        orderIndex: Number(milestone.orderIndex || 1),
        status: 'Pending',
      });
    }
    setSavedJob(job);
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="JOB-01"
        title="AI Job Assistant"
        description="Giao diện có đủ bước cho AI NLP service dù back-end hiện mới lưu structured_sow và ai_tag."
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <Card className="p-6">
          <form onSubmit={submit} className="grid gap-4">
            <Field label="Tiêu đề dự án">
              <Input value={form.title} onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))} required />
            </Field>
            <Field label="Yêu cầu thô">
              <Textarea value={form.rawRequirements} onChange={(event) => setForm((value) => ({ ...value, rawRequirements: event.target.value }))} required />
            </Field>
            <div className="flex justify-end">
              <Button type="button" variant="secondary" onClick={generateSow}>
                <Sparkles className="h-4 w-4" />
                Mô phỏng AI chuẩn hóa SoW
              </Button>
            </div>
            <Field label="Structured SoW">
              <Textarea value={form.structuredSow} onChange={(event) => setForm((value) => ({ ...value, structuredSow: event.target.value }))} />
            </Field>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Ngân sách">
                <Input type="number" value={form.budget} onChange={(event) => setForm((value) => ({ ...value, budget: event.target.value }))} required />
              </Field>
              <Field label="Thời lượng">
                <Input type="number" value={form.plannedDurationValue} onChange={(event) => setForm((value) => ({ ...value, plannedDurationValue: event.target.value }))} />
              </Field>
              <Field label="Đơn vị">
                <Input value={form.plannedDurationUnit} onChange={(event) => setForm((value) => ({ ...value, plannedDurationUnit: event.target.value }))} />
              </Field>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Field label="Lĩnh vực nền tảng hỗ trợ">
                <div className="max-h-56 overflow-y-auto rounded-2xl border border-slate-100 bg-white p-3">
                  <div className="grid gap-2">
                    {domains.map((domain) => (
                      <label key={domain.domainId} className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                        <input type="checkbox" checked={selectedDomainIds.includes(domain.domainId)} onChange={() => toggleDomain(domain.domainId)} />
                        {domain.domainName}
                      </label>
                    ))}
                  </div>
                </div>
              </Field>
              <Field label="Kỹ năng yêu cầu">
                <div className="max-h-56 overflow-y-auto rounded-2xl border border-slate-100 bg-white p-3">
                  <div className="grid gap-2">
                    {skills.map((skill) => (
                      <label key={skill.skillId} className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                        <input type="checkbox" checked={selectedSkillIds.includes(skill.skillId)} onChange={() => toggleSkill(skill.skillId)} />
                        {skill.skillName}
                      </label>
                    ))}
                  </div>
                </div>
              </Field>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <SectionHeading
                title="Project milestones"
                description="Milestones are attached to the job, then reused by the contract after proposal acceptance."
                action={<Button type="button" size="sm" variant="secondary" onClick={() => setMilestones((items) => [...items, { milestoneName: '', fundsAllocated: '', orderIndex: String(items.length + 1) }])}><Plus className="h-4 w-4" /> Add</Button>}
              />
              <div className="mt-4 grid gap-3">
                {milestones.map((milestone, index) => (
                  <div key={index} className="grid gap-3 rounded-2xl bg-white p-3 md:grid-cols-[1fr_160px_110px_auto]">
                    <Input value={milestone.milestoneName} placeholder="Milestone name" onChange={(event) => setMilestones((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, milestoneName: event.target.value } : item))} />
                    <Input type="number" value={milestone.fundsAllocated} placeholder="Budget" onChange={(event) => setMilestones((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, fundsAllocated: event.target.value } : item))} />
                    <Input type="number" value={milestone.orderIndex} placeholder="Order" onChange={(event) => setMilestones((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, orderIndex: event.target.value } : item))} />
                    <Button type="button" variant="ghost" size="sm" onClick={() => setMilestones((items) => items.filter((_, itemIndex) => itemIndex !== index))}>Remove</Button>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setForm((value) => ({ ...value, status: 'OPEN' }))}>
                Chuyển sang OPEN
              </Button>
              <Button type="submit" loading={loading}>
                <Save className="h-4 w-4" />
                Lưu job
              </Button>
            </div>
          </form>
        </Card>
        <div className="space-y-4">
          <Card className="overflow-hidden p-5">
            <img src="/images/ai-job-assistant.png" alt="AI assistant" className="rounded-3xl" />
            <Notice tone="info" title="Backend gap được giữ trong UI" className="mt-4">
              Khi tích hợp Python AI Service, nút mô phỏng sẽ được đổi sang API thật mà không thay đổi layout.
            </Notice>
          </Card>
          {savedJob && (
            <Card className="p-5">
              <SectionHeading title="Job đã lưu" />
              <p className="mt-3 font-extrabold text-ink">#{savedJob.jobId} - {savedJob.title}</p>
              <div className="mt-4">
                <LinkButton to={`/app/jobs/${savedJob.jobId}/manage`} variant="secondary">
                  Đi tới quản lý job
                </LinkButton>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export function ManageJobPage() {
  const { jobId } = useParams();
  const [job, setJob] = useState<Job | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [matches, setMatches] = useState<Proposal[]>([]);
  const [active, setActive] = useState('ai');
  const [contractModal, setContractModal] = useState<Proposal | null>(null);
  const [contractForm, setContractForm] = useState({ technologyUsed: 'Python, FastAPI, PostgreSQL', totalBudget: '', timelineDays: '60' });

  useEffect(() => {
    const id = Number(jobId);
    marketplaceApi.getJob(id).then(setJob);
    marketplaceApi.listProposals(id).then(setProposals);
    marketplaceApi.matching(id).then(setMatches);
  }, [jobId]);

  if (!job) return <div>Đang tải job...</div>;

  const review = async (proposalId: number, status: 'Accepted' | 'Rejected') => {
    const updated = await marketplaceApi.reviewProposal(proposalId, status);
    setProposals((items) => items.map((item) => (item.proposalId === proposalId ? updated : item)));
  };

  const createContract = async () => {
    if (!contractModal) return;
    await contractApi.createFromProposal(contractModal.proposalId, {
      technologyUsed: contractForm.technologyUsed,
      totalBudget: Number(contractForm.totalBudget || contractModal.bidAmount),
      timelineDays: Number(contractForm.timelineDays),
    });
    setContractModal(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="MATCH-01 / MATCH-02"
        title={job.title}
        description="Màn hình dual-flow bắt buộc: AI đề xuất và proposal chuyên gia tự nộp nằm trong hai tab tách biệt."
        actions={<LinkButton to={`/jobs/${job.jobId}`} variant="secondary">Xem public detail</LinkButton>}
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card className="p-6">
          <Tabs
            active={active}
            onChange={setActive}
            tabs={[
              { id: 'ai', label: 'AI đề xuất', count: matches.length },
              { id: 'proposal', label: 'Proposals', count: proposals.length },
            ]}
          />
          <div className="mt-6 grid gap-4">
            {(active === 'ai' ? matches : proposals).map((proposal) => (
              <ProposalCard
                key={`${active}-${proposal.proposalId}`}
                proposal={proposal}
                mode={active as 'ai' | 'proposal'}
                onAccept={() => review(proposal.proposalId, 'Accepted')}
                onReject={() => review(proposal.proposalId, 'Rejected')}
                onContract={() => {
                  setContractModal(proposal);
                  setContractForm((value) => ({ ...value, totalBudget: String(proposal.bidAmount) }));
                }}
              />
            ))}
            {(active === 'ai' ? matches : proposals).length === 0 && (
              <EmptyState title="Chưa có dữ liệu" description="Job này chưa có proposal hoặc chưa đủ dữ liệu matching." />
            )}
          </div>
        </Card>
        <Card className="p-6">
          <SectionHeading title="Tóm tắt SoW" />
          <p className="mt-4 text-sm leading-7 text-slate-600">{job.structuredSow}</p>
          <div className="mt-5 grid gap-3 rounded-3xl bg-slate-50 p-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Ngân sách</span>
              <span className="font-extrabold text-ink">{formatCurrency(job.budget)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">AI tag</span>
              <span className="font-extrabold text-ink">{job.aiTag}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Trạng thái</span>
              <StatusBadge status={job.status} />
            </div>
          </div>
          <Notice tone="warning" title="Chờ AI matching nâng cấp" className="mt-4">
            Endpoint hiện match keyword “AI”. UI đã chuẩn bị score, skill và rating để thay bằng model matching sau này.
          </Notice>
        </Card>
      </div>

      <Modal
        open={Boolean(contractModal)}
        onClose={() => setContractModal(null)}
        title="Tạo hợp đồng nháp"
        description="Tạo draft contract từ proposal đã chọn."
        footer={
          <>
            <Button variant="secondary" onClick={() => setContractModal(null)}>Hủy</Button>
            <Button onClick={createContract}>Tạo Draft</Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Field label="Công nghệ sử dụng">
            <Input value={contractForm.technologyUsed} onChange={(event) => setContractForm((value) => ({ ...value, technologyUsed: event.target.value }))} />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Tổng ngân sách">
              <Input type="number" value={contractForm.totalBudget} onChange={(event) => setContractForm((value) => ({ ...value, totalBudget: event.target.value }))} />
            </Field>
            <Field label="Timeline days">
              <Input type="number" value={contractForm.timelineDays} onChange={(event) => setContractForm((value) => ({ ...value, timelineDays: event.target.value }))} />
            </Field>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ProposalCard({
  proposal,
  mode,
  onAccept,
  onReject,
  onContract,
}: {
  proposal: Proposal;
  mode: 'ai' | 'proposal';
  onAccept: () => void;
  onReject: () => void;
  onContract: () => void;
}) {
  return (
    <div className="rounded-3xl border border-slate-100 p-4 transition hover:border-brand-100 hover:bg-brand-50/30">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex gap-3">
          <Avatar name={proposal.expertName} />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-extrabold text-ink">{proposal.expertName || `Expert #${proposal.expertId}`}</p>
              <StatusBadge status={proposal.status} />
            </div>
            <p className="mt-1 text-sm text-slate-500">{proposal.expertTitle}</p>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{proposal.technicalSolution}</p>
          </div>
        </div>
        <div className="shrink-0 text-left md:text-right">
          <p className="font-display text-xl font-black text-ink">{formatCompactCurrency(proposal.bidAmount)}</p>
          <p className="mt-1 text-xs font-bold text-slate-400">{proposal.deliveryDays || 60} ngày</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {mode === 'ai' && (
          <Badge tone="mint">
            <Sparkles className="h-3.5 w-3.5" />
            Match {proposal.matchScore || 90}%
          </Badge>
        )}
        <Badge tone="amber">
          <Star className="h-3.5 w-3.5" />
          {proposal.rating || 4.8}
        </Badge>
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
  );
}

export function OpportunitiesPage() {
  const [query, setQuery] = useState('');
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    marketplaceApi.listJobs().then(setJobs).catch(() => setJobs([]));
  }, []);

  const filteredJobs = useMemo(
    () => jobs.filter((job) => `${job.title} ${job.aiTag}`.toLowerCase().includes(query.toLowerCase())),
    [jobs, query],
  );
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="MATCH-02"
        title="Cơ hội dành cho chuyên gia"
        description="Chuyên gia xem job công khai và nộp proposal chủ động."
      />
      <Card className="p-4">
        <SearchInput value={query} onChange={setQuery} placeholder="Tìm cơ hội theo kỹ năng..." />
      </Card>
      <div className="grid gap-4 lg:grid-cols-3">
        {filteredJobs.map((job) => (
          <JobCard key={job.jobId} job={job} />
        ))}
      </div>
      {filteredJobs.length === 0 && <EmptyState title="Chưa có job mở" description="Dữ liệu được lấy trực tiếp từ backend `/api/v1/jobs`." />}
    </div>
  );
}

export function ProposalsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="MATCH-02"
        title="Proposal của tôi"
        description="Back-end chưa có API list proposal theo expert, UI giữ màn hình để nối khi endpoint bổ sung."
        actions={<LinkButton to="/app/opportunities" variant="secondary"><RefreshCw className="h-4 w-4" /> Tìm job mới</LinkButton>}
      />
      <div className="grid gap-4">
        {([] as Proposal[]).map((proposal) => {
          const job = ([] as Job[]).find((item) => item.jobId === proposal.jobId);
          return (
            <Card key={proposal.proposalId} className="p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge status={proposal.status} />
                    <Badge tone="brand">{job?.aiTag || 'AI'}</Badge>
                  </div>
                  <h3 className="mt-3 font-display text-lg font-extrabold text-ink">{job?.title}</h3>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{proposal.technicalSolution}</p>
                  <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-500">
                    <span className="inline-flex items-center gap-1"><CalendarDays className="h-4 w-4" /> {proposal.deliveryDays || 60} ngày</span>
                    <span className="inline-flex items-center gap-1"><Lightbulb className="h-4 w-4" /> Score {proposal.matchScore || 88}%</span>
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
                  <p className="text-xs font-bold text-slate-400">Bid amount</p>
                  <p className="font-display text-xl font-black text-brand-700">{formatCompactCurrency(proposal.bidAmount)}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

import {
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  Filter,
  ShieldCheck,
  Sparkles,
  Star,
  WalletCards,
} from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { marketplaceApi } from '../lib/api';
import { getSession } from '../lib/session';
import { formatCompactCurrency, formatCurrency } from '../lib/utils';
import { mockExperts } from '../data/mock';
import type { Job } from '../types';
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
  SearchInput,
  SectionHeading,
  StatusBadge,
  Textarea,
} from '../components/ui';

export function LandingPage() {
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    marketplaceApi.listJobs().then((data) => setJobs(data.slice(0, 3)));
  }, []);

  return (
    <main>
      <section className="relative overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-brand-100/60 blur-3xl" />
        <div className="absolute right-8 top-28 h-24 w-24 rounded-full bg-coral-100 blur-2xl" />
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 md:grid-cols-[1fr_1.05fr] md:px-6 md:py-24">
          <div className="relative z-10">
            <Badge tone="brand">
              <Sparkles className="h-3.5 w-3.5" />
              AI Project Marketplace
            </Badge>
            <h1 className="mt-6 font-display text-4xl font-black tracking-[-0.055em] text-ink md:text-6xl">
              Thuê chuyên gia AI, quản lý dự án và escrow trong một nền tảng sáng rõ.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-slate-600">
              AITASKER giúp doanh nghiệp chuẩn hóa bài toán bằng AI Job Assistant, nhận proposal, ký hợp đồng, chia milestone, nghiệm thu và xử lý dòng tiền minh bạch.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton to="/register" size="lg">
                Bắt đầu dự án <ArrowRight className="h-4 w-4" />
              </LinkButton>
              <LinkButton to="/jobs" size="lg" variant="secondary">
                Xem cơ hội
              </LinkButton>
            </div>
            <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">
              <HeroStat value="23" label="Business rules" />
              <HeroStat value="4" label="Vai trò chính" />
              <HeroStat value="100%" label="API mapped" />
            </div>
          </div>
          <div className="relative z-10">
            <div className="absolute -left-4 top-12 z-20 hidden rounded-3xl border border-white/80 bg-white/95 p-4 shadow-soft backdrop-blur md:block">
              <p className="text-xs font-bold text-slate-400">Matching score</p>
              <div className="mt-2 flex items-end gap-2">
                <span className="font-display text-3xl font-black text-brand-600">96%</span>
                <Badge tone="mint">RAG</Badge>
              </div>
              <Progress value={96} className="mt-3 w-40" />
            </div>
            <div className="relative animate-float overflow-hidden rounded-[2.5rem] border border-white bg-white p-2 shadow-soft">
              <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-white/45 via-transparent to-brand-100/40" />
              <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-cyan-300/30 blur-3xl" />
              <img
                src="/images/hero-collaboration.png"
                alt="AI hologram between robot and human hand"
                className="relative h-full min-h-[320px] w-full rounded-[2rem] object-cover object-center ring-1 ring-cyan-100/60"
              />
            </div>
            <div className="absolute bottom-6 right-2 z-20 hidden rounded-3xl border border-white/80 bg-white/95 p-4 shadow-soft backdrop-blur md:block">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-mint-50 text-mint-600">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-extrabold text-ink">Escrow bảo vệ 2 chiều</p>
                  <p className="text-xs text-slate-500">Milestone, NDA, dispute, invoice</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-7xl px-4 py-12 md:px-6">
        <SectionHeading
          title="Một luồng làm việc khép kín"
          description="Thiết kế theo đúng nghiệp vụ trong BR_DB: đăng ký, thẩm định, đấu thầu, hợp đồng, thực thi, tài chính và rủi ro."
        />
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {[
            ['1', 'Chuẩn hóa bài toán', 'AI Job Assistant chuyển yêu cầu thô thành SoW có cấu trúc.'],
            ['2', 'Nhận proposal', 'Doanh nghiệp xem tab AI đề xuất và tab chuyên gia tự nộp.'],
            ['3', 'Ký hợp đồng', 'Draft, request change, activate, NDA và milestone.'],
            ['4', 'Nghiệm thu an toàn', 'Escrow, SLA 7 ngày, dispute và review chéo.'],
          ].map(([step, title, desc]) => (
            <Card key={step} hover className="p-5">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-50 font-display text-lg font-black text-brand-700">
                {step}
              </span>
              <h3 className="mt-4 font-display text-lg font-extrabold text-ink">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">{desc}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-12 md:grid-cols-[1fr_1fr] md:px-6">
        <Card className="overflow-hidden p-6">
          <div className="flex items-start justify-between gap-4">
            <SectionHeading
              title="Job đang nổi bật"
              description="Dữ liệu gọi từ API `/api/v1/jobs`, tự fallback khi back-end chưa chạy."
            />
            <LinkButton to="/jobs" variant="secondary" size="sm">
              Xem tất cả
            </LinkButton>
          </div>
          <div className="mt-5 grid gap-3">
            {jobs.map((job) => (
              <Link
                key={job.jobId}
                to={`/jobs/${job.jobId}`}
                className="group rounded-2xl border border-slate-100 p-4 transition hover:border-brand-100 hover:bg-brand-50/40"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-bold text-ink group-hover:text-brand-700">{job.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{job.companyName}</p>
                  </div>
                  <StatusBadge status={job.status} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone="brand">{job.aiTag}</Badge>
                  <Badge tone="mint">{formatCompactCurrency(job.budget)}</Badge>
                  <Badge tone="slate">{job.proposalsCount || 0} proposal</Badge>
                </div>
              </Link>
            ))}
          </div>
        </Card>

        <Card className="relative overflow-hidden bg-gradient-to-br from-brand-600 to-indigo-700 p-6 text-white">
          <div className="absolute -right-14 -top-14 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
          <div className="relative z-10 max-w-md">
            <Badge tone="mint">AI Job Assistant</Badge>
            <h2 className="mt-5 font-display text-3xl font-black tracking-tight">
              Giao diện đã có sẵn cho AI service dù back-end chưa tích hợp thật.
            </h2>
            <p className="mt-4 text-sm leading-7 text-blue-50">
              Form tạo job có khu vực mô tả thô, SoW gợi ý, AI tag, kỹ năng, ngân sách và thời lượng để giữ đúng JOB-01.
            </p>
            <div className="mt-6">
              <LinkButton to="/app/jobs/new" variant="secondary">
                Thử tạo job
              </LinkButton>
            </div>
          </div>
        </Card>
      </section>
    </main>
  );
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-3xl border border-white bg-white/80 p-4 shadow-card backdrop-blur">
      <p className="font-display text-2xl font-black text-brand-700">{value}</p>
      <p className="mt-1 text-xs font-semibold text-slate-500">{label}</p>
    </div>
  );
}

export function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('ALL');

  useEffect(() => {
    marketplaceApi.listJobs().then(setJobs);
  }, []);

  const filtered = useMemo(
    () =>
      jobs.filter((job) => {
        const matchesQuery = `${job.title} ${job.rawRequirements} ${job.aiTag}`
          .toLowerCase()
          .includes(query.toLowerCase());
        const matchesStatus = status === 'ALL' || job.status === status;
        return matchesQuery && matchesStatus;
      }),
    [jobs, query, status],
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 md:px-6">
      <PageHeader
        eyebrow="Marketplace"
        title="Cơ hội dự án AI"
        description="Danh sách job công khai cho chuyên gia và là nơi doanh nghiệp kiểm tra thị trường."
        actions={<LinkButton to="/register">Đăng ký để nộp proposal</LinkButton>}
      />
      <Card className="mt-8 p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_220px_120px]">
          <SearchInput value={query} onChange={setQuery} placeholder="Tìm theo tiêu đề, kỹ năng, AI tag..." />
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 outline-none"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="OPEN">Đang mở</option>
            <option value="DRAFT">Nháp</option>
            <option value="CLOSED">Đã đóng</option>
          </select>
          <Button variant="secondary">
            <Filter className="h-4 w-4" />
            Lọc
          </Button>
        </div>
      </Card>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {filtered.map((job) => (
          <JobCard key={job.jobId} job={job} />
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="mt-6">
          <EmptyState title="Không có job phù hợp" description="Thử đổi từ khóa hoặc bỏ bớt bộ lọc trạng thái." />
        </div>
      )}
    </main>
  );
}

export function JobCard({ job, manage = false }: { job: Job; manage?: boolean }) {
  return (
    <Card hover className="flex h-full flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <Badge tone={job.isHot ? 'coral' : 'brand'}>{job.aiTag || 'AI Project'}</Badge>
        <StatusBadge status={job.status} />
      </div>
      <h3 className="mt-4 font-display text-lg font-extrabold leading-7 text-ink">{job.title}</h3>
      <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">{job.structuredSow || job.rawRequirements}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {(job.skills || []).slice(0, 3).map((skill) => (
          <Badge key={skill} tone="slate">
            {skill}
          </Badge>
        ))}
      </div>
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
      <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <span className="text-xs font-semibold text-slate-400">{job.companyName || 'Doanh nghiệp'}</span>
        <LinkButton to={manage ? `/app/jobs/${job.jobId}/manage` : `/jobs/${job.jobId}`} size="sm" variant="secondary">
          Chi tiết <ArrowRight className="h-4 w-4" />
        </LinkButton>
      </div>
    </Card>
  );
}

export function JobDetailPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [proposal, setProposal] = useState({ bidAmount: '', technicalSolution: '' });

  useEffect(() => {
    marketplaceApi.getJob(Number(jobId)).then(setJob);
  }, [jobId]);

  if (!job) {
    return <main className="mx-auto max-w-7xl px-4 py-10 md:px-6">Đang tải job...</main>;
  }

  const submitProposal = async () => {
    setSubmitting(true);
    await marketplaceApi.submitProposal({
      jobId: job.jobId,
      bidAmount: Number(proposal.bidAmount),
      technicalSolution: proposal.technicalSolution,
    });
    setSubmitting(false);
    setModalOpen(false);
    navigate('/app/proposals');
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 md:px-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          <Link to="/jobs" className="text-sm font-bold text-brand-600">
            ← Quay lại marketplace
          </Link>
          <div className="mt-5 flex flex-wrap gap-2">
            <Badge tone="brand">{job.aiTag}</Badge>
            {job.isHot && <Badge tone="coral">Hot project</Badge>}
            <StatusBadge status={job.status} />
          </div>
          <h1 className="mt-5 font-display text-4xl font-black tracking-[-0.045em] text-ink">
            {job.title}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">{job.rawRequirements}</p>
          <Card className="mt-8 p-6">
            <SectionHeading
              title="Statement of Work đã chuẩn hóa"
              description="Khu vực này phục vụ JOB-01. Khi AI service được tích hợp, SoW sẽ được sinh tự động từ mô tả thô."
            />
            <div className="mt-5 rounded-3xl bg-gradient-to-br from-brand-50 to-indigo-50 p-5 text-sm leading-7 text-slate-700">
              {job.structuredSow || 'Chưa có SoW. Doanh nghiệp có thể cập nhật bằng AI Job Assistant.'}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {(job.skills || []).map((skill) => (
                <Badge key={skill} tone="slate">
                  {skill}
                </Badge>
              ))}
            </div>
          </Card>
        </div>
        <aside className="space-y-4">
          <Card className="p-5">
            <SectionHeading title="Tóm tắt dự án" />
            <div className="mt-5 grid gap-3">
              <InfoRow icon={<WalletCards className="h-4 w-4" />} label="Ngân sách" value={formatCurrency(job.budget)} />
              <InfoRow icon={<Clock3 className="h-4 w-4" />} label="Thời lượng" value={`${job.plannedDurationValue || 0} ${job.plannedDurationUnit || 'tuần'}`} />
              <InfoRow icon={<BriefcaseBusiness className="h-4 w-4" />} label="Doanh nghiệp" value={job.companyName || 'Đang cập nhật'} />
              <InfoRow icon={<Bot className="h-4 w-4" />} label="AI tag" value={job.aiTag || 'General AI'} />
            </div>
            <Button className="mt-5 w-full" onClick={() => setModalOpen(true)} disabled={job.status === 'CLOSED'}>
              Nộp báo giá dự thầu
            </Button>
          </Card>
          <Notice tone="info" title="Luồng dual-flow">
            Doanh nghiệp sẽ thấy proposal của bạn trong tab Proposals, song song với tab AI đề xuất chuyên gia.
          </Notice>
        </aside>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nộp proposal"
        description="Gửi mức giá và tóm tắt giải pháp sơ bộ cho doanh nghiệp."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Hủy
            </Button>
            <Button onClick={submitProposal} loading={submitting}>
              Gửi proposal
            </Button>
          </>
        }
      >
        {!getSession() && (
          <Notice tone="warning" title="Bạn cần đăng nhập để gọi API thật">
            Có thể đăng nhập demo role Expert hoặc đăng ký tài khoản mới trước khi nộp.
          </Notice>
        )}
        <div className="mt-4 grid gap-4">
          <Field label="Bid amount">
            <Input
              type="number"
              value={proposal.bidAmount}
              onChange={(event) => setProposal((value) => ({ ...value, bidAmount: event.target.value }))}
              placeholder="Ví dụ: 165000000"
            />
          </Field>
          <Field label="Giải pháp kỹ thuật">
            <Textarea
              value={proposal.technicalSolution}
              onChange={(event) =>
                setProposal((value) => ({ ...value, technicalSolution: event.target.value }))
              }
              placeholder="Mô tả kiến trúc, cách triển khai, chỉ số cam kết..."
            />
          </Field>
        </div>
      </Modal>
    </main>
  );
}

function InfoRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-brand-600 shadow-sm">{icon}</span>
      <div>
        <p className="text-xs font-bold text-slate-400">{label}</p>
        <p className="text-sm font-extrabold text-ink">{value}</p>
      </div>
    </div>
  );
}

export function ExpertDirectoryPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-10 md:px-6">
      <PageHeader
        eyebrow="Expert network"
        title="Danh bạ chuyên gia AI"
        description="Giao diện phục vụ matching, review uy tín và lựa chọn chuyên gia. API public expert profile chưa có nên trang dùng dữ liệu demo có cấu trúc."
      />
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {mockExperts.map((expert) => (
          <Card key={expert.expertId} hover className="p-5">
            <Avatar name={expert.fullName} size="xl" />
            <h3 className="mt-4 font-display text-lg font-extrabold text-ink">{expert.fullName}</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">{expert.title}</p>
            <div className="mt-4 flex items-center gap-2">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="text-sm font-extrabold text-ink">{expert.rating}</span>
              <span className="text-sm text-slate-400">• {expert.completedProjects} dự án</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {(expert.skills || []).slice(0, 3).map((skill) => (
                <Badge key={skill} tone="slate">
                  {skill}
                </Badge>
              ))}
            </div>
            <Button className="mt-5 w-full" variant="secondary">
              Xem năng lực
            </Button>
          </Card>
        ))}
      </div>
      <Card className="mt-8 overflow-hidden p-6">
        <div className="grid gap-6 md:grid-cols-[320px_1fr]">
          <img
            src="/images/ai-job-assistant.png"
            alt="AI assistant"
            className="rounded-3xl bg-brand-50 object-cover"
          />
          <div className="flex flex-col justify-center">
            <Badge tone="brand">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Matching theo SoW và Portfolio
            </Badge>
            <h2 className="mt-4 font-display text-3xl font-black tracking-tight text-ink">
              Giao diện đã sẵn sàng cho thuật toán đề xuất nâng cấp.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">
              Hiện back-end có endpoint matching theo keyword. Khi có AI matching thật, trang này có thể hiển thị score theo domain, skill, portfolio và lịch sử review mà không đổi luồng người dùng.
            </p>
          </div>
        </div>
      </Card>
    </main>
  );
}

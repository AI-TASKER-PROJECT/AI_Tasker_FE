import {
  CheckCircle2,
  Download,
  FileCheck2,
  FileText,
  Gavel,
  LockKeyhole,
  MessageSquareText,
  Plus,
  ReceiptText,
  ShieldCheck,
  Star,
  UploadCloud,
  WalletCards,
  XCircle,
} from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  mockChangeRequests,
  mockContracts,
  mockCriteria,
  mockDeliverables,
  mockInvoices,
  mockMilestones,
  mockReviews,
  mockTransactions,
} from '../data/mock';
import { adminApi, contractApi, disputeApi, financeApi } from '../lib/api';
import { formatCompactCurrency, formatCurrency } from '../lib/utils';
import type { Contract, Milestone } from '../types';
import {
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
  Textarea,
} from '../components/ui';

export function ContractsPage() {
  const [contracts] = useState<Contract[]>(mockContracts);
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="CON-01 / CON-02"
        title="Hợp đồng"
        description="Danh sách contract để đi vào đàm phán, NDA, workspace milestone, escrow và review."
      />
      <div className="grid gap-4 xl:grid-cols-3">
        {contracts.map((contract) => (
          <Card key={contract.contractId} hover className="p-5">
            <div className="flex items-start justify-between gap-3">
              <Badge tone="brand">#{contract.contractId}</Badge>
              <StatusBadge status={contract.status} />
            </div>
            <h3 className="mt-4 font-display text-lg font-extrabold leading-7 text-ink">{contract.title}</h3>
            <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-3">
              <div>
                <p className="text-xs font-bold text-slate-400">Giá trị</p>
                <p className="mt-1 text-sm font-extrabold text-ink">{formatCompactCurrency(contract.totalBudget)}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400">Timeline</p>
                <p className="mt-1 text-sm font-extrabold text-ink">{contract.timelineDays} ngày</p>
              </div>
            </div>
            <div className="mt-5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                <span>Tiến độ</span>
                <span>{contract.progress || 0}%</span>
              </div>
              <Progress value={contract.progress || 0} className="mt-2" />
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <LinkButton to={`/app/contracts/${contract.contractId}`} variant="secondary" size="sm">
                Chi tiết
              </LinkButton>
              <LinkButton to={`/app/contracts/${contract.contractId}/workspace`} size="sm">
                Workspace
              </LinkButton>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function ContractDetailPage() {
  const { contractId } = useParams();
  const [contract, setContract] = useState<Contract>(
    mockContracts.find((item) => item.contractId === Number(contractId)) || mockContracts[0],
  );
  const [changeOpen, setChangeOpen] = useState(false);
  const [terminateOpen, setTerminateOpen] = useState(false);
  const [changeForm, setChangeForm] = useState({ changeType: 'TIMELINE', changeSummary: '', proposedBudget: '', proposedTimelineDays: '' });
  const [reason, setReason] = useState('CLIENT_STOP_PROJECT');

  const activate = async () => setContract(await contractApi.activate(contract.contractId));
  const signNda = async () => setContract(await contractApi.signNda(contract.contractId));
  const terminate = async () => {
    setContract(await contractApi.terminate(contract.contractId, reason));
    setTerminateOpen(false);
  };
  const requestChange = async () => {
    await contractApi.requestChange({
      contractId: contract.contractId,
      changeType: changeForm.changeType,
      changeSummary: changeForm.changeSummary,
      proposedBudget: Number(changeForm.proposedBudget) || undefined,
      proposedTimelineDays: Number(changeForm.proposedTimelineDays) || undefined,
    });
    setChangeOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="CONTRACT DETAIL"
        title={contract.title || `Contract #${contract.contractId}`}
        description="Điểm điều phối cho đàm phán, activate, NDA, termination và các luồng con."
        actions={
          <>
            <LinkButton to={`/app/contracts/${contract.contractId}/workspace`} variant="secondary">
              Workspace
            </LinkButton>
            <LinkButton to="/app/finance" variant="secondary">
              Escrow
            </LinkButton>
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card className="p-6">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={contract.status} />
            <Badge tone={contract.ndaSigned ? 'mint' : 'amber'}>
              <LockKeyhole className="h-3.5 w-3.5" />
              NDA {contract.ndaSigned ? 'đã ký' : 'chưa ký'}
            </Badge>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <ContractMetric label="Tổng ngân sách" value={formatCurrency(contract.totalBudget)} />
            <ContractMetric label="Timeline" value={`${contract.timelineDays} ngày`} />
            <ContractMetric label="Công nghệ" value={contract.technologyUsed || 'Chưa chốt'} />
          </div>
          <div className="mt-6 rounded-3xl bg-slate-50 p-5">
            <SectionHeading title="Hai bên tham gia" />
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Participant label="Doanh nghiệp" value={contract.businessName || `Business #${contract.businessId}`} />
              <Participant label="Chuyên gia" value={contract.expertName || `Expert #${contract.expertId}`} />
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button onClick={activate} disabled={contract.status === 'Active'}>
              <CheckCircle2 className="h-4 w-4" />
              Activate
            </Button>
            <Button variant="secondary" onClick={signNda} disabled={contract.ndaSigned || contract.status !== 'Active'}>
              <ShieldCheck className="h-4 w-4" />
              Ký NDA
            </Button>
            <Button variant="secondary" onClick={() => setChangeOpen(true)}>
              <MessageSquareText className="h-4 w-4" />
              Request change
            </Button>
            <Button variant="danger" onClick={() => setTerminateOpen(true)}>
              <XCircle className="h-4 w-4" />
              Terminate
            </Button>
          </div>
        </Card>
        <Card className="p-6">
          <SectionHeading title="Timeline đàm phán" description="API hiện có create change request, chưa có list endpoint." />
          <div className="mt-5 grid gap-3">
            {mockChangeRequests
              .filter((item) => item.contractId === contract.contractId)
              .map((item) => (
                <div key={item.requestId} className="rounded-2xl border border-slate-100 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <Badge tone="brand">{item.changeType}</Badge>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{item.changeSummary}</p>
                </div>
              ))}
            {mockChangeRequests.filter((item) => item.contractId === contract.contractId).length === 0 && (
              <EmptyState title="Chưa có request change" description="Hai bên có thể tạo yêu cầu sửa scope, ngân sách hoặc timeline." />
            )}
          </div>
          <Notice tone="info" title="NDA PDF" className="mt-4">
            UI có trạng thái ký NDA. Chức năng sinh PDF/Firebase Storage đang là phần chờ tích hợp.
          </Notice>
        </Card>
      </div>

      <Modal
        open={changeOpen}
        onClose={() => setChangeOpen(false)}
        title="Request change"
        description="Gửi yêu cầu sửa hợp đồng khi contract đang Draft/Negotiating."
        footer={<><Button variant="secondary" onClick={() => setChangeOpen(false)}>Hủy</Button><Button onClick={requestChange}>Gửi yêu cầu</Button></>}
      >
        <div className="grid gap-4">
          <Field label="Loại thay đổi">
            <Input value={changeForm.changeType} onChange={(event) => setChangeForm((value) => ({ ...value, changeType: event.target.value }))} />
          </Field>
          <Field label="Nội dung">
            <Textarea value={changeForm.changeSummary} onChange={(event) => setChangeForm((value) => ({ ...value, changeSummary: event.target.value }))} />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Ngân sách đề xuất">
              <Input type="number" value={changeForm.proposedBudget} onChange={(event) => setChangeForm((value) => ({ ...value, proposedBudget: event.target.value }))} />
            </Field>
            <Field label="Timeline đề xuất">
              <Input type="number" value={changeForm.proposedTimelineDays} onChange={(event) => setChangeForm((value) => ({ ...value, proposedTimelineDays: event.target.value }))} />
            </Field>
          </div>
        </div>
      </Modal>

      <Modal
        open={terminateOpen}
        onClose={() => setTerminateOpen(false)}
        title="Chấm dứt hợp đồng"
        description="UI thể hiện snapshot termination dù back-end hiện mới đổi trạng thái contract."
        footer={<><Button variant="secondary" onClick={() => setTerminateOpen(false)}>Hủy</Button><Button variant="danger" onClick={terminate}>Xác nhận terminate</Button></>}
      >
        <Notice tone="warning" title="Snapshot tiến độ">
          Mốc đã Released sẽ thuộc chuyên gia; mốc chưa hoàn thành sẽ hoàn tiền doanh nghiệp. Logic chi tiết đang chờ back-end.
        </Notice>
        <Field label="Lý do" className="mt-4">
          <Textarea value={reason} onChange={(event) => setReason(event.target.value)} />
        </Field>
      </Modal>
    </div>
  );
}

function ContractMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-100 p-4">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-2 font-display text-lg font-black text-ink">{value}</p>
    </div>
  );
}

function Participant({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 font-extrabold text-ink">{value}</p>
    </div>
  );
}

export function WorkspacePage() {
  const { contractId } = useParams();
  const contract = mockContracts.find((item) => item.contractId === Number(contractId)) || mockContracts[0];
  const [milestones, setMilestones] = useState<Milestone[]>(mockMilestones.filter((item) => item.contractId === contract.contractId));
  const [milestoneOpen, setMilestoneOpen] = useState(false);
  const [deliverableOpen, setDeliverableOpen] = useState<Milestone | null>(null);
  const [criteriaOpen, setCriteriaOpen] = useState<Milestone | null>(null);
  const [milestoneForm, setMilestoneForm] = useState({ milestoneName: '', fundsAllocated: '', orderIndex: String(milestones.length + 1), status: 'Pending' });
  const [criteriaText, setCriteriaText] = useState('');
  const [deliverableForm, setDeliverableForm] = useState({ sourceCodeUrl: '', demoLink: '', submissionNotes: '' });

  const createMilestone = async () => {
    const milestone = await contractApi.createMilestone({
      contractId: contract.contractId,
      milestoneName: milestoneForm.milestoneName,
      fundsAllocated: Number(milestoneForm.fundsAllocated),
      orderIndex: Number(milestoneForm.orderIndex),
      status: milestoneForm.status,
    });
    setMilestones((items) => [...items, milestone]);
    setMilestoneOpen(false);
  };

  const createCriteria = async () => {
    if (!criteriaOpen) return;
    await contractApi.createCriteria({
      milestoneId: criteriaOpen.milestoneId,
      description: criteriaText,
      isPassed: false,
    });
    setCriteriaOpen(null);
    setCriteriaText('');
  };

  const submitDeliverable = async () => {
    if (!deliverableOpen) return;
    await contractApi.submitDeliverable({ milestoneId: deliverableOpen.milestoneId, ...deliverableForm });
    setDeliverableOpen(null);
  };

  const runSla = async () => {
    const updated = await contractApi.runSlaAutoApprove();
    setMilestones(updated.filter((item) => item.contractId === contract.contractId));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="EXEC-01 / EXEC-02"
        title={`Workspace: ${contract.title}`}
        description="Quản lý milestone, acceptance criteria, deliverable và SLA auto approve."
        actions={<><Button variant="secondary" onClick={runSla}>Chạy SLA auto approve</Button><Button onClick={() => setMilestoneOpen(true)}><Plus className="h-4 w-4" /> Thêm milestone</Button></>}
      />
      <div className="grid gap-4">
        {milestones.map((milestone) => (
          <Card key={milestone.milestoneId} className="p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="brand">Mốc {milestone.orderIndex}</Badge>
                  <StatusBadge status={milestone.status} />
                  <Badge tone="amber">SLA còn {milestone.slaDaysLeft ?? 7} ngày</Badge>
                </div>
                <h3 className="mt-3 font-display text-xl font-extrabold text-ink">{milestone.milestoneName}</h3>
                <p className="mt-2 text-sm text-slate-500">Ký quỹ: {formatCurrency(milestone.fundsAllocated)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={() => setCriteriaOpen(milestone)}>
                  <CheckCircle2 className="h-4 w-4" /> Thêm AC
                </Button>
                <Button size="sm" onClick={() => setDeliverableOpen(milestone)}>
                  <UploadCloud className="h-4 w-4" /> Submit deliverable
                </Button>
              </div>
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-extrabold text-ink">Acceptance Criteria</p>
                <div className="mt-3 grid gap-2">
                  {mockCriteria
                    .filter((criteria) => criteria.milestoneId === milestone.milestoneId)
                    .map((criteria) => (
                      <div key={criteria.criteriaId} className="flex items-center gap-2 text-sm text-slate-600">
                        {criteria.isPassed ? <CheckCircle2 className="h-4 w-4 text-mint-600" /> : <span className="h-4 w-4 rounded-full border border-slate-300" />}
                        {criteria.description}
                      </div>
                    ))}
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-extrabold text-ink">Deliverables</p>
                <div className="mt-3 grid gap-2">
                  {mockDeliverables
                    .filter((item) => item.milestoneId === milestone.milestoneId)
                    .map((item) => (
                      <div key={item.deliverableId} className="rounded-xl bg-white p-3 text-sm text-slate-600 shadow-sm">
                        <p className="font-bold text-ink">{item.demoLink}</p>
                        <p className="mt-1">{item.submissionNotes}</p>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={milestoneOpen} onClose={() => setMilestoneOpen(false)} title="Tạo milestone" footer={<><Button variant="secondary" onClick={() => setMilestoneOpen(false)}>Hủy</Button><Button onClick={createMilestone}>Tạo</Button></>}>
        <div className="grid gap-4">
          <Field label="Tên milestone"><Input value={milestoneForm.milestoneName} onChange={(event) => setMilestoneForm((value) => ({ ...value, milestoneName: event.target.value }))} /></Field>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Funds allocated"><Input type="number" value={milestoneForm.fundsAllocated} onChange={(event) => setMilestoneForm((value) => ({ ...value, fundsAllocated: event.target.value }))} /></Field>
            <Field label="Order index"><Input type="number" value={milestoneForm.orderIndex} onChange={(event) => setMilestoneForm((value) => ({ ...value, orderIndex: event.target.value }))} /></Field>
            <Field label="Status"><Input value={milestoneForm.status} onChange={(event) => setMilestoneForm((value) => ({ ...value, status: event.target.value }))} /></Field>
          </div>
        </div>
      </Modal>

      <Modal open={Boolean(criteriaOpen)} onClose={() => setCriteriaOpen(null)} title="Thêm acceptance criteria" footer={<><Button variant="secondary" onClick={() => setCriteriaOpen(null)}>Hủy</Button><Button onClick={createCriteria}>Lưu AC</Button></>}>
        <Field label="Mô tả tiêu chí"><Textarea value={criteriaText} onChange={(event) => setCriteriaText(event.target.value)} /></Field>
      </Modal>

      <Modal open={Boolean(deliverableOpen)} onClose={() => setDeliverableOpen(null)} title="Submit deliverable" footer={<><Button variant="secondary" onClick={() => setDeliverableOpen(null)}>Hủy</Button><Button onClick={submitDeliverable}>Nộp</Button></>}>
        <div className="grid gap-4">
          <Field label="Source code URL"><Input value={deliverableForm.sourceCodeUrl} onChange={(event) => setDeliverableForm((value) => ({ ...value, sourceCodeUrl: event.target.value }))} /></Field>
          <Field label="Demo link"><Input value={deliverableForm.demoLink} onChange={(event) => setDeliverableForm((value) => ({ ...value, demoLink: event.target.value }))} /></Field>
          <Field label="Submission notes"><Textarea value={deliverableForm.submissionNotes} onChange={(event) => setDeliverableForm((value) => ({ ...value, submissionNotes: event.target.value }))} /></Field>
        </div>
      </Modal>
    </div>
  );
}

export function FinancePage() {
  const [transactions, setTransactions] = useState(mockTransactions);
  const [transactionOpen, setTransactionOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState<number | null>(null);
  const [form, setForm] = useState({ milestoneId: '702', amount: '110000000', commissionFee: '0', transactionType: 'Deposit', status: 'Pending' });

  const createTransaction = async () => {
    const tx = await financeApi.createTransaction({
      milestoneId: Number(form.milestoneId),
      amount: Number(form.amount),
      commissionFee: Number(form.commissionFee),
      transactionType: form.transactionType as 'Deposit',
      status: form.status,
    });
    setTransactions((items) => [...items, tx]);
    setTransactionOpen(false);
  };
  const webhook = async (transactionId: number) => {
    const updated = await financeApi.paymentWebhook(transactionId, 'Success', `VNP-${transactionId}`, 'https://example.com/bill.jpg');
    setTransactions((items) => items.map((item) => (item.transactionId === transactionId ? { ...item, status: updated.status } : item)));
  };
  const updateStatus = async (transactionId: number, status: string) => {
    const updated = await financeApi.updateTransactionStatus(transactionId, status);
    setTransactions((items) => items.map((item) => (item.transactionId === transactionId ? { ...item, status: updated.status } : item)));
  };
  const createInvoice = async () => {
    if (!invoiceOpen) return;
    await financeApi.createInvoice({ transactionId: invoiceOpen });
    setInvoiceOpen(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="FIN-01"
        title="Tài chính, Escrow và Invoice"
        description="Tạo transaction, webhook/IPN mô phỏng, cập nhật trạng thái và tạo invoice."
        actions={<Button onClick={() => setTransactionOpen(true)}><Plus className="h-4 w-4" /> Tạo transaction</Button>}
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm font-bold text-slate-500">Tổng lưu chuyển</p>
          <p className="mt-2 font-display text-3xl font-black text-ink">{formatCompactCurrency(transactions.reduce((sum, item) => sum + item.amount, 0))}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-bold text-slate-500">Phí nền tảng</p>
          <p className="mt-2 font-display text-3xl font-black text-mint-600">{formatCompactCurrency(transactions.reduce((sum, item) => sum + item.commissionFee, 0))}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-bold text-slate-500">Giao dịch pending</p>
          <p className="mt-2 font-display text-3xl font-black text-coral-600">{transactions.filter((item) => item.status === 'Pending').length}</p>
        </Card>
      </div>
      <Card className="overflow-hidden">
        <div className="grid border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-extrabold uppercase tracking-wide text-slate-400 md:grid-cols-[1fr_120px_120px_130px_260px]">
          <span>Milestone</span><span>Loại</span><span>Số tiền</span><span>Status</span><span>Action</span>
        </div>
        {transactions.map((tx) => (
          <div key={tx.transactionId} className="grid gap-3 border-b border-slate-100 px-5 py-4 text-sm md:grid-cols-[1fr_120px_120px_130px_260px] md:items-center">
            <div>
              <p className="font-extrabold text-ink">#{tx.transactionId}</p>
              <p className="mt-1 text-slate-500">{tx.milestoneName || `Milestone #${tx.milestoneId}`}</p>
            </div>
            <Badge tone="brand">{tx.transactionType}</Badge>
            <span className="font-extrabold text-ink">{formatCompactCurrency(tx.amount)}</span>
            <StatusBadge status={tx.status} />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="success" onClick={() => webhook(tx.transactionId)}>Webhook</Button>
              <Button size="sm" variant="secondary" onClick={() => updateStatus(tx.transactionId, 'Failed')}>Fail</Button>
              <Button size="sm" variant="ghost" onClick={() => setInvoiceOpen(tx.transactionId)}>Invoice</Button>
            </div>
          </div>
        ))}
      </Card>
      <Notice tone="info" title="VNPay / QR thật đang chờ tích hợp">
        UI đã có vị trí transaction và biên lai; khi gateway thật sẵn sàng chỉ thay action tạo mã QR/webhook.
      </Notice>

      <Modal open={transactionOpen} onClose={() => setTransactionOpen(false)} title="Tạo transaction" footer={<><Button variant="secondary" onClick={() => setTransactionOpen(false)}>Hủy</Button><Button onClick={createTransaction}>Tạo</Button></>}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Milestone ID"><Input value={form.milestoneId} onChange={(event) => setForm((value) => ({ ...value, milestoneId: event.target.value }))} /></Field>
          <Field label="Amount"><Input type="number" value={form.amount} onChange={(event) => setForm((value) => ({ ...value, amount: event.target.value }))} /></Field>
          <Field label="Commission fee"><Input type="number" value={form.commissionFee} onChange={(event) => setForm((value) => ({ ...value, commissionFee: event.target.value }))} /></Field>
          <Field label="Transaction type"><Input value={form.transactionType} onChange={(event) => setForm((value) => ({ ...value, transactionType: event.target.value }))} /></Field>
        </div>
      </Modal>
      <Modal open={Boolean(invoiceOpen)} onClose={() => setInvoiceOpen(null)} title="Tạo invoice" footer={<><Button variant="secondary" onClick={() => setInvoiceOpen(null)}>Hủy</Button><Button onClick={createInvoice}>Tạo invoice</Button></>}>
        <Notice tone="info" title="Invoice duy nhất theo transaction">
          Back-end sẽ từ chối nếu transaction đã có invoice.
        </Notice>
        <div className="mt-4 grid gap-3">
          {mockInvoices.filter((invoice) => invoice.transactionId === invoiceOpen).map((invoice) => (
            <div key={invoice.invoiceId} className="rounded-2xl bg-slate-50 p-4 text-sm">
              <p className="font-bold text-ink">Invoice #{invoice.invoiceId}</p>
              <p className="mt-1 text-slate-500">{invoice.bankTxCode}</p>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}

export function ReviewsPage() {
  const [reviews, setReviews] = useState(mockReviews);
  const [form, setForm] = useState({ contractId: '9002', rating: '5', comment: '' });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const review = await adminApi.createReview({
      contractId: Number(form.contractId),
      rating: Number(form.rating),
      comment: form.comment,
    });
    setReviews((items) => [...items, review]);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="REV-01"
        title="Đánh giá chéo"
        description="Hai bên đánh giá sau khi hợp đồng Completed/Terminated/Cancelled."
      />
      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <Card className="p-6">
          <SectionHeading title="Gửi review" />
          <form onSubmit={submit} className="mt-5 grid gap-4">
            <Field label="Contract ID"><Input value={form.contractId} onChange={(event) => setForm((value) => ({ ...value, contractId: event.target.value }))} /></Field>
            <Field label="Rating 1-5"><Input type="number" min="1" max="5" step="0.1" value={form.rating} onChange={(event) => setForm((value) => ({ ...value, rating: event.target.value }))} /></Field>
            <Field label="Nhận xét"><Textarea value={form.comment} onChange={(event) => setForm((value) => ({ ...value, comment: event.target.value }))} /></Field>
            <Button type="submit"><Star className="h-4 w-4" /> Gửi đánh giá</Button>
          </form>
        </Card>
        <Card className="p-6">
          <SectionHeading title="Review theo hợp đồng" action={<Button variant="secondary" size="sm"><Download className="h-4 w-4" /> Export UI</Button>} />
          <div className="mt-5 grid gap-3">
            {reviews.map((review) => (
              <div key={review.reviewId} className="rounded-2xl border border-slate-100 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-extrabold text-ink">{review.reviewerName || `Reviewer #${review.reviewerId}`}</p>
                  <Badge tone="amber"><Star className="h-3.5 w-3.5 fill-current" /> {review.rating}</Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{review.comment}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

export function CreateDisputeInline({ contractId, milestoneId }: { contractId: number; milestoneId?: number }) {
  const [open, setOpen] = useState(false);
  const [evidenceReport, setEvidenceReport] = useState('');

  const submit = async () => {
    await disputeApi.create({ contractId, milestoneId, evidenceReport, status: 'Open' });
    setOpen(false);
  };

  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>
        <Gavel className="h-4 w-4" />
        Khiếu nại
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Tạo dispute" footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Hủy</Button><Button variant="danger" onClick={submit}>Gửi dispute</Button></>}>
        <Field label="Bằng chứng / mô tả tranh chấp">
          <Textarea value={evidenceReport} onChange={(event) => setEvidenceReport(event.target.value)} />
        </Field>
      </Modal>
    </>
  );
}

export function ContractQuickLinks({ contract }: { contract: Contract }) {
  const links = [
    { to: `/app/contracts/${contract.contractId}`, label: 'Chi tiết', icon: <FileText className="h-4 w-4" /> },
    { to: `/app/contracts/${contract.contractId}/workspace`, label: 'Workspace', icon: <FileCheck2 className="h-4 w-4" /> },
    { to: '/app/finance', label: 'Escrow', icon: <WalletCards className="h-4 w-4" /> },
    { to: '/app/reviews', label: 'Review', icon: <Star className="h-4 w-4" /> },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {links.map((link) => (
        <Link key={link.to} to={link.to} className="inline-flex items-center gap-2 rounded-2xl border border-slate-100 bg-white px-3 py-2 text-sm font-bold text-slate-600 transition hover:border-brand-100 hover:text-brand-700">
          {link.icon}
          {link.label}
        </Link>
      ))}
      <span className="inline-flex items-center gap-2 rounded-2xl bg-mint-50 px-3 py-2 text-sm font-bold text-mint-600">
        <ReceiptText className="h-4 w-4" />
        Invoice ready
      </span>
    </div>
  );
}

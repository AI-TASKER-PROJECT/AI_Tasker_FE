import {
  CheckCircle2,
  FileSearch,
  Gavel,
  Send,
  Users,
  XCircle,
} from "lucide-react";
import { FormEvent, useEffect, useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { contractApi, disputeApi, profileApi } from "../lib/api";
import type {
  BusinessProfile,
  Dispute,
  ExpertProfile,
  Portfolio,
  TaxCheckResponse,
} from "../types";
import { FirebaseFileLink } from "../components/FirebaseFileLink";
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
} from "../components/ui";

export function DisputesPage({ staffMode = false }: { staffMode?: boolean }) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Dispute[]>([]);

  useEffect(() => {
    contractApi
      .listContracts()
      .then((contracts) =>
        Promise.all(
          contracts.map((contract) =>
            disputeApi.listByContract(contract.contractId),
          ),
        ),
      )
      .then((groups) => setItems(groups.flat()))
      .catch(() => setItems([]));
  }, []);

  const disputes = items.filter((item) =>
    `${item.title} ${item.jobTitle} ${item.status}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={staffMode ? "STF-02 / STF-03 / STF-04" : "RSK-01 / RSK-02"}
        title={staffMode ? "Ticket tranh chấp" : "Tranh chấp của dự án"}
        description={
          staffMode
            ? "Staff/Admin tiếp nhận, demo testing, viết technical report và đề xuất xử lý."
            : "Doanh nghiệp/chuyên gia tạo dispute để khóa dòng tiền và yêu cầu can thiệp."
        }
      />
      <Card className="p-4">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Tìm dispute theo job, trạng thái..."
        />
      </Card>
      <div className="grid gap-4">
        {disputes.map((dispute) => (
          <Card key={dispute.disputeId} className="p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone="brand">#{dispute.disputeId}</Badge>
                  <StatusBadge status={dispute.status} />
                </div>
                <h3 className="mt-3 font-display text-lg font-extrabold text-ink">
                  {dispute.title}
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  {dispute.jobTitle}
                </p>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                  {dispute.evidenceReport}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge tone="slate">Người tạo: {dispute.raisedBy}</Badge>
                  <Badge tone="mint">
                    Staff: {dispute.staffName || "Chưa gán"}
                  </Badge>
                </div>
              </div>
              <LinkButton
                to={
                  staffMode
                    ? `/app/tickets/${dispute.disputeId}`
                    : `/app/disputes/${dispute.disputeId}`
                }
                variant="secondary"
              >
                Xử lý
              </LinkButton>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function DisputeDetailPage({
  staffMode = false,
}: {
  staffMode?: boolean;
}) {
  const { disputeId } = useParams();
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [staffId, setStaffId] = useState("");
  const [testResult, setTestResult] = useState("");
  const [report, setReport] = useState({
    reportContent: "",
    proposedAction: "FORCE_PAYOUT_70_30",
  });

  useEffect(() => {
    disputeApi
      .get(Number(disputeId))
      .then((data) => {
        setDispute(data);
        setStaffId(String(data.assignedStaffId || ""));
      })
      .catch(() => setDispute(null));
  }, [disputeId]);

  if (!dispute)
    return (
      <EmptyState
        title="Không tìm thấy dispute"
        description="Dữ liệu dispute được lấy trực tiếp từ backend."
      />
    );

  const assign = async () => {
    setDispute(await disputeApi.assign(dispute.disputeId, Number(staffId)));
    setAssignOpen(false);
  };
  const demoTesting = async () => {
    setDispute(await disputeApi.demoTesting(dispute.disputeId, testResult));
    setTestResult("");
  };
  const technicalReport = async () => {
    setDispute(
      await disputeApi.technicalReport(
        dispute.disputeId,
        report.reportContent,
        report.proposedAction,
      ),
    );
    setReportOpen(false);
  };
  const resolve = async () => {
    setDispute(
      await disputeApi.resolve(dispute.disputeId, report.proposedAction),
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="DISPUTE FLOW"
        title={dispute.title || `Dispute #${dispute.disputeId}`}
        description="Single source of truth là acceptance criteria và deliverables trong workspace."
        actions={
          <>
            <Button variant="secondary" onClick={() => setAssignOpen(true)}>
              <Users className="h-4 w-4" />
              Assign staff
            </Button>
            <Button onClick={resolve}>
              <CheckCircle2 className="h-4 w-4" />
              Resolve
            </Button>
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <Card className="p-6">
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={dispute.status} />
            <Badge tone="brand">Contract #{dispute.contractId}</Badge>
            {dispute.milestoneId && (
              <Badge tone="amber">Milestone #{dispute.milestoneId}</Badge>
            )}
          </div>
          <SectionHeading
            title="Bằng chứng và báo cáo"
            description="EvidenceReport trong back-end dùng cho cả bằng chứng, kết quả demo và technical report."
          />
          <div className="mt-5 rounded-3xl bg-slate-50 p-5 text-sm leading-7 text-slate-700">
            {dispute.evidenceReport || "Chưa có báo cáo."}
          </div>
          <div className="mt-5 grid gap-4">
            <Field label="Kết quả demo testing">
              <Textarea
                value={testResult}
                onChange={(event) => setTestResult(event.target.value)}
                placeholder="Ghi nhận môi trường test, AC đạt/không đạt, lỗi tái hiện..."
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={demoTesting}>
                <FileSearch className="h-4 w-4" />
                Lưu demo testing
              </Button>
              <Button onClick={() => setReportOpen(true)}>
                <Send className="h-4 w-4" />
                Technical report
              </Button>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <SectionHeading title="Đề xuất xử lý" />
          <div className="mt-5 rounded-3xl bg-gradient-to-br from-brand-50 to-indigo-50 p-5">
            <p className="text-sm font-bold text-slate-500">Proposed action</p>
            <p className="mt-2 font-display text-xl font-black text-ink">
              {dispute.proposedAction || "Chưa có"}
            </p>
          </div>
          <Notice tone="warning" title="Termination snapshot" className="mt-4">
            Giao diện có chỗ cho Force Payout / Refund / split ratio; back-end
            hiện mới lưu proposedAction dạng text.
          </Notice>
          <div className="mt-5 grid gap-3">
            <Badge tone="slate">Raised by: {dispute.raisedBy || "N/A"}</Badge>
            <Badge tone="mint">
              Assigned:{" "}
              {dispute.staffName ||
                `Staff #${dispute.assignedStaffId || "N/A"}`}
            </Badge>
          </div>
        </Card>
      </div>

      <Modal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        title="Assign dispute"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAssignOpen(false)}>
              Hủy
            </Button>
            <Button onClick={assign}>Gán staff</Button>
          </>
        }
      >
        <Field label="Staff ID">
          <Input
            value={staffId}
            onChange={(event) => setStaffId(event.target.value)}
          />
        </Field>
      </Modal>

      <Modal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        title="Technical report"
        description="Staff ghi báo cáo tiếng Việt có dấu và đề xuất tỷ lệ chia tiền."
        footer={
          <>
            <Button variant="secondary" onClick={() => setReportOpen(false)}>
              Hủy
            </Button>
            <Button onClick={technicalReport}>Gửi report</Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Field label="Nội dung báo cáo">
            <Textarea
              value={report.reportContent}
              onChange={(event) =>
                setReport((value) => ({
                  ...value,
                  reportContent: event.target.value,
                }))
              }
            />
          </Field>
          <Field label="Proposed action">
            <Input
              value={report.proposedAction}
              onChange={(event) =>
                setReport((value) => ({
                  ...value,
                  proposedAction: event.target.value,
                }))
              }
            />
          </Field>
        </div>
      </Modal>

      {!staffMode && (
        <Notice tone="info" title="Luồng người dùng">
          Business/Expert xem trạng thái dispute tại đây. Staff/Admin dùng cùng
          detail nhưng có thêm ngữ cảnh xử lý ticket.
        </Notice>
      )}
    </div>
  );
}

export function VerificationsPage() {
  const [tab, setTab] = useState("business");
  const [businesses, setBusinesses] = useState<BusinessProfile[]>([]);
  const [experts, setExperts] = useState<ExpertProfile[]>([]);

  useEffect(() => {
    profileApi.listBusinesses().then(setBusinesses);
    profileApi.listExperts().then(setExperts);
  }, []);

  const list = tab === "business" ? businesses : experts;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="REG-02 / ADM-01"
        title="Duyệt hồ sơ KYC/KYB"
        description="Admin/Staff xem hồ sơ pending và approve/reject. Back-end có audit log khi duyệt."
      />
      <Card className="p-5">
        <Tabs
          active={tab}
          onChange={setTab}
          tabs={[
            { id: "business", label: "Business KYB", count: businesses.length },
            { id: "expert", label: "Expert KYC", count: experts.length },
          ]}
        />
        <div className="mt-5 grid gap-3">
          {list.map((item) => {
            const isBusiness = tab === "business";
            const title = isBusiness
              ? (item as BusinessProfile).companyName
              : (item as ExpertProfile).fullName ||
                `Expert #${(item as ExpertProfile).expertId}`;
            const status = isBusiness
              ? (item as BusinessProfile).kybStatus
              : (item as ExpertProfile).kycStatus;
            const id = isBusiness
              ? (item as BusinessProfile).businessId
              : (item as ExpertProfile).expertId;
            return (
              <div
                key={id}
                className="flex flex-col gap-4 rounded-3xl border border-slate-100 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={title} />
                  <div>
                    <p className="font-extrabold text-ink">{title}</p>
                    <p className="text-sm text-slate-500">
                      {isBusiness
                        ? (item as BusinessProfile).taxCode
                        : (item as ExpertProfile).nationalId}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={status} />
                  <LinkButton
                    to={`/app/verifications/${tab}/${id}`}
                    variant="secondary"
                    size="sm"
                  >
                    Chi tiết
                  </LinkButton>
                </div>
              </div>
            );
          })}
          {list.length === 0 && (
            <EmptyState
              title="Chưa có hồ sơ"
              description="Không có hồ sơ trong nhóm này."
            />
          )}
        </div>
      </Card>
    </div>
  );
}

export function VerificationDetailPage() {
  const { type, id } = useParams();
  const isBusiness = type === "business";
  const [profile, setProfile] = useState<
    BusinessProfile | ExpertProfile | null
  >(null);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [taxCheckResult, setTaxCheckResult] = useState<{
    provided: Pick<BusinessProfile, "companyName" | "taxCode" | "address">;
    lookup: Pick<TaxCheckResponse, "companyName" | "taxCode" | "address">;
  } | null>(null);
  const [taxCheckLoading, setTaxCheckLoading] = useState(false);
  const [taxCheckError, setTaxCheckError] = useState("");

  useEffect(() => {
    if (isBusiness) {
      setPortfolio(null);
      profileApi
        .listBusinesses()
        .then((items) => {
          setProfile(
            items.find((item) => item.businessId === Number(id)) || null,
          );
        })
        .catch(() => {
          setProfile(null);
        });
    } else {
      Promise.all([profileApi.listExperts(), profileApi.listPortfolios()])
        .then(([items, portfolios]) => {
          const matchedProfile =
            items.find((item) => item.expertId === Number(id)) || null;
          setProfile(matchedProfile);
          setPortfolio(
            portfolios.find((item) => item.expertId === Number(id)) || null,
          );
        })
        .catch(() => {
          setProfile(null);
          setPortfolio(null);
        });
    }
  }, [id, isBusiness]);

  if (!profile)
    return (
      <EmptyState
        title="Không tìm thấy hồ sơ"
        description="Dữ liệu KYC/KYB được lấy trực tiếp từ backend."
      />
    );

  const title = isBusiness
    ? (profile as BusinessProfile).companyName
    : (profile as ExpertProfile).fullName ||
      `Expert #${(profile as ExpertProfile).expertId}`;
  const status = isBusiness
    ? (profile as BusinessProfile).kybStatus
    : (profile as ExpertProfile).kycStatus;
  const profileId = isBusiness
    ? (profile as BusinessProfile).businessId
    : (profile as ExpertProfile).expertId;

  const checkTaxCode = async () => {
    if (!isBusiness) return;
    setTaxCheckLoading(true);
    setTaxCheckError("");
    try {
      const business = profile as BusinessProfile;
      const lookup = await profileApi.checkTaxCode(business.taxCode);
      setTaxCheckResult({
        provided: {
          companyName: business.companyName,
          taxCode: business.taxCode,
          address: business.address,
        },
        lookup: {
          companyName: lookup.companyName,
          taxCode: lookup.taxCode,
          address: lookup.address,
        },
      });
    } catch (error) {
      const apiError = error as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      setTaxCheckResult(null);
      setTaxCheckError(
        apiError.response?.data?.message ||
          apiError.message ||
          "Không thể tra cứu mã số thuế.",
      );
    } finally {
      setTaxCheckLoading(false);
    }
  };

  const approve = async (statusValue: "Approved" | "Rejected") => {
    const updated = await profileApi.approve(
      isBusiness ? "BUSINESS" : "EXPERT",
      profileId,
      statusValue,
    );
    setProfile(updated);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={isBusiness ? "Business KYB" : "Expert KYC"}
        title={title}
        description="Kiểm tra thông tin định danh và ra quyết định duyệt."
        actions={
          <LinkButton to="/app/verifications" variant="secondary">
            ← Danh sách
          </LinkButton>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="p-6">
          <SectionHeading title="Thông tin hồ sơ" />
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {isBusiness ? (
              <>
                <Info
                  label="Tên doanh nghiệp"
                  value={(profile as BusinessProfile).companyName}
                />
                <Info
                  label="Mã số thuế"
                  value={(profile as BusinessProfile).taxCode}
                />
                <Info
                  label="Địa chỉ"
                  value={(profile as BusinessProfile).address || "Chưa có"}
                />
                <FileInfo label="Giấy phép kinh doanh">
                  <FirebaseFileLink
                    path={(profile as BusinessProfile).businessLicenseUrl}
                    emptyText="Chưa có giấy phép"
                    buttonText="Xem giấy phép"
                  />
                </FileInfo>
              </>
            ) : (
              <>
                <Info
                  label="National ID"
                  value={(profile as ExpertProfile).nationalId}
                />
                <FileInfo label="Tệp Portfolio">
                  <FirebaseFileLink
                    path={(profile as ExpertProfile).portfolioUrl}
                    emptyText="Chưa có tệp Portfolio"
                    buttonText="Xem Portfolio"
                  />
                </FileInfo>
                <Info
                  label="Years of experience"
                  value={
                    (profile as ExpertProfile).yearsOfExperience == null
                      ? "Chưa có"
                      : String((profile as ExpertProfile).yearsOfExperience)
                  }
                />
              </>
            )}
          </div>
        </Card>
        <Card className="p-6">
          <SectionHeading title="Quyết định" />
          <div className="mt-5 rounded-3xl bg-slate-50 p-4">
            <p className="text-sm font-bold text-slate-500">Status hiện tại</p>
            <div className="mt-2">
              <StatusBadge status={status} />
            </div>
          </div>
          <div className="mt-5 grid gap-2">
            <Button variant="success" onClick={() => approve("Approved")}>
              <CheckCircle2 className="h-4 w-4" />
              Approve
            </Button>
            <Button variant="danger" onClick={() => approve("Rejected")}>
              <XCircle className="h-4 w-4" />
              Reject
            </Button>
          </div>
          <Notice tone="info" title="Audit trail" className="mt-4">
            Back-end ghi audit log khi duyệt. UI quản trị audit nằm ở module
            Admin.
          </Notice>
        </Card>
        {isBusiness && (
          <Card className="p-6">
            <SectionHeading
              title="Tra cứu mã số thuế"
              description="Đối chiếu dữ liệu doanh nghiệp cung cấp với nguồn tra cứu công khai."
            />
            <Button
              type="button"
              variant="secondary"
              className="mt-5 w-full"
              loading={taxCheckLoading}
              onClick={checkTaxCode}
            >
              <FileSearch className="h-4 w-4" />
              Check mã số thuế
            </Button>
            {taxCheckError && (
              <Notice tone="danger" title={taxCheckError} className="mt-4" />
            )}
            {taxCheckResult && (
              <div className="mt-4 overflow-hidden rounded-3xl border border-slate-100 bg-white">
                <table className="w-full border-collapse">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-xs font-bold uppercase tracking-wide text-slate-400">
                      <th className="w-1/3 px-4 py-3">Thông tin</th>
                      <th className="w-1/3 px-4 py-3">Doanh nghiệp cung cấp</th>
                      <th className="w-1/3 px-4 py-3">Tra cứu theo MST</th>
                    </tr>
                  </thead>
                  <tbody>
                    <TaxCheckRow
                      label="Tên doanh nghiệp"
                      provided={taxCheckResult.provided.companyName}
                      lookup={taxCheckResult.lookup.companyName}
                    />
                    <TaxCheckRow
                      label="Mã số thuế"
                      provided={taxCheckResult.provided.taxCode}
                      lookup={taxCheckResult.lookup.taxCode}
                    />
                    <TaxCheckRow
                      label="Địa chỉ"
                      provided={taxCheckResult.provided.address}
                      lookup={taxCheckResult.lookup.address}
                    />
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-extrabold text-ink">
        {value}
      </p>
    </div>
  );
}

function FileInfo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function TaxCheckRow({
  label,
  provided,
  lookup,
}: {
  label: string;
  provided?: string | null;
  lookup?: string | null;
}) {
  return (
    <tr className="border-t border-slate-100 align-top">
      <th className="px-4 py-4 text-left text-sm font-bold text-slate-500">
        {label}
      </th>
      <td className="px-4 py-4 text-sm font-extrabold text-ink">
        {provided || "Chưa có"}
      </td>
      <td className="px-4 py-4 text-sm font-extrabold text-ink">
        {lookup || "Chưa có"}
      </td>
    </tr>
  );
}

export function NewDisputePage() {
  const [form, setForm] = useState({
    contractId: "",
    milestoneId: "",
    evidenceReport: "",
    proposedAction: "",
  });
  const [created, setCreated] = useState<Dispute | null>(null);
  const [message, setMessage] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const contractId = Number(form.contractId);
    const milestoneId = form.milestoneId ? Number(form.milestoneId) : undefined;
    if (
      !Number.isFinite(contractId) ||
      contractId <= 0 ||
      (milestoneId !== undefined &&
        (!Number.isFinite(milestoneId) || milestoneId <= 0))
    ) {
      setMessage(
        "Contract ID và Milestone ID phải là số dương từ database thật.",
      );
      return;
    }
    setMessage("");
    const dispute = await disputeApi.create({
      contractId,
      milestoneId,
      evidenceReport: form.evidenceReport,
      proposedAction: form.proposedAction,
      status: "Open",
    });
    setCreated(dispute);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="RSK-01"
        title="Tạo tranh chấp"
        description="Dùng khi một bên khiếu nại và cần đóng băng dòng tiền milestone."
      />
      <Card className="p-6">
        <form onSubmit={submit} className="grid gap-4">
          {message && <Notice tone="danger" title={message} />}
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Contract ID">
              <Input
                type="number"
                min={1}
                value={form.contractId}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    contractId: event.target.value,
                  }))
                }
                required
              />
            </Field>
            <Field label="Milestone ID">
              <Input
                type="number"
                min={1}
                value={form.milestoneId}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    milestoneId: event.target.value,
                  }))
                }
              />
            </Field>
          </div>
          <Field label="Bằng chứng / mô tả">
            <Textarea
              value={form.evidenceReport}
              onChange={(event) =>
                setForm((value) => ({
                  ...value,
                  evidenceReport: event.target.value,
                }))
              }
            />
          </Field>
          <Field label="Proposed action ban đầu">
            <Input
              value={form.proposedAction}
              onChange={(event) =>
                setForm((value) => ({
                  ...value,
                  proposedAction: event.target.value,
                }))
              }
            />
          </Field>
          <Button type="submit">
            <Gavel className="h-4 w-4" /> Tạo dispute
          </Button>
        </form>
        {created && (
          <Notice
            tone="success"
            title={`Đã tạo dispute #${created.disputeId}`}
            className="mt-4"
          />
        )}
      </Card>
    </div>
  );
}

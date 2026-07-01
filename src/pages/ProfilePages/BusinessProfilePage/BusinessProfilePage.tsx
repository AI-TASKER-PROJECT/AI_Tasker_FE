import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Edit3, MapPin, Save, ShieldCheck } from "lucide-react";
import { profileApi } from "../../../lib/api";
import { getSession, saveSession } from "../../../lib/session";
import { FirebaseFileLink } from "../../../components/FirebaseFileLink";
import { Avatar, Badge, Button, Card, EmptyState, Field, Input, Modal, Notice, SectionHeading, StatusBadge, Tabs } from "../../../components/ui";
import type { Job } from "../../../types";
import { normalizeAccountStatus, ProfileRow, readApiError } from "../ProfilePages.shared";

export function BusinessProfilePage() {
  const [form, setForm] = useState({
    taxCode: "",
    companyName: "",
    address: "",
    businessLicenseUrl: "",
  });
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [status, setStatus] = useState("Chưa gửi");
  const [rejectionReason, setRejectionReason] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const session = getSession();

  const isOwner = session?.role === "BUSINESS";

  useEffect(() => {
    profileApi //api Business profile
      .getMyBusiness() //lấy info business
      .then((profile) => {
        setForm({
          taxCode: profile.taxCode || "",
          companyName: profile.companyName || "",
          address: profile.address || "",
          businessLicenseUrl: profile.businessLicenseUrl || "",
        });
        setStatus(profile.kybStatus || "Chưa gửi");
        setRejectionReason(profile.rejectionReason || "");
      })
      .catch(() => undefined);
    profileApi
      .getMyBusiness()
      .then((profile) =>
        profileApi.listBusinessJobs(profile.businessId).catch(() => []),
      )
      .then((items) => setJobs(items || []))
      .catch(() => setJobs([]));
  }, []);

  const submit = (event: FormEvent) => {
    //khi submit
    event.preventDefault();
    if (status?.toLowerCase() === "approved") {
      setConfirmModalOpen(true);
      return;
    }
    executeSubmit();
  };

  const executeSubmit = async () => {
    setConfirmModalOpen(false);
    setIsEditing(false);
    setLoading(true);
    setMessage("");
    setError("");
    try {
      let businessLicenseUrl = form.businessLicenseUrl;
      if (licenseFile) {
        businessLicenseUrl =
          await profileApi.uploadBusinessLicense(licenseFile); //upload lên firebase trước để lấy URL
      }
      const profile = await profileApi.upsertBusiness({
        //lưu daata
        ...form,
        businessLicenseUrl,
      });
      setForm({
        taxCode: profile.taxCode || "",
        companyName: profile.companyName || "",
        address: profile.address || "",
        businessLicenseUrl: profile.businessLicenseUrl || "",
      });
      setStatus(profile.kybStatus);
      setRejectionReason(profile.rejectionReason || "");
      setMessage("Đã lưu hồ sơ doanh nghiệp.");
      const session = getSession();
      if (session) {
        saveSession({
          //cập nhật session
          ...session,
          accountStatus: normalizeAccountStatus(profile.kybStatus), //cập nhật status
        });
      }
    } catch (submitError) {
      setError(readApiError(submitError, "Không thể lưu hồ sơ doanh nghiệp."));
    } finally {
      setLoading(false);
    }
  };

  const isApproved = status?.toLowerCase() === "approved";

  const canEdit = isOwner;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-slate-100">
        <div className="bg-[radial-gradient(circle_at_top_left,#e0f2fe,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eff6ff_55%,#f5f7ff_100%)] p-6 md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-5 md:flex-row md:items-center">
              <Avatar name={form.companyName || "Doanh nghiệp"} size="xl" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                  Trang cá nhân doanh nghiệp
                </p>
                <h1 className="mt-2 text-3xl font-black text-ink md:text-4xl">
                  {form.companyName || "Doanh nghiệp chưa cập nhật tên"}
                </h1>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                  <span className="inline-flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {form.taxCode || "Chưa có mã số thuế"}
                  </span>
                  <span className="hidden h-4 w-px bg-slate-200 sm:inline-block" />
                  <span className="inline-flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {form.address || "Chưa có dịa chỉ"}
                  </span>
                  <span className="hidden h-4 w-px bg-slate-200 sm:inline-block" />
                  <span className="inline-flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    <StatusBadge status={status} />
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" type="button" className="min-w-40">
                Theo dõi công ty
              </Button>
              {canEdit && (
                <Button type="button" onClick={() => setActiveTab("edit")}>
                  <Edit3 className="h-4 w-4" />
                  Chỉnh sửa
                </Button>
              )}
            </div>
          </div>
          <div className="mt-6">
            <Tabs
              tabs={[
                { id: "overview", label: "Trang chủ" },
                { id: "projects", label: "Dự án", count: jobs.length },
                ...(canEdit ? [{ id: "edit", label: "Chỉnh sửa" }] : []),
              ]}
              active={activeTab}
              onChange={setActiveTab}
            />
          </div>
        </div>
      </Card>

      {activeTab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Card className="p-6">
            <SectionHeading
              title="Giới thiệu công ty"
              description="Thông tin hiển thị từ hồ sơ KYB."
            />
            <div className="mt-5 space-y-4 text-sm leading-7 text-slate-600">
              <p>
                <strong className="text-ink">
                  {form.companyName || "Doanh nghiệp"}
                </strong>{" "}
                đang sử dụng hồ sơ xác minh để đăng tải dự án và làm việc với
                chuyên gia.
              </p>
              {rejectionReason && status === "Rejected" && (
                <Notice tone="danger" title="Lý do từ chối">
                  <ul className="list-disc ml-5 mt-1 space-y-1">
                    {rejectionReason.split(";").map((reason, index) => {
                      const trimmedReason = reason.trim();
                      return trimmedReason ? (
                        <li key={index}>{trimmedReason}</li>
                      ) : null;
                    })}
                  </ul>
                </Notice>
              )}
            </div>
          </Card>
          <Card className="p-6">
            <SectionHeading title="Thông tin chung" />
            <div className="mt-5 space-y-4">
              <ProfileRow
                label="Mã số thuế"
                value={form.taxCode || "Chưa cập nhật"}
              />
              <ProfileRow
                label="Địa chỉ"
                value={form.address || "Chưa cập nhật"}
              />
              <ProfileRow
                label="Trạng thái KYB"
                value={<StatusBadge status={status} />}
              />
            </div>
          </Card>
        </div>
      )}

      {activeTab === "projects" && (
        <Card className="p-6">
          <SectionHeading
            title="Dự án đã public"
            description="Danh sách job doanh nghiệp đã đăng công khai."
          />
          <div className="mt-5 grid gap-4">
            {jobs.length ? (
              jobs.map((job) => (
                <Link
                  key={job.jobId}
                  to={`/jobs/${job.jobId}`}
                  className="rounded-3xl border border-slate-100 bg-slate-50 p-5 transition hover:border-brand-200 hover:bg-white hover:shadow-soft"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-lg font-extrabold text-ink">
                        {job.title}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                        {job.rawRequirements || "Chưa có mô tả."}
                      </p>
                    </div>
                    <Badge tone="mint">{job.status}</Badge>
                  </div>
                </Link>
              ))
            ) : (
              <EmptyState
                title="Chưa có dự án public"
                description="Khi doanh nghiệp đăng job, chúng sẽ xuất hiện ở đây."
              />
            )}
          </div>
        </Card>
      )}

      {activeTab === "edit" && canEdit && (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Card className="p-6">
            <form onSubmit={submit} className="grid gap-4">
              {message && <Notice tone="success" title={message} />}
              {error && <Notice tone="danger" title={error} />}
              <Field label="Mã số thuế">
                <Input
                  value={form.taxCode}
                  onChange={(event) =>
                    setForm((value) => ({
                      ...value,
                      taxCode: event.target.value,
                    }))
                  }
                  required
                />
              </Field>
              <Field label="Tên doanh nghiệp">
                <Input
                  value={form.companyName}
                  onChange={(event) =>
                    setForm((value) => ({
                      ...value,
                      companyName: event.target.value,
                    }))
                  }
                  required
                />
              </Field>
              <Field label="Địa chỉ">
                <Input
                  value={form.address}
                  onChange={(event) =>
                    setForm((value) => ({
                      ...value,
                      address: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field
                label="Tệp giấy phép kinh doanh"
                hint="Chọn ảnh, PDF hoặc DOC/DOCX để thay file hiện tại."
              >
                <Input
                  type="file"
                  accept="image/png,image/jpeg,application/pdf,.doc,.docx"
                  onChange={(event) =>
                    setLicenseFile(event.target.files?.[0] || null)
                  }
                />
                <FirebaseFileLink
                  path={form.businessLicenseUrl}
                  emptyText="Chưa có giấy phép"
                  buttonText="Xem giấy phép"
                  className="mt-3"
                  showPath={false}
                />
              </Field>
              <div className="flex justify-end">
                {isApproved && !isEditing ? (
                  <Button type="button" onClick={() => setIsEditing(true)}>
                    <Edit3 className="h-4 w-4" />
                    Chỉnh sửa
                  </Button>
                ) : (
                  <Button type="submit" loading={loading}>
                    <Save className="h-4 w-4" />
                    Lưu hồ sơ
                  </Button>
                )}
              </div>
            </form>
          </Card>
          <Card className="p-6">
            <SectionHeading title="Trạng thái KYB" />
            <div className="mt-5 flex items-center gap-3 rounded-3xl bg-brand-50 p-4">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-brand-600 shadow-sm">
                <Building2 className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-slate-500">
                  Hồ sơ hiện tại
                </p>
                <div className="mt-1">
                  <StatusBadge status={status} />
                </div>
              </div>
            </div>
            {rejectionReason && status === "Rejected" && (
              <div className="mt-4">
                <Notice tone="danger" title="Lý do từ chối">
                  <ul className="list-disc ml-5 mt-1 space-y-1">
                    {rejectionReason.split(";").map((reason, index) => {
                      const trimmedReason = reason.trim();
                      return trimmedReason ? (
                        <li key={index}>{trimmedReason}</li>
                      ) : null;
                    })}
                  </ul>
                </Notice>
              </div>
            )}
          </Card>
        </div>
      )}
      <Modal
        open={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title="Xác nhận chỉnh sửa"
        description="Tài khoản sẽ trở về trạng thái Pending. Xác nhận chỉnh sửa?"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setConfirmModalOpen(false)}
            >
              Hủy
            </Button>
            <Button onClick={executeSubmit} loading={loading}>
              Xác nhận
            </Button>
          </>
        }
      >
        {null}
      </Modal>
    </div>
  );
}

//Định danh chuyên gia

import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, MapPin, Save, ShieldCheck, Star } from "lucide-react";
import { profileApi } from "../../../lib/api";
import { getSession, saveSession } from "../../../lib/session";
import { FirebaseFileLink } from "../../../components/FirebaseFileLink";
import { Avatar, Button, Card, EmptyState, Field, Input, Modal, Notice, SectionHeading, StatusBadge, Tabs } from "../../../components/ui";
import type { Job } from "../../../types";
import { normalizeAccountStatus, ProfileFilePicker, ProfileRow, readApiError, translateVerificationStatus } from "../ProfilePages.shared";

export function BusinessProfilePage() {
  const [form, setForm] = useState({
    taxCode: "",
    companyName: "",
    address: "",
    businessLicenseUrl: "",
  });
  const [savedForm, setSavedForm] = useState({
    taxCode: "",
    companyName: "",
    address: "",
    businessLicenseUrl: "",
  });
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [averageRating, setAverageRating] = useState<number | undefined>();
  const [status, setStatus] = useState("Chưa gửi");
  const [rejectionReason, setRejectionReason] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeTab, setActiveTab] = useState("edit");
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const session = getSession();

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
        setSavedForm({
          taxCode: profile.taxCode || "",
          companyName: profile.companyName || "",
          address: profile.address || "",
          businessLicenseUrl: profile.businessLicenseUrl || "",
        });
        const profileStatus = profile.kybStatus || session?.accountStatus || "Chưa gửi";
        setStatus(profileStatus);
        setAverageRating(profile.averageRating);
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
  }, [session?.accountStatus]);

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
      setSavedForm({
        taxCode: profile.taxCode || "",
        companyName: profile.companyName || "",
        address: profile.address || "",
        businessLicenseUrl: profile.businessLicenseUrl || "",
      });
      setStatus(profile.kybStatus);
      setAverageRating(profile.averageRating);
      setRejectionReason(profile.rejectionReason || "");
      setMessage(
        isApproved
          ? "Đã nộp lại hồ sơ. Hồ sơ đang chờ nhân viên duyệt lại."
          : "Đã gửi hồ sơ doanh nghiệp.",
      );
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
  const hasAverageRating = averageRating != null && Number(averageRating) > 0;

  const canEdit = true;
  const normalizedStatus = status.trim().toLowerCase();
  const isPendingOrIncomplete =
    normalizedStatus === "pending" ||
    normalizedStatus === "chưa gửi" ||
    normalizedStatus === "chÆ°a gá»­i";
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
                  <span className={form.taxCode ? "inline-flex items-center gap-2" : "hidden"}>
                    <Building2 className="h-4 w-4" />
                    {form.taxCode || "Chưa cập nhật"}
                  </span>
                  <span className="hidden h-4 w-px bg-slate-200 sm:inline-block" />
                  <span className={form.address ? "inline-flex items-center gap-2" : "hidden"}>
                    <MapPin className="h-4 w-4" />
                    {form.address || "Chưa có dịa chỉ"}
                  </span>
                  <span className="hidden h-4 w-px bg-slate-200 sm:inline-block" />
                  <span className="inline-flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    <StatusBadge status={translateVerificationStatus(status)} />
                  </span>
                  <span className="hidden h-4 w-px bg-slate-200 sm:inline-block" />
                  <span className={hasAverageRating ? "inline-flex items-center gap-1.5 font-bold text-amber-600" : "hidden"}>
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    {averageRating != null && Number(averageRating) > 0
                      ? `${Number(averageRating).toFixed(1)}/5`
                      : "Chưa có đánh giá"}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
            </div>
          </div>
          <div className="mt-6">
            <Tabs
              tabs={[
                ...(jobs.length ? [{ id: "projects", label: "Dự án" }] : []),
                ...(canEdit ? [{ id: "edit", label: "Cập nhật" }] : []),
              ]}
              active={activeTab}
              onChange={setActiveTab}
            />
          </div>
        </div>
      </Card>

      {activeTab === "projects" && (
        <Card className="p-6">
          <SectionHeading
            title="Dự án đã public"
              description="Danh sách dự án doanh nghiệp đã đăng công khai."
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
                        <StatusBadge status={job.status} />
                  </div>
                </Link>
              ))
            ) : (
              <EmptyState
                title="Chưa có dự án public"
              description="Khi doanh nghiệp đăng dự án, chúng sẽ xuất hiện ở đây."
              />
            )}
          </div>
        </Card>
      )}

      {activeTab === "edit" && canEdit && (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Card className="p-6">
            <SectionHeading
              title={isPendingOrIncomplete ? "Xác thực doanh nghiệp" : "Cập nhật địa chỉ và giấy phép"}
              description="Chỉ có thể thay đổi địa chỉ và giấy phép kinh doanh."
            />
            <form onSubmit={submit} className="grid gap-4">
              {message && <Notice tone="success" title={message} />}
              {error && <Notice tone="danger" title={error} />}
              <Field label="Mã số thuế">
                <Input
                  value={form.taxCode}
                  readOnly
                  required
                />
              </Field>
              <Field label="Tên doanh nghiệp">
                <Input
                  value={form.companyName}
                  readOnly
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
                hint="Tệp giấy phép kinh doanh trong hồ sơ KYB. Chọn ảnh, PDF hoặc DOC/DOCX để thay file hiện tại."
              >
                <ProfileFilePicker
                  file={licenseFile}
                  onChange={setLicenseFile}
                  buttonText="Chọn giấy phép"
                  emptyText={
                    form.businessLicenseUrl
                      ? "Đã có giấy phép kinh doanh. Chọn tệp mới nếu muốn thay đổi."
                      : "Chưa chọn giấy phép kinh doanh"
                  }
                />
                <p className="mt-2 text-xs font-semibold text-slate-500">
                  Nộp kèm giấy phép kinh doanh để nhân viên đối chiếu thông tin doanh nghiệp.
                </p>
              </Field>
              <div className="flex justify-end">
                {isApproved ? (
                  <Button type="submit" loading={loading}>
                    <Save className="h-4 w-4" />
                    Cập nhật thông tin
                  </Button>
                ) : (
                  <Button type="submit" loading={loading}>
                    <Save className="h-4 w-4" />
                    Nộp xác thực doanh nghiệp
                  </Button>
                )}
              </div>
            </form>
          </Card>
          <div className="space-y-6">
          <Card className="p-6">
            <SectionHeading title="Thông tin hiện tại" description="Thông tin đã lưu trước khi cập nhật." />
            <div className="mt-5 space-y-4">
              <ProfileRow label="Mã số thuế" value={savedForm.taxCode || "Chưa cập nhật"} />
              <ProfileRow label="Tên doanh nghiệp" value={savedForm.companyName || "Chưa cập nhật"} />
              <ProfileRow label="Địa chỉ" value={savedForm.address || "Chưa cập nhật"} />
              <ProfileRow label="Giấy phép kinh doanh" value={<FirebaseFileLink path={savedForm.businessLicenseUrl} emptyText="Chưa có giấy phép" buttonText="Xem giấy phép" showPath={false} />} />
            </div>
          </Card>
          <Card className="p-6">
            <SectionHeading title="Trạng thái xác thực" />
            <div className="mt-5 flex items-center gap-3 rounded-3xl bg-brand-50 p-4">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-brand-600 shadow-sm">
                <Building2 className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-slate-500">
                  Hồ sơ hiện tại
                </p>
                <div className="mt-1">
                  <StatusBadge status={translateVerificationStatus(status)} />
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
        </div>
      )}
      <Modal
        open={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title="Xác nhận chỉnh sửa"
        description="Xác nhận cập nhật thông tin hồ sơ đã được duyệt?"
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

import { type FormEvent, useEffect, useState } from "react";
import { Building2, Save } from "lucide-react";
import { profileApi } from "../../../lib/api";
import { getSession, saveSession } from "../../../lib/session";
import { FirebaseFileLink } from "../../../components/FirebaseFileLink";
import { Button, Card, Field, Input, Notice, PageHeader, SectionHeading, StatusBadge } from "../../../components/ui";
import { accountStatus } from "../VerificationProfilePages.shared";

export function BusinessVerificationProfilePage() {
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
  const [taxCodeError, setTaxCodeError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    profileApi
      .getMyBusiness()
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
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    let hasError = false;
    if (!/^\d{10}(-\d{3})?$/.test(form.taxCode)) {
      setTaxCodeError("Mã số thuế không hợp lệ (phải gồm 10 hoặc 13 chữ số).");
      hasError = true;
    } else {
      setTaxCodeError("");
    }

    if (hasError) return;

    setLoading(true);
    setMessage("");
    setError("");
    try {
      const businessLicenseUrl = licenseFile
        ? await profileApi.uploadBusinessLicense(licenseFile)
        : form.businessLicenseUrl;
      const profile = await profileApi.upsertBusiness({
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
      const session = getSession();
      if (session)
        saveSession({
          ...session,
          accountStatus: accountStatus(profile.kybStatus),
        });
      setMessage(
        "Đã lưu hồ sơ doanh nghiệp. Vui lòng chờ nhân viên xét duyệt hồ sơ",
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Không thể lưu hồ sơ doanh nghiệp.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hồ sơ xác minh doanh nghiệp"
        description="Doanh nghiệp nộp mã số thuế và giấy phép kinh doanh để được xét duyệt."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="p-6">
          <form onSubmit={submit} className="grid gap-4">
            {message && <Notice tone="success" title={message} />}
            {error && <Notice tone="danger" title={error} />}
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Mã số thuế">
                <Input
                  placeholder="Ví dụ: 0101234567"
                  value={form.taxCode}
                  disabled={status === "Approved"}
                  onChange={(e) => {
                    setForm((v) => ({ ...v, taxCode: e.target.value }));
                    if (taxCodeError) setTaxCodeError("");
                  }}
                  onBlur={(e) => {
                    if (!/^\d{10}(-\d{3})?$/.test(e.target.value)) {
                      setTaxCodeError(
                        "Mã số thuế không hợp lệ (phải gồm 10 hoặc 13 chữ số).",
                      );
                    }
                  }}
                  required
                />
                {taxCodeError && (
                  <span className="text-xs text-red-500 mt-1 block">
                    {taxCodeError}
                  </span>
                )}
              </Field>
              <Field label="Tên doanh nghiệp">
                <Input
                  placeholder="Ví dụ: Công ty TNHH AI Tasker"
                  value={form.companyName}
                  onChange={(e) =>
                    setForm((v) => ({ ...v, companyName: e.target.value }))
                  }
                  required
                />
              </Field>
            </div>
            <Field label="Địa chỉ">
              <Input
                placeholder="Ví dụ: 123 Đường Cầu Giấy, Hà Nội"
                value={form.address}
                onChange={(e) =>
                  setForm((v) => ({ ...v, address: e.target.value }))
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
                onChange={(e) => setLicenseFile(e.target.files?.[0] || null)}
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
              <Button type="submit" loading={loading}>
                <Save className="h-4 w-4" />
                Lưu hồ sơ
              </Button>
            </div>
          </form>
        </Card>
        <Card className="p-6">
          <SectionHeading title="Trạng thái KYB" />
          <div className={`mt-5 flex items-center gap-3 rounded-3xl p-4 ${status === "Pending" ? "bg-amber-50" : status === "Approved" ? "bg-green-50" : "bg-brand-50"}`}>
            <span className={`grid h-12 w-12 place-items-center rounded-2xl bg-white ${status === "Pending" ? "text-amber-600" : status === "Approved" ? "text-green-600" : "text-brand-600"}`}>
              <Building2 className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-slate-500">Hồ sơ hiện tại</p>
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
    </div>
  );
}

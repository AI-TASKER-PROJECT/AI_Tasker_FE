import { type FormEvent, useEffect, useState } from "react";
import { Building2, FileSearch, Save, ShieldCheck } from "lucide-react";
import { profileApi } from "../../../lib/api";
import { getSession, saveSession } from "../../../lib/session";
import { FirebaseFileLink } from "../../../components/FirebaseFileLink";
import {
  Button,
  Card,
  Field,
  Input,
  Notice,
  PageHeader,
  SectionHeading,
  StatusBadge,
} from "../../../components/ui";
import type { TaxCheckResponse } from "../../../types";
import { accountStatus } from "../VerificationProfilePages.shared";

const taxCodePattern = /^\d{10}$|^\d{13}$/;
const taxVerifySuccessMessage = "Đã xác minh được mã số thuế của doanh nghiệp";
const taxVerifyFailedMessage = "Không xác minh được mã số thuế";
const duplicateTaxCodeMessage = "Mã số thuế đã tồn tại trong hệ thống";
const submitSuccessMessage =
  "Đã gửi hồ sơ thành công. Hãy đợi nhân viên duyệt để mở khóa chức năng cho tài khoản.";

function isDuplicateTaxCodeError(cause: unknown) {
  const message = cause instanceof Error ? cause.message : String(cause || "");
  const normalized = message
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  return (
    normalized.includes("MA SO THUE DA DUOC SU DUNG") ||
    normalized.includes("MA SO THUE DA TON TAI") ||
    (normalized.includes("TAX CODE") && normalized.includes("USED"))
  );
}

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
  const [taxPreview, setTaxPreview] = useState<TaxCheckResponse | null>(null);
  const [taxPreviewLoading, setTaxPreviewLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  const clearVerifiedInfo = () => {
    setTaxPreview(null);
    setForm((value) => ({
      ...value,
      companyName: "",
      address: "",
    }));
  };

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
        setTaxPreview({
          taxCode: profile.taxCode || "",
          companyName: profile.companyName || "",
          address: profile.address || "",
          representative: profile.verifiedRepresentative || "",
          status: profile.taxCode ? "FOUND" : undefined,
        });
        setStatus(profile.kybStatus || "Chưa gửi");
        setRejectionReason(profile.rejectionReason || "");
      })
      .catch(() => undefined);
  }, []);

  const previewTaxCode = async () => {
    if (!taxCodePattern.test(form.taxCode)) {
      setTaxCodeError("Mã số thuế phải gồm đúng 10 hoặc 13 chữ số liền nhau.");
      clearVerifiedInfo();
      return;
    }

    setTaxPreviewLoading(true);
    setTaxCodeError("");
    setError("");
    setMessage("");
    try {
      const lookup = await profileApi.checkTaxCode(form.taxCode);
      setTaxPreview(lookup);
      setForm((value) => ({
        ...value,
        companyName: lookup.companyName || "",
        address: lookup.address || "",
      }));
      setMessage(taxVerifySuccessMessage);
    } catch {
      clearVerifiedInfo();
      setError(taxVerifyFailedMessage);
    } finally {
      setTaxPreviewLoading(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    if (!taxCodePattern.test(form.taxCode)) {
      setTaxCodeError("Mã số thuế phải gồm đúng 10 hoặc 13 chữ số liền nhau.");
      clearVerifiedInfo();
      return;
    }

    setLoading(true);
    setMessage("");
    setError("");
    try {
      const businessLicenseUrl = licenseFile
        ? await profileApi.uploadBusinessLicense(licenseFile)
        : form.businessLicenseUrl;
      const profile = await profileApi.upsertBusiness({
        taxCode: form.taxCode,
        businessLicenseUrl,
      });
      setForm({
        taxCode: profile.taxCode || "",
        companyName: profile.companyName || "",
        address: profile.address || "",
        businessLicenseUrl: profile.businessLicenseUrl || "",
      });
      setTaxPreview({
        taxCode: profile.taxCode || "",
        companyName: profile.companyName || "",
        address: profile.address || "",
        representative: profile.verifiedRepresentative || "",
        status: "FOUND",
      });
      setStatus(profile.kybStatus);
      setRejectionReason(profile.rejectionReason || "");
      setLicenseFile(null);
      const session = getSession();
      if (session) {
        saveSession({
          ...session,
          accountStatus: accountStatus(profile.kybStatus),
        });
      }
      setMessage(submitSuccessMessage);
    } catch (cause) {
      clearVerifiedInfo();
      setError(
        isDuplicateTaxCodeError(cause)
          ? duplicateTaxCodeMessage
          : taxVerifyFailedMessage,
      );
    } finally {
      setLoading(false);
    }
  };

  const verifiedCompanyName = taxPreview?.companyName || form.companyName;
  const verifiedAddress = taxPreview?.address || form.address;
  const isApproved = status === "Approved";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hồ sơ xác minh doanh nghiệp"
        description="Nhập mã số thuế và tải giấy phép kinh doanh. Tên, địa chỉ và người đại diện được lấy từ nguồn xác minh VietQR."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="p-6">
          <form onSubmit={submit} className="grid gap-4">
            {message && <Notice tone="success" title={message} />}
            {error && <Notice tone="danger" title={error} />}

            <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
              <Field label="Mã số thuế" error={taxCodeError}>
                <Input
                  placeholder="Ví dụ: 0101234567"
                  value={form.taxCode}
                  disabled={isApproved}
                  inputMode="numeric"
                  onChange={(event) => {
                    const value = event.target.value.replace(/\D/g, "");
                    setForm((current) => ({
                      ...current,
                      taxCode: value,
                      companyName: "",
                      address: "",
                    }));
                    setTaxPreview(null);
                    setMessage("");
                    setError("");
                    if (taxCodeError) setTaxCodeError("");
                  }}
                  required
                />
              </Field>
              <Button
                type="button"
                variant="secondary"
                loading={taxPreviewLoading}
                onClick={previewTaxCode}
                disabled={isApproved}
              >
                <FileSearch className="h-4 w-4" />
                Tra cứu
              </Button>
            </div>

            <div className="rounded-3xl border border-mint-100 bg-mint-50/70 p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-mint-600">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-extrabold text-ink">
                    Thông tin tra cứu doanh nghiệp từ mã số thuế
                  </p>
                  <div className="mt-3 grid gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase text-slate-400">
                        Tên doanh nghiệp
                      </p>
                      <p className="mt-1 break-words text-sm font-bold text-slate-800">
                        {verifiedCompanyName || "Chưa tra cứu"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase text-slate-400">
                        Địa chỉ
                      </p>
                      <p className="mt-1 break-words text-sm font-bold text-slate-800">
                        {verifiedAddress || "Chưa tra cứu"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

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
              <Button type="submit" loading={loading}>
                <Save className="h-4 w-4" />
                Gửi hồ sơ
              </Button>
            </div>
          </form>
        </Card>

        <Card className="p-6">
          <SectionHeading title="Trạng thái KYB" />
          <div
            className={`mt-5 flex items-center gap-3 rounded-3xl p-4 ${
              status === "Pending"
                ? "bg-amber-50"
                : status === "Approved"
                  ? "bg-green-50"
                  : "bg-brand-50"
            }`}
          >
            <span
              className={`grid h-12 w-12 place-items-center rounded-2xl bg-white ${
                status === "Pending"
                  ? "text-amber-600"
                  : status === "Approved"
                    ? "text-green-600"
                    : "text-brand-600"
              }`}
            >
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
                <ul className="ml-5 mt-1 list-disc space-y-1">
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

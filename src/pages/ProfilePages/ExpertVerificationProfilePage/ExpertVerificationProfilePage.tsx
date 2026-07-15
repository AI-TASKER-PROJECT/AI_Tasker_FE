import { type FormEvent, useEffect, useState } from "react";
import { IdCard, ShieldCheck } from "lucide-react";
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
import {
  ProfileFilePicker,
  translateVerificationStatus,
} from "../ProfilePages.shared";
import { accountStatus } from "../VerificationProfilePages.shared";

// Chức năng 1: Hiển thị và xử lý form định danh chuyên gia.
export function ExpertVerificationProfilePage() {
  const [form, setForm] = useState({
    nationalId: "",
    portfolioUrl: "",
    yearsOfExperience: "1",
  });
  const [portfolioFile, setPortfolioFile] = useState<File | null>(null);
  const [status, setStatus] = useState("Chưa gửi");
  const [rejectionReason, setRejectionReason] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [nationalIdError, setNationalIdError] = useState("");
  const [portfolioError, setPortfolioError] = useState("");
  const [yearsError, setYearsError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    profileApi
      .getMyExpert()
      .then((profile) => {
        setForm({
          nationalId: profile.nationalId || "",
          portfolioUrl: profile.portfolioUrl || "",
          yearsOfExperience: String(profile.yearsOfExperience ?? 1),
        });
        setStatus(profile.kycStatus || "Chưa gửi");
        setRejectionReason(profile.rejectionReason || "");
      })
      .catch(() => undefined);
  }, []);

  // Chức năng 2: Validate dữ liệu, upload portfolio và gửi hồ sơ định danh chuyên gia.
  const submit = async (event: FormEvent) => {
    event.preventDefault();

    let hasError = false;
    if (!form.nationalId.trim()) {
      setNationalIdError("Vui lòng nhập số CCCD/CMND.");
      hasError = true;
    } else if (!/^(\d{9}|\d{12})$/.test(form.nationalId)) {
      setNationalIdError("Số CCCD/CMND không hợp lệ (phải gồm 9 hoặc 12 chữ số).");
      hasError = true;
    } else {
      setNationalIdError("");
    }

    if (!portfolioFile && !form.portfolioUrl) {
      setPortfolioError("Vui lòng chọn tệp Portfolio trước khi nộp hồ sơ KYC.");
      hasError = true;
    } else {
      setPortfolioError("");
    }

    const years = Number(form.yearsOfExperience);
    if (!form.yearsOfExperience.trim()) {
      setYearsError("Vui lòng nhập số năm kinh nghiệm.");
      hasError = true;
    } else if (isNaN(years) || years <= 0 || years >= 100) {
      setYearsError("Số năm kinh nghiệm phải lớn hơn 0 và nhỏ hơn 100.");
      hasError = true;
    } else {
      setYearsError("");
    }

    if (hasError) return;

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const portfolioUrl = portfolioFile
        ? await profileApi.uploadExpertPortfolio(portfolioFile)
        : form.portfolioUrl;
      const profile = await profileApi.upsertExpert({
        nationalId: form.nationalId,
        portfolioUrl,
        yearsOfExperience: Number(form.yearsOfExperience),
      });
      setForm({
        nationalId: profile.nationalId || "",
        portfolioUrl: profile.portfolioUrl || "",
        yearsOfExperience: String(profile.yearsOfExperience ?? 1),
      });
      setStatus(profile.kycStatus);
      setRejectionReason(profile.rejectionReason || "");
      const session = getSession();
      if (session)
        saveSession({
          ...session,
          accountStatus: accountStatus(profile.kycStatus),
        });
      setMessage("Đã lưu hồ sơ chuyên gia.");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Không thể lưu hồ sơ chuyên gia.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hồ sơ xác minh chuyên gia"
        description="Chuyên gia nộp CCCD/CMND và tệp portfolio để được xét duyệt."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="p-6">
          <form onSubmit={submit} className="grid gap-4" noValidate>
            {message && <Notice tone="success" title={message} />}
            {error && <Notice tone="danger" title={error} />}
            <Field label="Số CCCD/CMND">
              <Input
                placeholder="Nhập 9 hoặc 12 chữ số"
                value={form.nationalId}
                disabled={status === "Approved"}
                onChange={(e) => {
                  setForm((v) => ({ ...v, nationalId: e.target.value }));
                  if (nationalIdError) setNationalIdError("");
                }}
                onBlur={(e) => {
                  if (!e.target.value.trim()) {
                    setNationalIdError("Vui lòng nhập số CCCD/CMND.");
                  } else if (!/^(\d{9}|\d{12})$/.test(e.target.value)) {
                    setNationalIdError("Số CCCD/CMND không hợp lệ (phải gồm 9 hoặc 12 chữ số).");
                  }
                }}
                required
              />
              {nationalIdError && (
                <span className="text-xs text-red-500 mt-1 block">
                  {nationalIdError}
                </span>
              )}
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Tệp Portfolio">
                <ProfileFilePicker
                  file={portfolioFile}
                  onChange={(file) => {
                    setPortfolioFile(file);
                    if (file || form.portfolioUrl) setPortfolioError("");
                  }}
                  buttonText="Chọn Portfolio"
                  emptyText="Chưa chọn tệp Portfolio"
                  required={!form.portfolioUrl}
                />
                {portfolioError && (
                  <span className="mt-1 block text-xs text-red-500">
                    {portfolioError}
                  </span>
                )}

                <FirebaseFileLink
                  path={form.portfolioUrl}
                  emptyText="Chọn ảnh, PDF hoặc DOC/DOCX"
                  buttonText="Xem Portfolio"
                  className="mt-3"
                  showPath={false}
                />
              </Field>
              <Field label="Số năm kinh nghiệm">
                <Input
                  type="number"
                  placeholder="Ví dụ: 3"
                  value={form.yearsOfExperience}
                  onChange={(e) => {
                    setForm((v) => ({
                      ...v,
                      yearsOfExperience: e.target.value,
                    }));
                    if (yearsError) setYearsError("");
                  }}
                  onBlur={(e) => {
                    const years = Number(e.target.value);
                    if (!e.target.value.trim()) {
                      setYearsError("Vui lòng nhập số năm kinh nghiệm.");
                    } else if (isNaN(years) || years <= 0 || years >= 100) {
                      setYearsError("Số năm kinh nghiệm phải lớn hơn 0 và nhỏ hơn 100.");
                    }
                  }}
                  required
                />
                {yearsError && (
                  <span className="text-xs text-red-500 mt-1 block">
                    {yearsError}
                  </span>
                )}
              </Field>
            </div>
            <div className="flex justify-end">
              <Button type="submit" loading={loading}>
                <ShieldCheck className="h-4 w-4" />
                Nộp hồ sơ KYC
              </Button>
            </div>
          </form>
        </Card>
        <Card className="p-6">
          <SectionHeading title="Trạng thái KYC" />
          <div
            className={`mt-5 flex items-center gap-3 rounded-3xl p-4 ${status === "Pending" ? "bg-amber-50" : status === "Approved" ? "bg-green-50" : "bg-mint-50"}`}
          >
            <span
              className={`grid h-12 w-12 place-items-center rounded-2xl bg-white ${status === "Pending" ? "text-amber-600" : status === "Approved" ? "text-green-600" : "text-mint-600"}`}
            >
              <IdCard className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-slate-500">Hồ sơ hiện tại</p>
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
  );
}

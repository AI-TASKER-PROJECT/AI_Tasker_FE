import { CheckCircle2, FileSearch, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { profileApi } from "../../../lib/api";
import type { BusinessProfile, ExpertProfile, TaxCheckResponse } from "../../../types";
import { FirebaseFileLink } from "../../../components/FirebaseFileLink";
import { Button, Card, EmptyState, LinkButton, Modal, Notice, PageHeader, SectionHeading, StatusBadge } from "../../../components/ui";
import { businessRejectionReasons, expertRejectionReasons, FileInfo, Info, TaxCheckRow } from "../RiskPages.shared";

export function VerificationDetailPage() {
  const { type, id } = useParams();
  const isBusiness = type === "business";
  const [profile, setProfile] = useState<
    BusinessProfile | ExpertProfile | null
  >(null);
  const [taxCheckResult, setTaxCheckResult] = useState<{
    provided: Pick<BusinessProfile, "companyName" | "taxCode" | "address">;
    lookup: Pick<TaxCheckResponse, "companyName" | "taxCode" | "address">;
  } | null>(null);
  const [taxCheckLoading, setTaxCheckLoading] = useState(false);
  const [taxCheckError, setTaxCheckError] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [selectedRejectReasons, setSelectedRejectReasons] = useState<string[]>(
    [],
  );
  const [rejectError, setRejectError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (isBusiness) {
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
        .then(([items]) => {
          const matchedProfile =
            items.find((item) => item.expertId === Number(id)) || null;
          setProfile(matchedProfile);
        })
        .catch(() => {
          setProfile(null);
        });
    }
  }, [id, isBusiness]);

  useEffect(() => {
    queueMicrotask(() => {
      setRejectOpen(false);
      setSelectedRejectReasons([]);
      setRejectError("");
    });
  }, [id, isBusiness]);

  if (!profile)
    return <EmptyState title="Không tìm thấy hồ sơ" description="" />;

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
  const rejectionOptions = isBusiness
    ? businessRejectionReasons
    : expertRejectionReasons;

  const checkTaxCode = async () => {
    if (!isBusiness) return;
    setTaxCheckLoading(true);
    setTaxCheckError("");
    try {
      const business = profile as BusinessProfile;
      const lookup = await profileApi.checkTaxCode(business.taxCode); //api check mã số thuế
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

  const approve = async (
    statusValue: "Approved" | "Rejected",
    reason?: string,
  ) => {
    const updated = await profileApi.approve(
      isBusiness ? "BUSINESS" : "EXPERT",
      profileId,
      statusValue,
      reason,
    );
    setProfile(updated);
    if (statusValue === "Approved") {
      setMessage(
        `Đã chấp nhận hồ sơ của ${isBusiness ? "doanh nghiệp" : "chuyên gia"} ${title}`,
      );
    } else {
      setMessage("");
    }
  };

  const toggleRejectReason = (reason: string) => {
    setSelectedRejectReasons((items) =>
      items.includes(reason)
        ? items.filter((item) => item !== reason)
        : [...items, reason],
    );
    setRejectError("");
  };

  const beginReject = () => {
    setSelectedRejectReasons([]);
    setRejectError("");
    setRejectOpen(true);
  };

  const submitReject = async () => {
    if (selectedRejectReasons.length === 0) {
      setRejectError("Vui lòng chọn ít nhất một lý do từ chối.");
      return;
    }
    await approve("Rejected", selectedRejectReasons.join("; "));
    setRejectOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          eyebrow={isBusiness ? "Business KYB" : "Expert KYC"}
          title={title}
          description="Kiểm tra thông tin dịnh danh và ra quyết dịnh duyệt."
          actions={
            <LinkButton to="/app/verifications" variant="secondary">
              Danh sách
            </LinkButton>
          }
        />
      </div>
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
          <SectionHeading title="Quyết dịnh" />
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
            <Button variant="danger" onClick={beginReject}>
              <XCircle className="h-4 w-4" />
              Reject
            </Button>
          </div>
          {status === "Rejected" && profile.rejectionReason && (
            <Notice tone="danger" title="Lý do từ chối" className="mt-4">
              <ul className="list-disc ml-5 mt-1 space-y-1">
                {profile.rejectionReason.split(";").map((reason, index) => {
                  const trimmedReason = reason.trim();
                  // Chỉ render thẻ li nếu chuỗi sau khi xóa khoảng trắng không bị rỗng
                  return trimmedReason ? (
                    <li key={index}>{trimmedReason}</li>
                  ) : null;
                })}
              </ul>
            </Notice>
          )}
          {message && <Notice tone="success" title={message} className="mt-4" />}
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
      <Modal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Lý do từ chối"
        description={
          isBusiness
            ? "Chọn một hoặc nhiều lý do từ chối hồ sơ doanh nghiệp."
            : "Chọn một hoặc nhiều lý do từ chối hồ sơ chuyên gia."
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejectOpen(false)}>
              Hủy
            </Button>
            <Button variant="danger" onClick={submitReject}>
              <XCircle className="h-4 w-4" />
              Xác nhận từ chối
            </Button>
          </>
        }
      >
        <div className="grid gap-3">
          {rejectError && <Notice tone="danger" title={rejectError} />}
          {rejectionOptions.map((reason) => (
            <label
              key={reason}
              className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm font-semibold text-slate-700"
            >
              <input
                type="checkbox"
                className="mt-1"
                checked={selectedRejectReasons.includes(reason)}
                onChange={() => toggleRejectReason(reason)}
              />
              <span>{reason}</span>
            </label>
          ))}
        </div>
      </Modal>
    </div>
  );
}

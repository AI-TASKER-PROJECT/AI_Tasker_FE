import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { profileApi } from "../../../lib/api";
import type { BusinessProfile, ExpertProfile } from "../../../types";
import {
  Avatar,
  Badge,
  Card,
  EmptyState,
  LinkButton,
  PageHeader,
  Select,
  StatusBadge,
  Tabs,
} from "../../../components/ui";

const statusLabel = (status?: string) => {
  if (status === "Pending") return "Đang chờ";
  if (status === "Approved") return "Chấp nhận";
  if (status === "Rejected") return "Từ chối";
  return status || "Chưa có trạng thái";
};

export function VerificationsPage() {
  const [tab, setTab] = useState("business");
  const [statusFilter, setStatusFilter] = useState("Pending");
  const [businesses, setBusinesses] = useState<BusinessProfile[]>([]);
  const [experts, setExperts] = useState<ExpertProfile[]>([]);

  useEffect(() => {
    profileApi.listBusinesses().then(setBusinesses);
    profileApi.listExperts().then(setExperts);
  }, []);

  const getStatus = (item: BusinessProfile | ExpertProfile) =>
    tab === "business"
      ? (item as BusinessProfile).kybStatus
      : (item as ExpertProfile).kycStatus;

  const list = tab === "business" ? businesses : experts;
  const statusOptions = [
    { id: "All", label: "Tất cả", count: list.length },
    {
      id: "Pending",
      label: "Đang chờ",
      count: list.filter((item) => getStatus(item) === "Pending").length,
    },
    {
      id: "Approved",
      label: "Chấp nhận",
      count: list.filter((item) => getStatus(item) === "Approved").length,
    },
    {
      id: "Rejected",
      label: "Từ chối",
      count: list.filter((item) => getStatus(item) === "Rejected").length,
    },
  ];
  const filteredList =
    statusFilter === "All"
      ? list
      : list.filter((item) => getStatus(item) === statusFilter);

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader title="Duyệt hồ sơ KYC/KYB" description="" />
      </div>
      <Card className="p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Tabs
            active={tab}
            onChange={setTab}
            tabs={[
              {
                id: "business",
                label: "Doanh nghiệp - KYB",
                count: businesses.length,
              },
              { id: "expert", label: "Chuyên gia - KYC", count: experts.length },
            ]}
          />
          <div className="w-full lg:w-64">
            <Select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Lọc trạng thái hồ sơ"
            >
              {statusOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label} ({option.count})
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="mt-5 grid gap-3">
          {filteredList.map((item) => {
            const isBusiness = tab === "business";
            const title = isBusiness
              ? (item as BusinessProfile).companyName
              : (item as ExpertProfile).fullName || "Chuyên gia chưa có tên";
            const status = getStatus(item);
            const id = isBusiness
              ? (item as BusinessProfile).businessId
              : (item as ExpertProfile).expertId;
            const identifier = isBusiness
              ? (item as BusinessProfile).taxCode || "Chưa có mã số thuế"
              : (item as ExpertProfile).nationalId || "Chưa có giấy tờ định danh";
            return (
              <div
                key={id}
                className="flex flex-col gap-4 rounded-3xl border border-slate-100 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={title} />
                  <div>
                    <p className="font-extrabold text-ink">{title}</p>
                    <p className="text-sm font-semibold text-slate-500">
                      {isBusiness ? "Mã số thuế: " : "Giấy tờ định danh: "}
                      <span className="text-slate-700">{identifier}</span>
                    </p>
                    {isBusiness && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge tone="mint">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Đã xác minh mã số thuế
                        </Badge>
                        {(item as BusinessProfile).businessLicenseUrl && (
                          <Badge tone="slate">Có giấy phép</Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={statusLabel(status)} />
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
          {filteredList.length === 0 && (
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

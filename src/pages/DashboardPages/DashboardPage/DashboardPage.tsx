import {
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  FileCheck2,
  Gavel,
  IdCard,
  Layers3,
  WalletCards,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  catalogApi,
  contractApi,
  disputeApi,
  marketplaceApi,
  notificationApi,
  profileApi,
} from "../../../services";
import { roleLabel, useSession } from "../../../context/sessionContext";
import { formatCompactCurrency, formatCurrency } from "../../../lib/utils";
import { formatNotificationTime } from "../../../lib/notifications";
import type {
  Contract,
  Dispute,
  Job,
  NotificationItem,
  Proposal,
} from "../../../types";
import {
  Card,
  LinkButton,
  ListLink,
  MetricCard,
  PageHeader,
  SectionHeading,
  StatusBadge,
} from "../../../components/ui";

export function DashboardPage() {
  const session = useSession();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [pendingVerifications, setPendingVerifications] = useState(0);
  const [domainsCount, setDomainsCount] = useState(0);
  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [myProposals, setMyProposals] = useState<Proposal[]>([]);

  useEffect(() => {
    marketplaceApi
      .listJobs()
      .then(setJobs)
      .catch(() => setJobs([]));
    contractApi
      .listContracts()
      .then(async (items) => {
        setContracts(items);
        const disputeGroups = await Promise.all(
          items.map((contract) =>
            disputeApi.listByContract(contract.contractId).catch(() => []),
          ),
        );
        setDisputes(disputeGroups.flat());
      })
      .catch(() => {
        setContracts([]);
        setDisputes([]);
      });
    notificationApi
      .list()
      .then(setNotifications)
      .catch(() => setNotifications([]));

    if (session?.role === "STAFF") {
      Promise.all([profileApi.listBusinesses(), profileApi.listExperts()])
        .then(([businesses, experts]) => {
          const pendingB = businesses.filter(
            (b) => b.kybStatus === "Pending",
          ).length;
          const pendingE = experts.filter(
            (e) => e.kycStatus === "Pending",
          ).length;
          setPendingVerifications(pendingB + pendingE);
        })
        .catch(() => setPendingVerifications(0));

      catalogApi
        .listDomains()
        .then((domains) => setDomainsCount(domains.length))
        .catch(() => setDomainsCount(0));
    }

    if (session?.role === "BUSINESS") {
      marketplaceApi
        .listMyJobs()
        .then(setMyJobs)
        .catch(() => setMyJobs([]));
    }

    if (session?.role === "EXPERT") {
      marketplaceApi
        .listMyProposals()
        .then(setMyProposals)
        .catch(() => setMyProposals([]));
    }
  }, [session?.role]);

  if (!session) return null;

  const roleActions = {
    BUSINESS: [
      [
        "Tạo yêu cầu bằng AI",
        "/app/jobs/new",
        "Chuẩn hóa yêu cầu thô thành SoW",
      ],
      ["Quản lý dự án", "/app/jobs", "Xem dề xuất và báo giá"],
      ["Theo dõi escrow", "/app/finance", "Ký quỹ, PayOS"],
    ],
    EXPERT: [
      ["Tìm cơ hội", "/app/opportunities", "Nộp proposal cho dự án phù hợp"],
      [
        "Cập nhật portfolio",
        "/app/expert/portfolio",
        "4 thành phần năng lực AI",
      ],
      [
        "Bàn giao milestone",
        "/app/contracts",
        "Chọn hợp đồng thật dể mở workspace",
      ],
    ],
    STAFF: [
      ["Duyệt hồ sơ", "/app/verifications", "KYC/KYB pending"],
      [
        "Demo testing",
        "/app/tickets",
        "Chọn dispute thật dể kiểm thử và ghi nhận kết quả",
      ],
      ["Viết technical report", "/app/tickets", "Đề xuất phương án xử lý"],
    ],
    ADMIN: [
      ["Analytics", "/app/admin/analytics", "Doanh thu và tỷ lệ thành công"],
      ["Phân công dispute", "/app/tickets", "Assign staff và resolve"],
      ["System settings", "/app/admin/settings", "SLA, phí sàn, auto-routing"],
    ],
  }[session.role];

  const descriptionText =
    session.role === "BUSINESS"
      ? "Tổng hợp chung của doanh nghiệp"
      : session.role === "EXPERT"
        ? "Tổng hợp chung của chuyên gia"
        : session.role === "ADMIN"
          ? "Tổng hợp chung của hệ thống"
          : "Tổng hợp chung các thông tin của nhân viên";

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          eyebrow={roleLabel(session.role)}
          title={`Xin chào, ${session.fullName}`}
          description={descriptionText}
          actions={
            <LinkButton to="/app/notifications" variant="secondary">
              <Bell className="h-4 w-4" />
              Thông báo
            </LinkButton>
          }
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {session?.role === "STAFF" ? (
          <MetricCard
            label="Số hồ sơ cần duyệt"
            value={pendingVerifications}
            helper="KYC/KYB Pending"
            icon={<IdCard className="h-5 w-5" />}
          />
        ) : (
          <MetricCard
            label={session.role === "ADMIN" ? "Dự án đang mở" : "Số bài đăng hiện có"}
            value={jobs.filter((job) => job.status === "OPEN").length}
            helper={session.role === "ADMIN" ? "Trên hệ thống" : "Từ thị trường"}
            icon={<BriefcaseBusiness className="h-5 w-5" />}
          />
        )}
        {session?.role === "BUSINESS" ? (
          <MetricCard
            label="Số proposal đã nhận"
            value={myJobs.reduce(
              (sum, job) => sum + (job.proposalsCount || 0),
              0,
            )}
            helper="Từ các chuyên gia"
            icon={<FileCheck2 className="h-5 w-5" />}
            tone="mint"
          />
        ) : session?.role === "EXPERT" ? (
          <MetricCard
            label="Số proposal đã gửi"
            value={myProposals.length}
            helper="Đến doanh nghiệp"
            icon={<FileCheck2 className="h-5 w-5" />}
            tone="mint"
          />
        ) : (
          <MetricCard
            label={session.role === "ADMIN" ? "Hợp đồng đang thực thi" : "Báo cáo kĩ thuật"}
            value={
              contracts.filter((contract) => ["ACTIVE", "IN_PROGRESS"].includes((contract.status || "").toUpperCase()))
                .length
            }
            helper={session.role === "ADMIN" ? "Đang hoạt động" : "Đang thực thi"}
            icon={<FileCheck2 className="h-5 w-5" />}
            tone="mint"
          />
        )}
        {session.role !== "STAFF" && (
          <MetricCard
            label={
              session.role === "EXPERT"
                ? "Doanh thu cá nhân"
                : session.role === "BUSINESS"
                  ? "Tổng đầu tư cho tất cả dự án"
                  : "Tổng giá trị giao dịch"
            }
            value={formatCurrency(
              contracts
                .filter((contract) => ["COMPLETED", "RELEASED"].includes((contract.status || "").toUpperCase()))
                .reduce(
                  (total, contract) =>
                    total + Number(contract.totalBudget || 0),
                  0,
                ),
            )}
            helper="Từ tất cả các hợp đồng đã hoàn thành"
            icon={<WalletCards className="h-5 w-5" />}
            tone="coral"
          />
        )}
        <MetricCard
          label="Tranh chấp hiện có"
          value={
            disputes.filter(
              (dispute) =>
                !["Resolved", "Closed", "Rejected"].includes(dispute.status),
            ).length
          }
          helper="Cần xử lý"
          icon={<Gavel className="h-5 w-5" />}
          tone="amber"
        />
        {session?.role === "STAFF" && (
          <MetricCard
            label="Lĩnh vực chuyên môn"
            value={domainsCount}
            helper="Trên hệ thống"
            icon={<Layers3 className="h-5 w-5" />}
            tone="brand"
          />
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_.9fr]">
        <Card className="p-6">
          <SectionHeading title="Việc cần làm tiếp theo" />
          <div className="mt-5 grid gap-3">
            {roleActions.map(([title, href, description], index) => (
              <Link
                key={title}
                to={href}
                className="group flex items-center gap-4 rounded-3xl border border-slate-100 p-4 transition hover:border-brand-100 hover:bg-brand-50/40"
              >
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white font-display text-lg font-black text-brand-600 shadow-sm">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold text-ink">{title}</p>
                  <p className="mt-1 text-sm text-slate-500">{description}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-brand-600" />
              </Link>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <SectionHeading title="Thông báo mới" />
          <div className="mt-5 grid gap-3">
            {notifications.slice(0, 3).map((item) => (
              <ListLink
                key={item.notificationId}
                to={`/app/notifications?notificationId=${item.notificationId}`}
                title={item.title}
                description={`${formatNotificationTime(item.createdAt)} - ${item.message}`}
                descriptionClassName="line-clamp-2 whitespace-normal break-words leading-5"
                leading={
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                    <Bell className="h-4 w-4" />
                  </span>
                }
              />
            ))}
            {notifications.length === 0 && (
              <p className="rounded-2xl bg-slate-50 px-4 py-5 text-sm font-semibold text-slate-400">
                Chua co thong bao moi.
              </p>
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-6">
        <Card className="p-6">
          <SectionHeading
            title="Hợp đồng gần đây"
            action={
              <LinkButton to="/app/contracts" variant="secondary" size="sm">
                Xem tất cả
              </LinkButton>
            }
          />
          <div className="mt-5 grid gap-3">
            {contracts.map((contract) => (
              <ListLink
                key={contract.contractId}
                to={`/app/contracts/${contract.contractId}`}
                title={contract.title || `Contract #${contract.contractId}`}
                description={`${contract.businessName} • ${contract.expertName} • ${formatCompactCurrency(contract.totalBudget)}`}
                leading={<FileCheck2 className="h-5 w-5 text-brand-500" />}
                trailing={<StatusBadge status={contract.status} />}
              />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

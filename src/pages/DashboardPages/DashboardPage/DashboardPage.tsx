import {
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  FileCheck2,
  Gavel,
  IdCard,
  X,
  WalletCards,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  contractApi,
  disputeApi,
  marketplaceApi,
  notificationApi,
  profileApi,
  staffApi,
  userQuotaApi,
} from "../../../services";
import { adminApi } from "../../../lib/api";
import { roleLabel, useSession } from "../../../context/sessionContext";
import {
  formatCompactCurrency,
  formatCurrency,
  formatDate,
} from "../../../lib/utils";
import { formatNotificationTime } from "../../../lib/notifications";
import type {
  Contract,
  Job,
  NotificationItem,
  Proposal,
  Staff,
  SystemWallet,
  UserQuota,
} from "../../../types";
import {
  Card,
  LinkButton,
  ListLink,
  MetricCard,
  Notice,
  PageHeader,
  SectionHeading,
  StatusBadge,
} from "../../../components/ui";

const PROFILE_REVIEW_DOMAIN_CODE = "PROFILE_REVIEW";

export function DashboardPage() {
  const session = useSession();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [businessNames, setBusinessNames] = useState<Record<number, string>>(
    {},
  );
  const [expertNames, setExpertNames] = useState<Record<number, string>>({});
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [pendingVerifications, setPendingVerifications] = useState(0);
  const [pendingStaffDisputes, setPendingStaffDisputes] = useState(0);
  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [myProposals, setMyProposals] = useState<Proposal[]>([]);
  const [systemWallet, setSystemWallet] = useState<SystemWallet | null>(null);
  const [staffProfile, setStaffProfile] = useState<Staff | null>(null);
  const [quota, setQuota] = useState<UserQuota | null>(null);
  const [approvalBonusNoticeDismissed, setApprovalBonusNoticeDismissed] =
    useState(false);

  const isStaff = session?.role === "STAFF";
  const isProfileReviewStaff = useMemo(
    () =>
      staffProfile?.domains?.some(
        (domain) => domain.domainCode === PROFILE_REVIEW_DOMAIN_CODE,
      ) || false,
    [staffProfile],
  );

  useEffect(() => {
    marketplaceApi
      .listJobs()
      .then(setJobs)
      .catch(() => setJobs([]));
    if (session?.role !== "STAFF") {
      contractApi
        .listContracts()
        .then(async (items) => {
          setContracts(items);
          const businessIds = Array.from(
            new Set(items.map((contract) => contract.businessId)),
          ).filter((value): value is number => Number.isFinite(value));
          const expertIds = Array.from(
            new Set(items.map((contract) => contract.expertId)),
          ).filter((value): value is number => Number.isFinite(value));
          const shouldLoadBusinesses = session?.role !== "BUSINESS";
          const shouldLoadExperts = session?.role !== "EXPERT";
          const [businessEntries, expertEntries] = await Promise.all([
            shouldLoadBusinesses
              ? Promise.all(
                  businessIds.map(async (id) => {
                    try {
                      const business = await profileApi.getBusinessById(id);
                      return [
                        id,
                        business.companyName || "Doanh nghiệp",
                      ] as const;
                    } catch {
                      return [id, ""] as const;
                    }
                  }),
                )
              : Promise.resolve([] as Array<readonly [number, string]>),
            shouldLoadExperts
              ? Promise.all(
                  expertIds.map(async (id) => {
                    try {
                      const expert = await profileApi.getExpertById(id);
                      return [
                        id,
                        expert.fullName || expert.title || "Chuyên gia",
                      ] as const;
                    } catch {
                      return [id, ""] as const;
                    }
                  }),
                )
              : Promise.resolve([] as Array<readonly [number, string]>),
          ]);
          setBusinessNames(
            Object.fromEntries(businessEntries.filter(([, name]) => name)),
          );
          setExpertNames(
            Object.fromEntries(expertEntries.filter(([, name]) => name)),
          );
        })
        .catch(() => {
          setContracts([]);
          setBusinessNames({});
          setExpertNames({});
        });
    } else {
      void Promise.resolve().then(() => {
        setContracts([]);
        setBusinessNames({});
        setExpertNames({});
      });
    }
    notificationApi
      .list()
      .then(setNotifications)
      .catch(() => setNotifications([]));

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

    if (session?.role === "BUSINESS" || session?.role === "EXPERT") {
      userQuotaApi
        .getCurrent()
        .then(setQuota)
        .catch(() => setQuota(null));
    } else {
      void Promise.resolve().then(() => setQuota(null));
    }

    if (session?.role === "ADMIN") {
      adminApi
        .getSystemWallet()
        .then(setSystemWallet)
        .catch(() => setSystemWallet(null));
    }
  }, [session?.role]);

  useEffect(() => {
    if (session?.role !== "STAFF") {
      void Promise.resolve().then(() => {
        setStaffProfile(null);
        setPendingVerifications(0);
        setPendingStaffDisputes(0);
      });
      return;
    }

    let ignore = false;
    staffApi
      .current()
      .then((profile) => {
        if (!ignore) setStaffProfile(profile);
      })
      .catch(() => {
        if (!ignore) setStaffProfile(null);
      });

    return () => {
      ignore = true;
    };
  }, [session?.role]);

  useEffect(() => {
    if (session?.role !== "STAFF" || !staffProfile) return;

    if (isProfileReviewStaff) {
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
      void Promise.resolve().then(() => setPendingStaffDisputes(0));
      return;
    }

    void Promise.resolve().then(() => setPendingVerifications(0));
    disputeApi
      .listStaff({ page: 0, size: 1, status: "STAFF_REVIEWING" })
      .then((response) => setPendingStaffDisputes(response.totalElements))
      .catch(() => setPendingStaffDisputes(0));
  }, [isProfileReviewStaff, session?.role, staffProfile]);

  useEffect(() => {
    void Promise.resolve().then(() => setApprovalBonusNoticeDismissed(false));
  }, [session?.accountId, session?.email, session?.role]);

  if (!session) return null;

  const sortedContracts = [...contracts].sort((left, right) => {
    const leftDate = new Date(left.createdAt || left.updatedAt || 0).getTime();
    const rightDate = new Date(
      right.createdAt || right.updatedAt || 0,
    ).getTime();
    return rightDate - leftDate;
  });

  const staffActions = isProfileReviewStaff
    ? [
        [
          "Duyệt hồ sơ",
          "/app/verifications",
          "Xử lý KYC/KYB đang chờ duyệt",
        ],
        [
          "Quản lý hồ sơ",
          "/app/verifications",
          "Theo dõi hồ sơ cần xác minh",
        ],
      ]
    : [
        [
          "Xử lý tranh chấp",
          "/app/tickets",
          "Tiếp nhận và xử lý tranh chấp được phân công",
        ],
        [
          "Danh sách tranh chấp",
          "/app/tickets",
          "Theo dõi các tranh chấp theo chuyên môn",
        ],
      ];

  const roleActions = {
    BUSINESS: [
      [
        "Tạo yêu cầu bằng AI",
        "/app/jobs/new",
        "Chuẩn hóa yêu cầu thô thành mô tả công việc chi tiết",
      ],
      [
        "Quản lý dự án",
        "/app/jobs",
        "Lựa chọn chuyên gia, theo dõi tiến độ dự án",
      ],
      [
        "Theo dõi tài chính",
        "/app/finance",
        "Quản lý các khoản thanh toán và kí quỹ",
      ],
    ],
    EXPERT: [
      ["Tìm cơ hội", "/app/opportunities", "Nộp bản đề xuất cho dự án phù hợp"],
      [
        "Cập nhật portfolio",
        "/app/expert/portfolio",
        "Cập nhật hồ sơ chuyên gia để tăng cơ hội nhận dự án",
      ],
      [
        "Bàn giao sản phẩm",
        "/app/contracts",
        "Quản lý các hợp đồng đang thực thi và bàn giao sản phẩm cho doanh nghiệp",
      ],
    ],
    STAFF: staffActions,
    ADMIN: [
      ["Phân tích", "/app/admin/analytics", "Doanh thu và tỷ lệ thành công"],
      ["Quản lý nhân viên", "/app/admin/staff", "Quản lý tài khoản nhân viên"],
      [
        "Cấu hình hệ thống",
        "/app/admin/settings",
        "Cấu hình các thông số hệ thống",
      ],
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
  const approvalQuotaBalance =
    session.role === "BUSINESS"
      ? quota?.jobPostQuotaBalance ?? 0
      : quota?.proposalQuotaBalance ?? 0;
  const approvalBonusNoticeTitle =
    approvalQuotaBalance <= 0
      ? "Bạn đã sử dụng hết số lượt. Vui lòng mua thêm lượt để sử dụng."
      : session.role === "BUSINESS"
        ? `Hồ sơ của bạn đã được xác minh. Số lượt đăng bài của bạn là: ${approvalQuotaBalance}`
        : `Hồ sơ của bạn đã được xác minh. Số lượt nộp đề xuất của bạn là: ${approvalQuotaBalance}`;
  const approvalBonusNoticeTone =
    approvalQuotaBalance <= 0 ? "warning" : "success";
  const showApprovalBonusNotice =
    (session.role === "BUSINESS" || session.role === "EXPERT") &&
    session.accountStatus === "Approved" &&
    !approvalBonusNoticeDismissed;

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

      {showApprovalBonusNotice && (
        <Notice tone={approvalBonusNoticeTone} title={approvalBonusNoticeTitle}>
          <button
            type="button"
            onClick={() => setApprovalBonusNoticeDismissed(true)}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-extrabold text-mint-700 shadow-sm transition hover:bg-mint-50"
          >
            <X className="h-3.5 w-3.5" />
            Đã hiểu
          </button>
        </Notice>
      )}

      <div
        className={`grid items-stretch gap-5 ${
          isStaff ? "md:grid-cols-1" : "md:grid-cols-3"
        }`}
      >
        {isStaff && isProfileReviewStaff && (
          <div className="h-full [&>*]:h-full">
            <MetricCard
              label="Số hồ sơ cần duyệt"
              value={pendingVerifications}
              helper="KYC/KYB Pending"
              icon={<IdCard className="h-5 w-5" />}
            />
          </div>
        )}
        {isStaff && !isProfileReviewStaff && (
          <div className="h-full [&>*]:h-full">
            <MetricCard
              label="Tranh chấp cần xử lý"
              value={pendingStaffDisputes}
              helper="Theo chuyên môn được phân công"
              icon={<Gavel className="h-5 w-5" />}
              tone="brand"
            />
          </div>
        )}
        {!isStaff && (
          <div className="h-full [&>*]:h-full">
            <MetricCard
              label={
                session.role === "BUSINESS"
                  ? "Số bài đăng của tôi"
                  : session.role === "ADMIN"
                    ? "Dự án đang mở"
                    : "Số bài đăng hiện có"
              }
              value={
                session.role === "BUSINESS"
                  ? myJobs.filter((job) => job.status === "OPEN").length
                  : jobs.filter((job) => job.status === "OPEN").length
              }
              helper={
                session.role === "BUSINESS"
                  ? "Từ Dự án của tôi"
                  : session.role === "ADMIN"
                    ? "Trên hệ thống"
                    : "Từ thị trường"
              }
              icon={<BriefcaseBusiness className="h-5 w-5" />}
            />
          </div>
        )}
        {!isStaff && session?.role === "BUSINESS" ? (
          <div className="h-full [&>*]:h-full">
            <MetricCard
              label="Số bản đề xuất đã nhận"
              value={myJobs.reduce(
                (sum, job) => sum + (job.proposalsCount || 0),
                0,
              )}
              helper="Từ các chuyên gia"
              icon={<FileCheck2 className="h-5 w-5" />}
              tone="mint"
            />
          </div>
        ) : !isStaff && session?.role === "EXPERT" ? (
          <div className="h-full [&>*]:h-full">
            <MetricCard
              label="Số bản đề xuất đã gửi"
              value={myProposals.length}
              helper="Đến doanh nghiệp"
              icon={<FileCheck2 className="h-5 w-5" />}
              tone="mint"
            />
          </div>
        ) : !isStaff ? (
          <div className="h-full [&>*]:h-full">
            <MetricCard
              label={
                session.role === "ADMIN"
                  ? "Hợp đồng đang thực thi"
                  : "Báo cáo kĩ thuật"
              }
              value={
                contracts.filter((contract) =>
                  ["ACTIVE", "IN_PROGRESS"].includes(
                    (contract.status || "").toUpperCase(),
                  ),
                ).length
              }
              helper={
                session.role === "ADMIN" ? "Đang hoạt động" : "Đang thực thi"
              }
              icon={<FileCheck2 className="h-5 w-5" />}
              tone="mint"
            />
          </div>
        ) : null}
        {!isStaff && (
          <div className="h-full [&>*]:h-full">
            <MetricCard
              label={
                session.role === "EXPERT"
                  ? "Doanh thu cá nhân"
                  : session.role === "BUSINESS"
                    ? "Tổng đầu tư cho tất cả dự án"
                    : "Tổng doanh thu"
              }
              value={formatCurrency(
                session.role === "ADMIN"
                  ? systemWallet?.totalRevenue || 0
                  : contracts
                      .filter((contract) =>
                        ["COMPLETED", "RELEASED"].includes(
                          (contract.status || "").toUpperCase(),
                        ),
                      )
                      .reduce(
                        (total, contract) =>
                          total + Number(contract.totalBudget || 0),
                        0,
                      ),
              )}
              helper={
                session.role === "ADMIN"
                  ? "Từ thu nhập của hệ thống"
                  : "Từ tất cả các hợp đồng đã hoàn thành"
              }
              icon={<WalletCards className="h-5 w-5" />}
              tone="coral"
            />
          </div>
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
                Chưa có thông báo mới.
              </p>
            )}
          </div>
        </Card>
      </div>

      {session?.role !== "ADMIN" && session?.role !== "STAFF" && (
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
              {sortedContracts.map((contract) => (
                <ListLink
                  key={contract.contractId}
                  to={`/app/contracts/${contract.contractId}`}
                  title={
                    contract.contractTitle ||
                    contract.title ||
                    "Hợp đồng chưa có tên"
                  }
                  description={
                    session?.role === "BUSINESS"
                      ? `Chuyên gia: ${contract.expertName || expertNames[contract.expertId] || "Chưa có tên chuyên gia"} • ${formatCompactCurrency(contract.totalBudget)} • Ngày: ${formatDate(contract.createdAt || contract.updatedAt)}`
                      : session?.role === "EXPERT"
                        ? `Doanh nghiệp: ${contract.businessName || businessNames[contract.businessId] || "Chưa có tên doanh nghiệp"} • ${formatCompactCurrency(contract.totalBudget)} • Ngày: ${formatDate(contract.createdAt || contract.updatedAt)}`
                        : `${contract.businessName || businessNames[contract.businessId] || "Doanh nghiệp"} • ${contract.expertName || expertNames[contract.expertId] || "Chuyên gia"} • ${formatCompactCurrency(contract.totalBudget)} • Ngày: ${formatDate(contract.createdAt || contract.updatedAt)}`
                  }
                  leading={<FileCheck2 className="h-5 w-5 text-brand-500" />}
                  trailing={<StatusBadge status={contract.status} />}
                />
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}


import {
  CheckCircle2,
  FileCheck2,
  FileText,
  Gavel,
  LockKeyhole,
  ReceiptText,
  Star,
  WalletCards,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { disputeApi } from "../../lib/api";
import { formatDateTime } from "../../lib/utils";
import type { Contract, Milestone } from "../../types";
import { Button, Modal, Notice } from "../../components/ui";

export const NDA_TERMS = [
  {
    title: "1. Thông tin bảo mật và mục đích sử dụng",
    body: "Thông tin bảo mật gồm tài liệu dự án, mã nguồn, dữ liệu nghiệp vụ, tài khoản truy cập, báo giá và mọi nội dung chưa công khai. Các bên chỉ được sử dụng các thông tin này để thực hiện, nghiệm thu và vận hành hợp đồng trên AI Tasker.",
  },
  {
    title: "2. Giải quyết tranh chấp",
    body: "Mọi tranh chấp liên quan đến hợp đồng, dữ liệu, sản phẩm bàn giao hoặc nghĩa vụ bảo mật phải được gửi trên AI Tasker. Hai bên phải cung cấp bằng chứng; mọi quyết định giải quyết tranh chấp do hệ thống AI Tasker đưa ra và được ghi nhận trên hệ thống là căn cứ cuối cùng để tiếp tục thực hiện hợp đồng. Hai bên phải chấp thuận hoàn toàn quyết định giải quyết tranh chấp từ hệ thống.",
  },
  {
    title: "3. Hủy ngang và bồi thường",
    body: "Khi một bên hủy ngang hợp đồng đang hoạt động, mức bồi thường là 10% tổng giá trị hợp đồng và được khấu trừ từ khoản ký quỹ của bên yêu cầu để chuyển cho bên còn lại. Quy định này không áp dụng cho việc từ chối hoặc hủy hợp đồng nháp trước khi kích hoạt.",
  },
  {
    title: "4. Nghĩa vụ bảo vệ",
    body: "Hai bên phải áp dụng biện pháp bảo mật hợp lý, chỉ cấp quyền truy cập theo nhu cầu công việc và không sao chép, công bố, phát tán hoặc cho người không có thẩm quyền tiếp cận thông tin bảo mật.",
  },
  {
    title: "5. Dữ liệu cá nhân, AI và bên thứ ba",
    body: "Dữ liệu cá nhân, thông tin đăng nhập, khóa API và dữ liệu hệ thống chỉ được xử lý trong phạm vi cần thiết. Không được đưa dữ liệu mật vào công cụ AI, kho mã nguồn, dịch vụ lưu trữ hoặc nền tảng bên thứ ba nếu chưa được chấp thuận.",
  },
  {
    title: "6. Sự cố và vi phạm bảo mật",
    body: "Bên phát hiện truy cập trái phép, thất thoát hoặc tiết lộ thông tin phải thông báo sớm qua hệ thống, phối hợp khắc phục và chịu trách nhiệm đối với thiệt hại do vi phạm của mình.",
  },
  {
    title: "7. Thời hạn, hoàn trả và hủy dữ liệu",
    body: "Cam kết bảo mật có hiệu lực từ khi ký NDA và kéo dài 24 tháng sau khi hợp đồng kết thúc. Khi kết thúc hợp đồng hoặc theo yêu cầu hợp lệ, bên nhận phải ngừng sử dụng, hoàn trả hoặc hủy dữ liệu ngoài phạm vi phải lưu giữ theo pháp luật.",
  },
  {
    title: "8. Tài sản trí tuệ và dữ liệu đầu ra",
    body: "NDA chỉ điều chỉnh nghĩa vụ bảo mật, không tự động chuyển giao quyền sở hữu trí tuệ. Quyền đối với mã nguồn, tài liệu, mô hình, dữ liệu và sản phẩm bàn giao được xác định theo hợp đồng, bản đề xuất và thỏa thuận bằng văn bản.",
  },
  {
    title: "9. Ngoại lệ và bằng chứng điện tử",
    body: "Nghĩa vụ bảo mật không áp dụng với thông tin đã công khai hợp pháp, đã được nắm giữ hợp lệ hoặc buộc phải cung cấp theo yêu cầu có thẩm quyền. Thời điểm ký, lịch sử cập nhật, tệp đính kèm và thông báo trên AI Tasker được dùng làm bằng chứng đối chiếu.",
  },
];

export function normalizeContractStatus(status?: string) {
  const normalized = (status || "").trim().replace(/ /g, "_").toUpperCase();
  if (normalized === "DRAFT" || normalized === "NEGOTIATING") return "DRAFT";
  if (normalized === "PENDING" || normalized === "PENDINGDEPOSIT")
    return "PENDING";
  if (normalized === "ACTIVE") return "ACTIVE";
  if (normalized === "AWAITING_CONTINUATION_DECISION")
    return "AWAITING_CONTINUATION_DECISION";
  if (normalized === "COMPLETED") return "COMPLETED";
  if (normalized === "TERMINATED" || normalized === "CANCELLED")
    return "CANCELLED";
  return normalized;
}

export function translateContractStatus(status?: string) {
  const norm = (status || "").trim().toUpperCase();
  switch (norm) {
    case "DRAFT":
      return "Nháp";
    case "PENDING":
      return "Chờ phản hồi";
    case "PENDINGDEPOSIT":
      return "Chờ ký quỹ";
    case "ACTIVE":
      return "Đang hoạt động";
    case "AWAITING_CONTINUATION_DECISION":
      return "Chờ doanh nghiệp quyết định";
    case "IN_PROGRESS":
      return "Đang thực hiện";
    case "COMPLETED":
      return "Hoàn thành";
    case "CANCELLED":
      return "Đã hủy";
    case "TERMINATED":
      return "Đã hủy";
    case "REJECTED":
      return "Bị từ chối";
    case "UNDER_REVIEW":
      return "Chờ nghiệm thu";
    case "RELEASED":
      return "Đã thanh toán";
    case "SUCCESS":
      return "Thành công";
    case "FAILED":
      return "Thất bại";
    case "OPEN":
      return "Mở";
    case "CLOSED":
      return "Đóng";
    case "RESOLVED":
      return "Đã giải quyết";
    default:
      return status;
  }
}

export function formatTimelineWeeks(timelineDays?: number) {
  const weeks = Math.max(1, Math.ceil(Number(timelineDays || 0) / 7));
  return `${weeks} tuần`;
}

export function getSourceMilestoneId(milestone: Partial<Milestone>) {
  const value =
    (milestone as Partial<Milestone> & { jobMilestoneId?: number })
      .jobMilestoneId ?? milestone.milestoneId;
  return Number.isFinite(Number(value)) ? Number(value) : undefined;
}

export function getContractMilestoneId(milestone: Partial<Milestone>) {
  const value = (milestone as { contractMilestoneId?: number })
    .contractMilestoneId;
  return Number.isFinite(Number(value)) ? Number(value) : undefined;
}

export function getMilestoneBudget(milestone: Partial<Milestone>) {
  const value =
    (milestone as Partial<Milestone> & { finalBudget?: number }).finalBudget ??
    milestone.fundsAllocated;
  return Number(value || 0);
}

export function getMilestoneDurationLabel(
  milestone: Partial<Milestone> & { duration?: number; durationUnit?: string },
) {
  const duration = Number(milestone.duration || 0);
  if (!Number.isFinite(duration) || duration <= 0) return "Chưa có thời gian";
  return `${duration} ${milestone.durationUnit || "tuần"}`;
}

export function formatTotalMilestoneDuration(
  milestones: Array<
    Partial<Milestone> & {
      duration?: number;
      durationUnit?: string;
      durationValue?: number;
    }
  >,
) {
  const totalWeeks = milestones.reduce((total, milestone) => {
    const duration = Number(milestone.durationValue ?? milestone.duration ?? 0);
    if (!Number.isFinite(duration) || duration <= 0) return total;

    const unit = (milestone.durationUnit || "WEEK").toUpperCase();
    if (unit.includes("DAY") || unit.includes("NGAY")) {
      return total + duration / 7;
    }
    if (unit.includes("MONTH") || unit.includes("THANG")) {
      return total + duration * 4;
    }
    return total + duration;
  }, 0);

  if (totalWeeks <= 0) return "Chưa có thời gian";
  return `${Number.isInteger(totalWeeks) ? totalWeeks : totalWeeks.toFixed(1)} tuần`;
}

export function canBackendReviewMilestone(status?: string) {
  const normalized = (status || "")
    .trim()
    .replace(/[\s-]+/g, "_")
    .toUpperCase();
  return [
    "UNDER_REVIEW",
    "IN_REVIEW",
    "PENDING_REVIEW",
    "WAITING_REVIEW",
    "WAITING_APPROVAL",
    "PENDING_APPROVAL",
    "CHO_DUYET",
    "CHO_NGHIEM_THU",
  ].includes(normalized);
}

export function ContractLifecycle({
  status,
  terminationReason,
}: {
  status: string;
  terminationReason?: string;
}) {
  const steps = ["DRAFT", "PENDING", "ACTIVE", "COMPLETED", "CLOSED"];
  const labels: Record<string, string> = {
    DRAFT: "Nháp",
    PENDING: "Chờ ký quỹ",
    ACTIVE: "Đang hoạt động",
    COMPLETED: "Hoàn thành",
    CLOSED: terminationReason ? "Đã hủy ngang" : "Đã tất toán",
  };
  const normalizedStatus = normalizeContractStatus(status);
  const currentIndex = steps.indexOf(normalizedStatus);
  const terminal = normalizedStatus === "CANCELLED";

  return (
    <div className="mt-3 grid gap-2 md:grid-cols-5">
      {steps.map((step, index) => {
        const reached = !terminal && currentIndex >= index;
        const current = normalizedStatus === step;
        return (
          <div
            key={step}
            className={
              current
                ? "rounded-2xl border border-brand-100 bg-brand-50 p-3"
                : reached
                  ? "rounded-2xl border border-mint-100 bg-mint-50 p-3"
                  : "rounded-2xl border border-slate-100 bg-white p-3"
            }
          >
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={
                  reached || current
                    ? "grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-white text-mint-600"
                    : "grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-slate-50 text-slate-400"
                }
              >
                <CheckCircle2 className="h-4 w-4" />
              </span>
              <p className="min-w-0 truncate text-xs font-extrabold text-ink">
                {labels[step] || step}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function getContractNextAction({
  contract,
  role,
  businessAccepted,
  expertAccepted,
  businessNdaSigned,
  expertNdaSigned,
  underReviewCount,
  activeDisputeCount,
}: {
  contract: Contract;
  role?: string;
  businessAccepted: boolean;
  expertAccepted: boolean;
  businessNdaSigned: boolean;
  expertNdaSigned: boolean;
  underReviewCount: number;
  activeDisputeCount: number;
}): {
  tone: "info" | "success" | "warning" | "danger";
  title: string;
  description: string;
} {
  const contractStatus = normalizeContractStatus(contract.status);
  if (activeDisputeCount > 0) {
    return {
      tone: "warning",
      title: "Hợp đồng đang có tranh chấp cần theo dõi.",
      description: `${activeDisputeCount} tranh chấp chưa xử lý xong. Hai bên nên ưu tiên xử lý trước khi tiếp tục nghiệm thu hoặc thanh toán.`,
    };
  }
  if (
    contractStatus === "CLOSED" &&
    (contract.terminationReason || contract.terminatedAt)
  ) {
    return {
      tone: "danger",
      title: "Hợp đồng đã bị hủy ngang.",
      description:
        "Hợp đồng đã chấm dứt ngay theo yêu cầu đơn phương. Các mốc và thao tác tiếp theo đã được khóa; khoản bồi thường đã được xử lý theo quy định hệ thống.",
    };
  }
  if (contractStatus === "CLOSED") {
    return {
      tone: "success",
      title: "Hợp đồng đã đóng và hoàn ký quỹ.",
      description:
        "Hệ thống đã xử lý hoàn ký quỹ và các khoản liên quan. Hai bên có thể gửi đánh giá đối tác.",
    };
  }
  if (contractStatus === "COMPLETED") {
    return {
      tone: "success",
      title: "Hệ thống đang hoàn ký quỹ.",
      description: "Tất cả mốc đã hoàn thành. Hệ thống đang đồng bộ hoàn ký quỹ và đóng hợp đồng.",
    };
  }
  if (contractStatus === "CANCELLED") {
    return {
      tone: "danger",
      title: "Hợp đồng không còn tiếp tục thực hiện.",
      description: `Hai bên không thể tiếp tục thực hiện các mốc.`,
    };
  }
  if (contractStatus === "PENDING") {
    return {
      tone: "warning",
      title:
        role === "BUSINESS"
          ? "Bạn cần thanh toán ký quỹ để kích hoạt hợp đồng."
          : "Đang chờ doanh nghiệp thanh toán ký quỹ.",
      description:
        role === "BUSINESS"
          ? "Tiến hành thanh toán ký quỹ để kích hoạt hợp đồng."
          : "Hợp đồng chưa được kích hoạt vì doanh nghiệp chưa thanh toán ký quỹ.",
    };
  }
  if (!businessAccepted) {
    return {
      tone: role === "BUSINESS" ? "warning" : "info",
      title:
        role === "BUSINESS"
          ? "Bạn cần chấp nhận hợp đồng."
          : "Đang chờ doanh nghiệp chấp nhận hợp đồng.",
      description: "Các điều kiện kích hoạt hợp đồng vẫn chưa hoàn tất.",
    };
  }
  if (!expertAccepted) {
    return {
      tone: role === "EXPERT" ? "warning" : "info",
      title:
        role === "EXPERT"
          ? "Bạn cần chấp nhận hợp đồng."
          : "Đang chờ chuyên gia chấp nhận hợp đồng.",
      description: "Các điều kiện kích hoạt hợp đồng vẫn chưa hoàn tất.",
    };
  }
  if (!businessNdaSigned) {
    return {
      tone: role === "BUSINESS" ? "warning" : "info",
      title:
        role === "BUSINESS"
          ? "Bạn cần ký NDA."
          : "Đang chờ doanh nghiệp ký NDA.",
      description: "Hệ thống lưu thời điểm ký NDA riêng cho từng bên.",
    };
  }
  if (!expertNdaSigned) {
    return {
      tone: role === "EXPERT" ? "warning" : "info",
      title:
      role === "EXPERT" ? "Bạn cần ký thỏa thuận bảo mật." : "Đang chờ chuyên gia ký thỏa thuận bảo mật.",
      description: "Hệ thống lưu thời điểm ký NDA riêng cho từng bên.",
    };
  }
  if (contractStatus === "ACTIVE") {
    return {
      tone: underReviewCount > 0 && role === "BUSINESS" ? "warning" : "success",
      title:
        underReviewCount > 0 && role === "BUSINESS"
          ? "Có mốc đang chờ nghiệm thu."
          : "Hợp đồng đang hoạt động.",
      description:
        underReviewCount > 0
          ? `${underReviewCount} cột mốc đã có sản phẩm bàn giao và đang được nghiệm thu.`
          : "Chuyên gia có thể tiếp tục thực hiện các mốc và gửi sản phẩm để doanh nghiệp nghiệm thu.",
    };
  }
  return {
    tone: "info",
    title: "Hợp đồng đang trong giai đoạn chuẩn bị.",
    description:
      "Theo dõi các điều kiện kích hoạt và thao tác theo vai trò ở bên dưới.",
  };
}

export function ContractMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-3xl border border-slate-100 p-4">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-2 break-words font-display text-lg font-black text-ink">{value}</p>
    </div>
  );
}

export function OperationStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3.5">
      <p className="min-w-0 text-sm font-bold leading-5 text-slate-500">
        {label}
      </p>
      <p className="min-w-0 break-words text-right font-display text-lg font-black text-ink">
        {value}
      </p>
    </div>
  );
}

export function ContractFlowStep({
  label,
  done,
  value,
}: {
  label: string;
  done: boolean;
  value?: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
      <span
        className={
          done
            ? "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-2xl bg-mint-50 text-mint-600"
            : "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-700"
        }
      >
        {done ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <LockKeyhole className="h-4 w-4" />
        )}
      </span>
      <div className="min-w-0">
        <p className="font-extrabold text-ink">{label}</p>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          {done && value
            ? formatDateTime(value)
            : done
              ? "Đã hoàn tất"
              : "Đang chờ"}
        </p>
      </div>
    </div>
  );
}

export function Participant({
  label,
  value,
  details = [],
}: {
  label: string;
  value: string;
  details?: Array<[string, string | undefined]>;
}) {
 return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 break-words font-extrabold text-ink">{value}</p>
      {details.length > 0 && (
        <div className="mt-3 grid gap-2 text-sm">
          {details.map(([detailLabel, detailValue]) => (
            <div
              key={detailLabel}
              className="grid grid-cols-[110px_minmax(0,1fr)] gap-3"
            >
              <span className="text-slate-500">{detailLabel}</span>
              <span className="min-w-0 break-words font-bold text-slate-700">
                {detailValue || "Chưa có dữ liệu từ BE"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SignatureBlock({
  title,
  name,
  signedAt,
  ndaSigned,
  verified,
}: {
  title: string;
  name: string;
  signedAt?: string;
  ndaSigned: boolean;
  verified: boolean;
}) {
  const signed = Boolean(signedAt);
  const waitingForNda = signed && !ndaSigned;
  const completed = signed && ndaSigned;
  const highlighted = verified || completed;

  return (
    <div
      className={
        highlighted
          ? "rounded-2xl border border-mint-100 bg-mint-50 p-5 text-center"
          : "rounded-2xl border border-amber-100 bg-amber-50 p-5 text-center"
      }
    >
      <div
        className={
          highlighted
            ? "mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white text-mint-600 shadow-sm"
            : "mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white text-amber-700 shadow-sm"
        }
      >
        {highlighted ? (
          <CheckCircle2 className="h-5 w-5" />
        ) : (
          <LockKeyhole className="h-5 w-5" />
        )}
      </div>
      <p className="mt-3 text-sm font-extrabold text-ink">{title}</p>
      <p className="mt-2 text-base font-black text-slate-700">{name}</p>
      <p
        className={
          highlighted
            ? "mt-1 text-xs font-bold text-mint-700"
            : "mt-1 text-xs font-bold text-amber-700"
        }
      >
        {completed
          ? "Đã ký đủ hợp đồng và NDA"
          : waitingForNda
            ? `Đã ký contract lúc ${formatDateTime(signedAt)}, chờ ký NDA`
            : "Đang chờ ký hợp đồng"}
      </p>
    </div>
  );
}

export function CreateDisputeInline({
  contractId,
  milestoneId,
}: {
  contractId: number;
  milestoneId?: number;
}) {
  const [open, setOpen] = useState(false);

  const submit = async () => {
    await disputeApi.create({
      contractId,
      milestoneId,
      initiatedBy: "BUSINESS",
      initiationType: "OTHER",
    });
    setOpen(false);
  };

  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>
        <Gavel className="h-4 w-4" />
        Khiếu nại
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Tạo dispute"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Hủy
            </Button>
            <Button variant="danger" onClick={submit}>
              Gửi tranh chấp
            </Button>
          </>
        }
      >
        <Notice tone="info" title="Bằng chứng được gửi sau khi tạo tranh chấp">
          Máy chủ hiện tạo tranh chấp theo hợp đồng và cột mốc. Bằng chứng sẽ được bổ sung tại màn hình chi tiết tranh chấp.
        </Notice>
      </Modal>
    </>
  );
}

export function ContractQuickLinks({ contract }: { contract: Contract }) {
  const links = [
    {
      to: `/app/contracts/${contract.contractId}`,
      label: "Chi tiết",
      icon: <FileText className="h-4 w-4" />,
    },
    {
      to: `/app/contracts/${contract.contractId}/workspace`,
      label: "Không gian làm việc",
      icon: <FileCheck2 className="h-4 w-4" />,
    },
    {
      to: "/app/finance",
      label: "Ký quỹ",
      icon: <WalletCards className="h-4 w-4" />,
    },
    { to: "/app/reviews", label: "Review", icon: <Star className="h-4 w-4" /> },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {links.map((link) => (
        <Link
          key={link.to}
          to={link.to}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-100 bg-white px-3 py-2 text-sm font-bold text-slate-600 transition hover:border-brand-100 hover:text-brand-700"
        >
          {link.icon}
          {link.label}
        </Link>
      ))}
      <span className="inline-flex items-center gap-2 rounded-2xl bg-mint-50 px-3 py-2 text-sm font-bold text-mint-600">
        <ReceiptText className="h-4 w-4" />
        Sẵn sàng giao dịch qua VNPay
      </span>
    </div>
  );
}

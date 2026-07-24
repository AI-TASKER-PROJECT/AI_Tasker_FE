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
    title: "1. Phạm vi thông tin bảo mật",
    body: "Thông tin bảo mật bao gồm tài liệu dự án, mã nguồn (source code), dữ liệu nghiệp vụ, tài khoản truy cập, quy trình vận hành, báo giá và mọi thông tin được chia sẻ trong quá trình hợp tác mà chưa công khai.",
  },
  {
    title: "2. Mục đích sử dụng",
    body: "Mọi thông tin chỉ được phép sử dụng để đánh giá, thực hiện, nghiệm thu và vận hành các công việc liên quan đến hợp đồng (contract) trên nền tảng AI Tasker. Không bên nào được sử dụng cho mục đích cá nhân hoặc chuyển giao cho bên thứ ba.",
  },
  {
    title: "3. Nghĩa vụ bảo vệ",
    body: "Hai bên cam kết bảo mật thông tin bằng các biện pháp hợp lý, giới hạn quyền truy cập theo nhu cầu công việc, không sao chép, phát tán, công bố hoặc cho phép người không có thẩm quyền tiếp cận.",
  },
  {
    title: "4. Ngoại lệ",
    body: "Nghĩa vụ bảo mật không áp dụng với thông tin đã công khai hợp pháp, thông tin đã nắm giữ hợp lệ trước khi nhận, hoặc thông tin buộc phải cung cấp theo yêu cầu của cơ quan có thẩm quyền.",
  },
  {
    title: "5. Hoàn trả và hủy dữ liệu",
    body: "Khi hợp đồng (contract) kết thúc hoặc khi bên cung cấp thông tin yêu cầu, bên nhận thông tin phải ngừng sử dụng, hoàn trả hoặc hủy các tài liệu và bản sao nằm ngoài phạm vi lưu trữ bắt buộc theo quy định pháp luật.",
  },
  {
    title: "6. Thời hạn ràng buộc",
    body: "Cam kết bảo mật có hiệu lực từ thời điểm xác nhận ký NDA trên hệ thống và tiếp tục duy trì trong 24 tháng kể từ ngày hợp đồng (contract) kết thúc, trừ khi hai bên có thỏa thuận khác bằng văn bản.",
  },
  {
    title: "7. Vi phạm",
    body: "Bên vi phạm phải chịu trách nhiệm đối với các thiệt hại phát sinh và phối hợp xử lý sự cố bảo mật theo quy trình của nền tảng và thỏa thuận giữa hai bên.",
  },
  {
    title: "8. Dữ liệu cá nhân và dữ liệu truy cập",
    body: "Các bên chỉ được thu thập, truy cập và xử lý dữ liệu cá nhân, thông tin liên hệ, thông tin đăng nhập, khóa API hoặc dữ liệu hệ thống trong phạm vi cần thiết cho hợp đồng. Không được dùng lại, bán, chia sẻ hoặc chuyển dữ liệu cho bên khác khi chưa có căn cứ hợp pháp và sự chấp thuận phù hợp.",
  },
  {
    title: "9. Source code, tài sản trí tuệ và dữ liệu đầu ra",
    body: "NDA này chỉ điều chỉnh nghĩa vụ bảo mật và không tự động chuyển giao quyền sở hữu trí tuệ. Quyền đối với source code, tài liệu, mô hình, dữ liệu, sản phẩm bàn giao và kết quả công việc được xác định theo nội dung contract, proposal và các thỏa thuận bằng văn bản giữa hai bên.",
  },
  {
    title: "10. Công cụ AI và bên thứ ba",
    body: "Không bên nào được đưa thông tin mật, source code, dữ liệu khách hàng hoặc dữ liệu production vào công cụ AI, kho mã nguồn, dịch vụ lưu trữ hay nền tảng của bên thứ ba nếu chưa được bên cung cấp thông tin cho phép. Trường hợp được phép, bên sử dụng phải áp dụng cấu hình bảo mật phù hợp và chịu trách nhiệm với nhà cung cấp phụ trợ của mình.",
  },
  {
    title: "11. Sự cố bảo mật",
    body: "Khi phát hiện truy cập trái phép, thất thoát, tiết lộ hoặc sử dụng sai mục đích thông tin mật, bên phát hiện phải thông báo sớm cho bên còn lại qua kênh liên hệ trên hệ thống, phối hợp khoanh vùng, bảo toàn bằng chứng và thực hiện biện pháp khắc phục hợp lý.",
  },
  {
    title: "12. Bằng chứng điện tử và liên hệ trên hệ thống",
    body: "Thời điểm ký NDA, lịch sử cập nhật, tệp đính kèm, nhật ký truy cập và thông báo được ghi nhận trên AI Tasker có thể được sử dụng để đối chiếu việc thực hiện nghĩa vụ bảo mật. Mỗi bên có trách nhiệm duy trì thông tin liên hệ và tài khoản của mình ở trạng thái chính xác, an toàn.",
  },
  {
    title: "13. Hủy ngang hợp đồng và bồi thường",
    body: "Hủy ngang là thao tác chấm dứt ngay hợp đồng đang ở trạng thái Đang hoạt động theo yêu cầu đơn phương của một bên. Mức bồi thường cố định là 10% tổng giá trị hợp đồng, được tính theo công thức: tổng giá trị hợp đồng × 10/100. Ví dụ, hợp đồng trị giá 1.000.000 đồng thì khoản bồi thường là 100.000 đồng. Nếu Doanh nghiệp hủy ngang, 100.000 đồng được khấu trừ từ khoản ký quỹ của Doanh nghiệp và chuyển cho Chuyên gia; khoản ký quỹ còn lại của hai bên được hoàn theo quy trình hệ thống. Nếu Chuyên gia hủy ngang, 100.000 đồng được khấu trừ từ khoản ký quỹ của Chuyên gia và chuyển cho Doanh nghiệp; khoản ký quỹ của Doanh nghiệp được hoàn theo quy trình hệ thống. Hệ thống chỉ thực hiện khi cả hai khoản ký quỹ đang được giữ, người yêu cầu xác nhận khoản phạt và hợp đồng không có yêu cầu chấm dứt, tranh chấp, mốc đang nghiệm thu hoặc mốc đang tranh chấp. Quy định này không áp dụng cho việc từ chối draft contract, hủy draft contract trước khi kích hoạt, hoặc chấm dứt theo thỏa thuận/quyết định của staff/admin.",
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
      return "Chờ Business quyết định";
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

export function calculateSecurityDeposit(totalBudget?: number) {
  return Math.round(Number(totalBudget || 0) * 20) / 100;
}

export function calculateExpertSecurityDeposit(totalBudget?: number) {
  return Math.round(Number(totalBudget || 0) * 10) / 100;
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
      title: "Contract đang có tranh chấp cần theo dõi.",
      description: `${activeDisputeCount} dispute chưa xử lý xong. Hai bên nên ưu tiên xử lý trước khi tiếp tục nghiệm thu/thanh toán.`,
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
      title: "Contract không còn tiếp tục thực hiện.",
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
        role === "EXPERT" ? "Bạn cần ký NDA." : "Đang chờ chuyên gia ký NDA.",
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
          ? `${underReviewCount} mốc đã có deliverable và đang Under Review.`
          : "Chuyên gia có thể tiếp tục thực hiện các mốc và gửi sản phẩm để doanh nghiệp nghiệm thu.",
    };
  }
  return {
    tone: "info",
    title: "Hợp đồng đang trong giai đoạn chuẩn bị.",
    description:
      "Theo dõi các điều kiện kích hoạt và action theo role ở bên dưới.",
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
        <Notice tone="info" title="Bang chung gui sau khi tao dispute">
          Backend hien tai tao dispute bang contractId va milestoneId. Bang chung se duoc them qua case attachments trong man chi tiet dispute.
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
      label: "Workspace",
      icon: <FileCheck2 className="h-4 w-4" />,
    },
    {
      to: "/app/finance",
      label: "Escrow",
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

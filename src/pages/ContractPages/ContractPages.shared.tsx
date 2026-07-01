import {
  CheckCircle2,
  FileCheck2,
  FileText,
  Gavel,
  LockKeyhole,
  ReceiptText,
  Star,
  WalletCards,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { disputeApi } from "../../lib/api";
import { formatDateTime } from "../../lib/utils";
import type { Contract, Milestone } from "../../types";
import { Button, Field, Modal, Textarea } from "../../components/ui";

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
];

export function normalizeContractStatus(status?: string) {
  const normalized = (status || "").trim().replace(/ /g, "_").toUpperCase();
  if (normalized === "DRAFT" || normalized === "NEGOTIATING") return "DRAFT";
  if (normalized === "PENDING" || normalized === "PENDINGDEPOSIT")
    return "PENDING";
  if (normalized === "ACTIVE") return "ACTIVE";
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
    case "IN_PROGRESS":
      return "Đang thực hiện";
    case "COMPLETED":
      return "Hoàn thành";
    case "CANCELLED":
      return "Đã hủy";
    case "TERMINATED":
      return "Kết thúc sớm";
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

export function ContractLifecycle({ status }: { status: string }) {
  const steps = ["DRAFT", "PENDING", "ACTIVE", "COMPLETED"];
  const labels: Record<string, string> = {
    DRAFT: "Draft",
    PENDING: "Cho ky quy",
    ACTIVE: "Active",
    COMPLETED: "Completed",
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
      {terminal && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 md:col-span-5">
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-rose-600" />
            <p className="text-sm font-extrabold text-rose-700">
              Contract đã dừng ở trạng thái {status}
            </p>
          </div>
        </div>
      )}
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
  if (contractStatus === "COMPLETED") {
    return {
      tone: "success",
      title: "Contract đã hoàn tất.",
      description: "Tất cả milestone đã hoàn thành theo logic backend.",
    };
  }
  if (contractStatus === "CANCELLED") {
    return {
      tone: "danger",
      title: "Contract không còn tiếp tục thực hiện.",
      description: `Trạng thái hiện tại là ${contract.status}.`,
    };
  }
  if (contractStatus === "PENDING") {
    return {
      tone: role === "BUSINESS" ? "warning" : "info",
      title:
        role === "BUSINESS"
          ? "Bạn cần thanh toán ký quỹ để kích hoạt contract."
          : "Đang chờ doanh nghiệp thanh toán ký quỹ.",
      description:
        "BE chỉ cho ký quỹ khi contract ở trạng thái PendingDeposit.",
    };
  }
  if (!businessAccepted) {
    return {
      tone: role === "BUSINESS" ? "warning" : "info",
      title:
        role === "BUSINESS"
          ? "Bạn cần chấp nhận contract."
          : "Đang chờ doanh nghiệp chấp nhận contract.",
      description:
        "Một trong 4 điều kiện kích hoạt contract vẫn chưa hoàn tất.",
    };
  }
  if (!expertAccepted) {
    return {
      tone: role === "EXPERT" ? "warning" : "info",
      title:
        role === "EXPERT"
          ? "Bạn cần chấp nhận contract."
          : "Đang chờ chuyên gia chấp nhận contract.",
      description:
        "Một trong 4 điều kiện kích hoạt contract vẫn chưa hoàn tất.",
    };
  }
  if (!businessNdaSigned) {
    return {
      tone: role === "BUSINESS" ? "warning" : "info",
      title:
        role === "BUSINESS"
          ? "Bạn cần ký NDA."
          : "Đang chờ doanh nghiệp ký NDA.",
      description: "BE lưu thời điểm ký NDA riêng cho từng bên.",
    };
  }
  if (!expertNdaSigned) {
    return {
      tone: role === "EXPERT" ? "warning" : "info",
      title:
        role === "EXPERT" ? "Bạn cần ký NDA." : "Đang chờ chuyên gia ký NDA.",
      description: "BE lưu thời điểm ký NDA riêng cho từng bên.",
    };
  }
  if (contractStatus === "ACTIVE") {
    return {
      tone: underReviewCount > 0 && role === "BUSINESS" ? "warning" : "success",
      title:
        underReviewCount > 0 && role === "BUSINESS"
          ? "Có milestone đang chờ nghiệm thu."
          : "Contract đang Active.",
      description:
        underReviewCount > 0
          ? `${underReviewCount} milestone đã có deliverable và đang Under Review.`
          : "Expert có thể submit deliverable trong workspace, business nghiệm thu milestone khi có submission.",
    };
  }
  return {
    tone: "info",
    title: "Contract đang trong giai đoạn chuẩn bị.",
    description:
      "Theo dõi các điều kiện kích hoạt và action theo role ở bên dưới.",
  };
}

export function ContractMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-100 p-4">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-2 font-display text-lg font-black text-ink">{value}</p>
    </div>
  );
}

export function OperationStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3.5">
      <p className="min-w-0 text-sm font-bold leading-5 text-slate-500">
        {label}
      </p>
      <p className="shrink-0 font-display text-lg font-black text-ink">
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

export function Participant({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 font-extrabold text-ink">{value}</p>
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
  const [evidenceReport, setEvidenceReport] = useState("");

  const submit = async () => {
    await disputeApi.create({
      contractId,
      milestoneId,
      evidenceReport,
      status: "Open",
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
              Gửi dispute
            </Button>
          </>
        }
      >
        <Field label="Bằng chứng / mô tả tranh chấp">
          <Textarea
            value={evidenceReport}
            onChange={(event) => setEvidenceReport(event.target.value)}
          />
        </Field>
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
        VNPay transaction ready
      </span>
    </div>
  );
}

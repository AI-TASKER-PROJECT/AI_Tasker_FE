import {
  BadgeCheck,
  CheckCircle2,
  CreditCard,
  FileText,
  ShoppingCart,
  Sparkles,
  Star,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  creditApi,
  getApiErrorMessage,
  membershipApi,
  walletApi,
} from "../../../services";
import { useSession } from "../../../context/sessionContext";
import { cn, formatCurrency } from "../../../lib/utils";
import type {
  MembershipPackage,
  PaymentActionResponse,
  MembershipPurchase,
  SystemWallet,
  UserQuota,
} from "../../../types";
import {
  Button,
  Card,
  Field,
  Input,
  Modal,
  Notice,
  PageHeader,
  SectionHeading,
} from "../../../components/ui";

// ── Package Card ─────────────────────────────────────────────────────────────

const packageGradients: Record<string, string> = {
  BUSINESS_STANDARD: "from-violet-400 to-violet-600",
  BUSINESS_PLUS: "from-brand-400 to-brand-600",
  BUSINESS_PREMIUM: "from-amber-400 to-amber-600",
  EXPERT_STANDARD: "from-violet-400 to-violet-600",
  EXPERT_PLUS: "from-brand-400 to-brand-600",
  EXPERT_PREMIUM: "from-amber-400 to-amber-600",
};

const packageIcons: Record<string, typeof Star> = {
  BUSINESS_STANDARD: BadgeCheck,
  BUSINESS_PLUS: Star,
  BUSINESS_PREMIUM: Sparkles,
  EXPERT_STANDARD: BadgeCheck,
  EXPERT_PLUS: Star,
  EXPERT_PREMIUM: Zap,
};

function PackageCard({
  pkg,
  onPurchase,
  purchasing,
}: {
  pkg: MembershipPackage;
  onPurchase: (pkg: MembershipPackage) => void;
  purchasing: boolean;
}) {
  const gradient =
    packageGradients[pkg.packageCode] ?? "from-brand-500 to-indigo-600";
  const IconComponent = packageIcons[pkg.packageCode] ?? Star;
  const isPremium = pkg.packageCode.includes("PREMIUM");

  return (
    <Card
      hover
      className={cn(
        "relative flex h-full flex-col overflow-hidden transition-all duration-300",
        isPremium && "ring-2 ring-amber-300 ring-offset-2",
      )}
    >
      {/* Badge nổi, không làm tăng chiều cao card */}
      {isPremium && (
        <div className="absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-full bg-white/20 px-4 py-1 text-xs font-black uppercase tracking-widest text-white backdrop-blur">
          ⭐ Khuyến nghị
        </div>
      )}

      {/* Header */}
      <div
        className={cn(
          "bg-gradient-to-br px-6 pb-6 pt-6 text-white min-h-[170px]",
          gradient,
        )}
      >
        <div className="flex items-start justify-between">
          <div>
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20 backdrop-blur">
              <IconComponent className="h-6 w-6" />
            </span>
            <h3 className="mt-3 font-display text-xl font-black">
              {pkg.packageName}
            </h3>
          </div>

          <div className="text-right">
            <p className="font-display text-3xl font-black">
              {formatCurrency(pkg.price)}
            </p>
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div className="flex flex-grow flex-col p-5">
        <ul className="space-y-3">
          <li className="flex items-center gap-2.5 text-sm">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-mint-500" />
            <span className="font-semibold text-slate-700">
              Badge xác minh · {pkg.badgeDurationDays} ngày
            </span>
          </li>

          {pkg.jobPostQuota > 0 && (
            <li className="flex items-center gap-2.5 text-sm">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-mint-500" />
              <span className="font-semibold text-slate-700">
                {pkg.jobPostQuota} job-post credits
              </span>
            </li>
          )}

          {pkg.proposalQuota > 0 && (
            <li className="flex items-center gap-2.5 text-sm">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-mint-500" />
              <span className="font-semibold text-slate-700">
                {pkg.proposalQuota} proposal credits
              </span>
            </li>
          )}

          {pkg.recommendVisibility && (
            <li className="flex items-center gap-2.5 text-sm">
              <Sparkles className="h-4 w-4 shrink-0 text-amber-500" />
              <span className="font-bold text-amber-700">
                AI Expert Recommendation
              </span>
            </li>
          )}
        </ul>

        <div className="mt-auto pt-5">
          <Button
            className="h-12 w-full rounded-xl border-2 border-transparent bg-[#b30069] px-6 text-[15px] font-bold text-white transition-all hover:-translate-y-1 hover:border-[#b30069] hover:bg-white hover:text-[#b30069] hover:shadow-lg"
            onClick={() => onPurchase(pkg)}
            loading={purchasing}
            disabled={purchasing}
          >
            <ShoppingCart className="h-4 w-4" />
            Mua ngay · {formatCurrency(pkg.price)}
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ── Credit Purchase Modal ─────────────────────────────────────────────────────

function CreditPurchaseModal({
  open,
  onClose,
  role,
  wallet,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  role: "BUSINESS" | "EXPERT";
  wallet: SystemWallet | null;
  onSuccess: () => void | Promise<void>;
}) {
  const [quantity, setQuantity] = useState("1");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PaymentActionResponse<UserQuota> | null>(
    null,
  );
  const [notice, setNotice] = useState<{
    tone: "info" | "success" | "warning" | "danger";
    msg: string;
  } | null>(null);

  const unitPrice = role === "BUSINESS" ? 200 : 100;
  const creditType =
    role === "BUSINESS" ? "Job-post credit" : "Proposal credit";
  const total = (Number(quantity) || 0) * unitPrice;

  const handleClose = () => {
    setQuantity("1");
    setNotice(null);
    setResult(null);
    onClose();
  };

  const purchase = async () => {
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty <= 0) {
      setNotice({ tone: "danger", msg: "Vui lòng nhập số lượng hợp lệ." });
      return;
    }
    setLoading(true);
    setNotice(null);
    try {
      const res =
        role === "BUSINESS"
          ? await creditApi.purchaseJobPost(qty)
          : await creditApi.purchaseProposal(qty);
      setResult(res);
      if (res.completed) {
        setNotice({
          tone: "success",
          msg: `Mua thành công ${qty} ${creditType}!`,
        });
        await onSuccess();
        window.dispatchEvent(new Event("aitasker:reload-wallet"));
      } else if (res.needTopup) {
        setNotice({
          tone: "warning",
          msg: `Số dư không dủ. Cần thêm ${formatCurrency(res.missingAmount ?? 0)}.`,
        });
      }
    } catch (err) {
      setNotice({ tone: "danger", msg: paymentErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  };

  const openTopup = () => {
    handleClose();
    window.dispatchEvent(new Event("aitasker:open-wallet-topup"));
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`Mua ${creditType}`}
      description={`Đơn giá: ${formatCurrency(unitPrice)} / credit. Credits không hết hạn.`}
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>
            Hủy
          </Button>
          <Button
            onClick={purchase}
            loading={loading}
            disabled={loading || !!result?.completed}
          >
            <CreditCard className="h-4 w-4" />
            Thanh toán {formatCurrency(total)}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        {notice && <Notice tone={notice.tone} title={notice.msg} />}
        {wallet && (
          <div className="rounded-2xl bg-brand-50 p-4 ring-1 ring-brand-100">
            <p className="text-xs font-bold text-brand-600">Số dư khả dụng</p>
            <p className="mt-1 text-xl font-black text-brand-700">
              {formatCurrency(wallet.availableBalance)}
            </p>
          </div>
        )}
        <Field label="Số lượng credits">
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="icon"
              type="button"
              onClick={() =>
                setQuantity((v) => String(Math.max(1, (Number(v) || 1) - 1)))
              }
            >
              −
            </Button>
            <Input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="text-center font-bold"
            />
            <Button
              variant="secondary"
              size="icon"
              type="button"
              onClick={() => setQuantity((v) => String((Number(v) || 1) + 1))}
            >
              +
            </Button>
          </div>
        </Field>
        <div className="rounded-2xl bg-slate-50 p-4 text-center">
          <p className="text-xs font-bold text-slate-500">Tổng thanh toán</p>
          <p className="mt-1 font-display text-2xl font-black text-ink">
            {formatCurrency(total)}
          </p>
        </div>
        {result?.needTopup && (
          <Button variant="secondary" onClick={openTopup}>
            <TrendingUp className="h-4 w-4" />
            Nạp tiền dể tiếp tục
          </Button>
        )}
      </div>
    </Modal>
  );
}

// ── MembershipPage ────────────────────────────────────────────────────────────

export function MembershipPage() {
  const session = useSession();
  const [packages, setPackages] = useState<MembershipPackage[]>([]);
  const [wallet, setWallet] = useState<SystemWallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<number | null>(null);
  const [purchaseResult, setPurchaseResult] = useState<{
    result: PaymentActionResponse<MembershipPurchase>;
    pkg: MembershipPackage;
  } | null>(null);
  const [creditModalOpen, setCreditModalOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pkgs, w] = await Promise.allSettled([
        membershipApi.listPackages(),
        walletApi.current(),
      ]);
      if (pkgs.status === "fulfilled") setPackages(pkgs.value);
      if (w.status === "fulfilled") setWallet(w.value);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const handlePurchase = async (pkg: MembershipPackage) => {
    setPurchasing(pkg.packageId);
    try {
      const result = await membershipApi.purchasePackage(pkg.packageId);
      setPurchaseResult({ result, pkg });
      if (result.completed) {
        localStorage.setItem("aitasker_active_package", pkg.packageName);
        await load();
        window.dispatchEvent(new Event("aitasker:reload-wallet"));
      }
    } catch (err) {
      setPurchaseResult({
        result: {
          completed: false,
          needTopup: false,
          currentBalance: 0,
          requiredAmount: 0,
          missingAmount: 0,
          message: paymentErrorMessage(err),
        },
        pkg,
      });
    } finally {
      setPurchasing(null);
    }
  };

  const openTopup = () => {
    setPurchaseResult(null);
    window.dispatchEvent(new Event("aitasker:open-wallet-topup"));
  };

  if (!session) return null;
  const role = session.role;
  const isExternalRole = role === "BUSINESS" || role === "EXPERT";
  const creditType = role === "BUSINESS" ? "lượt đăng bài" : "lượt nộp đề xuất";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Membership & Credits"
        title="Gói thành viên"
        description="Nâng cấp tài khoản dể nhận badge xác minh, credits dăng job, nộp proposal và tính năng AI dộc quyền."
      />

      {/* Wallet balance hint */}
      {wallet && (
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3 rounded-2xl bg-brand-50 px-4 py-2.5 ring-1 ring-brand-100">
              <span className="text-xs font-bold text-brand-600">
                Số dư khả dụng:
              </span>
              <span className="font-display text-lg font-black text-brand-700">
                {formatCurrency(wallet.availableBalance)}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Packages grid */}
      {loading ? (
        <div className="py-20 text-center text-sm font-semibold text-slate-400">
          Đang tải danh sách gói...
        </div>
      ) : packages.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-sm font-semibold text-slate-400">
            Chưa có gói thành viên nào dược cấu hình cho vai trò của bạn.
          </p>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {packages.map((pkg) => (
            <PackageCard
              key={pkg.packageId}
              pkg={pkg}
              onPurchase={handlePurchase}
              purchasing={purchasing === pkg.packageId}
            />
          ))}
        </div>
      )}

      {/* Credits info section */}
      {isExternalRole && (
        <Card className="p-6">
          <SectionHeading
            title={`Mua thêm ${creditType}`}
            description="Credits không di kèm gói thành viên. Mua lẻ theo nhu cầu thực tế."
          />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 p-4">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                  {role === "BUSINESS" ? (
                    <FileText className="h-5 w-5" />
                  ) : (
                    <FileText className="h-5 w-5" />
                  )}
                </span>
                <div>
                  <p className="text-sm text-slate-500">
                    {role === "BUSINESS"
                      ? "200 VND / 1 credit"
                      : "100 VND / 1 credit"}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-400">
                {role === "BUSINESS"
                  ? "Dùng dể đăng dự án mới. Mỗi 1 lần đăng tiêu tốn 1 credit."
                  : "Dùng dể nộp proposal. Mỗi 1 lần nộp proposal tiêu tốn 1 credit."}
              </p>
            </div>
            <div className="flex items-center justify-center rounded-2xl bg-gradient-to-br from-brand-50 to-indigo-50 p-4">
              <Button
                onClick={() => setCreditModalOpen(true)}
                className="h-12 w-full rounded-xl border-2 border-transparent bg-[#b30069] px-6 text-[15px] font-bold text-white transition-all hover:-translate-y-1 hover:border-[#b30069] hover:bg-white hover:text-[#b30069] hover:shadow-lg"
              >
                <ShoppingCart className="h-4 w-4" />
                Mua {creditType}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Purchase result modal */}
      {purchaseResult && (
        <Modal
          open
          onClose={() => {
            setPurchaseResult(null);
            load();
          }}
          title={
            purchaseResult.result.completed
              ? "Mua gói thành công!"
              : "Không thể mua gói"
          }
          footer={
            <div className="flex gap-2">
              {purchaseResult.result.needTopup && (
                <Button onClick={openTopup}>
                  <TrendingUp className="h-4 w-4" />
                  Nạp tiền
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={() => {
                  setPurchaseResult(null);
                  load();
                }}
              >
                {purchaseResult.result.completed ? "Xong" : "Đóng"}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            {purchaseResult.result.completed ? (
              <>
                <div className="flex flex-col items-center gap-3 py-4 text-center">
                  <span className="grid h-16 w-16 place-items-center rounded-3xl bg-mint-50">
                    <CheckCircle2 className="h-8 w-8 text-mint-500" />
                  </span>
                  <div>
                    <p className="font-display text-xl font-black text-ink">
                      {purchaseResult.pkg.packageName}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Đã thanh toán {formatCurrency(purchaseResult.pkg.price)}{" "}
                      từ ví.
                    </p>
                  </div>
                </div>
                <Notice tone="success" title="Badge xác minh dã dược kích hoạt">
                  Badge sẽ hiển thị trên hồ sơ của bạn trong{" "}
                  {purchaseResult.pkg.badgeDurationDays} ngày tới.
                </Notice>
              </>
            ) : (
              <>
                <Notice
                  tone={purchaseResult.result.needTopup ? "warning" : "danger"}
                  title={
                    purchaseResult.result.message ??
                    "Không thể hoàn tất giao dịch"
                  }
                >
                  {purchaseResult.result.needTopup && (
                    <>
                      Số dư hiện tại:{" "}
                      <strong>
                        {formatCurrency(purchaseResult.result.currentBalance)}
                      </strong>
                      . Cần thêm:{" "}
                      <strong>
                        {formatCurrency(purchaseResult.result.missingAmount)}
                      </strong>
                    </>
                  )}
                </Notice>
              </>
            )}
          </div>
        </Modal>
      )}

      {/* Credit purchase modal */}
      {isExternalRole && (
        <CreditPurchaseModal
          open={creditModalOpen}
          onClose={() => setCreditModalOpen(false)}
          role={role as "BUSINESS" | "EXPERT"}
          wallet={wallet}
          onSuccess={load}
        />
      )}
    </div>
  );
}

function paymentErrorMessage(error: unknown) {
  const message = getApiErrorMessage(error);
  const normalized = message.toUpperCase();
  if (normalized.includes("CHUA CO TAI KHOAN ADMIN DE NHAN DOANH THU")) {
    return "Chưa cấu hình tài khoản quản trị nhận doanh thu.";
  }
  if (normalized.includes("INSUFFICIENT_BALANCE")) {
    return "Số dư ví không đủ để hoàn tất giao dịch.";
  }
  if (normalized.includes("PACKAGE_NOT_FOUND")) {
    return "Gói thành viên không còn khả dụng. Vui lòng tải lại danh sách gói.";
  }
  if (normalized.includes("INVALID_ROLE")) {
    return "Vai trò hiện tại không phù hợp với gói hoặc lượt mua này.";
  }
  return message;
}

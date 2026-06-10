import {
  ArrowRight,
  Building2,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
  CheckCircle2,
} from "lucide-react";
import { FormEvent, useCallback, useState, useEffect, type ReactNode } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { GoogleAuthButton } from "../components/GoogleAuthButton";
import { Logo } from "../components/Logo";
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  LinkButton,
  Notice,
  Select,
} from "../components/ui";
import { authApi } from "../lib/api";
import { getSession, saveSession } from "../lib/session";

export function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const login = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const session = await authApi.login({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      saveSession(session);
      navigate("/app");
    } catch {
      setMessage(
        "Không thể đăng nhập. Kiểm tra lại back-end hoặc thông tin tài khoản.",
      );
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = useCallback(
    async (credential: string) => {
      setLoading(true);
      setMessage("");
      try {
        const session = await authApi.googleLogin(credential);
        saveSession(session);
        navigate("/app");
      } catch {
        setMessage("Không thể đăng nhập bằng Google. Vui lòng thử lại.");
      } finally {
        setLoading(false);
      }
    },
    [navigate],
  );

  if (getSession()) return <Navigate to="/app" replace />;

  return (
    <AuthFrame
      title="Đăng nhập AITASKER"
      description="JWT role sẽ quyết định dashboard: Business, Expert, Staff hoặc Admin."
    >
      <form onSubmit={login} className="grid gap-4">
        {message && <Notice tone="danger" title={message} />}
        <Field label="Email">
          <Input
            type="email"
            value={form.email}
            onChange={(event) =>
              setForm((value) => ({ ...value, email: event.target.value }))
            }
            required
          />
        </Field>
        <Field label="Mật khẩu">
          <Input
            type="password"
            minLength={8}
            value={form.password}
            onChange={(event) =>
              setForm((value) => ({ ...value, password: event.target.value }))
            }
            required
          />
        </Field>
        <Button type="submit" size="lg" loading={loading}>
          Đăng nhập <ArrowRight className="h-4 w-4" />
        </Button>
      </form>
      <AuthDivider />
      <GoogleAuthButton
        mode="login"
        onCredential={loginWithGoogle}
        onError={(errorMessage) => setMessage(errorMessage)}
      />
      <p className="mt-6 text-center text-sm text-slate-500">
        Chưa có tài khoản?{" "}
        <Link to="/register" className="font-bold text-brand-600">
          Đăng ký
        </Link>
      </p>
    </AuthFrame>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"FORM" | "OTP">("FORM");
  const [form, setForm] = useState({
    email: "",
    password: "",
    fullName: "",
    phone: "",
    role: "BUSINESS" as "BUSINESS" | "EXPERT",
    otp: "", 
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"danger" | "success">("danger");
  
  // State lưu thời gian đếm ngược
  const [countdown, setCountdown] = useState(0);

  // =========================================================================
  // BỘ ĐẾM THỜI GIAN (Giảm 1s mỗi 1 giây khi ở bước OTP)
  // =========================================================================
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (step === "OTP" && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    
    return () => clearInterval(timer);
  }, [step, countdown]);

  // =========================================================================
  // ĐĂNG KÝ BƯỚC 1: Kiểm tra Email -> Gửi thông tin & Nhận OTP
  // =========================================================================
  const handleRegisterSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    
    const normalizedEmail = form.email.trim().toLowerCase();

    try {
      // 1. Gọi API kiểm tra email trước
      // LƯU Ý: Đảm bảo authApi.checkEmail trả về đúng giá trị data từ axios
      const isEmailAvailable = await authApi.checkEmail(normalizedEmail);
      
      // Giả sử BE trả về true nếu email hợp lệ (chưa tồn tại), false nếu đã có người dùng
      // Nếu authApi trả về toàn bộ response từ axios, bạn cần check isEmailAvailable.data
      if (!isEmailAvailable /* hoặc !isEmailAvailable.data */) {
        setMessageTone("danger");
        setMessage("Email này đã được sử dụng. Vui lòng chọn email khác.");
        setLoading(false);
        return; // Dừng lại, không gửi OTP
      }

      // 2. Nếu email hợp lệ, tiếp tục gửi OTP
      const response = await authApi.sendOtp({
        email: normalizedEmail,
      });

      setStep("OTP");
      setCountdown((response as any)?.data?.expiresIn || (response as any)?.expiresIn || 60);
      setMessageTone("success");
      setMessage(`Mã OTP đã được gửi đến email ${normalizedEmail}. Vui lòng kiểm tra hộp thư.`);
    } catch (error) {
      setMessageTone("danger");
      setMessage("Không thể kiểm tra email hoặc gửi mã OTP. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };
  // =========================================================================
  // XỬ LÝ GỬI LẠI MÃ OTP
  // =========================================================================
  const handleResendOtp = async () => {
    setLoading(true);
    setMessage("");
    try {
      const response = await authApi.sendOtp({
        email: form.email.trim().toLowerCase(),
      });

      setCountdown((response as any)?.data?.expiresIn || (response as any)?.expiresIn || 60);

      setMessageTone("success");
      setMessage("Mã OTP mới đã được gửi. Vui lòng kiểm tra hộp thư.");
    } catch {
      setMessageTone("danger");
      setMessage("Lỗi khi gửi lại mã OTP. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // ĐĂNG KÝ BƯỚC 2: Xác thực OTP rồi tự động Đăng ký
  // =========================================================================
  const handleVerifyOtp = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      // 1. Gọi API xác thực OTP
      await authApi.verifyOtp({
        email: form.email.trim().toLowerCase(),
        otp: form.otp.trim(),
      });

      // 2. Nếu OTP đúng, gọi API đăng ký
      const session = await authApi.register({
        email: form.email.trim().toLowerCase(),
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        password: form.password,
        role: form.role,
      });

      saveSession(session);
      navigate(
        form.role === "BUSINESS"
          ? "/app/business/profile"
          : "/app/expert/profile"
      );
    } catch (error) {
      setMessageTone("danger");
      setMessage(
        "Xác thực thất bại: Mã OTP không hợp lệ hoặc email đã tồn tại."
      );
    } finally {
      setLoading(false);
    }
  };

  if (getSession()) return <Navigate to="/app" replace />;

  return (
    <AuthFrame
      title={step === "FORM" ? "Tạo tài khoản theo vai trò" : "Xác thực Email"}
      description={
        step === "FORM"
          ? "REG-01 yêu cầu khóa chặt email với một vai trò đã chọn."
          : "Vui lòng nhập mã gồm 6 chữ số vừa được gửi tới email của bạn."
      }
    >
      {message && (
        <Notice tone={messageTone} title={message} className="mb-4" />
      )}

      {step === "FORM" ? (
        // ---------------------------------------------------------------------
        // GIAO DIỆN BƯỚC 1: ĐIỀN FORM
        // ---------------------------------------------------------------------
        <>
          <div className="mb-5 grid grid-cols-2 gap-3">
            <RoleCard
              active={form.role === "BUSINESS"}
              icon={<Building2 className="h-5 w-5" />}
              title="Doanh nghiệp"
              desc="Đăng job, quản lý proposal, hợp đồng và escrow."
              onClick={() =>
                setForm((value) => ({ ...value, role: "BUSINESS" }))
              }
            />
            <RoleCard
              active={form.role === "EXPERT"}
              icon={<UserRoundCheck className="h-5 w-5" />}
              title="Chuyên gia"
              desc="Tạo portfolio, nộp proposal, bàn giao sản phẩm."
              onClick={() => setForm((value) => ({ ...value, role: "EXPERT" }))}
            />
          </div>

          <form onSubmit={handleRegisterSubmit} className="grid gap-4">
            <Field label="Họ tên">
              <Input
                value={form.fullName}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    fullName: event.target.value,
                  }))
                }
                required
              />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Email">
                <Input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm((value) => ({
                      ...value,
                      email: event.target.value,
                    }))
                  }
                  required
                />
              </Field>
              <Field label="Số điện thoại">
                <Input
                  value={form.phone}
                  onChange={(event) =>
                    setForm((value) => ({
                      ...value,
                      phone: event.target.value,
                    }))
                  }
                  required
                />
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Mật khẩu" hint="Tối thiểu 8 ký tự">
                <Input
                  type="password"
                  minLength={8}
                  value={form.password}
                  onChange={(event) =>
                    setForm((value) => ({
                      ...value,
                      password: event.target.value,
                    }))
                  }
                  required
                />
              </Field>
              <Field label="Vai trò">
                <Select
                  value={form.role}
                  onChange={(event) =>
                    setForm((value) => ({
                      ...value,
                      role: event.target.value as "BUSINESS" | "EXPERT",
                    }))
                  }
                >
                  <option value="BUSINESS">Doanh nghiệp</option>
                  <option value="EXPERT">Chuyên gia</option>
                </Select>
              </Field>
            </div>
            <Button type="submit" size="lg" loading={loading}>
              Tạo tài khoản <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Đã có tài khoản?{" "}
            <Link to="/login" className="font-bold text-brand-600">
              Đăng nhập
            </Link>
          </p>
        </>
      ) : (
        // ---------------------------------------------------------------------
        // GIAO DIỆN BƯỚC 2: NHẬP OTP (CÓ ĐỒNG HỒ & NÚT GỬI LẠI)
        // ---------------------------------------------------------------------
        <form onSubmit={handleVerifyOtp} className="grid gap-4">
          <Field label="Mã xác thực (OTP)" hint="Mã có 6 chữ số">
            <Input
              type="text"
              maxLength={6}
              value={form.otp}
              onChange={(event) =>
                setForm((value) => ({ ...value, otp: event.target.value }))
              }
              placeholder="VD: 123456"
              autoFocus
              required
              className="text-center text-2xl tracking-widest font-mono"
            />
          </Field>

          <div className="flex flex-col gap-3 mt-2">
            <Button type="submit" size="lg" loading={loading}>
              Xác thực Email <CheckCircle2 className="h-4 w-4 ml-2" />
            </Button>

            {/* Khối hiển thị Đồng hồ đếm ngược hoặc Nút gửi lại */}
            <div className="text-center text-sm my-1">
              {countdown > 0 ? (
                <span className="text-slate-500">
                  Chưa nhận được mã? Gửi lại sau <strong className="text-slate-700">{countdown}s</strong>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading}
                  className="font-semibold text-brand-600 hover:text-brand-700 transition-colors"
                >
                  Gửi lại mã OTP
                </button>
              )}
            </div>

            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setStep("FORM");
                setMessage("");
                setForm((prev) => ({ ...prev, otp: "" }));
                setCountdown(0); // Xóa đồng hồ khi quay lại
              }}
              disabled={loading}
              className="text-slate-500"
            >
              Quay lại chỉnh sửa thông tin
            </Button>
          </div>
        </form>
      )}
    </AuthFrame>
  );
}

function AuthDivider() {
  return (
    <div className="my-5 flex items-center gap-3">
      <span className="h-px flex-1 bg-slate-100" />
      <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-400">
        Hoặc
      </span>
      <span className="h-px flex-1 bg-slate-100" />
    </div>
  );
}

function AuthFrame({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#f7faff] px-4 py-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1fr_1.05fr]">
        <Card className="relative overflow-hidden bg-gradient-to-br from-brand-600 to-indigo-700 p-8 text-white lg:min-h-[720px]">
          <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-white/15 blur-3xl" />
          <div className="relative z-10">
            <Logo className="[&_*]:text-white" />
            <Badge tone="mint" className="mt-10">
              <Sparkles className="h-3.5 w-3.5" />
              Role-based workspace
            </Badge>
            <h1 className="mt-6 font-display text-4xl font-black tracking-[-0.05em]">
              Một tài khoản, một vai trò, một luồng nghiệp vụ rõ ràng.
            </h1>
            <p className="mt-5 max-w-md text-sm leading-7 text-blue-50">
              Sau đăng nhập, app tự điều hướng tới dashboard đúng role để tránh
              gọi chéo API sai thẩm quyền.
            </p>
            <img
              src="/images/ai-job-assistant.png"
              alt="AI job assistant"
              className="mt-10 w-full rounded-[2rem] shadow-2xl ring-1 ring-white/20"
            />
          </div>
        </Card>
        <div>
          <LinkButton to="/" variant="ghost" className="mb-5">
            ← Về trang chủ
          </LinkButton>
          <Card className="p-6 md:p-8">
            <div className="mb-6">
              <Badge tone="brand">
                <ShieldCheck className="h-3.5 w-3.5" />
                JWT + RBAC
              </Badge>
              <h2 className="mt-4 font-display text-3xl font-black tracking-tight text-ink">
                {title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {description}
              </p>
            </div>
            {children}
          </Card>
        </div>
      </div>
    </main>
  );
}

function RoleCard({
  active,
  icon,
  title,
  desc,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-3xl border p-4 text-left transition ${
        active
          ? "border-brand-200 bg-brand-50 ring-4 ring-brand-50"
          : "border-slate-100 hover:bg-slate-50"
      }`}
    >
      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-brand-600 shadow-sm">
        {icon}
      </span>
      <p className="mt-3 text-sm font-extrabold text-ink">{title}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{desc}</p>
    </button>
  );
}

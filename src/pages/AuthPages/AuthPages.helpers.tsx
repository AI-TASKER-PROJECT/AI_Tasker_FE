import {
  ArrowRight,
  Building2,
  UserRoundCheck,
  CheckCircle2,
} from "lucide-react";
import {
  FormEvent,
  useCallback,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { GoogleAuthButton } from "../../components/GoogleAuthButton";
import { Logo } from "../../components/Logo";
import {
  Button,
  Card,
  Field,
  Input,
  LinkButton,
  Notice,
  Select,
} from "../../components/ui";
import { authApi } from "../../lib/api";
import { decodeGoogleCredential } from "../../lib/googleAuth";
import { getSession, saveSession } from "../../lib/session";
function nameFromEmail(email?: string) {
  if (!email) return "";
  return email
    .split("@")[0]
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
function validatePhone(phone: string) {
  const phoneRegex = /^(03|05|07|08|09)\d{8}$/;
  return phoneRegex.test(phone);
}

type GoogleSignupDraft = {
  credential: string; //mã nhận từ gg
  email?: string;
  fullName: string;
  phone: string;
  role: "BUSINESS" | "EXPERT";
};

export function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [loginStep, setLoginStep] = useState<"LOGIN" | "GOOGLE_PROFILE">(
    "LOGIN",
  );

  const login = async (event: FormEvent) => {
    //login bth
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const session = await authApi.login({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      saveSession(session); //lưu session user
      navigate("/app"); // chuyển qua trang app
    } catch {
      setMessage(
        "Không thể đăng nhập. Kiểm tra lại back-end hoặc thông tin tài khoản.",
      );
    } finally {
      setLoading(false);
    }
  };

  const [googleSignup, setGoogleSignup] = useState<GoogleSignupDraft | null>(
    null,
  );

  const loginWithGoogle = useCallback(
    //login bằng google
    async (credential: string) => {
      setLoading(true);
      setMessage("");
      try {
        const payload = decodeGoogleCredential(credential);
        const email = payload.email.trim().toLowerCase();
        const emailExists = await authApi.checkEmail(email);

        if (emailExists) {
          //check email có tồn tại không
          const session = await authApi.googleSignup({
            credential,
            fullName: payload.name || nameFromEmail(email),
            phone: "",
            role: "BUSINESS",
          });
          saveSession(session); // có thì lưu session
          navigate("/app"); //chuyển hướng qua giao diện app
          return;
        }

        setGoogleSignup({
          credential,
          email,
          fullName: payload.name || nameFromEmail(email),
          phone: "",
          role: "BUSINESS",
        });
        setLoginStep("GOOGLE_PROFILE");
      } catch {
        setMessage("Không thể đăng nhập bằng Google. Vui lòng thử lại.");
      } finally {
        setLoading(false);
      }
    },
    [navigate],
  );
  const submitGoogleSignup = async (event: FormEvent) => {
    //chưa có tk thì dki
    event.preventDefault();
    if (!googleSignup) return;
    if (!validatePhone(googleSignup.phone.trim())) {
      setPhoneError("Số điện thoại không đúng định dạng (VD: 0912345678).");
      return;
    }
    setLoading(true);
    setMessage("");

    const phoneRegex = /^0[35789]\d{8}$/;
    if (!phoneRegex.test(googleSignup.phone.trim())) {
      setMessage("Số điện thoại không hợp lệ (phải có 10 số, bắt đầu bằng 03, 05, 07, 08 hoặc 09).");
      setLoading(false);
      return;
    }

    try {
      const session = await authApi.googleSignup({
        credential: googleSignup.credential,
        fullName:
          googleSignup.fullName.trim() || nameFromEmail(googleSignup.email),
        phone: googleSignup.phone.trim(),
        role: googleSignup.role,
      });

      saveSession(session);
      navigate("/app");
    } catch {
      setMessage("Không thể đăng ký bằng Google. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  if (getSession()) return <Navigate to="/app" replace />;

  return (
    <AuthFrame
      title={
        loginStep === "LOGIN"
          ? "Đăng nhập AITASKER"
          : "Hoàn tất thông tin Google"
      }
      description={
        loginStep === "LOGIN"
          ? "Đăng nhập vào hệ thống để sử dụng tính năng của nền tảng"
          : "Bổ sung thông tin liên hệ và vai trò dể tiếp tục với Google."
      }
    >
      {loginStep === "LOGIN" ? (
        <>
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
                  setForm((value) => ({
                    ...value,
                    password: event.target.value,
                  }))
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
        </>
      ) : (
        <form onSubmit={submitGoogleSignup} className="grid gap-4">
          {message && <Notice tone="danger" title={message} />}
          <Field
            label="Họ tên"
            hint="Nếu bỏ trống, hệ thống sẽ lấy tên từ email Google."
          >
            <Input
              value={googleSignup?.fullName || ""}
              onChange={(event) =>
                setGoogleSignup((value) =>
                  value ? { ...value, fullName: event.target.value } : value,
                )
              }
            />
          </Field>
          <Field label="Số điện thoại">
            <Input
              value={googleSignup?.phone || ""}
              onChange={(event) => {
                const val = event.target.value;
                if (/^\d*$/.test(val)) {
                  // Chỉ cho nhập số
                  setGoogleSignup((value) =>
                    value ? { ...value, phone: val } : value,
                  );
                  if (phoneError) setPhoneError("");
                }
              }}
              onBlur={(event) => {
                // Check format khi rời ô input
                const val = event.target.value;
                if (!val) {
                  setPhoneError("Số điện thoại không được để trống.");
                } else if (!validatePhone(val)) {
                  setPhoneError(
                    "Số điện thoại không đúng định dạng (VD: 0912345678).",
                  );
                }
              }}
              required
              placeholder="Nhập số điện thoại"
            />
            {phoneError && (
              <span className="text-xs text-red-500 mt-1 block">
                {phoneError}
              </span>
            )}
          </Field>
          <Field label="Vai trò">
            <Select
              value={googleSignup?.role || "BUSINESS"}
              onChange={(event) =>
                setGoogleSignup((value) =>
                  value
                    ? {
                        ...value,
                        role: event.target.value as "BUSINESS" | "EXPERT",
                      }
                    : value,
                )
              }
            >
              <option value="BUSINESS">Doanh nghiệp</option>
              <option value="EXPERT">Chuyên gia</option>
            </Select>
          </Field>
          <Button type="submit" size="lg" loading={loading}>
            Tiếp tục với Google <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setGoogleSignup(null);
              setLoginStep("LOGIN");
              setMessage("");
            }}
          >
            Quay lại đăng nhập
          </Button>
        </form>
      )}
    </AuthFrame>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [phoneError, setPhoneError] = useState("");
  const [step, setStep] = useState<"FORM" | "OTP" | "GOOGLE_PROFILE">("FORM");
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
  const [messageTone, setMessageTone] = useState<"danger" | "success">(
    "danger",
  );
  const [googleSignup, setGoogleSignup] = useState<GoogleSignupDraft | null>(
    null,
  );

  // State lưu thời gian dếm ngược
  const [countdown, setCountdown] = useState(0);

  const registerWithGoogle = useCallback(
    async (credential: string) => {
      setLoading(true);
      setMessage("");
      setMessageTone("danger");

      try {
        const payload = decodeGoogleCredential(credential);
        const email = payload.email.trim().toLowerCase();
        const emailExists = await authApi.checkEmail(email);

        if (emailExists) {
          const session = await authApi.googleSignup({
            credential,
            fullName: payload.name || nameFromEmail(email),
            phone: "",
            role: "BUSINESS",
          });
          saveSession(session);
          navigate("/app");
          return;
        }

        setGoogleSignup({
          credential,
          email,
          fullName:
            form.fullName.trim() || payload.name || nameFromEmail(email),
          phone: form.phone.trim(),
          role: form.role,
        });
        setStep("GOOGLE_PROFILE");
      } catch {
        setMessageTone("danger");
        setMessage("Không thể đăng ký bằng Google. Vui lòng thử lại.");
      } finally {
        setLoading(false);
      }
    },
    [form.fullName, form.phone, form.role, navigate],
  );

  const submitGoogleSignup = async (event: FormEvent) => {
    event.preventDefault();
    if (!googleSignup) return;
    if (!validatePhone(googleSignup.phone.trim())) {
      setPhoneError("Số điện thoại không đúng định dạng (VD: 0912345678).");
      return;
    }
    setLoading(true);
    setMessage("");
    setMessageTone("danger");

    const phoneRegex = /^0[35789]\d{8}$/;
    if (!phoneRegex.test(googleSignup.phone.trim())) {
      setMessageTone("danger");
      setMessage("Số điện thoại không hợp lệ (phải có 10 số, bắt đầu bằng 03, 05, 07, 08 hoặc 09).");
      setLoading(false);
      return;
    }

    try {
      const session = await authApi.googleSignup({
        credential: googleSignup.credential,
        fullName:
          googleSignup.fullName.trim() || nameFromEmail(googleSignup.email),
        phone: googleSignup.phone.trim(),
        role: googleSignup.role,
      });

      saveSession(session);
      navigate(
        googleSignup.role === "BUSINESS"
          ? "/app/business/profile"
          : "/app/expert/profile",
      );
    } catch {
      setMessageTone("danger");
      setMessage("Không thể đăng ký bằng Google. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

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
    if (!validatePhone(form.phone.trim())) {
      setPhoneError("Số điện thoại không đúng định dạng (VD: 0912345678).");
      return;
    }
    setLoading(true);
    setMessage("");

    const normalizedEmail = form.email.trim().toLowerCase();

    const phoneRegex = /^0[35789]\d{8}$/;
    if (!phoneRegex.test(form.phone.trim())) {
      setMessageTone("danger");
      setMessage("Số điện thoại không hợp lệ (phải có 10 số, bắt đầu bằng 03, 05, 07, 08 hoặc 09).");
      setLoading(false);
      return;
    }

    try {
      // 1. Gọi API kiểm tra email trước
      // LƯU Ý: Đảm bảo authApi.checkEmail trả về dúng giá trị data từ axios
      const emailExists = await authApi.checkEmail(normalizedEmail);

      // Giả sử BE trả về true nếu email hợp lệ (chưa tồn tại), false nếu đã có người dùng
      // Nếu authApi trả về toàn bộ response từ axios, bạn cần check isEmailAvailable.data
      if (emailExists) {
        setMessageTone("danger");
        setMessage("Email này đã dược sử dụng. Vui lòng chọn email khác.");
        setLoading(false);
        return; // Dừng lại, không gửi OTP
      }

      // 2. Nếu email hợp lệ, tiếp tục gửi OTP
      const response = await authApi.sendOtp({
        email: normalizedEmail,
      });

      setStep("OTP");

      // Lấy thời gian từ Back-end (phòng hờ cấu trúc trả về là response.data hoặc response trực tiếp)
      setCountdown(
        (response as any)?.data?.expiresIn ||
          (response as any)?.expiresIn ||
          60,
      );

      setMessageTone("success");
      setMessage(
        `Mã OTP đã dược gửi dến email ${form.email}. Vui lòng kiểm tra hộp thư.`,
      );
    } catch {
      setMessageTone("danger");
      setMessage(
        "Không thể gửi mã OTP. Kiểm tra xem email đã tồn tại hoặc trạng thái back-end.",
      );
    } finally {
      setLoading(false);
    }
  };
  // =========================================================================
  // X? L�G?I L?I M�OTP
  // =========================================================================
  const handleResendOtp = async () => {
    setLoading(true);
    setMessage("");
    try {
      const response = await authApi.sendOtp({
        email: form.email.trim().toLowerCase(),
      });

      setCountdown(
        (response as any)?.data?.expiresIn ||
          (response as any)?.expiresIn ||
          60,
      );

      setMessageTone("success");
      setMessage("Mã OTP mới đã dược gửi. Vui lòng kiểm tra hộp thư.");
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

      // 2. Nếu OTP dúng, gọi API đăng ký
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
          : "/app/expert/profile",
      );
    } catch {
      setMessageTone("danger");
      setMessage(
        "Xác thực thất bại: Mã OTP không hợp lệ hoặc email đã tồn tại.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (getSession()) return <Navigate to="/app" replace />;

  return (
    <AuthFrame
      title={
        step === "FORM"
          ? "Tạo tài khoản theo vai trò"
          : step === "GOOGLE_PROFILE"
            ? "Hoàn tất thông tin Google"
            : "Xác thực Email"
      }
      description={
        step === "FORM"
          ? "Yêu cầu email với một vai trò duy nhất đã chọn."
          : step === "GOOGLE_PROFILE"
            ? "Bổ sung thông tin liên hệ và vai trò dể tiếp tục với Google."
            : "Vui lòng nhập mã gồm 6 chữ số vừa dược gửi tới email của bạn."
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
                  onChange={(event) => {
                    const val = event.target.value;
                    if (/^\d*$/.test(val)) {
                      setForm((value) => ({ ...value, phone: val }));
                      if (phoneError) setPhoneError("");
                    }
                  }}
                  onBlur={(event) => {
                    const val = event.target.value;
                    if (!val) {
                      setPhoneError("Số điện thoại không được để trống.");
                    } else if (!validatePhone(val)) {
                      setPhoneError(
                        "Số điện thoại không đúng định dạng (VD: 0912345678).",
                      );
                    }
                  }}
                  required
                  placeholder="Nhập số điện thoại"
                />
                {phoneError && (
                  <span className="text-xs text-red-500 mt-1 block">
                    {phoneError}
                  </span>
                )}
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

          <AuthDivider />
          <GoogleAuthButton
            mode="register"
            onCredential={registerWithGoogle}
            onError={(errorMessage) => {
              setMessageTone("danger");
              setMessage(errorMessage);
            }}
          />

          <p className="mt-6 text-center text-sm text-slate-500">
            Đã có tài khoản?{" "}
            <Link to="/login" className="font-bold text-brand-600">
              Đăng nhập
            </Link>
          </p>
        </>
      ) : step === "GOOGLE_PROFILE" ? (
        <form onSubmit={submitGoogleSignup} className="grid gap-4">
          <Field
            label="Họ tên"
            hint="Nếu bỏ trống, hệ thống sẽ lấy tên từ email Google."
          >
            <Input
              value={googleSignup?.fullName || ""}
              onChange={(event) =>
                setGoogleSignup((value) =>
                  value ? { ...value, fullName: event.target.value } : value,
                )
              }
            />
          </Field>
          <Field label="Số điện thoại">
            <Input
              value={form.phone}
              onChange={(event) => {
                const val = event.target.value;
                if (/^\d*$/.test(val)) {
                  setForm((value) => ({ ...value, phone: val }));
                  if (phoneError) setPhoneError("");
                }
              }}
              onBlur={(event) => {
                const val = event.target.value;
                if (!val) {
                  setPhoneError("Số điện thoại không được để trống.");
                } else if (!validatePhone(val)) {
                  setPhoneError(
                    "Số điện thoại không đúng định dạng (VD: 0912345678).",
                  );
                }
              }}
              required
              placeholder="Nhập số điện thoại"
            />
            {phoneError && (
              <span className="text-xs text-red-500 mt-1 block">
                {phoneError}
              </span>
            )}
          </Field>
          <Field label="Vai trò">
            <Select
              value={googleSignup?.role || "BUSINESS"}
              onChange={(event) =>
                setGoogleSignup((value) =>
                  value
                    ? {
                        ...value,
                        role: event.target.value as "BUSINESS" | "EXPERT",
                      }
                    : value,
                )
              }
            >
              <option value="BUSINESS">Doanh nghiệp</option>
              <option value="EXPERT">Chuyên gia</option>
            </Select>
          </Field>
          <Button type="submit" size="lg" loading={loading}>
            Tiếp tục với Google <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setGoogleSignup(null);
              setStep("FORM");
              setMessage("");
            }}
            disabled={loading}
          >
            Quay lại tạo tài khoản
          </Button>
        </form>
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

            {/* Khối hiển thị Đồng hồ dếm ngược hoặc Nút gửi lại */}
            <div className="text-center text-sm my-1">
              {countdown > 0 ? (
                <span className="text-slate-500">
                  Chưa nhận dược mã? Gửi lại sau{" "}
                  <strong className="text-slate-700">{countdown}s</strong>
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
    <main className="relative flex min-h-screen items-center justify-center bg-[#f7faff] px-4 py-8">
      <div className="pointer-events-none fixed inset-0 z-0 opacity-10 [background-image:radial-gradient(#df0e84_1px,transparent_1px)] [background-size:32px_32px]" />
      <div className="relative z-10 mx-auto grid w-full max-w-6xl items-stretch gap-6 lg:grid-cols-2 lg:gap-8">
        <Card className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-600 to-indigo-700 p-6 text-white lg:min-h-[560px] lg:p-8">
          <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-white/15 blur-3xl" />
          <div className="relative z-10">
            <div className="flex flex-wrap items-center gap-4">
              <Logo className="[&_*]:text-white" />
            </div>
            <h1 className="mt-6 font-display text-3xl font-black leading-tight tracking-[-0.02em] lg:text-4xl">
              Một tài khoản, một vai trò, một luồng xử lý rõ ràng.
            </h1>
          </div>
          <div className="relative z-10 mt-6 lg:mt-8">
            <img
              src="/images/ai-job-assistant.png"
              alt="AI job assistant"
              className="w-full rounded-[1.5rem] shadow-2xl ring-1 ring-white/20"
            />
          </div>
        </Card>

        <Card className="flex flex-col p-6 shadow-xl shadow-slate-200/50 md:p-8 lg:min-h-[560px]">
          <div className="mb-2 flex justify-end">
            <LinkButton to="/" variant="ghost" className="text-sm">
              ← Về trang chủ
            </LinkButton>
          </div>
          <div className="mb-6">
            <h2 className="mt-4 font-display text-2xl font-black tracking-tight text-ink lg:text-3xl">
              {title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {description}
            </p>
          </div>
          <div className="flex-1">{children}</div>
        </Card>
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

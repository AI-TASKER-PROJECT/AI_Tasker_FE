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
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
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

function validateEmail(email: string) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePassword(password: string) {
  return password.length >= 8;
}

type GoogleSignupDraft = {
  credential: string; //mã nhận từ gg
  email?: string;
  fullName: string;
  phone: string;
  role: "BUSINESS" | "EXPERT";
};

const LOGIN_FAILED_ATTEMPT_LIMIT = 5;
const LOGIN_LOCAL_LOCK_MS = 5 * 60 * 1000;
const LOGIN_ATTEMPT_STORAGE_PREFIX = "aitasker:login-attempt:";

type LoginAttemptState = {
  attempts: number;
  lockUntil?: number;
};

function loginAttemptKey(email: string) {
  return `${LOGIN_ATTEMPT_STORAGE_PREFIX}${email.trim().toLowerCase()}`;
}

function readLoginAttemptState(email: string): LoginAttemptState {
  if (!email) return { attempts: 0 };
  try {
    const raw = localStorage.getItem(loginAttemptKey(email));
    if (!raw) return { attempts: 0 };
    const parsed = JSON.parse(raw) as LoginAttemptState;
    if (parsed.lockUntil && parsed.lockUntil <= Date.now()) {
      localStorage.removeItem(loginAttemptKey(email));
      return { attempts: 0 };
    }
    return {
      attempts: Number.isFinite(parsed.attempts) ? parsed.attempts : 0,
      lockUntil: parsed.lockUntil,
    };
  } catch {
    return { attempts: 0 };
  }
}

function writeLoginAttemptState(email: string, state: LoginAttemptState) {
  if (!email) return;
  localStorage.setItem(loginAttemptKey(email), JSON.stringify(state));
}

function clearLoginAttemptState(email: string) {
  if (!email) return;
  localStorage.removeItem(loginAttemptKey(email));
}

function recordFailedLoginAttempt(email: string): LoginAttemptState {
  const current = readLoginAttemptState(email);
  const attempts = current.attempts + 1;
  const next: LoginAttemptState =
    attempts >= LOGIN_FAILED_ATTEMPT_LIMIT
      ? { attempts, lockUntil: Date.now() + LOGIN_LOCAL_LOCK_MS }
      : { attempts };
  writeLoginAttemptState(email, next);
  return next;
}

function formatLockRemaining(lockUntil?: number) {
  if (!lockUntil) return "0s";
  const remainingSeconds = Math.max(
    0,
    Math.ceil((lockUntil - Date.now()) / 1000),
  );
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  if (minutes <= 0) return `${seconds}s`;
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialMessage =
    (location.state as { message?: string } | null)?.message || "";
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(initialMessage);
  const [messageTone, setMessageTone] = useState<"danger" | "success">(
    initialMessage ? "success" : "danger",
  );
  const [failedLoginAttempts, setFailedLoginAttempts] = useState(0);
  const [loginLockUntil, setLoginLockUntil] = useState<number | undefined>();
  const [loginLockClock, setLoginLockClock] = useState(() => Date.now());
  const [phoneError, setPhoneError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loginStep, setLoginStep] = useState<"LOGIN" | "GOOGLE_PROFILE">(
    "LOGIN",
  );
  const normalizedLoginEmail = form.email.trim().toLowerCase();
  const isLoginLocallyLocked =
    Boolean(loginLockUntil) && Number(loginLockUntil) > loginLockClock;
  const remainingLoginAttempts = Math.max(
    0,
    LOGIN_FAILED_ATTEMPT_LIMIT - failedLoginAttempts,
  );

  useEffect(() => {
    if (!isLoginLocallyLocked) return;
    const timer = window.setInterval(() => {
      setLoginLockClock(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isLoginLocallyLocked]);

  const login = async (event: FormEvent) => {
    //login bth
    event.preventDefault();
    if (isLoginLocallyLocked) {
      setMessageTone("danger");
      setMessage(
        `Bạn đã nhập sai mật khẩu quá ${LOGIN_FAILED_ATTEMPT_LIMIT} lần. Vui lòng thử lại sau ${formatLockRemaining(loginLockUntil)}.`,
      );
      return;
    }
    if (!validateEmail(form.email.trim())) {
      setEmailError("Email không đúng định dạng (VD: example@email.com).");
      return;
    }
    if (!validatePassword(form.password)) {
      setPasswordError("Mật khẩu phải có ít nhất 8 ký tự.");
      return;
    }
    setLoading(true);
    setMessage("");
    setMessageTone("danger");
    let emailChecked = false;
    try {
      const emailExists = await authApi.checkEmail(normalizedLoginEmail);
      emailChecked = true;
      if (!emailExists) {
        clearLoginAttemptState(normalizedLoginEmail);
        setFailedLoginAttempts(0);
        setLoginLockUntil(undefined);
        setMessage("Email không tồn tại trong hệ thống.");
        return;
      }

      const session = await authApi.login({
        email: normalizedLoginEmail,
        password: form.password,
      });
      clearLoginAttemptState(normalizedLoginEmail);
      setFailedLoginAttempts(0);
      setLoginLockUntil(undefined);
      saveSession(session); //lưu session user
      navigate("/app"); // chuyển qua trang app
    } catch (error) {
      if (!emailChecked) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Không thể kiểm tra email. Vui lòng thử lại.",
        );
        return;
      }
      const attemptState = recordFailedLoginAttempt(normalizedLoginEmail);
      setFailedLoginAttempts(attemptState.attempts);
      setLoginLockUntil(attemptState.lockUntil);
      setLoginLockClock(Date.now());
      const loginFailureMessage = attemptState.lockUntil
        ? `Bạn đã nhập sai mật khẩu ${LOGIN_FAILED_ATTEMPT_LIMIT} lần. Tạm khóa đăng nhập trên trình duyệt này trong ${formatLockRemaining(attemptState.lockUntil)}.`
        : `Mật khẩu không đúng. Còn ${
            LOGIN_FAILED_ATTEMPT_LIMIT - attemptState.attempts
          } lần thử trước khi tạm khóa.`;
      queueMicrotask(() => setMessage(loginFailureMessage));
      setMessageTone("danger");
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
      setMessageTone("danger");
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
        setMessageTone("danger");
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
      setPhoneError(
        "Số điện thoại không hợp lệ (phải có 10 số, bắt đầu bằng 03, 05, 07, 08 hoặc 09)",
      );
      return;
    }
    setLoading(true);
    setMessage("");
    setMessageTone("danger");

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
      setMessageTone("danger");
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
          <form onSubmit={login} className="grid gap-4" noValidate>
            {message && <Notice tone={messageTone} title={message} />}
            {isLoginLocallyLocked ? (
              <Notice
                tone="danger"
                title={`Đang tạm khóa đăng nhập trên trình duyệt này. Thử lại sau ${formatLockRemaining(loginLockUntil)}.`}
              />
            ) : failedLoginAttempts > 0 && !message ? (
              <Notice
                tone="danger"
                title={`Bạn đã nhập sai mật khẩu ${failedLoginAttempts} lần. Còn ${remainingLoginAttempts} lần thử trước khi tạm khóa.`}
              />
            ) : null}
            <Field label="Email">
              <Input
                type="email"
                value={form.email}
                onChange={(event) => {
                  const nextEmail = event.target.value;
                  const attemptState = readLoginAttemptState(nextEmail);
                  setForm((value) => ({ ...value, email: nextEmail }));
                  setFailedLoginAttempts(attemptState.attempts);
                  setLoginLockUntil(attemptState.lockUntil);
                  setLoginLockClock(Date.now());
                  if (emailError) setEmailError("");
                }}
                onBlur={(event) => {
                  const val = event.target.value.trim();
                  if (!val) {
                    setEmailError("Email không được để trống.");
                  } else if (!validateEmail(val)) {
                    setEmailError("Email không đúng định dạng (VD: example@email.com).");
                  }
                }}
                required
              />
              {emailError && (
                <span className="text-xs text-red-500 mt-1 block">
                  {emailError}
                </span>
              )}
            </Field>
            <Field label="Mật khẩu">
              <Input
                type="password"
                minLength={8}
                value={form.password}
                onChange={(event) => {
                  setForm((value) => ({
                    ...value,
                    password: event.target.value,
                  }));
                  if (passwordError) setPasswordError("");
                }}
                onBlur={(event) => {
                  const val = event.target.value;
                  if (!val) {
                    setPasswordError("Mật khẩu không được để trống.");
                  } else if (!validatePassword(val)) {
                    setPasswordError("Mật khẩu phải có ít nhất 8 ký tự.");
                  }
                }}
                required
              />
              {passwordError && (
                <span className="text-xs text-red-500 mt-1 block">
                  {passwordError}
                </span>
              )}
            </Field>
            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-sm font-bold text-brand-600 transition hover:text-brand-700"
              >
                Quên mật khẩu?
              </Link>
            </div>
            <Button
              type="submit"
              size="lg"
              loading={loading}
              disabled={isLoginLocallyLocked}
            >
              Đăng nhập <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
          <AuthDivider />
          <GoogleAuthButton
            mode="login"
            onCredential={loginWithGoogle}
            onError={(errorMessage) => {
              setMessageTone("danger");
              setMessage(errorMessage);
            }}
          />
          <p className="mt-6 text-center text-sm text-slate-500">
            Chưa có tài khoản?{" "}
            <Link to="/register" className="font-bold text-brand-600">
              Đăng ký
            </Link>
          </p>
        </>
      ) : (
        <form onSubmit={submitGoogleSignup} className="grid gap-4" noValidate>
          {message && <Notice tone={messageTone} title={message} />}
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
                    "Số điện thoại không hợp lệ (phải có 10 số, bắt đầu bằng 03, 05, 07, 08 hoặc 09)",
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

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"danger" | "success">(
    "success",
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!validateEmail(normalizedEmail)) {
      setEmailError("Email không đúng định dạng (VD: example@email.com).");
      return;
    }

    setLoading(true);
    setMessage("");
    setMessageTone("success");
    try {
      const emailExists = await authApi.checkEmail(normalizedEmail);
      if (!emailExists) {
        setMessageTone("danger");
        setMessage("Email không tồn tại trong hệ thống.");
        return;
      }

      await authApi.forgotPassword({ email: normalizedEmail });
      setMessage(
        "Hãy kiểm tra email của bạn để truy cập vào link đổi mật khẩu.",
      );
    } catch (error) {
      setMessageTone("danger");
      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể gửi yêu cầu đặt lại mật khẩu. Vui lòng thử lại.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (getSession()) return <Navigate to="/app" replace />;

  return (
    <AuthFrame
      title="Quên mật khẩu"
      description="Nhập email tài khoản để đặt lại mật khẩu!."
    >
      <form onSubmit={submit} className="grid gap-4" noValidate>
        {message && <Notice tone={messageTone} title={message} />}
        <Field label="Email">
          <Input
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (emailError) setEmailError("");
            }}
            onBlur={(event) => {
              const value = event.target.value.trim();
              if (!value) {
                setEmailError("Email không được để trống.");
              } else if (!validateEmail(value)) {
                setEmailError("Email không đúng định dạng (VD: example@email.com).");
              }
            }}
            required
          />
          {emailError && (
            <span className="mt-1 block text-xs text-red-500">
              {emailError}
            </span>
          )}
        </Field>
        <Button type="submit" size="lg" loading={loading}>
          Gửi link đặt lại mật khẩu <ArrowRight className="h-4 w-4" />
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        Đã nhớ mật khẩu?{" "}
        <Link to="/login" className="font-bold text-brand-600">
          Đăng nhập
        </Link>
      </p>
    </AuthFrame>
  );
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [form, setForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"danger" | "success">(
    "danger",
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) {
      setMessageTone("danger");
      setMessage("Link đặt lại mật khẩu không hợp lệ!");
      return;
    }
    if (!validatePassword(form.newPassword)) {
      setPasswordError("Mật khẩu phải có ít nhất 8 ký tự.");
      return;
    }
    if (form.confirmPassword !== form.newPassword) {
      setConfirmError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setLoading(true);
    setMessage("");
    setMessageTone("danger");
    try {
      await authApi.resetPassword({
        token,
        newPassword: form.newPassword,
      });
      navigate("/login", {
        replace: true,
        state: { message: "Mật khẩu đã được đặt lại. Vui lòng đăng nhập." },
      });
    } catch (error) {
      setMessageTone("danger");
      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể đặt lại mật khẩu. Link có thể đã hết hạn.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (getSession()) return <Navigate to="/app" replace />;

  return (
    <AuthFrame
      title="Dat lai mat khau"
      description="Nhập mật khẩu mới cho tài khoản của bạn."
    >
      <form onSubmit={submit} className="grid gap-4" noValidate>
        {message && <Notice tone={messageTone} title={message} />}
        {!token && (
          <Notice
            tone="danger"
            title="Link đặt lại mật khẩu không hợp lệ."
          />
        )}
        <Field label="Mật khẩu mới" hint="Tối thiểu 8 ký tự">
          <Input
            type="password"
            minLength={8}
            value={form.newPassword}
            onChange={(event) => {
              setForm((value) => ({
                ...value,
                newPassword: event.target.value,
              }));
              if (passwordError) setPasswordError("");
            }}
            required
          />
          {passwordError && (
            <span className="mt-1 block text-xs text-red-500">
              {passwordError}
            </span>
          )}
        </Field>
        <Field label="Xác nhận mật khẩu mới">
          <Input
            type="password"
            minLength={8}
            value={form.confirmPassword}
            onChange={(event) => {
              setForm((value) => ({
                ...value,
                confirmPassword: event.target.value,
              }));
              if (confirmError) setConfirmError("");
            }}
            required
          />
          {confirmError && (
            <span className="mt-1 block text-xs text-red-500">
              {confirmError}
            </span>
          )}
        </Field>
        <Button
          type="submit"
          size="lg"
          loading={loading}
          disabled={!token}
        >
          Dat lai mat khau <CheckCircle2 className="h-4 w-4" />
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        Muon nhan link moi?{" "}
        <Link to="/forgot-password" className="font-bold text-brand-600">
          Quen mat khau
        </Link>
      </p>
    </AuthFrame>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [phoneError, setPhoneError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [nameError, setNameError] = useState("");
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
      setPhoneError(
        "Số điện thoại không hợp lệ (phải có 10 số, bắt đầu bằng 03, 05, 07, 08 hoặc 09)",
      );
      return;
    }
    setLoading(true);
    setMessage("");
    setMessageTone("danger");

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
    if (!form.fullName.trim()) {
      setNameError("Họ tên không được để trống.");
      return;
    }
    if (!validateEmail(form.email.trim())) {
      setEmailError("Email không đúng định dạng (VD: example@email.com).");
      return;
    }
    if (!validatePhone(form.phone.trim())) {
      setPhoneError("Số điện thoại không đúng định dạng (VD: 0912345678).");
      return;
    }
    if (!validatePassword(form.password)) {
      setPasswordError("Mật khẩu phải có ít nhất 8 ký tự.");
      return;
    }
    setLoading(true);
    setMessage("");

    const normalizedEmail = form.email.trim().toLowerCase();

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

          <form
            onSubmit={handleRegisterSubmit}
            className="grid gap-4"
            noValidate
          >
            <Field label="Họ tên">
              <Input
                value={form.fullName}
                onChange={(event) => {
                  setForm((value) => ({
                    ...value,
                    fullName: event.target.value,
                  }));
                  if (nameError) setNameError("");
                }}
                onBlur={(event) => {
                  if (!event.target.value.trim()) {
                    setNameError("Họ tên không được để trống.");
                  }
                }}
                required
              />
              {nameError && (
                <span className="text-xs text-red-500 mt-1 block">
                  {nameError}
                </span>
              )}
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Email">
                <Input
                  type="email"
                  value={form.email}
                  onChange={(event) => {
                    setForm((value) => ({
                      ...value,
                      email: event.target.value,
                    }));
                    if (emailError) setEmailError("");
                  }}
                  onBlur={(event) => {
                    const val = event.target.value.trim();
                    if (!val) {
                      setEmailError("Email không được để trống.");
                    } else if (!validateEmail(val)) {
                      setEmailError("Email không đúng định dạng (VD: example@email.com).");
                    }
                  }}
                  required
                />
                {emailError && (
                  <span className="text-xs text-red-500 mt-1 block">
                    {emailError}
                  </span>
                )}
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
                        "Số điện thoại không hợp lệ (phải có 10 số, bắt đầu bằng 03, 05, 07, 08 hoặc 09)",
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
                  onChange={(event) => {
                    setForm((value) => ({
                      ...value,
                      password: event.target.value,
                    }));
                    if (passwordError) setPasswordError("");
                  }}
                  onBlur={(event) => {
                    const val = event.target.value;
                    if (!val) {
                      setPasswordError("Mật khẩu không được để trống.");
                    } else if (!validatePassword(val)) {
                      setPasswordError("Mật khẩu phải có ít nhất 8 ký tự.");
                    }
                  }}
                  required
                />
                {passwordError && (
                  <span className="text-xs text-red-500 mt-1 block">
                    {passwordError}
                  </span>
                )}
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
        <form onSubmit={submitGoogleSignup} className="grid gap-4" noValidate>
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
                  setGoogleSignup((value) => value ? { ...value, phone: val } : value);
                  if (phoneError) setPhoneError("");
                }
              }}
              onBlur={(event) => {
                const val = event.target.value;
                if (!val) {
                  setPhoneError("Số điện thoại không được để trống.");
                } else if (!validatePhone(val)) {
                  setPhoneError(
                    "Số điện thoại không hợp lệ (phải có 10 số, bắt đầu bằng 03, 05, 07, 08 hoặc 09)",
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
        <form onSubmit={handleVerifyOtp} className="grid gap-4" noValidate>
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
              Một tài khoản - Một vai trò Một luồng xử lý rõ ràng
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

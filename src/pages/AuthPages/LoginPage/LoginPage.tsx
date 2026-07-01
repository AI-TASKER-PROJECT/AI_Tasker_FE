import { ArrowRight } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { GoogleAuthButton } from "../../../components/GoogleAuthButton";
import { Button, Field, Input, Notice, Select } from "../../../components/ui";
import { authApi } from "../../../lib/api";
import { decodeGoogleCredential } from "../../../lib/googleAuth";
import { getSession, saveSession } from "../../../lib/session";
import {
  AuthDivider,
  AuthFrame,
  formatLockRemaining,
  LOGIN_FAILED_ATTEMPT_LIMIT,
  nameFromEmail,
  readLoginAttemptState,
  recordFailedLoginAttempt,
  clearLoginAttemptState,
  type GoogleSignupDraft,
  validateEmail,
  validatePassword,
  validatePhone,
} from "../AuthPages.shared";

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

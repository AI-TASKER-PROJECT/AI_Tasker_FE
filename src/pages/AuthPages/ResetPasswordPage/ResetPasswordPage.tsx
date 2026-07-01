import { CheckCircle2 } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Button, Field, Input, Notice } from "../../../components/ui";
import { authApi } from "../../../lib/api";
import { getSession } from "../../../lib/session";
import { AuthFrame, validatePassword } from "../AuthPages.shared";

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

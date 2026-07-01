import { ArrowRight } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Button, Field, Input, Notice } from "../../../components/ui";
import { authApi } from "../../../lib/api";
import { getSession } from "../../../lib/session";
import { AuthFrame, validateEmail } from "../AuthPages.shared";

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

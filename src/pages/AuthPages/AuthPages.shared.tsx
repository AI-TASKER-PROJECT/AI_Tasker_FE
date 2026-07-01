import type { ReactNode } from "react";
import { LinkButton, Card } from "../../components/ui";
import { Logo } from "../../components/Logo";

export function nameFromEmail(email?: string) {
  if (!email) return "";
  return email
    .split("@")[0]
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function validatePhone(phone: string) {
  const phoneRegex = /^(03|05|07|08|09)\d{8}$/;
  return phoneRegex.test(phone);
}

export function validateEmail(email: string) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePassword(password: string) {
  return password.length >= 8;
}

export type GoogleSignupDraft = {
  credential: string; //m?? nh???n t??? gg
  email?: string;
  fullName: string;
  phone: string;
  role: "BUSINESS" | "EXPERT";
};

export const LOGIN_FAILED_ATTEMPT_LIMIT = 5;
const LOGIN_LOCAL_LOCK_MS = 5 * 60 * 1000;
const LOGIN_ATTEMPT_STORAGE_PREFIX = "aitasker:login-attempt:";

type LoginAttemptState = {
  attempts: number;
  lockUntil?: number;
};

function loginAttemptKey(email: string) {
  return `${LOGIN_ATTEMPT_STORAGE_PREFIX}${email.trim().toLowerCase()}`;
}

export function readLoginAttemptState(email: string): LoginAttemptState {
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

export function clearLoginAttemptState(email: string) {
  if (!email) return;
  localStorage.removeItem(loginAttemptKey(email));
}

export function recordFailedLoginAttempt(email: string): LoginAttemptState {
  const current = readLoginAttemptState(email);
  const attempts = current.attempts + 1;
  const next: LoginAttemptState =
    attempts >= LOGIN_FAILED_ATTEMPT_LIMIT
      ? { attempts, lockUntil: Date.now() + LOGIN_LOCAL_LOCK_MS }
      : { attempts };
  writeLoginAttemptState(email, next);
  return next;
}

export function formatLockRemaining(lockUntil?: number) {
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

export function AuthDivider() {
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

export function AuthFrame({
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

export function RoleCard({
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

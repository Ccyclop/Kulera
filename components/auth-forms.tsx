"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { Lock, Mail } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { Button, FormInput } from "@/components/ui";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/client";

const AUTH_UNAVAILABLE_MESSAGE = "ავტორიზაცია დროებით მიუწვდომელია. სცადე მოგვიანებით.";

function usernameFromEmail(email: string) {
  const prefix = email.split("@")[0] ?? "user";
  const safePrefix = prefix.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${safePrefix || "user"}-${Math.random().toString(36).slice(2, 8)}`;
}

function AuthMessage({ error, message }: { error?: string | null; message?: string | null }) {
  const { t } = useI18n();

  if (!error && !message) return null;

  return (
    <p className={error ? "rounded-2xl border border-danger/20 bg-danger/10 p-3 text-sm font-bold text-danger" : "rounded-2xl border border-sage-light bg-sage-light p-3 text-sm font-bold text-sage"}>
      {t(error ?? message ?? "")}
    </p>
  );
}

function safeRedirectPath(value: string | null, fallback = "/account") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value;
}

function loginQueryError(error: string | null) {
  if (error === "invalid-confirmation-link") {
    return "დადასტურების ბმული არასწორია ან ვადაგასულია.";
  }

  if (error === "oauth-callback-failed") {
    return "Google-ით შესვლა ვერ დასრულდა. სცადე თავიდან.";
  }

  if (error === "supabase-env-missing") {
    return AUTH_UNAVAILABLE_MESSAGE;
  }

  return null;
}

function loginQueryMessage(accountDeleted: string | null) {
  if (accountDeleted === "1") {
    return "ანგარიში წაიშალა.";
  }

  return null;
}

function AuthDivider() {
  const { t } = useI18n();

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-[11px] font-black uppercase tracking-normal text-muted/85">
      <span className="h-px bg-oat" />
      <span>{t("ან")}</span>
      <span className="h-px bg-oat" />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.58c2.09-1.93 3.27-4.77 3.27-8.09Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.58-2.77c-.98.66-2.24 1.06-3.7 1.06-2.86 0-5.29-1.93-6.16-4.53H2.15v2.86C3.96 20.54 7.67 23 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.04H2.15A10.96 10.96 0 0 0 1 12c0 1.77.42 3.44 1.15 4.96l3.69-2.86Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.67 1 3.96 3.46 2.15 7.04L5.84 9.9C6.71 7.31 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}

function GoogleAuthButton({
  configured,
  label,
  redirectTo = "/account",
}: {
  configured: boolean;
  label: string;
  redirectTo?: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useI18n();

  async function handleGoogleAuth() {
    setError(null);

    if (!configured) {
      setError(AUTH_UNAVAILABLE_MESSAGE);
      return;
    }

    const callbackUrl = new URL("/auth/callback", window.location.origin);
    callbackUrl.searchParams.set("next", safeRedirectPath(redirectTo));

    setPending(true);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl.toString(),
      },
    });

    if (signInError) {
      setPending(false);
      setError(signInError.message);
    }
  }

  return (
    <div className="grid gap-3">
      <Button
        type="button"
        variant="secondary"
        className="min-h-[50px] w-full justify-center rounded-[18px] border-sand/80 bg-white px-5 text-[14px] shadow-soft hover:border-sand hover:bg-white hover:shadow-panel"
        disabled={pending || !configured}
        onClick={handleGoogleAuth}
      >
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-oat bg-white">
          <GoogleIcon />
        </span>
        <span>{pending ? t("გადამისამართება...") : t(label)}</span>
      </Button>
      <AuthMessage error={error} />
    </div>
  );
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = safeRedirectPath(searchParams.get("redirectTo"));
  const queryError = searchParams.get("error");
  const accountDeleted = searchParams.get("accountDeleted");
  const configured = hasSupabaseConfig();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const { t } = useI18n();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!configured) {
      setError(AUTH_UNAVAILABLE_MESSAGE);
      return;
    }

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    setPending(true);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setPending(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

  return (
    <>
      <div className="mt-5 grid gap-4">
        <GoogleAuthButton configured={configured} label="Google-ით გაგრძელება" redirectTo={redirectTo} />
        <AuthDivider />
      </div>
      <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
        <FormInput label="Email" name="email" type="email" placeholder="you@example.com" required />
        <FormInput label="პაროლი" name="password" type="password" placeholder="••••••••" required />
        <AuthMessage error={error ?? loginQueryError(queryError)} message={!error ? loginQueryMessage(accountDeleted) : null} />
        <Button type="submit" disabled={pending || !configured}>
          <Lock className="h-4 w-4" />
          {pending ? "შედიხარ..." : "შესვლა"}
        </Button>
      </form>
      <div className="mt-4 flex justify-between gap-3 text-[13px] font-extrabold text-muted">
        <Link href="/register">{t("რეგისტრაცია")}</Link>
        <Link href="/forgot-password">{t("პაროლის აღდგენა")}</Link>
      </div>
      {!configured ? (
        <p className="mt-5 flex items-center gap-2 text-xs font-bold text-muted">
          <Mail className="h-4 w-4 text-clay" />
          {t("ავტორიზაცია ამ მომენტში მიუწვდომელია.")}
        </p>
      ) : null}
    </>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const configured = hasSupabaseConfig();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const { t } = useI18n();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!configured) {
      setError(AUTH_UNAVAILABLE_MESSAGE);
      return;
    }

    const formData = new FormData(event.currentTarget);
    const fullName = String(formData.get("fullName") ?? "");
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (password !== confirmPassword) {
      setError("პაროლები ერთმანეთს არ ემთხვევა.");
      return;
    }

    const emailRedirectTo = `${window.location.origin}/auth/confirm?next=/account`;
    const supabase = createClient();

    setPending(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          username: usernameFromEmail(email),
        },
        emailRedirectTo,
      },
    });
    setPending(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (data.session) {
      router.push("/account");
      router.refresh();
      return;
    }

    setMessage("რეგისტრაციის დასადასტურებლად შეამოწმე email, შემდეგ შედი.");
  }

  return (
    <>
      <div className="mt-5 grid gap-4">
        <GoogleAuthButton configured={configured} label="Google-ით რეგისტრაცია" />
        <AuthDivider />
      </div>
      <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
        <FormInput label="სახელი" name="fullName" placeholder="სახელი და გვარი" required />
        <FormInput label="Email" name="email" type="email" placeholder="you@example.com" required />
        <FormInput label="პაროლი" name="password" type="password" placeholder="••••••••" minLength={6} required />
        <FormInput label="გაიმეორე პაროლი" name="confirmPassword" type="password" placeholder="••••••••" minLength={6} required />
        <AuthMessage error={error} message={message} />
        <Button type="submit" disabled={pending || !configured}>
          {pending ? "რეგისტრირდება..." : "დარეგისტრირება"}
        </Button>
      </form>
      <div className="mt-4 text-[13px] font-extrabold text-muted">
        {t("უკვე გაქვს ანგარიში?")} <Link href="/login">{t("შესვლა")}</Link>
      </div>
    </>
  );
}

export function ForgotPasswordForm() {
  const configured = hasSupabaseConfig();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const { t } = useI18n();
  const redirectTo = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/account`;
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!configured) {
      setError(AUTH_UNAVAILABLE_MESSAGE);
      return;
    }

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");

    setPending(true);
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    setPending(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setMessage("პაროლის აღდგენის ბმული გაიგზავნა.");
  }

  return (
    <>
      <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
        <FormInput label="Email" name="email" type="email" placeholder="you@example.com" required />
        <AuthMessage error={error} message={message} />
        <Button type="submit" disabled={pending || !configured}>
          {pending ? "იგზავნება..." : "გაგზავნა"}
        </Button>
      </form>
      <div className="mt-4 text-[13px] font-extrabold text-muted">
        <Link href="/login">{t("შესვლაზე დაბრუნება")}</Link>
      </div>
    </>
  );
}

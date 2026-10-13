"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { motion, useReducedMotion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { api, ApiError } from "@/lib/api";
import { loginSchema, type LoginValues } from "@/lib/validation";
import { Avatar, Button, FieldError, TextInput } from "@/components/ui";

const DEMO_PASSWORD = "demo1234";

const DEMO_USERS = [
  { name: "Alice", email: "alice@ajaia.test", role: "Owner", note: "Creates, formats and shares documents." },
  { name: "Bob", email: "bob@ajaia.test", role: "Collaborator", note: "Sees Alice's document under Shared with me." },
  { name: "Carol", email: "carol@ajaia.test", role: "Outsider", note: "Gets Not found on Alice's document URL." },
] as const;

/** Only allow same-site relative redirects (prevents open redirects via ?next=). */
function safeNext(next: string | null): string {
  if (next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/login")) return next;
  return "/";
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const reduce = useReducedMotion();
  const [quickPending, setQuickPending] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting, isValid },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: { email: "", password: "" },
  });

  async function signIn(values: LoginValues): Promise<boolean> {
    clearErrors("root");
    try {
      await api.login(values.email, values.password);
      router.replace(safeNext(params.get("next")));
      router.refresh();
      return true;
    } catch (err) {
      const message =
        err instanceof ApiError && err.status === 401
          ? "Incorrect email or password"
          : err instanceof ApiError
            ? err.message
            : "Something went wrong. Please try again.";
      setError("root", { message });
      return false;
    }
  }

  async function quickLogin(emailAddr: string) {
    setQuickPending(emailAddr);
    const ok = await signIn({ email: emailAddr, password: DEMO_PASSWORD });
    if (!ok) setQuickPending(null);
  }

  const busy = isSubmitting || quickPending !== null;
  const rootError = errors.root?.message;

  return (
    <motion.section
      initial={{ opacity: 0, y: reduce ? 0 : 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
      aria-labelledby="login-heading"
      className="w-full"
    >
      <div className="rounded-lg border border-line bg-surface p-6 sm:p-8">
        <h2 id="login-heading" className="text-lg font-semibold">
          Sign in
        </h2>
        <p className="mt-1 text-sm text-muted">Use your work email, or pick a demo account below.</p>

        <form onSubmit={handleSubmit(async (v) => void (await signIn(v)))} className="mt-6 space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
              Email
            </label>
            <TextInput
              id="email"
              type="email"
              autoComplete="username"
              inputMode="email"
              invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "email-error" : undefined}
              {...register("email")}
            />
            {errors.email?.message && <FieldError id="email-error">{errors.email.message}</FieldError>}
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
              Password
            </label>
            <TextInput
              id="password"
              type="password"
              autoComplete="current-password"
              invalid={Boolean(errors.password || rootError)}
              aria-describedby={errors.password ? "password-error" : rootError ? "login-error" : undefined}
              {...register("password")}
            />
            {errors.password?.message && <FieldError id="password-error">{errors.password.message}</FieldError>}
          </div>
          {rootError && <FieldError id="login-error">{rootError}</FieldError>}
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            loading={isSubmitting}
            disabled={busy || !isValid}
          >
            Log in
          </Button>
        </form>
      </div>

      <div className="mt-6">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold">Demo accounts</h2>
          <p className="text-xs text-muted">
            Password <code className="tabular rounded-sm border border-line bg-surface px-1 py-0.5 text-ink">{DEMO_PASSWORD}</code>
          </p>
        </div>
        <ul className="mt-2 divide-y divide-line rounded-md border border-line bg-surface">
          {DEMO_USERS.map((u) => {
            const noteId = `demo-note-${u.name.toLowerCase()}`;
            return (
              <li key={u.email} className="flex items-center gap-3 px-4 py-3">
                <Avatar name={u.name} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    {u.name}
                    <span className="rounded-full border border-line px-1.5 text-[11px] font-medium text-muted">{u.role}</span>
                  </p>
                  <p id={noteId} className="truncate text-xs text-muted">
                    {u.email} · {u.note}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-describedby={noteId}
                  loading={quickPending === u.email}
                  disabled={busy}
                  onClick={() => void quickLogin(u.email)}
                >
                  Log in as {u.name}
                </Button>
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-xs text-muted">Demo accounts only. Don&apos;t store anything sensitive here.</p>
      </div>
    </motion.section>
  );
}

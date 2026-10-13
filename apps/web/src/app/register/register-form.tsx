"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { clsx } from "clsx";
import { Check, Circle } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { useAlertModal } from "@/components/alert-modal";
import { Button, FieldError, TextInput } from "@/components/ui";
import { api, ApiError, errorMessage } from "@/lib/api";
import { PASSWORD_RULES, registerSchema, type RegisterValues } from "@/lib/validation";

const FIELDS = [
  { name: "name", label: "Full name", type: "text", autoComplete: "name" },
  { name: "email", label: "Email", type: "email", autoComplete: "email" },
  { name: "password", label: "Password", type: "password", autoComplete: "new-password" },
  { name: "confirmPassword", label: "Confirm password", type: "password", autoComplete: "new-password" },
] as const;

export function RegisterForm() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const modal = useAlertModal();
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting, isValid },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });
  const password = useWatch({ control, name: "password" });

  async function onSubmit(values: RegisterValues) {
    try {
      const { user } = await api.register(values.name.trim(), values.email, values.password);
      router.replace("/");
      router.refresh();
      void modal.success({ title: `Welcome, ${user.name}`, message: "Your account is ready." });
    } catch (err) {
      if (err instanceof ApiError && err.code === "EMAIL_TAKEN") {
        setError("email", { message: err.message }, { shouldFocus: true });
      } else if (err instanceof ApiError && err.status === 400) {
        setError("root", { message: err.message });
      } else {
        void modal.error({ title: "Couldn't create account", message: errorMessage(err) });
      }
    }
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: reduce ? 0 : 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
      aria-labelledby="register-heading"
      className="w-full"
    >
      <div className="rounded-lg border border-line bg-surface p-6 sm:p-8">
        <h2 id="register-heading" className="text-lg font-semibold">
          Create your account
        </h2>
        <p className="mt-1 text-sm text-muted">It takes less than a minute.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
          {FIELDS.map((f) => {
            const error = errors[f.name]?.message;
            const errorId = `${f.name}-error`;
            const hintId = f.name === "password" ? "password-rules" : undefined;
            return (
              <div key={f.name}>
                <label htmlFor={f.name} className="mb-1.5 block text-sm font-medium">
                  {f.label}
                </label>
                <TextInput
                  id={f.name}
                  type={f.type}
                  autoComplete={f.autoComplete}
                  invalid={Boolean(error)}
                  aria-describedby={[error ? errorId : null, hintId].filter(Boolean).join(" ") || undefined}
                  {...register(f.name)}
                />
                {error && <FieldError id={errorId}>{error}</FieldError>}
                {f.name === "password" && (
                  <ul id="password-rules" aria-label="Password requirements" className="mt-2 grid gap-1 text-xs sm:grid-cols-3">
                    {PASSWORD_RULES.map((r) => {
                      const ok = r.test(password ?? "");
                      return (
                        <li key={r.id} className={clsx("flex items-center gap-1.5 transition-colors duration-150", ok ? "text-primary" : "text-muted")}>
                          {ok ? <Check aria-hidden className="h-3.5 w-3.5" strokeWidth={2.25} /> : <Circle aria-hidden className="h-3 w-3" strokeWidth={1.75} />}
                          <span>
                            {r.label}
                            <span className="sr-only">{ok ? " (met)" : " (not met)"}</span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
          {errors.root?.message && <FieldError>{errors.root.message}</FieldError>}
          <Button type="submit" variant="primary" className="w-full" loading={isSubmitting} disabled={isSubmitting || !isValid}>
            Create account
          </Button>
        </form>
      </div>
      <p className="mt-4 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="rounded-sm font-medium text-primary underline-offset-4 hover:underline">
          Log in
        </Link>
      </p>
    </motion.section>
  );
}

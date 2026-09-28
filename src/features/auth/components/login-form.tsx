"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Alert } from "@/components/ui/misc";
import { signInAction } from "@/features/auth/actions";
import { useI18n } from "@/lib/i18n/client";
import { loginSchema, type LoginInput } from "@/validations/auth";

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const { t, tr } = useI18n();
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", next },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const res = await signInAction(values);
    if (!res.ok) return setServerError(res.error);
    router.push(res.data?.redirectTo ?? "/dashboard");
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {serverError ? <Alert tone="danger">{tr(serverError)}</Alert> : null}
      <Field label={t("auth.email")} htmlFor="email" error={formState.errors.email?.message}>
        <Input id="email" type="email" autoComplete="email" aria-invalid={!!formState.errors.email} {...register("email")} />
      </Field>
      <Field label={t("auth.password")} htmlFor="password" error={formState.errors.password?.message}>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={!!formState.errors.password}
          {...register("password")}
        />
      </Field>
      <Button type="submit" className="w-full" disabled={formState.isSubmitting}>
        {formState.isSubmitting ? t("auth.signingIn") : t("auth.signIn")}
      </Button>
      <p className="text-center text-sm text-slate-600">
        {t("auth.noAccount")}{" "}
        <Link href="/register" className="text-brand-700 font-medium hover:underline">
          {t("auth.signUpLink")}
        </Link>
      </p>
    </form>
  );
}

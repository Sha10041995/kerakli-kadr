"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FieldError, Input } from "@/components/ui/form";
import { Alert } from "@/components/ui/misc";
import { BriefcaseIcon, UserIcon } from "@/components/ui/icons";
import { signUpAction } from "@/features/auth/actions";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { registerSchema, type RegisterInput } from "@/validations/auth";

export function RegisterForm({ defaultRole }: { defaultRole?: "job_seeker" | "employer" }) {
  const router = useRouter();
  const { t, tr } = useI18n();
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const { register, handleSubmit, control, setValue, formState } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: defaultRole, firstName: "", lastName: "", email: "", phone: "", password: "" },
  });
  const role = useWatch({ control, name: "role" });
  const errors = formState.errors;

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const res = await signUpAction(values);
    if (!res.ok) return setServerError(res.error);
    if (res.data?.redirectTo) {
      router.push(res.data.redirectTo);
      router.refresh();
    } else setDone(tr(res.message) || t("auth.checkEmail"));
  });

  if (done) return <Alert tone="success">{done}</Alert>;

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {serverError ? <Alert tone="danger">{tr(serverError)}</Alert> : null}
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-slate-700">{t("auth.iAm")}</legend>
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              { value: "job_seeker", label: t("auth.seekingJob"), icon: UserIcon },
              { value: "employer", label: t("auth.seekingStaff"), icon: BriefcaseIcon },
            ] as const
          ).map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              aria-pressed={role === value}
              onClick={() => setValue("role", value, { shouldValidate: true })}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-sm font-medium transition",
                role === value
                  ? "border-brand-600 bg-brand-50 text-brand-800"
                  : "border-slate-200 text-slate-700 hover:border-slate-300",
              )}
            >
              <Icon size={24} />
              {label}
            </button>
          ))}
        </div>
        <FieldError message={errors.role?.message} />
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("auth.firstName")} htmlFor="firstName" error={errors.firstName?.message}>
          <Input id="firstName" autoComplete="given-name" {...register("firstName")} />
        </Field>
        <Field label={t("auth.lastName")} htmlFor="lastName" error={errors.lastName?.message}>
          <Input id="lastName" autoComplete="family-name" {...register("lastName")} />
        </Field>
      </div>
      <Field label={t("auth.email")} htmlFor="email" error={errors.email?.message}>
        <Input id="email" type="email" autoComplete="email" {...register("email")} />
      </Field>
      <Field label={t("auth.phoneOptional")} htmlFor="phone" error={errors.phone?.message} hint={t("auth.notPublic")}>
        <Input id="phone" type="tel" autoComplete="tel" placeholder="+998 90 123 45 67" {...register("phone")} />
      </Field>
      <Field label={t("auth.password")} htmlFor="password" error={errors.password?.message} hint={t("auth.passwordHint")}>
        <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
      </Field>
      <div>
        <Checkbox
          {...register("acceptTerms")}
          label={t("auth.consent")
            .split(/(\{terms\}|\{privacy\})/)
            .map((part, i) =>
              part === "{terms}" ? (
                <Link key={i} href="/terms" className="text-brand-700 underline" target="_blank">
                  {t("auth.termsLink")}
                </Link>
              ) : part === "{privacy}" ? (
                <Link key={i} href="/privacy" className="text-brand-700 underline" target="_blank">
                  {t("auth.privacyLink")}
                </Link>
              ) : (
                part
              ),
            )}
        />
        <FieldError message={errors.acceptTerms?.message} />
      </div>
      <Button type="submit" className="w-full" disabled={formState.isSubmitting}>
        {formState.isSubmitting ? t("auth.sending") : t("auth.signUp")}
      </Button>
      <p className="text-center text-sm text-slate-600">
        {t("auth.haveAccount")}{" "}
        <Link href="/login" className="text-brand-700 font-medium hover:underline">
          {t("auth.signIn")}
        </Link>
      </p>
    </form>
  );
}

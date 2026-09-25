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
import { cn } from "@/lib/utils";
import { registerSchema, type RegisterInput } from "@/validations/auth";

export function RegisterForm({ defaultRole }: { defaultRole?: "job_seeker" | "employer" }) {
  const router = useRouter();
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
    } else setDone(res.message ?? "Emailingizni tekshiring.");
  });

  if (done) return <Alert tone="success">{done}</Alert>;

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {serverError ? <Alert tone="danger">{serverError}</Alert> : null}
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-slate-700">Men…</legend>
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              { value: "job_seeker", label: "Ish izlayapman", icon: UserIcon },
              { value: "employer", label: "Xodim izlayapman", icon: BriefcaseIcon },
            ] as const
          ).map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              aria-pressed={role === value}
              onClick={() => setValue("role", value, { shouldValidate: true })}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-sm font-medium transition",
                role === value ? "border-brand-600 bg-brand-50 text-brand-800" : "border-slate-200 text-slate-700 hover:border-slate-300",
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
        <Field label="Ism" htmlFor="firstName" error={errors.firstName?.message}>
          <Input id="firstName" autoComplete="given-name" {...register("firstName")} />
        </Field>
        <Field label="Familiya" htmlFor="lastName" error={errors.lastName?.message}>
          <Input id="lastName" autoComplete="family-name" {...register("lastName")} />
        </Field>
      </div>
      <Field label="Email" htmlFor="email" error={errors.email?.message}>
        <Input id="email" type="email" autoComplete="email" {...register("email")} />
      </Field>
      <Field label="Telefon (ixtiyoriy)" htmlFor="phone" error={errors.phone?.message} hint="Ommaga koʻrsatilmaydi">
        <Input id="phone" type="tel" autoComplete="tel" placeholder="+998 90 123 45 67" {...register("phone")} />
      </Field>
      <Field label="Parol" htmlFor="password" error={errors.password?.message} hint="Kamida 8 ta belgi, harf va raqam">
        <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
      </Field>
      <div>
        <Checkbox
          {...register("acceptTerms")}
          label={
            <>
              <Link href="/terms" className="text-brand-700 underline" target="_blank">Foydalanish shartlari</Link> va{" "}
              <Link href="/privacy" className="text-brand-700 underline" target="_blank">maxfiylik siyosatiga</Link> roziman
            </>
          }
        />
        <FieldError message={errors.acceptTerms?.message} />
      </div>
      <Button type="submit" className="w-full" disabled={formState.isSubmitting}>
        {formState.isSubmitting ? "Yuborilmoqda…" : "Roʻyxatdan oʻtish"}
      </Button>
      <p className="text-center text-sm text-slate-600">
        Hisobingiz bormi? <Link href="/login" className="font-medium text-brand-700 hover:underline">Kirish</Link>
      </p>
    </form>
  );
}

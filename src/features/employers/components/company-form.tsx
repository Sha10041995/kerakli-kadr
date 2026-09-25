"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Alert, Card } from "@/components/ui/misc";
import { LocationPicker } from "@/features/locations/components/location-picker";
import { saveCompanyAction } from "@/features/employers/actions";
import { COMPANY_TYPE_LABELS, options } from "@/lib/i18n/uz";
import { companySchema, type CompanyInput } from "@/validations/company";

export function CompanyForm({ defaults, regions, isNew }: { defaults: CompanyInput; regions: { id: number; name: string }[]; isNew: boolean }) {
  const router = useRouter();
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const { register, handleSubmit, setValue, control, formState } = useForm<CompanyInput>({
    resolver: zodResolver(companySchema),
    defaultValues: defaults,
  });
  const errors = formState.errors;
  const type = useWatch({ control, name: "companyType" });

  const onSubmit = handleSubmit(async (values) => {
    const res = await saveCompanyAction(values);
    if (!res.ok) return setStatus({ ok: false, text: res.error });
    setStatus({ ok: true, text: res.message ?? "Saqlandi" });
    if (isNew) router.push("/dashboard/vacancies/new");
    else router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <Card className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Turi" htmlFor="companyType" error={errors.companyType?.message}>
            <Select id="companyType" {...register("companyType")}>
              {options(COMPANY_TYPE_LABELS).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </Field>
          <Field label={type === "individual" ? "Ism-familiya yoki nom" : "Kompaniya nomi"} htmlFor="name" error={errors.name?.message}>
            <Input id="name" maxLength={160} {...register("name")} />
          </Field>
          {type !== "individual" ? (
            <Field label="STIR (INN)" htmlFor="stir" error={errors.stir?.message} hint="9 ta raqam">
              <Input id="stir" inputMode="numeric" maxLength={9} {...register("stir")} />
            </Field>
          ) : null}
          <Field label="Veb-sayt" htmlFor="website" error={errors.website?.message}>
            <Input id="website" type="url" placeholder="https://" {...register("website")} />
          </Field>
          <Field label="Faoliyat haqida" htmlFor="description" error={errors.description?.message} className="sm:col-span-2">
            <Textarea id="description" rows={4} maxLength={5000} {...register("description")} />
          </Field>
        </div>
      </Card>
      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Manzil</h2>
        <LocationPicker
          regions={regions}
          depth={3}
          value={{ regionId: defaults.regionId, districtId: defaults.districtId, settlementId: defaults.settlementId }}
          errors={{ regionId: errors.regionId?.message }}
          onChange={(v) => {
            setValue("regionId", v.regionId, { shouldValidate: formState.isSubmitted });
            setValue("districtId", v.districtId);
            setValue("settlementId", v.settlementId);
            setValue("mahallaId", null);
            setValue("lat", null);
            setValue("lng", null);
          }}
        />
        <Field label="Manzil (koʻcha, uy)" htmlFor="address" error={errors.address?.message}>
          <Input id="address" maxLength={300} {...register("address")} />
        </Field>
      </Card>
      {status ? <Alert tone={status.ok ? "success" : "danger"}>{status.text}</Alert> : null}
      <Button type="submit" size="lg" disabled={formState.isSubmitting}>
        {formState.isSubmitting ? "Saqlanmoqda…" : isNew ? "Davom etish" : "Saqlash"}
      </Button>
    </form>
  );
}

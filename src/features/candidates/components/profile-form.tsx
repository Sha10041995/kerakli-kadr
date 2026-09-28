"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FieldError, Input, Select, Textarea } from "@/components/ui/form";
import { Alert, Card } from "@/components/ui/misc";
import { LocationPicker } from "@/features/locations/components/location-picker";
import { saveCandidateProfileAction } from "@/features/candidates/actions";
import { useI18n } from "@/lib/i18n/client";
import { enumOptions } from "@/lib/i18n/dictionary";
import { cn } from "@/lib/utils";
import { candidateProfileSchema, type CandidateProfileData, type CandidateProfileInput } from "@/validations/candidate";

type Props = {
  defaults: CandidateProfileInput;
  regions: { id: number; name: string }[];
  catalog: { id: number; name: string; professions: { id: number; name: string }[] }[];
  skills: { id: number; name: string }[];
  professionSkills: Record<number, number[]>;
};

const num = { setValueAs: (v: unknown) => (v === "" || v === null || v === undefined ? null : Number(v)) };

export function CandidateProfileForm({ defaults, regions, catalog, skills, professionSkills }: Props) {
  const router = useRouter();
  const { t, tr, d } = useI18n();
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [skillFilter, setSkillFilter] = useState("");
  const { register, handleSubmit, control, setValue, formState, setError } = useForm<
    CandidateProfileInput,
    unknown,
    CandidateProfileData
  >({ resolver: zodResolver(candidateProfileSchema), defaultValues: defaults });
  const errors = formState.errors;
  const professionId = useWatch({ control, name: "professionId" });
  const selectedSkills = useWatch({ control, name: "skillIds" });

  const orderedSkills = useMemo(() => {
    const suggested = new Set(professionId ? (professionSkills[professionId] ?? []) : []);
    const f = skillFilter.trim().toLowerCase();
    return skills
      .filter((s) => !f || s.name.toLowerCase().includes(f))
      .sort((a, b) => Number(suggested.has(b.id)) - Number(suggested.has(a.id)) || a.name.localeCompare(b.name));
  }, [skills, professionId, professionSkills, skillFilter]);

  const onSubmit = handleSubmit(async (values) => {
    setStatus(null);
    const res = await saveCandidateProfileAction(values);
    if (!res.ok) {
      Object.entries(res.fieldErrors ?? {}).forEach(([k, v]) => setError(k as keyof CandidateProfileInput, { message: v?.[0] }));
      return setStatus({ ok: false, text: tr(res.error) });
    }
    setStatus({ ok: true, text: tr(res.message) || t("success.saved") });
    router.refresh();
  });

  function toggleSkill(id: number) {
    const set = new Set(selectedSkills);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    setValue("skillIds", [...set], { shouldDirty: true });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">{t("profile.personal")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("auth.firstName")} htmlFor="firstName" error={errors.firstName?.message}>
            <Input id="firstName" {...register("firstName")} />
          </Field>
          <Field label={t("auth.lastName")} htmlFor="lastName" error={errors.lastName?.message}>
            <Input id="lastName" {...register("lastName")} />
          </Field>
          <Field label={t("profile.phone")} htmlFor="phone" error={errors.phone?.message} hint={t("profile.phoneHint")}>
            <Input id="phone" type="tel" placeholder="+998 90 123 45 67" {...register("phone")} />
          </Field>
          <Field label={t("profile.birthYear")} htmlFor="birthYear" error={errors.birthYear?.message}>
            <Input id="birthYear" type="number" min={1940} max={2015} {...register("birthYear", num)} />
          </Field>
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">{t("profile.professionAndExperience")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("profile.profession")} htmlFor="professionId" error={errors.professionId?.message}>
            <Select id="professionId" {...register("professionId", num)}>
              <option value="">{t("common.choose")}</option>
              {catalog.map((c) => (
                <optgroup key={c.id} label={c.name}>
                  {c.professions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </Field>
          <Field label={t("profile.experienceYears")} htmlFor="experienceYears" error={errors.experienceYears?.message}>
            <Input id="experienceYears" type="number" step="0.5" min={0} max={70} {...register("experienceYears", num)} />
          </Field>
          <Field
            label={t("profile.headline")}
            htmlFor="headline"
            error={errors.headline?.message}
            className="sm:col-span-2"
            hint={t("profile.headlineHint")}
          >
            <Input id="headline" maxLength={120} {...register("headline")} />
          </Field>
          <Field label={t("profile.about")} htmlFor="about" error={errors.about?.message} className="sm:col-span-2">
            <Textarea id="about" rows={4} maxLength={3000} {...register("about")} />
          </Field>
          <Field label={t("profile.education")} htmlFor="educationLevel" error={errors.educationLevel?.message}>
            <Select id="educationLevel" {...register("educationLevel", { setValueAs: (v) => (v === "" ? null : v) })}>
              <option value="">{t("profile.notSpecified")}</option>
              {enumOptions(d.enums.education).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("profile.availability")} htmlFor="availability" error={errors.availability?.message}>
            <Select id="availability" {...register("availability")}>
              {enumOptions(d.enums.availability).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">
            {t("profile.skillsCount", { n: selectedSkills?.length ?? 0 })}
          </p>
          <Input
            value={skillFilter}
            onChange={(e) => setSkillFilter(e.target.value)}
            placeholder={t("profile.skillSearch")}
            className="mb-2"
            aria-label={t("profile.skillSearchAria")}
          />
          <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto">
            {orderedSkills.map((s) => {
              const on = selectedSkills?.includes(s.id);
              return (
                <button
                  type="button"
                  key={s.id}
                  aria-pressed={on}
                  onClick={() => toggleSkill(s.id)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium",
                    on ? "border-brand-600 bg-brand-600 text-white" : "hover:border-brand-400 border-slate-300 text-slate-700",
                  )}
                >
                  {s.name}
                </button>
              );
            })}
          </div>
          <FieldError message={errors.skillIds?.message} />
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">{t("profile.location")}</h2>
        <p className="text-sm text-slate-600">{t("profile.locationNote")}</p>
        <Controller
          control={control}
          name="regionId"
          render={() => (
            <LocationPicker
              regions={regions}
              value={{
                regionId: defaults.regionId,
                districtId: defaults.districtId,
                settlementId: defaults.settlementId,
                mahallaId: defaults.mahallaId,
              }}
              errors={{ regionId: errors.regionId?.message }}
              onChange={(v) => {
                setValue("regionId", v.regionId, { shouldDirty: true, shouldValidate: formState.isSubmitted });
                setValue("districtId", v.districtId, { shouldDirty: true });
                setValue("settlementId", v.settlementId, { shouldDirty: true });
                setValue("mahallaId", v.mahallaId, { shouldDirty: true });
                setValue("lat", null);
                setValue("lng", null);
              }}
            />
          )}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("profile.workRadius")} htmlFor="workRadiusKm" error={errors.workRadiusKm?.message}>
            <Input id="workRadiusKm" type="number" min={1} max={500} {...register("workRadiusKm", num)} />
          </Field>
          <div className="flex flex-col justify-end gap-2">
            <Checkbox label={t("profile.hasTransport")} {...register("hasTransport")} />
            <Checkbox label={t("profile.remoteOk")} {...register("remoteOk")} />
            <Checkbox label={t("profile.relocateOk")} {...register("relocateOk")} />
          </div>
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">{t("profile.conditions")}</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t("profile.salaryType")} htmlFor="salaryType" error={errors.salaryType?.message}>
            <Select id="salaryType" {...register("salaryType")}>
              {enumOptions(d.enums.salaryType).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("profile.salaryFrom")} htmlFor="expectedSalaryMin" error={errors.expectedSalaryMin?.message}>
            <Input id="expectedSalaryMin" type="number" min={0} step={100000} {...register("expectedSalaryMin", num)} />
          </Field>
          <Field label={t("profile.salaryTo")} htmlFor="expectedSalaryMax" error={errors.expectedSalaryMax?.message}>
            <Input id="expectedSalaryMax" type="number" min={0} step={100000} {...register("expectedSalaryMax", num)} />
          </Field>
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-slate-700">{t("profile.employmentType")}</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {enumOptions(d.enums.employmentType).map((o) => (
              <Checkbox key={o.value} value={o.value} label={o.label} {...register("employmentTypes")} />
            ))}
          </div>
          <FieldError message={errors.employmentTypes?.message} />
        </fieldset>
        <Checkbox label={t("profile.isPublic")} {...register("isPublic")} />
      </Card>

      {status ? <Alert tone={status.ok ? "success" : "danger"}>{status.text}</Alert> : null}
      <div className="sticky bottom-20 z-10 md:bottom-4">
        <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? t("common.saving") : t("profile.save")}
        </Button>
      </div>
    </form>
  );
}

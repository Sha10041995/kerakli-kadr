"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FieldError, Input, Select, Textarea } from "@/components/ui/form";
import { Alert, Card } from "@/components/ui/misc";
import { LocationPicker } from "@/features/locations/components/location-picker";
import { saveVacancyAction } from "@/features/vacancies/actions";
import { EDUCATION_LABELS, EMPLOYMENT_TYPE_LABELS, SALARY_TYPE_LABELS, WORK_SCHEDULE_LABELS, options } from "@/lib/i18n/uz";
import { cn } from "@/lib/utils";
import { vacancySchema, type VacancyData, type VacancyInput } from "@/validations/vacancy";

type Props = {
  id?: string;
  defaults: VacancyInput;
  regions: { id: number; name: string }[];
  catalog: { id: number; name: string; professions: { id: number; name: string; categoryId: number }[] }[];
  skills: { id: number; name: string }[];
  professionSkills: Record<number, number[]>;
};

const num = { setValueAs: (v: unknown) => (v === "" || v === null || v === undefined ? null : Number(v)) };

export function VacancyForm({ id, defaults, regions, catalog, skills, professionSkills }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const { register, handleSubmit, setValue, watch, formState, setError } = useForm<VacancyInput, unknown, VacancyData>({
    resolver: zodResolver(vacancySchema),
    defaultValues: defaults,
  });
  const errors = formState.errors;
  const professionId = watch("professionId");
  const salaryType = watch("salaryType");
  const selectedSkills = watch("skillIds");

  const professionList = useMemo(() => catalog.flatMap((c) => c.professions), [catalog]);
  const visibleSkills = useMemo(() => {
    const suggested = new Set(professionId ? (professionSkills[professionId] ?? []) : []);
    return [...skills].sort((a, b) => Number(suggested.has(b.id)) - Number(suggested.has(a.id)) || a.name.localeCompare(b.name)).slice(0, 40);
  }, [skills, professionId, professionSkills]);

  function onProfessionChange(value: string) {
    const pid = value ? Number(value) : undefined;
    const prof = professionList.find((p) => p.id === pid);
    setValue("categoryId", prof?.categoryId ?? null);
    if (pid && (!selectedSkills || selectedSkills.length === 0)) setValue("skillIds", professionSkills[pid] ?? []);
  }

  function toggleSkill(sid: number) {
    const set = new Set(selectedSkills);
    if (set.has(sid)) set.delete(sid);
    else set.add(sid);
    setValue("skillIds", [...set], { shouldDirty: true });
  }

  const submit = (publish: boolean) =>
    handleSubmit(async (values) => {
      setStatus(null);
      const res = await saveVacancyAction({ ...values, publish }, id);
      if (!res.ok) {
        Object.entries(res.fieldErrors ?? {}).forEach(([k, v]) => setError(k as keyof VacancyInput, { message: v?.[0] }));
        return setStatus({ ok: false, text: res.error });
      }
      router.push(`/dashboard/vacancies/${res.data?.id}?saved=${res.data?.status}`);
      router.refresh();
    });

  return (
    <form onSubmit={submit(true)} className="space-y-6" noValidate>
      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Asosiy maʼlumotlar</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Kasb" htmlFor="professionId" error={errors.professionId?.message}>
            <Select id="professionId" {...register("professionId", { ...num, onChange: (e) => onProfessionChange(e.target.value) })}>
              <option value="">Tanlang</option>
              {catalog.map((c) => (
                <optgroup key={c.id} label={c.name}>
                  {c.professions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </optgroup>
              ))}
            </Select>
          </Field>
          <Field label="Sarlavha" htmlFor="title" error={errors.title?.message} hint="Masalan: “1 kunlik payvandchi kerak”">
            <Input id="title" maxLength={160} {...register("title")} />
          </Field>
          <Field label="Tavsif" htmlFor="description" error={errors.description?.message} className="sm:col-span-2" hint="Vazifalar, talablar, sharoitlar">
            <Textarea id="description" rows={7} maxLength={10000} {...register("description")} />
          </Field>
          <Field label="Ish turi" htmlFor="employmentType" error={errors.employmentType?.message}>
            <Select id="employmentType" {...register("employmentType")}>
              {options(EMPLOYMENT_TYPE_LABELS).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </Field>
          <Field label="Ish jadvali" htmlFor="workSchedule" error={errors.workSchedule?.message}>
            <Select id="workSchedule" {...register("workSchedule")}>
              {options(WORK_SCHEDULE_LABELS).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </Field>
          <Field label="Talab qilinadigan tajriba (yil)" htmlFor="experienceMinYears" error={errors.experienceMinYears?.message}>
            <Input id="experienceMinYears" type="number" min={0} max={50} step="0.5" {...register("experienceMinYears", num)} />
          </Field>
          <Field label="Maʼlumot" htmlFor="educationLevel" error={errors.educationLevel?.message}>
            <Select id="educationLevel" {...register("educationLevel", { setValueAs: (v) => (v === "" ? null : v) })}>
              <option value="">Muhim emas</option>
              {options(EDUCATION_LABELS).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </Field>
          <Field label="Nechta xodim kerak" htmlFor="positionsCount" error={errors.positionsCount?.message}>
            <Input id="positionsCount" type="number" min={1} max={1000} {...register("positionsCount", num)} />
          </Field>
          <Field label="Ariza qabul qilish muddati" htmlFor="applicationDeadline" error={errors.applicationDeadline?.message}>
            <Input id="applicationDeadline" type="date" {...register("applicationDeadline")} />
          </Field>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Talab qilinadigan koʻnikmalar</p>
          <div className="flex flex-wrap gap-2">
            {visibleSkills.map((s) => {
              const on = selectedSkills?.includes(s.id);
              return (
                <button type="button" key={s.id} aria-pressed={on} onClick={() => toggleSkill(s.id)}
                  className={cn("rounded-full border px-3 py-1 text-xs font-medium", on ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300 text-slate-700 hover:border-brand-400")}>
                  {s.name}
                </button>
              );
            })}
          </div>
          <FieldError message={errors.skillIds?.message} />
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Maosh</h2>
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Turi" htmlFor="salaryType" error={errors.salaryType?.message}>
            <Select id="salaryType" {...register("salaryType")}>
              {options(SALARY_TYPE_LABELS).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </Field>
          {salaryType !== "negotiable" ? (
            <>
              <Field label="dan" htmlFor="salaryMin" error={errors.salaryMin?.message}>
                <Input id="salaryMin" type="number" min={0} step={10000} {...register("salaryMin", num)} />
              </Field>
              <Field label="gacha" htmlFor="salaryMax" error={errors.salaryMax?.message}>
                <Input id="salaryMax" type="number" min={0} step={10000} {...register("salaryMax", num)} />
              </Field>
              <Field label="Valyuta" htmlFor="salaryCurrency" error={errors.salaryCurrency?.message}>
                <Select id="salaryCurrency" {...register("salaryCurrency")}>
                  <option value="UZS">soʻm</option>
                  <option value="USD">USD</option>
                </Select>
              </Field>
            </>
          ) : null}
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Ish joyi</h2>
        <LocationPicker
          regions={regions}
          value={{ regionId: defaults.regionId, districtId: defaults.districtId, settlementId: defaults.settlementId, mahallaId: defaults.mahallaId }}
          errors={{ regionId: errors.regionId?.message }}
          onChange={(v) => {
            setValue("regionId", v.regionId, { shouldValidate: formState.isSubmitted });
            setValue("districtId", v.districtId);
            setValue("settlementId", v.settlementId);
            setValue("mahallaId", v.mahallaId);
            setValue("lat", null);
            setValue("lng", null);
          }}
        />
        <Field label="Aniq manzil yoki moʻljal (ixtiyoriy)" htmlFor="addressText" error={errors.addressText?.message}>
          <Input id="addressText" maxLength={300} {...register("addressText")} />
        </Field>
        <div className="grid gap-2 sm:grid-cols-3">
          <Checkbox label="Shoshilinch" {...register("urgent")} />
          <Checkbox label="Masofadan ishlash mumkin" {...register("remoteAllowed")} />
          <Checkbox label="Transport beriladi" {...register("transportProvided")} />
          <Checkbox label="Turar joy beriladi" {...register("accommodationProvided")} />
          <Checkbox label="Ovqat beriladi" {...register("mealProvided")} />
        </div>
      </Card>

      {status ? <Alert tone={status.ok ? "success" : "danger"}>{status.text}</Alert> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="lg" disabled={formState.isSubmitting}>{formState.isSubmitting ? "Saqlanmoqda…" : "Eʼlon qilish"}</Button>
        <Button type="button" variant="outline" size="lg" disabled={formState.isSubmitting} onClick={submit(false)}>Qoralama sifatida saqlash</Button>
      </div>
    </form>
  );
}

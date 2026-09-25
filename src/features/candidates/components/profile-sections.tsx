"use client";

import { Button } from "@/components/ui/button";
import { Checkbox, Input, Label, Select, Textarea } from "@/components/ui/form";
import { Card } from "@/components/ui/misc";
import { ActionForm, ConfirmButton } from "@/components/ui/action-form";
import {
  addCertificateAction, addEducationAction, addExperienceAction, addPortfolioAction, deleteCandidateItemAction, uploadAvatarAction,
} from "@/features/candidates/actions";
import { EDUCATION_LABELS, options } from "@/lib/i18n/uz";
import { formatDate } from "@/lib/utils";

type Experience = { id: string; company_name: string; position: string; start_date: string; end_date: string | null; is_current: boolean; description: string | null };
type Education = { id: string; institution: string; level: string; field: string | null; start_year: number | null; end_year: number | null };
type Certificate = { id: string; name: string; issuer: string | null; issued_at: string | null; is_verified: boolean; file_path: string | null };
type Portfolio = { id: string; title: string; description: string | null; url: string | null; image_path: string | null };

const n = (v: FormDataEntryValue | null) => (v === null || v === "" ? null : Number(v));
const s = (v: FormDataEntryValue | null) => (typeof v === "string" && v !== "" ? v : undefined);

export function AvatarUpload() {
  return (
    <ActionForm action={uploadAvatarAction} className="flex flex-wrap items-end gap-2" successMessage="Rasm yangilandi">
      <div>
        <Label htmlFor="avatar">Profil rasmi (JPG/PNG/WebP, 2 MB gacha)</Label>
        <Input id="avatar" name="file" type="file" accept="image/jpeg,image/png,image/webp" required className="py-1.5" />
      </div>
      <Button type="submit" variant="outline">Yuklash</Button>
    </ActionForm>
  );
}

export function ExperienceSection({ items }: { items: Experience[] }) {
  return (
    <Card className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Ish tajribasi</h2>
      <ul className="space-y-3">
        {items.map((e) => (
          <li key={e.id} className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 p-3">
            <div>
              <p className="font-medium text-slate-900">{e.position} — {e.company_name}</p>
              <p className="text-xs text-slate-500">{formatDate(e.start_date)} – {e.is_current ? "hozirgacha" : formatDate(e.end_date)}</p>
              {e.description ? <p className="mt-1 text-sm text-slate-600">{e.description}</p> : null}
            </div>
            <ConfirmButton onConfirm={() => deleteCandidateItemAction("candidate_experience", e.id)}>Oʻchirish</ConfirmButton>
          </li>
        ))}
      </ul>
      <ActionForm
        action={(fd) =>
          addExperienceAction({
            companyName: fd.get("companyName"), position: fd.get("position"), startDate: fd.get("startDate"),
            endDate: s(fd.get("endDate")) ?? null, isCurrent: fd.get("isCurrent") === "on", description: s(fd.get("description")),
          })
        }
        className="grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2"
      >
        <div><Label htmlFor="ex-c">Tashkilot</Label><Input id="ex-c" name="companyName" required maxLength={160} /></div>
        <div><Label htmlFor="ex-p">Lavozim</Label><Input id="ex-p" name="position" required maxLength={160} /></div>
        <div><Label htmlFor="ex-s">Boshlagan sana</Label><Input id="ex-s" name="startDate" type="date" required /></div>
        <div><Label htmlFor="ex-e">Tugagan sana</Label><Input id="ex-e" name="endDate" type="date" /></div>
        <Checkbox name="isCurrent" label="Hozir shu yerda ishlayman" />
        <div className="sm:col-span-2"><Label htmlFor="ex-d">Vazifalar</Label><Textarea id="ex-d" name="description" rows={2} maxLength={2000} /></div>
        <div><Button type="submit" variant="secondary">+ Tajriba qoʻshish</Button></div>
      </ActionForm>
    </Card>
  );
}

export function EducationSection({ items }: { items: Education[] }) {
  return (
    <Card className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Taʼlim</h2>
      <ul className="space-y-3">
        {items.map((e) => (
          <li key={e.id} className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 p-3">
            <div>
              <p className="font-medium text-slate-900">{e.institution}</p>
              <p className="text-xs text-slate-500">
                {EDUCATION_LABELS[e.level as keyof typeof EDUCATION_LABELS]}{e.field ? ` · ${e.field}` : ""}{e.start_year ? ` · ${e.start_year}–${e.end_year ?? ""}` : ""}
              </p>
            </div>
            <ConfirmButton onConfirm={() => deleteCandidateItemAction("candidate_education", e.id)}>Oʻchirish</ConfirmButton>
          </li>
        ))}
      </ul>
      <ActionForm
        action={(fd) =>
          addEducationAction({
            institution: fd.get("institution"), level: fd.get("level"), field: s(fd.get("field")),
            startYear: n(fd.get("startYear")), endYear: n(fd.get("endYear")),
          })
        }
        className="grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2"
      >
        <div><Label htmlFor="ed-i">Oʻquv yurti</Label><Input id="ed-i" name="institution" required maxLength={200} /></div>
        <div>
          <Label htmlFor="ed-l">Daraja</Label>
          <Select id="ed-l" name="level" defaultValue="vocational">
            {options(EDUCATION_LABELS).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </div>
        <div><Label htmlFor="ed-f">Yoʻnalish</Label><Input id="ed-f" name="field" maxLength={160} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label htmlFor="ed-s">Boshlagan yil</Label><Input id="ed-s" name="startYear" type="number" min={1950} max={2100} /></div>
          <div><Label htmlFor="ed-e">Tugatgan yil</Label><Input id="ed-e" name="endYear" type="number" min={1950} max={2100} /></div>
        </div>
        <div><Button type="submit" variant="secondary">+ Taʼlim qoʻshish</Button></div>
      </ActionForm>
    </Card>
  );
}

export function CertificateSection({ items }: { items: Certificate[] }) {
  return (
    <Card className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Sertifikatlar</h2>
      <ul className="space-y-3">
        {items.map((c) => (
          <li key={c.id} className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 p-3">
            <div>
              <p className="font-medium text-slate-900">{c.name} {c.is_verified ? <span className="text-xs text-emerald-700">✓ tasdiqlangan</span> : null}</p>
              <p className="text-xs text-slate-500">{[c.issuer, c.issued_at ? formatDate(c.issued_at) : null, c.file_path ? "fayl biriktirilgan" : null].filter(Boolean).join(" · ")}</p>
            </div>
            <ConfirmButton onConfirm={() => deleteCandidateItemAction("candidate_certificates", c.id)}>Oʻchirish</ConfirmButton>
          </li>
        ))}
      </ul>
      <ActionForm action={addCertificateAction} className="grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
        <div><Label htmlFor="ce-n">Nomi</Label><Input id="ce-n" name="name" required maxLength={200} /></div>
        <div><Label htmlFor="ce-i">Kim bergan</Label><Input id="ce-i" name="issuer" maxLength={200} /></div>
        <div><Label htmlFor="ce-d">Sana</Label><Input id="ce-d" name="issuedAt" type="date" /></div>
        <div><Label htmlFor="ce-f">Fayl (PDF/JPG/PNG, 10 MB gacha, yopiq saqlanadi)</Label><Input id="ce-f" name="file" type="file" accept="application/pdf,image/jpeg,image/png" className="py-1.5" /></div>
        <div><Button type="submit" variant="secondary">+ Sertifikat qoʻshish</Button></div>
      </ActionForm>
    </Card>
  );
}

export function PortfolioSection({ items }: { items: Portfolio[] }) {
  return (
    <Card className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Portfolio</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((p) => (
          <li key={p.id} className="rounded-lg border border-slate-100 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- public storage image */}
            {p.image_path ? <img src={p.image_path} alt={p.title} className="mb-2 aspect-video w-full rounded object-cover" /> : null}
            <p className="font-medium text-slate-900">{p.title}</p>
            {p.url ? <a href={p.url} target="_blank" rel="noopener noreferrer nofollow" className="text-xs text-brand-700 hover:underline">{p.url}</a> : null}
            <div className="mt-2"><ConfirmButton onConfirm={() => deleteCandidateItemAction("candidate_portfolio", p.id)}>Oʻchirish</ConfirmButton></div>
          </li>
        ))}
      </ul>
      <ActionForm action={addPortfolioAction} className="grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
        <div><Label htmlFor="po-t">Sarlavha</Label><Input id="po-t" name="title" required maxLength={160} /></div>
        <div><Label htmlFor="po-u">Havola (ixtiyoriy)</Label><Input id="po-u" name="url" type="url" placeholder="https://" maxLength={500} /></div>
        <div className="sm:col-span-2"><Label htmlFor="po-d">Tavsif</Label><Textarea id="po-d" name="description" rows={2} maxLength={2000} /></div>
        <div><Label htmlFor="po-i">Rasm (5 MB gacha)</Label><Input id="po-i" name="image" type="file" accept="image/jpeg,image/png,image/webp" className="py-1.5" /></div>
        <div className="self-end"><Button type="submit" variant="secondary">+ Ish namunasini qoʻshish</Button></div>
      </ActionForm>
    </Card>
  );
}

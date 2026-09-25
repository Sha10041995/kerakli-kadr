"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Label, Select } from "@/components/ui/form";
import { ActionForm } from "@/components/ui/action-form";
import type { ActionResult } from "@/lib/errors";
import {
  addCategoryAction, addLocationAction, addProfessionAction, decideVerificationAction, moderateVacancyAction,
  resolveReportAction, setReviewStatusAction, setUserBlockedAction, setUserRoleAction, toggleCatalogAction,
  toggleLocationAction, updatePriceAction, updateSettingsAction, verificationDocumentUrlAction,
} from "@/features/admin/actions";
import { FACTOR_LABELS, MATCH_FACTORS, type MatchWeights } from "@/features/matching/score";

function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<ActionResult | ActionResult<unknown>>) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  return { pending, error, run };
}

function Err({ error }: { error: string | null }) {
  return error ? <span role="alert" className="text-xs text-red-600">{error}</span> : null;
}

export function VacancyModeration({ id, status }: { id: string; status: string }) {
  const { pending, error, run } = useAction();
  return (
    <div className="flex flex-wrap items-center gap-2">
      {status !== "active" ? <Button size="sm" disabled={pending} onClick={() => run(() => moderateVacancyAction({ id, status: "active" }))}>Tasdiqlash</Button> : null}
      {status !== "rejected" ? (
        <Button size="sm" variant="danger" disabled={pending} onClick={() => {
          const reason = window.prompt("Rad etish sababi (foydalanuvchiga koʻrsatiladi):");
          if (reason) run(() => moderateVacancyAction({ id, status: "rejected", reason }));
        }}>Rad etish</Button>
      ) : null}
      {status === "active" ? <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => moderateVacancyAction({ id, status: "closed" }))}>Yopish</Button> : null}
      <Err error={error} />
    </div>
  );
}

export function ReportControls({ id, isVacancy }: { id: string; isVacancy: boolean }) {
  const { pending, error, run } = useAction();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => resolveReportAction({ id, status: "dismissed", note: "Asossiz" }))}>Rad etish</Button>
      <Button size="sm" disabled={pending} onClick={() => {
        const note = window.prompt("Qaror izohi:") ?? undefined;
        run(() => resolveReportAction({ id, status: "resolved", note }));
      }}>Hal qilindi</Button>
      {isVacancy ? (
        <Button size="sm" variant="danger" disabled={pending} onClick={() => {
          const note = window.prompt("Vakansiyani bloklash sababi:");
          if (note) run(() => resolveReportAction({ id, status: "resolved", note, hideVacancy: true }));
        }}>Vakansiyani bloklash</Button>
      ) : null}
      <Err error={error} />
    </div>
  );
}

export function VerificationControls({ id, documentPath }: { id: string; documentPath: string | null }) {
  const { pending, error, run } = useAction();
  const [docError, setDocError] = useState<string | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-2">
      {documentPath ? (
        <Button size="sm" variant="outline" onClick={async () => {
          const res = await verificationDocumentUrlAction(documentPath);
          if (res.ok && res.data) window.open(res.data.url, "_blank", "noopener,noreferrer");
          else if (!res.ok) setDocError(res.error);
        }}>Hujjatni koʻrish</Button>
      ) : null}
      <Button size="sm" disabled={pending} onClick={() => run(() => decideVerificationAction({ id, status: "approved" }))}>Tasdiqlash</Button>
      <Button size="sm" variant="danger" disabled={pending} onClick={() => {
        const note = window.prompt("Rad etish sababi:");
        if (note) run(() => decideVerificationAction({ id, status: "rejected", note }));
      }}>Rad etish</Button>
      <Err error={error ?? docError} />
    </div>
  );
}

const ROLE_OPTIONS = ["job_seeker", "employer", "company", "recruiter", "moderator", "admin", "super_admin"] as const;

export function UserControls({ userId, roles, blocked }: { userId: string; roles: string[]; blocked: boolean }) {
  const { pending, error, run } = useAction();
  const [role, setRole] = useState<(typeof ROLE_OPTIONS)[number]>("moderator");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant={blocked ? "outline" : "danger"} disabled={pending} onClick={() => {
        if (window.confirm(blocked ? "Blokdan chiqarasizmi?" : "Foydalanuvchini bloklaysizmi?")) run(() => setUserBlockedAction(userId, !blocked));
      }}>{blocked ? "Blokdan chiqarish" : "Bloklash"}</Button>
      <Select aria-label="Rol" value={role} onChange={(e) => setRole(e.target.value as (typeof ROLE_OPTIONS)[number])} className="h-8 w-36 text-xs">
        {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
      </Select>
      <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => setUserRoleAction({ userId, role, grant: !roles.includes(role) }))}>
        {roles.includes(role) ? "Rolni olish" : "Rol berish"}
      </Button>
      <Err error={error} />
    </div>
  );
}

export function ReviewToggle({ id, status }: { id: string; status: "published" | "hidden" }) {
  const { pending, error, run } = useAction();
  return (
    <span className="inline-flex items-center gap-2">
      <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => setReviewStatusAction(id, status === "published" ? "hidden" : "published"))}>
        {status === "published" ? "Yashirish" : "Koʻrsatish"}
      </Button>
      <Err error={error} />
    </span>
  );
}

export function ActiveToggle({ kind, table, id, active }: { kind: "location" | "catalog"; table: string; id: number; active: boolean }) {
  const { pending, error, run } = useAction();
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        className={active ? "text-xs text-emerald-700 hover:underline" : "text-xs text-slate-400 hover:underline"}
        onClick={() => run(() => (kind === "location"
          ? toggleLocationAction(table as "regions" | "districts" | "settlements" | "mahallas", id, !active)
          : toggleCatalogAction(table as "categories" | "professions" | "skills", id, !active)))}
      >
        {active ? "● faol" : "○ nofaol"}
      </button>
      <Err error={error} />
    </span>
  );
}

const coord = (v: FormDataEntryValue | null) => (v === null || v === "" ? null : Number(v));

export function AddLocationForm({ level, parentId, settlements }: { level: "district" | "settlement" | "mahalla"; parentId: number; settlements?: { id: number; name: string }[] }) {
  const labels = { district: "tuman/shahar", settlement: "shahar/qishloq", mahalla: "mahalla" };
  return (
    <ActionForm
      action={(fd) => addLocationAction({
        level, parentId, name: fd.get("name"), kind: fd.get("kind") || undefined,
        settlementId: fd.get("settlementId") ? Number(fd.get("settlementId")) : null,
        lat: coord(fd.get("lat")), lng: coord(fd.get("lng")),
      })}
      className="flex flex-wrap items-end gap-2 rounded-lg bg-slate-50 p-3"
    >
      <div><Label htmlFor={`n-${level}`}>Yangi {labels[level]}</Label><Input id={`n-${level}`} name="name" required maxLength={120} className="h-9 w-48" /></div>
      {level !== "mahalla" ? (
        <div>
          <Label htmlFor={`k-${level}`}>Turi</Label>
          <Select id={`k-${level}`} name="kind" className="h-9 w-32">
            {level === "district" ? (<><option value="district">tuman</option><option value="city">shahar</option></>) : (<><option value="village">qishloq</option><option value="town">shaharcha</option><option value="city">shahar</option></>)}
          </Select>
        </div>
      ) : settlements?.length ? (
        <div>
          <Label htmlFor="s-mahalla">Aholi punkti</Label>
          <Select id="s-mahalla" name="settlementId" className="h-9 w-40"><option value="">—</option>{settlements.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
        </div>
      ) : null}
      <div><Label htmlFor={`lat-${level}`}>Kenglik</Label><Input id={`lat-${level}`} name="lat" type="number" step="0.0001" className="h-9 w-28" /></div>
      <div><Label htmlFor={`lng-${level}`}>Uzunlik</Label><Input id={`lng-${level}`} name="lng" type="number" step="0.0001" className="h-9 w-28" /></div>
      <Button type="submit" size="sm">Qoʻshish</Button>
    </ActionForm>
  );
}

export function AddProfessionForm({ categories }: { categories: { id: number; name: string }[] }) {
  return (
    <ActionForm
      action={(fd) => addProfessionAction({ categoryId: Number(fd.get("categoryId")), name: fd.get("name"), synonyms: String(fd.get("synonyms") ?? "") })}
      className="flex flex-wrap items-end gap-2 rounded-lg bg-slate-50 p-3"
    >
      <div><Label htmlFor="p-cat">Kategoriya</Label><Select id="p-cat" name="categoryId" className="h-9 w-48">{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></div>
      <div><Label htmlFor="p-name">Kasb nomi</Label><Input id="p-name" name="name" required className="h-9 w-48" /></div>
      <div><Label htmlFor="p-syn">Sinonimlar (vergul bilan)</Label><Input id="p-syn" name="synonyms" className="h-9 w-56" /></div>
      <Button type="submit" size="sm">Qoʻshish</Button>
    </ActionForm>
  );
}

export function AddCategoryForm() {
  return (
    <ActionForm action={(fd) => addCategoryAction({ name: fd.get("name"), icon: String(fd.get("icon") ?? "") })} className="flex flex-wrap items-end gap-2 rounded-lg bg-slate-50 p-3">
      <div><Label htmlFor="c-name">Yangi kategoriya</Label><Input id="c-name" name="name" required className="h-9 w-56" /></div>
      <div><Label htmlFor="c-icon">Emoji</Label><Input id="c-icon" name="icon" maxLength={8} className="h-9 w-20" /></div>
      <Button type="submit" size="sm">Qoʻshish</Button>
    </ActionForm>
  );
}

export function PriceForm({ kind, id, price, active }: { kind: "plan" | "service"; id: number; price: number; active: boolean }) {
  return (
    <ActionForm
      action={(fd) => updatePriceAction({ kind, id, priceUzs: Number(fd.get("price")), isActive: fd.get("active") === "on" })}
      className="flex flex-wrap items-center gap-2"
      resetOnSuccess={false}
    >
      <Input name="price" type="number" min={0} step={1000} defaultValue={price} aria-label="Narx (soʻm)" className="h-9 w-36" />
      <Checkbox name="active" defaultChecked={active} label="faol" />
      <Button type="submit" size="sm" variant="outline">Saqlash</Button>
    </ActionForm>
  );
}

export function SettingsForm({ weights, autoPublish, durationDays, autoHideReports }: { weights: MatchWeights; autoPublish: boolean; durationDays: number; autoHideReports: number }) {
  return (
    <ActionForm
      action={(fd) => updateSettingsAction({
        weights: Object.fromEntries(MATCH_FACTORS.map((k) => [k, Number(fd.get(`w_${k}`) ?? 0)])),
        autoPublish: fd.get("autoPublish") === "on",
        durationDays: Number(fd.get("durationDays")),
        autoHideReports: Number(fd.get("autoHideReports")),
      })}
      className="space-y-6"
      resetOnSuccess={false}
    >
      <fieldset>
        <legend className="mb-2 font-semibold text-slate-900">MATCH SCORE vaznlari</legend>
        <p className="mb-3 text-sm text-slate-600">Har bir omilning ulushi (0–100). Umumiy ball vaznlar yigʻindisiga nisbatan normallashtiriladi.</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {MATCH_FACTORS.map((k) => (
            <div key={k}>
              <Label htmlFor={`w_${k}`}>{FACTOR_LABELS[k]}</Label>
              <Input id={`w_${k}`} name={`w_${k}`} type="number" min={0} max={100} defaultValue={weights[k]} />
            </div>
          ))}
        </div>
      </fieldset>
      <fieldset className="grid gap-3 sm:grid-cols-3">
        <legend className="mb-2 font-semibold text-slate-900">Moderatsiya</legend>
        <Checkbox name="autoPublish" defaultChecked={autoPublish} label="Vakansiyalarni avtomatik eʼlon qilish" />
        <div><Label htmlFor="durationDays">Vakansiya muddati (kun)</Label><Input id="durationDays" name="durationDays" type="number" min={1} max={365} defaultValue={durationDays} /></div>
        <div><Label htmlFor="autoHideReports">Nechta shikoyatda yashirish</Label><Input id="autoHideReports" name="autoHideReports" type="number" min={1} max={100} defaultValue={autoHideReports} /></div>
      </fieldset>
      <Button type="submit">Saqlash</Button>
    </ActionForm>
  );
}

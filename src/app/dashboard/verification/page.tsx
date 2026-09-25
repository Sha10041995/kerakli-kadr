import type { Metadata } from "next";
import { Badge, Card, PageHeader } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/form";
import { ActionForm } from "@/components/ui/action-form";
import { ShieldIcon } from "@/components/ui/icons";
import { requireUser } from "@/features/auth/session";
import { requestVerificationAction } from "@/features/verification/actions";
import { verificationBadges, verificationLevel } from "@/features/verification/levels";
import { VERIFICATION_TYPE_LABELS } from "@/lib/i18n/uz";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Tasdiqlash", robots: { index: false } };

const STATUS = {
  pending: ["warning", "Koʻrib chiqilmoqda"],
  approved: ["success", "Tasdiqlandi"],
  rejected: ["danger", "Rad etildi"],
} as const;

export default async function VerificationPage() {
  const user = await requireUser("/dashboard/verification");
  const supabase = await createClient();
  const [{ data: profile }, { data: requests }, { data: company }] = await Promise.all([
    supabase.from("profiles").select("phone_verified, identity_verified, certificate_verified").eq("id", user.id).single(),
    supabase
      .from("verification_requests")
      .select("id, type, status, admin_note, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    user.companyId
      ? supabase.from("companies").select("verification_status").eq("id", user.companyId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const flags = {
    phoneVerified: profile?.phone_verified,
    identityVerified: profile?.identity_verified,
    certificateVerified: profile?.certificate_verified,
    companyVerified: company?.verification_status === "verified",
  };
  const level = verificationLevel(flags);

  return (
    <>
      <PageHeader title="Tasdiqlash" description="Tasdiqlangan profillar ish beruvchilar va nomzodlarning ishonchini oshiradi." />
      <Card className="mb-6 flex items-center gap-4">
        <span className="bg-brand-50 text-brand-700 inline-flex size-14 items-center justify-center rounded-full">
          <ShieldIcon size={28} />
        </span>
        <div>
          <p className="text-sm text-slate-500">Tasdiqlash darajasi</p>
          <p className="text-2xl font-bold text-slate-900">{level} / 4</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {verificationBadges(flags).map((b) => (
              <Badge key={b} tone="success">
                ✓ {b}
              </Badge>
            ))}
            {level === 0 ? <Badge>Tasdiqlanmagan</Badge> : null}
          </div>
        </div>
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Yangi soʻrov</h2>
          <ActionForm action={requestVerificationAction} className="space-y-3">
            <div>
              <Label htmlFor="v-type">Turi</Label>
              <Select id="v-type" name="type" defaultValue="identity">
                {Object.entries(VERIFICATION_TYPE_LABELS)
                  .filter(([k]) => k !== "company" || user.companyId)
                  .map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="v-file">Hujjat (PDF/JPG/PNG, 10 MB gacha)</Label>
              <Input id="v-file" name="file" type="file" accept="application/pdf,image/jpeg,image/png" className="py-1.5" />
              <p className="mt-1 text-xs text-slate-500">Hujjatlar yopiq saqlanadi va faqat moderatorlar koʻradi.</p>
            </div>
            <div>
              <Label htmlFor="v-note">Izoh</Label>
              <Textarea id="v-note" name="note" rows={2} maxLength={1000} />
            </div>
            <Button type="submit">Yuborish</Button>
          </ActionForm>
        </Card>
        <Card>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Mening soʻrovlarim</h2>
          {!requests?.length ? (
            <p className="text-sm text-slate-600">Hali soʻrov yoʻq.</p>
          ) : (
            <ul className="space-y-3">
              {requests.map((r) => (
                <li key={r.id} className="rounded-lg border border-slate-100 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-900">{VERIFICATION_TYPE_LABELS[r.type]}</span>
                    <Badge tone={STATUS[r.status][0]}>{STATUS[r.status][1]}</Badge>
                  </div>
                  <p className="text-xs text-slate-500">{formatDate(r.created_at)}</p>
                  {r.admin_note ? <p className="mt-1 text-slate-600">{r.admin_note}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

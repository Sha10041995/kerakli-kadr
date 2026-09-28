import type { Metadata } from "next";
import { Badge, Card, PageHeader } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/form";
import { ActionForm } from "@/components/ui/action-form";
import { ShieldIcon } from "@/components/ui/icons";
import { requireUser } from "@/features/auth/session";
import { requestVerificationAction } from "@/features/verification/actions";
import { verificationBadgeKinds, verificationLevel } from "@/features/verification/levels";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("verification.title"), robots: { index: false } };
}

const STATUS_TONE = { pending: "warning", approved: "success", rejected: "danger" } as const;

export default async function VerificationPage() {
  const user = await requireUser("/dashboard/verification");
  const supabase = await createClient();
  const { t, d, f } = await getI18n();
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
      <PageHeader title={t("verification.title")} description={t("verification.intro")} />
      <Card className="mb-6 flex items-center gap-4">
        <span className="bg-brand-50 text-brand-700 inline-flex size-14 items-center justify-center rounded-full">
          <ShieldIcon size={28} />
        </span>
        <div>
          <p className="text-sm text-slate-500">{t("verification.level")}</p>
          <p className="text-2xl font-bold text-slate-900">{level} / 4</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {verificationBadgeKinds(flags).map((b) => (
              <Badge key={b} tone="success">
                ✓ {t(`candidate.badge.${b}`)}
              </Badge>
            ))}
            {level === 0 ? <Badge>{t("verification.unverified")}</Badge> : null}
          </div>
        </div>
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">{t("verification.newRequest")}</h2>
          <ActionForm action={requestVerificationAction} className="space-y-3">
            <div>
              <Label htmlFor="v-type">{t("verification.type")}</Label>
              <Select id="v-type" name="type" defaultValue="identity">
                {Object.entries(d.enums.verificationType)
                  .filter(([k]) => k !== "company" || user.companyId)
                  .map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="v-file">{t("verification.document")}</Label>
              <Input id="v-file" name="file" type="file" accept="application/pdf,image/jpeg,image/png" className="py-1.5" />
              <p className="mt-1 text-xs text-slate-500">{t("verification.documentNote")}</p>
            </div>
            <div>
              <Label htmlFor="v-note">{t("verification.note")}</Label>
              <Textarea id="v-note" name="note" rows={2} maxLength={1000} />
            </div>
            <Button type="submit">{t("common.send")}</Button>
          </ActionForm>
        </Card>
        <Card>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">{t("verification.myRequests")}</h2>
          {!requests?.length ? (
            <p className="text-sm text-slate-600">{t("verification.noRequests")}</p>
          ) : (
            <ul className="space-y-3">
              {requests.map((r) => (
                <li key={r.id} className="rounded-lg border border-slate-100 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-900">{d.enums.verificationType[r.type]}</span>
                    <Badge tone={STATUS_TONE[r.status]}>{d.enums.requestStatus[r.status]}</Badge>
                  </div>
                  <p className="text-xs text-slate-500">{f.date(r.created_at)}</p>
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

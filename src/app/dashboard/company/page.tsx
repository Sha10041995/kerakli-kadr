import type { Metadata } from "next";
import Link from "next/link";
import { Alert, Avatar, Badge, Card, PageHeader } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/form";
import { ActionForm } from "@/components/ui/action-form";
import { requireEmployer } from "@/features/auth/session";
import { getRegions } from "@/features/locations/queries";
import { CompanyForm } from "@/features/employers/components/company-form";
import { uploadCompanyLogoAction } from "@/features/employers/actions";
import { createClient } from "@/lib/supabase/server";
import type { CompanyInput } from "@/validations/company";

export const metadata: Metadata = { title: "Kompaniya", robots: { index: false } };

const VERIFICATION_TONE = { verified: "success", pending: "warning", rejected: "danger", unverified: "neutral" } as const;
const VERIFICATION_LABEL = {
  verified: "Tasdiqlangan",
  pending: "Tekshiruvda",
  rejected: "Rad etilgan",
  unverified: "Tasdiqlanmagan",
} as const;

export default async function CompanyPage(props: PageProps<"/dashboard/company">) {
  const user = await requireEmployer("/dashboard/company");
  const sp = await props.searchParams;
  const supabase = await createClient();
  const [regions, { data: company }] = await Promise.all([
    getRegions(),
    user.companyId
      ? supabase.from("companies").select("*").eq("id", user.companyId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const defaults: CompanyInput = {
    name: company?.name ?? `${user.firstName} ${user.lastName}`.trim(),
    companyType: company?.company_type ?? "individual",
    stir: company?.stir ?? "",
    description: company?.description ?? "",
    website: company?.website ?? "",
    address: company?.address ?? "",
    regionId: company?.region_id ?? null,
    districtId: company?.district_id ?? null,
    settlementId: company?.settlement_id ?? null,
    mahallaId: company?.mahalla_id ?? null,
    lat: company?.lat ?? null,
    lng: company?.lng ?? null,
  };

  return (
    <>
      <PageHeader
        title={company ? company.name : "Ish beruvchi profili"}
        description={
          company ? (
            <Badge tone={VERIFICATION_TONE[company.verification_status]}>{VERIFICATION_LABEL[company.verification_status]}</Badge>
          ) : (
            "Vakansiya joylash uchun avval ish beruvchi maʼlumotlarini kiriting."
          )
        }
        actions={
          company ? (
            <Link href={`/company/${company.slug}`} className="text-brand-700 text-sm font-medium hover:underline">
              Ommaviy sahifa →
            </Link>
          ) : null
        }
      />
      {sp.welcome ? (
        <Alert tone="success" className="mb-4">
          Xush kelibsiz! Jismoniy shaxs sifatida ham vakansiya joylashingiz mumkin.
        </Alert>
      ) : null}
      {company ? (
        <Card className="mb-6 flex flex-wrap items-center gap-4">
          <Avatar src={company.logo_url} first={company.name} size={64} className="rounded-xl" />
          <ActionForm action={uploadCompanyLogoAction} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="companyId" value={company.id} />
            <div>
              <Label htmlFor="logo">Logo (2 MB gacha)</Label>
              <Input id="logo" name="file" type="file" accept="image/jpeg,image/png,image/webp" required className="py-1.5" />
            </div>
            <Button type="submit" variant="outline">
              Yuklash
            </Button>
          </ActionForm>
          {company.verification_status !== "verified" ? (
            <Link href="/dashboard/verification" className="text-brand-700 ml-auto text-sm font-medium hover:underline">
              Kompaniyani tasdiqlash →
            </Link>
          ) : null}
        </Card>
      ) : null}
      <CompanyForm defaults={defaults} regions={regions} isNew={!company} />
    </>
  );
}

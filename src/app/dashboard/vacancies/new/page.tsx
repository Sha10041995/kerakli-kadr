import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/misc";
import { requireEmployer } from "@/features/auth/session";
import { getCatalog, getProfessionSkillsMap, getSkills } from "@/features/catalog/queries";
import { getRegions } from "@/features/locations/queries";
import { VacancyForm } from "@/features/vacancies/components/vacancy-form";
import { emptyVacancy } from "@/features/vacancies/defaults";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Yangi vakansiya", robots: { index: false } };

export default async function NewVacancyPage() {
  const user = await requireEmployer("/dashboard/vacancies/new");
  if (!user.companyId) redirect("/dashboard/company?welcome=1");
  const supabase = await createClient();
  const [regions, catalog, skills, professionSkills, { data: company }] = await Promise.all([
    getRegions(),
    getCatalog(),
    getSkills(),
    getProfessionSkillsMap(),
    supabase.from("companies").select("region_id, district_id, settlement_id").eq("id", user.companyId).maybeSingle(),
  ]);
  return (
    <>
      <PageHeader title="Yangi vakansiya" description="Aniq hudud koʻrsatilgan vakansiyalar eng yaqin nomzodlarga birinchi koʻrsatiladi." />
      <VacancyForm
        defaults={emptyVacancy({ regionId: company?.region_id, districtId: company?.district_id, settlementId: company?.settlement_id })}
        regions={regions}
        catalog={catalog}
        skills={skills}
        professionSkills={professionSkills}
      />
    </>
  );
}

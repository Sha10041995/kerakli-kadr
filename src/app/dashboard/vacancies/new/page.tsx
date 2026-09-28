import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/misc";
import { requireEmployer } from "@/features/auth/session";
import { getCatalog, getProfessionSkillsMap, getSkills } from "@/features/catalog/queries";
import { getRegions } from "@/features/locations/queries";
import { VacancyForm } from "@/features/vacancies/components/vacancy-form";
import { emptyVacancy } from "@/features/vacancies/defaults";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("employer.newTitle"), robots: { index: false } };
}

export default async function NewVacancyPage() {
  const user = await requireEmployer("/dashboard/vacancies/new");
  if (!user.companyId) redirect("/dashboard/company?welcome=1");
  const supabase = await createClient();
  const [regions, catalog, skills, professionSkills, { data: company }, { t }] = await Promise.all([
    getRegions(),
    getCatalog(),
    getSkills(),
    getProfessionSkillsMap(),
    supabase.from("companies").select("region_id, district_id, settlement_id").eq("id", user.companyId).maybeSingle(),
    getI18n(),
  ]);
  return (
    <>
      <PageHeader title={t("employer.newTitle")} description={t("employer.newIntro")} />
      <VacancyForm
        defaults={emptyVacancy({
          regionId: company?.region_id,
          districtId: company?.district_id,
          settlementId: company?.settlement_id,
        })}
        regions={regions}
        catalog={catalog}
        skills={skills}
        professionSkills={professionSkills}
      />
    </>
  );
}

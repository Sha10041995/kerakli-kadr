import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/misc";
import { requireEmployer } from "@/features/auth/session";
import { getCatalog, getProfessionSkillsMap, getSkills } from "@/features/catalog/queries";
import { getRegions } from "@/features/locations/queries";
import { VacancyForm } from "@/features/vacancies/components/vacancy-form";
import { vacancyToInput } from "@/features/vacancies/defaults";
import { getVacancy } from "@/features/vacancies/queries";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("employer.editTitle"), robots: { index: false } };
}

export default async function EditVacancyPage(props: PageProps<"/dashboard/vacancies/[id]/edit">) {
  const { id } = await props.params;
  const user = await requireEmployer(`/dashboard/vacancies/${id}/edit`);
  const vacancy = await getVacancy(id);
  if (!vacancy || vacancy.company_id !== user.companyId) notFound();
  const [regions, catalog, skills, professionSkills, { t }] = await Promise.all([
    getRegions(),
    getCatalog(),
    getSkills(),
    getProfessionSkillsMap(),
    getI18n(),
  ]);
  return (
    <>
      <PageHeader title={t("employer.editTitle")} description={vacancy.title} />
      <VacancyForm
        id={id}
        defaults={vacancyToInput(vacancy)}
        regions={regions}
        catalog={catalog}
        skills={skills}
        professionSkills={professionSkills}
      />
    </>
  );
}

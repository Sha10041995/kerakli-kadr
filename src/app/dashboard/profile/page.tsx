import type { Metadata } from "next";
import Link from "next/link";
import { Alert, Avatar, Card, PageHeader } from "@/components/ui/misc";
import { requireJobSeeker } from "@/features/auth/session";
import { getCatalog, getProfessionSkillsMap, getSkills } from "@/features/catalog/queries";
import { getRegions } from "@/features/locations/queries";
import { getOwnCandidateProfile } from "@/features/candidates/queries";
import { CandidateProfileForm } from "@/features/candidates/components/profile-form";
import {
  AvatarUpload,
  CertificateSection,
  EducationSection,
  ExperienceSection,
  PortfolioSection,
} from "@/features/candidates/components/profile-sections";
import { getI18n } from "@/lib/i18n/server";
import type { CandidateProfileInput } from "@/validations/candidate";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("profile.title"), robots: { index: false } };
}

export default async function CandidateProfilePage(props: PageProps<"/dashboard/profile">) {
  const user = await requireJobSeeker("/dashboard/profile");
  const sp = await props.searchParams;
  const [{ profile, person }, regions, catalog, skills, professionSkills, { t }] = await Promise.all([
    getOwnCandidateProfile(user.id),
    getRegions(),
    getCatalog(),
    getSkills(),
    getProfessionSkillsMap(),
    getI18n(),
  ]);

  const defaults: CandidateProfileInput = {
    firstName: person?.first_name ?? user.firstName,
    lastName: person?.last_name ?? user.lastName,
    phone: person?.phone ?? "",
    birthYear: person?.birth_year ?? null,
    headline: profile?.headline ?? "",
    about: profile?.about ?? "",
    professionId: profile?.profession_id ?? null,
    experienceYears: Number(profile?.experience_years ?? 0),
    educationLevel: profile?.education_level ?? null,
    expectedSalaryMin: profile?.expected_salary_min ?? null,
    expectedSalaryMax: profile?.expected_salary_max ?? null,
    salaryType: profile?.salary_type ?? "monthly",
    employmentTypes: profile?.employment_types ?? ["full_time"],
    availability: profile?.availability ?? "immediately",
    hasTransport: profile?.has_transport ?? false,
    remoteOk: profile?.remote_ok ?? false,
    relocateOk: profile?.relocate_ok ?? false,
    workRadiusKm: profile?.work_radius_km ?? 25,
    isPublic: profile?.is_public ?? true,
    skillIds: (profile?.candidate_skills ?? []).map((s) => s.skill_id),
    regionId: profile?.region_id ?? null,
    districtId: profile?.district_id ?? null,
    settlementId: profile?.settlement_id ?? null,
    mahallaId: profile?.mahalla_id ?? null,
    lat: profile?.lat ?? null,
    lng: profile?.lng ?? null,
  };

  return (
    <>
      <PageHeader
        title={t("profile.title")}
        description={
          profile ? (
            <>
              {t("profile.completeness")} <strong>{profile.completeness}%</strong>
            </>
          ) : (
            t("profile.fillPrompt")
          )
        }
        actions={
          profile ? (
            <Link href={`/candidate/${user.id}`} className="text-brand-700 text-sm font-medium hover:underline">
              {t("profile.viewPublic")}
            </Link>
          ) : null
        }
      />
      {sp.welcome ? (
        <Alert tone="success" className="mb-4">
          {t("profile.welcome")}
        </Alert>
      ) : null}
      <Card className="mb-6 flex items-center gap-4">
        <Avatar src={person?.avatar_url} first={person?.first_name} last={person?.last_name} size={64} />
        <AvatarUpload />
      </Card>
      <CandidateProfileForm
        defaults={defaults}
        regions={regions}
        catalog={catalog}
        skills={skills}
        professionSkills={professionSkills}
      />
      {profile ? (
        <div className="mt-6 space-y-6">
          <ExperienceSection items={profile.candidate_experience ?? []} />
          <EducationSection items={profile.candidate_education ?? []} />
          <CertificateSection items={profile.candidate_certificates ?? []} />
          <PortfolioSection items={profile.candidate_portfolio ?? []} />
        </div>
      ) : (
        <Alert tone="info" className="mt-6">
          {t("profile.sectionsAfterSave")}
        </Alert>
      )}
    </>
  );
}

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Label, Select } from "@/components/ui/form";
import { GetForm } from "@/components/ui/get-form";
import { MobileCollapsible } from "@/components/ui/collapsible";
import { LocationPicker } from "@/features/locations/components/location-picker";
import { ProfessionSelect } from "@/features/catalog/components/profession-select";
import type { CategoryWithProfessions } from "@/features/catalog/queries";
import type { LocationOption } from "@/features/locations/queries";
import type { CandidateSearch, VacancySearch } from "@/features/search/params";
import { enumOptions } from "@/lib/i18n/dictionary";
import { getI18n } from "@/lib/i18n/server";
import { RADIUS_OPTIONS } from "@/features/search/radius";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-t border-slate-100 pt-4 first:border-0 first:pt-0">
      <legend className="mb-2 text-sm font-semibold text-slate-800">{title}</legend>
      <div className="space-y-2">{children}</div>
    </fieldset>
  );
}

async function Shell({ action, children, resetHref }: { action: string; children: React.ReactNode; resetHref: string }) {
  const { t } = await getI18n();
  return (
    <MobileCollapsible label={t("search.filters")}>
      <GetForm action={action} className="space-y-4 p-4">
        {children}
        <div className="flex gap-2 pt-2">
          <Button type="submit" className="flex-1">
            {t("search.apply")}
          </Button>
          <Link
            href={resetHref}
            className="inline-flex h-10 items-center rounded-lg px-3 text-sm text-slate-600 hover:bg-slate-100"
          >
            {t("search.reset")}
          </Link>
        </div>
      </GetForm>
    </MobileCollapsible>
  );
}

async function RadiusSelect({ value }: { value?: number }) {
  const { t } = await getI18n();
  return (
    <div>
      <Label htmlFor="f-radius">{t("search.radius")}</Label>
      <Select id="f-radius" name="radius" defaultValue={value ?? ""}>
        <option value="">{t("search.byArea")}</option>
        {RADIUS_OPTIONS.map((r) => (
          <option key={r} value={r}>
            {t("search.km", { n: r })}
          </option>
        ))}
      </Select>
    </div>
  );
}

export async function VacancyFilters({
  search,
  regions,
  catalog,
  action = "/jobs",
}: {
  search: VacancySearch;
  regions: LocationOption[];
  catalog: CategoryWithProfessions[];
  action?: string;
}) {
  const { t, d } = await getI18n();
  return (
    <Shell action={action} resetHref={action}>
      <Section title={t("search.searchSection")}>
        <Input
          name="q"
          defaultValue={search.q}
          placeholder={t("search.jobKeyword")}
          aria-label={t("search.keyword")}
          maxLength={80}
        />
        <ProfessionSelect
          name="profession"
          catalog={catalog}
          defaultValue={search.profession ?? ""}
          aria-label={t("search.profession")}
          placeholder={t("search.allProfessions")}
        />
      </Section>
      <Section title={t("search.area")}>
        <LocationPicker
          regions={regions}
          compact
          value={{
            regionId: search.region,
            districtId: search.district,
            settlementId: search.settlement,
            mahallaId: search.mahalla,
          }}
          names={{ region: "region", district: "district", settlement: "settlement", mahalla: "mahalla" }}
        />
        <RadiusSelect value={search.radius} />
        {search.lat !== undefined ? (
          <>
            <input type="hidden" name="lat" value={search.lat} />
            <input type="hidden" name="lng" value={search.lng} />
            <p className="text-xs text-slate-500">{t("search.byGps")}</p>
          </>
        ) : null}
      </Section>
      <Section title={t("search.employmentType")}>
        {enumOptions(d.enums.employmentType).map((o) => (
          <Checkbox key={o.value} name="type" value={o.value} defaultChecked={search.types.includes(o.value)} label={o.label} />
        ))}
      </Section>
      <Section title={t("search.salaryAndExperience")}>
        <div>
          <Label htmlFor="f-salary">{t("search.minSalary")}</Label>
          <Input id="f-salary" name="salary" type="number" min={0} step={100000} defaultValue={search.salary} />
        </div>
        <div>
          <Label htmlFor="f-exp">{t("search.myExperience")}</Label>
          <Input id="f-exp" name="exp" type="number" min={0} max={50} defaultValue={search.exp} />
        </div>
      </Section>
      <Section title={t("search.extra")}>
        <Checkbox name="urgent" value="1" defaultChecked={search.urgent} label={t("search.urgent")} />
        <Checkbox name="remote" value="1" defaultChecked={search.remote} label={t("search.remote")} />
        <Checkbox name="transport" value="1" defaultChecked={search.transport} label={t("search.transport")} />
        <Checkbox name="housing" value="1" defaultChecked={search.housing} label={t("search.housing")} />
        <Checkbox name="verified" value="1" defaultChecked={search.verified} label={t("search.verifiedEmployers")} />
      </Section>
      <Section title={t("search.sort")}>
        <Select name="sort" defaultValue={search.sort} aria-label={t("search.sort")}>
          <option value="relevance">{t("search.sortRelevance")}</option>
          <option value="distance">{t("search.sortDistance")}</option>
          <option value="newest">{t("search.sortNewest")}</option>
          <option value="salary">{t("search.sortSalary")}</option>
        </Select>
      </Section>
    </Shell>
  );
}

export async function CandidateFilters({
  search,
  regions,
  catalog,
  action = "/candidates",
}: {
  search: CandidateSearch;
  regions: LocationOption[];
  catalog: CategoryWithProfessions[];
  action?: string;
}) {
  const { t, d } = await getI18n();
  return (
    <Shell action={action} resetHref={action}>
      <Section title={t("search.searchSection")}>
        <Input
          name="q"
          defaultValue={search.q}
          placeholder={t("search.talentKeyword")}
          aria-label={t("search.keyword")}
          maxLength={80}
        />
        <ProfessionSelect
          name="profession"
          catalog={catalog}
          defaultValue={search.profession ?? ""}
          aria-label={t("search.profession")}
          placeholder={t("search.allProfessions")}
        />
      </Section>
      <Section title={t("search.area")}>
        <LocationPicker
          regions={regions}
          compact
          value={{
            regionId: search.region,
            districtId: search.district,
            settlementId: search.settlement,
            mahallaId: search.mahalla,
          }}
          names={{ region: "region", district: "district", settlement: "settlement", mahalla: "mahalla" }}
        />
        <RadiusSelect value={search.radius} />
        {search.lat !== undefined ? (
          <>
            <input type="hidden" name="lat" value={search.lat} />
            <input type="hidden" name="lng" value={search.lng} />
          </>
        ) : null}
      </Section>
      <Section title={t("search.availability")}>
        {enumOptions(d.enums.availability)
          .filter((o) => o.value !== "not_available")
          .map((o) => (
            <Checkbox
              key={o.value}
              name="availability"
              value={o.value}
              defaultChecked={search.availability.includes(o.value)}
              label={o.label}
            />
          ))}
      </Section>
      <Section title={t("search.employmentType")}>
        {enumOptions(d.enums.employmentType).map((o) => (
          <Checkbox key={o.value} name="type" value={o.value} defaultChecked={search.types.includes(o.value)} label={o.label} />
        ))}
      </Section>
      <Section title={t("search.experienceAndSalary")}>
        <div>
          <Label htmlFor="c-exp">{t("search.minExperience")}</Label>
          <Input id="c-exp" name="exp" type="number" min={0} max={50} defaultValue={search.exp} />
        </div>
        <div>
          <Label htmlFor="c-salary">{t("search.budget")}</Label>
          <Input id="c-salary" name="salary" type="number" min={0} step={100000} defaultValue={search.salary} />
        </div>
        <div>
          <Label htmlFor="c-rating">{t("search.minRating")}</Label>
          <Select id="c-rating" name="rating" defaultValue={search.rating ?? ""}>
            <option value="">{t("search.notImportant")}</option>
            {[3, 4, 5].map((r) => (
              <option key={r} value={r}>
                {t("search.starsAndUp", { n: r })}
              </option>
            ))}
          </Select>
        </div>
      </Section>
      <Section title={t("search.extra")}>
        <Checkbox name="verified" value="1" defaultChecked={search.verified} label={t("search.verifiedOnly")} />
        <Checkbox name="transport" value="1" defaultChecked={search.transport} label={t("search.hasTransport")} />
        <Checkbox name="remote" value="1" defaultChecked={search.remote} label={t("search.canRemote")} />
      </Section>
      <Section title={t("search.sort")}>
        <Select name="sort" defaultValue={search.sort} aria-label={t("search.sort")}>
          <option value="relevance">{t("search.sortRelevance")}</option>
          <option value="distance">{t("search.sortDistance")}</option>
          <option value="rating">{t("search.sortRating")}</option>
          <option value="experience">{t("search.sortExperience")}</option>
        </Select>
      </Section>
    </Shell>
  );
}

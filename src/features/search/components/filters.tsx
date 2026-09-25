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
import { AVAILABILITY_LABELS, EMPLOYMENT_TYPE_LABELS, RADIUS_OPTIONS, options } from "@/lib/i18n/uz";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-t border-slate-100 pt-4 first:border-0 first:pt-0">
      <legend className="mb-2 text-sm font-semibold text-slate-800">{title}</legend>
      <div className="space-y-2">{children}</div>
    </fieldset>
  );
}

function Shell({ action, children, resetHref }: { action: string; children: React.ReactNode; resetHref: string }) {
  return (
    <MobileCollapsible label="Filtrlar">
      <GetForm action={action} className="space-y-4 p-4">
        {children}
        <div className="flex gap-2 pt-2">
          <Button type="submit" className="flex-1">Qoʻllash</Button>
          <Link href={resetHref} className="inline-flex h-10 items-center rounded-lg px-3 text-sm text-slate-600 hover:bg-slate-100">Tozalash</Link>
        </div>
      </GetForm>
    </MobileCollapsible>
  );
}

function RadiusSelect({ value }: { value?: number }) {
  return (
    <div>
      <Label htmlFor="f-radius">Radius</Label>
      <Select id="f-radius" name="radius" defaultValue={value ?? ""}>
        <option value="">Hudud boʻyicha</option>
        {RADIUS_OPTIONS.map((r) => (
          <option key={r} value={r}>{r} km</option>
        ))}
      </Select>
    </div>
  );
}

export function VacancyFilters({
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
  return (
    <Shell action={action} resetHref={action}>
      <Section title="Qidiruv">
        <Input name="q" defaultValue={search.q} placeholder="Lavozim yoki kasb" aria-label="Kalit soʻz" maxLength={80} />
        <ProfessionSelect name="profession" catalog={catalog} defaultValue={search.profession ?? ""} aria-label="Kasb" />
      </Section>
      <Section title="Hudud">
        <LocationPicker
          regions={regions}
          compact
          value={{ regionId: search.region, districtId: search.district, settlementId: search.settlement, mahallaId: search.mahalla }}
          names={{ region: "region", district: "district", settlement: "settlement", mahalla: "mahalla" }}
        />
        <RadiusSelect value={search.radius} />
        {search.lat !== undefined ? (
          <>
            <input type="hidden" name="lat" value={search.lat} />
            <input type="hidden" name="lng" value={search.lng} />
            <p className="text-xs text-slate-500">GPS joylashuvingiz boʻyicha</p>
          </>
        ) : null}
      </Section>
      <Section title="Ish turi">
        {options(EMPLOYMENT_TYPE_LABELS).map((o) => (
          <Checkbox key={o.value} name="type" value={o.value} defaultChecked={search.types.includes(o.value)} label={o.label} />
        ))}
      </Section>
      <Section title="Maosh va tajriba">
        <div>
          <Label htmlFor="f-salary">Maosh (kamida, soʻm)</Label>
          <Input id="f-salary" name="salary" type="number" min={0} step={100000} defaultValue={search.salary} />
        </div>
        <div>
          <Label htmlFor="f-exp">Mening tajribam (yil)</Label>
          <Input id="f-exp" name="exp" type="number" min={0} max={50} defaultValue={search.exp} />
        </div>
      </Section>
      <Section title="Qoʻshimcha">
        <Checkbox name="urgent" value="1" defaultChecked={search.urgent} label="Shoshilinch" />
        <Checkbox name="remote" value="1" defaultChecked={search.remote} label="Masofaviy" />
        <Checkbox name="transport" value="1" defaultChecked={search.transport} label="Transport beriladi" />
        <Checkbox name="housing" value="1" defaultChecked={search.housing} label="Turar joy beriladi" />
        <Checkbox name="verified" value="1" defaultChecked={search.verified} label="Faqat tasdiqlangan ish beruvchilar" />
      </Section>
      <Section title="Saralash">
        <Select name="sort" defaultValue={search.sort} aria-label="Saralash">
          <option value="relevance">Hudud va moslik</option>
          <option value="distance">Eng yaqin</option>
          <option value="newest">Eng yangi</option>
          <option value="salary">Eng yuqori maosh</option>
        </Select>
      </Section>
    </Shell>
  );
}

export function CandidateFilters({
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
  return (
    <Shell action={action} resetHref={action}>
      <Section title="Qidiruv">
        <Input name="q" defaultValue={search.q} placeholder="Kasb yoki koʻnikma" aria-label="Kalit soʻz" maxLength={80} />
        <ProfessionSelect name="profession" catalog={catalog} defaultValue={search.profession ?? ""} aria-label="Kasb" />
      </Section>
      <Section title="Hudud">
        <LocationPicker
          regions={regions}
          compact
          value={{ regionId: search.region, districtId: search.district, settlementId: search.settlement, mahallaId: search.mahalla }}
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
      <Section title="Mavjudlik">
        {options(AVAILABILITY_LABELS)
          .filter((o) => o.value !== "not_available")
          .map((o) => (
            <Checkbox key={o.value} name="availability" value={o.value} defaultChecked={search.availability.includes(o.value)} label={o.label} />
          ))}
      </Section>
      <Section title="Ish turi">
        {options(EMPLOYMENT_TYPE_LABELS).map((o) => (
          <Checkbox key={o.value} name="type" value={o.value} defaultChecked={search.types.includes(o.value)} label={o.label} />
        ))}
      </Section>
      <Section title="Tajriba va maosh">
        <div>
          <Label htmlFor="c-exp">Tajriba (kamida, yil)</Label>
          <Input id="c-exp" name="exp" type="number" min={0} max={50} defaultValue={search.exp} />
        </div>
        <div>
          <Label htmlFor="c-salary">Byudjet (koʻpi bilan, soʻm)</Label>
          <Input id="c-salary" name="salary" type="number" min={0} step={100000} defaultValue={search.salary} />
        </div>
        <div>
          <Label htmlFor="c-rating">Reyting (kamida)</Label>
          <Select id="c-rating" name="rating" defaultValue={search.rating ?? ""}>
            <option value="">Muhim emas</option>
            {[3, 4, 5].map((r) => (
              <option key={r} value={r}>{r}★ va yuqori</option>
            ))}
          </Select>
        </div>
      </Section>
      <Section title="Qoʻshimcha">
        <Checkbox name="verified" value="1" defaultChecked={search.verified} label="Faqat tasdiqlanganlar" />
        <Checkbox name="transport" value="1" defaultChecked={search.transport} label="Transporti bor" />
        <Checkbox name="remote" value="1" defaultChecked={search.remote} label="Masofadan ishlay oladi" />
      </Section>
      <Section title="Saralash">
        <Select name="sort" defaultValue={search.sort} aria-label="Saralash">
          <option value="relevance">Hudud va moslik</option>
          <option value="distance">Eng yaqin</option>
          <option value="rating">Reyting</option>
          <option value="experience">Tajriba</option>
        </Select>
      </Section>
    </Shell>
  );
}

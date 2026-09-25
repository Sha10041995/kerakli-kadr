// Parsing untrusted URL search params into typed, bounded search filters and
// back into URLs. Shared by the vacancy and candidate search pages.
import type { Enums } from "@/types/database";

export type RawSearchParams = Record<string, string | string[] | undefined>;

export const PAGE_SIZE = 20;

const EMPLOYMENT_TYPES: Enums<"employment_type">[] = [
  "full_time",
  "part_time",
  "temporary",
  "freelance",
  "daily",
  "hourly",
  "seasonal",
  "internship",
  "remote",
];
const AVAILABILITY: Enums<"availability_status">[] = [
  "immediately",
  "within_week",
  "within_month",
  "open_to_offers",
  "not_available",
];

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const all = (v: string | string[] | undefined) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

function int(v: string | string[] | undefined, min = 1, max = Number.MAX_SAFE_INTEGER): number | undefined {
  const s = first(v);
  if (!s || !/^\d{1,12}$/.test(s)) return undefined;
  const n = Number(s);
  return n >= min && n <= max ? n : undefined;
}

function float(v: string | string[] | undefined, min: number, max: number): number | undefined {
  const s = first(v);
  if (!s || !/^-?\d{1,3}(\.\d{1,7})?$/.test(s)) return undefined;
  const n = Number(s);
  return n >= min && n <= max ? n : undefined;
}

const flag = (v: string | string[] | undefined) => first(v) === "1" || first(v) === "true";

function text(v: string | string[] | undefined, max = 80): string | undefined {
  const s = first(v)
    ?.replace(/[\u0000-\u001F\u007F]/g, "")
    .trim();
  return s ? s.slice(0, max) : undefined;
}

function oneOf<T extends string>(v: string | string[] | undefined, allowed: readonly T[]): T | undefined {
  const s = first(v);
  return s && (allowed as readonly string[]).includes(s) ? (s as T) : undefined;
}

function manyOf<T extends string>(v: string | string[] | undefined, allowed: readonly T[]): T[] {
  return [
    ...new Set(
      all(v)
        .flatMap((s) => s.split(","))
        .filter((s): s is T => (allowed as readonly string[]).includes(s)),
    ),
  ];
}

type LocationFilters = {
  q?: string;
  category?: number;
  profession?: number;
  region?: number;
  district?: number;
  settlement?: number;
  mahalla?: number;
  lat?: number;
  lng?: number;
  radius?: number;
  page: number;
};

function parseLocation(p: RawSearchParams): LocationFilters {
  const lat = float(p.lat, 37, 45.7);
  const lng = float(p.lng, 55.9, 73.2);
  return {
    q: text(p.q),
    category: int(p.category),
    profession: int(p.profession),
    region: int(p.region),
    district: int(p.district),
    settlement: int(p.settlement),
    mahalla: int(p.mahalla),
    lat: lat !== undefined && lng !== undefined ? lat : undefined,
    lng: lat !== undefined && lng !== undefined ? lng : undefined,
    radius: int(p.radius, 1, 500),
    page: int(p.page, 1, 500) ?? 1,
  };
}

export type VacancySearch = LocationFilters & {
  types: Enums<"employment_type">[];
  salary?: number;
  exp?: number;
  remote: boolean;
  urgent: boolean;
  transport: boolean;
  housing: boolean;
  verified: boolean;
  sort: "relevance" | "distance" | "newest" | "salary";
};

export function parseVacancySearch(p: RawSearchParams): VacancySearch {
  return {
    ...parseLocation(p),
    types: manyOf(p.type, EMPLOYMENT_TYPES),
    salary: int(p.salary, 1, 10_000_000_000),
    exp: int(p.exp, 0, 50),
    remote: flag(p.remote),
    urgent: flag(p.urgent),
    transport: flag(p.transport),
    housing: flag(p.housing),
    verified: flag(p.verified),
    sort: oneOf(p.sort, ["relevance", "distance", "newest", "salary"] as const) ?? "relevance",
  };
}

export type CandidateSearch = LocationFilters & {
  types: Enums<"employment_type">[];
  availability: Enums<"availability_status">[];
  exp?: number;
  salary?: number;
  rating?: number;
  skills: number[];
  verified: boolean;
  transport: boolean;
  remote: boolean;
  sort: "relevance" | "distance" | "rating" | "experience";
};

export function parseCandidateSearch(p: RawSearchParams): CandidateSearch {
  return {
    ...parseLocation(p),
    types: manyOf(p.type, EMPLOYMENT_TYPES),
    availability: manyOf(p.availability, AVAILABILITY),
    exp: int(p.exp, 0, 50),
    salary: int(p.salary, 1, 10_000_000_000),
    rating: int(p.rating, 1, 5),
    skills: [
      ...new Set(
        all(p.skill)
          .map((s) => int(s))
          .filter((n): n is number => n !== undefined),
      ),
    ].slice(0, 10),
    verified: flag(p.verified),
    transport: flag(p.transport),
    remote: flag(p.remote),
    sort: oneOf(p.sort, ["relevance", "distance", "rating", "experience"] as const) ?? "relevance",
  };
}

const orNull = <T>(v: T | undefined | false) => (v === undefined || v === false ? null : v);

export function vacancyRpcArgs(s: VacancySearch, pageSize = PAGE_SIZE) {
  return {
    p_query: orNull(s.q),
    p_category_id: orNull(s.category),
    p_profession_id: orNull(s.profession),
    p_region_id: orNull(s.region),
    p_district_id: orNull(s.district),
    p_settlement_id: orNull(s.settlement),
    p_mahalla_id: orNull(s.mahalla),
    p_lat: orNull(s.lat),
    p_lng: orNull(s.lng),
    p_radius_km: orNull(s.radius),
    p_employment_types: s.types.length ? s.types : null,
    p_salary_min: orNull(s.salary),
    p_experience_max: orNull(s.exp),
    p_remote: s.remote || null,
    p_urgent: s.urgent || null,
    p_transport: s.transport || null,
    p_accommodation: s.housing || null,
    p_verified_only: s.verified,
    p_sort: s.sort,
    p_limit: pageSize,
    p_offset: (s.page - 1) * pageSize,
  };
}

export function candidateRpcArgs(s: CandidateSearch, pageSize = PAGE_SIZE) {
  return {
    p_query: orNull(s.q),
    p_category_id: orNull(s.category),
    p_profession_id: orNull(s.profession),
    p_region_id: orNull(s.region),
    p_district_id: orNull(s.district),
    p_settlement_id: orNull(s.settlement),
    p_mahalla_id: orNull(s.mahalla),
    p_lat: orNull(s.lat),
    p_lng: orNull(s.lng),
    p_radius_km: orNull(s.radius),
    p_experience_min: orNull(s.exp),
    p_salary_max: orNull(s.salary),
    p_availability: s.availability.length ? s.availability : null,
    p_employment_types: s.types.length ? s.types : null,
    p_min_rating: orNull(s.rating),
    p_verified_only: s.verified,
    p_has_transport: s.transport || null,
    p_remote: s.remote || null,
    p_skill_ids: s.skills.length ? s.skills : null,
    p_sort: s.sort,
    p_limit: pageSize,
    p_offset: (s.page - 1) * pageSize,
  };
}

type Serializable = Record<string, string | number | boolean | undefined | null | (string | number)[]>;

/** Builds "?a=1&type=x&type=y" skipping empty values and default page/sort. */
export function toQueryString(values: Serializable): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null || value === false || value === "") continue;
    if (key === "page" && value === 1) continue;
    if (key === "sort" && value === "relevance") continue;
    if (Array.isArray(value)) value.forEach((v) => sp.append(key, String(v)));
    else sp.set(key, value === true ? "1" : String(value));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export function searchToQuery(s: VacancySearch | CandidateSearch, overrides: Serializable = {}): string {
  const { types, ...rest } = s as VacancySearch & CandidateSearch;
  return toQueryString({ ...(rest as unknown as Serializable), type: types, ...overrides });
}

export function totalPages(total: number, pageSize = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

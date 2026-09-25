import { describe, expect, it } from "vitest";
import {
  candidateRpcArgs, parseCandidateSearch, parseVacancySearch, searchToQuery, toQueryString, totalPages, vacancyRpcArgs,
} from "@/features/search/params";
import { resolveSeoSegments, seoPath, seoTitle, type SeoLookup } from "@/features/search/seo-routes";

describe("parseVacancySearch", () => {
  it("parses valid filters", () => {
    const s = parseVacancySearch({
      q: " elektrik ", region: "6", district: "71", radius: "25", type: ["daily", "full_time"], remote: "1",
      salary: "5000000", sort: "distance", page: "3",
    });
    expect(s).toMatchObject({
      q: "elektrik", region: 6, district: 71, radius: 25, types: ["daily", "full_time"], remote: true,
      salary: 5000000, sort: "distance", page: 3,
    });
  });

  it("drops malicious or malformed values", () => {
    const s = parseVacancySearch({
      region: "1 OR 1=1", district: "-5", radius: "9999", type: ["hacker", "daily"], sort: "drop table",
      page: "0", lat: "41.3", lng: "abc", q: "a".repeat(500),
    });
    expect(s.region).toBeUndefined();
    expect(s.district).toBeUndefined();
    expect(s.radius).toBeUndefined();
    expect(s.types).toEqual(["daily"]);
    expect(s.sort).toBe("relevance");
    expect(s.page).toBe(1);
    expect(s.lat).toBeUndefined(); // needs both coordinates
    expect(s.q?.length).toBe(80);
  });

  it("rejects coordinates outside Uzbekistan", () => {
    expect(parseVacancySearch({ lat: "51.5", lng: "0.12" }).lat).toBeUndefined();
    expect(parseVacancySearch({ lat: "41.31", lng: "69.28" })).toMatchObject({ lat: 41.31, lng: 69.28 });
  });

  it("maps to RPC args with pagination", () => {
    const args = vacancyRpcArgs(parseVacancySearch({ profession: "4", page: "2" }));
    expect(args).toMatchObject({ p_profession_id: 4, p_offset: 20, p_limit: 20, p_remote: null, p_employment_types: null });
  });
});

describe("parseCandidateSearch", () => {
  it("parses skills and availability", () => {
    const s = parseCandidateSearch({ skill: ["3", "3", "x", "9"], availability: "immediately,within_week", rating: "4" });
    expect(s.skills).toEqual([3, 9]);
    expect(s.availability).toEqual(["immediately", "within_week"]);
    expect(candidateRpcArgs(s)).toMatchObject({ p_skill_ids: [3, 9], p_min_rating: 4 });
  });
});

describe("query strings", () => {
  it("omits defaults and empty values", () => {
    expect(toQueryString({ q: "", page: 1, sort: "relevance", region: 5, remote: true, type: ["a", "b"] })).toBe(
      "?region=5&remote=1&type=a&type=b",
    );
  });
  it("round-trips a search with overrides", () => {
    const s = parseVacancySearch({ region: "6", type: "daily" });
    expect(searchToQuery(s, { page: 2 })).toBe("?region=6&page=2&type=daily");
  });
  it("computes total pages", () => {
    expect(totalPages(0)).toBe(1);
    expect(totalPages(41)).toBe(3);
  });
});

describe("SEO route resolution", () => {
  const lookup: SeoLookup = {
    region: async (s) => (s === "xorazm" ? { id: 6, name: "Xorazm viloyati" } : s === "toshkent" ? { id: 1, name: "Toshkent shahri" } : null),
    district: async (r, s) => (r === 6 && s === "urganch-shahri" ? { id: 70, name: "Urganch shahri" } : null),
    profession: async (s) => (s === "payvandchi" ? { id: 5, name: "Payvandchi" } : null),
  };

  it("resolves region/district/profession combinations", async () => {
    expect(await resolveSeoSegments([], lookup)).toEqual({});
    expect((await resolveSeoSegments(["xorazm"], lookup))?.region?.id).toBe(6);
    const full = await resolveSeoSegments(["xorazm", "urganch-shahri", "payvandchi"], lookup);
    expect(full?.district?.id).toBe(70);
    expect(full?.profession?.id).toBe(5);
    expect((await resolveSeoSegments(["toshkent", "payvandchi"], lookup))?.profession?.id).toBe(5);
    expect((await resolveSeoSegments(["payvandchi"], lookup))?.profession?.id).toBe(5);
  });

  it("returns null for unknown or malformed paths", async () => {
    expect(await resolveSeoSegments(["mars"], lookup)).toBeNull();
    expect(await resolveSeoSegments(["xorazm", "nowhere"], lookup)).toBeNull();
    expect(await resolveSeoSegments(["xorazm", "urganch-shahri", "astronaut"], lookup)).toBeNull();
    expect(await resolveSeoSegments(["xorazm", "payvandchi", "extra"], lookup)).toBeNull();
    expect(await resolveSeoSegments(["../etc", "passwd"], lookup)).toBeNull();
    expect(await resolveSeoSegments(["a", "b", "c", "d"], lookup)).toBeNull();
  });

  it("builds titles and canonical paths", async () => {
    const r = (await resolveSeoSegments(["xorazm", "urganch-shahri", "payvandchi"], lookup))!;
    expect(seoTitle("jobs", r)).toBe("Urganch shahrida Payvandchi vakansiyalari");
    expect(seoPath("candidates", r)).toBe("/candidates/xorazm/urganch-shahri/payvandchi");
  });
});

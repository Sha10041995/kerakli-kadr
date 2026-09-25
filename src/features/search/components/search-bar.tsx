"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { PinIcon, SearchIcon, TargetIcon } from "@/components/ui/icons";
import { LocationPicker, type LocationValue } from "@/features/locations/components/location-picker";
import { RADIUS_OPTIONS } from "@/lib/i18n/uz";
import { cn } from "@/lib/utils";

type Props = {
  regions: { id: number; name: string }[];
  professions: { id: number; name: string; category: string }[];
  defaultMode?: "jobs" | "candidates";
};

export function SearchBar({ regions, professions, defaultMode = "jobs" }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"jobs" | "candidates">(defaultMode);
  const [q, setQ] = useState("");
  const [profession, setProfession] = useState("");
  const [radius, setRadius] = useState("");
  const [loc, setLoc] = useState<LocationValue>({ regionId: null, districtId: null, settlementId: null, mahallaId: null });
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsState, setGpsState] = useState<"idle" | "loading" | "error">("idle");

  function useMyLocation() {
    if (!("geolocation" in navigator)) return setGpsState("error");
    setGpsState("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Only an approximate point (~1 km) ever leaves the browser.
        setGps({ lat: Math.round(pos.coords.latitude * 100) / 100, lng: Math.round(pos.coords.longitude * 100) / 100 });
        setRadius((r) => r || "10");
        setGpsState("idle");
      },
      () => setGpsState("error"),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600_000 },
    );
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const sp = new URLSearchParams();
    if (q.trim()) sp.set("q", q.trim());
    if (profession) sp.set("profession", profession);
    if (loc.regionId) sp.set("region", String(loc.regionId));
    if (loc.districtId) sp.set("district", String(loc.districtId));
    if (loc.settlementId) sp.set("settlement", String(loc.settlementId));
    if (loc.mahallaId) sp.set("mahalla", String(loc.mahallaId));
    if (gps) {
      sp.set("lat", String(gps.lat));
      sp.set("lng", String(gps.lng));
    }
    if (radius) sp.set("radius", radius);
    const qs = sp.toString();
    router.push(`/${mode}${qs ? `?${qs}` : ""}`);
  }

  const groups = professions.reduce<Record<string, { id: number; name: string }[]>>((acc, p) => {
    (acc[p.category] ??= []).push(p);
    return acc;
  }, {});

  return (
    <form onSubmit={submit} className="rounded-2xl bg-white p-3 text-left shadow-xl ring-1 ring-slate-200 sm:p-4" role="search">
      <div className="mb-3 inline-flex rounded-lg bg-slate-100 p-1 text-sm font-medium" role="tablist">
        {(["jobs", "candidates"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={cn("rounded-md px-4 py-1.5", mode === m ? "bg-white text-brand-700 shadow-sm" : "text-slate-600")}
          >
            {m === "jobs" ? "Ish qidiryapman" : "Kadr qidiryapman"}
          </button>
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <label htmlFor="sb-q" className="mb-1 block text-xs font-semibold text-slate-500">
            {mode === "jobs" ? "Qanday ish kerak?" : "Qanday kadr kerak?"}
          </label>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" size={18} />
            <Input id="sb-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Masalan: elektrik, haydovchi" className="pl-9" maxLength={80} />
          </div>
        </div>
        <div className="lg:col-span-3">
          <label htmlFor="sb-p" className="mb-1 block text-xs font-semibold text-slate-500">Kasb</label>
          <Select id="sb-p" value={profession} onChange={(e) => setProfession(e.target.value)}>
            <option value="">Barcha kasblar</option>
            {Object.entries(groups).map(([cat, items]) => (
              <optgroup key={cat} label={cat}>
                {items.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </optgroup>
            ))}
          </Select>
        </div>
        <div className="lg:col-span-3">
          <span className="mb-1 flex items-center gap-1 text-xs font-semibold text-slate-500"><PinIcon size={14} /> Qayerdan?</span>
          <LocationPicker regions={regions} depth={2} compact onChange={setLoc} className="gap-2" />
        </div>
        <div className="lg:col-span-2">
          <label htmlFor="sb-r" className="mb-1 block text-xs font-semibold text-slate-500">Necha km?</label>
          <Select id="sb-r" value={radius} onChange={(e) => setRadius(e.target.value)}>
            <option value="">Hudud boʻyicha</option>
            {RADIUS_OPTIONS.map((r) => (
              <option key={r} value={r}>{r} km</option>
            ))}
          </Select>
          <button type="button" onClick={useMyLocation} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline">
            <TargetIcon size={14} />
            {gpsState === "loading" ? "Aniqlanmoqda…" : gps ? "Joylashuv olindi ✓" : "Mening joylashuvim"}
          </button>
          {gpsState === "error" ? <p className="text-xs text-red-600">Joylashuvni aniqlab boʻlmadi</p> : null}
        </div>
      </div>
      <Button type="submit" size="lg" className="mt-4 w-full sm:w-auto">
        <SearchIcon size={18} /> Qidirish
      </Button>
    </form>
  );
}

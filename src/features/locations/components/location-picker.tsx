"use client";

import { useEffect, useId, useState } from "react";
import { Label, Select } from "@/components/ui/form";
import { cn } from "@/lib/utils";

type Option = { id: number; name: string; kind?: string | null };

export type LocationValue = {
  regionId: number | null;
  districtId: number | null;
  settlementId: number | null;
  mahallaId: number | null;
};

type Props = {
  regions: Option[];
  value?: Partial<LocationValue>;
  onChange?: (value: LocationValue) => void;
  /** Render hidden inputs with these names for plain <form method="get"> usage. */
  names?: { region: string; district: string; settlement: string; mahalla: string };
  depth?: 2 | 3 | 4;
  compact?: boolean;
  errors?: Partial<Record<keyof LocationValue, string | undefined>>;
  className?: string;
};

async function fetchChildren(level: string, parent: number, settlement?: number | null): Promise<Option[]> {
  const qs = new URLSearchParams({ level, parent: String(parent) });
  if (settlement) qs.set("settlement", String(settlement));
  const res = await fetch(`/api/locations?${qs}`);
  if (!res.ok) return [];
  return res.json();
}

/**
 * Cascading Region → District/City → Settlement → Mahalla selector.
 * Options are loaded from the database on demand (never hard-coded).
 */
export function LocationPicker({ regions, value, onChange, names, depth = 4, compact, errors, className }: Props) {
  const uid = useId();
  const [sel, setSel] = useState<LocationValue>({
    regionId: value?.regionId ?? null,
    districtId: value?.districtId ?? null,
    settlementId: value?.settlementId ?? null,
    mahallaId: value?.mahallaId ?? null,
  });
  // Children are stored with the parent key they belong to, so stale lists are
  // ignored without synchronous state resets inside effects.
  const [districtData, setDistrictData] = useState<{ key: string; items: Option[] }>({ key: "", items: [] });
  const [settlementData, setSettlementData] = useState<{ key: string; items: Option[] }>({ key: "", items: [] });
  const [mahallaData, setMahallaData] = useState<{ key: string; items: Option[] }>({ key: "", items: [] });

  const districtKey = sel.regionId ? String(sel.regionId) : "";
  const settlementKey = sel.districtId && depth >= 3 ? String(sel.districtId) : "";
  const mahallaKey = sel.districtId && depth >= 4 ? `${sel.districtId}:${sel.settlementId ?? ""}` : "";

  useEffect(() => {
    if (!districtKey) return;
    let alive = true;
    fetchChildren("districts", Number(districtKey)).then((items) => alive && setDistrictData({ key: districtKey, items }));
    return () => {
      alive = false;
    };
  }, [districtKey]);

  useEffect(() => {
    if (!settlementKey) return;
    let alive = true;
    fetchChildren("settlements", Number(settlementKey)).then(
      (items) => alive && setSettlementData({ key: settlementKey, items }),
    );
    return () => {
      alive = false;
    };
  }, [settlementKey]);

  useEffect(() => {
    if (!mahallaKey) return;
    let alive = true;
    const [d, s] = mahallaKey.split(":");
    fetchChildren("mahallas", Number(d), s ? Number(s) : null).then(
      (items) => alive && setMahallaData({ key: mahallaKey, items }),
    );
    return () => {
      alive = false;
    };
  }, [mahallaKey]);

  const districts = districtKey && districtData.key === districtKey ? districtData.items : [];
  const settlements = settlementKey && settlementData.key === settlementKey ? settlementData.items : [];
  const mahallas = mahallaKey && mahallaData.key === mahallaKey ? mahallaData.items : [];

  function update(next: LocationValue) {
    setSel(next);
    onChange?.(next);
  }

  const num = (v: string) => (v ? Number(v) : null);
  const selectClass = compact ? "h-10" : undefined;

  return (
    <div className={cn("grid gap-3", compact ? "grid-cols-1" : "sm:grid-cols-2", className)}>
      <div>
        {!compact && <Label htmlFor={`${uid}-r`}>Viloyat</Label>}
        <Select
          id={`${uid}-r`}
          aria-label="Viloyat"
          className={selectClass}
          value={sel.regionId ?? ""}
          aria-invalid={Boolean(errors?.regionId)}
          onChange={(e) => update({ regionId: num(e.target.value), districtId: null, settlementId: null, mahallaId: null })}
        >
          <option value="">Butun Oʻzbekiston</option>
          {regions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </Select>
        {errors?.regionId ? <p className="mt-1 text-xs text-red-600">{errors.regionId}</p> : null}
      </div>
      <div>
        {!compact && <Label htmlFor={`${uid}-d`}>Tuman / shahar</Label>}
        <Select
          id={`${uid}-d`}
          aria-label="Tuman yoki shahar"
          className={selectClass}
          value={sel.districtId ?? ""}
          disabled={!sel.regionId}
          onChange={(e) => update({ ...sel, districtId: num(e.target.value), settlementId: null, mahallaId: null })}
        >
          <option value="">Barcha tumanlar</option>
          {districts.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
      </div>
      {depth >= 3 && (!compact || settlements.length > 0) ? (
        <div>
          {!compact && <Label htmlFor={`${uid}-s`}>Shahar / qishloq</Label>}
          <Select
            id={`${uid}-s`}
            aria-label="Shahar yoki qishloq"
            className={selectClass}
            value={sel.settlementId ?? ""}
            disabled={!sel.districtId || settlements.length === 0}
            onChange={(e) => update({ ...sel, settlementId: num(e.target.value), mahallaId: null })}
          >
            <option value="">{settlements.length ? "Barcha aholi punktlari" : "—"}</option>
            {settlements.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
      ) : null}
      {depth >= 4 && (!compact || mahallas.length > 0) ? (
        <div>
          {!compact && <Label htmlFor={`${uid}-m`}>Mahalla</Label>}
          <Select
            id={`${uid}-m`}
            aria-label="Mahalla"
            className={selectClass}
            value={sel.mahallaId ?? ""}
            disabled={!sel.districtId || mahallas.length === 0}
            onChange={(e) => update({ ...sel, mahallaId: num(e.target.value) })}
          >
            <option value="">{mahallas.length ? "Barcha mahallalar" : "—"}</option>
            {mahallas.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </div>
      ) : null}
      {names ? (
        <>
          <input type="hidden" name={names.region} value={sel.regionId ?? ""} />
          <input type="hidden" name={names.district} value={sel.districtId ?? ""} />
          <input type="hidden" name={names.settlement} value={sel.settlementId ?? ""} />
          <input type="hidden" name={names.mahalla} value={sel.mahallaId ?? ""} />
        </>
      ) : null}
    </div>
  );
}

"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n/client";

export type MapItem = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  sublabel?: string;
  href?: string;
  /** "point" = exact-ish location (vacancy); "area" = approximate zone (candidate, ~1 km) */
  kind?: "point" | "area";
  radiusM?: number;
  color?: string;
};

const UZ_CENTER: [number, number] = [41.3, 64.6];

function escape(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/**
 * Leaflet map (OpenStreetMap tiles) rendered only on the client. Candidates are
 * drawn as approximate areas, never as exact pins (privacy).
 */
export function MapView({ items, height = 420, label }: { items: MapItem[]; height?: number; label: string }) {
  const ref = useRef<HTMLDivElement>(null);

  const { t } = useI18n();
  const moreLabel = t("cards.mapMore");
  useEffect(() => {
    let disposed = false;
    let map: import("leaflet").Map | undefined;
    (async () => {
      const L = await import("leaflet");
      if (disposed || !ref.current) return;
      map = L.map(ref.current, { scrollWheelZoom: false }).setView(UZ_CENTER, 6);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      const layers: import("leaflet").Layer[] = [];
      for (const it of items) {
        const color = it.color ?? (it.kind === "area" ? "#0ea5e9" : "#059669");
        const layer =
          it.kind === "area"
            ? L.circle([it.lat, it.lng], { radius: it.radiusM ?? 1000, color, fillColor: color, fillOpacity: 0.25, weight: 1 })
            : L.circleMarker([it.lat, it.lng], {
                radius: it.radiusM ? Math.min(30, Math.max(6, it.radiusM)) : 8,
                color: "#fff",
                weight: 2,
                fillColor: color,
                fillOpacity: 0.9,
              });
        const html = `<strong>${escape(it.label)}</strong>${it.sublabel ? `<br/><span>${escape(it.sublabel)}</span>` : ""}${
          it.href ? `<br/><a href="${escape(it.href)}">${escape(moreLabel)}</a>` : ""
        }`;
        layer.bindPopup(html);
        layer.addTo(map);
        layers.push(layer);
      }
      if (items.length > 0) {
        const bounds = L.latLngBounds(items.map((i) => [i.lat, i.lng] as [number, number]));
        map.fitBounds(bounds.pad(0.2), { maxZoom: 13 });
      }
    })();
    return () => {
      disposed = true;
      map?.remove();
    };
  }, [items, moreLabel]);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
      <div
        ref={ref}
        role="region"
        aria-label={label}
        style={{ height }}
        className="z-0 w-full"
        data-testid="map"
        data-items={items.length}
      />
    </div>
  );
}

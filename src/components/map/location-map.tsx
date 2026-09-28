import { getI18n } from "@/lib/i18n/server";
import { getMapProvider } from "@/lib/maps";

/** Approximate area map (privacy-safe: no exact addresses for candidates). */
export async function LocationMap({
  lat,
  lng,
  radiusKm = 3,
  label,
  marker = false,
}: {
  lat: number;
  lng: number;
  radiusKm?: number;
  label: string;
  marker?: boolean;
}) {
  const { t } = await getI18n();
  const provider = getMapProvider();
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <iframe
        title={label}
        src={provider.embedUrl({ lat, lng }, { radiusKm, marker })}
        className="h-56 w-full"
        loading="lazy"
        referrerPolicy="no-referrer"
        sandbox="allow-scripts allow-same-origin"
      />
      <a
        href={provider.externalUrl({ lat, lng })}
        target="_blank"
        rel="noopener noreferrer"
        className="text-brand-700 block bg-white px-3 py-2 text-xs hover:underline"
      >
        {t("cards.openLargerMap")}
      </a>
    </div>
  );
}

// Provider-independent map abstraction. The MVP uses an OpenStreetMap embed
// (no API key); Yandex/Google/Leaflet providers can implement MapProvider.

export type MapPoint = { lat: number; lng: number };

export interface MapProvider {
  id: string;
  /** URL for an embeddable map centred on a point with an approximate area box. */
  embedUrl(center: MapPoint, opts?: { radiusKm?: number; marker?: boolean }): string;
  /** External link that opens the location in the provider's full map. */
  externalUrl(center: MapPoint, zoom?: number): string;
}

const kmToDeg = (km: number) => km / 111;

export const openStreetMapProvider: MapProvider = {
  id: "osm",
  embedUrl({ lat, lng }, opts = {}) {
    const r = kmToDeg(opts.radiusKm ?? 3);
    const bbox = [lng - r * 1.3, lat - r, lng + r * 1.3, lat + r].map((n) => n.toFixed(4)).join(",");
    const marker = opts.marker ? `&marker=${lat.toFixed(4)},${lng.toFixed(4)}` : "";
    return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik${marker}`;
  },
  externalUrl({ lat, lng }, zoom = 13) {
    return `https://www.openstreetmap.org/?mlat=${lat.toFixed(4)}&mlon=${lng.toFixed(4)}#map=${zoom}/${lat.toFixed(4)}/${lng.toFixed(4)}`;
  },
};

export function getMapProvider(): MapProvider {
  return openStreetMapProvider;
}

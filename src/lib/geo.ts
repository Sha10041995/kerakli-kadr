/** Great-circle distance in km (mirrors public.geo_distance_km in SQL). */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371.0088;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Privacy: approximate a point to ~1 km (same rounding the database applies). */
export function approximatePoint(lat: number, lng: number): { lat: number; lng: number } {
  return { lat: Math.round(lat * 100) / 100, lng: Math.round(lng * 100) / 100 };
}

/** Rough Uzbekistan bounding box — used to validate client-supplied GPS points. */
export function isInUzbekistan(lat: number, lng: number): boolean {
  return lat >= 37.0 && lat <= 45.7 && lng >= 55.9 && lng <= 73.2;
}

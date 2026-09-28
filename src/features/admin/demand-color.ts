/** Colour for a demand/supply ratio: red = shortage of workers, green = enough candidates. */
export function demandColor(ratio: number): string {
  if (ratio >= 1.5) return "#dc2626";
  if (ratio >= 1) return "#f59e0b";
  if (ratio >= 0.5) return "#84cc16";
  return "#16a34a";
}

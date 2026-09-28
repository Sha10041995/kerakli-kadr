import type { MatchResult } from "@/features/matching/score";
import { getI18n } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

/** Shows the MATCH SCORE with an explainable breakdown (not a person rating). */
export async function MatchBadge({ match }: { match: MatchResult }) {
  const { t, tr } = await getI18n();
  const tone =
    match.score >= 80
      ? "bg-emerald-600"
      : match.score >= 60
        ? "bg-brand-500"
        : match.score >= 40
          ? "bg-amber-500"
          : "bg-slate-400";
  return (
    <details className="group">
      <summary className="flex cursor-pointer list-none items-center gap-2" title={t("cards.matchTitle")}>
        <span
          className={cn(
            "inline-flex h-7 min-w-14 items-center justify-center rounded-full px-2 text-sm font-bold text-white",
            tone,
          )}
        >
          {match.score}%
        </span>
        <span className="text-xs text-slate-500 underline decoration-dotted group-open:hidden">{t("cards.matchWhy")}</span>
      </summary>
      <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
        <p className="mb-2 font-medium text-slate-700">{t("cards.matchNote")}</p>
        <ul className="space-y-1">
          {match.breakdown.map((b) => (
            <li key={b.factor} className="flex items-center gap-2">
              <span className="w-32 shrink-0 text-slate-600">{t(`cards.factor.${b.factor}`)}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded bg-slate-200">
                <span className="bg-brand-500 block h-full" style={{ width: `${Math.round(b.value * 100)}%` }} />
              </span>
              <span className="w-12 text-right text-slate-500">+{b.points.toFixed(1)}</span>
            </li>
          ))}
        </ul>
        {match.reasonKeys.length ? <p className="mt-2 text-slate-600">{match.reasonKeys.map((k) => tr(k)).join(" · ")}</p> : null}
      </div>
    </details>
  );
}

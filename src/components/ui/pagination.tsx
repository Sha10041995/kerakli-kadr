import Link from "next/link";
import { cn } from "@/lib/utils";

export function Pagination({ page, pages, hrefFor }: { page: number; pages: number; hrefFor: (p: number) => string }) {
  if (pages <= 1) return null;
  const nums = Array.from(new Set([1, page - 1, page, page + 1, pages].filter((n) => n >= 1 && n <= pages))).sort((a, b) => a - b);
  return (
    <nav aria-label="Sahifalar" className="mt-6 flex items-center justify-center gap-1">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className="rounded-md px-3 py-2 text-sm hover:bg-slate-100" rel="prev">← Oldingi</Link>
      ) : null}
      {nums.map((n, i) => (
        <span key={n} className="flex items-center">
          {i > 0 && n - nums[i - 1] > 1 ? <span className="px-1 text-slate-400">…</span> : null}
          <Link
            href={hrefFor(n)}
            aria-current={n === page ? "page" : undefined}
            className={cn("min-w-9 rounded-md px-3 py-2 text-center text-sm", n === page ? "bg-brand-600 text-white" : "hover:bg-slate-100")}
          >
            {n}
          </Link>
        </span>
      ))}
      {page < pages ? (
        <Link href={hrefFor(page + 1)} className="rounded-md px-3 py-2 text-sm hover:bg-slate-100" rel="next">Keyingi →</Link>
      ) : null}
    </nav>
  );
}

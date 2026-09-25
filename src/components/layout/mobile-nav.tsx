"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BriefcaseIcon, ChatIcon, ClipboardIcon, HomeIcon, SearchIcon, UserIcon, UsersIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

type Role = "guest" | "candidate" | "employer";

const ITEMS: Record<Role, { href: string; label: string; icon: typeof HomeIcon }[]> = {
  guest: [
    { href: "/", label: "Bosh sahifa", icon: HomeIcon },
    { href: "/jobs", label: "Ishlar", icon: SearchIcon },
    { href: "/candidates", label: "Kadrlar", icon: UsersIcon },
    { href: "/login", label: "Kirish", icon: UserIcon },
  ],
  candidate: [
    { href: "/", label: "Bosh sahifa", icon: HomeIcon },
    { href: "/jobs", label: "Ishlar", icon: SearchIcon },
    { href: "/dashboard/applications", label: "Arizalar", icon: ClipboardIcon },
    { href: "/messages", label: "Xabarlar", icon: ChatIcon },
    { href: "/dashboard", label: "Profil", icon: UserIcon },
  ],
  employer: [
    { href: "/", label: "Bosh sahifa", icon: HomeIcon },
    { href: "/dashboard/vacancies", label: "Vakansiyalar", icon: BriefcaseIcon },
    { href: "/candidates", label: "Kadrlar", icon: UsersIcon },
    { href: "/messages", label: "Xabarlar", icon: ChatIcon },
    { href: "/dashboard", label: "Profil", icon: UserIcon },
  ],
};

export function MobileNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = ITEMS[role];
  return (
    <nav
      aria-label="Mobil menyu"
      className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium",
                  active ? "text-brand-700" : "text-slate-500",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={22} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

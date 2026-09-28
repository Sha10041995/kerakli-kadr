"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BriefcaseIcon, ChatIcon, ClipboardIcon, HomeIcon, SearchIcon, UserIcon, UsersIcon } from "@/components/ui/icons";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

type Role = "guest" | "candidate" | "employer";

type NavKey = "home" | "jobs" | "candidates" | "login" | "applications" | "messages" | "profile" | "vacancies";

const ITEMS: Record<Role, { href: string; label: NavKey; icon: typeof HomeIcon }[]> = {
  guest: [
    { href: "/", label: "home", icon: HomeIcon },
    { href: "/jobs", label: "jobs", icon: SearchIcon },
    { href: "/candidates", label: "candidates", icon: UsersIcon },
    { href: "/login", label: "login", icon: UserIcon },
  ],
  candidate: [
    { href: "/", label: "home", icon: HomeIcon },
    { href: "/jobs", label: "jobs", icon: SearchIcon },
    { href: "/dashboard/applications", label: "applications", icon: ClipboardIcon },
    { href: "/messages", label: "messages", icon: ChatIcon },
    { href: "/dashboard", label: "profile", icon: UserIcon },
  ],
  employer: [
    { href: "/", label: "home", icon: HomeIcon },
    { href: "/dashboard/vacancies", label: "vacancies", icon: BriefcaseIcon },
    { href: "/candidates", label: "candidates", icon: UsersIcon },
    { href: "/messages", label: "messages", icon: ChatIcon },
    { href: "/dashboard", label: "profile", icon: UserIcon },
  ],
};

export function MobileNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const items = ITEMS[role];
  return (
    <nav
      aria-label={t("nav.mobileMenu")}
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
                {t(`nav.${label}`)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

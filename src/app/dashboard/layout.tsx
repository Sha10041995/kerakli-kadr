import Link from "next/link";
import { Container } from "@/components/ui/misc";
import { requireUser } from "@/features/auth/session";
import { DashboardNav } from "@/components/layout/dashboard-nav";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const user = await requireUser("/dashboard");
  const items = [
    { href: "/dashboard", label: "Umumiy" },
    ...(user.isJobSeeker
      ? [
          { href: "/dashboard/profile", label: "Mening profilim" },
          { href: "/dashboard/cv", label: "CV" },
          { href: "/dashboard/applications", label: "Arizalarim" },
        ]
      : []),
    ...(user.isEmployer
      ? [
          { href: "/dashboard/company", label: "Kompaniya" },
          { href: "/dashboard/vacancies", label: "Vakansiyalar" },
        ]
      : []),
    { href: "/dashboard/saved", label: "Saqlanganlar" },
    { href: "/messages", label: "Xabarlar" },
    { href: "/dashboard/verification", label: "Tasdiqlash" },
    { href: "/dashboard/billing", label: "Tarif va toʻlovlar" },
  ];
  return (
    <Container className="py-6 sm:py-8">
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="no-print">
          <DashboardNav items={items} />
          <form action="/auth/signout" method="post" className="mt-2 hidden lg:block">
            <button className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-100">Chiqish</button>
          </form>
          {!user.isJobSeeker && !user.isEmployer ? (
            <Link href="/onboarding" className="mt-2 block text-sm text-brand-700">Rolni tanlash →</Link>
          ) : null}
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </Container>
  );
}

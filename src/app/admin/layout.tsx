import type { Metadata } from "next";
import { Container } from "@/components/ui/misc";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import { requireStaff } from "@/features/auth/session";

export const metadata: Metadata = { title: { default: "Admin", template: "%s | Admin" }, robots: { index: false } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireStaff();
  const items = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/vacancies", label: "Vakansiyalar" },
    { href: "/admin/reports", label: "Shikoyatlar" },
    { href: "/admin/verification", label: "Tasdiqlash" },
    { href: "/admin/reviews", label: "Sharhlar" },
    { href: "/admin/analytics", label: "Analitika" },
    ...(user.isAdmin
      ? [
          { href: "/admin/users", label: "Foydalanuvchilar" },
          { href: "/admin/locations", label: "Hududlar" },
          { href: "/admin/categories", label: "Kasblar" },
          { href: "/admin/plans", label: "Tariflar" },
          { href: "/admin/payments", label: "Toʻlovlar" },
          { href: "/admin/settings", label: "Sozlamalar" },
          { href: "/admin/audit", label: "Audit log" },
        ]
      : []),
  ];
  return (
    <Container className="py-6 sm:py-8">
      <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
        <aside>
          <p className="mb-2 hidden text-xs font-semibold tracking-wide text-slate-500 uppercase lg:block">Boshqaruv paneli</p>
          <DashboardNav items={items} />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </Container>
  );
}

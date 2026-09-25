import type { Metadata } from "next";
import Link from "next/link";
import { Container, EmptyState, PageHeader } from "@/components/ui/misc";
import { ConfirmButton } from "@/components/ui/action-form";
import { requireUser } from "@/features/auth/session";
import { markAllNotificationsReadAction } from "@/features/notifications/actions";
import { listNotifications } from "@/features/notifications/queries";
import { cn, safeRedirectPath, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Bildirishnomalar", robots: { index: false } };

export default async function NotificationsPage() {
  const user = await requireUser("/notifications");
  const items = await listNotifications(user.id);
  const unread = items.filter((n) => !n.read_at).length;
  return (
    <Container className="py-6 sm:py-8">
      <PageHeader
        title="Bildirishnomalar"
        description={unread ? `${unread} ta oʻqilmagan` : "Hammasi oʻqilgan"}
        actions={
          unread ? (
            <ConfirmButton
              className="text-brand-700 text-sm font-medium hover:underline"
              confirmText="Hammasini oʻqilgan deb belgilaysizmi?"
              onConfirm={markAllNotificationsReadAction}
            >
              Hammasini oʻqildi deb belgilash
            </ConfirmButton>
          ) : null
        }
      />
      {items.length === 0 ? (
        <EmptyState
          title="Bildirishnomalar yoʻq"
          description="Yangi ariza, xabar yoki mos vakansiya chiqqanda shu yerda koʻrasiz."
        />
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {items.map((n) => {
            const content = (
              <>
                <p className={cn("text-sm text-slate-900", !n.read_at && "font-semibold")}>{n.title}</p>
                {n.body ? <p className="text-sm text-slate-600">{n.body}</p> : null}
                <p className="text-xs text-slate-400">{timeAgo(n.created_at)}</p>
              </>
            );
            return (
              <li key={n.id} className={cn(!n.read_at && "bg-brand-50/40")}>
                {n.link ? (
                  <Link href={safeRedirectPath(n.link, "/dashboard")} className="block px-4 py-3 hover:bg-slate-50">
                    {content}
                  </Link>
                ) : (
                  <div className="px-4 py-3">{content}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Container>
  );
}

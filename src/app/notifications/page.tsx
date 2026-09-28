import type { Metadata } from "next";
import Link from "next/link";
import { Container, EmptyState, PageHeader } from "@/components/ui/misc";
import { ConfirmButton } from "@/components/ui/action-form";
import { requireUser } from "@/features/auth/session";
import { markAllNotificationsReadAction } from "@/features/notifications/actions";
import { listNotifications } from "@/features/notifications/queries";
import { getI18n } from "@/lib/i18n/server";
import { cn, safeRedirectPath } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("notificationsPage.title"), robots: { index: false } };
}

export default async function NotificationsPage() {
  const user = await requireUser("/notifications");
  const [items, { t, f }] = await Promise.all([listNotifications(user.id), getI18n()]);
  const unread = items.filter((n) => !n.read_at).length;
  return (
    <Container className="py-6 sm:py-8">
      <PageHeader
        title={t("notificationsPage.title")}
        description={unread ? t("notificationsPage.unread", { n: unread }) : t("notificationsPage.allRead")}
        actions={
          unread ? (
            <ConfirmButton
              className="text-brand-700 text-sm font-medium hover:underline"
              confirmText={t("notificationsPage.markAllConfirm")}
              onConfirm={markAllNotificationsReadAction}
            >
              {t("notificationsPage.markAll")}
            </ConfirmButton>
          ) : null
        }
      />
      {items.length === 0 ? (
        <EmptyState title={t("notificationsPage.none")} description={t("notificationsPage.noneText")} />
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {items.map((n) => {
            const content = (
              <>
                <p className={cn("text-sm text-slate-900", !n.read_at && "font-semibold")}>{n.title}</p>
                {n.body ? <p className="text-sm text-slate-600">{n.body}</p> : null}
                <p className="text-xs text-slate-400">{f.timeAgo(n.created_at)}</p>
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

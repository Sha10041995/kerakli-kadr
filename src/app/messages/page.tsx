import type { Metadata } from "next";
import Link from "next/link";
import { Avatar, Container, EmptyState, PageHeader } from "@/components/ui/misc";
import { requireUser } from "@/features/auth/session";
import { listConversations } from "@/features/messaging/queries";
import { getI18n } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("messaging.title"), robots: { index: false } };
}

export default async function MessagesPage() {
  const user = await requireUser("/messages");
  const [conversations, { t, f }] = await Promise.all([listConversations(user.id), getI18n()]);
  return (
    <Container className="py-6 sm:py-8">
      <PageHeader title={t("messaging.title")} description={t("messaging.intro")} />
      {conversations.length === 0 ? (
        <EmptyState title={t("messaging.none")} description={t("messaging.noneText")} />
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {conversations.map((c) => (
            <li key={c.id}>
              <Link
                href={`/messages/${c.id}`}
                className={cn("flex items-center gap-3 px-4 py-3 hover:bg-slate-50", c.unread && "bg-brand-50/50")}
              >
                <Avatar src={c.other?.avatar_url} first={c.other?.first_name} last={c.other?.last_name} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn("truncate text-slate-900", c.unread ? "font-bold" : "font-medium")}>
                      {f.name(c.other?.first_name, c.other?.last_name, true)}
                    </p>
                    <span className="shrink-0 text-xs text-slate-500">{f.timeAgo(c.lastMessageAt)}</span>
                  </div>
                  {c.vacancyTitle ? <p className="text-brand-700 truncate text-xs">{c.vacancyTitle}</p> : null}
                  <p className="truncate text-sm text-slate-600">
                    {c.last?.body ?? (c.last ? t("messaging.file") : t("messaging.started"))}
                  </p>
                </div>
                {c.unread ? <span className="bg-brand-600 size-2.5 rounded-full" aria-label={t("messaging.unread")} /> : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}

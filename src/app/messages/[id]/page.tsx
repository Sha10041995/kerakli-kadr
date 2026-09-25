import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar, Container } from "@/components/ui/misc";
import { requireUser } from "@/features/auth/session";
import { getConversation } from "@/features/messaging/queries";
import { ChatThread } from "@/features/messaging/components/chat-thread";
import { ReportButton } from "@/features/reports/components/report-button";
import { displayName } from "@/lib/utils";

export const metadata: Metadata = { title: "Suhbat", robots: { index: false } };

export default async function ConversationPage(props: PageProps<"/messages/[id]">) {
  const { id } = await props.params;
  const user = await requireUser(`/messages/${id}`);
  const data = await getConversation(id, user.id);
  if (!data) notFound();
  return (
    <Container className="py-4 sm:py-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/messages" className="text-sm text-slate-500 hover:underline">← Xabarlar</Link>
          <Avatar src={data.other?.avatar_url} first={data.other?.first_name} last={data.other?.last_name} size={36} />
          <div>
            <p className="font-semibold text-slate-900">{displayName(data.other?.first_name, data.other?.last_name, true)}</p>
            {data.conv.vacancies ? <Link href={`/vacancy/${data.conv.vacancies.id}`} className="text-xs text-brand-700 hover:underline">{data.conv.vacancies.title}</Link> : null}
          </div>
        </div>
        {data.other?.id ? <ReportButton targetType="user" targetId={data.other.id} /> : null}
      </div>
      <ChatThread key={data.messages.at(-1)?.id ?? "empty"} conversationId={id} meId={user.id} initial={data.messages} />
    </Container>
  );
}

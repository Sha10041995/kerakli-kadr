import type { Metadata } from "next";
import { Badge, Card, Container, PageHeader } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/form";
import { ActionForm } from "@/components/ui/action-form";
import { requireUser } from "@/features/auth/session";
import { submitComplaintAction } from "@/features/support/actions";
import { createClient } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("support.title"), robots: { index: false } };
}

const STATUS_TONE = { open: "warning", reviewing: "info", resolved: "success", dismissed: "neutral" } as const;

export default async function SupportPage() {
  const user = await requireUser("/support");
  const supabase = await createClient();
  const { t, d, f } = await getI18n();
  const { data: tickets } = await supabase
    .from("complaints")
    .select("id, subject, body, status, admin_reply, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  return (
    <Container className="max-w-3xl py-8">
      <PageHeader title={t("support.title")} description={t("support.intro")} />
      <Card className="mb-8">
        <ActionForm action={submitComplaintAction} className="space-y-3">
          <div>
            <Label htmlFor="s-subject">{t("support.subject")}</Label>
            <Input id="s-subject" name="subject" required maxLength={200} />
          </div>
          <div>
            <Label htmlFor="s-body">{t("support.details")}</Label>
            <Textarea id="s-body" name="body" required rows={5} maxLength={5000} />
          </div>
          <Button type="submit">{t("common.send")}</Button>
        </ActionForm>
      </Card>
      <h2 className="mb-3 text-lg font-semibold text-slate-900">{t("support.mine")}</h2>
      {!tickets?.length ? (
        <p className="text-sm text-slate-600">{t("support.none")}</p>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <Card key={ticket.id} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-slate-900">{ticket.subject}</p>
                <Badge tone={STATUS_TONE[ticket.status]}>{d.enums.ticketStatus[ticket.status]}</Badge>
              </div>
              <p className="text-sm whitespace-pre-line text-slate-600">{ticket.body}</p>
              <p className="text-xs text-slate-400">{f.date(ticket.created_at)}</p>
              {ticket.admin_reply ? (
                <div className="bg-brand-50 text-brand-900 rounded-lg p-3 text-sm">
                  <p className="text-brand-700 mb-1 text-xs font-semibold">{t("support.reply")}</p>
                  <p className="whitespace-pre-line">{ticket.admin_reply}</p>
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </Container>
  );
}

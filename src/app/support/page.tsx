import type { Metadata } from "next";
import { Badge, Card, Container, PageHeader } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/form";
import { ActionForm } from "@/components/ui/action-form";
import { requireUser } from "@/features/auth/session";
import { submitComplaintAction } from "@/features/support/actions";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Yordam va murojaatlar", robots: { index: false } };

const STATUS = {
  open: ["warning", "Ochiq"],
  reviewing: ["info", "Koʻrib chiqilmoqda"],
  resolved: ["success", "Hal qilindi"],
  dismissed: ["neutral", "Yopildi"],
} as const;

export default async function SupportPage() {
  const user = await requireUser("/support");
  const supabase = await createClient();
  const { data: tickets } = await supabase
    .from("complaints")
    .select("id, subject, body, status, admin_reply, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  return (
    <Container className="max-w-3xl py-8">
      <PageHeader
        title="Yordam va murojaatlar"
        description="Toʻlov, hisob yoki eʼlonlar boʻyicha savolingiz boʻlsa, yozing — javobni bildirishnoma orqali olasiz."
      />
      <Card className="mb-8">
        <ActionForm action={submitComplaintAction} className="space-y-3">
          <div>
            <Label htmlFor="s-subject">Mavzu</Label>
            <Input id="s-subject" name="subject" required maxLength={200} />
          </div>
          <div>
            <Label htmlFor="s-body">Batafsil</Label>
            <Textarea id="s-body" name="body" required rows={5} maxLength={5000} />
          </div>
          <Button type="submit">Yuborish</Button>
        </ActionForm>
      </Card>
      <h2 className="mb-3 text-lg font-semibold text-slate-900">Mening murojaatlarim</h2>
      {!tickets?.length ? (
        <p className="text-sm text-slate-600">Hali murojaat yoʻq.</p>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <Card key={t.id} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-slate-900">{t.subject}</p>
                <Badge tone={STATUS[t.status][0]}>{STATUS[t.status][1]}</Badge>
              </div>
              <p className="text-sm whitespace-pre-line text-slate-600">{t.body}</p>
              <p className="text-xs text-slate-400">{formatDate(t.created_at)}</p>
              {t.admin_reply ? (
                <div className="bg-brand-50 text-brand-900 rounded-lg p-3 text-sm">
                  <p className="text-brand-700 mb-1 text-xs font-semibold">Qoʻllab-quvvatlash javobi</p>
                  <p className="whitespace-pre-line">{t.admin_reply}</p>
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </Container>
  );
}

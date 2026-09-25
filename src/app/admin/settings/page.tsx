import { Card, PageHeader } from "@/components/ui/misc";
import { SettingsForm } from "@/features/admin/components";
import { requireAdmin } from "@/features/auth/session";
import { normalizeWeights } from "@/features/matching/score";
import { createClient } from "@/lib/supabase/server";

export default async function AdminSettings() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase.from("app_settings").select("key, value");
  const get = (k: string) => data?.find((r) => r.key === k)?.value;
  return (
    <>
      <PageHeader title="Sozlamalar" />
      <Card>
        <SettingsForm
          weights={normalizeWeights(get("matching.weights"))}
          autoPublish={get("moderation.auto_publish") !== false}
          durationDays={Number(get("vacancy.default_duration_days") ?? 30)}
          autoHideReports={Number(get("moderation.auto_hide_reports") ?? 5)}
        />
      </Card>
    </>
  );
}

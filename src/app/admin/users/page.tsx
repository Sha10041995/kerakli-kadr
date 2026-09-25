import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/misc";
import { Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { GetForm } from "@/components/ui/get-form";
import { UserControls } from "@/features/admin/components";
import { requireAdmin } from "@/features/auth/session";
import { createClient } from "@/lib/supabase/server";
import { displayName, formatDate } from "@/lib/utils";

export default async function AdminUsers(props: PageProps<"/admin/users">) {
  await requireAdmin();
  const sp = await props.searchParams;
  const q =
    typeof sp.q === "string"
      ? sp.q
          .replace(/[%,()]/g, "")
          .trim()
          .slice(0, 80)
      : "";
  const supabase = await createClient();
  let query = supabase
    .from("profiles")
    .select("id, first_name, last_name, email, phone, is_blocked, is_demo, created_at, user_roles!user_roles_user_id_fkey(role)")
    .order("created_at", { ascending: false })
    .limit(50);
  if (q) query = query.or(`email.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%,phone.ilike.%${q}%`);
  const { data } = await query;
  return (
    <>
      <PageHeader title="Foydalanuvchilar" />
      <GetForm action="/admin/users" className="mb-4 flex gap-2">
        <Input name="q" defaultValue={q} placeholder="Email, ism yoki telefon" aria-label="Qidirish" className="max-w-sm" />
        <Button type="submit" variant="outline">
          Qidirish
        </Button>
      </GetForm>
      {!data?.length ? (
        <EmptyState title="Topilmadi" />
      ) : (
        <div className="space-y-2">
          {data.map((u) => (
            <Card key={u.id} className="flex flex-col gap-2 py-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="font-medium text-slate-900">
                  {displayName(u.first_name, u.last_name)} {u.is_blocked ? <Badge tone="danger">bloklangan</Badge> : null}{" "}
                  {u.is_demo ? <Badge tone="warning">DEMO</Badge> : null}
                </p>
                <p className="text-xs text-slate-500">
                  {u.email} · {u.phone ?? "—"} · {formatDate(u.created_at)}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {(u.user_roles ?? []).map((r) => (
                    <Badge key={r.role} tone="brand">
                      {r.role}
                    </Badge>
                  ))}
                </div>
              </div>
              <UserControls userId={u.id} roles={(u.user_roles ?? []).map((r) => r.role)} blocked={u.is_blocked} />
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

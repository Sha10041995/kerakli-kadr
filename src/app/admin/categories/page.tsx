import { Card, PageHeader } from "@/components/ui/misc";
import { ActiveToggle, AddCategoryForm, AddProfessionForm } from "@/features/admin/components";
import { requireAdmin } from "@/features/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function AdminCategories() {
  await requireAdmin();
  const supabase = await createClient();
  const [{ data: categories }, { data: professions }] = await Promise.all([
    supabase.from("categories").select("id, name_uz, icon, is_active, parent_id").order("sort_order"),
    supabase.from("professions").select("id, name_uz, category_id, is_active, synonyms").order("sort_order"),
  ]);
  return (
    <>
      <PageHeader title="Kasblar katalogi" description="Kategoriya → subkategoriya → kasb → koʻnikmalar" />
      <div className="mb-4 space-y-2">
        <AddCategoryForm />
        <AddProfessionForm categories={(categories ?? []).map((c) => ({ id: c.id, name: c.name_uz }))} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {(categories ?? []).map((c) => (
          <Card key={c.id}>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-semibold">
                {c.icon} {c.name_uz}
              </h2>
              <ActiveToggle kind="catalog" table="categories" id={c.id} active={c.is_active} />
            </div>
            <ul className="space-y-1 text-sm">
              {(professions ?? [])
                .filter((p) => p.category_id === c.id)
                .map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2">
                    <span>
                      {p.name_uz}{" "}
                      {p.synonyms.length ? <span className="text-xs text-slate-400">({p.synonyms.join(", ")})</span> : null}
                    </span>
                    <ActiveToggle kind="catalog" table="professions" id={p.id} active={p.is_active} />
                  </li>
                ))}
            </ul>
          </Card>
        ))}
      </div>
    </>
  );
}

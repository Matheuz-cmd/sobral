import { ImportHistory, type ImportRow } from "@/components/import-history";
import { ImportWizard, type SavedMappings } from "@/components/import-wizard";
import { createClient } from "@/lib/supabase/server";
import type { Platform } from "@/lib/import/types";

export default async function ImportsPage({ params }: PageProps<"/empresa/[id]/importacoes">) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: accounts }, { data: mappings }, { data: imports }] = await Promise.all([
    supabase.from("ad_accounts").select("id, name, platform").eq("company_id", id).order("name"),
    supabase.from("column_mappings").select("platform, mapping").eq("company_id", id),
    supabase
      .from("imports")
      .select("id, platform, file_name, period_start, period_end, rows_read, rows_error, status, created_at, ad_accounts(name)")
      .eq("company_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const saved: SavedMappings = {};
  for (const m of mappings ?? []) saved[m.platform as Platform] = m.mapping;

  const history = (imports ?? []).map((i) => {
    const account = i.ad_accounts as unknown as { name: string } | null;
    return { ...i, ad_account_name: account?.name ?? null } as unknown as ImportRow;
  });

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Nova importação</h2>
        <ImportWizard
          companyId={id}
          accounts={(accounts ?? []) as { id: string; name: string; platform: Platform }[]}
          savedMappings={saved}
        />
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Histórico</h2>
        <ImportHistory imports={history} />
      </section>
    </div>
  );
}

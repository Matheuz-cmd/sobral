import { createClient } from "@/lib/supabase/server";
import type { Client } from "@/lib/types";

export async function getClientsWithCompanies(includeArchived = false): Promise<Client[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("clients")
    .select("id, name, status, companies(id, client_id, name, logo_url, color, status)")
    .order("name");
  const clients = (data ?? []) as Client[];
  if (includeArchived) return clients;
  return clients
    .filter((c) => c.status === "active")
    .map((c) => ({ ...c, companies: c.companies.filter((e) => e.status === "active") }));
}

export type CompanySnapshot = { meta: number; google: number; lastImport: string | null };

/** Investimento do mês por plataforma e data da última importação de cada empresa (tela inicial). */
export async function getCompanySnapshots(monthStart: string): Promise<Map<string, CompanySnapshot>> {
  const supabase = await createClient();
  const [{ data: daily }, { data: imports }] = await Promise.all([
    supabase.from("v_daily_by_platform").select("company_id, platform, spend").gte("date", monthStart).limit(10000),
    supabase
      .from("imports")
      .select("company_id, created_at")
      .eq("status", "done")
      .order("created_at", { ascending: false })
      .limit(500),
  ]);
  const map = new Map<string, CompanySnapshot>();
  const get = (id: string) => map.get(id) ?? map.set(id, { meta: 0, google: 0, lastImport: null }).get(id)!;
  for (const row of daily ?? []) {
    const s = get(row.company_id);
    if (row.platform === "meta") s.meta += Number(row.spend);
    else s.google += Number(row.spend);
  }
  for (const row of imports ?? []) {
    const s = get(row.company_id);
    if (!s.lastImport) s.lastImport = row.created_at;
  }
  return map;
}

export async function getLastCompanyId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("user_settings").select("last_company_id").maybeSingle();
  return data?.last_company_id ?? null;
}

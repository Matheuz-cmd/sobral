// Consultas dos dashboards. Tudo filtra pela empresa no servidor (RNF02), além da RLS.
// Taxas sempre recalculadas a partir das somas do período (RNF08).

import { createClient } from "@/lib/supabase/server";
import { eachDay, type Period } from "@/lib/period";
import type { CampaignType, Platform } from "@/lib/import/types";

export type Totals = {
  spend: number;
  impressions: number;
  clicks: number;
  profile_visits: number;
  ig_follows: number;
  local_actions: number;
  directions: number;
  calls: number;
  website_clicks: number;
  other_interactions: number;
};

const METRICS = [
  "spend", "impressions", "clicks", "profile_visits", "ig_follows",
  "local_actions", "directions", "calls", "website_clicks", "other_interactions",
] as const satisfies readonly (keyof Totals)[];

export const emptyTotals = (): Totals => Object.fromEntries(METRICS.map((k) => [k, 0])) as Totals;

function addInto(target: Totals, row: Partial<Record<keyof Totals, unknown>>) {
  for (const k of METRICS) target[k] += Number(row[k] ?? 0);
}

const ratio = (a: number, b: number) => (b > 0 ? a / b : null);

export function rates(t: Totals) {
  return {
    ctr: ratio(t.clicks, t.impressions),
    cpc: ratio(t.spend, t.clicks),
    cpm: t.impressions > 0 ? (t.spend * 1000) / t.impressions : null,
    costPerVisit: ratio(t.spend, t.profile_visits),
    costPerFollow: ratio(t.spend, t.ig_follows),
    costPerLocalAction: ratio(t.spend, t.local_actions),
  };
}

const PAGE = 1000; // limite padrão de linhas por resposta do Supabase

/** Busca todas as páginas de uma consulta ordenada. */
async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<{ data: unknown }>): Promise<T[]> {
  const all: T[] = [];
  for (let i = 0; ; i++) {
    const { data } = await page(i * PAGE, i * PAGE + PAGE - 1);
    const rows = (data ?? []) as T[];
    all.push(...rows);
    if (rows.length < PAGE) return all;
  }
}

type DailyRow = Totals & { date: string; platform: Platform; campaign_type: CampaignType };

export type Filters = { companyId: string; period: Period; accountId?: string };

/** Linhas diárias por tipo de campanha, do início do período anterior ao fim do atual. */
export async function getDailyRows({ companyId, period, accountId }: Filters, platform?: Platform) {
  const supabase = await createClient();
  return fetchAll<DailyRow>((from, to) => {
    let query = supabase
      .from("v_daily_by_campaign_type")
      .select(`date, platform, campaign_type, ${METRICS.join(", ")}`)
      .eq("company_id", companyId)
      .gte("date", period.prevFrom)
      .lte("date", period.to)
      .order("date")
      .order("platform")
      .order("ad_account_id")
      .order("campaign_type")
      .range(from, to);
    if (platform) query = query.eq("platform", platform);
    if (accountId) query = query.eq("ad_account_id", accountId);
    return query;
  });
}

export type Summary = { current: Totals; previous: Totals };

/** Soma do período atual e do anterior, opcionalmente só de alguns tipos de campanha. */
export function summarize(rows: DailyRow[], period: Period, filter?: (r: DailyRow) => boolean): Summary {
  const current = emptyTotals();
  const previous = emptyTotals();
  for (const r of rows) {
    if (filter && !filter(r)) continue;
    if (r.date >= period.from && r.date <= period.to) addInto(current, r);
    else if (r.date >= period.prevFrom && r.date <= period.prevTo) addInto(previous, r);
  }
  return { current, previous };
}

export type DayPoint = { date: string } & Record<string, number | null>;

/** Uma série por dia do período; dias sem nenhuma linha importada ficam `null` (buraco no gráfico). */
export function dailySeries(
  rows: DailyRow[],
  period: Period,
  series: Record<string, (r: DailyRow) => number>,
): { points: DayPoint[]; missingDays: number } {
  const byDay = new Map<string, DailyRow[]>();
  for (const r of rows) {
    if (r.date < period.from || r.date > period.to) continue;
    byDay.set(r.date, [...(byDay.get(r.date) ?? []), r]);
  }
  let missingDays = 0;
  const points = eachDay(period.from, period.to).map((date) => {
    const dayRows = byDay.get(date);
    if (!dayRows) missingDays++;
    const point: DayPoint = { date } as DayPoint;
    for (const [name, pick] of Object.entries(series)) {
      point[name] = dayRows ? dayRows.reduce((acc, r) => acc + pick(r), 0) : null;
    }
    return point;
  });
  return { points, missingDays };
}

export type CampaignRow = {
  campaign_id: string;
  campaign_name: string;
  platform: Platform;
  campaign_type: CampaignType;
} & Totals;

export async function getCampaigns({ companyId, period, accountId }: Filters, platform: Platform) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("campaign_summary", {
    p_company: companyId,
    p_from: period.from,
    p_to: period.to,
    p_ad_account: accountId ?? null,
  });
  return ((data ?? []) as CampaignRow[])
    .filter((c) => c.platform === platform)
    .map((c) => {
      const row = { ...c, ...emptyTotals() };
      addInto(row, c);
      return row;
    });
}

export type BreakdownRow = { name: string } & Totals;

/** Conjuntos (ou grupos) de uma campanha, ou anúncios de um conjunto. */
export async function getBreakdown(
  { companyId, period, accountId }: Filters,
  campaignId: string,
  adsetName?: string,
): Promise<BreakdownRow[]> {
  const supabase = await createClient();
  const rows = await fetchAll<{ adset_name: string | null; ad_name: string | null } & Totals>((from, to) => {
    let query = supabase
      .from("metrics_daily")
      .select(`adset_name, ad_name, ${METRICS.join(", ")}`)
      .eq("company_id", companyId)
      .eq("campaign_id", campaignId)
      .gte("date", period.from)
      .lte("date", period.to)
      .order("id")
      .range(from, to);
    if (accountId) query = query.eq("ad_account_id", accountId);
    if (adsetName) query = query.eq("adset_name", adsetName);
    return query;
  });
  const groups = new Map<string, Totals>();
  for (const r of rows) {
    const name = (adsetName ? r.ad_name : r.adset_name) ?? "(sem nome)";
    const totals = groups.get(name) ?? emptyTotals();
    addInto(totals, r);
    groups.set(name, totals);
  }
  return [...groups].map(([name, t]) => ({ name, ...t }));
}

export async function getAccounts(companyId: string, platform?: Platform) {
  const supabase = await createClient();
  let query = supabase.from("ad_accounts").select("id, name, platform").eq("company_id", companyId).order("name");
  if (platform) query = query.eq("platform", platform);
  const { data } = await query;
  return (data ?? []) as { id: string; name: string; platform: Platform }[];
}

/** Último dia com dados por plataforma, para avisar quando falta importar. */
export async function getLastDataDate(companyId: string, platform: Platform): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("v_daily_by_platform")
    .select("date")
    .eq("company_id", companyId)
    .eq("platform", platform)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.date ?? null;
}

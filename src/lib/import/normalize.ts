// Linhas cruas do arquivo → métricas diárias padronizadas (RF08), com validação (RNF06).

import { detectDateOrder, detectNumberLocale, parseDate, parseNumber, type NumberLocale } from "./parse";
import { normalizeHeader } from "./columns";
import type { CampaignType, FieldKey, Mapping, NormalizedRow, NormalizeResult, Platform, RowError } from "./types";

type Cell = unknown;

const NUMERIC_FIELDS: FieldKey[] = [
  "spend", "impressions", "reach", "clicks", "results", "profile_visits", "ig_follows", "all_conversions",
];

const FIELD_LABEL: Partial<Record<FieldKey, string>> = {
  date: "Dia", spend: "investimento", impressions: "impressões", reach: "alcance", clicks: "cliques",
  results: "resultados", profile_visits: "visitas ao perfil", ig_follows: "seguidores",
  all_conversions: "conversões",
};

const isEmpty = (v: Cell) => v === null || v === undefined || String(v).trim() === "";
const text = (v: Cell) => (isEmpty(v) ? "" : String(v).trim());

export function detectMetaCampaignType(indicator: string | null): CampaignType {
  const s = normalizeHeader(indicator);
  if (/mensag|messag|whatsapp|conversa/.test(s)) return "messages_whatsapp";
  if (/visita.*perfil|profile.*visit/.test(s)) return "profile_visits";
  return "other";
}

export function classifyConversionAction(name: string) {
  const s = normalizeHeader(name);
  if (/rota|direc|direction/.test(s)) return "directions" as const;
  if (/ligac|chamada|telefon|call/.test(s)) return "calls" as const;
  if (/site|website|web/.test(s)) return "website_clicks" as const;
  return "other_interactions" as const;
}

const add = (a: number | null, b: number | null) => (a === null && b === null ? null : (a ?? 0) + (b ?? 0));

/**
 * @param dataRows linhas abaixo do cabeçalho
 * @param firstLine número (1-based) da primeira linha de dados no arquivo, para as mensagens de erro
 */
export function normalizeRows(
  platform: Platform,
  dataRows: Cell[][],
  firstLine: number,
  mapping: Mapping,
): NormalizeResult {
  const col = (row: Cell[], key: FieldKey): Cell => (mapping[key] === undefined ? undefined : row[mapping[key]!]);

  const dateSamples = dataRows.slice(0, 200).map((r) => col(r, "date"));
  const dateOrder = detectDateOrder(dateSamples);
  const numberSamples = NUMERIC_FIELDS.flatMap((k) => dataRows.slice(0, 200).map((r) => col(r, k)));
  const locale: NumberLocale = detectNumberLocale(numberSamples);

  const errors: RowError[] = [];
  let skipped = 0;
  let rowsRead = 0;
  const segmentedByAction = platform === "google" && mapping.conversion_action !== undefined;
  const groups = new Map<string, NormalizedRow[]>();

  dataRows.forEach((row, i) => {
    const line = firstLine + i;
    if (row.every(isEmpty)) {
      skipped++;
      return;
    }
    const firstCell = text(row.find((c) => !isEmpty(c)));
    const noDate = isEmpty(col(row, "date"));
    // linha de totais ("Total: conta", "Total geral") ou rodapé sem dados
    if (/^(total|resultados totais)/i.test(normalizeHeader(firstCell)) || (noDate && isEmpty(col(row, "campaign_name")))) {
      skipped++;
      return;
    }
    rowsRead++;

    const fail = (message: string) => errors.push({ line, message: `Linha ${line}: ${message}` });

    const date = parseDate(col(row, "date"), dateOrder);
    if (!date) return fail(`data inválida na coluna "Dia" (valor "${text(col(row, "date"))}").`);

    const campaign = text(col(row, "campaign_name"));
    if (!campaign) return fail("nome da campanha vazio.");
    // Campanhas Inteligentes do Google não têm grupo de anúncios: a linha fica no nível de campanha.
    const adsetRaw = text(col(row, "adset_name"));
    const adset = adsetRaw === "--" ? "" : adsetRaw;
    const ad = text(col(row, "ad_name"));
    if (platform === "meta" && !adset) return fail("nome do conjunto de anúncios vazio.");
    if (platform === "meta" && !ad) return fail("nome do anúncio vazio.");

    const num: Partial<Record<FieldKey, number | null>> = {};
    for (const key of NUMERIC_FIELDS) {
      if (mapping[key] === undefined) continue;
      const value = parseNumber(col(row, key), locale);
      if (Number.isNaN(value)) return fail(`valor inválido na coluna de ${FIELD_LABEL[key]} ("${text(col(row, key))}").`);
      num[key] = value;
    }
    const spend = num.spend ?? 0;
    if (spend < 0) return fail("investimento negativo.");

    const indicator = platform === "meta" ? text(col(row, "result_indicator")) || null : null;
    let campaignType: CampaignType = "other";
    let profileVisits = num.profile_visits ?? null;
    let local: Partial<Pick<NormalizedRow, "local_actions" | "directions" | "calls" | "website_clicks" | "other_interactions">> = {};

    if (platform === "meta") {
      campaignType = detectMetaCampaignType(indicator);
      if (profileVisits === null && campaignType === "profile_visits") profileVisits = num.results ?? null;
    } else {
      campaignType = "local_actions";
      const conversions = num.all_conversions ?? null;
      if (segmentedByAction && conversions !== null) {
        const category = classifyConversionAction(text(col(row, "conversion_action")));
        local = { local_actions: conversions, [category]: conversions };
      } else if (conversions !== null) {
        local = { local_actions: conversions };
      }
    }

    const record: NormalizedRow = {
      level: platform === "meta" ? "ad" : adset ? "ad_group" : "campaign",
      object_key: platform === "meta" ? `${campaign}|${adset}|${ad}` : adset ? `${campaign}|${adset}` : campaign,
      date,
      campaign_name: campaign,
      campaign_type: campaignType,
      adset_name: adset || null,
      ad_name: platform === "meta" ? ad : null,
      spend,
      impressions: num.impressions ?? 0,
      reach: num.reach ?? null,
      clicks: num.clicks ?? 0,
      results: num.results ?? null,
      result_indicator: indicator,
      profile_visits: profileVisits,
      ig_follows: num.ig_follows ?? null,
      all_conversions: num.all_conversions ?? null,
      local_actions: local.local_actions ?? null,
      directions: local.directions ?? null,
      calls: local.calls ?? null,
      website_clicks: local.website_clicks ?? null,
      other_interactions: local.other_interactions ?? null,
    };

    const groupKey = `${record.object_key}#${date}`;
    const group = groups.get(groupKey);
    if (group) group.push(record);
    else groups.set(groupKey, [record]);
  });

  // Várias linhas para o mesmo objeto e dia: soma. Se o Google repete custo e cliques em cada
  // linha da segmentação por ação de conversão, usa o maior valor em vez de somar.
  const records: NormalizedRow[] = [];
  let periodStart: string | null = null;
  let periodEnd: string | null = null;
  for (const group of groups.values()) {
    const merged = group.reduce((acc, r) => ({
      ...acc,
      spend: segmentedByAction ? Math.max(acc.spend, r.spend) : acc.spend + r.spend,
      impressions: segmentedByAction ? Math.max(acc.impressions, r.impressions) : acc.impressions + r.impressions,
      clicks: segmentedByAction ? Math.max(acc.clicks, r.clicks) : acc.clicks + r.clicks,
      reach: null, // alcance não soma: com linhas repetidas o valor real é desconhecido
      results: add(acc.results, r.results),
      profile_visits: add(acc.profile_visits, r.profile_visits),
      ig_follows: add(acc.ig_follows, r.ig_follows),
      all_conversions: add(acc.all_conversions, r.all_conversions),
      local_actions: add(acc.local_actions, r.local_actions),
      directions: add(acc.directions, r.directions),
      calls: add(acc.calls, r.calls),
      website_clicks: add(acc.website_clicks, r.website_clicks),
      other_interactions: add(acc.other_interactions, r.other_interactions),
    }));
    if (group.length === 1) merged.reach = group[0].reach;
    records.push(merged);
    if (!periodStart || merged.date < periodStart) periodStart = merged.date;
    if (!periodEnd || merged.date > periodEnd) periodEnd = merged.date;
  }

  // Dias sem resultado vêm sem indicador; o tipo da campanha é o que aparece nos demais dias.
  const campaignTypes = new Map<string, CampaignType>();
  for (const r of records) {
    if (r.campaign_type !== "other" && !campaignTypes.has(r.campaign_name)) campaignTypes.set(r.campaign_name, r.campaign_type);
  }
  for (const r of records) r.campaign_type = campaignTypes.get(r.campaign_name) ?? r.campaign_type;

  return { records, errors, skipped, rowsRead, periodStart, periodEnd };
}

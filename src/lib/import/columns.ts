// Mapeamento de colunas por sinônimos: os nomes mudam com o idioma e com as colunas escolhidas (RF05).

import type { FieldKey, Mapping, NamedMapping, Platform } from "./types";

export function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s*\((brl|usd|eur|gbp|mxn|ars|clp|cop)\)\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Em ordem de prioridade; os nomes já estão sem acento.
export const SYNONYMS: Record<FieldKey, string[]> = {
  date: ["dia", "data", "day", "date", "inicio dos relatorios", "reporting starts"],
  campaign_name: ["nome da campanha", "campanha", "campaign name", "campaign"],
  adset_name: [
    "nome do conjunto de anuncios",
    "conjunto de anuncios",
    "ad set name",
    "grupo de anuncios",
    "ad group",
  ],
  ad_name: ["nome do anuncio", "ad name"],
  spend: ["valor usado", "valor gasto", "amount spent", "custo", "cost", "investimento"],
  impressions: ["impressoes", "impressions", "impr.", "impr"],
  reach: ["alcance", "reach"],
  clicks: ["cliques no link", "link clicks", "cliques", "clicks"],
  results: ["resultados", "results"],
  result_indicator: ["indicador de resultados", "result indicator", "tipo de resultado"],
  profile_visits: ["visitas ao perfil do instagram", "instagram profile visits", "visitas ao perfil"],
  ig_follows: ["seguidores do instagram", "seguidores no instagram", "novos seguidores do instagram", "instagram follows", "follows do instagram"],
  all_conversions: ["todas as conv.", "todas as conversoes", "todas conv.", "all conv.", "all conversions", "conversoes", "conversions"],
  conversion_action: ["acao de conversao", "nome da acao de conversao", "conversion action", "conversion action name"],
};

export type FieldSpec = { key: FieldKey; label: string; required: boolean };

export const PLATFORM_FIELDS: Record<Platform, FieldSpec[]> = {
  meta: [
    { key: "date", label: "Dia", required: true },
    { key: "campaign_name", label: "Nome da campanha", required: true },
    { key: "adset_name", label: "Nome do conjunto de anúncios", required: true },
    { key: "ad_name", label: "Nome do anúncio", required: true },
    { key: "spend", label: "Valor usado", required: true },
    { key: "impressions", label: "Impressões", required: false },
    { key: "reach", label: "Alcance", required: false },
    { key: "clicks", label: "Cliques no link", required: false },
    { key: "results", label: "Resultados", required: false },
    { key: "result_indicator", label: "Indicador de resultados", required: false },
    { key: "profile_visits", label: "Visitas ao perfil do Instagram", required: false },
    { key: "ig_follows", label: "Seguidores do Instagram", required: false },
  ],
  google: [
    { key: "date", label: "Dia", required: true },
    { key: "campaign_name", label: "Campanha", required: true },
    { key: "adset_name", label: "Grupo de anúncios", required: false },
    { key: "spend", label: "Custo", required: true },
    { key: "impressions", label: "Impressões", required: false },
    { key: "clicks", label: "Cliques", required: false },
    { key: "all_conversions", label: "Todas as conversões", required: false },
    { key: "conversion_action", label: "Ação de conversão", required: false },
  ],
};

// Cabeçalhos que só existem em uma das plataformas.
const MARKERS: Record<Platform, string[]> = {
  meta: ["nome da campanha", "nome do conjunto de anuncios", "nome do anuncio", "valor usado", "cliques no link", "indicador de resultados", "alcance"],
  google: ["campanha", "grupo de anuncios", "custo", "impr.", "todas as conv.", "acao de conversao", "cpc medio"],
};

export function detectPlatform(headers: unknown[]): Platform | null {
  const set = new Set(headers.map(normalizeHeader));
  const score = (p: Platform) => MARKERS[p].filter((m) => set.has(m)).length;
  const [meta, google] = [score("meta"), score("google")];
  if (meta === 0 && google === 0) return null;
  return meta >= google ? "meta" : "google";
}

const ALL_SYNONYMS = new Set(Object.values(SYNONYMS).flat());

/** Acha a linha do cabeçalho, pulando títulos e períodos no topo (comuns no Google). */
export function findHeaderRow(rows: unknown[][]): number {
  let best = -1;
  let bestScore = 2; // exige pelo menos 3 colunas reconhecidas
  rows.slice(0, 30).forEach((row, i) => {
    const score = row.filter((cell) => ALL_SYNONYMS.has(normalizeHeader(cell))).length;
    if (score > bestScore) {
      best = i;
      bestScore = score;
    }
  });
  return best;
}

export function autoMap(headers: unknown[], platform: Platform, saved?: NamedMapping): Mapping {
  const normalized = headers.map(normalizeHeader);
  const used = new Set<number>();
  const mapping: Mapping = {};

  for (const { key } of PLATFORM_FIELDS[platform]) {
    const savedName = saved?.[key];
    const fromSaved = savedName ? normalized.indexOf(normalizeHeader(savedName)) : -1;
    if (fromSaved >= 0 && !used.has(fromSaved)) {
      mapping[key] = fromSaved;
      used.add(fromSaved);
      continue;
    }
    for (const synonym of SYNONYMS[key]) {
      const index = normalized.findIndex((h, i) => h === synonym && !used.has(i));
      if (index >= 0) {
        mapping[key] = index;
        used.add(index);
        break;
      }
    }
  }
  return mapping;
}

export function toNamedMapping(mapping: Mapping, headers: unknown[]): NamedMapping {
  const named: NamedMapping = {};
  for (const [key, index] of Object.entries(mapping) as [FieldKey, number][]) {
    if (index !== undefined && headers[index] != null) named[key] = String(headers[index]);
  }
  return named;
}

/** Mensagens em português sobre campos obrigatórios sem coluna. */
export function validateMapping(platform: Platform, mapping: Mapping): string[] {
  return PLATFORM_FIELDS[platform]
    .filter((f) => f.required && mapping[f.key] === undefined)
    .map((f) => {
      if (f.key === "ad_name") return 'Falta a coluna "Nome do anúncio". Exporte o relatório no nível de anúncio.';
      if (f.key === "adset_name")
        return 'Falta a coluna "Nome do conjunto de anúncios". Exporte o relatório no nível de anúncio.';
      return `Falta a coluna "${f.label}".`;
    });
}

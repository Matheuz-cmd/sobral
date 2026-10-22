import { describe, expect, it } from "vitest";
import { autoMap, detectPlatform, findHeaderRow, validateMapping } from "./columns";
import { normalizeRows } from "./normalize";
import { detectDateOrder, detectNumberLocale, parseDate, parseNumber } from "./parse";

describe("parseNumber", () => {
  it("lê o formato brasileiro", () => {
    expect(parseNumber("R$ 1.234,56", "br")).toBe(1234.56);
    expect(parseNumber("12,5", "br")).toBe(12.5);
    expect(parseNumber("1.234", "br")).toBe(1234);
    expect(parseNumber("3,45%", "br")).toBe(3.45);
  });
  it("lê o formato americano", () => {
    expect(parseNumber("1,234.56", "us")).toBe(1234.56);
    expect(parseNumber("12.5", "us")).toBe(12.5);
    expect(parseNumber("1,234", "us")).toBe(1234);
  });
  it("trata vazio e inválido", () => {
    expect(parseNumber("", "br")).toBeNull();
    expect(parseNumber("--", "br")).toBeNull();
    expect(parseNumber("abc", "br")).toBeNaN();
  });
  it("detecta o formato pelo conteúdo", () => {
    expect(detectNumberLocale(["1.234,50", "10,00"])).toBe("br");
    expect(detectNumberLocale(["1,234.50", "10.00"])).toBe("us");
  });
});

describe("parseDate", () => {
  it("lê os formatos comuns", () => {
    expect(parseDate("2026-10-05")).toBe("2026-10-05");
    expect(parseDate("05/10/2026", "dmy")).toBe("2026-10-05");
    expect(parseDate("10/05/2026", "mdy")).toBe("2026-10-05");
    expect(parseDate("5 de out. de 2026")).toBe("2026-10-05");
    expect(parseDate(46300)).toBe("2026-10-05");
  });
  it("rejeita datas impossíveis", () => {
    expect(parseDate("31/02/2026")).toBeNull();
    expect(parseDate("nada")).toBeNull();
  });
  it("descobre a ordem pelo conteúdo", () => {
    expect(detectDateOrder(["10/25/2026"])).toBe("mdy");
    expect(detectDateOrder(["25/10/2026"])).toBe("dmy");
  });
});

const metaHeader = [
  "Nome da campanha", "Nome do conjunto de anúncios", "Nome do anúncio", "Dia", "Valor usado (BRL)",
  "Impressões", "Alcance", "Cliques no link", "Resultados", "Indicador de resultados",
  "Visitas ao perfil do Instagram", "Seguidores do Instagram",
];

describe("Meta", () => {
  it("detecta a plataforma e mapeia as colunas", () => {
    expect(detectPlatform(metaHeader)).toBe("meta");
    const mapping = autoMap(metaHeader, "meta");
    expect(mapping.spend).toBe(4);
    expect(mapping.clicks).toBe(7);
    expect(validateMapping("meta", mapping)).toEqual([]);
  });

  it("normaliza linhas, classifica o tipo e aponta erros", () => {
    const mapping = autoMap(metaHeader, "meta");
    const rows = [
      ["WhatsApp", "Conj 1", "Anúncio A", "05/10/2026", "R$ 100,50", "1.000", "800", "20", "5", "Conversas por mensagem iniciadas", "", ""],
      ["Perfil", "Conj 2", "Anúncio B", "05/10/2026", "50,00", "500", "400", "10", "30", "Visitas ao perfil do Instagram", "30", "4"],
      ["Perfil", "Conj 2", "Anúncio B", "32/10/2026", "50,00", "500", "400", "10", "30", "Visitas ao perfil do Instagram", "30", "4"],
      ["", "", "", "", "", "", "", "", "", "", "", ""],
    ];
    const result = normalizeRows("meta", rows, 2, mapping);
    expect(result.records).toHaveLength(2);
    expect(result.records[0]).toMatchObject({ spend: 100.5, impressions: 1000, campaign_type: "messages_whatsapp" });
    expect(result.records[1]).toMatchObject({ campaign_type: "profile_visits", profile_visits: 30, ig_follows: 4 });
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain("Linha 4");
    expect(result.skipped).toBe(1);
    expect(result.periodStart).toBe("2026-10-05");
  });

  it("aplica o tipo da campanha aos dias sem indicador de resultados", () => {
    const mapping = autoMap(metaHeader, "meta");
    const rows = [
      ["Perfil", "Conj", "Ad", "2026-10-05", "5.00", "100", "80", "1", "", "", "", ""],
      ["Perfil", "Conj", "Ad", "2026-10-06", "5.00", "100", "80", "1", "3", "Visitas ao perfil do Instagram", "3", ""],
    ];
    const { records } = normalizeRows("meta", rows, 2, mapping);
    expect(records.map((r) => r.campaign_type)).toEqual(["profile_visits", "profile_visits"]);
  });
});

describe("Google", () => {
  const rows = [
    ["Relatório de grupos de anúncios"],
    ["1 de outubro de 2026 - 21 de outubro de 2026"],
    ["Campanha", "Grupo de anúncios", "Dia", "Ação de conversão", "Custo", "Impr.", "Cliques", "Todas as conv."],
    ["Perfil", "Grupo 1", "2026-10-05", "Rotas", "10.50", "100", "10", "3"],
    ["Perfil", "Grupo 1", "2026-10-05", "Ligações", "10.50", "100", "10", "2"],
    ["Perfil", "Grupo 1", "2026-10-05", "Cliques no site", "10.50", "100", "10", "1"],
    ["Total: conta", "", "", "", "10.50", "100", "10", "6"],
  ];

  it("pula o título, acha o cabeçalho e ignora o total", () => {
    const headerIndex = findHeaderRow(rows);
    expect(headerIndex).toBe(2);
    const header = rows[headerIndex];
    expect(detectPlatform(header)).toBe("google");
    const mapping = autoMap(header, "google");
    const result = normalizeRows("google", rows.slice(headerIndex + 1), headerIndex + 2, mapping);
    expect(result.errors).toEqual([]);
    expect(result.skipped).toBe(1);
    expect(result.records).toHaveLength(1);
  });

  it("soma ações locais sem repetir custo, impressões e cliques", () => {
    const header = rows[2];
    const mapping = autoMap(header, "google");
    const [record] = normalizeRows("google", rows.slice(3), 4, mapping).records;
    expect(record).toMatchObject({
      spend: 10.5, impressions: 100, clicks: 10,
      local_actions: 6, directions: 3, calls: 2, website_clicks: 1, other_interactions: null,
    });
  });
});

describe("Google · campanha Inteligente", () => {
  it("aceita relatório sem grupo de anúncios, no nível de campanha", () => {
    const header = ["Campanha", "Dia", "Cliques", "Impr.", "CTR", "Custo", "Conversões"];
    const mapping = autoMap(header, "google");
    expect(detectPlatform(header)).toBe("google");
    expect(validateMapping("google", mapping)).toEqual([]);
    const rows = [
      ["Comprar Calçados Femininos", "2026-10-01", "3", "500", "0,60%", "R$ 10,25", "1,00"],
      ["Total", "", "63", "9.809", "0,64%", "R$ 215,17", "12,00"],
    ];
    const result = normalizeRows("google", rows, 2, mapping);
    expect(result.skipped).toBe(1);
    expect(result.records[0]).toMatchObject({
      level: "campaign", object_key: "Comprar Calçados Femininos", adset_name: null,
      spend: 10.25, impressions: 500, clicks: 3, local_actions: 1,
    });
  });
});

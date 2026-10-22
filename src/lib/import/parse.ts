// Leitura de números e datas nos formatos brasileiro e americano (RF06).

export type NumberLocale = "br" | "us";
export type DateOrder = "dmy" | "mdy";

function clean(value: string): string {
  return value.replace(/[\s ]/g, "").replace(/(r\$|us\$|\$|%)/gi, "");
}

/** Decide o formato dos números pelo conteúdo: vírgula decimal (1.234,56) ou ponto decimal (1,234.56). */
export function detectNumberLocale(samples: unknown[]): NumberLocale {
  let br = 0;
  let us = 0;
  for (const sample of samples) {
    if (typeof sample !== "string") continue;
    const s = clean(sample);
    if (/,\d{1,2}$/.test(s) || /\d\.\d{3},\d/.test(s)) br++;
    else if (/\.\d{1,2}$/.test(s) || /\d,\d{3}\.\d/.test(s)) us++;
  }
  return us > br ? "us" : "br";
}

/** Número, `null` para vazio e `NaN` para valor inválido. */
export function parseNumber(value: unknown, locale: NumberLocale): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
  const s = clean(String(value));
  if (s === "" || s === "-" || s === "--") return null;
  if (!/^-?[\d.,]+$/.test(s)) return NaN;

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  let normalized: string;
  if (lastComma >= 0 && lastDot >= 0) {
    const decimal = lastComma > lastDot ? "," : ".";
    const thousands = decimal === "," ? "." : ",";
    normalized = s.split(thousands).join("").replace(decimal, ".");
  } else if (lastComma >= 0) {
    normalized = locale === "br" ? s.replace(",", ".") : s.split(",").join("");
  } else if (lastDot >= 0) {
    const thousandsGroups = /^-?\d{1,3}(\.\d{3})+$/.test(s);
    normalized = locale === "br" && thousandsGroups ? s.split(".").join("") : s;
  } else {
    normalized = s;
  }
  const n = Number(normalized);
  return Number.isFinite(n) ? n : NaN;
}

const SLASH_DATE = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/;

/** Em datas com barra, procura um valor > 12 para saber qual lado é o mês. */
export function detectDateOrder(samples: unknown[]): DateOrder {
  for (const sample of samples) {
    const m = typeof sample === "string" ? SLASH_DATE.exec(sample.trim()) : null;
    if (!m) continue;
    if (Number(m[1]) > 12) return "dmy";
    if (Number(m[2]) > 12) return "mdy";
  }
  return "dmy";
}

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function toIso(year: number, month: number, day: number): string | null {
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return d.toISOString().slice(0, 10);
}

/** Data em ISO (aaaa-mm-dd) ou `null` se inválida. */
export function parseDate(value: unknown, order: DateOrder = "dmy"): string | null {
  if (value === null || value === undefined) return null;

  if (typeof value === "number") {
    // número serial do Excel
    if (value < 20000 || value > 80000) return null;
    return new Date(Math.round((value - 25569) * 86400e3)).toISOString().slice(0, 10);
  }

  const s = String(value).trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return toIso(Number(m[1]), Number(m[2]), Number(m[3]));

  m = SLASH_DATE.exec(s);
  if (m) {
    const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    const [a, b] = [Number(m[1]), Number(m[2])];
    return order === "dmy" ? toIso(year, b, a) : toIso(year, a, b);
  }

  m = /^(\d{1,2}) de ([a-zç]+)\.? de (\d{4})$/i.exec(s);
  if (m) {
    const month = MONTHS.indexOf(m[2].slice(0, 3).toLowerCase()) + 1;
    return month > 0 ? toIso(Number(m[3]), month, Number(m[1])) : null;
  }
  return null;
}

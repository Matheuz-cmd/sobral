const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const int = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const dec = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
const pct = new Intl.NumberFormat("pt-BR", { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });

export const formatBRL = (v: number | null | undefined) => (v == null ? "—" : brl.format(v));
export const formatInt = (v: number | null | undefined) => (v == null ? "—" : int.format(v));
export const formatDecimal = (v: number | null | undefined) => (v == null ? "—" : dec.format(v));
export const formatPct = (v: number | null | undefined) => (v == null ? "—" : pct.format(v));
export const formatCompact = (v: number | null | undefined) => (v == null ? "—" : compact.format(v));

export type ValueFormat = "brl" | "int" | "pct" | "dec" | "text";

export function formatValue(v: unknown, format: ValueFormat): string {
  if (format === "text") return v == null ? "—" : String(v);
  const n = v == null ? null : Number(v);
  if (n != null && !Number.isFinite(n)) return "—";
  if (format === "brl") return formatBRL(n);
  if (format === "int") return formatInt(n);
  if (format === "pct") return formatPct(n);
  return formatDecimal(n);
}

/** aaaa-mm-dd → dd/mm/aaaa */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

/** aaaa-mm-dd → dd/mm */
export const formatDayMonth = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

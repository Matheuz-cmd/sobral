import { getAccounts, type Filters } from "@/lib/dashboard";
import { resolvePeriod } from "@/lib/period";
import type { Platform } from "@/lib/import/types";

export type SearchParams = Record<string, string | string[] | undefined>;

export const param = (sp: SearchParams, key: string) => (typeof sp[key] === "string" ? (sp[key] as string) : undefined);

/** Lê período e conta da URL; a conta só vale se for desta empresa (e plataforma). */
export async function readFilters(companyId: string, sp: SearchParams, platform?: Platform) {
  const period = resolvePeriod({ periodo: param(sp, "periodo"), de: param(sp, "de"), ate: param(sp, "ate") });
  const accounts = await getAccounts(companyId, platform);
  const requested = param(sp, "conta");
  const accountId = accounts.some((a) => a.id === requested) ? requested : undefined;
  const filters: Filters = { companyId, period, accountId };
  return { filters, period, accounts, accountId };
}

/** Monta um link mantendo os filtros atuais e trocando alguns parâmetros. */
export function hrefWith(base: string, sp: SearchParams, changes: Record<string, string | null>): string {
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (typeof v === "string") next.set(k, v);
  for (const [k, v] of Object.entries(changes)) {
    if (v === null) next.delete(k);
    else next.set(k, v);
  }
  const qs = next.toString();
  return qs ? `${base}?${qs}` : base;
}

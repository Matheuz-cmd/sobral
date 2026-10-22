// Períodos dos filtros (RF19) e o período anterior usado na comparação.

export const PRESETS = {
  "7d": "Últimos 7 dias",
  "30d": "Últimos 30 dias",
  "90d": "Últimos 90 dias",
  this_week: "Esta semana",
  last_week: "Semana passada",
  this_month: "Este mês",
  last_month: "Mês passado",
  custom: "Personalizado",
} as const;

export type PresetKey = keyof typeof PRESETS;

export type Period = {
  preset: PresetKey;
  from: string;
  to: string;
  prevFrom: string;
  prevTo: string;
};

const DEFAULT_PRESET: PresetKey = "30d";
const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function todayISO(): string {
  // en-CA formata como aaaa-mm-dd
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
const toIso = (d: Date) => d.toISOString().slice(0, 10);

export function addDays(iso: string, days: number): string {
  const d = toDate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toIso(d);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((toDate(to).getTime() - toDate(from).getTime()) / 86400e3) + 1;
}

export function eachDay(from: string, to: string): string[] {
  const days: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(d);
  return days;
}

function monthStart(iso: string, offset = 0): string {
  const d = toDate(iso);
  return toIso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + offset, 1)));
}

function monthEnd(iso: string): string {
  return addDays(monthStart(iso, 1), -1);
}

function weekStart(iso: string): string {
  const weekday = (toDate(iso).getUTCDay() + 6) % 7; // segunda = 0
  return addDays(iso, -weekday);
}

/** Período anterior de mesmo tamanho, logo antes. */
function previousWindow(from: string, to: string) {
  const length = daysBetween(from, to);
  return { prevFrom: addDays(from, -length), prevTo: addDays(from, -1) };
}

export function resolvePeriod(
  params: { periodo?: string; de?: string; ate?: string },
  today = todayISO(),
): Period {
  const preset = (params.periodo && params.periodo in PRESETS ? params.periodo : DEFAULT_PRESET) as PresetKey;

  switch (preset) {
    case "7d":
    case "30d":
    case "90d": {
      const from = addDays(today, -(Number.parseInt(preset) - 1));
      return { preset, from, to: today, ...previousWindow(from, today) };
    }
    case "this_week": {
      const from = weekStart(today);
      return { preset, from, to: today, prevFrom: addDays(from, -7), prevTo: addDays(today, -7) };
    }
    case "last_week": {
      const from = addDays(weekStart(today), -7);
      const to = addDays(from, 6);
      return { preset, from, to, prevFrom: addDays(from, -7), prevTo: addDays(to, -7) };
    }
    case "this_month": {
      // compara com os mesmos dias do mês anterior
      const from = monthStart(today);
      const prevFrom = monthStart(today, -1);
      const sameDay = addDays(prevFrom, daysBetween(from, today) - 1);
      const prevEnd = monthEnd(prevFrom);
      return { preset, from, to: today, prevFrom, prevTo: sameDay < prevEnd ? sameDay : prevEnd };
    }
    case "last_month": {
      const from = monthStart(today, -1);
      return { preset, from, to: monthEnd(from), prevFrom: monthStart(today, -2), prevTo: addDays(from, -1) };
    }
    case "custom": {
      const valid = params.de && params.ate && ISO.test(params.de) && ISO.test(params.ate) && params.de <= params.ate;
      if (!valid) return resolvePeriod({ periodo: DEFAULT_PRESET }, today);
      return { preset, from: params.de!, to: params.ate!, ...previousWindow(params.de!, params.ate!) };
    }
  }
}

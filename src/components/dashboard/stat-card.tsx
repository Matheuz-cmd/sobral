import { formatValue, type ValueFormat } from "@/lib/format";

/**
 * Card de métrica com variação contra o período anterior.
 * `lowerIsBetter` inverte a cor da variação (custos: cair é bom).
 */
export function StatCard({
  label,
  value,
  previous,
  format,
  lowerIsBetter = false,
}: {
  label: string;
  value: number | null;
  previous?: number | null;
  format: ValueFormat;
  lowerIsBetter?: boolean;
}) {
  const delta = value != null && previous != null && previous !== 0 ? (value - previous) / Math.abs(previous) : null;
  const good = delta == null || delta === 0 ? null : (delta > 0) !== lowerIsBetter;

  return (
    <div className="rounded-xl border border-black/10 p-4 dark:border-white/15">
      <p className="text-sm opacity-70">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{formatValue(value, format)}</p>
      <p className="mt-1 text-xs opacity-80">
        {delta == null ? (
          <span className="opacity-70">sem base de comparação</span>
        ) : (
          <>
            <span style={{ color: good === null ? undefined : good ? "var(--good)" : "var(--bad)" }}>
              {delta > 0 ? "▲" : delta < 0 ? "▼" : "■"} {delta > 0 ? "+" : ""}
              {(delta * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
            </span>{" "}
            <span className="opacity-70">vs. período anterior</span>
          </>
        )}
      </p>
    </div>
  );
}

export function StatGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">{children}</div>;
}

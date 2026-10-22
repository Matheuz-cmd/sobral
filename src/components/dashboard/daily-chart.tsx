"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCompact, formatDate, formatDayMonth, formatValue, type ValueFormat } from "@/lib/format";
import type { DayPoint } from "@/lib/dashboard";

export type Series = { key: string; label: string; color: string };

type TooltipPayload = { dataKey?: string | number; value?: number | null; color?: string };

/**
 * Barras diárias com um único eixo. Duas medidas de escalas diferentes (investimento × resultados)
 * viram dois gráficos alinhados, nunca um gráfico de dois eixos.
 */
export function DailyChart({
  title,
  points,
  series,
  format,
}: {
  title: string;
  points: DayPoint[];
  series: Series[];
  format: ValueFormat;
}) {
  const stacked = series.length > 1;

  return (
    <figure className="space-y-2 rounded-xl border border-black/10 p-4 dark:border-white/15">
      <figcaption className="text-sm font-medium">{title}</figcaption>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={points} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barCategoryGap={2}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDayMonth}
              tick={{ fontSize: 11, fill: "var(--chart-muted)" }}
              tickLine={false}
              axisLine={{ stroke: "var(--chart-grid)" }}
              minTickGap={16}
            />
            <YAxis
              tickFormatter={(v: number) => (format === "brl" ? `R$ ${formatCompact(v)}` : formatCompact(v))}
              tick={{ fontSize: 11, fill: "var(--chart-muted)" }}
              tickLine={false}
              axisLine={false}
              width={56}
            />
            <Tooltip
              cursor={{ fill: "var(--chart-grid)", opacity: 0.5 }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const items = payload as unknown as TooltipPayload[];
                const noData = items.every((p) => p.value == null);
                return (
                  <div className="rounded-lg border border-black/10 bg-background px-3 py-2 text-xs shadow-md dark:border-white/15">
                    <p className="mb-1 font-medium">{formatDate(String(label))}</p>
                    {noData ? (
                      <p className="opacity-70">Sem dados importados</p>
                    ) : (
                      items.map((p) => {
                        const s = series.find((x) => x.key === p.dataKey);
                        return (
                          <p key={String(p.dataKey)} className="flex items-center gap-2">
                            {stacked && <span className="inline-block size-2 rounded-sm" style={{ background: s?.color }} />}
                            {stacked && <span className="opacity-70">{s?.label}</span>}
                            <span className="ml-auto tabular-nums">{formatValue(p.value, format)}</span>
                          </p>
                        );
                      })
                    )}
                  </div>
                );
              }}
            />
            {stacked && <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12 }} />}
            {series.map((s, i) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.label}
                fill={s.color}
                stackId={stacked ? "stack" : undefined}
                stroke={stacked ? "var(--background)" : undefined}
                strokeWidth={stacked ? 1 : 0}
                radius={!stacked || i === series.length - 1 ? [4, 4, 0, 0] : 0}
                maxBarSize={24}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

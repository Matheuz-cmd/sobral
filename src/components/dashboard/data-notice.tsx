import { formatDate } from "@/lib/format";
import type { Period } from "@/lib/period";

/** Mostra até quando há dados e quantos dias do período estão sem importação. */
export function DataNotice({
  period,
  lastDates,
  missingDays,
}: {
  period: Period;
  lastDates: { label: string; date: string | null }[];
  missingDays: number;
}) {
  return (
    <p className="text-sm opacity-70">
      {formatDate(period.from)} a {formatDate(period.to)} · comparado com {formatDate(period.prevFrom)} a{" "}
      {formatDate(period.prevTo)}
      {lastDates.map((d) => (
        <span key={d.label}>
          {" · "}
          {d.label}: {d.date ? `dados até ${formatDate(d.date)}` : "nenhum dado importado"}
        </span>
      ))}
      {missingDays > 0 && (
        <span className="text-amber-600">
          {" · "}
          {missingDays} {missingDays === 1 ? "dia" : "dias"} sem dados no período
        </span>
      )}
    </p>
  );
}

"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { formatValue, type ValueFormat } from "@/lib/format";
import { setCampaignTypeAction } from "@/app/(app)/empresa/[id]/actions";

export type Column = {
  key: string;
  label: string;
  format: ValueFormat | "campaign_type";
};

export type TableRow = Record<string, string | number | null> & { id: string; href?: string | null };

export const CAMPAIGN_TYPES = {
  messages_whatsapp: "Mensagens (WhatsApp)",
  profile_visits: "Visitas ao perfil",
  local_actions: "Ações locais",
  other: "Outro",
} as const;

function TypeSelect({ companyId, campaignId, value }: { companyId: string; campaignId: string; value: string }) {
  const [pending, start] = useTransition();
  return (
    <select
      value={value}
      disabled={pending}
      aria-label="Tipo de campanha"
      onChange={(e) => start(() => setCampaignTypeAction(companyId, campaignId, e.target.value))}
      className="rounded border border-black/15 bg-background px-1 py-0.5 text-xs text-foreground dark:border-white/20"
    >
      {Object.entries(CAMPAIGN_TYPES).map(([k, label]) => (
        <option key={k} value={k}>{label}</option>
      ))}
    </select>
  );
}

function toCsv(columns: Column[], rows: TableRow[]): string {
  const cell = (raw: string) => {
    // Nomes começando com = + - @ virariam fórmula ao abrir no Excel (injeção de CSV).
    const v = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
    return /[";\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  };
  const lines = [
    columns.map((c) => cell(c.label)).join(";"),
    ...rows.map((r) =>
      columns
        .map((c) => {
          const v = r[c.key];
          if (c.format === "campaign_type") return cell(CAMPAIGN_TYPES[v as keyof typeof CAMPAIGN_TYPES] ?? String(v));
          if (c.format === "text") return cell(v == null ? "" : String(v));
          // número sem símbolo de moeda, com vírgula decimal (abre direto no Excel em português)
          return v == null ? "" : String(Number(v)).replace(".", ",");
        })
        .join(";"),
    ),
  ];
  return "﻿" + lines.join("\r\n");
}

/** Tabela ordenável com exportação em CSV da visão atual (RF13, RF17, RF20). */
export function DataTable({
  columns,
  rows,
  initialSort,
  fileName,
  companyId,
}: {
  columns: Column[];
  rows: TableRow[];
  initialSort: string;
  fileName: string;
  companyId?: string;
}) {
  const [sort, setSort] = useState<{ key: string; desc: boolean }>({ key: initialSort, desc: true });

  const sorted = useMemo(() => {
    const dir = sort.desc ? -1 : 1;
    return [...rows].sort((a, b) => {
      const [x, y] = [a[sort.key], b[sort.key]];
      if (x == null && y == null) return 0;
      if (x == null) return 1; // vazios sempre no fim
      if (y == null) return -1;
      return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "pt-BR")) * dir;
    });
  }, [rows, sort]);

  function exportCsv() {
    const blob = new Blob([toCsv(columns, sorted)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: `${fileName}.csv` });
    a.click();
    URL.revokeObjectURL(url);
  }

  if (rows.length === 0) return <p className="text-sm opacity-70">Sem dados no período.</p>;

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <button onClick={exportCsv} className="btn">Exportar CSV</button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/15">
        <table className="w-full text-left text-sm">
          <thead className="bg-black/5 dark:bg-white/10">
            <tr>
              {columns.map((c, i) => {
                const active = sort.key === c.key;
                return (
                  <th
                    key={c.key}
                    aria-sort={active ? (sort.desc ? "descending" : "ascending") : undefined}
                    className={`whitespace-nowrap px-3 py-2 font-medium ${i > 0 && c.format !== "text" && c.format !== "campaign_type" ? "text-right" : ""}`}
                  >
                    <button
                      onClick={() => setSort((s) => ({ key: c.key, desc: s.key === c.key ? !s.desc : true }))}
                      className="hover:underline"
                    >
                      {c.label}
                      {active ? (sort.desc ? " ↓" : " ↑") : ""}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr key={row.id} className="border-t border-black/10 dark:border-white/15">
                {columns.map((c, i) => {
                  const v = row[c.key];
                  let content: React.ReactNode;
                  if (c.format === "campaign_type") {
                    content = companyId ? (
                      <TypeSelect companyId={companyId} campaignId={row.id} value={String(v)} />
                    ) : (
                      CAMPAIGN_TYPES[v as keyof typeof CAMPAIGN_TYPES]
                    );
                  } else if (i === 0 && row.href) {
                    content = <Link href={row.href} prefetch={false} className="underline-offset-2 hover:underline">{formatValue(v, "text")}</Link>;
                  } else {
                    content = formatValue(v, c.format);
                  }
                  const numeric = i > 0 && c.format !== "text" && c.format !== "campaign_type";
                  return (
                    <td key={c.key} className={`px-3 py-2 ${numeric ? "whitespace-nowrap text-right tabular-nums" : ""}`}>
                      {i === 0 ? <div className="max-w-xs [overflow-wrap:anywhere]">{content}</div> : content}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
